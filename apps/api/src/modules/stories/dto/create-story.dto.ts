import { Type } from 'class-transformer';
import { ContentVisibility, MediaType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateStoryMediaDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  mediaAssetId?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @ValidateIf((value: CreateStoryMediaDto) => value.mediaType === MediaType.VIDEO)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(15)
  durationSeconds?: number;
}

export class CreateStoryDto {
  @ValidateNested()
  @Type(() => CreateStoryMediaDto)
  media!: CreateStoryMediaDto;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationText?: string;

  @IsOptional()
  @IsEnum(ContentVisibility)
  visibility?: ContentVisibility;
}

