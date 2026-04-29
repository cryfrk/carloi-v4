import { InsuranceOfferStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateInsuranceOfferStatusDto {
  @IsEnum(InsuranceOfferStatus)
  status!: InsuranceOfferStatus;
}
