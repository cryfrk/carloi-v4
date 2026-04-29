import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  LegalComplianceCheckType,
  LegalComplianceStatus,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  EIDS_VERIFICATION_PROVIDER,
  type EidsVerificationProvider,
  type LicenseInfoPayload,
} from './providers/eids-verification.provider';

export const INDIVIDUAL_LISTING_LIMIT_PER_YEAR = 3;

type ComplianceCheckResult = {
  passed: boolean;
  status: LegalComplianceStatus;
  reason: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class LegalComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EIDS_VERIFICATION_PROVIDER)
    private readonly eidsVerificationProvider: EidsVerificationProvider,
  ) {}

  async checkIndividualListingLimit(userId: string): Promise<ComplianceCheckResult> {
    const year = new Date().getFullYear();
    const existingRecord = await this.prisma.userListingLimit.findUnique({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
    });

    const listingCount =
      existingRecord?.listingCount ??
      (await this.prisma.listing.count({
        where: {
          sellerId: userId,
          createdAt: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
          deletedAt: null,
        },
      }));

    const passed = listingCount < INDIVIDUAL_LISTING_LIMIT_PER_YEAR;

    return {
      passed,
      status: passed ? LegalComplianceStatus.PASSED : LegalComplianceStatus.FAILED,
      reason: passed ? 'individual-listing-limit-clear' : 'individual-listing-limit-exceeded',
      metadata: {
        year,
        listingCount,
        limit: INDIVIDUAL_LISTING_LIMIT_PER_YEAR,
      },
    };
  }

  async checkLicenseOwnerMatch(userId: string, licenseInfo: LicenseInfoPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tcIdentityNo: true,
        userType: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Kullanici bulunamadi.');
    }

    const verification = await this.eidsVerificationProvider.verify({
      userFullName: `${user.firstName} ${user.lastName}`,
      userTcIdentityNo: user.tcIdentityNo,
      licenseInfo,
    });

    const isCommercialNeedsReview = user.userType === UserType.COMMERCIAL && !verification.isMatch;

    return {
      passed: verification.isMatch,
      status: verification.isMatch
        ? LegalComplianceStatus.PASSED
        : isCommercialNeedsReview
          ? LegalComplianceStatus.NEEDS_REVIEW
          : LegalComplianceStatus.FAILED,
      reason: verification.reason,
      metadata: {
        normalizedOwnerName: verification.normalizedOwnerName,
        requiresManualApproval: verification.requiresManualApproval,
      },
    } satisfies ComplianceCheckResult;
  }

  async checkCommercialApproval(userId: string): Promise<ComplianceCheckResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isCommercialApproved: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Kullanici bulunamadi.');
    }

    return {
      passed: user.isCommercialApproved,
      status: user.isCommercialApproved
        ? LegalComplianceStatus.PASSED
        : LegalComplianceStatus.FAILED,
      reason: user.isCommercialApproved
        ? 'commercial-approval-ready'
        : 'commercial-approval-required',
    };
  }

  async createLegalComplianceCheckLog(input: {
    userId: string;
    listingId?: string | null;
    checkType: LegalComplianceCheckType;
    status: LegalComplianceStatus;
    resultJson: Prisma.InputJsonValue;
  }) {
    return this.prisma.legalComplianceCheck.create({
      data: {
        userId: input.userId,
        listingId: input.listingId ?? null,
        checkType: input.checkType,
        status: input.status,
        resultJson: input.resultJson,
      },
    });
  }

  async recordListingCreated(userId: string) {
    const year = new Date().getFullYear();

    await this.prisma.userListingLimit.upsert({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
      update: {
        listingCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        year,
        listingCount: 1,
      },
    });
  }
}
