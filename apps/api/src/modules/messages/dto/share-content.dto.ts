import { IsArray, ArrayMaxSize, ArrayMinSize, IsEnum, IsString } from 'class-validator';
import { SharedContentType } from '@prisma/client';

export class ShareContentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  targetUserIds!: string[];

  @IsEnum(SharedContentType)
  contentType!: SharedContentType;

  @IsString()
  contentId!: string;
}
