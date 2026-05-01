import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InsuranceOfferStatus,
  InsuranceRequestStatus,
  MediaAssetPurpose,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getAdminOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { createSystemMessageRecord } from '../messages/message-record.utils';
import { CreateInsuranceOfferDto } from './dto/create-insurance-offer.dto';
import { UpdateInsuranceOfferStatusDto } from './dto/update-insurance-offer-status.dto';
import { UploadInsuranceDocumentsDto } from './dto/upload-insurance-documents.dto';

export type CreateInsuranceRequestInput = {
  buyerId: string;
  sellerId: string;
  listingId: string;
  sourceThreadId: string;
  vehicleId?: string | null;
};

@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrGetRequest(input: CreateInsuranceRequestInput) {
    const existing = await this.prisma.insuranceRequest.findUnique({
      where: {
        sourceThreadId: input.sourceThreadId,
      },
    });

    if (existing) {
      return {
        request: existing,
        created: false,
      };
    }

    const request = await this.prisma.insuranceRequest.create({
      data: {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        listingId: input.listingId,
        vehicleId: input.vehicleId ?? null,
        sourceThreadId: input.sourceThreadId,
        status: InsuranceRequestStatus.PENDING,
      },
    });

    return {
      request,
      created: true,
    };
  }

  async getAdminRequests() {
    const requests = await this.prisma.insuranceRequest.findMany({
      include: insuranceRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: requests.map((request) => this.serializeInsuranceRequest(request, 'admin-list')),
    };
  }

  async getAdminRequestDetail(requestId: string) {
    const request = await this.findInsuranceRequestById(requestId);
    return this.serializeInsuranceRequest(request, 'admin-detail');
  }

  async createOffer(
    adminUser: { adminUserId: string },
    requestId: string,
    dto: CreateInsuranceOfferDto,
  ) {
    const request = await this.findInsuranceRequestById(requestId);

    if (
      request.status === InsuranceRequestStatus.PAID ||
      request.status === InsuranceRequestStatus.POLICY_UPLOADED ||
      request.status === InsuranceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException('Bu talep icin yeni teklif olusturulamaz.');
    }

    const currency = (dto.currency?.trim().toUpperCase() ?? 'TRY').slice(0, 3);
    const offerAssetMap = await getAdminOwnedMediaAssetMap(
      this.prisma,
      adminUser.adminUserId,
      dto.offerFileMediaAssetId ? [dto.offerFileMediaAssetId] : [],
      [MediaAssetPurpose.INSURANCE_OFFER],
    );
    const offerFileAsset = dto.offerFileMediaAssetId
      ? offerAssetMap.get(dto.offerFileMediaAssetId)
      : null;

    const offer = await this.prisma.$transaction(async (tx) => {
      await tx.insuranceOffer.updateMany({
        where: {
          requestId,
          status: InsuranceOfferStatus.ACTIVE,
        },
        data: {
          status: InsuranceOfferStatus.EXPIRED,
        },
      });

      const createdOffer = await tx.insuranceOffer.create({
        data: {
          requestId,
          adminId: adminUser.adminUserId,
          amount: new Prisma.Decimal(dto.amount),
          currency,
          offerFileUrl: offerFileAsset?.url ?? dto.offerFileUrl?.trim(),
          offerFileMediaAssetId: offerFileAsset?.id ?? null,
          status: InsuranceOfferStatus.ACTIVE,
        },
      });

      await tx.insuranceRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: InsuranceRequestStatus.OFFER_CREATED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'insurance_offer_created',
          entityType: 'InsuranceOffer',
          entityId: createdOffer.id,
          metadata: {
            requestId,
            amount: dto.amount,
            currency,
            offerFileUrl: dto.offerFileUrl ?? null,
          },
        },
      });

      if (request.sourceThreadId) {
        await createSystemMessageRecord(tx, {
          threadId: request.sourceThreadId,
          senderId: request.buyerId,
          body: 'Sigorta teklifiniz hazir.',
          metadata: {
            systemCard: {
              type: 'INSURANCE_OFFER_CARD',
              requestId,
              offerId: createdOffer.id,
              amount: dto.amount,
              currency,
              buttonLabel: 'Teklifi gor',
            },
          },
        });
      }

      return createdOffer;
    });

    await this.notificationsService.create({
      receiverId: request.buyerId,
      actorId: request.sellerId,
      type: 'INSURANCE_OFFER_READY',
      entityId: offer.id,
      title: 'Sigorta teklifiniz hazir',
      body: `${request.listing.title} ilani icin sigorta teklifiniz olusturuldu.`,
      targetUrl: `/insurance/${request.id}`,
    });

    return {
      success: true,
      requestId,
      offerId: offer.id,
      status: InsuranceRequestStatus.OFFER_CREATED,
    };
  }

  async updateOfferStatus(
    adminUser: { adminUserId: string },
    offerId: string,
    dto: UpdateInsuranceOfferStatusDto,
  ) {
    if (dto.status === InsuranceOfferStatus.ACCEPTED) {
      throw new BadRequestException('Teklif kabul islemi kullanici tarafindan yapilmalidir.');
    }

    const existingOffer = await this.prisma.insuranceOffer.findUnique({
      where: {
        id: offerId,
      },
      include: {
        request: true,
      },
    });

    if (!existingOffer) {
      throw new NotFoundException('Sigorta teklifi bulunamadi.');
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const nextOffer = await tx.insuranceOffer.update({
        where: {
          id: offerId,
        },
        data: {
          status: dto.status,
        },
      });

      const hasActiveOffers = await tx.insuranceOffer.count({
        where: {
          requestId: existingOffer.requestId,
          status: InsuranceOfferStatus.ACTIVE,
        },
      });

      await tx.insuranceRequest.update({
        where: {
          id: existingOffer.requestId,
        },
        data: {
          status: hasActiveOffers
            ? InsuranceRequestStatus.OFFER_CREATED
            : InsuranceRequestStatus.REJECTED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'insurance_offer_status_updated',
          entityType: 'InsuranceOffer',
          entityId: offerId,
          metadata: {
            requestId: existingOffer.requestId,
            status: dto.status,
          },
        },
      });

      return nextOffer;
    });

    return {
      success: true,
      offerId: updatedOffer.id,
      status: updatedOffer.status,
    };
  }

  async uploadDocuments(
    adminUser: { adminUserId: string },
    requestId: string,
    dto: UploadInsuranceDocumentsDto,
  ) {
    if (
      !dto.policyDocumentUrl &&
      !dto.invoiceDocumentUrl &&
      !dto.policyDocumentMediaAssetId &&
      !dto.invoiceDocumentMediaAssetId
    ) {
      throw new BadRequestException('En az bir belge URL alani gonderilmelidir.');
    }

    const request = await this.findInsuranceRequestById(requestId);
    const latestPaidPayment = request.payments.find((payment) => payment.status === PaymentStatus.PAID);

    if (!latestPaidPayment || request.status !== InsuranceRequestStatus.PAID) {
      throw new BadRequestException('Belgeler yalnizca odeme tamamlandiktan sonra yuklenebilir.');
    }

    const documentAssetMap = await getAdminOwnedMediaAssetMap(
      this.prisma,
      adminUser.adminUserId,
      [
        dto.policyDocumentMediaAssetId ?? '',
        dto.invoiceDocumentMediaAssetId ?? '',
      ].filter(Boolean),
      [MediaAssetPurpose.INSURANCE_POLICY, MediaAssetPurpose.INSURANCE_INVOICE],
    );
    const policyAsset = dto.policyDocumentMediaAssetId
      ? documentAssetMap.get(dto.policyDocumentMediaAssetId)
      : null;
    const invoiceAsset = dto.invoiceDocumentMediaAssetId
      ? documentAssetMap.get(dto.invoiceDocumentMediaAssetId)
      : null;

    await this.prisma.$transaction(async (tx) => {
      if (dto.policyDocumentUrl || policyAsset) {
        await tx.insurancePolicyDocument.deleteMany({
          where: {
            requestId,
            documentType: 'POLICY',
          },
        });

        await tx.insurancePolicyDocument.create({
          data: {
            requestId,
            adminId: adminUser.adminUserId,
            documentType: 'POLICY',
            fileUrl: policyAsset?.url ?? dto.policyDocumentUrl?.trim() ?? '',
            mediaAssetId: policyAsset?.id ?? null,
          },
        });
      }

      if (dto.invoiceDocumentUrl || invoiceAsset) {
        await tx.insurancePolicyDocument.deleteMany({
          where: {
            requestId,
            documentType: 'INVOICE',
          },
        });

        await tx.insurancePolicyDocument.create({
          data: {
            requestId,
            adminId: adminUser.adminUserId,
            documentType: 'INVOICE',
            fileUrl: invoiceAsset?.url ?? dto.invoiceDocumentUrl?.trim() ?? '',
            mediaAssetId: invoiceAsset?.id ?? null,
          },
        });
      }

      await tx.insuranceRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: InsuranceRequestStatus.POLICY_UPLOADED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorAdminId: adminUser.adminUserId,
          action: 'insurance_documents_uploaded',
          entityType: 'InsuranceRequest',
          entityId: requestId,
          metadata: {
            policyDocumentUrl: dto.policyDocumentUrl ?? null,
            invoiceDocumentUrl: dto.invoiceDocumentUrl ?? null,
          },
        },
      });

      if (request.sourceThreadId) {
        await createSystemMessageRecord(tx, {
          threadId: request.sourceThreadId,
          senderId: request.buyerId,
          body: 'Sigorta policeniz ve faturaniz hazir.',
          metadata: {
            systemCard: {
              type: 'POLICY_DOCUMENT_CARD',
              requestId,
              buttonLabel: 'Belgeleri gor',
            },
          },
        });
      }
    });

    await this.notificationsService.create({
      receiverId: request.buyerId,
      actorId: request.sellerId,
      type: 'POLICY_DOCUMENT_READY',
      entityId: requestId,
      title: 'Sigorta belgeleriniz hazir',
      body: 'Policeniz ve faturanız uygulamaya yüklendi.',
      targetUrl: `/insurance/${requestId}`,
    });

    return {
      success: true,
      requestId,
      status: InsuranceRequestStatus.POLICY_UPLOADED,
    };
  }

  async getUserRequests(userId: string) {
    const requests = await this.prisma.insuranceRequest.findMany({
      where: {
        buyerId: userId,
      },
      include: insuranceRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: requests.map((request) => this.serializeInsuranceRequest(request, 'user-list')),
    };
  }

  async getUserRequestDetail(userId: string, requestId: string) {
    const request = await this.findInsuranceRequestById(requestId);

    if (request.buyerId !== userId) {
      throw new NotFoundException('Sigorta talebi bulunamadi.');
    }

    return this.serializeInsuranceRequest(request, 'user-detail');
  }

  async acceptOffer(userId: string, offerId: string) {
    const offer = await this.prisma.insuranceOffer.findUnique({
      where: {
        id: offerId,
      },
      include: {
        request: {
          include: insuranceRequestInclude,
        },
      },
    });

    if (!offer || !offer.request) {
      throw new NotFoundException('Sigorta teklifi bulunamadi.');
    }

    if (offer.request.buyerId !== userId) {
      throw new NotFoundException('Sigorta teklifi bulunamadi.');
    }

    if (offer.status !== InsuranceOfferStatus.ACTIVE) {
      throw new BadRequestException('Yalnizca aktif teklifler kabul edilebilir.');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.insuranceOffer.updateMany({
        where: {
          requestId: offer.requestId,
          status: InsuranceOfferStatus.ACTIVE,
          id: {
            not: offer.id,
          },
        },
        data: {
          status: InsuranceOfferStatus.EXPIRED,
        },
      });

      await tx.insuranceOffer.update({
        where: {
          id: offer.id,
        },
        data: {
          status: InsuranceOfferStatus.ACCEPTED,
        },
      });

      await tx.insuranceRequest.update({
        where: {
          id: offer.requestId,
        },
        data: {
          status: InsuranceRequestStatus.ACCEPTED,
        },
      });

      const existingPayment = await tx.payment.findFirst({
        where: {
          insuranceRequestId: offer.requestId,
          insuranceOfferId: offer.id,
          userId,
          status: PaymentStatus.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const nextPayment =
        existingPayment ??
        (await tx.payment.create({
          data: {
            userId,
            insuranceRequestId: offer.requestId,
            insuranceOfferId: offer.id,
            amount: offer.amount,
            currency: offer.currency,
            provider: PaymentProvider.GARANTI,
            status: PaymentStatus.PENDING,
            metadata: {
              acceptedAt: new Date().toISOString(),
            },
          },
        }));

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'insurance_offer_accepted',
          entityType: 'InsuranceOffer',
          entityId: offer.id,
          metadata: {
            requestId: offer.requestId,
            paymentId: nextPayment.id,
          },
        },
      });

      if (offer.request.sourceThreadId) {
        await createSystemMessageRecord(tx, {
          threadId: offer.request.sourceThreadId,
          senderId: offer.request.buyerId,
          body: 'Odeme bekleniyor. Sigorta teklifi kabul edildi.',
          metadata: {
            systemCard: {
              type: 'PAYMENT_STATUS_CARD',
              requestId: offer.requestId,
              paymentId: nextPayment.id,
              status: PaymentStatus.PENDING,
              buttonLabel: 'Odeme ekranina git',
            },
          },
        });
      }

      return nextPayment;
    });

    return {
      success: true,
      requestId: offer.requestId,
      offerId: offer.id,
      paymentId: payment.id,
      paymentStatus: payment.status,
      insuranceRequestStatus: InsuranceRequestStatus.ACCEPTED,
    };
  }

  async rejectOffer(userId: string, offerId: string) {
    const offer = await this.prisma.insuranceOffer.findUnique({
      where: {
        id: offerId,
      },
      include: {
        request: true,
      },
    });

    if (!offer || !offer.request) {
      throw new NotFoundException('Sigorta teklifi bulunamadi.');
    }

    if (offer.request.buyerId !== userId) {
      throw new NotFoundException('Sigorta teklifi bulunamadi.');
    }

    if (offer.status !== InsuranceOfferStatus.ACTIVE) {
      throw new BadRequestException('Yalnizca aktif teklifler reddedilebilir.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.insuranceOffer.update({
        where: {
          id: offer.id,
        },
        data: {
          status: InsuranceOfferStatus.REJECTED,
        },
      });

      await tx.insuranceRequest.update({
        where: {
          id: offer.requestId,
        },
        data: {
          status: InsuranceRequestStatus.REJECTED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'insurance_offer_rejected',
          entityType: 'InsuranceOffer',
          entityId: offer.id,
          metadata: {
            requestId: offer.requestId,
          },
        },
      });

      if (offer.request.sourceThreadId) {
        await createSystemMessageRecord(tx, {
          threadId: offer.request.sourceThreadId,
          senderId: offer.request.buyerId,
          body: 'Sigorta teklifi reddedildi.',
          metadata: {
            systemCard: {
              type: 'PAYMENT_STATUS_CARD',
              requestId: offer.requestId,
              paymentId: null,
              status: 'REJECTED',
              buttonLabel: 'Talebi gor',
            },
          },
        });
      }
    });

    await this.notificationsService.create({
      receiverId: offer.request.sellerId,
      actorId: userId,
      type: 'INSURANCE_OFFER_REJECTED',
      entityId: offer.id,
      title: 'Sigorta teklifi reddedildi',
      body: 'Alici sigorta teklifini reddetti.',
      targetUrl: `/messages?thread=${offer.request.sourceThreadId ?? ''}`,
    });

    return {
      success: true,
      requestId: offer.requestId,
      offerId: offer.id,
      status: InsuranceOfferStatus.REJECTED,
    };
  }

  async getDocuments(userId: string, requestId: string) {
    const request = await this.findInsuranceRequestById(requestId);

    if (request.buyerId !== userId) {
      throw new NotFoundException('Belgeler bulunamadi.');
    }

    return {
      requestId,
      documents: request.policyDocuments.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        fileUrl: document.fileUrl,
        createdAt: document.createdAt.toISOString(),
      })),
    };
  }

  private async findInsuranceRequestById(requestId: string) {
    const request = await this.prisma.insuranceRequest.findUnique({
      where: {
        id: requestId,
      },
      include: insuranceRequestInclude,
    });

    if (!request) {
      throw new NotFoundException('Sigorta talebi bulunamadi.');
    }

    return request;
  }

  private serializeInsuranceRequest(
    request: Prisma.InsuranceRequestGetPayload<{ include: typeof insuranceRequestInclude }>,
    mode: 'admin-list' | 'admin-detail' | 'user-list' | 'user-detail',
  ) {
    const currentOffer =
      request.offers.find((offer) => offer.status === InsuranceOfferStatus.ACTIVE) ??
      request.offers.find((offer) => offer.status === InsuranceOfferStatus.ACCEPTED) ??
      request.offers[0] ??
      null;
    const latestPayment = request.payments[0] ?? null;
    const garageVehicle = request.listing.garageVehicle;
    const vehiclePackage = garageVehicle?.vehiclePackage;
    const spec = vehiclePackage?.specs?.[0] ?? null;

    return {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      sourceThreadId: request.sourceThreadId,
      buyer: {
        id: request.buyer.id,
        username: request.buyer.username,
        fullName: `${request.buyer.firstName} ${request.buyer.lastName}`.trim(),
        email: mode.startsWith('admin') ? request.buyer.email ?? null : null,
        phoneMasked: this.maskPhone(request.buyer.phone),
        avatarUrl: request.buyer.profile?.avatarUrl ?? null,
      },
      seller: {
        id: request.seller.id,
        username: request.seller.username,
        fullName: `${request.seller.firstName} ${request.seller.lastName}`.trim(),
        email: mode.startsWith('admin') ? request.seller.email ?? null : null,
        phoneMasked: this.maskPhone(request.seller.phone),
        avatarUrl: request.seller.profile?.avatarUrl ?? null,
      },
      listing: {
        id: request.listing.id,
        listingNo: request.listing.listingNo,
        title: request.listing.title,
        city: request.listing.city,
        district: request.listing.district ?? null,
        price: Number(request.listing.price),
        currency: request.listing.currency,
        firstMediaUrl: request.listing.media[0]?.url ?? null,
      },
      vehicle: {
        brand: vehiclePackage?.model.brand.name ?? garageVehicle?.brandText ?? null,
        model: vehiclePackage?.model.name ?? garageVehicle?.modelText ?? null,
        package: vehiclePackage?.name ?? garageVehicle?.packageText ?? null,
        year: garageVehicle?.year ?? null,
        fuelType: spec?.fuelType ?? garageVehicle?.fuelType ?? null,
        transmissionType: spec?.transmissionType ?? garageVehicle?.transmissionType ?? null,
        km: garageVehicle?.km ?? null,
        bodyType: spec?.bodyType ?? null,
      },
      licenseInfo: {
        ownerName: request.listing.licenseOwnerName ?? null,
        maskedTcNo: this.maskIdentityNumber(request.listing.licenseOwnerTcNo),
        maskedPlate: request.listing.plateNumber ?? null,
      },
      currentOffer: currentOffer
        ? {
            id: currentOffer.id,
            amount: Number(currentOffer.amount),
            currency: currentOffer.currency,
            offerFileUrl: currentOffer.offerFileUrl,
            status: currentOffer.status,
            createdAt: currentOffer.createdAt.toISOString(),
            updatedAt: currentOffer.updatedAt.toISOString(),
            admin: {
              id: currentOffer.admin.id,
              username: currentOffer.admin.username,
              role: currentOffer.admin.role,
            },
          }
        : null,
      offers: mode === 'admin-detail' || mode === 'user-detail'
        ? request.offers.map((offer) => ({
            id: offer.id,
            amount: Number(offer.amount),
            currency: offer.currency,
            offerFileUrl: offer.offerFileUrl,
            status: offer.status,
            createdAt: offer.createdAt.toISOString(),
            updatedAt: offer.updatedAt.toISOString(),
            admin: {
              id: offer.admin.id,
              username: offer.admin.username,
              role: offer.admin.role,
            },
          }))
        : undefined,
      payment: latestPayment
        ? {
            id: latestPayment.id,
            amount: Number(latestPayment.amount),
            currency: latestPayment.currency,
            provider: latestPayment.provider,
            status: latestPayment.status,
            providerTransactionId: latestPayment.providerTransactionId,
            createdAt: latestPayment.createdAt.toISOString(),
            updatedAt: latestPayment.updatedAt.toISOString(),
            completedAt: latestPayment.completedAt?.toISOString() ?? null,
            failureReason: latestPayment.failureReason ?? null,
          }
        : null,
      documents: request.policyDocuments.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        fileUrl:
          mode === 'admin-detail' || mode === 'user-detail' ? document.fileUrl : null,
        createdAt: document.createdAt.toISOString(),
      })),
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

  private maskPhone(value: string | null) {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/[^\d+]/g, '');
    const visibleTail = normalized.slice(-2);

    if (normalized.length <= 4) {
      return '*'.repeat(normalized.length);
    }

    return `${normalized.slice(0, 3)}${'*'.repeat(Math.max(0, normalized.length - 5))}${visibleTail}`;
  }
}

const insuranceRequestInclude = {
  buyer: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      profile: {
        select: {
          avatarUrl: true,
        },
      },
    },
  },
  seller: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      profile: {
        select: {
          avatarUrl: true,
        },
      },
    },
  },
  listing: {
    include: {
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
    },
  },
  sourceThread: {
    select: {
      id: true,
    },
  },
  offers: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      admin: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  },
  payments: {
    orderBy: {
      createdAt: 'desc',
    },
  },
  policyDocuments: {
    orderBy: {
      createdAt: 'desc',
    },
  },
} as const satisfies Prisma.InsuranceRequestInclude;
