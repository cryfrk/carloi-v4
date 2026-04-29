import type { MediaAssetPurpose, MediaAssetUploadResponse } from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

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
