import type {
  InsuranceDocumentsResponse,
  InsuranceOfferActionResponse,
  InsuranceRequestView,
  InsuranceRequestsResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class InsuranceApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST';
  accessToken: string;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-mobile',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new InsuranceApiError(
      typeof payload.message === 'string' ? payload.message : 'Sigorta islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const mobileInsuranceApi = {
  getRequests(accessToken: string) {
    return requestJson<InsuranceRequestsResponse>('/insurance/requests', { accessToken });
  },
  getRequest(accessToken: string, requestId: string) {
    return requestJson<InsuranceRequestView>(`/insurance/requests/${requestId}`, { accessToken });
  },
  getDocuments(accessToken: string, requestId: string) {
    return requestJson<InsuranceDocumentsResponse>(`/insurance/requests/${requestId}/documents`, {
      accessToken,
    });
  },
  acceptOffer(accessToken: string, offerId: string) {
    return requestJson<InsuranceOfferActionResponse>(`/insurance/offers/${offerId}/accept`, {
      accessToken,
      method: 'POST',
    });
  },
  rejectOffer(accessToken: string, offerId: string) {
    return requestJson<InsuranceOfferActionResponse>(`/insurance/offers/${offerId}/reject`, {
      accessToken,
      method: 'POST',
    });
  },
};
