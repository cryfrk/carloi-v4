import { BadRequestException } from '@nestjs/common';
import { MediaAssetPurpose, type Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaLike = PrismaService | Prisma.TransactionClient;

export async function getUserOwnedMediaAssetMap(
  prisma: PrismaLike,
  userId: string,
  assetIds: string[],
  allowedPurposes?: MediaAssetPurpose[],
) {
  const uniqueAssetIds = [...new Set(assetIds.filter(Boolean))];

  if (uniqueAssetIds.length === 0) {
    return new Map();
  }

  const assets = await prisma.mediaAsset.findMany({
    where: {
      id: { in: uniqueAssetIds },
      ownerId: userId,
      deletedAt: null,
      ...(allowedPurposes?.length ? { purpose: { in: allowedPurposes } } : {}),
    },
  });

  if (assets.length !== uniqueAssetIds.length) {
    throw new BadRequestException('Secilen medya varliklarindan biri kullanilamiyor.');
  }

  return new Map(assets.map((asset) => [asset.id, asset]));
}

export async function getAdminOwnedMediaAssetMap(
  prisma: PrismaLike,
  adminUserId: string,
  assetIds: string[],
  allowedPurposes?: MediaAssetPurpose[],
) {
  const uniqueAssetIds = [...new Set(assetIds.filter(Boolean))];

  if (uniqueAssetIds.length === 0) {
    return new Map();
  }

  const assets = await prisma.mediaAsset.findMany({
    where: {
      id: { in: uniqueAssetIds },
      uploadedByAdminId: adminUserId,
      deletedAt: null,
      ...(allowedPurposes?.length ? { purpose: { in: allowedPurposes } } : {}),
    },
  });

  if (assets.length !== uniqueAssetIds.length) {
    throw new BadRequestException('Secilen admin medya varliklarindan biri kullanilamiyor.');
  }

  return new Map(assets.map((asset) => [asset.id, asset]));
}
