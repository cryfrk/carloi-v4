import { MediaAssetPurpose, MediaVisibility } from '@prisma/client';

export type StoreMediaFileInput = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  purpose: MediaAssetPurpose;
  visibility: MediaVisibility;
};

export type StoredMediaFile = {
  storageKey: string;
  absolutePath: string;
};

export type ReadMediaTarget =
  | {
      kind: 'local';
      absolutePath: string;
    }
  | {
      kind: 'redirect';
      url: string;
    };

export interface MediaStorageProvider {
  store(input: StoreMediaFileInput): Promise<StoredMediaFile>;
  getAbsolutePath(storageKey: string): string;
  resolveReadTarget(storageKey: string, visibility: MediaVisibility): Promise<ReadMediaTarget>;
  getPublicUrl(storageKey: string): string | null;
}
