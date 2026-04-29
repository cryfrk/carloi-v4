'use client';

import { useEffect, useState } from 'react';
import { AppShell } from './app-shell';
import { useAuth } from './auth-provider';
import { webNotificationsApi, resolveWebNotificationRoute } from '../lib/notifications-api';
import type { AppNotification } from '@carloi-v4/types';

export function NotificationsClient() {
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webNotificationsApi
      .getNotifications(session.accessToken)
      .then((response) => {
        setItems(response.items);
        setUnreadCount(response.unreadCount);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Bildirimler yuklenemedi.');
      });
  }, [session?.accessToken]);

  async function handleMarkAll() {
    if (!session?.accessToken) {
      return;
    }

    try {
      await webNotificationsApi.markAllSeen(session.accessToken);
      setItems((current) => current.map((item) => ({ ...item, isSeen: true, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bildirimler guncellenemedi.');
    }
  }

  return (
    <AppShell>
      <section className="settings-stack">
        <article className="settings-card settings-hero">
          <div>
            <div className="settings-kicker">Notification center</div>
            <h2>Bildirimler</h2>
            <p>{unreadCount} okunmamis bildirim seni bekliyor.</p>
          </div>
          <button className="session-button" type="button" onClick={() => void handleMarkAll()}>
            Tumunu oku
          </button>
        </article>
        {errorMessage ? <div className="auth-message error">{errorMessage}</div> : null}
        <section className="settings-stack">
          {items.map((notification) => (
            <a key={notification.id} className={`settings-card notification-card ${notification.isSeen ? '' : 'unread'}`} href={resolveWebNotificationRoute(notification)}>
              <div className="settings-card-head">
                <div>
                  <div className="settings-kicker">{notification.type}</div>
                  <h3>{notification.title}</h3>
                </div>
                {!notification.isSeen ? <span className="tiny-pill">Yeni</span> : null}
              </div>
              <p>{notification.body}</p>
              <span>{new Date(notification.createdAt).toLocaleString('tr-TR')}</span>
            </a>
          ))}
          {!items.length ? <article className="settings-card"><p>Henuz bildirim yok.</p></article> : null}
        </section>
      </section>
    </AppShell>
  );
}
