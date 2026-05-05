import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppNotification } from '@carloi-v4/types';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileNotificationsApi, resolveMobileNotificationRoute } from '../lib/notifications-api';

export default function NotificationsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void mobileNotificationsApi
      .getNotifications(session.accessToken)
      .then((response) => {
        setItems(response.items);
        setUnreadCount(response.unreadCount);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Bildirimler yuklenemedi.');
      });
  }, [session?.accessToken]);

  async function openNotification(notification: AppNotification) {
    if (!session?.accessToken) {
      return;
    }

    if (!notification.isSeen) {
      try {
        const response = await mobileNotificationsApi.markSeen(session.accessToken, notification.id);
        setItems((current) =>
          current.map((item) => (item.id === notification.id ? response.notification : item)),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Navigation should still continue if read-state update fails.
      }
    }

    router.push(resolveMobileNotificationRoute(notification));
  }

  async function markAllSeen() {
    if (!session?.accessToken) {
      return;
    }

    try {
      await mobileNotificationsApi.markAllSeen(session.accessToken);
      setItems((current) =>
        current.map((item) => ({
          ...item,
          isSeen: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bildirimler guncellenemedi.');
    }
  }

  return (
    <MobileShell
      title="Bildirimler"
      subtitle="Etkilesim, mesaj ve sigorta akislari burada toplanir."
      actionLabel="Tumunu oku"
      onActionPress={() => void markAllSeen()}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Bildirim merkezi</Text>
          <Text style={styles.title}>{unreadCount} okunmamis bildirim</Text>
          <Text style={styles.copy}>Yeni takipler, yorumlar, paylasimlar ve sigorta akisi burada tek satirda toplanir.</Text>
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {items.map((notification) => (
          <Pressable
            key={notification.id}
            style={[styles.card, !notification.isSeen ? styles.cardUnread : null]}
            onPress={() => void openNotification(notification)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              {!notification.isSeen ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.cardBody}>{notification.body}</Text>
            <Text style={styles.meta}>
              {notification.type} · {new Date(notification.createdAt).toLocaleString('tr-TR')}
            </Text>
          </Pressable>
        ))}

        {!items.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Henuz bildirim yok</Text>
            <Text style={styles.meta}>Yeni etkilesimler geldiginde burada goreceksin.</Text>
          </View>
        ) : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
  },
  headerCard: {
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  kicker: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    color: '#6b7280',
    lineHeight: 20,
  },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceff3',
  },
  cardUnread: {
    borderColor: '#dbe5f0',
    backgroundColor: '#f8fbff',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    color: '#111111',
    fontWeight: '800',
    flex: 1,
  },
  cardBody: {
    color: '#4b5563',
    lineHeight: 20,
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  error: {
    color: '#dc2626',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#111111',
    fontWeight: '800',
  },
});
