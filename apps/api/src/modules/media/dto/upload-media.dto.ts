import { IsEnum } from 'class-validator';
import { MediaAssetPurpose } from '@prisma/client';

export class UploadMediaDto {
  @IsEnum(MediaAssetPurpose)
  purpose!: MediaAssetPurpose;
}
