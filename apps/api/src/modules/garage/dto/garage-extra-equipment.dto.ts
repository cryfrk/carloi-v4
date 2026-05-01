import { VehicleEquipmentCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class GarageVehicleExtraEquipmentDto {
  @IsOptional()
  @IsEnum(VehicleEquipmentCategory)
  category?: VehicleEquipmentCategory;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
