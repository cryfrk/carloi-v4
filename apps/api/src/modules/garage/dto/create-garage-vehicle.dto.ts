import { FuelType, TransmissionType, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GarageVehicleMediaDto } from './garage-media.dto';

export class CreateGarageVehicleDto {
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsString()
  vehiclePackageId?: string;

  @IsString()
  brandText!: string;

  @IsString()
  modelText!: string;

  @IsOptional()
  @IsString()
  packageText?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  year!: number;

  @IsString()
  plateNumber!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsEnum(FuelType)
  fuelType!: FuelType;

  @IsEnum(TransmissionType)
  transmissionType!: TransmissionType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  km!: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  equipmentNotes?: string;

  @IsOptional()
  @IsBoolean()
  showInExplore?: boolean;

  @IsOptional()
  @IsBoolean()
  openToOffers?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => GarageVehicleMediaDto)
  media?: GarageVehicleMediaDto[];
}
