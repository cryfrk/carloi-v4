import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FuelType,
  Prisma,
  TransmissionType,
  VehicleCatalogType,
  VehicleEquipmentCategory,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { VehicleCatalogPublicType } from './dto/vehicle-catalog-query.dto';

const PUBLIC_TYPE_BY_PRISMA: Record<VehicleCatalogType, VehicleCatalogPublicType> = {
  [VehicleCatalogType.AUTOMOBILE]: 'CAR',
  [VehicleCatalogType.MOTORCYCLE]: 'MOTORCYCLE',
  [VehicleCatalogType.COMMERCIAL]: 'COMMERCIAL',
};

const PRISMA_TYPE_BY_PUBLIC: Record<VehicleCatalogPublicType, VehicleCatalogType> = {
  CAR: VehicleCatalogType.AUTOMOBILE,
  MOTORCYCLE: VehicleCatalogType.MOTORCYCLE,
  COMMERCIAL: VehicleCatalogType.COMMERCIAL,
};

const VEHICLE_CATALOG_TYPES = [
  {
    key: 'CAR' as const,
    label: 'Otomobil',
    description: 'Sedan, hatchback, SUV ve binek araclar.',
  },
  {
    key: 'MOTORCYCLE' as const,
    label: 'Motosiklet',
    description: 'Iki tekerli motosiklet ve benzeri araclar.',
  },
  {
    key: 'COMMERCIAL' as const,
    label: 'Hafif Ticari',
    description: 'Panelvan, pickup ve hafif ticari araclar.',
  },
] as const;

type VehicleCatalogSpecRecord = Prisma.VehicleSpecGetPayload<{
  select: {
    id: true;
    packageId: true;
    year: true;
    bodyType: true;
    engineName: true;
    engineVolume: true;
    enginePower: true;
    engineVolumeCc: true;
    enginePowerHp: true;
    torqueNm: true;
    tractionType: true;
    fuelType: true;
    transmissionType: true;
    source: true;
    manualReviewNeeded: true;
    isActive: true;
    equipmentSummary: true;
    multimediaSummary: true;
    interiorSummary: true;
    exteriorSummary: true;
  };
}>;

type VehicleCatalogEquipmentRecord = Prisma.VehiclePackageEquipmentGetPayload<{
  select: {
    id: true;
    packageId: true;
    category: true;
    name: true;
    isStandard: true;
    source: true;
    manualReviewNeeded: true;
  };
}>;

const EQUIPMENT_CATEGORY_ORDER: VehicleEquipmentCategory[] = [
  VehicleEquipmentCategory.SAFETY,
  VehicleEquipmentCategory.COMFORT,
  VehicleEquipmentCategory.MULTIMEDIA,
  VehicleEquipmentCategory.EXTERIOR,
  VehicleEquipmentCategory.INTERIOR,
  VehicleEquipmentCategory.DRIVING_ASSIST,
  VehicleEquipmentCategory.LIGHTING,
  VehicleEquipmentCategory.OTHER,
];

@Injectable()
export class VehicleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  getTypes() {
    return VEHICLE_CATALOG_TYPES.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
      type: item.key,
    }));
  }

  async getBrands(type?: VehicleCatalogPublicType) {
    const prismaType = this.mapPublicTypeToPrisma(type);

    const brands = await this.prisma.vehicleBrand.findMany({
      where: {
        isActive: true,
        ...(prismaType
          ? {
              OR: [
                { type: prismaType },
                {
                  models: {
                    some: {
                      isActive: true,
                      catalogType: prismaType,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    });

    return brands.map((brand) => ({
      id: brand.id,
      type: this.mapPrismaTypeToPublic(brand.type),
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl ?? null,
    }));
  }

  async getModels(brandId: string, type?: VehicleCatalogPublicType) {
    const prismaType = this.mapPublicTypeToPrisma(type);

    return this.prisma.vehicleModel.findMany({
      where: {
        brandId,
        isActive: true,
        brand: {
          isActive: true,
          ...(prismaType ? { type: prismaType } : {}),
        },
        ...(prismaType ? { catalogType: prismaType } : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        brandId: true,
        name: true,
        slug: true,
        yearStart: true,
        yearEnd: true,
        bodyType: true,
        catalogType: true,
        source: true,
        manualReviewNeeded: true,
      },
    });
  }

  async getPackages(modelId: string) {
    const [vehicleModel, packages] = await Promise.all([
      this.prisma.vehicleModel.findFirst({
        where: {
          id: modelId,
          isActive: true,
        },
        select: {
          id: true,
          yearStart: true,
          yearEnd: true,
        },
      }),
      this.prisma.vehiclePackage.findMany({
        where: {
          modelId,
          isActive: true,
        },
        orderBy: [{ yearEnd: 'desc' }, { yearStart: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          modelId: true,
          name: true,
          slug: true,
          yearStart: true,
          yearEnd: true,
          marketRegion: true,
          source: true,
          manualReviewNeeded: true,
        },
      }),
    ]);

    if (!vehicleModel) {
      return [];
    }

    if (packages.length > 0) {
      return packages;
    }

    return [
      {
        id: `manual:${vehicleModel.id}`,
        modelId: vehicleModel.id,
        name: 'Paket belirtilmedi',
        slug: 'paket-belirtilmedi',
        yearStart: vehicleModel.yearStart ?? null,
        yearEnd: vehicleModel.yearEnd ?? null,
        marketRegion: 'TR',
        source: 'CARLOI_PHASE2_SEED',
        manualReviewNeeded: true,
      },
    ];
  }

  async getPackageSpecs(packageId: string, selectedYear?: number) {
    if (packageId.startsWith('manual:')) {
      return this.getManualPackageSpecs(packageId);
    }

    const [vehiclePackage, specs] = await Promise.all([
      this.prisma.vehiclePackage.findFirst({
        where: {
          id: packageId,
          isActive: true,
        },
        select: {
          id: true,
          yearStart: true,
          yearEnd: true,
          model: {
            select: {
              bodyType: true,
            },
          },
        },
      }),
      this.prisma.vehicleSpec.findMany({
        where: {
          packageId,
          isActive: true,
        },
        orderBy: [{ manualReviewNeeded: 'asc' }, { year: 'desc' }, { enginePowerHp: 'desc' }],
        select: {
          id: true,
          packageId: true,
          year: true,
          bodyType: true,
          engineName: true,
          engineVolume: true,
          enginePower: true,
          engineVolumeCc: true,
          enginePowerHp: true,
          torqueNm: true,
          tractionType: true,
          fuelType: true,
          transmissionType: true,
          source: true,
          manualReviewNeeded: true,
          isActive: true,
          equipmentSummary: true,
          multimediaSummary: true,
          interiorSummary: true,
          exteriorSummary: true,
        },
      }),
    ]);

    if (!vehiclePackage) {
      throw new NotFoundException('Arac paketi ozelligi bulunamadi.');
    }

    const normalizedSpecs =
      specs.length > 0
        ? specs.map((spec) => this.normalizeSpec(spec))
        : [
            this.createFallbackSpec({
              packageId,
              year: vehiclePackage.yearEnd ?? vehiclePackage.yearStart ?? null,
              bodyType: vehiclePackage.model.bodyType ?? null,
            }),
          ];
    const availableYears = this.buildAvailableYears(vehiclePackage.yearStart, vehiclePackage.yearEnd, normalizedSpecs);
    const filteredSpecs = selectedYear
      ? normalizedSpecs.filter((spec) => spec.year === null || spec.year === selectedYear)
      : normalizedSpecs;
    const specsForResponse = filteredSpecs.length > 0 ? filteredSpecs : normalizedSpecs;

    return {
      availableYears,
      engineOptions: specsForResponse.map((spec) => ({
        id: spec.id,
        label: this.buildEngineLabel(spec.engineName, spec.engineVolume, spec.enginePower),
        year: spec.year,
        engineName: spec.engineName,
        engineVolume: spec.engineVolume,
        enginePower: spec.enginePower,
      })),
      fuelTypes: this.uniqueEnumValues(specsForResponse.map((spec) => spec.fuelType)),
      transmissionTypes: this.uniqueEnumValues(specsForResponse.map((spec) => spec.transmissionType)),
      specs: specsForResponse,
    };
  }

  async getPackageSpec(packageId: string) {
    const response = await this.getPackageSpecs(packageId);
    const primary = response.specs[0];

    if (!primary) {
      throw new NotFoundException('Arac paketi ozelligi bulunamadi.');
    }

    return primary;
  }

  async getPackageEquipment(packageId: string) {
    if (packageId.startsWith('manual:')) {
      return this.getManualPackageEquipment(packageId);
    }

    const vehiclePackage = await this.prisma.vehiclePackage.findFirst({
      where: {
        id: packageId,
        isActive: true,
      },
      select: {
        id: true,
        equipmentItems: {
          where: {
            isActive: true,
          },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            packageId: true,
            category: true,
            name: true,
            isStandard: true,
            source: true,
            manualReviewNeeded: true,
          },
        },
      },
    });

    if (!vehiclePackage) {
      throw new NotFoundException('Arac paketi donanimi bulunamadi.');
    }

    const equipmentItems =
      vehiclePackage.equipmentItems.length > 0
        ? vehiclePackage.equipmentItems
        : this.createFallbackEquipmentItems(vehiclePackage.id);

    return {
      packageId: vehiclePackage.id,
      groups: this.groupEquipmentItems(equipmentItems),
    };
  }

  private async getManualPackageSpecs(packageId: string) {
    const modelId = packageId.replace(/^manual:/, '');
    const vehicleModel = await this.prisma.vehicleModel.findFirst({
      where: {
        id: modelId,
        isActive: true,
      },
      select: {
        id: true,
        yearStart: true,
        yearEnd: true,
      },
    });

    if (!vehicleModel) {
      throw new NotFoundException('Arac paketi ozelligi bulunamadi.');
    }

    const fallbackSpec = this.createFallbackSpec({
      packageId,
      year: vehicleModel.yearEnd ?? vehicleModel.yearStart ?? null,
      bodyType: null,
    });

    return {
      availableYears: this.buildAvailableYears(vehicleModel.yearStart, vehicleModel.yearEnd, [fallbackSpec]),
      engineOptions: [
        {
          id: fallbackSpec.id,
          label: fallbackSpec.engineName ?? 'Bilmiyorum / Elle girecegim',
          year: fallbackSpec.year,
          engineName: fallbackSpec.engineName,
          engineVolume: fallbackSpec.engineVolume,
          enginePower: fallbackSpec.enginePower,
        },
      ],
      fuelTypes: [FuelType.UNKNOWN],
      transmissionTypes: [TransmissionType.UNKNOWN],
      specs: [fallbackSpec],
    };
  }

  private async getManualPackageEquipment(packageId: string) {
    const modelId = packageId.replace(/^manual:/, '');
    const vehicleModel = await this.prisma.vehicleModel.findFirst({
      where: {
        id: modelId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!vehicleModel) {
      throw new NotFoundException('Arac paketi donanimi bulunamadi.');
    }

    return {
      packageId,
      groups: this.groupEquipmentItems(this.createFallbackEquipmentItems(packageId)),
    };
  }

  private normalizeSpec(spec: VehicleCatalogSpecRecord) {
    return {
      id: spec.id,
      packageId: spec.packageId ?? null,
      year: spec.year ?? null,
      bodyType: spec.bodyType ?? null,
      engineName: spec.engineName ?? null,
      engineVolume: spec.engineVolume ?? spec.engineVolumeCc ?? null,
      enginePower: spec.enginePower ?? spec.enginePowerHp ?? null,
      engineVolumeCc: spec.engineVolumeCc ?? spec.engineVolume ?? null,
      enginePowerHp: spec.enginePowerHp ?? spec.enginePower ?? null,
      torqueNm: spec.torqueNm ?? null,
      tractionType: spec.tractionType ?? null,
      fuelType: spec.fuelType ?? null,
      transmissionType: spec.transmissionType ?? null,
      source: spec.source ?? null,
      manualReviewNeeded: spec.manualReviewNeeded ?? false,
      isActive: spec.isActive ?? true,
      equipmentSummary: spec.equipmentSummary ?? null,
      multimediaSummary: spec.multimediaSummary ?? null,
      interiorSummary: spec.interiorSummary ?? null,
      exteriorSummary: spec.exteriorSummary ?? null,
    };
  }

  private groupEquipmentItems(items: VehicleCatalogEquipmentRecord[]) {
    const grouped = new Map<
      VehicleEquipmentCategory,
      Array<{
        id: string;
        name: string;
        isStandard: boolean;
        manualReviewNeeded: boolean;
        source: string | null;
      }>
    >();

    for (const item of items) {
      const current = grouped.get(item.category) ?? [];
      current.push({
        id: item.id,
        name: item.name,
        isStandard: item.isStandard,
        manualReviewNeeded: item.manualReviewNeeded,
        source: item.source ?? null,
      });
      grouped.set(item.category, current);
    }

    return EQUIPMENT_CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({
      category,
      items: grouped.get(category) ?? [],
    }));
  }

  private buildAvailableYears(
    yearStart: number | null,
    yearEnd: number | null,
    specs: Array<{ year: number | null }>,
  ) {
    const values = new Set<number>();

    if (yearStart && yearEnd && yearEnd >= yearStart) {
      for (let year = yearEnd; year >= yearStart; year -= 1) {
        values.add(year);
      }
    }

    for (const spec of specs) {
      if (spec.year) {
        values.add(spec.year);
      }
    }

    if (values.size === 0) {
      values.add(new Date().getFullYear());
    }

    return Array.from(values).sort((left, right) => right - left);
  }

  private createFallbackSpec({
    packageId,
    year,
    bodyType,
  }: {
    packageId: string;
    year: number | null;
    bodyType: string | null;
  }) {
    return {
      id: `fallback:${packageId}`,
      packageId,
      year,
      bodyType,
      engineName: 'Bilmiyorum / Elle girecegim',
      engineVolume: null,
      enginePower: null,
      engineVolumeCc: null,
      enginePowerHp: null,
      torqueNm: null,
      tractionType: null,
      fuelType: FuelType.UNKNOWN,
      transmissionType: TransmissionType.UNKNOWN,
      source: 'CARLOI_PHASE3_SEED' as const,
      manualReviewNeeded: true,
      isActive: true,
      equipmentSummary: null,
      multimediaSummary: null,
      interiorSummary: null,
      exteriorSummary: null,
    };
  }

  private createFallbackEquipmentItems(packageId: string): VehicleCatalogEquipmentRecord[] {
    return [
      {
        id: `fallback:${packageId}:safety:abs`,
        packageId,
        category: VehicleEquipmentCategory.SAFETY,
        name: 'ABS',
        isStandard: true,
        source: 'CARLOI_PHASE4_SEED',
        manualReviewNeeded: true,
      },
      {
        id: `fallback:${packageId}:safety:airbag`,
        packageId,
        category: VehicleEquipmentCategory.SAFETY,
        name: 'Hava yastigi',
        isStandard: true,
        source: 'CARLOI_PHASE4_SEED',
        manualReviewNeeded: true,
      },
      {
        id: `fallback:${packageId}:comfort:ac`,
        packageId,
        category: VehicleEquipmentCategory.COMFORT,
        name: 'Klima',
        isStandard: true,
        source: 'CARLOI_PHASE4_SEED',
        manualReviewNeeded: true,
      },
      {
        id: `fallback:${packageId}:comfort:lock`,
        packageId,
        category: VehicleEquipmentCategory.COMFORT,
        name: 'Merkezi kilit',
        isStandard: true,
        source: 'CARLOI_PHASE4_SEED',
        manualReviewNeeded: true,
      },
    ];
  }

  private buildEngineLabel(
    engineName: string | null,
    engineVolume: number | null,
    enginePower: number | null,
  ) {
    if (engineName) {
      return engineName;
    }

    const parts: string[] = [];

    if (engineVolume) {
      parts.push(`${(engineVolume / 1000).toFixed(1)}L`);
    }

    if (enginePower) {
      parts.push(`${enginePower} hp`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'Motor bilgisi belirtilmedi';
  }

  private uniqueEnumValues<T extends FuelType | TransmissionType>(values: Array<T | null>) {
    return Array.from(new Set(values.filter((value): value is T => value !== null)));
  }

  private mapPublicTypeToPrisma(type?: VehicleCatalogPublicType) {
    return type ? PRISMA_TYPE_BY_PUBLIC[type] : undefined;
  }

  private mapPrismaTypeToPublic(type: VehicleCatalogType) {
    return PUBLIC_TYPE_BY_PRISMA[type];
  }
}

