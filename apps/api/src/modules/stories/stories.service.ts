import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentVisibility, MediaAssetPurpose, MediaType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

type StoryRecord = Prisma.StoryGetPayload<{
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
            isPrivate: true;
          };
        };
      };
    };
    media: true;
    views: {
      where: { viewerId: string };
      select: { id: true };
    };
    _count: {
      select: { views: true };
    };
  };
}>;

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(userId: string, dto: CreateStoryDto) {
    const mediaType = dto.media.mediaType ?? this.inferMediaType(dto.media.url);

    if (mediaType === MediaType.VIDEO && dto.media.durationSeconds && dto.media.durationSeconds > 15) {
      throw new BadRequestException('Hikaye videolari en fazla 15 saniye olabilir.');
    }

    let mediaUrl = dto.media.url.trim();
    let mediaAssetId: string | null = null;

    if (dto.media.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findFirst({
        where: {
          id: dto.media.mediaAssetId,
          ownerId: userId,
          purpose: MediaAssetPurpose.STORY_MEDIA,
          deletedAt: null,
        },
      });

      if (!asset) {
        throw new BadRequestException('Secilen hikaye medyasi kullanilamiyor.');
      }

      mediaUrl = asset.url;
      mediaAssetId = asset.id;
    }

    const story = await this.prisma.story.create({
      data: {
        ownerId: userId,
        caption: dto.caption?.trim() || null,
        locationText: dto.locationText?.trim() || null,
        visibility: dto.visibility ?? ContentVisibility.PUBLIC,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        media: {
          create: {
            url: mediaUrl,
            mediaType,
            mediaAssetId,
            sortOrder: 0,
          },
        },
      },
      include: this.storyInclude(userId),
    });

    return {
      success: true,
      story: this.serializeStory(story, userId, true),
    };
  }

  async getStoryFeed(userId: string) {
    const now = new Date();
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = follows.map((item) => item.followingId);

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        OR: [
          { ownerId: userId },
          { ownerId: { in: followingIds } },
          {
            visibility: ContentVisibility.PUBLIC,
            owner: {
              profile: {
                is: {
                  isPrivate: false,
                },
              },
            },
          },
        ],
      },
      include: this.storyInclude(userId),
      orderBy: [{ createdAt: 'desc' }],
    });

    const visibleStories = stories.filter((story) => this.canViewStory(userId, story, followingIds));
    const grouped = new Map<string, { owner: ReturnType<StoriesService['serializeOwner']>; stories: ReturnType<StoriesService['serializeStory']>[] }>();

    for (const story of visibleStories) {
      const group = grouped.get(story.ownerId) ?? {
        owner: this.serializeOwner(story),
        stories: [],
      };

      group.stories.push(this.serializeStory(story, userId, story.ownerId === userId));
      grouped.set(story.ownerId, group);
    }

    const items = [...grouped.values()]
      .map((group) => ({
        owner: group.owner,
        stories: group.stories.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
        hasUnviewed: group.stories.some((story) => !story.viewedByMe),
        latestCreatedAt: group.stories[group.stories.length - 1]?.createdAt ?? null,
      }))
      .sort((left, right) => {
        const leftOwn = left.owner.id === userId ? 1 : 0;
        const rightOwn = right.owner.id === userId ? 1 : 0;
        if (leftOwn !== rightOwn) {
          return rightOwn - leftOwn;
        }
        if (left.hasUnviewed !== right.hasUnviewed) {
          return Number(right.hasUnviewed) - Number(left.hasUnviewed);
        }
        return (right.latestCreatedAt ?? '').localeCompare(left.latestCreatedAt ?? '');
      });

    return { items };
  }

  async getUserStories(currentUserId: string, targetUserId: string) {
    const follow = currentUserId === targetUserId
      ? true
      : Boolean(
          await this.prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: targetUserId,
              },
            },
            select: { id: true },
          }),
        );

    const stories = await this.prisma.story.findMany({
      where: {
        ownerId: targetUserId,
        expiresAt: { gt: new Date() },
      },
      include: this.storyInclude(currentUserId),
      orderBy: { createdAt: 'asc' },
    });

    if (stories.length === 0) {
      return { owner: null, items: [] };
    }

    const [firstStory] = stories;

    if (!firstStory) {
      return { owner: null, items: [] };
    }

    if (!this.canViewStory(currentUserId, firstStory, follow ? [targetUserId] : [])) {
      throw new ForbiddenException('Bu hikayeleri gorme yetkiniz yok.');
    }

    return {
      owner: this.serializeOwner(firstStory),
      items: stories.map((story) => this.serializeStory(story, currentUserId, currentUserId === targetUserId)),
    };
  }

  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, ownerId: userId },
      select: { id: true },
    });

    if (!story) {
      throw new NotFoundException('Hikaye bulunamadi.');
    }

    await this.prisma.story.delete({ where: { id: storyId } });
    return { success: true };
  }

  async markViewed(userId: string, storyId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      include: {
        owner: {
          select: {
            profile: { select: { isPrivate: true } },
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Hikaye bulunamadi.');
    }

    if (story.ownerId !== userId) {
      const follows = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: story.ownerId,
          },
        },
        select: { id: true },
      });

      if (story.owner.profile?.isPrivate && !follows) {
        throw new ForbiddenException('Bu hikayeyi goruntuleyemezsiniz.');
      }

      await this.prisma.storyView.upsert({
        where: {
          storyId_viewerId: {
            storyId,
            viewerId: userId,
          },
        },
        update: { viewedAt: new Date() },
        create: { storyId, viewerId: userId },
      });
    }

    const count = await this.prisma.storyView.count({ where: { storyId } });

    return {
      success: true,
      viewedByMe: true,
      viewerCount: count,
    };
  }

  async getViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, ownerId: userId },
      select: { id: true },
    });

    if (!story) {
      throw new NotFoundException('Hikaye bulunamadi.');
    }

    const viewers = await this.prisma.storyView.findMany({
      where: { storyId },
      include: {
        viewer: {
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
      },
      orderBy: { viewedAt: 'desc' },
    });

    return {
      items: viewers.map((item) => ({
        id: item.id,
        viewedAt: item.viewedAt.toISOString(),
        viewer: {
          id: item.viewer.id,
          username: item.viewer.username,
          firstName: item.viewer.firstName,
          lastName: item.viewer.lastName,
          avatarUrl: item.viewer.profile?.avatarUrl ?? null,
          blueVerified: item.viewer.profile?.blueVerified ?? false,
          goldVerified: item.viewer.profile?.goldVerified ?? false,
        },
      })),
    };
  }

  private storyInclude(userId: string) {
    return {
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
              isPrivate: true,
            },
          },
        },
      },
      media: {
        orderBy: { sortOrder: 'asc' },
      },
      views: {
        where: { viewerId: userId },
        select: { id: true },
      },
      _count: {
        select: { views: true },
      },
    } as const;
  }

  private canViewStory(userId: string, story: StoryRecord, followingIds: string[]) {
    if (story.ownerId === userId) {
      return true;
    }

    const followsOwner = followingIds.includes(story.ownerId);
    if (story.owner.profile?.isPrivate && !followsOwner) {
      return false;
    }

    if (story.visibility === ContentVisibility.PUBLIC) {
      return true;
    }

    return followsOwner;
  }

  private serializeOwner(story: StoryRecord) {
    return {
      id: story.owner.id,
      username: story.owner.username,
      firstName: story.owner.firstName,
      lastName: story.owner.lastName,
      avatarUrl: story.owner.profile?.avatarUrl ?? null,
      blueVerified: story.owner.profile?.blueVerified ?? false,
      goldVerified: story.owner.profile?.goldVerified ?? false,
    };
  }

  private serializeStory(story: StoryRecord, currentUserId: string, includeViewerCount: boolean) {
    const primaryMedia = story.media[0];

    return {
      id: story.id,
      owner: this.serializeOwner(story),
      media: primaryMedia
        ? {
            id: primaryMedia.id,
            url: primaryMedia.url,
            mediaType: primaryMedia.mediaType,
            sortOrder: primaryMedia.sortOrder,
          }
        : null,
      caption: story.caption,
      locationText: story.locationText,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
      viewedByMe: story.ownerId === currentUserId ? false : Boolean(story.views.length),
      viewerCount: includeViewerCount ? story._count.views : null,
    };
  }

  private inferMediaType(url: string) {
    return /\.(mp4|mov|avi|webm)$/i.test(url) ? MediaType.VIDEO : MediaType.IMAGE;
  }
}
