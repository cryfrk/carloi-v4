import type {
  CommercialApplicationResponse,
  SubmitCommercialApplicationRequest,
  SubmitCommercialApplicationResponse,
} from '@carloi-v4/types';

import { WEB_API_BASE_URL } from './api-base-url';

const API_BASE_URL = WEB_API_BASE_URL;

export class CommercialApiError extends Error {}

async function requestJson<TResponse>(
  path: string,
  accessToken: string,
  options?: { method?: 'GET' | 'POST'; body?: object },
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(options?.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new CommercialApiError(
      typeof payload.message === 'string' ? payload.message : 'Ticari hesap islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const webCommercialApi = {
  getOwnApplication(accessToken: string) {
    return requestJson<CommercialApplicationResponse>('/commercial-applications/me', accessToken);
  },
  submit(accessToken: string, body: SubmitCommercialApplicationRequest) {
    return requestJson<SubmitCommercialApplicationResponse>('/commercial-applications', accessToken, {
      method: 'POST',
      body,
    });
  },
};

