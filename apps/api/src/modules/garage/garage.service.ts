import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaAssetPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import {
  inferMediaType,
  maskPlateNumber,
  toTitleCase,
  trimNullable,
} from '../listings/listings.utils';
import { serializeObdReport } from '../obd/obd.utils';
import { CreateGarageVehicleDto } from './dto/create-garage-vehicle.dto';
import { UpdateGarageVehicleDto } from './dto/update-garage-vehicle.dto';

const garageVehicleSummaryInclude = Prisma.validator<Prisma.GarageVehicleInclude>()({
  brand: true,
  model: {
    include: {
      brand: true,
    },
  },
  vehiclePackage: {
    include: {
      model: {
        include: {
          brand: true,
        },
      },
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 1,
  },
  obdExpertiseReports: {
    orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      overallScore: true,
    },
  },
});

const garageVehicleDetailInclude = Prisma.validator<Prisma.GarageVehicleInclude>()({
  brand: true,
  model: {
    include: {
      brand: true,
    },
  },
  vehiclePackage: {
    include: {
      model: {
        include: {
          brand: true,
        },
      },
      spec: true,
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  obdExpertiseReports: {
    orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    include: {
      faultCodes: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  },
});

type GarageVehicleSummaryRecord = Prisma.GarageVehicleGetPayload<{
  include: typeof garageVehicleSummaryInclude;
}>;

type GarageVehicleDetailRecord = Prisma.GarageVehicleGetPayload<{
  include: typeof garageVehicleDetailInclude;
}>;

@Injectable()
export class GarageService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyVehicles(userId: string) {
    const vehicles = await this.prisma.garageVehicle.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      include: garageVehicleSummaryInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: vehicles.map((vehicle) => this.serializeVehicleSummary(vehicle)),
    };
  }

  async getVehicleDetail(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      include: garageVehicleDetailInclude,
    });

    if (!vehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    return this.serializeVehicleDetail(vehicle);
  }

  async createGarageVehicle(userId: string, dto: CreateGarageVehicleDto) {
    const catalogInput = await this.resolveCatalogInput({
      brandId: dto.brandId,
      modelId: dto.modelId,
      packageId: dto.packageId ?? dto.vehiclePackageId,
      brandText: dto.brandText,
      modelText: dto.modelText,
      packageText: dto.packageText,
    });
    const assetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      (dto.media ?? []).map((item) => item.mediaAssetId ?? '').filter(Boolean),
      [MediaAssetPurpose.GARAGE_VEHICLE_MEDIA],
    );

    try {
      const vehicle = await this.prisma.garageVehicle.create({
        data: {
          ownerId: userId,
          vehicleType: dto.vehicleType,
          brandId: catalogInput.brandId,
          modelId: catalogInput.modelId,
          vehiclePackageId: catalogInput.vehiclePackageId,
          brandText: catalogInput.brandText,
          modelText: catalogInput.modelText,
          packageText: catalogInput.packageText,
          year: dto.year,
          plateNumber: this.normalizePlate(dto.plateNumber),
          color: trimNullable(dto.color),
          fuelType: dto.fuelType,
          transmissionType: dto.transmissionType,
          km: dto.km,
          isPublic: dto.isPublic ?? false,
          media: {
            create: (dto.media ?? []).map((item, index) => {
              const asset = item.mediaAssetId ? assetMap.get(item.mediaAssetId) : null;
              const url = asset?.url ?? item.url.trim();

              return {
                url,
                mediaAssetId: asset?.id ?? null,
                mediaType: item.mediaType ?? inferMediaType(url),
                sortOrder: index,
              };
            }),
          },
        },
        include: garageVehicleSummaryInclude,
      });

      return {
        success: true,
        vehicle: this.serializeVehicleSummary(vehicle),
      };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async updateGarageVehicle(userId: string, vehicleId: string, dto: UpdateGarageVehicleDto) {
    const existingVehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      include: garageVehicleDetailInclude,
    });

    if (!existingVehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    const catalogInput = await this.resolveCatalogInput({
      brandId: dto.brandId ?? existingVehicle.brandId ?? undefined,
      modelId: dto.modelId ?? existingVehicle.modelId ?? undefined,
      packageId:
        dto.packageId ??
        dto.vehiclePackageId ??
        existingVehicle.vehiclePackageId ??
        undefined,
      brandText: dto.brandText ?? existingVehicle.brandText,
      modelText: dto.modelText ?? existingVehicle.modelText,
      packageText: dto.packageText ?? existingVehicle.packageText ?? undefined,
    });
    const assetMap = await getUserOwnedMediaAssetMap(
      this.prisma,
      userId,
      (dto.media ?? []).map((item) => item.mediaAssetId ?? '').filter(Boolean),
      [MediaAssetPurpose.GARAGE_VEHICLE_MEDIA],
    );

    try {
      const vehicle = await this.prisma.$transaction(async (tx) => {
        if (dto.media) {
          await tx.garageVehicleMedia.deleteMany({
            where: {
              garageVehicleId: vehicleId,
            },
          });
        }

        return tx.garageVehicle.update({
          where: {
            id: vehicleId,
          },
          data: {
            vehicleType: dto.vehicleType,
            brandId: catalogInput.brandId,
            modelId: catalogInput.modelId,
            vehiclePackageId: catalogInput.vehiclePackageId,
            brandText: catalogInput.brandText,
            modelText: catalogInput.modelText,
            packageText: catalogInput.packageText,
            year: dto.year,
            plateNumber:
              dto.plateNumber !== undefined ? this.normalizePlate(dto.plateNumber) : undefined,
            color: dto.color !== undefined ? trimNullable(dto.color) : undefined,
            fuelType: dto.fuelType,
            transmissionType: dto.transmissionType,
            km: dto.km,
            isPublic: dto.isPublic,
            media: dto.media
              ? {
                  create: dto.media.map((item, index) => {
                    const asset = item.mediaAssetId ? assetMap.get(item.mediaAssetId) : null;
                    const url = asset?.url ?? item.url.trim();

                    return {
                      url,
                      mediaAssetId: asset?.id ?? null,
                      mediaType: item.mediaType ?? inferMediaType(url),
                      sortOrder: index,
                    };
                  }),
                }
              : undefined,
          },
          include: garageVehicleSummaryInclude,
        });
      });

      return {
        success: true,
        vehicle: this.serializeVehicleSummary(vehicle),
      };
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async deleteGarageVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    await this.prisma.garageVehicle.update({
      where: {
        id: vehicleId,
      },
      data: {
        deletedAt: new Date(),
        isPublic: false,
      },
    });

    return {
      success: true,
    };
  }

  async getPublicGarage(targetUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        profile: {
          select: {
            showGarageVehicles: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    if (user.profile?.showGarageVehicles === false) {
      return {
        items: [],
        hiddenByProfile: true,
      };
    }

    const vehicles = await this.prisma.garageVehicle.findMany({
      where: {
        ownerId: targetUserId,
        deletedAt: null,
        isPublic: true,
      },
      include: garageVehicleSummaryInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: vehicles.map((vehicle) => this.serializeVehicleSummary(vehicle)),
      hiddenByProfile: false,
    };
  }

  private async resolveCatalogInput(input: {
    brandId?: string;
    modelId?: string;
    packageId?: string;
    brandText: string;
    modelText: string;
    packageText?: string;
  }) {
    if (input.packageId) {
      const vehiclePackage = await this.prisma.vehiclePackage.findUnique({
        where: {
          id: input.packageId,
        },
        include: {
          model: {
            include: {
              brand: true,
            },
          },
        },
      });

      if (!vehiclePackage) {
        throw new NotFoundException('Arac paketi bulunamadi.');
      }

      return {
        brandId: vehiclePackage.model.brand.id,
        modelId: vehiclePackage.model.id,
        vehiclePackageId: vehiclePackage.id,
        brandText: vehiclePackage.model.brand.name,
        modelText: vehiclePackage.model.name,
        packageText: vehiclePackage.name,
      };
    }

    let resolvedBrandId = trimNullable(input.brandId);
    let resolvedModelId = trimNullable(input.modelId);
    let resolvedBrandText = toTitleCase(input.brandText);
    let resolvedModelText = toTitleCase(input.modelText);

    if (resolvedModelId) {
      const vehicleModel = await this.prisma.vehicleModel.findUnique({
        where: {
          id: resolvedModelId,
        },
        include: {
          brand: true,
        },
      });

      if (!vehicleModel) {
        throw new NotFoundException('Arac modeli bulunamadi.');
      }

      if (resolvedBrandId && vehicleModel.brandId !== resolvedBrandId) {
        throw new BadRequestException('Secilen marka ve model birbiriyle uyumlu degil.');
      }

      resolvedBrandId = vehicleModel.brandId;
      resolvedBrandText = vehicleModel.brand.name;
      resolvedModelText = vehicleModel.name;
    }

    if (resolvedBrandId) {
      const vehicleBrand = await this.prisma.vehicleBrand.findUnique({
        where: {
          id: resolvedBrandId,
        },
      });

      if (!vehicleBrand) {
        throw new NotFoundException('Arac markasi bulunamadi.');
      }

      resolvedBrandText = vehicleBrand.name;
    }

    return {
      brandId: resolvedBrandId ?? null,
      modelId: resolvedModelId ?? null,
      vehiclePackageId: null,
      brandText: resolvedBrandText,
      modelText: resolvedModelText,
      packageText: trimNullable(input.packageText),
    };
  }

  private serializeVehicleSummary(vehicle: GarageVehicleSummaryRecord) {
    return {
      id: vehicle.id,
      firstMediaUrl: vehicle.media[0]?.url ?? null,
      brand:
        vehicle.vehiclePackage?.model.brand.name ??
        vehicle.model?.brand.name ??
        vehicle.brand?.name ??
        vehicle.brandText,
      model: vehicle.vehiclePackage?.model.name ?? vehicle.model?.name ?? vehicle.modelText,
      package: vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null,
      plateNumberMasked: maskPlateNumber(vehicle.plateNumber),
      plateMasked: maskPlateNumber(vehicle.plateNumber),
      year: vehicle.year,
      km: vehicle.km,
      isPublic: vehicle.isPublic,
      latestObdReportId: vehicle.obdExpertiseReports[0]?.id ?? null,
      latestObdReportScore: vehicle.obdExpertiseReports[0]?.overallScore ?? null,
    };
  }

  private serializeVehicleDetail(vehicle: GarageVehicleDetailRecord) {
    const spec = vehicle.vehiclePackage?.spec ?? null;

    return {
      id: vehicle.id,
      media: vehicle.media.map((mediaItem) => ({
        id: mediaItem.id,
        url: mediaItem.url,
        mediaType: mediaItem.mediaType,
        sortOrder: mediaItem.sortOrder,
      })),
      brand:
        vehicle.vehiclePackage?.model.brand.name ??
        vehicle.model?.brand.name ??
        vehicle.brand?.name ??
        vehicle.brandText,
      model:
        vehicle.vehiclePackage?.model.name ??
        vehicle.model?.name ??
        vehicle.modelText,
      package: vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null,
      vehicleType: vehicle.vehicleType,
      year: vehicle.year,
      plateNumberMasked: maskPlateNumber(vehicle.plateNumber),
      color: vehicle.color ?? null,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      km: vehicle.km,
      isPublic: vehicle.isPublic,
      createdAt: vehicle.createdAt.toISOString(),
      spec: spec
        ? {
            bodyType: spec.bodyType ?? null,
            engineVolumeCc: spec.engineVolumeCc ?? null,
            enginePowerHp: spec.enginePowerHp ?? null,
            tractionType: spec.tractionType ?? null,
            fuelType: spec.fuelType ?? null,
            transmissionType: spec.transmissionType ?? null,
            equipmentSummary: spec.equipmentSummary ?? null,
            multimediaSummary: spec.multimediaSummary ?? null,
            interiorSummary: spec.interiorSummary ?? null,
            exteriorSummary: spec.exteriorSummary ?? null,
          }
        : null,
      latestObdReport: serializeObdReport(vehicle.obdExpertiseReports[0] ?? null),
    };
  }

  private normalizePlate(plateNumber: string) {
    return plateNumber.trim().toLocaleUpperCase('tr-TR');
  }

  private handleUniqueConstraint(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('plateNumber')
    ) {
      throw new BadRequestException('Bu plaka baska bir arac icin zaten kayitli.');
    }
  }
}
