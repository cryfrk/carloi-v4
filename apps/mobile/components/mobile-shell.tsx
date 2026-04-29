import { Redirect, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import { mobileNotificationsApi } from '../lib/notifications-api';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', glyph: 'O' },
  { href: '/listings', label: 'Listings', glyph: 'L' },
  { href: '/loi-ai', label: 'Loi AI', glyph: 'AI' },
  { href: '/garage', label: 'Garage', glyph: 'G' },
  { href: '/profile', label: 'Profile', glyph: 'P' },
] as const;

export function MobileShell({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, sessions, isReady, switchAccount } = useAuth();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void mobileNotificationsApi
      .getNotifications(session.accessToken)
      .then((response) => setUnreadCount(response.unreadCount))
      .catch(() => undefined);
  }, [pathname, session?.accessToken]);

  const showPrimaryHeader = useMemo(
    () => pathname === '/home' || pathname === '/listings' || pathname === '/profile',
    [pathname],
  );

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Oturum hazirlaniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Carloi Feed</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            {showPrimaryHeader ? (
              <>
                <Pressable onPress={() => router.push('/create')} style={styles.ghostActionButton}>
                  <Text style={styles.ghostActionButtonLabel}>+</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/notifications')} style={styles.ghostActionButton}>
                  <Text style={styles.ghostActionButtonLabel}>{unreadCount > 0 ? `N ${unreadCount}` : 'N'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(pathname === '/profile' ? '/settings' : '/messages')}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonLabel}>{pathname === '/profile' ? 'Ayar' : 'DM'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {!pathname.startsWith('/messages') ? (
                  <Pressable onPress={() => router.push('/messages')} style={styles.ghostActionButton}>
                    <Text style={styles.ghostActionButtonLabel}>DM</Text>
                  </Pressable>
                ) : null}
                {actionLabel && onActionPress ? (
                  <Pressable onPress={onActionPress} style={styles.actionButton}>
                    <Text style={styles.actionButtonLabel}>{actionLabel}</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.body}>{children}</View>

        <View style={styles.tabBar}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                onLongPress={item.href === '/profile' ? () => setSwitcherVisible(true) : undefined}
                style={[styles.tabItem, active ? styles.tabItemActive : null]}
              >
                <Text style={[styles.tabGlyph, active ? styles.tabGlyphActive : null]}>{item.glyph}</Text>
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal visible={switcherVisible} transparent animationType="fade" onRequestClose={() => setSwitcherVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSwitcherVisible(false)} />
          <View style={styles.switcherSheet}>
            <Text style={styles.switcherTitle}>Hesap degistir</Text>
            {sessions.map((item) => {
              const active = item.user.id === session.user.id;
              return (
                <Pressable
                  key={item.user.id}
                  style={[styles.switcherRow, active ? styles.switcherRowActive : null]}
                  onPress={() => {
                    switchAccount(item.user.id);
                    setSwitcherVisible(false);
                    router.replace('/profile');
                  }}
                >
                  <View>
                    <Text style={styles.switcherName}>@{item.user.username}</Text>
                    <Text style={styles.switcherMeta}>{item.user.firstName} {item.user.lastName}</Text>
                  </View>
                  <Text style={styles.switcherMeta}>{active ? 'Aktif' : 'Gec'}</Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.secondaryFullButton} onPress={() => { setSwitcherVisible(false); router.push('/login'); }}>
              <Text style={styles.secondaryFullButtonLabel}>Hesap ekle</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07121b',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#f8f2ea',
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#07121b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8f2ea',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#aebdcc',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ef8354',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghostActionButton: {
    marginTop: 2,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostActionButtonLabel: {
    color: '#f8f2ea',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonLabel: {
    color: '#08131d',
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(11,24,34,0.96)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 18,
  },
  tabItemActive: {
    backgroundColor: 'rgba(239,131,84,0.16)',
  },
  tabGlyph: {
    color: '#8aa0b2',
    fontSize: 12,
    fontWeight: '800',
  },
  tabGlyphActive: {
    color: '#ffd6c2',
  },
  tabLabel: {
    color: '#8aa0b2',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#f8f2ea',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  switcherSheet: {
    gap: 10,
    padding: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#0d1d2a',
  },
  switcherTitle: {
    color: '#f8f2ea',
    fontSize: 20,
    fontWeight: '900',
  },
  switcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#102030',
  },
  switcherRowActive: {
    borderWidth: 1,
    borderColor: 'rgba(239,131,84,0.32)',
  },
  switcherName: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
  switcherMeta: {
    color: '#9fb0be',
    fontSize: 12,
  },
  secondaryFullButton: {
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#102030',
  },
  secondaryFullButtonLabel: {
    color: '#f8f2ea',
    fontWeight: '800',
  },
});
