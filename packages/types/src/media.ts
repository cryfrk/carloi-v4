import type { MediaAssetPurpose, MediaVisibility } from './enums';

export interface MediaAssetUploadResponse {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  purpose: MediaAssetPurpose;
  visibility: MediaVisibility;
}
