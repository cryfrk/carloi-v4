import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentVisibility,
  MediaAssetPurpose,
  MediaType,
  Prisma,
  SavedItemType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { CommentsQueryDto } from './dto/comments-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

type FeedCursor = {
  priority: number;
  discoveryBucket: number;
  createdAt: string;
  id: string;
};

type FeedCandidateRow = {
  id: string;
  priority: number;
  discoveryBucket: number;
  createdAt: Date;
};

type FeedPostRecord = Prisma.PostGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
        firstName: true;
        lastName: true;
        profile: {
          select: {
            avatarUrl: true;
            blueVerified: true;
            goldVerified: true;
          };
        };
        followers: {
          select: {
            id: true;
          };
        };
      };
    };
    media: true;
    likes: {
      select: {
        id: true;
      };
    };
    savedItems: {
      select: {
        id: true;
      };
    };
    _count: {
      select: {
        likes: true;
        comments: true;
      };
    };
  };
}>;

type CommentRecord = Prisma.CommentGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
        firstName: true;
        lastName: true;
        profile: {
          select: {
            avatarUrl: true;
            blueVerified: true;
            goldVerified: true;
          };
        };
      };
    };
    likes: {
      select: {
        id: true;
      };
    };
    _count: {
      select: {
        likes: true;
        replies: true;
      };
    };
  };
}>;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    const assetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      dto.media.map((item) => item.mediaAssetId ?? '').filter(Boolean),
      [MediaAssetPurpose.POST_MEDIA],
    );

    const post = await this.prisma.post.create({
      data: {
        ownerId: userId,
        caption: dto.caption?.trim() || null,
        locationText: dto.locationText?.trim() || null,
        visibility: ContentVisibility.PUBLIC,
        media: {
          create: dto.media.map((item, index) => {
            const asset = item.mediaAssetId ? assetMap.get(item.mediaAssetId) : null;
            const url = asset?.url ?? item.url;

            return {
              url,
              mediaAssetId: asset?.id ?? null,
              mediaType: item.mediaType ?? this.inferMediaType(url),
              sortOrder: index,
            };
          }),
        },
      },
      include: {
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    return {
      success: true,
      post,
    };
  }

  async getFeed(userId: string, query: FeedQueryDto) {
    const limit = query.limit ?? 10;
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const candidates = await this.getFeedCandidates(userId, limit, cursor);
    const hasMore = candidates.length > limit;
    const slice = hasMore ? candidates.slice(0, limit) : candidates;
    const postIds = slice.map((item) => item.id);
    const posts = await this.getPostsForFeed(userId, postIds);
    const orderedPosts = postIds
      .map((postId) => posts.find((post) => post.id === postId))
      .filter((post): post is FeedPostRecord => Boolean(post))
      .map((post) => this.serializeFeedPost(post, userId));
    const lastItem = slice.at(-1);

    return {
      items: orderedPosts,
      nextCursor:
        hasMore && lastItem
          ? this.encodeCursor({
              priority: lastItem.priority,
              discoveryBucket: lastItem.discoveryBucket,
              createdAt: lastItem.createdAt.toISOString(),
              id: lastItem.id,
            })
          : null,
    };
  }

  async getPostDetail(userId: string, postId: string) {
    await this.findAccessiblePost(userId, postId);

    const posts = await this.getPostsForFeed(userId, [postId]);
    const post = posts[0];

    if (!post) {
      throw new NotFoundException('Post bulunamadi.');
    }

    return this.serializeFeedPost(post, userId);
  }
  async likePost(userId: string, postId: string) {
    const post = await this.findAccessiblePost(userId, postId);
    const existing = await this.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!existing) {
      await this.prisma.like.create({
        data: {
          userId,
          postId,
        },
      });

      const actor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      await this.notificationsService.create({
        receiverId: post.ownerId,
        actorId: userId,
        type: 'like',
        entityId: postId,
        title: 'Post begenildi',
        body: `${actor?.username ?? 'Bir kullanici'} gonderinizi begendi.`,
        targetUrl: `/posts/${postId}`,
      });
    }

    return this.buildInteractionState(userId, postId, { liked: true });
  }

  async unlikePost(userId: string, postId: string) {
    await this.findAccessiblePost(userId, postId);

    await this.prisma.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    return this.buildInteractionState(userId, postId, { liked: false });
  }

  async savePost(userId: string, postId: string) {
    await this.findAccessiblePost(userId, postId);

    await this.prisma.savedItem.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      update: {},
      create: {
        userId,
        itemType: SavedItemType.POST,
        postId,
      },
    });

    return this.buildInteractionState(userId, postId, { saved: true });
  }

  async unsavePost(userId: string, postId: string) {
    await this.findAccessiblePost(userId, postId);

    await this.prisma.savedItem.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    return this.buildInteractionState(userId, postId, { saved: false });
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.findAccessiblePost(userId, postId);
    let parentCommentOwnerId: string | null = null;

    if (dto.parentCommentId) {
      const parentComment = await this.prisma.comment.findFirst({
        where: {
          id: dto.parentCommentId,
          postId,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Yanitlanacak yorum bulunamadi.');
      }

      parentCommentOwnerId = parentComment.ownerId;
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        ownerId: userId,
        parentCommentId: dto.parentCommentId ?? null,
        body: dto.body.trim(),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                blueVerified: true,
                goldVerified: true,
              },
            },
          },
        },
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (dto.parentCommentId && parentCommentOwnerId) {
      await this.notificationsService.create({
        receiverId: parentCommentOwnerId,
        actorId: userId,
        type: 'comment_reply',
        entityId: comment.id,
        title: 'Yoruma yanit geldi',
        body: `${actor?.username ?? 'Bir kullanici'} yorumunuza yanit verdi.`,
        targetUrl: `/posts/${postId}`,
      });
    } else {
      await this.notificationsService.create({
        receiverId: post.ownerId,
        actorId: userId,
        type: 'comment',
        entityId: comment.id,
        title: 'Yeni yorum',
        body: `${actor?.username ?? 'Bir kullanici'} gonderinize yorum yapti.`,
        targetUrl: `/posts/${postId}`,
      });
    }

    return {
      success: true,
      comment: this.serializeComment(comment),
    };
  }

  async getComments(userId: string, postId: string, query: CommentsQueryDto) {
    await this.findAccessiblePost(userId, postId);

    const limit = query.limit ?? 20;
    const cursorDate = query.cursor ? new Date(query.cursor) : null;

    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      throw new BadRequestException('Yorum cursor gecersiz.');
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentCommentId: null,
        ...(cursorDate
          ? {
              createdAt: {
                lt: cursorDate,
              },
            }
          : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                blueVerified: true,
                goldVerified: true,
              },
            },
          },
        },
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    const hasMore = comments.length > limit;
    const slice = hasMore ? comments.slice(0, limit) : comments;

    return {
      items: slice.map((comment) => this.serializeComment(comment)),
      nextCursor: hasMore ? slice.at(-1)?.createdAt.toISOString() ?? null : null,
    };
  }

  async likeComment(userId: string, postId: string, commentId: string) {
    await this.findAccessiblePost(userId, postId);
    const comment = await this.findComment(postId, commentId);

    await this.prisma.commentLike.upsert({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
      update: {},
      create: {
        userId,
        commentId,
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    await this.notificationsService.create({
      receiverId: comment.ownerId,
      actorId: userId,
      type: 'comment_like',
      entityId: comment.id,
      title: 'Yorum begenildi',
      body: `${actor?.username ?? 'Bir kullanici'} yorumunuzu begendi.`,
      targetUrl: `/posts/${postId}`,
    });

    return this.buildCommentLikeState(userId, commentId);
  }

  async unlikeComment(userId: string, postId: string, commentId: string) {
    await this.findAccessiblePost(userId, postId);
    await this.findComment(postId, commentId);

    await this.prisma.commentLike.deleteMany({
      where: {
        userId,
        commentId,
      },
    });

    return this.buildCommentLikeState(userId, commentId);
  }

  private async getFeedCandidates(userId: string, limit: number, cursor: FeedCursor | null) {
    const cursorFilter = cursor
      ? Prisma.sql`
        AND (
          ${this.prioritySql(userId)} < ${cursor.priority}
          OR (${this.prioritySql(userId)} = ${cursor.priority} AND ${this.discoverySql(userId)} > ${cursor.discoveryBucket})
          OR (${this.prioritySql(userId)} = ${cursor.priority} AND ${this.discoverySql(userId)} = ${cursor.discoveryBucket} AND p."createdAt" < ${new Date(cursor.createdAt)})
          OR (${this.prioritySql(userId)} = ${cursor.priority} AND ${this.discoverySql(userId)} = ${cursor.discoveryBucket} AND p."createdAt" = ${new Date(cursor.createdAt)} AND p.id < ${cursor.id})
        )
      `
      : Prisma.empty;

    return this.prisma.$queryRaw<FeedCandidateRow[]>(Prisma.sql`
      SELECT
        p.id,
        ${this.prioritySql(userId)} AS priority,
        ${this.discoverySql(userId)} AS "discoveryBucket",
        p."createdAt"
      FROM "Post" p
      INNER JOIN "User" owner
        ON owner.id = p."ownerId"
       AND owner."deletedAt" IS NULL
      WHERE (
        p."ownerId" = ${userId}
        OR p."visibility" = 'PUBLIC'
        OR (
          p."visibility" = 'FOLLOWERS_ONLY'
          AND EXISTS (
            SELECT 1
            FROM "Follow" follower_visibility
            WHERE follower_visibility."followerId" = ${userId}
              AND follower_visibility."followingId" = p."ownerId"
          )
        )
      )
      ${cursorFilter}
      ORDER BY
        priority DESC,
        "discoveryBucket" ASC,
        p."createdAt" DESC,
        p.id DESC
      LIMIT ${limit + 1}
    `);
  }

  private async getPostsForFeed(userId: string, postIds: string[]): Promise<FeedPostRecord[]> {
    if (postIds.length === 0) {
      return [];
    }

    return this.prisma.post.findMany({
      where: {
        id: {
          in: postIds,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                blueVerified: true,
                goldVerified: true,
              },
            },
            followers: {
              where: {
                followerId: userId,
              },
              select: {
                id: true,
              },
            },
          },
        },
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        savedItems: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  private serializeFeedPost(post: FeedPostRecord, currentUserId: string) {
    return {
      id: post.id,
      caption: post.caption,
      locationText: post.locationText,
      createdAt: post.createdAt.toISOString(),
      owner: {
        id: post.owner.id,
        username: post.owner.username,
        firstName: post.owner.firstName,
        lastName: post.owner.lastName,
        avatarUrl: post.owner.profile?.avatarUrl ?? null,
        blueVerified: post.owner.profile?.blueVerified ?? false,
        goldVerified: post.owner.profile?.goldVerified ?? false,
        isFollowing:
          post.owner.id === currentUserId ? false : Boolean(post.owner.followers.length),
      },
      media: post.media.map((item) => ({
        id: item.id,
        mediaType: item.mediaType,
        url: item.url,
        sortOrder: item.sortOrder,
      })),
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isLiked: Boolean(post.likes.length),
      isSaved: Boolean(post.savedItems.length),
    };
  }

  private serializeComment(comment: CommentRecord) {
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      parentCommentId: comment.parentCommentId,
      owner: {
        id: comment.owner.id,
        username: comment.owner.username,
        firstName: comment.owner.firstName,
        lastName: comment.owner.lastName,
        avatarUrl: comment.owner.profile?.avatarUrl ?? null,
        blueVerified: comment.owner.profile?.blueVerified ?? false,
        goldVerified: comment.owner.profile?.goldVerified ?? false,
      },
      likeCount: comment._count.likes,
      replyCount: comment._count.replies,
      isLiked: Boolean(comment.likes.length),
    };
  }

  private async buildInteractionState(
    userId: string,
    postId: string,
    override: { liked?: boolean; saved?: boolean },
  ) {
    await this.findAccessiblePost(userId, postId);

    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        savedItems: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post bulunamadi.');
    }

    return {
      success: true,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isLiked: override.liked ?? Boolean(post.likes.length),
      isSaved: override.saved ?? Boolean(post.savedItems.length),
    };
  }

  private async buildCommentLikeState(userId: string, commentId: string) {
    const stats = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      include: {
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException('Yorum bulunamadi.');
    }

    return {
      success: true,
      isLiked: Boolean(stats.likes.length),
      likeCount: stats._count.likes,
    };
  }

  private async findAccessiblePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post bulunamadi.');
    }

    if (post.ownerId === userId || post.visibility === ContentVisibility.PUBLIC) {
      return post;
    }

    if (post.visibility === ContentVisibility.FOLLOWERS_ONLY) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: post.ownerId,
          },
        },
        select: {
          id: true,
        },
      });

      if (follow) {
        return post;
      }
    }

    throw new NotFoundException('Post bulunamadi.');
  }

  private async findComment(postId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        postId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Yorum bulunamadi.');
    }

    return comment;
  }

  private inferMediaType(url: string) {
    return /\.(mp4|mov|avi|webm)$/i.test(url) ? MediaType.VIDEO : MediaType.IMAGE;
  }

  private encodeCursor(cursor: FeedCursor) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): FeedCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as FeedCursor;

      if (
        typeof parsed.id !== 'string' ||
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.priority !== 'number' ||
        typeof parsed.discoveryBucket !== 'number' ||
        Number.isNaN(new Date(parsed.createdAt).getTime())
      ) {
        throw new Error('Invalid cursor');
      }

      return parsed;
    } catch {
      throw new BadRequestException('Feed cursor gecersiz.');
    }
  }

  private prioritySql(userId: string) {
    return Prisma.sql`
      CASE
        WHEN p."ownerId" = ${userId} THEN 2
        WHEN EXISTS (
          SELECT 1
          FROM "Follow" priority_follow
          WHERE priority_follow."followerId" = ${userId}
            AND priority_follow."followingId" = p."ownerId"
        ) THEN 1
        ELSE 0
      END
    `;
  }

  private discoverySql(userId: string) {
    return Prisma.sql`
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "Follow" discovery_follow
          WHERE discovery_follow."followerId" = ${userId}
            AND discovery_follow."followingId" = p."ownerId"
        ) OR p."ownerId" = ${userId}
        THEN 0
        ELSE ABS(hashtext(p.id || ${userId})) % 97
      END
    `;
  }
}


