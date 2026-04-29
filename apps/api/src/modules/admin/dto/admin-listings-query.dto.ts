import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListingStatus, SellerType } from '@prisma/client';

export class AdminListingsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ListingStatus)
  listingStatus?: ListingStatus;

  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  city?: string;
}
