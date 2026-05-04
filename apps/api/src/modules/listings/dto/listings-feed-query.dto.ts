import {
  FuelType,
  SellerType,
  TransmissionType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const PUBLIC_VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'COMMERCIAL'] as const;
const LISTING_SORT_OPTIONS = ['NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'KM_ASC', 'YEAR_DESC'] as const;

export type ListingVehicleTypeQuery = (typeof PUBLIC_VEHICLE_TYPES)[number];
export type ListingSortQuery = (typeof LISTING_SORT_OPTIONS)[number];

function toArray(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const rawItems = Array.isArray(value) ? value : [value];
  const normalized = rawItems
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

function toBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'evet'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'hayir', 'hayır'].includes(normalized)) {
    return false;
  }

  return value;
}

export class ListingsFeedQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  districts?: string[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsIn(PUBLIC_VEHICLE_TYPES)
  vehicleType?: ListingVehicleTypeQuery;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  minYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  maxYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  yearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxKm?: number;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(FuelType, { each: true })
  fuelTypes?: FuelType[];

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(TransmissionType, { each: true })
  transmissionTypes?: TransmissionType[];

  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  bodyTypes?: string[];

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(SellerType, { each: true })
  sellerTypes?: SellerType[];

  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  onlyVerifiedSeller?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  noPaint?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  noChangedParts?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  noHeavyDamage?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  tradeAvailable?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  guaranteed?: boolean;

  @IsOptional()
  @IsIn(LISTING_SORT_OPTIONS)
  sort?: ListingSortQuery;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
