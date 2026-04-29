import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GarageService } from '../garage/garage.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly garageService: GarageService,
  ) {}

  async getPublicGarage(targetUserId: string) {
    return this.garageService.getPublicGarage(targetUserId);
  }

  async getPublicProfile(targetUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        userType: true,
        profile: {
          select: {
            avatarUrl: true,
            bio: true,
            locationText: true,
            blueVerified: true,
            goldVerified: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!user || user.profile?.isPrivate) {
      throw new NotFoundException('Profil bulunamadi.');
    }

    const publicGarage = await this.garageService.getPublicGarage(targetUserId);

    return {
      id: user.id,
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      userType: user.userType,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      locationText: user.profile?.locationText ?? null,
      blueVerified: user.profile?.blueVerified ?? false,
      goldVerified: user.profile?.goldVerified ?? false,
      publicGarage: publicGarage.items,
    };
  }

  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Kendinizi takip edemezsiniz.');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Takip edilecek kullanici bulunamadi.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
      },
      select: {
        username: true,
      },
    });

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
      update: {},
      create: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    await this.notificationsService.create({
      receiverId: targetUserId,
      actorId: currentUserId,
      type: 'follow',
      entityId: follow.id,
      title: 'Yeni takipci',
      body: `${currentUser?.username ?? 'Bir kullanici'} sizi takip etti.`,
      targetUrl: `/profile/${currentUserId}`,
    });

    return {
      success: true,
      following: true,
    };
  }

  async unfollowUser(currentUserId: string, targetUserId: string) {
    await this.prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    return {
      success: true,
      following: false,
    };
  }
}
