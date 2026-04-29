import type {
  ChangePasswordRequest,
  GenericMessageResponse,
  ProfileDetailResponse,
  ProfileListingsResponse,
  ProfilePostsResponse,
  ProfileVehiclesResponse,
  SavedItemsResponse,
  SettingsMeResponse,
  UpdatePrivacyRequest,
  UpdatePrivacyResponse,
  UpdateProfileRequest,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class ProfileApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'PATCH';
  accessToken: string;
  body?: object;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-mobile',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ProfileApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const mobileProfileApi = {
  getMyProfile(accessToken: string) {
    return requestJson<ProfileDetailResponse>('/profiles/me', { accessToken });
  },
  getProfile(accessToken: string, usernameOrId: string) {
    return requestJson<ProfileDetailResponse>(`/profiles/${encodeURIComponent(usernameOrId)}`, {
      accessToken,
    });
  },
  updateMyProfile(accessToken: string, body: UpdateProfileRequest) {
    return requestJson<ProfileDetailResponse>('/profiles/me', {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  getProfilePosts(accessToken: string, usernameOrId: string) {
    return requestJson<ProfilePostsResponse>(
      `/profiles/${encodeURIComponent(usernameOrId)}/posts`,
      { accessToken },
    );
  },
  getProfileListings(accessToken: string, usernameOrId: string) {
    return requestJson<ProfileListingsResponse>(
      `/profiles/${encodeURIComponent(usernameOrId)}/listings`,
      { accessToken },
    );
  },
  getProfileVehicles(accessToken: string, usernameOrId: string) {
    return requestJson<ProfileVehiclesResponse>(
      `/profiles/${encodeURIComponent(usernameOrId)}/vehicles`,
      { accessToken },
    );
  },
  getSettings(accessToken: string) {
    return requestJson<SettingsMeResponse>('/settings/me', { accessToken });
  },
  updateSettingsProfile(accessToken: string, body: UpdateProfileRequest) {
    return requestJson<ProfileDetailResponse>('/settings/profile', {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  updatePrivacy(accessToken: string, body: UpdatePrivacyRequest) {
    return requestJson<UpdatePrivacyResponse>('/settings/privacy', {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  changePassword(accessToken: string, body: ChangePasswordRequest) {
    return requestJson<GenericMessageResponse>('/settings/password', {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  getSavedItems(accessToken: string) {
    return requestJson<SavedItemsResponse>('/saved-items', { accessToken });
  },
};
