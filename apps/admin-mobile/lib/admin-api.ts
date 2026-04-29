import type {
  AdminDashboardResponse,
  AdminLoginResponse,
  CommercialApplicationsResponse,
  CommercialApplicationView,
  CreateInsuranceOfferRequest,
  InsuranceRequestView,
  InsuranceRequestsResponse,
  MediaAssetPurpose,
  MediaAssetUploadResponse,
  RejectCommercialApplicationRequest,
  UploadInsuranceDocumentsRequest,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class AdminMobileApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  accessToken?: string;
  body?: object;
};

async function requestJson<TResponse>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new AdminMobileApiError(
      typeof payload.message === 'string' ? payload.message : 'Admin islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const adminMobileApi = {
  async uploadMedia(
    accessToken: string,
    file: { uri: string; name: string; type: string },
    purpose: MediaAssetPurpose,
  ) {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    formData.append('purpose', purpose);

    const response = await fetch(`${API_BASE_URL}/admin/media/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new AdminMobileApiError(
        typeof payload.message === 'string' ? payload.message : 'Dosya yuklenemedi.',
      );
    }

    return payload as unknown as MediaAssetUploadResponse;
  },
  login(username: string, password: string) {
    return requestJson<AdminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: { username, password },
    });
  },
  logout(accessToken: string, refreshToken: string) {
    return requestJson<{ success: true }>('/admin/auth/logout', {
      method: 'POST',
      accessToken,
      body: { refreshToken },
    });
  },
  getDashboard(accessToken: string) {
    return requestJson<AdminDashboardResponse>('/admin/dashboard', {
      accessToken,
    });
  },
  getInsuranceRequests(accessToken: string) {
    return requestJson<InsuranceRequestsResponse>('/admin/insurance/requests', {
      accessToken,
    });
  },
  getInsuranceRequest(accessToken: string, requestId: string) {
    return requestJson<InsuranceRequestView>(`/admin/insurance/requests/${requestId}`, {
      accessToken,
    });
  },
  createOffer(accessToken: string, requestId: string, body: CreateInsuranceOfferRequest) {
    return requestJson<{ success: true; requestId: string; offerId: string; status: string }>(
      `/admin/insurance/requests/${requestId}/offer`,
      {
        method: 'POST',
        accessToken,
        body,
      },
    );
  },
  uploadDocuments(accessToken: string, requestId: string, body: UploadInsuranceDocumentsRequest) {
    return requestJson<{ success: true; requestId: string; status: string }>(
      `/admin/insurance/requests/${requestId}/documents`,
      {
        method: 'POST',
        accessToken,
        body,
      },
    );
  },
  getCommercialApplications(accessToken: string) {
    return requestJson<CommercialApplicationsResponse>('/admin/commercial-applications', {
      accessToken,
    });
  },
  getCommercialApplication(accessToken: string, applicationId: string) {
    return requestJson<CommercialApplicationView>(`/admin/commercial-applications/${applicationId}`, {
      accessToken,
    });
  },
  approveCommercialApplication(accessToken: string, applicationId: string) {
    return requestJson<{ success: true; applicationId: string; status: string }>(
      `/admin/commercial-applications/${applicationId}/approve`,
      {
        method: 'POST',
        accessToken,
      },
    );
  },
  rejectCommercialApplication(accessToken: string, applicationId: string, body: RejectCommercialApplicationRequest) {
    return requestJson<{ success: true; applicationId: string; status: string }>(
      `/admin/commercial-applications/${applicationId}/reject`,
      {
        method: 'POST',
        accessToken,
        body,
      },
    );
  },
};
