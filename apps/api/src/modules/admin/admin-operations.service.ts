import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommercialApplicationStatus,
  ListingStatus,
  PaymentStatus,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';
import { AdminListingStatusDto } from './dto/admin-listing-status.dto';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard(adminUser: { role: 'SUPER_ADMIN' | 'INSURANCE_ADMIN' | 'COMMERCIAL_ADMIN' }) {
    if (adminUser.role === 'INSURANCE_ADMIN') {
      const [pendingRequests, offerReady, paymentWaiting, policyWaiting] = await Promise.all([
        this.prisma.insuranceRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.insuranceRequest.count({ where: { status: 'OFFER_CREATED' } }),
        this.prisma.insuranceRequest.count({ where: { status: 'ACCEPTED' } }),
        this.prisma.insuranceRequest.count({ where: { status: 'PAID' } }),
      ]);

      return {
        role: adminUser.role,
        metrics: [
          { key: 'pending_insurance_requests', label: 'Bekleyen sigorta talepleri', value: pendingRequests },
          { key: 'offer_ready_requests', label: 'Teklif hazir talepler', value: offerReady },
          { key: 'payment_waiting_requests', label: 'Odeme bekleyenler', value: paymentWaiting },
          { key: 'policy_upload_waiting_requests', label: 'Police y�klenecekler', value: policyWaiting },
        ],
      };
    }

    if (adminUser.role === 'COMMERCIAL_ADMIN') {
      const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
        this.prisma.commercialApplication.count({ where: { status: CommercialApplicationStatus.PENDING } }),
        this.prisma.commercialApplication.count({ where: { status: CommercialApplicationStatus.APPROVED } }),
        this.prisma.commercialApplication.count({ where: { status: CommercialApplicationStatus.REJECTED } }),
      ]);

      return {
        role: adminUser.role,
        metrics: [
          { key: 'pending_commercial_applications', label: 'Bekleyen ticari basvurular', value: pendingCount },
          { key: 'approved_commercial_applications', label: 'Onaylanan basvurular', value: approvedCount },
          { key: 'rejected_commercial_applications', label: 'Reddedilen basvurular', value: rejectedCount },
        ],
      };
    }

    const [
      totalUsers,
      individualUsers,
      commercialUsers,
      pendingCommercialApplications,
      activeListings,
      paymentAggregate,
      pendingInsuranceRequests,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, userType: UserType.INDIVIDUAL } }),
      this.prisma.user.count({ where: { deletedAt: null, userType: UserType.COMMERCIAL } }),
      this.prisma.commercialApplication.count({ where: { status: CommercialApplicationStatus.PENDING } }),
      this.prisma.listing.count({ where: { deletedAt: null, listingStatus: ListingStatus.ACTIVE } }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.insuranceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.auditLog.findMany({
        include: auditLogInclude,
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      role: adminUser.role,
      metrics: [
        { key: 'total_users', label: 'Toplam kullanici', value: totalUsers },
        { key: 'individual_users', label: 'Bireysel kullanici', value: individualUsers },
        { key: 'commercial_users', label: 'Ticari kullanici', value: commercialUsers },
        { key: 'pending_commercial_applications', label: 'Bekleyen ticari basvuru', value: pendingCommercialApplications },
        { key: 'active_listings', label: 'Aktif ilan sayisi', value: activeListings },
        { key: 'paid_amount_total', label: 'Odeme toplami', value: Number(paymentAggregate._sum.amount ?? 0) },
        { key: 'pending_insurance_requests', label: 'Bekleyen sigorta talebi', value: pendingInsuranceRequests },
      ],
      recentAuditLogs: recentAuditLogs.map((item) => this.serializeAuditLog(item)),
    };
  }

  async getUsers(query: AdminUsersQueryDto) {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(query.username ? { username: { contains: query.username.trim().toLowerCase(), mode: 'insensitive' } } : {}),
        ...(query.email ? { email: { contains: query.email.trim().toLowerCase(), mode: 'insensitive' } } : {}),
        ...(query.phone ? { phone: { contains: query.phone.trim(), mode: 'insensitive' } } : {}),
        ...(query.userType ? { userType: query.userType } : {}),
        ...(query.isVerified !== undefined ? { isVerified: query.isVerified } : {}),
        ...(query.isCommercialApproved !== undefined ? { isCommercialApproved: query.isCommercialApproved } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      include: {
        profile: {
          select: {
            avatarUrl: true,
            goldVerified: true,
            blueVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email ?? null,
        phone: user.phone ?? null,
        userType: user.userType,
        isVerified: user.isVerified,
        isCommercialApproved: user.isCommercialApproved,
        isActive: user.isActive,
        avatarUrl: user.profile?.avatarUrl ?? null,
        blueVerified: user.profile?.blueVerified ?? false,
        goldVerified: user.profile?.goldVerified ?? false,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: {
        profile: true,
        commercialApplications: {
          include: {
            reviewer: {
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
          take: 5,
        },
        listings: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            listingNo: true,
            listingStatus: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email ?? null,
      phone: user.phone ?? null,
      userType: user.userType,
      tcIdentityNoMasked: this.maskIdentityNumber(user.tcIdentityNo),
      isVerified: user.isVerified,
      isCommercialApproved: user.isCommercialApproved,
      isActive: user.isActive,
      disabledAt: user.disabledAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile: user.profile
        ? {
            avatarUrl: user.profile.avatarUrl ?? null,
            bio: user.profile.bio ?? null,
            locationText: user.profile.locationText ?? null,
            isPrivate: user.profile.isPrivate,
            showGarageVehicles: user.profile.showGarageVehicles,
            blueVerified: user.profile.blueVerified,
            goldVerified: user.profile.goldVerified,
          }
        : null,
      commercialApplications: user.commercialApplications.map((application) => ({
        id: application.id,
        status: application.status,
        companyName: application.companyName,
        taxNumberMasked: this.maskTaxNumber(application.taxNumber),
        submittedAt: application.submittedAt.toISOString(),
        reviewedAt: application.reviewedAt?.toISOString() ?? null,
        rejectionReason: application.rejectionReason ?? null,
        reviewer: application.reviewer
          ? {
              id: application.reviewer.id,
              username: application.reviewer.username,
              role: application.reviewer.role,
            }
          : null,
      })),
      recentListings: user.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        listingNo: listing.listingNo,
        listingStatus: listing.listingStatus,
        createdAt: listing.createdAt.toISOString(),
      })),
    };
  }

  async updateUserStatus(adminUser: { adminUserId: string }, userId: string, dto: AdminUserStatusDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    if (existingUser.isActive === dto.isActive) {
      return {
        success: true,
        userId,
        isActive: dto.isActive,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isActive: dto.isActive,
          disabledAt: dto.isActive ? null : new Date(),
        },
      });

      if (!dto.isActive) {
        await tx.accountSession.updateMany({
          where: {
            userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: dto.isActive ? 'user_enabled' : 'user_disabled',
          entityType: 'User',
          entityId: userId,
          metadata: {
            username: existingUser.username,
            isActive: dto.isActive,
          },
        },
      });
    });

    if (!dto.isActive) {
      await this.notificationsService.create({
        receiverId: userId,
        actorAdminId: adminUser.adminUserId,
        type: 'USER_DISABLED',
        entityId: userId,
        title: 'Hesap durumunuz guncellendi',
        body: 'Hesabiniz gecici olarak pasif duruma alindi. Detay icin destek ekibiyle iletisime gecebilirsiniz.',
        targetUrl: '/settings',
      });
    }

    return {
      success: true,
      userId,
      isActive: dto.isActive,
    };
  }

  async getListings(query: AdminListingsQueryDto) {
    const items = await this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search.trim(), mode: 'insensitive' } },
                { listingNo: { contains: query.search.trim().toUpperCase(), mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.listingStatus ? { listingStatus: query.listingStatus } : {}),
        ...(query.sellerType ? { sellerType: query.sellerType } : {}),
        ...(query.city ? { city: { equals: query.city.trim(), mode: 'insensitive' } } : {}),
      },
      include: adminListingListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: items.map((listing) => ({
        id: listing.id,
        listingNo: listing.listingNo,
        title: listing.title,
        listingStatus: listing.listingStatus,
        sellerType: listing.sellerType,
        price: Number(listing.price),
        currency: listing.currency,
        city: listing.city,
        district: listing.district ?? null,
        suspensionReason: listing.suspensionReason ?? null,
        firstMediaUrl: listing.media[0]?.url ?? null,
        seller: {
          id: listing.seller.id,
          username: listing.seller.username,
          fullName: `${listing.seller.firstName} ${listing.seller.lastName}`.trim(),
        },
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
      })),
    };
  }

  async getListingDetail(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      include: adminListingDetailInclude,
    });

    if (!listing) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    const spec = listing.garageVehicle?.vehiclePackage?.specs?.[0] ?? null;

    return {
      id: listing.id,
      listingNo: listing.listingNo,
      title: listing.title,
      description: listing.description,
      listingStatus: listing.listingStatus,
      sellerType: listing.sellerType,
      price: Number(listing.price),
      currency: listing.currency,
      city: listing.city,
      district: listing.district ?? null,
      contactPhone: listing.showPhone ? listing.contactPhone ?? null : this.maskPhone(listing.contactPhone),
      showPhone: listing.showPhone,
      tradeAvailable: listing.tradeAvailable,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      deletedAt: listing.deletedAt?.toISOString() ?? null,
      suspensionReason: listing.suspensionReason ?? null,
      ownerAuthorizationRequired: listing.ownerAuthorizationRequired,
      isLicenseVerified: listing.isLicenseVerified,
      seller: {
        id: listing.seller.id,
        username: listing.seller.username,
        fullName: `${listing.seller.firstName} ${listing.seller.lastName}`.trim(),
        email: listing.seller.email ?? null,
        phone: listing.seller.phone ?? null,
        userType: listing.seller.userType,
      },
      vehicle: {
        brand: listing.garageVehicle?.vehiclePackage?.model.brand.name ?? listing.garageVehicle?.brandText ?? null,
        model: listing.garageVehicle?.vehiclePackage?.model.name ?? listing.garageVehicle?.modelText ?? null,
        package: listing.garageVehicle?.vehiclePackage?.name ?? listing.garageVehicle?.packageText ?? null,
        year: listing.garageVehicle?.year ?? null,
        km: listing.garageVehicle?.km ?? null,
        fuelType: spec?.fuelType ?? listing.garageVehicle?.fuelType ?? null,
        transmissionType: spec?.transmissionType ?? listing.garageVehicle?.transmissionType ?? null,
        bodyType: spec?.bodyType ?? null,
        color: listing.garageVehicle?.color ?? null,
      },
      licenseInfo: {
        ownerName: listing.licenseOwnerName ?? null,
        maskedTcNo: this.maskIdentityNumber(listing.licenseOwnerTcNo),
        maskedPlate: listing.plateNumber ?? null,
      },
      media: listing.media.map((item) => ({
        id: item.id,
        url: item.url,
        mediaType: item.mediaType,
        sortOrder: item.sortOrder,
      })),
      damageParts: listing.damageParts.map((item) => ({
        id: item.id,
        partName: item.partName,
        damageStatus: item.damageStatus,
      })),
      insuranceRequestCount: listing.insuranceRequests.length,
    };
  }

  async updateListingStatus(
    adminUser: { adminUserId: string },
    listingId: string,
    dto: AdminListingStatusDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      select: {
        id: true,
        sellerId: true,
        title: true,
        listingStatus: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    const allowedStatuses = new Set<ListingStatus>([
      ListingStatus.ACTIVE,
      ListingStatus.PENDING_LEGAL_CHECK,
      ListingStatus.SUSPENDED,
      ListingStatus.SOLD,
      ListingStatus.DELETED,
    ]);

    if (!allowedStatuses.has(dto.listingStatus)) {
      throw new BadRequestException('Bu admin ilani durumu desteklenmiyor.');
    }

    if (dto.listingStatus === ListingStatus.SUSPENDED && !dto.reason?.trim()) {
      throw new BadRequestException('Ilan askiya alinacaksa neden girilmelidir.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: {
          id: listingId,
        },
        data: {
          listingStatus: dto.listingStatus,
          deletedAt: dto.listingStatus === ListingStatus.DELETED ? now : null,
          suspensionReason:
            dto.listingStatus === ListingStatus.SUSPENDED ? dto.reason?.trim() ?? null : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'listing_status_updated',
          entityType: 'Listing',
          entityId: listingId,
          metadata: {
            previousStatus: listing.listingStatus,
            nextStatus: dto.listingStatus,
            reason: dto.reason?.trim() ?? null,
            note: dto.note?.trim() ?? null,
          },
        },
      });
    });

    if (dto.listingStatus === ListingStatus.SUSPENDED) {
      await this.notificationsService.create({
        receiverId: listing.sellerId,
        actorAdminId: adminUser.adminUserId,
        type: 'LISTING_SUSPENDED',
        entityId: listingId,
        title: 'Ilaniniz askiya alindi',
        body: dto.reason?.trim() ?? 'Ilaniniz yonetim ekibi tarafindan gecici olarak askiya alindi.',
        targetUrl: `/listings/${listingId}`,
        metadata: {
          previousStatus: listing.listingStatus,
          nextStatus: dto.listingStatus,
        },
      });
    }

    return {
      success: true,
      listingId,
      listingStatus: dto.listingStatus,
    };
  }

  async getPayments() {
    const payments = await this.prisma.payment.findMany({
      include: adminPaymentInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: payments.map((payment) => this.serializePayment(payment)),
    };
  }

  async getPaymentDetail(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: adminPaymentInclude,
    });

    if (!payment) {
      throw new NotFoundException('Odeme kaydi bulunamadi.');
    }

    return this.serializePayment(payment);
  }

  async getAuditLogs(query: AdminAuditLogsQueryDto) {
    const items = await this.prisma.auditLog.findMany({
      where: {
        ...(query.action ? { action: { contains: query.action.trim(), mode: 'insensitive' } } : {}),
        ...(query.entityType ? { entityType: { contains: query.entityType.trim(), mode: 'insensitive' } } : {}),
        ...(query.actor
          ? {
              OR: [
                { actorAdmin: { username: { contains: query.actor.trim(), mode: 'insensitive' } } },
                { actorUser: { username: { contains: query.actor.trim(), mode: 'insensitive' } } },
                { actorUser: { firstName: { contains: query.actor.trim(), mode: 'insensitive' } } },
                { actorUser: { lastName: { contains: query.actor.trim(), mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(query.dateFrom || query.dateTo
          ? {
              createdAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
              },
            }
          : {}),
      },
      include: auditLogInclude,
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return {
      items: items.map((item) => this.serializeAuditLog(item)),
    };
  }

  private serializePayment(payment: AdminPaymentRecord) {
    return {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      providerTransactionId: payment.providerTransactionId ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      completedAt: payment.completedAt?.toISOString() ?? null,
      failureReason: payment.failureReason ?? null,
      metadata: payment.metadata ?? null,
      user: {
        id: payment.user.id,
        username: payment.user.username,
        fullName: `${payment.user.firstName} ${payment.user.lastName}`.trim(),
      },
      insuranceRequest: payment.insuranceRequest
        ? {
            id: payment.insuranceRequest.id,
            status: payment.insuranceRequest.status,
            listingId: payment.insuranceRequest.listingId,
            listingTitle: payment.insuranceRequest.listing.title,
          }
        : null,
    };
  }

  private serializeAuditLog(log: AdminAuditLogRecord) {
    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      actor: log.actorAdmin
        ? {
            type: 'ADMIN',
            id: log.actorAdmin.id,
            username: log.actorAdmin.username,
            role: log.actorAdmin.role,
          }
        : log.actorUser
          ? {
              type: 'USER',
              id: log.actorUser.id,
              username: log.actorUser.username,
              role: null,
            }
          : null,
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

    return `${normalized.slice(0, 2)}${'*'.repeat(Math.max(normalized.length - 4, 3))}${normalized.slice(-2)}`;
  }

  private maskPhone(value: string | null) {
    const normalized = value?.replace(/\s+/g, '') ?? '';

    if (!normalized) {
      return null;
    }

    if (normalized.length <= 4) {
      return '*'.repeat(normalized.length);
    }

    return `${normalized.slice(0, 3)}${'*'.repeat(Math.max(normalized.length - 5, 3))}${normalized.slice(-2)}`;
  }

  private maskTaxNumber(value: string) {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
  }
}

const auditLogInclude = {
  actorAdmin: {
    select: {
      id: true,
      username: true,
      role: true,
    },
  },
  actorUser: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

type AdminAuditLogRecord = Prisma.AuditLogGetPayload<{
  include: typeof auditLogInclude;
}>;

const adminListingListInclude = {
  seller: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 1,
  },
} satisfies Prisma.ListingInclude;

const adminListingDetailInclude = {
  seller: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      userType: true,
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  damageParts: {
    orderBy: {
      partName: 'asc',
    },
  },
  insuranceRequests: {
    select: {
      id: true,
    },
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
          specs: {
            where: {
              isActive: true,
            },
            orderBy: [{ manualReviewNeeded: 'asc' }, { year: 'desc' }, { enginePowerHp: 'desc' }],
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.ListingInclude;

const adminPaymentInclude = {
  user: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  insuranceRequest: {
    include: {
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

type AdminPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof adminPaymentInclude;
}>;
