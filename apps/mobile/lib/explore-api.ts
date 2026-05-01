import type { ExploreFeedResponse, VehicleShowcaseDetailResponse } from '@carloi-v4/types';

import { MOBILE_API_BASE_URL } from './api-base-url';

const API_BASE_URL = MOBILE_API_BASE_URL;

export class ExploreApiError extends Error {}

type RequestOptions = {
  accessToken: string;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-mobile',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ExploreApiError(
      typeof payload.message === 'string' ? payload.message : 'Kesif verileri getirilemedi.',
    );
  }

  return payload as TResponse;
}

export const mobileExploreApi = {
  getFeed(accessToken: string) {
    return requestJson<ExploreFeedResponse>('/explore/feed', { accessToken });
  },
  getVehicleShowcase(accessToken: string, vehicleId: string) {
    return requestJson<VehicleShowcaseDetailResponse>(`/explore/vehicles/${vehicleId}`, {
      accessToken,
    });
  },
};
