import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LegalComplianceCheckType,
  LegalComplianceStatus,
  ListingStatus,
  MediaAssetPurpose,
  ObdReportStatus,
  Prisma,
  SavedItemType,
  SellerType,
  FuelType,
  TransmissionType,
  UserType,
  VehicleCatalogType,
} from '@prisma/client';
import { isObdEnabled } from '../../common/feature-flags';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LegalComplianceService } from '../legal-compliance/legal-compliance.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import { normalizePersistedMediaUrl, shouldLogMediaDebug } from '../media/media-url.utils';
import { NotificationsService } from '../notifications/notifications.service';
import { serializeObdReport } from '../obd/obd.utils';
import {
  buildListingNo,
  hashPlateNumber,
  inferMediaType,
  maskPlateNumber,
  normalizeHumanName,
  toTitleCase,
  trimNullable,
} from './listings.utils';
import { CreateListingDto } from './dto/create-listing.dto';
import {
  ListingsFeedQueryDto,
  type ListingSortQuery,
  type ListingVehicleTypeQuery,
} from './dto/listings-feed-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type ListingFeedCandidate = {
  id: string;
};

type ListingCountResult = {
  count: bigint | number;
};

type ComplianceLogPayload = {
  checkType: LegalComplianceCheckType;
  status: LegalComplianceStatus;
  resultJson: Prisma.InputJsonValue;
};

type MediaAssetReference = {
  id: string;
  url: string;
  storageKey: string;
  visibility: 'PUBLIC' | 'PRIVATE';
};

const toJsonObject = (value?: Prisma.InputJsonValue): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalComplianceService: LegalComplianceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createListing(userId: string, dto: CreateListingDto) {
    const obdEnabled = isObdEnabled();
    const user = await this.getActiveUser(userId);
    const garageVehicle = await this.getOwnedGarageVehicle(userId, dto.garageVehicleId);
    const contactPhone = trimNullable(dto.contactPhone) ?? user.phone ?? null;

    if (dto.showPhone && !contactPhone) {
      throw new BadRequestException('Telefon gosterilecekse iletisim telefonu girilmelidir.');
    }

    if (user.userType === UserType.INDIVIDUAL && dto.sellerType !== SellerType.OWNER) {
      throw new BadRequestException('Bireysel kullanicilar yalnizca sahibi olarak ilan verebilir.');
    }

    const complianceLogs: ComplianceLogPayload[] = [];
    let listingStatus: ListingStatus = ListingStatus.ACTIVE;
    let ownerAuthorizationRequired = false;
    let isLicenseVerified = false;

    if (user.userType === UserType.INDIVIDUAL) {
      const limitCheck = await this.legalComplianceService.checkIndividualListingLimit(userId);
      complianceLogs.push({
        checkType: LegalComplianceCheckType.LISTING_LIMIT,
        status: limitCheck.status,
        resultJson: {
          reason: limitCheck.reason,
          ...toJsonObject(limitCheck.metadata),
        },
      });

      if (!limitCheck.passed) {
        await this.persistComplianceLogs(userId, null, complianceLogs);
        throw new ForbiddenException('Bireysel ilan limiti doldugu icin yeni ilan acilamadi.');
      }

      const licenseCheck = await this.legalComplianceService.checkLicenseOwnerMatch(
        userId,
        dto.licenseInfo,
      );
      complianceLogs.push({
        checkType: LegalComplianceCheckType.LICENSE_OWNERSHIP,
        status: licenseCheck.status,
        resultJson: {
          reason: licenseCheck.reason,
          ...toJsonObject(licenseCheck.metadata),
        },
      });

      if (!licenseCheck.passed) {
        await this.persistComplianceLogs(userId, null, complianceLogs);
        throw new ForbiddenException(
          'Bireysel hesapta ruhsat sahibi bilgisi hesap sahibiyle eslesmelidir.',
        );
      }

      isLicenseVerified = true;
    } else {
      const commercialApproval = await this.legalComplianceService.checkCommercialApproval(userId);
      complianceLogs.push({
        checkType: LegalComplianceCheckType.COMMERCIAL_ELIGIBILITY,
        status: commercialApproval.status,
        resultJson: {
          reason: commercialApproval.reason,
        },
      });

      if (!commercialApproval.passed) {
        await this.persistComplianceLogs(userId, null, complianceLogs);
        throw new ForbiddenException('Ticari hesap onaylanmadan ilan verilemez.');
      }

      const licenseCheck = await this.legalComplianceService.checkLicenseOwnerMatch(
        userId,
        dto.licenseInfo,
      );
      complianceLogs.push({
        checkType: LegalComplianceCheckType.LICENSE_OWNERSHIP,
        status: licenseCheck.status,
        resultJson: {
          reason: licenseCheck.reason,
          ...toJsonObject(licenseCheck.metadata),
        },
      });

      if (licenseCheck.passed) {
        isLicenseVerified = true;
      } else {
        listingStatus = ListingStatus.PENDING_LEGAL_CHECK;
        ownerAuthorizationRequired = true;
      }
    }

    const listingNo = await this.generateUniqueListingNo();
    const maskedPlate = maskPlateNumber(dto.licenseInfo.plateNumber);
    const plateHash = hashPlateNumber(dto.licenseInfo.plateNumber);
    const licenseOwnerName = normalizeHumanName(
      `${dto.licenseInfo.ownerFirstName} ${dto.licenseInfo.ownerLastName}`,
    );
    const expertiseReport = obdEnabled
      ? await this.resolveOwnedExpertiseReport(
          userId,
          garageVehicle.id,
          dto.obdExpertiseReportId,
        )
      : null;
    const assetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      dto.media.map((item) => item.mediaAssetId ?? '').filter(Boolean),
      [MediaAssetPurpose.LISTING_MEDIA],
    );

    const listing = await this.prisma.$transaction(async (tx) => {
      const createdListing = await tx.listing.create({
        data: {
          sellerId: userId,
          garageVehicleId: garageVehicle.id,
          title: dto.title.trim(),
          description: dto.description.trim(),
          price: new Prisma.Decimal(dto.price),
          currency: dto.currency.trim().toUpperCase(),
          city: toTitleCase(dto.city),
          district: trimNullable(dto.district),
          listingNo,
          listingStatus,
          sellerType: dto.sellerType,
          tradeAvailable: dto.tradeAvailable ?? false,
          contactPhone,
          showPhone: dto.showPhone ?? false,
          plateNumber: maskedPlate,
          plateNumberHash: plateHash,
          licenseOwnerName,
          licenseOwnerTcNo: trimNullable(dto.licenseInfo.ownerTcIdentityNo),
          isLicenseVerified,
          hasExpertiseReport: obdEnabled ? Boolean(expertiseReport) : false,
          obdExpertiseReportId: obdEnabled ? expertiseReport?.id ?? null : null,
          ownerAuthorizationRequired,
          media: {
            create: dto.media.map((item, index) => {
              const asset = item.mediaAssetId ? assetMap.get(item.mediaAssetId) : null;
              const url = asset?.url ?? item.url.trim();

              return {
                url,
                mediaAssetId: asset?.id ?? null,
                mediaType: inferMediaType(url),
                sortOrder: index,
              };
            }),
          },
          damageParts: {
            create: (dto.damageParts ?? []).map((item) => ({
              partName: item.partName,
              damageStatus: item.damageStatus,
            })),
          },
        },
        select: {
          id: true,
          listingNo: true,
          listingStatus: true,
        },
      });

      if (user.userType === UserType.INDIVIDUAL) {
        const year = new Date().getFullYear();
        await tx.userListingLimit.upsert({
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

      for (const complianceLog of complianceLogs) {
        await tx.legalComplianceCheck.create({
          data: {
            userId,
            listingId: createdListing.id,
            checkType: complianceLog.checkType,
            status: complianceLog.status,
            resultJson: complianceLog.resultJson,
          },
        });
      }

      return createdListing;
    });

    return {
      success: true,
      listingId: listing.id,
      listingNo: listing.listingNo,
      listingStatus: listing.listingStatus,
    };
  }

  async getListingsFeed(userId: string, query: ListingsFeedQueryDto) {
    const limit = query.limit ?? 12;
    const priorityCity = await this.resolvePriorityCity(userId, query);
    const offset = this.decodeFeedCursor(query.cursor);
    const [totalCount, candidates] = await Promise.all([
      this.getListingsCount(userId, query),
      this.getFeedCandidates(query, priorityCity, limit, offset),
    ]);
    const hasMore = candidates.length > limit;
    const slice = hasMore ? candidates.slice(0, limit) : candidates;
    const listingIds = slice.map((candidate) => candidate.id);
    const listings = await this.getFeedListings(userId, listingIds);

    return {
      items: listingIds
        .map((listingId) => listings.find((listing) => listing.id === listingId))
        .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))
        .map((listing) => this.serializeFeedItem(listing)),
      nextCursor: hasMore ? this.encodeFeedCursor(offset + slice.length) : null,
      totalCount,
    };
  }

  async getListingsCount(userId: string, query: ListingsFeedQueryDto) {
    const priorityCity = await this.resolvePriorityCity(userId, query);
    const filterQuery = this.buildFeedFilterQuery(query, priorityCity);
    const [result] = await this.prisma.$queryRaw<ListingCountResult[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${filterQuery.fromSql}
      WHERE ${Prisma.join(filterQuery.filters, ' AND ')}
    `);

    return Number(result?.count ?? 0);
  }

  async getListingDetail(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      include: {
        seller: {
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
          include: {
            mediaAsset: {
              select: {
                id: true,
                url: true,
                storageKey: true,
                visibility: true,
              },
            },
          },
        },
        damageParts: {
          orderBy: {
            partName: 'asc',
          },
        },
        savedItems: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        obdExpertiseReport: {
          include: {
            faultCodes: {
              orderBy: {
                createdAt: 'asc',
              },
            },
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
            obdExpertiseReports: {
              orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              include: {
                faultCodes: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!listing || listing.deletedAt) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    if (listing.listingStatus !== ListingStatus.ACTIVE && listing.sellerId !== userId) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    return this.serializeListingDetail(userId, listing);
  }

  async saveListing(userId: string, listingId: string) {
    const listing = await this.getListingForPublicInteraction(userId, listingId);

    await this.prisma.savedItem.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      update: {},
      create: {
        userId,
        itemType: SavedItemType.LISTING,
        listingId,
      },
    });

    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    await this.notificationsService.create({
      receiverId: listing.sellerId,
      actorId: userId,
      type: 'listing_saved',
      entityId: listing.id,
      title: 'Ilaniniz kaydedildi',
      body: `${actor?.username ?? 'Bir kullanici'} ilaninizi kaydetti.`,
      targetUrl: `/listings/${listing.id}`,
    });

    return {
      success: true,
      isSaved: true,
    };
  }

  async unsaveListing(userId: string, listingId: string) {
    await this.prisma.savedItem.deleteMany({
      where: {
        userId,
        listingId,
      },
    });

    return {
      success: true,
      isSaved: false,
    };
  }

  async updateListing(userId: string, listingId: string, dto: UpdateListingDto) {
    const obdEnabled = isObdEnabled();
    const existingListing = await this.findOwnedListing(userId, listingId);
    const seller = await this.getActiveUser(userId);
    const shouldUpdateExpertise = obdEnabled && dto.obdExpertiseReportId !== undefined;
    const expertiseReport = shouldUpdateExpertise
      ? await this.resolveOwnedExpertiseReport(
          userId,
          existingListing.garageVehicleId,
          dto.obdExpertiseReportId,
        )
      : undefined;
    const nextContactPhone =
      dto.contactPhone !== undefined
        ? trimNullable(dto.contactPhone)
        : existingListing.contactPhone ?? seller.phone ?? null;
    const nextShowPhone = dto.showPhone ?? existingListing.showPhone;
    const assetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      dto.media?.map((item) => item.mediaAssetId ?? '').filter(Boolean) ?? [],
      [MediaAssetPurpose.LISTING_MEDIA],
    );

    if (nextShowPhone && !nextContactPhone) {
      throw new BadRequestException('Telefon gosterilecekse iletisim telefonu girilmelidir.');
    }

    const updatedListing = await this.prisma.$transaction(async (tx) => {
      if (dto.media) {
        await tx.listingMedia.deleteMany({
          where: {
            listingId,
          },
        });
      }

      if (dto.damageParts) {
        await tx.listingDamagePart.deleteMany({
          where: {
            listingId,
          },
        });
      }

      return tx.listing.update({
        where: {
          id: listingId,
        },
        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
          currency: dto.currency?.trim().toUpperCase(),
          city: dto.city ? toTitleCase(dto.city) : undefined,
          district: dto.district !== undefined ? trimNullable(dto.district) : undefined,
          tradeAvailable: dto.tradeAvailable,
          contactPhone: nextContactPhone,
          showPhone: nextShowPhone,
          obdExpertiseReportId:
            shouldUpdateExpertise ? expertiseReport?.id ?? null : undefined,
          hasExpertiseReport:
            shouldUpdateExpertise ? Boolean(expertiseReport) : undefined,
          media: dto.media
            ? {
                create: dto.media.map((item, index) => {
                  const asset = item.mediaAssetId ? assetMap.get(item.mediaAssetId) : null;
                  const url = asset?.url ?? item.url.trim();

                  return {
                    url,
                    mediaAssetId: asset?.id ?? null,
                    mediaType: inferMediaType(url),
                    sortOrder: index,
                  };
                }),
              }
            : undefined,
          damageParts: dto.damageParts
            ? {
                create: dto.damageParts.map((item) => ({
                  partName: item.partName,
                  damageStatus: item.damageStatus,
                })),
              }
            : undefined,
        },
        select: {
          id: true,
          listingNo: true,
          listingStatus: true,
        },
      });
    });

    return {
      success: true,
      listingId: updatedListing.id,
      listingNo: updatedListing.listingNo,
      listingStatus: updatedListing.listingStatus,
    };
  }

  async deleteListing(userId: string, listingId: string) {
    const listing = await this.findOwnedListing(userId, listingId);

    if (listing.listingStatus === ListingStatus.SOLD) {
      return {
        success: true,
        listingId: listing.id,
        listingNo: listing.listingNo,
        listingStatus: ListingStatus.SOLD,
      };
    }

    const archived = await this.prisma.listing.update({
      where: {
        id: listingId,
      },
      data: {
        listingStatus: ListingStatus.ARCHIVED,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        listingNo: true,
        listingStatus: true,
      },
    });

    return {
      success: true,
      listingId: archived.id,
      listingNo: archived.listingNo,
      listingStatus: archived.listingStatus,
    };
  }

  private async getActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        userType: true,
        firstName: true,
        lastName: true,
        phone: true,
        tcIdentityNo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    return user;
  }

  private async getOwnedGarageVehicle(userId: string, garageVehicleId: string) {
    const garageVehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: garageVehicleId,
        ownerId: userId,
        deletedAt: null,
      },
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
        obdExpertiseReports: {
          orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: {
            summaryText: true,
          },
        },
      },
    });

    if (!garageVehicle) {
      throw new ForbiddenException('Sadece kendi garajinizdaki araci ilana cikarabilirsiniz.');
    }

    return garageVehicle;
  }

  private async resolveOwnedExpertiseReport(
    userId: string,
    garageVehicleId: string | null,
    reportId?: string | null,
  ) {
    const normalizedReportId = trimNullable(reportId);

    if (!normalizedReportId) {
      return null;
    }

    if (!garageVehicleId) {
      throw new BadRequestException(
        'Secilen ilan icin once garaj araci baglanmali, sonra Carloi expertiz eklenebilir.',
      );
    }

    const expertiseReport = await this.prisma.obdExpertiseReport.findFirst({
      where: {
        id: normalizedReportId,
        garageVehicleId,
        reportStatus: ObdReportStatus.COMPLETED,
        garageVehicle: {
          ownerId: userId,
          deletedAt: null,
        },
      },
    });

    if (!expertiseReport) {
      throw new BadRequestException(
        'Secilen Carloi expertiz raporu bulunamadi. Once garajdan expertiz olusturmalisiniz.',
      );
    }

    return expertiseReport;
  }

  private async generateUniqueListingNo() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const listingNo = buildListingNo();
      const existingListing = await this.prisma.listing.findUnique({
        where: {
          listingNo,
        },
        select: {
          id: true,
        },
      });

      if (!existingListing) {
        return listingNo;
      }
    }

    throw new BadRequestException('Ilan numarasi olusturulamadi, lutfen tekrar deneyin.');
  }

  private async persistComplianceLogs(
    userId: string,
    listingId: string | null,
    complianceLogs: ComplianceLogPayload[],
  ) {
    for (const complianceLog of complianceLogs) {
      await this.legalComplianceService.createLegalComplianceCheckLog({
        userId,
        listingId,
        checkType: complianceLog.checkType,
        status: complianceLog.status,
        resultJson: complianceLog.resultJson,
      });
    }
  }

  private async resolvePriorityCity(
    userId: string,
    query: ListingsFeedQueryDto,
  ): Promise<string | null> {
    const explicitCities = this.mergeStringFilters(query.cities, query.city);

    if (explicitCities.length === 1) {
      return explicitCities[0] ?? null;
    }

    if (explicitCities.length > 1) {
      return null;
    }

    const profile = await this.prisma.profile.findUnique({
      where: {
        userId,
      },
      select: {
        locationText: true,
      },
    });

    const locationText = trimNullable(profile?.locationText);

    if (!locationText) {
      return null;
    }

    return trimNullable(locationText.split(/[\/,\-]/)[0]) ?? null;
  }

  private async getFeedCandidates(
    query: ListingsFeedQueryDto,
    priorityCity: string | null,
    limit: number,
    offset: number,
  ) {
    const filterQuery = this.buildFeedFilterQuery(query, priorityCity);

    return this.prisma.$queryRaw<ListingFeedCandidate[]>(Prisma.sql`
      SELECT l.id
      ${filterQuery.fromSql}
      WHERE ${Prisma.join(filterQuery.filters, ' AND ')}
      ORDER BY ${filterQuery.orderBySql}
      OFFSET ${offset}
      LIMIT ${limit + 1}
    `);
  }

  private buildFeedFilterQuery(query: ListingsFeedQueryDto, priorityCity: string | null) {
    const cityPrioritySql = priorityCity
      ? Prisma.sql`CASE WHEN ${this.normalizedTextSql('l.city')} = ${this.normalizeFilterText(priorityCity)} THEN 1 ELSE 0 END`
      : Prisma.sql`0`;
    const fromSql = Prisma.sql`
      FROM "Listing" l
      LEFT JOIN "User" u
        ON u.id = l."sellerId"
      LEFT JOIN "Profile" p
        ON p."userId" = u.id
      LEFT JOIN "GarageVehicle" gv
        ON gv.id = l."garageVehicleId"
      LEFT JOIN "VehiclePackage" vp
        ON vp.id = gv."vehiclePackageId"
      LEFT JOIN "VehicleModel" vm
        ON vm.id = vp."modelId"
      LEFT JOIN "VehicleBrand" vb
        ON vb.id = vm."brandId"
      LEFT JOIN LATERAL (
        SELECT *
        FROM "VehicleSpec" vs
        WHERE vs."packageId" = vp.id
          AND vs."isActive" = true
        ORDER BY vs."manualReviewNeeded" ASC, vs."year" DESC, vs."enginePowerHp" DESC
        LIMIT 1
      ) vs ON true
    `;
    const filters: Prisma.Sql[] = [
      Prisma.sql`l."deletedAt" IS NULL`,
      Prisma.sql`l."listingStatus" = 'ACTIVE'`,
    ];
    const mergedCities = this.mergeStringFilters(query.cities, query.city);
    const mergedDistricts = this.mergeStringFilters(query.districts, query.district);
    const sellerTypes = this.mergeEnumFilters(query.sellerTypes, query.sellerType);
    const fuelTypes = this.mergeEnumFilters(query.fuelTypes, query.fuelType);
    const transmissionTypes = this.mergeEnumFilters(query.transmissionTypes, query.transmissionType);
    const bodyTypes = this.mergeStringFilters(query.bodyTypes, query.bodyType);
    const minYear = query.minYear ?? query.yearMin;
    const maxYear = query.maxYear ?? query.yearMax;

    if (query.q) {
      const searchTerm = `%${this.normalizeFilterText(query.q)}%`;
      filters.push(
        Prisma.sql`(
          ${this.normalizedTextSql('l.title')} LIKE ${searchTerm}
          OR ${this.normalizedTextSql('l.description')} LIKE ${searchTerm}
          OR ${this.normalizedTextSql('l."listingNo"')} LIKE ${searchTerm}
          OR ${this.normalizedTextSql('COALESCE(vb.name, gv."brandText", \'\')')} LIKE ${searchTerm}
          OR ${this.normalizedTextSql('COALESCE(vm.name, gv."modelText", \'\')')} LIKE ${searchTerm}
          OR ${this.normalizedTextSql('COALESCE(vp.name, gv."packageText", \'\')')} LIKE ${searchTerm}
        )`,
      );
    }

    if (mergedCities.length > 0) {
      filters.push(this.buildNormalizedAnyFilter('l.city', mergedCities));
    }

    if (mergedDistricts.length > 0) {
      filters.push(this.buildNormalizedAnyFilter('l.district', mergedDistricts));
    }

    if (query.vehicleType) {
      filters.push(
        Prisma.sql`COALESCE(vm."catalogType", vb.type) = ${this.mapVehicleTypeQuery(query.vehicleType)}::"VehicleCatalogType"`,
      );
    }

    if (query.brandId) {
      filters.push(Prisma.sql`vb.id = ${query.brandId}`);
    }

    if (query.modelId) {
      filters.push(Prisma.sql`vm.id = ${query.modelId}`);
    }

    if (query.packageId) {
      filters.push(Prisma.sql`vp.id = ${query.packageId}`);
    }

    if (query.minPrice !== undefined) {
      filters.push(Prisma.sql`l.price >= ${query.minPrice}`);
    }

    if (query.maxPrice !== undefined) {
      filters.push(Prisma.sql`l.price <= ${query.maxPrice}`);
    }

    if (minYear !== undefined) {
      filters.push(Prisma.sql`gv.year >= ${minYear}`);
    }

    if (maxYear !== undefined) {
      filters.push(Prisma.sql`gv.year <= ${maxYear}`);
    }

    if (query.minKm !== undefined) {
      filters.push(Prisma.sql`gv.km >= ${query.minKm}`);
    }

    if (query.maxKm !== undefined) {
      filters.push(Prisma.sql`gv.km <= ${query.maxKm}`);
    }

    if (fuelTypes.length > 0) {
      filters.push(
        this.buildEnumAnyFilter(
          Prisma.sql`COALESCE(vs."fuelType", gv."fuelType")`,
          fuelTypes,
        ),
      );
    }

    if (transmissionTypes.length > 0) {
      filters.push(
        this.buildEnumAnyFilter(
          Prisma.sql`COALESCE(vs."transmissionType", gv."transmissionType")`,
          transmissionTypes,
        ),
      );
    }

    if (bodyTypes.length > 0) {
      filters.push(
        this.buildNormalizedAnyFilter(
          'COALESCE(vs."bodyType", vm."bodyType", \'\')',
          bodyTypes,
        ),
      );
    }

    if (query.colors?.length) {
      filters.push(this.buildNormalizedAnyFilter('gv.color', query.colors));
    }

    if (sellerTypes.length > 0) {
      filters.push(this.buildEnumAnyFilter(Prisma.sql`l."sellerType"`, sellerTypes));
    }

    if (query.onlyVerifiedSeller) {
      filters.push(
        Prisma.sql`(
          COALESCE(p."blueVerified", false) = true
          OR COALESCE(p."goldVerified", false) = true
          OR COALESCE(u."isVerified", false) = true
          OR COALESCE(u."isCommercialApproved", false) = true
        )`,
      );
    }

    if (query.noPaint) {
      filters.push(
        Prisma.sql`NOT EXISTS (
          SELECT 1
          FROM "ListingDamagePart" ldp
          WHERE ldp."listingId" = l.id
            AND ldp."damageStatus" = 'PAINTED'
        )`,
      );
    }

    if (query.noChangedParts) {
      filters.push(
        Prisma.sql`NOT EXISTS (
          SELECT 1
          FROM "ListingDamagePart" ldp
          WHERE ldp."listingId" = l.id
            AND ldp."damageStatus" = 'REPLACED'
        )`,
      );
    }

    if (query.noHeavyDamage) {
      const heavyDamageTerms = ['agir hasar', 'pert', 'tramer', 'agir hasar kayitli'];
      filters.push(this.buildNegativeContainsFilter(['l.title', 'l.description'], heavyDamageTerms));
    }

    if (query.tradeAvailable) {
      filters.push(Prisma.sql`l."tradeAvailable" = true`);
    }

    if (query.guaranteed) {
      filters.push(this.buildPositiveContainsFilter(['l.description', 'gv."equipmentNotes"'], ['garanti']));
    }

    return {
      filters,
      fromSql,
      orderBySql: this.buildFeedOrderBy(query.sort, cityPrioritySql),
    };
  }

  private async getFeedListings(userId: string, listingIds: string[]) {
    if (listingIds.length === 0) {
      return [];
    }

    return this.prisma.listing.findMany({
      where: {
        id: {
          in: listingIds,
        },
      },
      include: {
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
          include: {
            mediaAsset: {
              select: {
                id: true,
                url: true,
                storageKey: true,
                visibility: true,
              },
            },
          },
        },
        savedItems: {
          where: {
            userId,
          },
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
        seller: {
          select: {
            isVerified: true,
            isCommercialApproved: true,
            profile: {
              select: {
                blueVerified: true,
                goldVerified: true,
              },
            },
          },
        },
      },
    });
  }

  private serializeFeedItem(
    listing: Awaited<ReturnType<typeof this.getFeedListings>>[number],
  ) {
    const garageVehicle = listing.garageVehicle;
    const spec = garageVehicle?.vehiclePackage?.specs?.[0] ?? null;
    const firstMediaUrl = this.normalizeMediaUrl(listing.media[0]?.url, listing.media[0]?.mediaAsset);
    const isVerifiedSeller =
      Boolean(listing.seller.profile?.blueVerified) ||
      Boolean(listing.seller.profile?.goldVerified) ||
      Boolean(listing.seller.isVerified) ||
      Boolean(listing.seller.isCommercialApproved);

    if (shouldLogMediaDebug()) {
      console.info('[listings.feed] media', {
        listingId: listing.id,
        firstMediaUrl,
      });
    }

    return {
      listingId: listing.id,
      listingNo: listing.listingNo,
      firstMediaUrl,
      title: listing.title,
      brand: garageVehicle?.vehiclePackage?.model.brand.name ?? garageVehicle?.brandText ?? null,
      model: garageVehicle?.vehiclePackage?.model.name ?? garageVehicle?.modelText ?? null,
      package: garageVehicle?.vehiclePackage?.name ?? garageVehicle?.packageText ?? null,
      city: listing.city,
      district: listing.district ?? null,
      price: Number(listing.price),
      year: garageVehicle?.year ?? null,
      km: garageVehicle?.km ?? null,
      fuelType: (spec?.fuelType as FuelType | null) ?? garageVehicle?.fuelType ?? null,
      transmissionType:
        (spec?.transmissionType as TransmissionType | null) ?? garageVehicle?.transmissionType ?? null,
      bodyType: spec?.bodyType ?? null,
      color: garageVehicle?.color ?? null,
      sellerType: listing.sellerType,
      tradeAvailable: listing.tradeAvailable,
      isVerifiedSeller,
      isSaved: Boolean(listing.savedItems.length),
    };
  }

  private serializeListingDetail(
    userId: string,
    listing: Awaited<ReturnType<typeof this.prisma.listing.findUnique>> & NonNullable<unknown>,
  ) {
    const obdEnabled = isObdEnabled();
    const typedListing = listing as NonNullable<typeof listing> & {
      seller: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
        profile: {
          avatarUrl: string | null;
          blueVerified: boolean;
          goldVerified: boolean;
        } | null;
      };
      media: Array<{
        id: string;
        url: string;
        mediaType: 'IMAGE' | 'VIDEO';
        sortOrder: number;
        mediaAsset?: MediaAssetReference | null;
      }>;
      damageParts: Array<{ partName: string; damageStatus: string }>;
      savedItems: Array<{ id: string }>;
      obdExpertiseReport: {
        id: string;
        reportStatus: ObdReportStatus;
        overallScore: number | null;
        summaryText: string | null;
        criticalIssues: Prisma.JsonValue | null;
        warnings: Prisma.JsonValue | null;
        normalFindings: Prisma.JsonValue | null;
        rawMetricsSummary: Prisma.JsonValue | null;
        durationSeconds: number | null;
        reportedAt: Date | null;
        createdAt: Date;
        faultCodes: Array<{
          faultCode: string;
          description: string | null;
          severity: string;
        }>;
      } | null;
      garageVehicle: {
        id: string;
        brandText: string;
        modelText: string;
        packageText: string | null;
        year: number;
        fuelType: string;
        transmissionType: string;
        km: number;
        color: string | null;
        vehiclePackage: {
          name: string;
          model: {
            name: string;
            brand: {
              name: string;
            };
          };
          specs: Array<{
            year: number | null;
            bodyType: string | null;
            enginePower: number | null;
            engineVolume: number | null;
            enginePowerHp: number | null;
            engineVolumeCc: number | null;
            tractionType: string | null;
            fuelType: string | null;
            transmissionType: string | null;
            equipmentSummary: string | null;
            multimediaSummary: string | null;
            interiorSummary: string | null;
            exteriorSummary: string | null;
          }>;
        } | null;
        obdExpertiseReports: Array<{
          id: string;
          reportStatus: ObdReportStatus;
          overallScore: number | null;
          summaryText: string | null;
          criticalIssues: Prisma.JsonValue | null;
          warnings: Prisma.JsonValue | null;
          normalFindings: Prisma.JsonValue | null;
          rawMetricsSummary: Prisma.JsonValue | null;
          durationSeconds: number | null;
          reportedAt: Date | null;
          createdAt: Date;
          faultCodes: Array<{
            faultCode: string;
            description: string | null;
            severity: string;
          }>;
        }>;
      } | null;
    };
    const spec = typedListing.garageVehicle?.vehiclePackage?.specs?.[0] ?? null;
    const selectedExpertiseReport = obdEnabled
      ? typedListing.obdExpertiseReport ?? typedListing.garageVehicle?.obdExpertiseReports[0] ?? null
      : null;
    const media = typedListing.media.map((mediaItem) => ({
      id: mediaItem.id,
      url: this.normalizeMediaUrl(mediaItem.url, mediaItem.mediaAsset),
      mediaType: mediaItem.mediaType,
      sortOrder: mediaItem.sortOrder,
    }));

    if (shouldLogMediaDebug()) {
      console.info('[listings.detail] media', {
        listingId: typedListing.id,
        media,
      });
    }

    return {
      id: typedListing.id,
      listingNo: typedListing.listingNo,
      title: typedListing.title,
      description: typedListing.description,
      listingStatus: typedListing.listingStatus,
      price: Number(typedListing.price),
      currency: typedListing.currency,
      city: typedListing.city,
      district: typedListing.district ?? null,
      createdAt: typedListing.createdAt.toISOString(),
      tradeAvailable: typedListing.tradeAvailable,
      sellerType: typedListing.sellerType,
      plateMasked: typedListing.plateNumber ?? null,
      contactPhone: typedListing.showPhone ? typedListing.contactPhone ?? null : null,
      showPhone: typedListing.showPhone,
      isSaved: Boolean(typedListing.savedItems.length),
      owner: {
        id: typedListing.seller.id,
        username: typedListing.seller.username,
        fullName: `${typedListing.seller.firstName} ${typedListing.seller.lastName}`,
        avatarUrl: typedListing.seller.profile?.avatarUrl ?? null,
        blueVerified: typedListing.seller.profile?.blueVerified ?? false,
        goldVerified: typedListing.seller.profile?.goldVerified ?? false,
      },
      media,
      vehicle: {
        garageVehicleId: typedListing.garageVehicle?.id ?? null,
        brand:
          typedListing.garageVehicle?.vehiclePackage?.model.brand.name ??
          typedListing.garageVehicle?.brandText ??
          null,
        model:
          typedListing.garageVehicle?.vehiclePackage?.model.name ??
          typedListing.garageVehicle?.modelText ??
          null,
        package:
          typedListing.garageVehicle?.vehiclePackage?.name ??
          typedListing.garageVehicle?.packageText ??
          null,
        year: typedListing.garageVehicle?.year ?? null,
        fuelType:
          (spec?.fuelType as string | null) ?? typedListing.garageVehicle?.fuelType ?? null,
        transmissionType:
          (spec?.transmissionType as string | null) ??
          typedListing.garageVehicle?.transmissionType ??
          null,
        km: typedListing.garageVehicle?.km ?? null,
        bodyType: spec?.bodyType ?? null,
        enginePower: spec?.enginePower ?? spec?.enginePowerHp ?? null,
        engineVolume: spec?.engineVolume ?? spec?.engineVolumeCc ?? null,
        enginePowerHp: spec?.enginePowerHp ?? null,
        engineVolumeCc: spec?.engineVolumeCc ?? null,
        tractionType: spec?.tractionType ?? null,
        color: typedListing.garageVehicle?.color ?? null,
        guarantee: null,
      },
      damageParts: typedListing.damageParts.map((damagePart) => ({
        partName: damagePart.partName,
        damageStatus: damagePart.damageStatus,
      })),
      equipmentSummary: spec?.equipmentSummary ?? null,
      multimediaSummary: spec?.multimediaSummary ?? null,
      interiorSummary: spec?.interiorSummary ?? null,
      exteriorSummary: spec?.exteriorSummary ?? null,
      expertiseSummary: obdEnabled ? selectedExpertiseReport?.summaryText ?? null : null,
      expertiseReport: obdEnabled ? serializeObdReport(selectedExpertiseReport) : null,
      contactActions: {
        canCall:
          typedListing.sellerId !== userId && typedListing.showPhone && Boolean(typedListing.contactPhone),
        canMessage: typedListing.sellerId !== userId,
        canSave: typedListing.sellerId !== userId,
      },
    };
  }

  private mergeStringFilters(arrayValue?: string[], singleValue?: string) {
    return [...(arrayValue ?? []), ...(singleValue ? [singleValue] : [])]
      .map((value) => trimNullable(value))
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index);
  }

  private mergeEnumFilters<T extends string>(arrayValue?: T[], singleValue?: T) {
    return [...(arrayValue ?? []), ...(singleValue ? [singleValue] : [])].filter(
      (value, index, values) => values.indexOf(value) === index,
    );
  }

  private normalizeFilterText(value: string) {
    return value
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[ıİI]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's')
      .replace(/[üÜ]/g, 'u');
  }

  private normalizedTextSql(expression: string) {
    return Prisma.sql`LOWER(translate(COALESCE(${Prisma.raw(expression)}, ''), 'ÇĞİIÖŞÜçğıiöşü', 'CGIIOSUcgiiosu'))`;
  }

  private buildNormalizedAnyFilter(expression: string, values: string[]) {
    const normalizedValues = values
      .map((value) => this.normalizeFilterText(value))
      .filter(Boolean)
      .filter((value, index, items) => items.indexOf(value) === index);

    return Prisma.sql`(${Prisma.join(
      normalizedValues.map(
        (value) => Prisma.sql`${this.normalizedTextSql(expression)} = ${value}`,
      ),
      ' OR ',
    )})`;
  }

  private buildEnumAnyFilter(expression: Prisma.Sql, values: string[]) {
    return Prisma.sql`(${Prisma.join(
      values.map((value) => Prisma.sql`${expression} = ${value}`),
      ' OR ',
    )})`;
  }

  private buildNegativeContainsFilter(expressions: string[], values: string[]) {
    const patterns = values.map((value) => `%${this.normalizeFilterText(value)}%`);
    const comparisons = expressions.flatMap((expression) =>
      patterns.map((pattern) => Prisma.sql`${this.normalizedTextSql(expression)} LIKE ${pattern}`),
    );

    return Prisma.sql`NOT (${Prisma.join(comparisons, ' OR ')})`;
  }

  private buildPositiveContainsFilter(expressions: string[], values: string[]) {
    const patterns = values.map((value) => `%${this.normalizeFilterText(value)}%`);
    const comparisons = expressions.flatMap((expression) =>
      patterns.map((pattern) => Prisma.sql`${this.normalizedTextSql(expression)} LIKE ${pattern}`),
    );

    return Prisma.sql`(${Prisma.join(comparisons, ' OR ')})`;
  }

  private buildFeedOrderBy(sort: ListingSortQuery | undefined, cityPrioritySql: Prisma.Sql) {
    switch (sort) {
      case 'PRICE_ASC':
        return Prisma.sql`l.price ASC NULLS LAST, l."createdAt" DESC, l.id DESC`;
      case 'PRICE_DESC':
        return Prisma.sql`l.price DESC NULLS LAST, l."createdAt" DESC, l.id DESC`;
      case 'KM_ASC':
        return Prisma.sql`gv.km ASC NULLS LAST, l."createdAt" DESC, l.id DESC`;
      case 'YEAR_DESC':
        return Prisma.sql`gv.year DESC NULLS LAST, l."createdAt" DESC, l.id DESC`;
      case 'NEWEST':
        return Prisma.sql`l."createdAt" DESC, l.id DESC`;
      default:
        return Prisma.sql`${cityPrioritySql} DESC, l."createdAt" DESC, l.id DESC`;
    }
  }

  private mapVehicleTypeQuery(value: ListingVehicleTypeQuery) {
    switch (value) {
      case 'CAR':
        return VehicleCatalogType.AUTOMOBILE;
      case 'MOTORCYCLE':
        return VehicleCatalogType.MOTORCYCLE;
      case 'COMMERCIAL':
        return VehicleCatalogType.COMMERCIAL;
      default:
        return VehicleCatalogType.AUTOMOBILE;
    }
  }

  private normalizeMediaUrl(
    value: string | null | undefined,
    mediaAsset?: MediaAssetReference | null,
  ) {
    return (
      normalizePersistedMediaUrl(value, {
        mediaAsset: mediaAsset ?? null,
      }) ?? value ?? null
    );
  }

  private async getListingForPublicInteraction(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      select: {
        id: true,
        sellerId: true,
        listingStatus: true,
        deletedAt: true,
      },
    });

    if (!listing || listing.deletedAt || listing.listingStatus !== ListingStatus.ACTIVE) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    if (listing.sellerId === userId) {
      return listing;
    }

    return listing;
  }

  private async findOwnedListing(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: listingId,
        sellerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        listingNo: true,
        listingStatus: true,
        garageVehicleId: true,
        contactPhone: true,
        showPhone: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    return listing;
  }

  private encodeFeedCursor(cursor: number) {
    return Buffer.from(String(cursor), 'utf8').toString('base64url');
  }

  private decodeFeedCursor(cursor?: string | null) {
    if (!cursor) {
      return 0;
    }

    try {
      const parsed = Number(Buffer.from(cursor, 'base64url').toString('utf8'));

      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('Invalid cursor');
      }

      return parsed;
    } catch {
      throw new BadRequestException('Ilan cursor bilgisi gecersiz.');
    }
  }
}


