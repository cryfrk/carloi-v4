import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { AttachmentType } from '@prisma/client';

export class LoiAiAttachmentDto {
  @IsEnum(AttachmentType)
  type!: AttachmentType;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  transcript?: string;
}

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

export class SendConversationMessageDto {
  @IsString()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => LoiAiAttachmentDto)
  attachments?: LoiAiAttachmentDto[];
}


