import { DamageStatus, SellerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LISTING_DAMAGE_PARTS } from '../listings.utils';

export class ListingMediaDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  mediaAssetId?: string;
}

export class ListingDamagePartDto {
  @IsString()
  @IsIn([...LISTING_DAMAGE_PARTS])
  partName!: string;

  @IsEnum(DamageStatus)
  damageStatus!: DamageStatus;
}

export class ListingLicenseInfoDto {
  @IsString()
  plateNumber!: string;

  @IsString()
  ownerFirstName!: string;

  @IsString()
  ownerLastName!: string;

  @IsOptional()
  @IsString()
  ownerTcIdentityNo?: string;
}

export class CreateListingDto {
  @IsString()
  garageVehicleId!: string;

  @IsOptional()
  @IsString()
  obdExpertiseReportId?: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(600)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsString()
  @MaxLength(60)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsEnum(SellerType)
  sellerType!: SellerType;

  @IsOptional()
  @IsBoolean()
  tradeAvailable?: boolean;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ListingMediaDto)
  media!: ListingMediaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(13)
  @ValidateNested({ each: true })
  @Type(() => ListingDamagePartDto)
  damageParts?: ListingDamagePartDto[];

  @ValidateNested()
  @Type(() => ListingLicenseInfoDto)
  licenseInfo!: ListingLicenseInfoDto;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
}

