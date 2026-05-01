import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaAssetPurpose, Prisma, VehicleEquipmentCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getUserOwnedMediaAssetMap } from '../media/media-asset.helpers';
import {
  inferMediaType,
  maskPlateNumber,
  toTitleCase,
  trimNullable,
} from '../listings/listings.utils';
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
      equipmentItems: {
        where: {
          isActive: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
      specs: {
        where: {
          isActive: true,
        },
        orderBy: [{ manualReviewNeeded: 'asc' }, { year: 'desc' }, { enginePowerHp: 'desc' }],
        take: 1,
      },
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  extraEquipment: {
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  },
});

const garageVehicleExploreInclude = Prisma.validator<Prisma.GarageVehicleInclude>()({
  owner: {
    include: {
      profile: true,
    },
  },
  vehiclePackage: {
    include: {
      model: {
        include: {
          brand: true,
        },
      },
      equipmentItems: {
        where: {
          isActive: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      },
      specs: {
        where: {
          isActive: true,
        },
        orderBy: [{ manualReviewNeeded: 'asc' }, { year: 'desc' }, { enginePowerHp: 'desc' }],
        take: 1,
      },
    },
  },
  brand: true,
  model: {
    include: {
      brand: true,
    },
  },
  media: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 6,
  },
  extraEquipment: {
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  },
});

type GarageVehicleSummaryRecord = Prisma.GarageVehicleGetPayload<{
  include: typeof garageVehicleSummaryInclude;
}>;

type GarageVehicleDetailRecord = Prisma.GarageVehicleGetPayload<{
  include: typeof garageVehicleDetailInclude;
}>;

type GarageVehicleExploreRecord = Prisma.GarageVehicleGetPayload<{
  include: typeof garageVehicleExploreInclude;
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
          description: trimNullable(dto.description),
          equipmentNotes: trimNullable(dto.equipmentNotes),
          extraEquipment: {
            create: this.normalizeExtraEquipment(dto.extraEquipment),
          },
          showInExplore: dto.showInExplore ?? false,
          openToOffers: dto.openToOffers ?? false,
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

        if (dto.extraEquipment) {
          await tx.userVehicleExtraEquipment.deleteMany({
            where: {
              vehicleId,
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
            description:
              dto.description !== undefined ? trimNullable(dto.description) : undefined,
            equipmentNotes:
              dto.equipmentNotes !== undefined ? trimNullable(dto.equipmentNotes) : undefined,
            extraEquipment:
              dto.extraEquipment !== undefined
                ? {
                    create: this.normalizeExtraEquipment(dto.extraEquipment),
                  }
                : undefined,
            showInExplore: dto.showInExplore,
            openToOffers: dto.openToOffers,
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

  async getExploreFeed() {
    const vehicles = await this.prisma.garageVehicle.findMany({
      where: {
        deletedAt: null,
        isPublic: true,
        showInExplore: true,
        owner: {
          deletedAt: null,
          isActive: true,
          profile: {
            showGarageVehicles: true,
          },
        },
      },
      include: garageVehicleExploreInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 24,
    });

    return {
      items: vehicles.map((vehicle) => this.serializeExploreVehicle(vehicle)),
      nextCursor: null,
    };
  }

  async getVehicleShowcase(viewerId: string, vehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
      include: garageVehicleExploreInclude,
    });

    if (!vehicle) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    const isOwner = vehicle.ownerId === viewerId;
    const isVisibleToViewer = isOwner || (vehicle.isPublic && vehicle.owner.profile?.showGarageVehicles !== false);

    if (!isVisibleToViewer) {
      throw new NotFoundException('Arac bulunamadi.');
    }

    return this.serializeExploreVehicle(vehicle);
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
      plateNumberMasked: vehicle.plateNumber ? maskPlateNumber(vehicle.plateNumber) : 'Plaka girilmedi',
      plateMasked: vehicle.plateNumber ? maskPlateNumber(vehicle.plateNumber) : 'Plaka girilmedi',
      year: vehicle.year,
      km: vehicle.km,
      isPublic: vehicle.isPublic,
      description: vehicle.description ?? null,
      showInExplore: vehicle.showInExplore,
      openToOffers: vehicle.openToOffers,
    };
  }

  private serializeVehicleDetail(vehicle: GarageVehicleDetailRecord) {
    const spec = this.selectPrimaryPackageSpec(vehicle.vehiclePackage?.specs);

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
      plateNumberMasked: vehicle.plateNumber ? maskPlateNumber(vehicle.plateNumber) : 'Plaka girilmedi',
      color: vehicle.color ?? null,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      km: vehicle.km,
      isPublic: vehicle.isPublic,
      description: vehicle.description ?? null,
      equipmentNotes: vehicle.equipmentNotes ?? null,
      standardEquipment: this.groupStandardEquipment(vehicle.vehiclePackage?.equipmentItems),
      extraEquipment: this.serializeExtraEquipment(vehicle.extraEquipment),
      showInExplore: vehicle.showInExplore,
      openToOffers: vehicle.openToOffers,
      latestObdReport: null,
      createdAt: vehicle.createdAt.toISOString(),
      spec: spec
        ? {
            year: spec.year ?? null,
            bodyType: spec.bodyType ?? null,
            engineVolume: spec.engineVolume ?? spec.engineVolumeCc ?? null,
            enginePower: spec.enginePower ?? spec.enginePowerHp ?? null,
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
    };
  }

  private serializeExploreVehicle(vehicle: GarageVehicleExploreRecord) {
    const spec = this.selectPrimaryPackageSpec(vehicle.vehiclePackage?.specs);

    return {
      id: vehicle.id,
      firstMediaUrl: vehicle.media[0]?.url ?? null,
      media: vehicle.media.map((mediaItem) => ({
        id: mediaItem.id,
        url: mediaItem.url,
        mediaType: mediaItem.mediaType,
        sortOrder: mediaItem.sortOrder,
      })),
      owner: {
        id: vehicle.owner.id,
        username: vehicle.owner.username,
        fullName: `${vehicle.owner.firstName} ${vehicle.owner.lastName}`.trim(),
        avatarUrl: vehicle.owner.profile?.avatarUrl ?? null,
        blueVerified: vehicle.owner.profile?.blueVerified ?? false,
        goldVerified: vehicle.owner.profile?.goldVerified ?? false,
      },
      city: vehicle.owner.profile?.locationText ?? null,
      brand:
        vehicle.vehiclePackage?.model.brand.name ??
        vehicle.model?.brand.name ??
        vehicle.brand?.name ??
        vehicle.brandText,
      model: vehicle.vehiclePackage?.model.name ?? vehicle.model?.name ?? vehicle.modelText,
      package: vehicle.vehiclePackage?.name ?? vehicle.packageText ?? null,
      year: vehicle.year,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      km: vehicle.km,
      bodyType: spec?.bodyType ?? null,
      engineVolume: spec?.engineVolume ?? spec?.engineVolumeCc ?? null,
      enginePower: spec?.enginePower ?? spec?.enginePowerHp ?? null,
      description: vehicle.description ?? null,
      equipmentNotes: vehicle.equipmentNotes ?? null,
      standardEquipment: this.groupStandardEquipment(vehicle.vehiclePackage?.equipmentItems),
      extraEquipment: this.serializeExtraEquipment(vehicle.extraEquipment),
      showInExplore: vehicle.showInExplore,
      openToOffers: vehicle.openToOffers,
    };
  }

  private normalizePlate(plateNumber?: string | null) {
    const normalized = trimNullable(plateNumber);
    return normalized ? normalized.toLocaleUpperCase('tr-TR') : null;
  }

  private selectPrimaryPackageSpec<T>(specs: T[] | null | undefined) {
    return specs?.[0] ?? null;
  }

  private groupStandardEquipment(
    items:
      | Array<{
          id: string;
          category: VehicleEquipmentCategory;
          name: string;
          isStandard: boolean;
          manualReviewNeeded: boolean;
          source: string;
        }>
      | null
      | undefined,
  ) {
    if (!items?.length) {
      return [];
    }

    const categoryOrder: VehicleEquipmentCategory[] = [
      VehicleEquipmentCategory.SAFETY,
      VehicleEquipmentCategory.COMFORT,
      VehicleEquipmentCategory.MULTIMEDIA,
      VehicleEquipmentCategory.EXTERIOR,
      VehicleEquipmentCategory.INTERIOR,
      VehicleEquipmentCategory.DRIVING_ASSIST,
      VehicleEquipmentCategory.LIGHTING,
      VehicleEquipmentCategory.OTHER,
    ];

    return categoryOrder
      .map((category) => ({
        category,
        items: items
          .filter((item) => item.category === category)
          .map((item) => ({
            id: item.id,
            name: item.name,
            isStandard: item.isStandard,
            manualReviewNeeded: item.manualReviewNeeded,
            source: item.source ?? null,
          })),
      }))
      .filter((group) => group.items.length > 0);
  }

  private serializeExtraEquipment(
    items:
      | Array<{
          id: string;
          category: VehicleEquipmentCategory | null;
          name: string;
          note: string | null;
        }>
      | null
      | undefined,
  ) {
    return (items ?? []).map((item) => ({
      id: item.id,
      category: item.category ?? null,
      name: item.name,
      note: item.note ?? null,
      isStandard: false as const,
      manualReviewNeeded: false as const,
    }));
  }

  private normalizeExtraEquipment(
    items:
      | Array<{
          category?: VehicleEquipmentCategory;
          name: string;
          note?: string;
        }>
      | null
      | undefined,
  ): Array<{
    category: VehicleEquipmentCategory | null;
    name: string;
    note: string | null;
  }> {
    const seen = new Set<string>();

    return (items ?? [])
      .map((item) => ({
        category: item.category ?? null,
        name: trimNullable(item.name),
        note: trimNullable(item.note),
      }))
      .filter(
        (
          item,
        ): item is {
          category: VehicleEquipmentCategory | null;
          name: string;
          note: string | null;
        } => Boolean(item.name),
      )
      .filter((item) => {
        const key = `${item.category ?? 'OTHER'}::${item.name.toLocaleLowerCase('tr-TR')}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((item) => ({
        category: item.category,
        name: item.name,
        note: item.note,
      }));
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


