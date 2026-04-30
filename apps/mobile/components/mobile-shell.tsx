import { Ionicons } from '@expo/vector-icons';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileNotificationsApi } from '../lib/notifications-api';
import { MobileTabBar } from './mobile-tab-bar';

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

        <MobileTabBar
          onProfileLongPress={() => setSwitcherVisible(true)}
          pathname={pathname}
          profileInitial={session.user.username.slice(0, 1).toUpperCase()}
        />
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
    backgroundColor: mobileTheme.colors.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: mobileTheme.colors.text,
  },
  container: {
    flex: 1,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: mobileTheme.colors.background,
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
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
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
    borderRadius: mobileTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.accent,
    ...mobileTheme.shadow,
  },
  headerGhostButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: mobileTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    position: 'relative',
  },
  iconButtonText: {
    color: mobileTheme.colors.white,
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
    backgroundColor: mobileTheme.colors.accent,
    color: mobileTheme.colors.white,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: mobileTheme.colors.overlay,
  },
  switcherSheet: {
    gap: 10,
    padding: 22,
    borderTopLeftRadius: mobileTheme.radius.xxl,
    borderTopRightRadius: mobileTheme.radius.xxl,
    backgroundColor: mobileTheme.colors.surface,
  },
  switcherTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 20,
    fontWeight: '800',
  },
  switcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  switcherRowActive: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.accent,
  },
  switcherName: {
    color: mobileTheme.colors.textStrong,
    fontWeight: '800',
  },
  switcherMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  secondaryFullButton: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.lg,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.accent,
  },
  secondaryFullButtonLabel: {
    color: mobileTheme.colors.white,
    fontWeight: '800',
  },
});
