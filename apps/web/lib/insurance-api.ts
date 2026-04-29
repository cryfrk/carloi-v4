import type {
  CreateInsuranceOfferRequest,
  InsuranceDocumentsResponse,
  InsuranceOfferActionResponse,
  InsuranceRequestView,
  InsuranceRequestsResponse,
  UpdateInsuranceOfferStatusRequest,
  UploadInsuranceDocumentsRequest,
} from '@carloi-v4/types';

import { WEB_API_BASE_URL } from './api-base-url';

const API_BASE_URL = WEB_API_BASE_URL;

export class InsuranceApiError extends Error {}

type RequestOptions = {
  accessToken: string;
  method?: 'GET' | 'POST' | 'PATCH';
  body?: object;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-web',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new InsuranceApiError(
      typeof payload.message === 'string' ? payload.message : 'Sigorta islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const webInsuranceApi = {
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

export const webAdminInsuranceApi = {
  getRequests(accessToken: string) {
    return requestJson<InsuranceRequestsResponse>('/admin/insurance/requests', { accessToken });
  },
  getRequest(accessToken: string, requestId: string) {
    return requestJson<InsuranceRequestView>(`/admin/insurance/requests/${requestId}`, {
      accessToken,
    });
  },
  createOffer(accessToken: string, requestId: string, body: CreateInsuranceOfferRequest) {
    return requestJson<{ success: true; requestId: string; offerId: string; status: string }>(
      `/admin/insurance/requests/${requestId}/offer`,
      {
        accessToken,
        method: 'POST',
        body,
      },
    );
  },
  updateOfferStatus(accessToken: string, offerId: string, body: UpdateInsuranceOfferStatusRequest) {
    return requestJson<{ success: true; offerId: string; status: string }>(
      `/admin/insurance/offers/${offerId}/status`,
      {
        accessToken,
        method: 'PATCH',
        body,
      },
    );
  },
  uploadDocuments(accessToken: string, requestId: string, body: UploadInsuranceDocumentsRequest) {
    return requestJson<{ success: true; requestId: string; status: string }>(
      `/admin/insurance/requests/${requestId}/documents`,
      {
        accessToken,
        method: 'POST',
        body,
      },
    );
  },
};

