import { MediaType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class GarageVehicleMediaDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  mediaAssetId?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;
}

