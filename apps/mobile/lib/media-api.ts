import type { MediaAssetPurpose, MediaAssetUploadResponse } from '@carloi-v4/types';

import { MOBILE_API_BASE_URL } from './api-base-url';

const API_BASE_URL = MOBILE_API_BASE_URL;

export class MediaApiError extends Error {}

export type ReactNativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

async function handleUploadResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new MediaApiError(
      typeof payload.message === 'string' ? payload.message : 'Dosya yuklenemedi.',
    );
  }

  return payload as unknown as MediaAssetUploadResponse;
}

export const mobileMediaApi = {
  async uploadFile(accessToken: string, file: ReactNativeUploadFile, purpose: MediaAssetPurpose) {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    formData.append('purpose', purpose);

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-device-name': 'carloi-mobile',
      },
      body: formData,
    });

    return handleUploadResponse(response);
  },
  async uploadFiles(accessToken: string, files: ReactNativeUploadFile[], purpose: MediaAssetPurpose) {
    const uploads: MediaAssetUploadResponse[] = [];

    for (const file of files) {
      uploads.push(await this.uploadFile(accessToken, file, purpose));
    }

    return uploads;
  },
};

