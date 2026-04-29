import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommercialApplicationStatus,
  MediaAssetPurpose,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitCommercialApplicationDto } from './dto/submit-commercial-application.dto';
import { RejectCommercialApplicationDto } from './dto/reject-commercial-application.dto';

@Injectable()
export class CommercialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submitApplication(userId: string, dto: SubmitCommercialApplicationDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        profile: true,
        commercialApplications: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    if (user.isCommercialApproved || user.userType === UserType.COMMERCIAL) {
      throw new BadRequestException('Bu hesap zaten ticari olarak onaylanmis.');
    }

    const latestApplication = user.commercialApplications[0] ?? null;

    if (latestApplication?.status === CommercialApplicationStatus.PENDING) {
      throw new BadRequestException('Bekleyen bir ticari hesap basvurunuz zaten bulunuyor.');
    }

    const documentAssetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      dto.taxDocumentMediaAssetId ? [dto.taxDocumentMediaAssetId] : [],
      [MediaAssetPurpose.COMMERCIAL_DOCUMENT],
    );
    const taxDocumentAsset = dto.taxDocumentMediaAssetId
      ? documentAssetMap.get(dto.taxDocumentMediaAssetId)
      : null;

    if (!taxDocumentAsset && !dto.taxDocumentUrl?.trim()) {
      throw new BadRequestException('Vergi levhasi belgesi zorunludur.');
    }

    const createdApplication = await this.prisma.$transaction(async (tx) => {
      const application = await tx.commercialApplication.create({
        data: {
          userId,
          companyName: dto.companyTitle.trim(),
          taxNumber: dto.taxNumber.trim(),
          taxDocumentUrl: taxDocumentAsset?.url ?? dto.taxDocumentUrl?.trim() ?? '',
          taxDocumentMediaAssetId: taxDocumentAsset?.id ?? null,
          contactEmail: user.email,
          contactPhone: user.phone,
          notes: dto.notes?.trim() || null,
          status: CommercialApplicationStatus.PENDING,
          ...(dto.otherDocumentUrls?.length
            ? {
                otherDocumentUrls: dto.otherDocumentUrls.map(
                  (item) => item.url.trim(),
                ) as Prisma.InputJsonValue,
              }
            : {}),
        },
      });

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          tcIdentityNo: dto.tcIdentityNo.trim(),
          userType: UserType.INDIVIDUAL,
          isCommercialApproved: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'commercial_application_submitted',
          entityType: 'CommercialApplication',
          entityId: application.id,
          metadata: {
            companyName: application.companyName,
            taxNumberLast4: application.taxNumber.slice(-4),
          },
        },
      });

      return application;
    });

    await this.notificationsService.create({
      receiverId: userId,
      type: 'COMMERCIAL_APPLICATION_SUBMITTED',
      entityId: createdApplication.id,
      title: 'Ticari hesap basvurunuz alindi',
      body: 'Basvurunuz Carloi ticari hesap ekibine iletildi ve inceleme bekliyor.',
      targetUrl: '/settings',
      metadata: {
        status: createdApplication.status,
      },
    });

    const hydratedApplication = await this.findApplicationOrFail(createdApplication.id);

    return {
      success: true,
      application: this.serializeApplication(hydratedApplication, hydratedApplication.user, {
        includeSensitive: false,
        includeDocuments: true,
      }),
    };
  }

  async getOwnApplication(userId: string) {
    const application = await this.prisma.commercialApplication.findFirst({
      where: {
        userId,
      },
      include: commercialApplicationInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      application: application
        ? this.serializeApplication(application, application.user, {
            includeSensitive: false,
            includeDocuments: true,
          })
        : null,
    };
  }

  async getAdminApplications() {
    const items = await this.prisma.commercialApplication.findMany({
      include: commercialApplicationInclude,
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return {
      items: items.map((item) =>
        this.serializeApplication(item, item.user, {
          includeSensitive: true,
          includeDocuments: false,
        }),
      ),
    };
  }

  async getAdminApplicationDetail(applicationId: string) {
    const application = await this.findApplicationOrFail(applicationId);

    return this.serializeApplication(application, application.user, {
      includeSensitive: true,
      includeDocuments: true,
    });
  }

  async approveApplication(
    adminUser: { adminUserId: string; role: string },
    applicationId: string,
  ) {
    const application = await this.findApplicationOrFail(applicationId);

    if (application.status !== CommercialApplicationStatus.PENDING) {
      throw new BadRequestException('Yalnizca bekleyen basvurular onaylanabilir.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commercialApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: CommercialApplicationStatus.APPROVED,
          reviewerId: adminUser.adminUserId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.user.update({
        where: {
          id: application.userId,
        },
        data: {
          userType: UserType.COMMERCIAL,
          isCommercialApproved: true,
        },
      });

      await tx.profile.upsert({
        where: {
          userId: application.userId,
        },
        update: {
          goldVerified: true,
        },
        create: {
          userId: application.userId,
          goldVerified: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'commercial_application_approved',
          entityType: 'CommercialApplication',
          entityId: applicationId,
          metadata: {
            userId: application.userId,
            role: adminUser.role,
          },
        },
      });
    });

    await this.notificationsService.create({
      receiverId: application.userId,
      actorAdminId: adminUser.adminUserId,
      type: 'COMMERCIAL_APPLICATION_APPROVED',
      entityId: applicationId,
      title: 'Ticari hesap basvurunuz onaylandi',
      body: 'Hesabiniz ticari olarak onaylandi ve gold tick aktif edildi.',
      targetUrl: '/settings',
    });

    return {
      success: true,
      applicationId,
      status: CommercialApplicationStatus.APPROVED,
    };
  }

  async rejectApplication(
    adminUser: { adminUserId: string; role: string },
    applicationId: string,
    dto: RejectCommercialApplicationDto,
  ) {
    const application = await this.findApplicationOrFail(applicationId);

    if (application.status !== CommercialApplicationStatus.PENDING) {
      throw new BadRequestException('Yalnizca bekleyen basvurular reddedilebilir.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commercialApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: CommercialApplicationStatus.REJECTED,
          reviewerId: adminUser.adminUserId,
          reviewedAt: new Date(),
          rejectionReason: dto.rejectionReason.trim(),
        },
      });

      await tx.user.update({
        where: {
          id: application.userId,
        },
        data: {
          isCommercialApproved: false,
        },
      });

      await tx.profile.updateMany({
        where: {
          userId: application.userId,
        },
        data: {
          goldVerified: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'commercial_application_rejected',
          entityType: 'CommercialApplication',
          entityId: applicationId,
          metadata: {
            userId: application.userId,
            rejectionReason: dto.rejectionReason.trim(),
            role: adminUser.role,
          },
        },
      });
    });

    await this.notificationsService.create({
      receiverId: application.userId,
      actorAdminId: adminUser.adminUserId,
      type: 'COMMERCIAL_APPLICATION_REJECTED',
      entityId: applicationId,
      title: 'Ticari hesap basvurunuz reddedildi',
      body: dto.rejectionReason.trim(),
      targetUrl: '/settings',
      metadata: {
        rejectionReason: dto.rejectionReason.trim(),
      },
    });

    return {
      success: true,
      applicationId,
      status: CommercialApplicationStatus.REJECTED,
    };
  }

  private async findApplicationOrFail(applicationId: string) {
    const application = await this.prisma.commercialApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: commercialApplicationInclude,
    });

    if (!application) {
      throw new NotFoundException('Ticari basvuru bulunamadi.');
    }

    return application;
  }

  private serializeApplication(
    application: CommercialApplicationRecord,
    user: CommercialApplicationRecord['user'],
    options: {
      includeSensitive: boolean;
      includeDocuments: boolean;
    },
  ) {
    const documentUrls =
      Array.isArray(application.otherDocumentUrls) ?
        application.otherDocumentUrls.filter((item): item is string => typeof item === 'string') :
        [];

    return {
      id: application.id,
      status: application.status,
      companyName: application.companyName,
      taxNumber: options.includeSensitive ? application.taxNumber : this.maskTaxNumber(application.taxNumber),
      taxDocumentUrl: options.includeDocuments ? application.taxDocumentUrl ?? null : null,
      otherDocumentUrls: options.includeDocuments ? documentUrls : [],
      notes: application.notes ?? null,
      rejectionReason: application.rejectionReason ?? null,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email ?? null,
        phone: user.phone ?? null,
        userType: user.userType,
        isVerified: user.isVerified,
        isCommercialApproved: user.isCommercialApproved,
        maskedTcIdentityNo: this.maskIdentityNumber(user.tcIdentityNo),
      },
      reviewer: application.reviewer
        ? {
            id: application.reviewer.id,
            username: application.reviewer.username,
            role: application.reviewer.role,
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

  private maskTaxNumber(value: string) {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
  }
}

const commercialApplicationInclude = {
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      tcIdentityNo: true,
      userType: true,
      isVerified: true,
      isCommercialApproved: true,
    },
  },
  reviewer: {
    select: {
      id: true,
      username: true,
      role: true,
    },
  },
} satisfies Prisma.CommercialApplicationInclude;

type CommercialApplicationRecord = Prisma.CommercialApplicationGetPayload<{
  include: typeof commercialApplicationInclude;
}>;
