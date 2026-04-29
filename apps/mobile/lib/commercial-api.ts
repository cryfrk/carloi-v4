import type {
  CommercialApplicationResponse,
  SubmitCommercialApplicationRequest,
  SubmitCommercialApplicationResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

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

export const mobileCommercialApi = {
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
