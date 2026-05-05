import { Ionicons } from '@expo/vector-icons';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import { mobileTheme } from '../lib/design-system';
import { mobileNotificationsApi } from '../lib/notifications-api';
import { CreateActionSheet } from './create-action-sheet';
import { MobileTabBar } from './mobile-tab-bar';

export function MobileShell({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, sessions, isReady, switchAccount } = useAuth();
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);

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
  const canGoBack = useMemo(
    () =>
      !['/home', '/listings', '/explore', '/loi-ai', '/profile'].includes(pathname),
    [pathname],
  );
  const headerTitle = useMemo(() => {
    if (pathname === '/home') {
      return 'Carloi';
    }
    if (pathname === '/listings') {
      return 'Ilanlar';
    }
    if (pathname === '/explore') {
      return 'Kesfet';
    }
    if (pathname === '/loi-ai') {
      return 'Loi AI';
    }
    if (pathname === '/profile') {
      return `@${session?.user.username ?? 'profil'}`;
    }
    if (pathname.startsWith('/messages')) {
      return title;
    }
    return title;
  }, [pathname, session?.user.username, title]);

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
            <View style={styles.headerLeading}>
              {canGoBack ? (
                <Pressable onPress={() => router.back()} style={styles.slimHeaderButton}>
                  <Ionicons color="#111111" name="chevron-back" size={20} />
                </Pressable>
              ) : null}
              <Text numberOfLines={1} style={styles.title}>
                {headerTitle}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {showPrimaryHeader ? (
                <>
                  <Pressable onPress={() => setCreateSheetVisible(true)} style={styles.slimHeaderButton}>
                    <Ionicons color="#111111" name="add-circle-outline" size={21} />
                  </Pressable>
                  <Pressable onPress={() => router.push('/notifications')} style={styles.slimHeaderButton}>
                    <Ionicons color="#111111" name="heart-outline" size={20} />
                    {unreadCount > 0 ? <Text style={styles.inlineBadge}>{unreadCount}</Text> : null}
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(pathname === '/profile' ? '/settings' : '/messages')}
                    style={styles.slimHeaderButton}
                  >
                    <Ionicons
                      color="#111111"
                      name={pathname === '/profile' ? 'menu-outline' : 'paper-plane-outline'}
                      size={19}
                    />
                  </Pressable>
                </>
              ) : (
                <>
                  {!pathname.startsWith('/messages') ? (
                    <Pressable onPress={() => router.push('/messages')} style={styles.slimHeaderButton}>
                      <Ionicons color="#111111" name="paper-plane-outline" size={19} />
                    </Pressable>
                  ) : null}
                  {actionLabel && onActionPress ? (
                    <Pressable onPress={onActionPress} style={styles.headerTextAction}>
                      <Text style={styles.headerTextActionLabel}>{actionLabel}</Text>
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
      <CreateActionSheet onClose={() => setCreateSheetVisible(false)} visible={createSheetVisible} />

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
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
    backgroundColor: mobileTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#edf0f3',
  },
  headerLeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#111111',
    fontSize: 19,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  slimHeaderButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  headerTextAction: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f4f6f8',
  },
  headerTextActionLabel: {
    color: '#111111',
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
    paddingHorizontal: mobileTheme.spacing.md,
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
