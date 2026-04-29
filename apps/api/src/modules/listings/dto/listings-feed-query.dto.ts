import { FuelType, SellerType, TransmissionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListingsFeedQueryDto {
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
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

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
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @IsOptional()
  @IsString()
  bodyType?: string;

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
  @Min(1)
  @Max(24)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
