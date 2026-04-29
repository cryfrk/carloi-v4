import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class CommercialDocumentUrlDto {
  @IsUrl({ require_tld: false })
  url!: string;
}

export class SubmitCommercialApplicationDto {
  @IsString()
  @MaxLength(160)
  companyTitle!: string;

  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  taxNumber!: string;

  @IsString()
  @Matches(/^[0-9]{11}$/)
  tcIdentityNo!: string;

  @ValidateIf((value: SubmitCommercialApplicationDto) => !value.taxDocumentMediaAssetId)
  @IsString()
  @IsUrl({ require_tld: false })
  taxDocumentUrl!: string;

  @IsOptional()
  @IsString()
  taxDocumentMediaAssetId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CommercialDocumentUrlDto)
  otherDocumentUrls?: CommercialDocumentUrlDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;
}

