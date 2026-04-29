import { MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreatePostMediaDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  mediaAssetId?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationText?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media!: CreatePostMediaDto[];
}

