import { ObdAdapterType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConnectObdDeviceDto {
  @IsEnum(ObdAdapterType)
  adapterType!: ObdAdapterType;

  @IsString()
  @MaxLength(120)
  deviceName!: string;

  @IsString()
  @MaxLength(120)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;
}
