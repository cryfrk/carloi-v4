import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InsuranceOfferStatus,
  InsuranceRequestStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createSystemMessageRecord } from '../messages/message-record.utils';
import { GarantiCallbackVerificationService } from './garanti-callback-verification.service';
import { GarantiPaymentProvider } from './providers/garanti-payment.provider';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import type { PaymentProvider } from './providers/payment-provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly garantiPaymentProvider: GarantiPaymentProvider,
    private readonly mockPaymentProvider: MockPaymentProvider,
    private readonly callbackVerificationService: GarantiCallbackVerificationService,
  ) {}

  async createInsurancePayment(
    userId: string,
    insuranceRequestId: string,
    requestBaseUrl: string,
    customerIpAddress?: string | null,
  ) {
    const insuranceRequest = await this.prisma.insuranceRequest.findUnique({
      where: {
        id: insuranceRequestId,
      },
      include: {
        buyer: true,
        listing: {
          select: {
            title: true,
          },
        },
        offers: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!insuranceRequest || insuranceRequest.buyerId !== userId) {
      throw new NotFoundException('Odeme talebi bulunamadi.');
    }

    if (insuranceRequest.status !== InsuranceRequestStatus.ACCEPTED) {
      throw new BadRequestException('Odeme baslatmak icin once sigorta teklifi kabul edilmelidir.');
    }

    const acceptedOffer =
      insuranceRequest.offers.find((offer) => offer.status === InsuranceOfferStatus.ACCEPTED) ?? null;

    if (!acceptedOffer) {
      throw new BadRequestException('Kabul edilmis sigorta teklifi bulunamadi.');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const existingPendingPayment = await tx.payment.findFirst({
        where: {
          insuranceRequestId,
          insuranceOfferId: acceptedOffer.id,
          userId,
          status: PaymentStatus.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const nextPayment =
        existingPendingPayment ??
        (await tx.payment.create({
          data: {
            userId,
            insuranceRequestId,
            insuranceOfferId: acceptedOffer.id,
            amount: acceptedOffer.amount,
            currency: acceptedOffer.currency,
            status: PaymentStatus.PENDING,
            metadata: {
              createdBy: 'payments_service',
            },
          },
        }));

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'payment_started',
          entityType: 'Payment',
          entityId: nextPayment.id,
          metadata: {
            insuranceRequestId,
            insuranceOfferId: acceptedOffer.id,
            amount: Number(nextPayment.amount),
            currency: nextPayment.currency,
          },
        },
      });

      return nextPayment;
    });

    const callbackUrl = `${requestBaseUrl}/payments/garanti/callback`;
    const resultUrl = `${requestBaseUrl}/payments/garanti/result?paymentId=${payment.id}`;
    const successUrl = this.buildReturnUrl(
      this.configService.get<string>('GARANTI_SUCCESS_URL')?.trim() ?? null,
      `${resultUrl}&status=success`,
      payment.id,
      'success',
    );
    const failureUrl = this.buildReturnUrl(
      this.configService.get<string>('GARANTI_FAIL_URL')?.trim() ?? null,
      `${resultUrl}&status=failure`,
      payment.id,
      'failure',
    );
    const provider = this.resolveProvider();
    const session = await provider.createPaymentSession({
      paymentId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      callbackUrl,
      successUrl,
      failureUrl,
      customerEmail: insuranceRequest.buyer.email,
      customerIpAddress: customerIpAddress ?? null,
      description: `${insuranceRequest.listing.title} sigorta odemesi`,
    });

    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        metadata: this.mergeJson(
          payment.metadata,
          {
            providerMode: session.providerMode,
            checkoutActionUrl: session.checkout.actionUrl,
            successUrl,
            failureUrl,
          },
        ),
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      paymentStatus: payment.status,
      providerMode: session.providerMode,
      checkout: session.checkout,
      resultUrl,
      successUrl,
      failureUrl,
    };
  }

  async handleGarantiCallback(rawBody: Record<string, string | string[] | undefined>) {
    const verification = this.callbackVerificationService.verify(rawBody);

    if (!verification.paymentId) {
      throw new BadRequestException('Odeme referansi bulunamadi.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        id: verification.paymentId,
      },
      include: {
        insuranceRequest: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Odeme kaydi bulunamadi.');
    }

    const baseMetadata = this.mergeJson(payment.metadata, {
      callbackParams: rawBody,
      callbackVerified: verification.verified,
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'garanti_callback_received',
        entityType: 'Payment',
        entityId: payment.id,
        metadata: {
          verified: verification.verified,
          approved: verification.approved,
          callbackParams: rawBody,
        },
      },
    });

    if (verification.approved) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            providerTransactionId: verification.providerTransactionId,
            callbackVerifiedAt: new Date(),
            completedAt: new Date(),
            failureReason: null,
            metadata: baseMetadata,
          },
        });

        if (payment.insuranceRequestId) {
          await tx.insuranceRequest.update({
            where: {
              id: payment.insuranceRequestId,
            },
            data: {
              status: InsuranceRequestStatus.PAID,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'payment_success',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: {
              providerTransactionId: verification.providerTransactionId,
              insuranceRequestId: payment.insuranceRequestId,
            },
          },
        });

        if (payment.insuranceRequest?.sourceThreadId) {
          await createSystemMessageRecord(tx, {
            threadId: payment.insuranceRequest.sourceThreadId,
            senderId: payment.userId,
            body: 'Odeme tamamlandi.',
            metadata: {
              systemCard: {
                type: 'PAYMENT_STATUS_CARD',
                requestId: payment.insuranceRequestId,
                paymentId: payment.id,
                status: PaymentStatus.PAID,
                buttonLabel: 'Odeme sonucu',
              },
            },
          });
        }
      });

      if (payment.insuranceRequest) {
        await Promise.all([
          this.notificationsService.create({
            receiverId: payment.userId,
            actorId: payment.insuranceRequest.sellerId,
            type: 'PAYMENT_SUCCESS',
            entityId: payment.id,
            title: 'Odeme tamamlandi',
            body: 'Sigorta odemeniz basariyla tamamlandi.',
            targetUrl: `/insurance/${payment.insuranceRequestId}`,
          }),
          this.notificationsService.create({
            receiverId: payment.insuranceRequest.sellerId,
            actorId: payment.userId,
            type: 'PAYMENT_SUCCESS',
            entityId: payment.id,
            title: 'Alici odemeyi tamamladi',
            body: 'Sigorta surecinin odeme adimi tamamlandi.',
            targetUrl: `/messages?thread=${payment.insuranceRequest.sourceThreadId ?? ''}`,
          }),
        ]);
      }
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.FAILED,
            providerTransactionId: verification.providerTransactionId,
            failureReason: verification.failureReason,
            callbackVerifiedAt: verification.verified ? new Date() : null,
            metadata: baseMetadata,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'payment_failed',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: {
              providerTransactionId: verification.providerTransactionId,
              insuranceRequestId: payment.insuranceRequestId,
              failureReason: verification.failureReason,
            },
          },
        });

        if (payment.insuranceRequest?.sourceThreadId) {
          await createSystemMessageRecord(tx, {
            threadId: payment.insuranceRequest.sourceThreadId,
            senderId: payment.userId,
            body: 'Odeme basarisiz oldu.',
            metadata: {
              systemCard: {
                type: 'PAYMENT_STATUS_CARD',
                requestId: payment.insuranceRequestId,
                paymentId: payment.id,
                status: PaymentStatus.FAILED,
                buttonLabel: 'Tekrar dene',
              },
            },
          });
        }
      });

      if (payment.insuranceRequest) {
        await this.notificationsService.create({
          receiverId: payment.userId,
          actorId: payment.insuranceRequest.sellerId,
          type: 'PAYMENT_FAILED',
          entityId: payment.id,
          title: 'Odeme tamamlanamadi',
          body: 'Sigorta odemeniz basarisiz oldu.',
          targetUrl: `/insurance/${payment.insuranceRequestId}`,
        });
      }
    }

    const metadataUrls = this.readMetadataUrls(payment.metadata);
    const resultUrl =
      verification.redirectStatus === 'success'
        ? metadataUrls.successUrl ||
          this.configService.get<string>('GARANTI_SUCCESS_URL')?.trim() ||
          `/payments/garanti/result?paymentId=${payment.id}`
        : metadataUrls.failureUrl ||
          this.configService.get<string>('GARANTI_FAIL_URL')?.trim() ||
          `/payments/garanti/result?paymentId=${payment.id}`;

    return {
      success: verification.approved,
      paymentId: payment.id,
      paymentStatus: verification.approved ? PaymentStatus.PAID : PaymentStatus.FAILED,
      verified: verification.verified,
      redirectUrl: resultUrl,
      resultUrl: `/payments/garanti/result?paymentId=${payment.id}`,
      failureReason: verification.failureReason,
    };
  }

  async getGarantiResult(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        insuranceRequest: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                listingNo: true,
              },
            },
            policyDocuments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Odeme sonucu bulunamadi.');
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      provider: payment.provider,
      amount: Number(payment.amount),
      currency: payment.currency,
      insuranceRequestId: payment.insuranceRequestId,
      providerTransactionId: payment.providerTransactionId,
      failureReason: payment.failureReason,
      listing: payment.insuranceRequest?.listing
        ? {
            id: payment.insuranceRequest.listing.id,
            title: payment.insuranceRequest.listing.title,
            listingNo: payment.insuranceRequest.listing.listingNo,
          }
        : null,
      documents: payment.insuranceRequest?.policyDocuments.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        fileUrl: document.fileUrl,
      })) ?? [],
    };
  }

  private resolveProvider(): PaymentProvider {
    const hasRequiredEnv = [
      'GARANTI_MERCHANT_ID',
      'GARANTI_TERMINAL_ID',
      'GARANTI_PROVISION_USER',
      'GARANTI_PROVISION_PASSWORD',
      'GARANTI_STORE_KEY',
    ].every((key) => Boolean(this.configService.get<string>(key)?.trim()));

    if (hasRequiredEnv) {
      return this.garantiPaymentProvider;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException('Guvenli odeme ayarlari eksik.');
    }

    return this.mockPaymentProvider;
  }

  private mergeJson(
    current: Prisma.JsonValue | null,
    patch: Prisma.InputJsonObject,
  ): Prisma.InputJsonObject {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Prisma.InputJsonObject)
        : {};

    return {
      ...base,
      ...patch,
    };
  }

  private readMetadataUrls(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        successUrl: null,
        failureUrl: null,
      };
    }

    const record = metadata as Record<string, unknown>;

    return {
      successUrl: typeof record.successUrl === 'string' ? record.successUrl : null,
      failureUrl: typeof record.failureUrl === 'string' ? record.failureUrl : null,
    };
  }

  private buildReturnUrl(
    preferredUrl: string | null,
    fallbackUrl: string,
    paymentId: string,
    status: 'success' | 'failure',
  ) {
    if (!preferredUrl) {
      return fallbackUrl;
    }

    try {
      const url = new URL(preferredUrl);
      url.searchParams.set('paymentId', paymentId);
      url.searchParams.set('status', status);
      return url.toString();
    } catch {
      return fallbackUrl;
    }
  }
}
