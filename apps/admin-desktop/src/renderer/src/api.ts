import type {
  AdminAuditLogsResponse,
  AdminDashboardResponse,
  AdminListingDetail,
  AdminListingsResponse,
  AdminLoginResponse,
  AdminPaymentItem,
  AdminPaymentsResponse,
  AdminUserDetail,
  AdminUsersResponse,
  CommercialApplicationsResponse,
  CommercialApplicationView,
  CreateInsuranceOfferRequest,
  InsuranceRequestView,
  InsuranceRequestsResponse,
  MediaAssetPurpose,
  MediaAssetUploadResponse,
  RejectCommercialApplicationRequest,
  UpdateAdminListingStatusRequest,
  UpdateAdminUserStatusRequest,
  UploadInsuranceDocumentsRequest,
} from '@carloi-v4/types';

const API_BASE_URL = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ?? 'http://localhost:3001';

export class AdminDesktopApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  accessToken?: string;
  body?: object;
};

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function requestJson<TResponse>(path: string, options: RequestOptions = {}, query?: Record<string, string | number | boolean | undefined | null>) {
  const response = await fetch(buildUrl(path, query), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new AdminDesktopApiError(
      typeof payload.message === 'string' ? payload.message : 'Admin islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const adminDesktopApi = {
  async uploadMedia(accessToken: string, file: File, purpose: MediaAssetPurpose) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const response = await fetch(buildUrl('/admin/media/upload'), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new AdminDesktopApiError(
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
  me(accessToken: string) {
    return requestJson<{ admin: AdminLoginResponse['admin'] }>('/admin/auth/me', {
      accessToken,
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
  getUsers(accessToken: string, query?: Record<string, string | number | boolean | undefined | null>) {
    return requestJson<AdminUsersResponse>('/admin/users', { accessToken }, query);
  },
  getUser(accessToken: string, userId: string) {
    return requestJson<AdminUserDetail>(`/admin/users/${userId}`, { accessToken });
  },
  updateUserStatus(accessToken: string, userId: string, body: UpdateAdminUserStatusRequest) {
    return requestJson<{ success: true; userId: string; isActive: boolean }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  getListings(accessToken: string, query?: Record<string, string | number | boolean | undefined | null>) {
    return requestJson<AdminListingsResponse>('/admin/listings', { accessToken }, query);
  },
  getListing(accessToken: string, listingId: string) {
    return requestJson<AdminListingDetail>(`/admin/listings/${listingId}`, { accessToken });
  },
  updateListingStatus(accessToken: string, listingId: string, body: UpdateAdminListingStatusRequest) {
    return requestJson<{ success: true; listingId: string; listingStatus: string }>(`/admin/listings/${listingId}/status`, {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  getPayments(accessToken: string) {
    return requestJson<AdminPaymentsResponse>('/admin/payments', { accessToken });
  },
  getPayment(accessToken: string, paymentId: string) {
    return requestJson<AdminPaymentItem>(`/admin/payments/${paymentId}`, { accessToken });
  },
  getAuditLogs(accessToken: string, query?: Record<string, string | number | boolean | undefined | null>) {
    return requestJson<AdminAuditLogsResponse>('/admin/audit-logs', { accessToken }, query);
  },
};
