import { Controller, Get, Param } from '@nestjs/common';
import { VehicleCatalogService } from './vehicle-catalog.service';

@Controller('vehicle-catalog')
export class VehicleCatalogController {
  constructor(private readonly vehicleCatalogService: VehicleCatalogService) {}

  @Get('brands')
  getBrands() {
    return this.vehicleCatalogService.getBrands();
  }

  @Get('brands/:id/models')
  getModels(@Param('id') brandId: string) {
    return this.vehicleCatalogService.getModels(brandId);
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
