import { Ionicons } from '@expo/vector-icons';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import { mobileNotificationsApi } from '../lib/notifications-api';

const NAV_ITEMS = [
  { href: '/home', label: 'Anasayfa', icon: 'home-outline', activeIcon: 'home' },
  { href: '/listings', label: 'Ilanlar', icon: 'car-sport-outline', activeIcon: 'car-sport' },
  { href: '/loi-ai', label: 'Loi AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { href: '/garage', label: 'Garajim', icon: 'cube-outline', activeIcon: 'cube' },
  { href: '/profile', label: 'Profil', icon: 'person-circle-outline', activeIcon: 'person-circle' },
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
            <Text style={styles.eyebrow}>Carloi</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.headerActions}>
            {showPrimaryHeader ? (
              <>
                <Pressable onPress={() => router.push('/create')} style={styles.headerIconButton}>
                  <Ionicons color="#111111" name="add" size={20} />
                </Pressable>
                <Pressable onPress={() => router.push('/notifications')} style={styles.headerGhostButton}>
                  <Ionicons color="#111111" name="notifications-outline" size={18} />
                  {unreadCount > 0 ? <Text style={styles.inlineBadge}>{unreadCount}</Text> : null}
                </Pressable>
                <Pressable
                  onPress={() => router.push(pathname === '/profile' ? '/settings' : '/messages')}
                  style={styles.headerGhostButton}
                >
                  <Ionicons
                    color="#111111"
                    name={pathname === '/profile' ? 'menu-outline' : 'paper-plane-outline'}
                    size={18}
                  />
                </Pressable>
              </>
            ) : (
              <>
                {!pathname.startsWith('/messages') ? (
                  <Pressable onPress={() => router.push('/messages')} style={styles.headerGhostButton}>
                    <Ionicons color="#111111" name="paper-plane-outline" size={18} />
                  </Pressable>
                ) : null}
                {actionLabel && onActionPress ? (
                  <Pressable onPress={onActionPress} style={styles.headerIconButton}>
                    <Text style={styles.iconButtonText}>{actionLabel}</Text>
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
                accessibilityLabel={item.label}
                accessibilityRole="button"
                onLongPress={item.href === '/profile' ? () => setSwitcherVisible(true) : undefined}
                onPress={() => router.push(item.href)}
                style={styles.tabItem}
              >
                <View style={[styles.tabIconWrap, active ? styles.tabIconWrapActive : null]}>
                  <Ionicons
                    color={active ? '#111111' : '#54606c'}
                    name={active ? item.activeIcon : item.icon}
                    size={22}
                  />
                </View>
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
                    <Text style={styles.switcherMeta}>
                      {item.user.firstName} {item.user.lastName}
                    </Text>
                  </View>
                  <Text style={styles.switcherMeta}>{active ? 'Aktif' : 'Gec'}</Text>
                </Pressable>
              );
            })}
            <Pressable
              style={styles.secondaryFullButton}
              onPress={() => {
                setSwitcherVisible(false);
                router.push('/login');
              }}
            >
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
    backgroundColor: '#f6f7f8',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#111111',
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#f6f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: '#7a7f86',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#717780',
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  headerGhostButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8ebee',
    position: 'relative',
  },
  iconButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  inlineBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#111111',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e8ebee',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabIconWrapActive: {
    backgroundColor: '#111111',
  },
  tabLabel: {
    color: '#7a7f86',
    fontSize: 10,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#111111',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  switcherSheet: {
    gap: 10,
    padding: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
  },
  switcherTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
  },
  switcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f6f7f8',
  },
  switcherRowActive: {
    borderWidth: 1,
    borderColor: '#111111',
  },
  switcherName: {
    color: '#111111',
    fontWeight: '800',
  },
  switcherMeta: {
    color: '#7a7f86',
    fontSize: 12,
  },
  secondaryFullButton: {
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#111111',
  },
  secondaryFullButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
