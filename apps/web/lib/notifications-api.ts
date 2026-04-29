import type {
  AppNotification,
  MarkAllNotificationsSeenResponse,
  MarkNotificationSeenResponse,
  NotificationsResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class NotificationsApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'PATCH';
  accessToken: string;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-web',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new NotificationsApiError(
      typeof payload.message === 'string' ? payload.message : 'Bildirimler yuklenemedi.',
    );
  }

  return payload as TResponse;
}

export const webNotificationsApi = {
  getNotifications(accessToken: string) {
    return requestJson<NotificationsResponse>('/notifications', { accessToken });
  },
  markSeen(accessToken: string, notificationId: string) {
    return requestJson<MarkNotificationSeenResponse>(`/notifications/${notificationId}/seen`, {
      method: 'PATCH',
      accessToken,
    });
  },
  markAllSeen(accessToken: string) {
    return requestJson<MarkAllNotificationsSeenResponse>('/notifications/seen-all', {
      method: 'PATCH',
      accessToken,
    });
  },
};

export function resolveWebNotificationRoute(notification: AppNotification) {
  return notification.route.appRoute ?? '/notifications';
}
