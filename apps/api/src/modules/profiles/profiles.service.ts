import {
  ConflictException,
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ContentVisibility, ListingStatus, MediaAssetPurpose, Prisma, SavedItemType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { maskPlateNumber } from '../listings/listings.utils';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { ChangePasswordDto, UpdatePrivacyDto, UpdateProfileDto } from './dto/profile-settings.dto';

const gridPostInclude = Prisma.validator<Prisma.PostInclude>()({
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 1,
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
});

const listingProfileInclude = Prisma.validator<Prisma.ListingInclude>()({
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 1,
  },
  savedItems: true,
  garageVehicle: {
    include: {
      vehiclePackage: {
        include: {
          model: {
            include: {
              brand: true,
            },
          },
        },
      },
    },
  },
});

const profileVehicleInclude = Prisma.validator<Prisma.GarageVehicleInclude>()({
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  vehiclePackage: {
    include: {
      model: {
        include: {
          brand: true,
        },
      },
      spec: true,
    },
  },
});

const savedItemInclude = Prisma.validator<Prisma.SavedItemInclude>()({
  post: {
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
      media: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
      likes: {
        select: {
          id: true,
        },
      },
      savedItems: {
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
  },
  listing: {
    include: listingProfileInclude,
  },
});

type GridPostRecord = Prisma.PostGetPayload<{ include: typeof gridPostInclude }>;
type ListingProfileRecord = Prisma.ListingGetPayload<{ include: typeof listingProfileInclude }>;
type ProfileVehicleRecord = Prisma.GarageVehicleGetPayload<{ include: typeof profileVehicleInclude }>;
type SavedItemRecord = Prisma.SavedItemGetPayload<{ include: typeof savedItemInclude }>;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    return this.buildProfileResponse(userId, userId);
  }

  async getProfileByIdentifier(viewerId: string, usernameOrId: string) {
    const target = await this.resolveTargetUser(usernameOrId);
    return this.buildProfileResponse(viewerId, target.id);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureProfile(userId);
    const avatarAssetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      dto.avatarMediaAssetId ? [dto.avatarMediaAssetId] : [],
      [MediaAssetPurpose.PROFILE_AVATAR],
    );
    const avatarAsset = dto.avatarMediaAssetId ? avatarAssetMap.get(dto.avatarMediaAssetId) : null;

    if (dto.avatarMediaAssetId && !avatarAsset) {
      throw new BadRequestException('Profil resmi dosyasi kullanilamiyor.');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (dto.firstName !== undefined || dto.lastName !== undefined || dto.username !== undefined) {
          await tx.user.update({
            where: { id: userId },
            data: {
              firstName: dto.firstName?.trim(),
              lastName: dto.lastName?.trim(),
              username: dto.username?.trim().toLowerCase(),
            },
          });
        }

        await tx.profile.update({
          where: { userId },
          data: {
            avatarUrl: avatarAsset?.url ?? this.toOptionalString(dto.avatarUrl),
            avatarMediaAssetId: avatarAsset?.id ?? (dto.avatarUrl !== undefined ? null : undefined),
            bio: this.toOptionalString(dto.bio),
            websiteUrl: this.toOptionalString(dto.websiteUrl),
            locationText: this.toOptionalString(dto.locationText),
          },
        });
      });
    } catch (error) {
      this.handleWriteError(error);
    }

    return this.getMyProfile(userId);
  }

  async getProfilePosts(viewerId: string, usernameOrId: string) {
    const target = await this.resolveTargetUser(usernameOrId);
    const access = await this.resolveAccess(viewerId, target.id);

    if (!access.canViewContent) {
      return {
        items: [],
        hiddenByPrivacy: true,
      };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        ownerId: target.id,
        ...(this.buildPostVisibilityWhere(access) ?? {}),
      },
      include: gridPostInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: 24,
    });

    return {
      items: posts.map((post) => this.serializeProfilePost(post)),
      hiddenByPrivacy: false,
    };
  }

  async getProfileListings(viewerId: string, usernameOrId: string) {
    const target = await this.resolveTargetUser(usernameOrId);
    const access = await this.resolveAccess(viewerId, target.id);

    if (!access.canViewContent) {
      return {
        items: [],
        hiddenByPrivacy: true,
      };
    }

    const listings = await this.prisma.listing.findMany({
      where: {
        sellerId: target.id,
        deletedAt: null,
        listingStatus: {
          in: access.isOwnProfile
            ? [
                ListingStatus.ACTIVE,
                ListingStatus.PENDING_LEGAL_CHECK,
                ListingStatus.RESERVED,
                ListingStatus.SOLD,
                ListingStatus.SUSPENDED,
              ]
            : [ListingStatus.ACTIVE, ListingStatus.RESERVED, ListingStatus.SOLD],
        },
      },
      include: listingProfileInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: 24,
    });

    return {
      items: listings.map((listing) => this.serializeProfileListing(viewerId, listing)),
      hiddenByPrivacy: false,
    };
  }

  async getProfileVehicles(viewerId: string, usernameOrId: string) {
    const target = await this.resolveTargetUser(usernameOrId);
    const access = await this.resolveAccess(viewerId, target.id);

    if (!access.canShowVehicles) {
      return {
        items: [],
        hiddenByPrivacy: access.profile?.isPrivate ? !access.canViewContent : false,
        hiddenByProfile: access.profile?.showGarageVehicles === false,
      };
    }

    const vehicles = await this.prisma.garageVehicle.findMany({
      where: {
        ownerId: target.id,
        deletedAt: null,
        ...(access.isOwnProfile ? {} : { isPublic: true }),
      },
      include: profileVehicleInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: 24,
    });

    return {
      items: vehicles.map((vehicle) => this.serializeProfileVehicle(vehicle)),
      hiddenByPrivacy: false,
      hiddenByProfile: false,
    };
  }

  async getSettings(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        userType: true,
        isVerified: true,
        isCommercialApproved: true,
        profile: true,
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profil bulunamadi.');
    }

    const [savedPosts, savedListings, sessionCount, latestCommercialApplication] = await this.prisma.$transaction([
      this.prisma.savedItem.count({
        where: {
          userId,
          itemType: SavedItemType.POST,
          postId: { not: null },
        },
      }),
      this.prisma.savedItem.count({
        where: {
          userId,
          itemType: SavedItemType.LISTING,
          listingId: { not: null },
        },
      }),
      this.prisma.accountSession.count({
        where: {
          userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
      this.prisma.commercialApplication.findFirst({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      profile: {
        avatarUrl: user.profile.avatarUrl ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email ?? null,
        phone: user.phone ?? null,
        bio: user.profile.bio ?? null,
        websiteUrl: user.profile.websiteUrl ?? null,
        locationText: user.profile.locationText ?? null,
        blueVerified: user.profile.blueVerified,
        goldVerified: user.profile.goldVerified,
      },
      privacy: {
        isPrivate: user.profile.isPrivate,
        showGarageVehicles: user.profile.showGarageVehicles,
      },
      accountCenter: {
        userType: user.userType,
        isVerified: user.isVerified,
        isCommercialApproved: user.isCommercialApproved,
        activeSessionCount: sessionCount,
        savedPostsCount: savedPosts,
        savedListingsCount: savedListings,
      },
      commercialApplication: latestCommercialApplication
        ? {
            id: latestCommercialApplication.id,
            status: latestCommercialApplication.status,
            companyName: latestCommercialApplication.companyName,
            taxNumberMasked: this.maskTaxNumber(latestCommercialApplication.taxNumber),
            submittedAt: latestCommercialApplication.submittedAt.toISOString(),
            reviewedAt: latestCommercialApplication.reviewedAt?.toISOString() ?? null,
            rejectionReason: latestCommercialApplication.rejectionReason ?? null,
          }
        : null,
    };
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
    await this.ensureProfile(userId);

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        isPrivate: dto.isPrivate,
        showGarageVehicles: dto.showGarageVehicles,
      },
    });

    return {
      success: true,
      privacy: {
        isPrivate: profile.isPrivate,
        showGarageVehicles: profile.showGarageVehicles,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ForbiddenException('Yeni sifre ve tekrar alani eslesmelidir.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    const passwordMatches = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new ForbiddenException('Mevcut sifreniz dogrulanamadi.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.accountSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      success: true,
      message: 'Sifreniz guncellendi. Lutfen yeniden giris yapin.',
    };
  }

  async getSavedItems(userId: string) {
    const savedItems = await this.prisma.savedItem.findMany({
      where: {
        userId,
      },
      include: savedItemInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const savedPosts = savedItems
      .filter((item) => Boolean(item.post))
      .map((item) => ({
        savedAt: item.createdAt.toISOString(),
        post: this.serializeSavedPost(item.post!),
      }));

    const savedListings = savedItems
      .filter((item) => Boolean(item.listing))
      .map((item) => ({
        savedAt: item.createdAt.toISOString(),
        listing: this.serializeProfileListing(userId, item.listing as ListingProfileRecord),
      }));

    return {
      savedPosts,
      savedListings,
    };
  }

  private async buildProfileResponse(viewerId: string, targetUserId: string) {
    const target = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profile: true,
      },
    });

    if (!target || !target.profile) {
      throw new NotFoundException('Profil bulunamadi.');
    }

    const access = await this.resolveAccess(viewerId, target.id);
    const [postCount, listingCount, vehicleCount, followerCount, followingCount, mutualFollowers] =
      await Promise.all([
        this.prisma.post.count({
          where: {
            ownerId: target.id,
            ...(this.buildPostVisibilityWhere(access) ?? {}),
          },
        }),
        this.prisma.listing.count({
          where: {
            sellerId: target.id,
            deletedAt: null,
            listingStatus: {
              in: access.isOwnProfile
                ? [
                    ListingStatus.ACTIVE,
                    ListingStatus.PENDING_LEGAL_CHECK,
                    ListingStatus.RESERVED,
                    ListingStatus.SOLD,
                    ListingStatus.SUSPENDED,
                  ]
                : access.canViewContent
                  ? [ListingStatus.ACTIVE, ListingStatus.RESERVED, ListingStatus.SOLD]
                  : [],
            },
          },
        }),
        this.prisma.garageVehicle.count({
          where: {
            ownerId: target.id,
            deletedAt: null,
            ...(access.isOwnProfile ? {} : { isPublic: access.canShowVehicles }),
            ...(access.canShowVehicles ? {} : { id: '__none__' }),
          },
        }),
        this.prisma.follow.count({
          where: {
            followingId: target.id,
          },
        }),
        this.prisma.follow.count({
          where: {
            followerId: target.id,
          },
        }),
        this.getMutualFollowers(viewerId, target.id),
      ]);

    return {
      id: target.id,
      avatarUrl: target.profile.avatarUrl ?? null,
      firstName: target.firstName,
      lastName: target.lastName,
      username: target.username,
      bio: target.profile.bio ?? null,
      bioMentions: this.parseMentions(target.profile.bio),
      websiteUrl: target.profile.websiteUrl ?? null,
      locationText: target.profile.locationText ?? null,
      blueVerified: target.profile.blueVerified,
      goldVerified: target.profile.goldVerified,
      postCount,
      listingCount,
      vehicleCount,
      followerCount,
      followingCount,
      isFollowing: access.isFollowing,
      isOwnProfile: access.isOwnProfile,
      isPrivate: target.profile.isPrivate,
      canViewContent: access.canViewContent,
      mutualFollowers,
    };
  }

  private async resolveAccess(viewerId: string, targetUserId: string) {
    const profile = await this.ensureProfile(targetUserId);
    const isOwnProfile = viewerId === targetUserId;
    const isFollowing =
      isOwnProfile
        ? false
        : Boolean(
            await this.prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: viewerId,
                  followingId: targetUserId,
                },
              },
              select: { id: true },
            }),
          );
    const canViewContent = isOwnProfile || !profile.isPrivate || isFollowing;
    const canShowVehicles =
      (isOwnProfile || canViewContent) && profile.showGarageVehicles !== false;

    return {
      isOwnProfile,
      isFollowing,
      canViewContent,
      canShowVehicles,
      profile,
    };
  }

  private buildPostVisibilityWhere(access: {
    isOwnProfile: boolean;
    isFollowing: boolean;
    canViewContent: boolean;
  }) {
    if (access.isOwnProfile) {
      return undefined;
    }

    if (!access.canViewContent) {
      return {
        id: '__none__',
      };
    }

    if (access.isFollowing) {
      return {
        visibility: {
          in: [ContentVisibility.PUBLIC, ContentVisibility.FOLLOWERS_ONLY],
        },
      };
    }

    return {
      visibility: ContentVisibility.PUBLIC,
    };
  }

  private async resolveTargetUser(usernameOrId: string) {
    const normalized = usernameOrId.trim();
    const target = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { id: normalized },
          {
            username: {
              equals: normalized,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!target) {
      throw new NotFoundException('Profil bulunamadi.');
    }

    return target;
  }

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profil bulunamadi.');
    }

    return profile;
  }

  private serializeProfilePost(post: GridPostRecord) {
    return {
      id: post.id,
      thumbnailUrl: post.media[0]?.url ?? null,
      mediaType: post.media[0]?.mediaType ?? 'IMAGE',
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      createdAt: post.createdAt.toISOString(),
    };
  }

  private serializeProfileListing(viewerId: string, listing: ListingProfileRecord) {
    const garageVehicle = listing.garageVehicle;
    return {
      listingId: listing.id,
      listingNo: listing.listingNo,
      firstMediaUrl: listing.media[0]?.url ?? null,
      title: listing.title,
      brand: garageVehicle?.vehiclePackage?.model.brand.name ?? garageVehicle?.brandText ?? null,
      model: garageVehicle?.vehiclePackage?.model.name ?? garageVehicle?.modelText ?? null,
      package: garageVehicle?.vehiclePackage?.name ?? garageVehicle?.packageText ?? null,
      city: listing.city,
      district: listing.district ?? null,
      price: Number(listing.price),
      km: garageVehicle?.km ?? null,
      sellerType: listing.sellerType,
      isSaved: Boolean(listing.savedItems.some((item) => item.userId === viewerId)),
      listingStatus: listing.listingStatus,
      createdAt: listing.createdAt.toISOString(),
    };
  }

  private serializeProfileVehicle(vehicle: ProfileVehicleRecord) {
    const spec = vehicle.vehiclePackage?.spec ?? null;
    return {
      id: vehicle.id,
      firstMediaUrl: vehicle.media[0]?.url ?? null,
      media: vehicle.media.map((item) => ({
        id: item.id,
        url: item.url,
        mediaType: item.mediaType,
        sortOrder: item.sortOrder,
      })),
      brand: vehicle.vehiclePackage?.model.brand.name ?? vehicle.brandText,
      model: vehicle.vehiclePackage?.model.name ?? vehicle.modelText,
      package: vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null,
      plateNumberMasked: maskPlateNumber(vehicle.plateNumber),
      year: vehicle.year,
      km: vehicle.km,
      isPublic: vehicle.isPublic,
      color: vehicle.color ?? null,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      bodyType: spec?.bodyType ?? null,
      enginePowerHp: spec?.enginePowerHp ?? null,
      engineVolumeCc: spec?.engineVolumeCc ?? null,
      tractionType: spec?.tractionType ?? null,
      description: vehicle.description ?? null,
      equipmentNotes: vehicle.equipmentNotes ?? null,
      showInExplore: vehicle.showInExplore,
      openToOffers: vehicle.openToOffers,
    };
  }

  private serializeSavedPost(post: NonNullable<SavedItemRecord['post']>) {
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
        isFollowing: false,
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

  private async getMutualFollowers(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      return [];
    }

    const followingIds = await this.prisma.follow.findMany({
      where: {
        followerId: viewerId,
      },
      select: {
        followingId: true,
      },
      take: 50,
    });

    if (followingIds.length === 0) {
      return [];
    }

    const mutuals = await this.prisma.follow.findMany({
      where: {
        followerId: {
          in: followingIds.map((item) => item.followingId),
        },
        followingId: targetUserId,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
      take: 3,
    });

    return mutuals.map((item) => ({
      id: item.follower.id,
      username: item.follower.username,
      avatarUrl: item.follower.profile?.avatarUrl ?? null,
    }));
  }

  private parseMentions(bio: string | null) {
    if (!bio) {
      return [];
    }

    return [...new Set((bio.match(/@[a-zA-Z0-9._-]+/g) ?? []).map((item) => item.slice(1)))];
  }

  private toOptionalString(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private maskTaxNumber(value: string) {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Bu alanlardan biri zaten kullanimda.');
    }

    throw error;
  }
}


