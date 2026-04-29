import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from '../components/mobile-shell';
import { useAuth } from '../context/auth-context';
import { mobileNotificationsApi, resolveMobileNotificationRoute } from '../lib/notifications-api';
import type { AppNotification } from '@carloi-v4/types';

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
        // Keep navigation responsive even if seen update fails.
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
      setItems((current) => current.map((item) => ({ ...item, isSeen: true, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bildirimler guncellenemedi.');
    }
  }

  return (
    <MobileShell title="Bildirimler" subtitle="Etkilesim, mesaj ve sigorta akislari burada toplanir." actionLabel="Tumunu oku" onActionPress={() => void markAllSeen()}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Notification center</Text>
          <Text style={styles.title}>{unreadCount} okunmamis bildirim</Text>
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {items.map((notification) => (
          <Pressable key={notification.id} style={[styles.card, !notification.isSeen ? styles.cardUnread : null]} onPress={() => void openNotification(notification)}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              {!notification.isSeen ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.cardBody}>{notification.body}</Text>
            <Text style={styles.meta}>{notification.type} · {new Date(notification.createdAt).toLocaleString('tr-TR')}</Text>
          </Pressable>
        ))}
        {!items.length ? <Text style={styles.meta}>Henuz bildirim yok.</Text> : null}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 18 },
  headerCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    gap: 8,
  },
  kicker: { color: '#ffd6c2', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: '#f8f2ea', fontSize: 22, fontWeight: '900' },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardUnread: {
    borderColor: 'rgba(239,131,84,0.35)',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { color: '#f8f2ea', fontWeight: '800', flex: 1 },
  cardBody: { color: '#c5d4de', lineHeight: 20 },
  meta: { color: '#8fa4b5', fontSize: 12 },
  error: { color: '#ffb4b4' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef8354' },
});
