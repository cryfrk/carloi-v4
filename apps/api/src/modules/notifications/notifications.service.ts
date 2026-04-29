import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppQueuesService } from '../../common/infrastructure/app-queues.service';
import { PrismaService } from '../../common/prisma/prisma.service';

type NotificationInput = {
  receiverId: string;
  actorId?: string;
  actorUserId?: string | null;
  actorAdminId?: string | null;
  type: string;
  entityId: string;
  title: string;
  body: string;
  targetUrl?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: AppQueuesService,
  ) {}

  async create(input: NotificationInput) {
    const actorUserId = input.actorUserId ?? input.actorId ?? null;
    const actorAdminId = input.actorAdminId ?? null;

    if (actorUserId && input.receiverId === actorUserId) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.receiverId,
        actorUserId,
        actorAdminId,
        type: input.type,
        title: input.title,
        body: input.body,
        targetUrl: input.targetUrl,
        metadata:
          input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
            ? {
                entityId: input.entityId,
                seen: false,
                ...(input.metadata as Record<string, unknown>),
              }
            : {
                entityId: input.entityId,
                seen: false,
        },
      },
    });

    try {
      await this.queuesService.enqueueNotificationCreated({
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
      });
    } catch (error) {
      this.logger.warn(
        `Notification queue push basarisiz oldu: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return notification;
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        actorUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        actorAdmin: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const unreadCount = notifications.filter((item) => !item.readAt).length;

    return {
      unreadCount,
      items: notifications.map((notification) => this.serializeNotification(notification)),
    };
  }

  async markSeen(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Bildirim bulunamadi.');
    }

    const updated = await this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
      include: {
        actorUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        actorAdmin: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      notification: this.serializeNotification(updated),
    };
  }

  async markAllSeen(userId: string) {
    const seenAt = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: seenAt,
      },
    });

    return {
      success: true,
      updatedCount: result.count,
      seenAt: seenAt.toISOString(),
    };
  }

  private serializeNotification(
    notification: Prisma.NotificationGetPayload<{
      include: {
        actorUser: {
          select: {
            id: true;
            username: true;
            firstName: true;
            lastName: true;
            profile: { select: { avatarUrl: true } };
          };
        };
        actorAdmin: {
          select: {
            id: true;
            username: true;
            role: true;
          };
        };
      };
    }>,
  ) {
    const metadata =
      notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
        ? (notification.metadata as Record<string, unknown>)
        : {};
    const entityId = typeof metadata.entityId === 'string' ? metadata.entityId : null;

    return {
      id: notification.id,
      type: this.normalizeNotificationType(notification.type),
      title: notification.title,
      body: notification.body,
      targetUrl: notification.targetUrl ?? null,
      isSeen: Boolean(notification.readAt),
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actorUser
        ? {
            kind: 'USER',
            id: notification.actorUser.id,
            username: notification.actorUser.username,
            fullName: `${notification.actorUser.firstName} ${notification.actorUser.lastName}`.trim(),
            avatarUrl: notification.actorUser.profile?.avatarUrl ?? null,
          }
        : notification.actorAdmin
          ? {
              kind: 'ADMIN',
              id: notification.actorAdmin.id,
              username: notification.actorAdmin.username,
              fullName: notification.actorAdmin.username,
              avatarUrl: null,
              role: notification.actorAdmin.role,
            }
          : null,
      route: {
        appRoute: notification.targetUrl ?? null,
        entityId,
      },
    };
  }

  private normalizeNotificationType(type: string) {
    const map: Record<string, string> = {
      like: 'LIKE',
      comment: 'COMMENT',
      comment_reply: 'COMMENT_REPLY',
      comment_like: 'COMMENT_LIKE',
      follow: 'FOLLOW',
      message: 'MESSAGE',
      listing_saved: 'LISTING_SAVED',
      insurance_request_created: 'INSURANCE_REQUEST_CREATED',
      insurance_offer_ready: 'INSURANCE_OFFER_READY',
      insurance_offer_rejected: 'INSURANCE_OFFER_REJECTED',
      payment_success: 'PAYMENT_SUCCESS',
      payment_failed: 'PAYMENT_FAILED',
      policy_document_ready: 'POLICY_DOCUMENT_READY',
      commercial_application_submitted: 'COMMERCIAL_APPLICATION_SUBMITTED',
      commercial_application_approved: 'COMMERCIAL_APPLICATION_APPROVED',
      commercial_application_rejected: 'COMMERCIAL_APPLICATION_REJECTED',
      listing_suspended: 'LISTING_SUSPENDED',
      user_disabled: 'USER_DISABLED',
      insurance_requested: 'INSURANCE_REQUEST_CREATED',
    };

    return map[type] ?? type.toUpperCase();
  }
}
