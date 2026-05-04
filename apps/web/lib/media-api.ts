import type { MediaAssetPurpose, MediaAssetUploadResponse } from '@carloi-v4/types';

import { WEB_API_BASE_URL } from './api-base-url';
import { resolveWebMediaUrl } from './media-url';

const API_BASE_URL = WEB_API_BASE_URL;

export class MediaApiError extends Error {}

async function handleUploadResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new MediaApiError(
      typeof payload.message === 'string' ? payload.message : 'Dosya yuklenemedi.',
    );
  }

  const upload = payload as unknown as MediaAssetUploadResponse;

  return {
    ...upload,
    url: resolveWebMediaUrl(upload.url) ?? upload.url,
  };
}

export const webMediaApi = {
  async uploadFile(accessToken: string, file: File, purpose: MediaAssetPurpose) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-device-name': 'carloi-web',
      },
      body: formData,
    });

    return handleUploadResponse(response);
  },
  async uploadFiles(accessToken: string, files: FileList | File[], purpose: MediaAssetPurpose) {
    const normalizedFiles = Array.from(files);
    const uploads: MediaAssetUploadResponse[] = [];

    for (const file of normalizedFiles) {
      uploads.push(await this.uploadFile(accessToken, file, purpose));
    }

    return uploads;
  },
};

