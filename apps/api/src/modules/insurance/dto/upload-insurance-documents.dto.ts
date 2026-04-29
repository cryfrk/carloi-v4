import { IsOptional, IsUrl } from 'class-validator';
import { IsString } from 'class-validator';

export class UploadInsuranceDocumentsDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  policyDocumentUrl?: string;

  @IsOptional()
  @IsString()
  policyDocumentMediaAssetId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  invoiceDocumentUrl?: string;

  @IsOptional()
  @IsString()
  invoiceDocumentMediaAssetId?: string;
}

