import type { AdminRole, NotificationType } from './enums';

export interface NotificationActorUser {
  kind: 'USER';
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface NotificationActorAdmin {
  kind: 'ADMIN';
  id: string;
  username: string;
  fullName: string;
  avatarUrl: null;
  role: AdminRole;
}

export type NotificationActor = NotificationActorUser | NotificationActorAdmin;

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  targetUrl: string | null;
  isSeen: boolean;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
  route: {
    appRoute: string | null;
    entityId: string | null;
  };
}

export interface NotificationsResponse {
  unreadCount: number;
  items: AppNotification[];
}

export interface MarkNotificationSeenResponse {
  success: true;
  notification: AppNotification;
}

export interface MarkAllNotificationsSeenResponse {
  success: true;
  updatedCount: number;
  seenAt: string;
}
