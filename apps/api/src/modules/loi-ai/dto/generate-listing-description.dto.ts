import { Type } from 'class-transformer';
import { DamageStatus, FuelType, TransmissionType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ListingDescriptionToneDto {
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  SHORT = 'SHORT',
  DETAILED = 'DETAILED',
}

export class GenerateListingDescriptionDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  brandText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  modelText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  packageText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmissionType?: TransmissionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  km?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(13)
  @IsEnum(DamageStatus, { each: true })
  damageStatuses?: DamageStatus[];

  @IsOptional()
  @IsBoolean()
  hasExpertiseReport?: boolean;

  @IsOptional()
  @IsBoolean()
  tradeAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  equipmentSummary?: string;
}

export class GenerateListingDescriptionDto {
  @IsOptional()
  @IsString()
  garageVehicleId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GenerateListingDescriptionDraftDto)
  draft?: GenerateListingDescriptionDraftDto;

  @IsEnum(ListingDescriptionToneDto)
  tone!: ListingDescriptionToneDto;
}

