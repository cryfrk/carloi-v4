import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const VEHICLE_CATALOG_PUBLIC_TYPES = ['CAR', 'MOTORCYCLE', 'COMMERCIAL'] as const;

export type VehicleCatalogPublicType = (typeof VEHICLE_CATALOG_PUBLIC_TYPES)[number];

export class GetVehicleCatalogBrandsQueryDto {
  @IsOptional()
  @IsIn(VEHICLE_CATALOG_PUBLIC_TYPES)
  type?: VehicleCatalogPublicType;
}

export class GetVehicleCatalogModelsQueryDto {
  @IsString()
  brandId!: string;

  @IsOptional()
  @IsIn(VEHICLE_CATALOG_PUBLIC_TYPES)
  type?: VehicleCatalogPublicType;
}

export class GetVehicleCatalogPackagesQueryDto {
  @IsString()
  modelId!: string;
}

export class GetVehicleCatalogSpecsQueryDto {
  @IsString()
  packageId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  year?: number;
}

export class GetVehicleCatalogEquipmentQueryDto {
  @IsString()
  packageId!: string;
}
