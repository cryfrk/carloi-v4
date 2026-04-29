import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VehicleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getBrands() {
    return this.prisma.vehicleBrand.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async getModels(brandId: string) {
    return this.prisma.vehicleModel.findMany({
      where: {
        brandId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        brandId: true,
        name: true,
        slug: true,
      },
    });
  }

  async getPackages(modelId: string) {
    return this.prisma.vehiclePackage.findMany({
      where: {
        modelId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        modelId: true,
        name: true,
        slug: true,
      },
    });
  }

  async getPackageSpec(packageId: string) {
    const spec = await this.prisma.vehicleSpec.findFirst({
      where: {
        packageId,
      },
      select: {
        id: true,
        packageId: true,
        bodyType: true,
        engineVolumeCc: true,
        enginePowerHp: true,
        tractionType: true,
        fuelType: true,
        transmissionType: true,
        equipmentSummary: true,
        multimediaSummary: true,
        interiorSummary: true,
        exteriorSummary: true,
      },
    });

    if (!spec) {
      throw new NotFoundException('Arac paketi ozelligi bulunamadi.');
    }

    return spec;
  }
}
