import { Controller, Get, Param, Query } from '@nestjs/common';
import { VehicleCatalogService } from './vehicle-catalog.service';
import {
  GetVehicleCatalogBrandsQueryDto,
  GetVehicleCatalogEquipmentQueryDto,
  GetVehicleCatalogModelsQueryDto,
  GetVehicleCatalogPackagesQueryDto,
  GetVehicleCatalogSpecsQueryDto,
} from './dto/vehicle-catalog-query.dto';

@Controller('vehicle-catalog')
export class VehicleCatalogController {
  constructor(private readonly vehicleCatalogService: VehicleCatalogService) {}

  @Get('types')
  getTypes() {
    return this.vehicleCatalogService.getTypes();
  }

  @Get('brands')
  getBrands(@Query() query: GetVehicleCatalogBrandsQueryDto) {
    return this.vehicleCatalogService.getBrands(query.type);
  }

  @Get('models')
  getModelsByQuery(@Query() query: GetVehicleCatalogModelsQueryDto) {
    return this.vehicleCatalogService.getModels(query.brandId, query.type);
  }

  @Get('brands/:id/models')
  getModels(@Param('id') brandId: string) {
    return this.vehicleCatalogService.getModels(brandId);
  }

  @Get('packages')
  getPackagesByQuery(@Query() query: GetVehicleCatalogPackagesQueryDto) {
    return this.vehicleCatalogService.getPackages(query.modelId);
  }

  @Get('specs')
  getPackageSpecs(@Query() query: GetVehicleCatalogSpecsQueryDto) {
    return this.vehicleCatalogService.getPackageSpecs(query.packageId, query.year);
  }

  @Get('equipment')
  getPackageEquipment(@Query() query: GetVehicleCatalogEquipmentQueryDto) {
    return this.vehicleCatalogService.getPackageEquipment(query.packageId);
  }

  @Get('models/:id/packages')
  getPackages(@Param('id') modelId: string) {
    return this.vehicleCatalogService.getPackages(modelId);
  }

  @Get('packages/:id/spec')
  getPackageSpec(@Param('id') packageId: string) {
    return this.vehicleCatalogService.getPackageSpec(packageId);
  }
}

