import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AttachmentType,
  ListingStatus,
  MediaAssetPurpose,
  MessageThreadType,
  MessageType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { InsuranceService } from '../insurance/insurance.service';
import { trimNullable } from '../listings/listings.utils';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDirectThreadDto,
  CreateGroupThreadDto,
  SendMessageDto,
} from './dto/thread-actions.dto';

const threadSummaryInclude = {
  listing: {
    select: {
      id: true,
      listingNo: true,
      title: true,
      price: true,
      currency: true,
      city: true,
      district: true,
      sellerId: true,
      seller: {
        select: {
          username: true,
        },
      },
      media: {
        orderBy: {
          sortOrder: 'asc',
        },
        take: 1,
      },
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profile: {
            select: {
              avatarUrl: true,
              isPrivate: true,
            },
          },
        },
      },
    },
  },
  dealAgreement: true,
  insuranceRequests: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
    select: {
      id: true,
      status: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      attachments: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  },
} as const satisfies Prisma.MessageThreadInclude;

const threadDetailInclude = {
  listing: threadSummaryInclude.listing,
  participants: threadSummaryInclude.participants,
  dealAgreement: true,
  insuranceRequests: threadSummaryInclude.insuranceRequests,
  messages: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      attachments: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  },
} as const satisfies Prisma.MessageThreadInclude;

const listingDealContextInclude = {
  listing: {
    include: {
      seller: {
        select: {
          id: true,
          username: true,
        },
      },
      media: {
        orderBy: {
          sortOrder: 'asc',
        },
        take: 1,
      },
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
    },
  },
  participants: threadSummaryInclude.participants,
  dealAgreement: true,
  insuranceRequests: threadSummaryInclude.insuranceRequests,
} as const satisfies Prisma.MessageThreadInclude;

type ThreadSummaryRecord = Prisma.MessageThreadGetPayload<{
  include: typeof threadSummaryInclude;
}>;

type ThreadDetailRecord = Prisma.MessageThreadGetPayload<{
  include: typeof threadDetailInclude;
}>;

type ListingDealContextRecord = Prisma.MessageThreadGetPayload<{
  include: typeof listingDealContextInclude;
}>;

type PrismaLike = PrismaService | Prisma.TransactionClient;

type LicenseInfoSystemCardPayload = {
  type: 'LICENSE_INFO_CARD';
  listingId: string;
  vehicleInfo: string;
  licenseOwnerName: string;
  maskedTcNo: string | null;
  maskedPlate: string | null;
  buttonLabel: string;
};

type InsuranceOfferSystemCardPayload = {
  type: 'INSURANCE_OFFER_CARD';
  requestId: string;
  offerId: string;
  amount: number;
  currency: string;
  buttonLabel: string;
};

type PaymentStatusSystemCardPayload = {
  type: 'PAYMENT_STATUS_CARD';
  requestId: string | null;
  paymentId: string | null;
  status: string;
  buttonLabel: string;
};

type PolicyDocumentSystemCardPayload = {
  type: 'POLICY_DOCUMENT_CARD';
  requestId: string;
  buttonLabel: string;
};

type SystemCardPayload =
  | LicenseInfoSystemCardPayload
  | InsuranceOfferSystemCardPayload
  | PaymentStatusSystemCardPayload
  | PolicyDocumentSystemCardPayload;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly insuranceService: InsuranceService,
  ) {}

  async getThreads(userId: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: threadSummaryInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      items: await Promise.all(
        threads.map(async (thread) =>
          this.serializeThreadSummary(userId, thread, await this.getUnreadCount(userId, thread)),
        ),
      ),
    };
  }

  async getThreadDetail(userId: string, threadId: string) {
    const thread = await this.findThreadForParticipant(userId, threadId, threadDetailInclude);

    return this.serializeThreadDetail(userId, thread, await this.getUnreadCount(userId, thread));
  }

  async createDirectThread(userId: string, dto: CreateDirectThreadDto) {
    if (dto.targetUserId === userId) {
      throw new BadRequestException('Kendinizle direct sohbet baslatamazsiniz.');
    }

    await this.ensureUserExists(dto.targetUserId);

    const existingThread = await this.findExistingDirectThread(userId, dto.targetUserId);

    if (existingThread) {
      if (dto.initialMessage) {
        await this.sendMessageInternal(userId, existingThread.id, dto.initialMessage);
      }

      return {
        success: true,
        thread: await this.getThreadDetail(userId, existingThread.id),
      };
    }

    const thread = await this.prisma.messageThread.create({
      data: {
        type: MessageThreadType.DIRECT,
        participants: {
          create: [{ userId }, { userId: dto.targetUserId }],
        },
      },
      select: {
        id: true,
      },
    });

    if (dto.initialMessage) {
      await this.sendMessageInternal(userId, thread.id, dto.initialMessage);
    }

    return {
      success: true,
      thread: await this.getThreadDetail(userId, thread.id),
    };
  }

  async createGroupThread(userId: string, dto: CreateGroupThreadDto) {
    const groupName = dto.groupName.trim();
    if (!groupName) {
      throw new BadRequestException('Grup adi zorunludur.');
    }

    const participantIds = [...new Set(dto.participantIds.filter((participantId) => participantId !== userId))];

    if (participantIds.length < 2) {
      throw new BadRequestException('Grup olusturmak icin en az iki kisi secmelisiniz.');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: participantIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (users.length !== participantIds.length) {
      throw new NotFoundException('Secilen kullanicilardan biri bulunamadi.');
    }

    const thread = await this.prisma.messageThread.create({
      data: {
        type: MessageThreadType.GROUP,
        groupName,
        participants: {
          create: [{ userId }, ...participantIds.map((participantId) => ({ userId: participantId }))],
        },
      },
      select: {
        id: true,
      },
    });

    if (dto.initialMessage) {
      await this.sendMessageInternal(userId, thread.id, dto.initialMessage);
    }

    return {
      success: true,
      thread: await this.getThreadDetail(userId, thread.id),
    };
  }

  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    const message = await this.sendMessageInternal(userId, threadId, dto);

    return {
      success: true,
      threadId,
      message,
    };
  }

  async markThreadSeen(userId: string, threadId: string) {
    await this.findThreadForParticipant(userId, threadId, {
      participants: {
        where: {
          userId,
        },
      },
    });

    const seenAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.messageThreadParticipant.updateMany({
        where: {
          threadId,
          userId,
        },
        data: {
          lastReadAt: seenAt,
        },
      });

      await tx.message.updateMany({
        where: {
          threadId,
          senderId: {
            not: userId,
          },
          seenAt: null,
        },
        data: {
          seenAt,
        },
      });
    });

    return {
      success: true,
      threadId,
      seenAt: seenAt.toISOString(),
    };
  }

  async getFriends(userId: string) {
    const following = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
                isPrivate: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    if (following.length > 0) {
      const followingIds = following.map((item) => item.followingId);
      const mutuals = await this.prisma.follow.findMany({
        where: {
          followerId: {
            in: followingIds,
          },
          followingId: userId,
        },
        select: {
          followerId: true,
        },
      });
      const mutualSet = new Set(mutuals.map((item) => item.followerId));

      return {
        items: following
          .map((item) => this.serializeParticipantFromUser(item.following, mutualSet.has(item.followingId)))
          .sort((left, right) => Number(right.isMutualFollow ?? false) - Number(left.isMutualFollow ?? false)),
      };
    }

    const suggestions = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },
        deletedAt: null,
        profile: {
          is: {
            isPrivate: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            avatarUrl: true,
            isPrivate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,
    });

    return {
      items: suggestions.map((item) => this.serializeParticipantFromUser(item, false)),
    };
  }

  async searchUsers(userId: string, query: string | undefined) {
    const normalizedQuery = query?.trim() ?? '';

    if (normalizedQuery.length < 2) {
      return {
        items: [],
      };
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },
        deletedAt: null,
        OR: [
          {
            username: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            avatarUrl: true,
            isPrivate: true,
          },
        },
      },
      take: 12,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: users.map((item) => this.serializeSearchResult(item)),
    };
  }

  async startListingDeal(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: listingId,
        deletedAt: null,
        listingStatus: ListingStatus.ACTIVE,
      },
      select: {
        id: true,
        title: true,
        sellerId: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    if (listing.sellerId === userId) {
      throw new BadRequestException('Kendi ilaniniza mesaj baslatamazsiniz.');
    }

    const existing = await this.prisma.listingDealAgreement.findUnique({
      where: {
        listingId_buyerId_sellerId: {
          listingId,
          buyerId: userId,
          sellerId: listing.sellerId,
        },
      },
      select: {
        threadId: true,
      },
    });

    if (existing) {
      return {
        success: true,
        thread: await this.getThreadDetail(userId, existing.threadId),
      };
    }

    const systemText = `Bu sohbet ${listing.title} ilani icin baslatildi.`;
    const thread = await this.prisma.$transaction(async (tx) => {
      const createdThread = await tx.messageThread.create({
        data: {
          type: MessageThreadType.LISTING_DEAL,
          listingId,
          participants: {
            create: [{ userId }, { userId: listing.sellerId }],
          },
          dealAgreement: {
            create: {
              listingId,
              buyerId: userId,
              sellerId: listing.sellerId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      await this.createMessageRecord(tx, {
        threadId: createdThread.id,
        senderId: userId,
        messageType: MessageType.SYSTEM_CARD,
        body: systemText,
        allowSystemCard: true,
      });

      return createdThread;
    });

    await this.notificationsService.create({
      receiverId: listing.sellerId,
      actorId: userId,
      type: 'listing_deal_started',
      entityId: thread.id,
      title: 'Ilan icin yeni sohbet',
      body: `${listing.title} ilani icin yeni bir alici sohbeti baslatti.`,
      targetUrl: `/messages?thread=${thread.id}`,
    });

    return {
      success: true,
      thread: await this.getThreadDetail(userId, thread.id),
    };
  }

  async agreeToListingDeal(userId: string, threadId: string) {
    const context = await this.getListingDealContext(userId, threadId);
    const agreement = context.dealAgreement;

    if (!agreement) {
      throw new NotFoundException('Anlasma kaydi bulunamadi.');
    }

    if (userId !== agreement.buyerId && userId !== agreement.sellerId) {
      throw new NotFoundException('Sohbet bulunamadi.');
    }

    const now = new Date();
    const isBuyer = userId === agreement.buyerId;
    const wasFullyAgreed = Boolean(agreement.buyerAgreedAt && agreement.sellerAgreedAt);

    await this.prisma.listingDealAgreement.update({
      where: {
        threadId,
      },
      data: isBuyer
        ? {
            buyerAgreedAt: agreement.buyerAgreedAt ?? now,
          }
        : {
            sellerAgreedAt: agreement.sellerAgreedAt ?? now,
          },
    });

    const freshAgreement = await this.prisma.listingDealAgreement.findUnique({
      where: {
        threadId,
      },
    });

    const isFullyAgreed = Boolean(freshAgreement?.buyerAgreedAt && freshAgreement?.sellerAgreedAt);

    if (freshAgreement && isFullyAgreed && !wasFullyAgreed) {
      await this.createMessageRecord(this.prisma, {
        threadId,
        senderId: userId,
        messageType: MessageType.SYSTEM_CARD,
        body: 'Iki taraf anlasmayi onayladi. Ruhsat bilgileri sigorta teklifi icin paylasilabilir.',
        allowSystemCard: true,
      });

      await Promise.all([
        this.notificationsService.create({
          receiverId: freshAgreement.buyerId,
          actorId: userId,
          type: 'listing_deal_agreed',
          entityId: threadId,
          title: 'Anlasma tamamlandi',
          body: 'Iki taraf anlasmayi onayladi. Ruhsat paylasimi acildi.',
          targetUrl: `/messages?thread=${threadId}`,
        }),
        this.notificationsService.create({
          receiverId: freshAgreement.sellerId,
          actorId: userId,
          type: 'listing_deal_agreed',
          entityId: threadId,
          title: 'Anlasma tamamlandi',
          body: 'Iki taraf anlasmayi onayladi. Ruhsat paylasimi acildi.',
          targetUrl: `/messages?thread=${threadId}`,
        }),
      ]);
    } else {
      const counterpartId = isBuyer ? agreement.sellerId : agreement.buyerId;
      await this.notificationsService.create({
        receiverId: counterpartId,
        actorId: userId,
        type: 'listing_deal_progress',
        entityId: threadId,
        title: 'Anlasma onayi geldi',
        body: 'Karsi taraf anlasma butonuna basti.',
        targetUrl: `/messages?thread=${threadId}`,
      });
    }

    const thread = await this.getThreadDetail(userId, threadId);
    return {
      success: true,
      thread,
      dealAgreement: thread.dealAgreement,
    };
  }

  async shareLicenseInfo(userId: string, threadId: string) {
    const context = await this.getListingDealContext(userId, threadId);
    const agreement = context.dealAgreement;

    if (!agreement || !context.listing) {
      throw new NotFoundException('Deal sohbeti bulunamadi.');
    }

    if (userId !== agreement.sellerId) {
      throw new BadRequestException('Ruhsat bilgilerini sadece satici paylasabilir.');
    }

    if (!agreement.buyerAgreedAt || !agreement.sellerAgreedAt) {
      throw new BadRequestException('Iki taraf anlasmadan ruhsat bilgileri paylasilamaz.');
    }

    if (!context.listing.licenseOwnerName || !context.listing.plateNumber) {
      throw new BadRequestException(
        'Ruhsat bilgileri eksik. Once ilaninizdaki ruhsat alanlarini tamamlamalisiniz.',
      );
    }

    if (!agreement.licenseSharedAt) {
      const systemCard = this.buildLicenseInfoCard(context);

      await this.prisma.$transaction(async (tx) => {
        await tx.listingDealAgreement.update({
          where: {
            threadId,
          },
          data: {
            licenseSharedAt: new Date(),
          },
        });

        await this.createMessageRecord(tx, {
          threadId,
          senderId: userId,
          messageType: MessageType.SYSTEM_CARD,
          body: 'Ruhsat bilgileri sigorta sureci icin paylasildi.',
          allowSystemCard: true,
          metadata: {
            systemCard,
          },
        });
      });

      await this.notificationsService.create({
        receiverId: agreement.buyerId,
        actorId: userId,
        type: 'license_shared',
        entityId: threadId,
        title: 'Ruhsat paylasildi',
        body: 'Satici ruhsat kartini sigorta sureci icin paylasti.',
        targetUrl: `/messages?thread=${threadId}`,
      });
    }

    const thread = await this.getThreadDetail(userId, threadId);
    return {
      success: true,
      thread,
      dealAgreement: thread.dealAgreement,
    };
  }

  async requestInsurance(userId: string, threadId: string) {
    const context = await this.getListingDealContext(userId, threadId);
    const agreement = context.dealAgreement;

    if (!agreement || !context.listing) {
      throw new NotFoundException('Deal sohbeti bulunamadi.');
    }

    if (userId !== agreement.buyerId) {
      throw new BadRequestException('Sigorta talebini sadece alici baslatabilir.');
    }

    if (!agreement.licenseSharedAt) {
      throw new BadRequestException('Once ruhsat bilgileri paylasilmalidir.');
    }

    const { request, created } = await this.insuranceService.createOrGetRequest({
      buyerId: agreement.buyerId,
      sellerId: agreement.sellerId,
      listingId: agreement.listingId,
      sourceThreadId: threadId,
      vehicleId: null,
    });

    if (created) {
      await this.createMessageRecord(this.prisma, {
        threadId,
        senderId: userId,
        messageType: MessageType.SYSTEM_CARD,
        body: 'Sigorta teklif talebi Carloi sigorta ekibine iletildi.',
        allowSystemCard: true,
      });

      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'insurance_request_created_from_listing_deal',
          entityType: 'InsuranceRequest',
          entityId: request.id,
          metadata: {
            sourceThreadId: threadId,
            listingId: agreement.listingId,
            buyerId: agreement.buyerId,
            sellerId: agreement.sellerId,
            targetAdminRole: 'INSURANCE_ADMIN',
          },
        },
      });

      await Promise.all([
        this.notificationsService.create({
          receiverId: agreement.sellerId,
          actorId: userId,
          type: 'insurance_requested',
          entityId: request.id,
          title: 'Sigorta sureci basladi',
          body: 'Alici sigorta teklif talebi olusturdu.',
          targetUrl: `/messages?thread=${threadId}`,
        }),
        this.notificationsService.create({
          receiverId: agreement.buyerId,
          actorId: userId,
          type: 'insurance_requested',
          entityId: request.id,
          title: 'Sigorta sureci basladi',
          body: 'Talebiniz Carloi sigorta ekibine iletildi.',
          targetUrl: `/messages?thread=${threadId}`,
        }),
      ]);
    }

    const thread = await this.getThreadDetail(userId, threadId);

    return {
      success: true,
      requestId: request.id,
      status: request.status,
      thread,
    };
  }

  private async sendMessageInternal(userId: string, threadId: string, dto: SendMessageDto) {
    const thread = await this.findThreadForParticipant(userId, threadId, {
      participants: {
        select: {
          userId: true,
        },
      },
      listing: {
        select: {
          title: true,
        },
      },
    });

    if (dto.messageType === MessageType.SYSTEM_CARD) {
      throw new BadRequestException('System kartlari yalnizca sistem tarafindan uretilebilir.');
    }

    const message = await this.createMessageRecord(this.prisma, {
      threadId,
      senderId: userId,
      messageType: dto.messageType,
      body: dto.body,
      attachmentUrls: dto.attachmentUrls,
      attachmentAssetIds: dto.attachmentAssetIds,
    });

    const recipientIds = thread.participants
      .map((participant) => participant.userId)
      .filter((participantId) => participantId !== userId);

    await Promise.all(
      recipientIds.map((receiverId) =>
        this.notificationsService.create({
          receiverId,
          actorId: userId,
          type: 'message',
          entityId: message.id,
          title: 'Yeni mesaj',
          body:
            thread.type === MessageThreadType.LISTING_DEAL && thread.listing?.title
              ? `${thread.listing.title} ilani icin yeni mesaj var.`
              : thread.groupName
                ? `${thread.groupName} grubunda yeni mesaj var.`
                : 'Size yeni bir mesaj geldi.',
          targetUrl: `/messages?thread=${threadId}`,
        }),
      ),
    );

    return this.serializeMessage(userId, message);
  }

  private async createMessageRecord(
    prisma: PrismaLike,
    input: {
      threadId: string;
      senderId: string;
      messageType: MessageType;
      body?: string | null;
      attachmentUrls?: string[];
      attachmentAssetIds?: string[];
      metadata?: Prisma.InputJsonValue;
      allowSystemCard?: boolean;
    },
  ) {
    const body = trimNullable(input.body);
    const attachmentUrls = (input.attachmentUrls ?? []).map((value) => value.trim()).filter(Boolean);
    const attachmentAssetIds = [...new Set((input.attachmentAssetIds ?? []).filter(Boolean))];

    if (input.messageType === MessageType.TEXT && !body) {
      throw new BadRequestException('Metin mesaji icin icerik zorunludur.');
    }

    if (
      input.messageType !== MessageType.TEXT &&
      input.messageType !== MessageType.SYSTEM_CARD &&
      attachmentUrls.length === 0
    ) {
      throw new BadRequestException('Bu mesaj tipi icin en az bir ek zorunludur.');
    }

    if (input.messageType === MessageType.SYSTEM_CARD && !input.allowSystemCard) {
      throw new BadRequestException('System kartlari yalnizca sistem tarafindan uretilebilir.');
    }

    const attachmentAssetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      input.senderId,
      attachmentAssetIds,
      [MediaAssetPurpose.MESSAGE_ATTACHMENT],
    );
    const normalizedAttachments = [
      ...attachmentUrls.map((url) => ({ url, mediaAssetId: null as string | null })),
      ...attachmentAssetIds.map((assetId) => ({
        url: attachmentAssetMap.get(assetId)?.url ?? '',
        mediaAssetId: assetId,
      })),
    ];

    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        body,
        messageType: input.messageType,
        metadata: input.metadata,
        attachments:
          normalizedAttachments.length > 0
            ? {
                create: normalizedAttachments.map((attachment, index) => ({
                  attachmentType: this.resolveAttachmentType(input.messageType),
                  url: attachment.url,
                  mediaAssetId: attachment.mediaAssetId,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    await prisma.messageThread.update({
      where: {
        id: input.threadId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    await prisma.messageThreadParticipant.updateMany({
      where: {
        threadId: input.threadId,
        userId: input.senderId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    return message;
  }

  private async findThreadForParticipant<TInclude extends Prisma.MessageThreadInclude | undefined>(
    userId: string,
    threadId: string,
    include?: TInclude,
  ) {
    const thread = await this.prisma.messageThread.findFirst({
      where: {
        id: threadId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include,
    });

    if (!thread) {
      throw new NotFoundException('Sohbet bulunamadi.');
    }

    return thread as Prisma.MessageThreadGetPayload<{ include: TInclude }>;
  }

  private async getListingDealContext(userId: string, threadId: string) {
    const thread = await this.findThreadForParticipant(userId, threadId, listingDealContextInclude);

    if (thread.type !== MessageThreadType.LISTING_DEAL) {
      throw new BadRequestException('Bu islem yalnizca ilan deal sohbetlerinde kullanilir.');
    }

    return thread as ListingDealContextRecord;
  }

  private async findExistingDirectThread(userId: string, targetUserId: string) {
    const candidateThreads = await this.prisma.messageThread.findMany({
      where: {
        type: MessageThreadType.DIRECT,
        participants: {
          some: {
            userId,
          },
        },
        AND: [
          {
            participants: {
              some: {
                userId: targetUserId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    return (
      candidateThreads.find(
        (thread) =>
          thread.participants.length === 2 &&
          thread.participants.some((participant) => participant.userId === userId) &&
          thread.participants.some((participant) => participant.userId === targetUserId),
      ) ?? null
    );
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }
  }

  private async getUnreadCount(
    userId: string,
    thread: { id: string; participants: Array<{ userId: string; lastReadAt: Date | null }> },
  ) {
    const currentParticipant = thread.participants.find((participant) => participant.userId === userId);
    const lastReadAt = currentParticipant?.lastReadAt ?? null;

    return this.prisma.message.count({
      where: {
        threadId: thread.id,
        senderId: {
          not: userId,
        },
        ...(lastReadAt
          ? {
              createdAt: {
                gt: lastReadAt,
              },
            }
          : {}),
      },
    });
  }

  private serializeThreadSummary(userId: string, thread: ThreadSummaryRecord, unreadCount: number) {
    return {
      id: thread.id,
      type: thread.type,
      groupName: thread.groupName ?? null,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      unreadCount,
      participants: thread.participants.map((participant) =>
        this.serializeParticipantFromUser(participant.user, false),
      ),
      lastMessage: thread.messages[0]
        ? {
            id: thread.messages[0].id,
            bodyPreview: this.buildMessagePreview(thread.messages[0]),
            messageType: thread.messages[0].messageType,
            createdAt: thread.messages[0].createdAt.toISOString(),
            seenAt: thread.messages[0].seenAt?.toISOString() ?? null,
            senderUsername: thread.messages[0].sender.username,
          }
        : null,
      listing: thread.listing
        ? {
            id: thread.listing.id,
            listingNo: thread.listing.listingNo,
            title: thread.listing.title,
            firstMediaUrl: thread.listing.media[0]?.url ?? null,
            price: Number(thread.listing.price),
            currency: thread.listing.currency,
            city: thread.listing.city,
            district: thread.listing.district ?? null,
            sellerId: thread.listing.sellerId,
            sellerUsername: thread.listing.seller.username,
          }
        : null,
      dealAgreement: this.serializeDealAgreement(userId, thread),
    };
  }

  private serializeThreadDetail(userId: string, thread: ThreadDetailRecord, unreadCount: number) {
    const summary = this.serializeThreadSummary(userId, thread as unknown as ThreadSummaryRecord, unreadCount);

    return {
      ...summary,
      messages: thread.messages.map((message) => this.serializeMessage(userId, message)),
    };
  }

  private serializeMessage(
    userId: string,
    message: {
      id: string;
      threadId: string;
      senderId: string;
      body: string | null;
      messageType: MessageType;
      seenAt: Date | null;
      createdAt: Date;
      metadata?: Prisma.JsonValue | null;
      sender: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
      };
      attachments: Array<{
        id: string;
        attachmentType: AttachmentType;
        url: string;
        fileName: string | null;
        mimeType: string | null;
        sizeBytes: number | null;
        sortOrder: number;
      }>;
    },
  ) {
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      senderUsername: message.messageType === MessageType.SYSTEM_CARD ? 'system' : message.sender.username,
      senderFullName:
        message.messageType === MessageType.SYSTEM_CARD
          ? 'Sistem'
          : `${message.sender.firstName} ${message.sender.lastName}`.trim(),
      isMine: message.messageType === MessageType.SYSTEM_CARD ? false : message.senderId === userId,
      body: message.body,
      messageType: message.messageType,
      seenAt: message.seenAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        attachmentType: attachment.attachmentType,
        url: attachment.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        sortOrder: attachment.sortOrder,
      })),
      systemCard: this.parseSystemCard(message.metadata),
    };
  }

  private serializeDealAgreement(
    userId: string,
    thread: ThreadSummaryRecord | ThreadDetailRecord | ListingDealContextRecord,
  ) {
    if (!thread.dealAgreement) {
      return null;
    }

    const latestInsuranceRequest = thread.insuranceRequests[0] ?? null;
    const isFullyAgreed = Boolean(
      thread.dealAgreement.buyerAgreedAt && thread.dealAgreement.sellerAgreedAt,
    );

    return {
      id: thread.dealAgreement.id,
      listingId: thread.dealAgreement.listingId,
      threadId: thread.dealAgreement.threadId,
      buyerId: thread.dealAgreement.buyerId,
      sellerId: thread.dealAgreement.sellerId,
      buyerAgreedAt: thread.dealAgreement.buyerAgreedAt?.toISOString() ?? null,
      sellerAgreedAt: thread.dealAgreement.sellerAgreedAt?.toISOString() ?? null,
      licenseSharedAt: thread.dealAgreement.licenseSharedAt?.toISOString() ?? null,
      isFullyAgreed,
      canShareLicenseInfo: isFullyAgreed && !thread.dealAgreement.licenseSharedAt,
      currentUserRole:
        userId === thread.dealAgreement.buyerId
          ? 'BUYER'
          : userId === thread.dealAgreement.sellerId
            ? 'SELLER'
            : 'VIEWER',
      insuranceRequestId: latestInsuranceRequest?.id ?? null,
      insuranceStatus: latestInsuranceRequest?.status ?? null,
    };
  }

  private serializeParticipantFromUser(
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      profile: {
        avatarUrl: string | null;
        isPrivate: boolean;
      } | null;
    },
    isMutualFollow: boolean,
  ) {
    return {
      id: user.id,
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: user.profile?.avatarUrl ?? null,
      isPrivate: user.profile?.isPrivate ?? false,
      isMutualFollow,
    };
  }

  private serializeSearchResult(user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profile: {
      avatarUrl: string | null;
      isPrivate: boolean;
    } | null;
  }) {
    const isPrivate = user.profile?.isPrivate ?? false;

    return {
      id: user.id,
      username: user.username,
      fullName: isPrivate ? user.firstName : `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: isPrivate ? null : user.profile?.avatarUrl ?? null,
      isPrivate,
      isMutualFollow: false,
    };
  }

  private buildMessagePreview(message: ThreadSummaryRecord['messages'][number]) {
    if (message.body) {
      return message.body.slice(0, 160);
    }

    if (message.messageType === MessageType.SYSTEM_CARD) {
      return 'Sistem karti paylasildi.';
    }

    return `${message.messageType} gonderildi.`;
  }

  private resolveAttachmentType(messageType: MessageType) {
    switch (messageType) {
      case MessageType.IMAGE:
        return AttachmentType.IMAGE;
      case MessageType.VIDEO:
        return AttachmentType.VIDEO;
      case MessageType.AUDIO:
        return AttachmentType.AUDIO;
      case MessageType.FILE:
        return AttachmentType.FILE;
      default:
        return AttachmentType.FILE;
    }
  }

  private parseSystemCard(metadata: Prisma.JsonValue | null | undefined): SystemCardPayload | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const systemCard = (metadata as { systemCard?: unknown }).systemCard;

    if (!systemCard || typeof systemCard !== 'object' || Array.isArray(systemCard)) {
      return null;
    }

    const card = systemCard as Partial<SystemCardPayload> & Record<string, unknown>;

    if (card.type === 'LICENSE_INFO_CARD' && typeof card.listingId === 'string') {
      return {
        type: 'LICENSE_INFO_CARD',
        listingId: card.listingId,
        vehicleInfo: typeof card.vehicleInfo === 'string' ? card.vehicleInfo : '-',
        licenseOwnerName: typeof card.licenseOwnerName === 'string' ? card.licenseOwnerName : '-',
        maskedTcNo: typeof card.maskedTcNo === 'string' ? card.maskedTcNo : null,
        maskedPlate: typeof card.maskedPlate === 'string' ? card.maskedPlate : null,
        buttonLabel: typeof card.buttonLabel === 'string' ? card.buttonLabel : 'Sigorta teklifi al',
      };
    }

    if (
      card.type === 'INSURANCE_OFFER_CARD' &&
      typeof card.requestId === 'string' &&
      typeof card.offerId === 'string'
    ) {
      return {
        type: 'INSURANCE_OFFER_CARD',
        requestId: card.requestId,
        offerId: card.offerId,
        amount: typeof card.amount === 'number' ? card.amount : 0,
        currency: typeof card.currency === 'string' ? card.currency : 'TRY',
        buttonLabel: typeof card.buttonLabel === 'string' ? card.buttonLabel : 'Teklifi gor',
      };
    }

    if (card.type === 'PAYMENT_STATUS_CARD') {
      return {
        type: 'PAYMENT_STATUS_CARD',
        requestId: typeof card.requestId === 'string' ? card.requestId : null,
        paymentId: typeof card.paymentId === 'string' ? card.paymentId : null,
        status: typeof card.status === 'string' ? card.status : 'PENDING',
        buttonLabel: typeof card.buttonLabel === 'string' ? card.buttonLabel : 'Odeme durumu',
      };
    }

    if (card.type === 'POLICY_DOCUMENT_CARD' && typeof card.requestId === 'string') {
      return {
        type: 'POLICY_DOCUMENT_CARD',
        requestId: card.requestId,
        buttonLabel: typeof card.buttonLabel === 'string' ? card.buttonLabel : 'Belgeleri gor',
      };
    }

    return null;
  }

  private buildLicenseInfoCard(thread: ListingDealContextRecord): LicenseInfoSystemCardPayload {
    const garageVehicle = thread.listing?.garageVehicle;
    const packageName = garageVehicle?.vehiclePackage?.name ?? garageVehicle?.packageText ?? '';
    const modelName =
      garageVehicle?.vehiclePackage?.model.name ?? garageVehicle?.modelText ?? 'Arac';
    const brandName =
      garageVehicle?.vehiclePackage?.model.brand.name ?? garageVehicle?.brandText ?? '';
    const vehicleInfo = [brandName, modelName, packageName].filter(Boolean).join(' ');

    return {
      type: 'LICENSE_INFO_CARD',
      listingId: thread.listingId ?? thread.listing?.id ?? '',
      vehicleInfo: vehicleInfo || thread.listing?.title || 'Arac',
      licenseOwnerName: thread.listing?.licenseOwnerName ?? '-',
      maskedTcNo: this.maskIdentityNumber(thread.listing?.licenseOwnerTcNo ?? null),
      maskedPlate: thread.listing?.plateNumber ?? null,
      buttonLabel: 'Sigorta teklifi al',
    };
  }

  private maskIdentityNumber(value: string | null) {
    const normalized = value?.replace(/\D/g, '') ?? '';

    if (!normalized) {
      return null;
    }

    if (normalized.length <= 4) {
      return '*'.repeat(normalized.length);
    }

    return `${normalized.slice(0, 2)}${'*'.repeat(normalized.length - 4)}${normalized.slice(-2)}`;
  }
}
