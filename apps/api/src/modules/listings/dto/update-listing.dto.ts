import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { ListingDamagePartDto } from './create-listing.dto';

export class UpdateListingMediaDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  mediaAssetId?: string;
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  obdExpertiseReportId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsOptional()
  @IsBoolean()
  tradeAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UpdateListingMediaDto)
  media?: UpdateListingMediaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(13)
  @ValidateNested({ each: true })
  @Type(() => ListingDamagePartDto)
  damageParts?: ListingDamagePartDto[];

  @IsOptional()
  @IsString()
  @MaxLength(24)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
}

