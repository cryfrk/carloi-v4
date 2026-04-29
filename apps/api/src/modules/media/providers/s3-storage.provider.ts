import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaVisibility } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaStorageProvider, StoreMediaFileInput, StoredMediaFile } from './media-storage.provider';

@Injectable()
export class S3StorageProvider implements MediaStorageProvider {
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  async store(input: StoreMediaFileInput): Promise<StoredMediaFile> {
    const client = this.getClient();
    const key = `${input.visibility.toLowerCase()}/${input.purpose.toLowerCase()}/${randomUUID()}${input.extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      storageKey: key,
      absolutePath: key,
    };
  }

  getAbsolutePath(storageKey: string): string {
    return storageKey;
  }

  async resolveReadTarget(storageKey: string, visibility: MediaVisibility) {
    if (visibility === MediaVisibility.PUBLIC) {
      const publicUrl = this.getPublicUrl(storageKey);
      if (!publicUrl) {
        throw new InternalServerErrorException('S3 public medya URL ayari eksik.');
      }

      return {
        kind: 'redirect' as const,
        url: publicUrl,
      };
    }

    const signedUrl = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: storageKey,
      }),
      {
        expiresIn: Number(this.configService.get<string>('S3_SIGNED_URL_EXPIRES_IN') || 900),
      },
    );

    return {
      kind: 'redirect' as const,
      url: signedUrl,
    };
  }

  getPublicUrl(storageKey: string) {
    const customBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL')?.trim();
    if (customBaseUrl) {
      return `${customBaseUrl.replace(/\/$/, '')}/${storageKey}`;
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT')?.trim();
    const bucket = this.getBucket();
    const forcePathStyle = (this.configService.get<string>('S3_FORCE_PATH_STYLE') || 'false').toLowerCase() === 'true';

    if (endpoint) {
      const normalizedEndpoint = endpoint.replace(/\/$/, '');
      return forcePathStyle ? `${normalizedEndpoint}/${bucket}/${storageKey}` : `${normalizedEndpoint}/${storageKey}`;
    }

    const region = this.getRegion();
    return `https://${bucket}.s3.${region}.amazonaws.com/${storageKey}`;
  }

  private getClient() {
    if (!this.client) {
      this.client = new S3Client({
        region: this.getRegion(),
        endpoint: this.configService.get<string>('S3_ENDPOINT')?.trim() || undefined,
        forcePathStyle:
          (this.configService.get<string>('S3_FORCE_PATH_STYLE') || 'false').toLowerCase() === 'true',
        credentials: {
          accessKeyId: this.getRequired('S3_ACCESS_KEY'),
          secretAccessKey: this.getRequired('S3_SECRET_KEY'),
        },
      });
    }

    return this.client;
  }

  private getBucket() {
    return this.getRequired('S3_BUCKET');
  }

  private getRegion() {
    return this.getRequired('S3_REGION');
  }

  private getRequired(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new InternalServerErrorException(`S3 ayari eksik: ${key}`);
    }

    return value;
  }
}
