import {
  AdminRole,
  MediaAsset,
  MediaAssetPurpose,
  MediaVisibility,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { extname } from 'node:path';
import type { AdminAuthTokenPayload } from '../../common/admin-auth/admin-auth.types';
import type { AuthTokenPayload } from '../../common/auth/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  COMMERCIAL_ADMIN_MEDIA_PURPOSES,
  INSURANCE_ADMIN_MEDIA_PURPOSES,
  MIME_ALLOWED_EXTENSIONS,
  MIME_SIZE_LIMITS,
  PURPOSE_VISIBILITY_MAP,
} from './media.constants';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import type { MediaStorageProvider } from './providers/media-storage.provider';

export type UploadResult = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  purpose: MediaAssetPurpose;
  visibility: MediaVisibility;
};

type UploadedFileLike = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type MediaPrincipal =
  | { kind: 'user'; userId: string }
  | { kind: 'admin'; adminUserId: string; role: AdminRole }
  | null;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3StorageProvider: S3StorageProvider,
  ) {}

  async uploadForUser(userId: string, file: UploadedFileLike | undefined, purpose: MediaAssetPurpose, originBaseUrl: string) {
    const validated = this.validateFile(file, purpose);
    const provider = this.getStorageProvider();
    const storedFile = await provider.store({
      buffer: validated.buffer,
      extension: validated.extension,
      mimeType: validated.mimetype,
      purpose,
      visibility: validated.visibility,
    });

    const createdAsset = await this.prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        purpose,
        storageKey: storedFile.storageKey,
        originalFileName: validated.originalname,
        mimeType: validated.mimetype,
        size: validated.size,
        visibility: validated.visibility,
        url: 'pending://url',
      },
    });

    const url = this.buildAssetUrl(createdAsset.id, createdAsset.visibility, createdAsset.storageKey, originBaseUrl);
    const asset = await this.prisma.mediaAsset.update({
      where: { id: createdAsset.id },
      data: { url },
    });

    return this.serializeAsset(asset);
  }

  async uploadForAdmin(
    adminUserId: string,
    role: AdminRole,
    file: UploadedFileLike | undefined,
    purpose: MediaAssetPurpose,
    originBaseUrl: string,
  ) {
    if (!this.canAdminUpload(role, purpose)) {
      throw new ForbiddenException('Bu medya amaci icin admin yetkiniz bulunmuyor.');
    }

    const validated = this.validateFile(file, purpose);
    const provider = this.getStorageProvider();
    const storedFile = await provider.store({
      buffer: validated.buffer,
      extension: validated.extension,
      mimeType: validated.mimetype,
      purpose,
      visibility: validated.visibility,
    });

    const createdAsset = await this.prisma.mediaAsset.create({
      data: {
        uploadedByAdminId: adminUserId,
        purpose,
        storageKey: storedFile.storageKey,
        originalFileName: validated.originalname,
        mimeType: validated.mimetype,
        size: validated.size,
        visibility: validated.visibility,
        url: 'pending://url',
      },
    });

    const url = this.buildAssetUrl(createdAsset.id, createdAsset.visibility, createdAsset.storageKey, originBaseUrl);
    const asset = await this.prisma.mediaAsset.update({
      where: { id: createdAsset.id },
      data: { url },
    });

    return this.serializeAsset(asset);
  }

  async getAssetFile(assetId: string, authorizationHeader?: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        id: assetId,
        deletedAt: null,
      },
    });

    if (!asset) {
      throw new NotFoundException('Medya bulunamadi.');
    }

    if (asset.visibility === MediaVisibility.PRIVATE) {
      const principal = await this.resolvePrincipalFromAuthorization(authorizationHeader);

      if (!principal) {
        throw new UnauthorizedException('Bu dosyaya erisim icin giris yapmaniz gerekiyor.');
      }

      await this.assertPrivateAssetAccess(asset, principal);
    }

    const readTarget = await this.getStorageProvider().resolveReadTarget(asset.storageKey, asset.visibility);

    return {
      asset,
      readTarget,
    };
  }

  private validateFile(file: UploadedFileLike | undefined, purpose: MediaAssetPurpose) {
    if (!file?.buffer || !file.originalname || !file.mimetype) {
      throw new BadRequestException('Yuklenecek dosya gereklidir.');
    }

    if (!ALLOWED_MEDIA_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MEDIA_MIME_TYPES)[number])) {
      throw new BadRequestException('Dosya turu desteklenmiyor.');
    }

    const extension = extname(file.originalname).toLowerCase();
    const allowedExtensions = MIME_ALLOWED_EXTENSIONS[file.mimetype] ?? [];

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException('Dosya uzantisi ve MIME type uyusmuyor.');
    }

    const sizeLimit = MIME_SIZE_LIMITS[file.mimetype];
    if (typeof sizeLimit === 'number' && file.size > sizeLimit) {
      throw new BadRequestException('Dosya boyutu izin verilen siniri asiyor.');
    }

    return {
      ...file,
      extension,
      visibility: PURPOSE_VISIBILITY_MAP[purpose],
    };
  }

  private getStorageProvider(): MediaStorageProvider {
    const provider = (this.configService.get<string>('MEDIA_STORAGE_PROVIDER') || 'local').toLowerCase();
    return provider === 's3' ? this.s3StorageProvider : this.localStorageProvider;
  }

  private buildAssetUrl(
    assetId: string,
    visibility: MediaVisibility,
    storageKey: string,
    originBaseUrl: string,
  ) {
    if (visibility === MediaVisibility.PUBLIC) {
      const providerPublicUrl = this.getStorageProvider().getPublicUrl(storageKey);
      if (providerPublicUrl) {
        return providerPublicUrl;
      }

      const relativePublicKey = storageKey.replace(/^public\//, '');
      return `${originBaseUrl}/uploads/${relativePublicKey}`;
    }

    return `${originBaseUrl}/media/assets/${assetId}/file`;
  }

  private serializeAsset(asset: MediaAsset): UploadResult {
    return {
      id: asset.id,
      url: asset.url,
      mimeType: asset.mimeType,
      size: asset.size,
      purpose: asset.purpose,
      visibility: asset.visibility,
    };
  }

  private canAdminUpload(role: AdminRole, purpose: MediaAssetPurpose) {
    if (role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    if (role === AdminRole.INSURANCE_ADMIN) {
      return INSURANCE_ADMIN_MEDIA_PURPOSES.has(purpose);
    }

    if (role === AdminRole.COMMERCIAL_ADMIN) {
      return COMMERCIAL_ADMIN_MEDIA_PURPOSES.has(purpose);
    }

    return false;
  }

  private async resolvePrincipalFromAuthorization(authorizationHeader?: string): Promise<MediaPrincipal> {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type === 'access') {
        return { kind: 'user', userId: payload.sub };
      }
    } catch {
      // Continue with admin token verification.
    }

    try {
      const adminSecret =
        this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET')?.trim() ||
        this.configService.get<string>('ADMIN_JWT_SECRET')?.trim();

      const payload = await this.jwtService.verifyAsync<AdminAuthTokenPayload>(token, {
        secret: adminSecret,
      });

      if (payload.type === 'admin-access' && payload.role) {
        return {
          kind: 'admin',
          adminUserId: payload.sub,
          role: payload.role,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  private async assertPrivateAssetAccess(asset: MediaAsset, principal: Exclude<MediaPrincipal, null>) {
    if (principal.kind === 'user') {
      if (asset.ownerId === principal.userId) {
        return;
      }

      const [messageAttachment, insuranceOffer, insuranceDocument, commercialDocument] = await Promise.all([
        this.prisma.messageAttachment.findFirst({
          where: {
            mediaAssetId: asset.id,
            message: {
              thread: {
                participants: {
                  some: {
                    userId: principal.userId,
                  },
                },
              },
            },
          },
          select: { id: true },
        }),
        this.prisma.insuranceOffer.findFirst({
          where: {
            offerFileMediaAssetId: asset.id,
            request: {
              OR: [{ buyerId: principal.userId }, { sellerId: principal.userId }],
            },
          },
          select: { id: true },
        }),
        this.prisma.insurancePolicyDocument.findFirst({
          where: {
            mediaAssetId: asset.id,
            request: {
              OR: [{ buyerId: principal.userId }, { sellerId: principal.userId }],
            },
          },
          select: { id: true },
        }),
        this.prisma.commercialApplication.findFirst({
          where: {
            taxDocumentMediaAssetId: asset.id,
            userId: principal.userId,
          },
          select: { id: true },
        }),
      ]);

      if (messageAttachment || insuranceOffer || insuranceDocument || commercialDocument) {
        return;
      }

      throw new ForbiddenException('Bu dosyaya erisim yetkiniz yok.');
    }

    if (principal.role === AdminRole.SUPER_ADMIN) {
      return;
    }

    if (
      principal.role === AdminRole.INSURANCE_ADMIN &&
      INSURANCE_ADMIN_MEDIA_PURPOSES.has(asset.purpose)
    ) {
      return;
    }

    if (
      principal.role === AdminRole.COMMERCIAL_ADMIN &&
      COMMERCIAL_ADMIN_MEDIA_PURPOSES.has(asset.purpose)
    ) {
      return;
    }

    throw new ForbiddenException('Bu dosyaya erisim icin uygun admin yetkisi gerekiyor.');
  }
}
