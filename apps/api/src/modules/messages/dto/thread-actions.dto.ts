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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ValidateIf((value: SendMessageDto) => value.messageType === MessageType.TEXT)
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsEnum(MessageType)
  messageType!: MessageType;

  @ValidateIf((value: SendMessageDto) => value.messageType !== MessageType.TEXT)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl({ require_tld: false }, { each: true })
  attachmentUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachmentAssetIds?: string[];
}

export class CreateDirectThreadDto {
  @IsString()
  targetUserId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SendMessageDto)
  initialMessage?: SendMessageDto;
}

export class CreateGroupThreadDto {
  @IsString()
  @MaxLength(80)
  groupName!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(24)
  @IsString({ each: true })
  participantIds!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SendMessageDto)
  initialMessage?: SendMessageDto;
}

