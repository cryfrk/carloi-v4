import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MediaVisibility } from '@prisma/client';
import type { MediaStorageProvider, StoreMediaFileInput, StoredMediaFile } from './media-storage.provider';

@Injectable()
export class LocalStorageProvider implements MediaStorageProvider {
  private readonly workspaceRoot = resolve(process.cwd(), '../..');
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR') || 'uploads';
    this.uploadRoot = resolve(this.workspaceRoot, uploadDir);
  }

  async store(input: StoreMediaFileInput): Promise<StoredMediaFile> {
    const purposeFolder = input.purpose.toLowerCase();
    const visibilityFolder = input.visibility === 'PUBLIC' ? 'public' : 'private';
    const directory = join(this.uploadRoot, visibilityFolder, purposeFolder);
    const fileName = `${randomUUID()}${input.extension}`;
    const absolutePath = join(directory, fileName);

    await mkdir(directory, { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      storageKey: `${visibilityFolder}/${purposeFolder}/${fileName}`,
      absolutePath,
    };
  }

  getAbsolutePath(storageKey: string) {
    return join(this.uploadRoot, storageKey);
  }

  async resolveReadTarget(storageKey: string, _visibility: MediaVisibility) {
    return {
      kind: 'local' as const,
      absolutePath: this.getAbsolutePath(storageKey),
    };
  }

  getPublicUrl(storageKey: string) {
    const configuredBaseUrl = this.configService.get<string>('PUBLIC_MEDIA_BASE_URL');
    const relativePublicKey = storageKey.replace(/^public\//, '');

    if (!configuredBaseUrl) {
      return null;
    }

    return `${configuredBaseUrl.replace(/\/$/, '')}/${relativePublicKey}`;
  }

  getUploadRoot() {
    return this.uploadRoot;
  }
}
