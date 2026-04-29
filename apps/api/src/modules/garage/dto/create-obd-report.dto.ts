import { ObdFaultSeverity } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ObdMetricSnapshotDto {
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rpm!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  speed!: number;

  @Type(() => Number)
  @IsInt()
  @Min(-40)
  @Max(200)
  coolantTemp!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  engineLoad!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  fuelLevel!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(30)
  batteryVoltage!: number;

  @Type(() => Number)
  @IsInt()
  @Min(-40)
  @Max(120)
  intakeAirTemp!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  throttlePosition!: number;
}

export class ObdFaultCodeDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsEnum(ObdFaultSeverity)
  severity!: ObdFaultSeverity;
}

export class CreateObdReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  durationSeconds!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => ObdMetricSnapshotDto)
  snapshots!: ObdMetricSnapshotDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ObdFaultCodeDto)
  faultCodes?: ObdFaultCodeDto[];
}
