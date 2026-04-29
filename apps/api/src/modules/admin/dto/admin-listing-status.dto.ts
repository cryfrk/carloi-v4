import { ListingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class AdminListingStatusDto {
  @IsEnum(ListingStatus)
  listingStatus!: ListingStatus;

  @ValidateIf((dto: AdminListingStatusDto) => dto.listingStatus === ListingStatus.SUSPENDED)
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
