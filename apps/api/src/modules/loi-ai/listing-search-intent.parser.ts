import { Injectable } from '@nestjs/common';
import { FuelType, SellerType, TransmissionType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeLoiAiText } from './loi-ai-routing';

export type ListingSearchIntent = {
  listingNo: string | null;
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  packageId?: string;
  packageName?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  sellerType?: SellerType;
  minKm?: number;
  maxKm?: number;
  fuelType?: FuelType;
  transmissionType?: TransmissionType;
  bodyType?: string;
  yearMin?: number;
  yearMax?: number;
  requirePaintFree: boolean;
  requireReplacementFree: boolean;
  hasAnyFilter: boolean;
};

@Injectable()
export class ListingSearchIntentParser {
  constructor(private readonly prisma: PrismaService) {}

  async parse(content: string): Promise<ListingSearchIntent> {
    const normalized = normalizeLoiAiText(content);
    const [catalogMatches, city] = await Promise.all([
      this.resolveCatalogMatch(normalized),
      this.resolveCityMatch(normalized),
    ]);
    const amountValues = this.extractMoneyValues(normalized);
    const listingNoMatch = content.match(/CLV4-[A-Z0-9-]+/i)?.[0] ?? null;
    const kmValues = this.extractKmValues(normalized);
    const yearValues = this.extractYearValues(normalized);

    const intent: ListingSearchIntent = {
      listingNo: listingNoMatch?.toUpperCase() ?? null,
      brandId: catalogMatches.brand?.id,
      brandName: catalogMatches.brand?.name,
      modelId: catalogMatches.model?.id,
      modelName: catalogMatches.model?.name,
      packageId: catalogMatches.package?.id,
      packageName: catalogMatches.package?.name,
      city,
      sellerType:
        normalized.includes('galeriden') || normalized.includes('dealer')
          ? SellerType.DEALER
          : normalized.includes('sahibinden')
            ? SellerType.OWNER
            : undefined,
      fuelType: this.resolveFuelType(normalized),
      transmissionType: this.resolveTransmissionType(normalized),
      bodyType: this.resolveBodyType(normalized),
      requirePaintFree: normalized.includes('boyasiz') || normalized.includes('boyasız'),
      requireReplacementFree:
        normalized.includes('degisensiz') || normalized.includes('değişensiz'),
      hasAnyFilter: false,
    };

    const firstAmount = amountValues[0];
    const secondAmount = amountValues[1];
    const firstKm = kmValues[0];
    const secondKm = kmValues[1];
    const firstYear = yearValues[0];
    const secondYear = yearValues[1];

    if (
      normalized.includes('kadar') ||
      normalized.includes('alti') ||
      normalized.includes('butce') ||
      normalized.includes('butece') ||
      normalized.includes('istiyorum')
    ) {
      if (firstAmount !== undefined) {
        intent.maxPrice = firstAmount;
      }
    } else if (firstAmount !== undefined && secondAmount !== undefined) {
      intent.minPrice = Math.min(firstAmount, secondAmount);
      intent.maxPrice = Math.max(firstAmount, secondAmount);
    } else if (firstAmount !== undefined) {
      intent.maxPrice = firstAmount;
    }

    if (firstKm !== undefined && secondKm !== undefined) {
      intent.minKm = Math.min(firstKm, secondKm);
      intent.maxKm = Math.max(firstKm, secondKm);
    } else if (firstKm !== undefined) {
      intent.maxKm = firstKm;
    }

    if (firstYear !== undefined && secondYear !== undefined) {
      intent.yearMin = Math.min(firstYear, secondYear);
      intent.yearMax = Math.max(firstYear, secondYear);
    } else if (firstYear !== undefined) {
      intent.yearMin = firstYear;
    }

    intent.hasAnyFilter = Boolean(
      intent.listingNo ||
        intent.brandId ||
        intent.modelId ||
        intent.packageId ||
        intent.minPrice ||
        intent.maxPrice ||
        intent.city ||
        intent.sellerType ||
        intent.minKm ||
        intent.maxKm ||
        intent.fuelType ||
        intent.transmissionType ||
        intent.bodyType ||
        intent.yearMin ||
        intent.yearMax ||
        intent.requirePaintFree ||
        intent.requireReplacementFree,
    );

    return intent;
  }

  private async resolveCatalogMatch(normalized: string) {
    const brands = await this.prisma.vehicleBrand.findMany({
      include: {
        models: {
          include: {
            packages: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    let matchedBrand: (typeof brands)[number] | undefined;
    let matchedModel: (typeof brands)[number]['models'][number] | undefined;
    let matchedPackage: (typeof brands)[number]['models'][number]['packages'][number] | undefined;

    for (const brand of brands) {
      if (!normalized.includes(normalizeLoiAiText(brand.name))) {
        continue;
      }

      matchedBrand = brand;

      for (const model of brand.models) {
        if (!normalized.includes(normalizeLoiAiText(model.name))) {
          continue;
        }

        matchedModel = model;

        for (const vehiclePackage of model.packages) {
          if (normalized.includes(normalizeLoiAiText(vehiclePackage.name))) {
            matchedPackage = vehiclePackage;
            break;
          }
        }

        break;
      }

      break;
    }

    return {
      brand: matchedBrand,
      model: matchedModel,
      package: matchedPackage,
    };
  }

  private async resolveCityMatch(normalized: string) {
    const cities = await this.prisma.listing.findMany({
      distinct: ['city'],
      select: {
        city: true,
      },
      where: {
        deletedAt: null,
      },
    });

    return cities.find((item) => normalized.includes(normalizeLoiAiText(item.city)))?.city;
  }

  private extractMoneyValues(normalized: string) {
    const matches = [...normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(milyon|m|bin|k|tl)?/g)];
    const values: number[] = [];

    for (const match of matches) {
      const rawNumber = match[1];
      const unit = match[2] ?? '';

      if (!rawNumber) {
        continue;
      }

      const parsed = Number(rawNumber.replace(',', '.'));
      if (!Number.isFinite(parsed)) {
        continue;
      }

      if (unit === 'milyon' || unit === 'm') {
        values.push(Math.round(parsed * 1_000_000));
      } else if (unit === 'bin' || unit === 'k') {
        values.push(Math.round(parsed * 1_000));
      } else if (parsed >= 10_000) {
        values.push(Math.round(parsed));
      }
    }

    return values.slice(0, 2);
  }

  private extractKmValues(normalized: string) {
    const matches = [...normalized.matchAll(/(\d{2,3}(?:[.,]\d+)?)\s*(bin)?\s*km/g)];

    return matches
      .map((match) => {
        const value = Number((match[1] ?? '').replace(',', '.'));
        if (!Number.isFinite(value)) {
          return null;
        }
        return match[2] ? Math.round(value * 1_000) : Math.round(value);
      })
      .filter((value): value is number => value !== null)
      .slice(0, 2);
  }

  private extractYearValues(normalized: string) {
    return [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isInteger(value))
      .slice(0, 2);
  }

  private resolveFuelType(normalized: string) {
    if (normalized.includes('dizel')) return FuelType.DIESEL;
    if (normalized.includes('hibrit') || normalized.includes('hybrid')) return FuelType.HYBRID;
    if (normalized.includes('elektrik')) return FuelType.ELECTRIC;
    if (normalized.includes('lpg')) return FuelType.LPG;
    if (normalized.includes('benzin')) return FuelType.GASOLINE;
    return undefined;
  }

  private resolveTransmissionType(normalized: string) {
    if (normalized.includes('yari otomatik') || normalized.includes('yarı otomatik')) {
      return TransmissionType.SEMI_AUTOMATIC;
    }
    if (normalized.includes('cvt')) return TransmissionType.CVT;
    if (normalized.includes('otomatik')) return TransmissionType.AUTOMATIC;
    if (normalized.includes('manuel')) return TransmissionType.MANUAL;
    return undefined;
  }

  private resolveBodyType(normalized: string) {
    if (normalized.includes('suv')) return 'SUV';
    if (normalized.includes('sedan')) return 'Sedan';
    if (normalized.includes('hatchback') || normalized.includes('hb')) return 'Hatchback';
    if (normalized.includes('pickup')) return 'Pickup';
    if (normalized.includes('coupe')) return 'Coupe';
    return undefined;
  }
}
