import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileTheme } from '../lib/design-system';

type MobileTabBarProps = {
  pathname: string;
  profileInitial: string;
  onProfileLongPress?: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  matchPrefixes: string[];
  special?: boolean;
  profile?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/home',
    label: 'Anasayfa',
    icon: 'home-outline',
    activeIcon: 'home',
    matchPrefixes: ['/home', '/posts'],
  },
  {
    href: '/listings',
    label: 'Ilanlar',
    icon: 'car-outline',
    activeIcon: 'car',
    matchPrefixes: ['/listings'],
  },
  {
    href: '/explore',
    label: 'Kesfet',
    icon: 'play-circle-outline',
    activeIcon: 'play-circle',
    matchPrefixes: ['/explore'],
    special: true,
  },
  {
    href: '/loi-ai',
    label: 'Loi AI',
    icon: 'sparkles-outline',
    activeIcon: 'sparkles',
    matchPrefixes: ['/loi-ai'],
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle',
    matchPrefixes: ['/profile', '/settings', '/saved', '/vehicles'],
    profile: true,
  },
];

function isActiveRoute(pathname: string, item: NavItem) {
  return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function MobileTabBarItem({
  item,
  active,
  profileInitial,
  onLongPress,
}: {
  item: NavItem;
  active: boolean;
  profileInitial: string;
  onLongPress?: () => void;
}) {
  const router = useRouter();
  const activeScale = item.special ? 1.04 : 1.05;
  const scale = useRef(new Animated.Value(active ? activeScale : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? activeScale : 1,
      ...mobileTheme.spring,
      useNativeDriver: true,
    }).start();
  }, [active, activeScale, scale]);

  const settle = () => {
    Animated.spring(scale, {
      toValue: active ? activeScale : 1,
      ...mobileTheme.spring,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      hitSlop={10}
      onLongPress={item.profile ? onLongPress : undefined}
      onPress={() => router.push(item.href)}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.96,
          damping: 18,
          stiffness: 300,
          mass: 0.72,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={settle}
      style={[styles.itemPressable, item.special ? styles.itemPressableSpecial : null]}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          item.special ? styles.iconWrapSpecial : null,
          active && !item.special ? styles.iconWrapActive : null,
          { transform: [{ scale }] },
        ]}
      >
        {item.profile ? (
          <View style={[styles.avatarTab, active ? styles.avatarTabActive : null]}>
            <View style={[styles.avatarInner, active ? styles.avatarInnerActive : null]}>
              <Animated.Text style={[styles.avatarLabel, active ? styles.avatarLabelActive : null]}>
                {profileInitial}
              </Animated.Text>
            </View>
          </View>
        ) : (
          <Ionicons
            color={item.special ? mobileTheme.colors.white : active ? mobileTheme.colors.textStrong : mobileTheme.colors.textMuted}
            name={active ? item.activeIcon : item.icon}
            size={item.special ? 22 : 20}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function MobileTabBar({ pathname, profileInitial, onProfileLongPress }: MobileTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {NAV_ITEMS.map((item) => (
          <MobileTabBarItem
            key={item.href}
            item={item}
            active={isActiveRoute(pathname, item)}
            onLongPress={onProfileLongPress}
            profileInitial={profileInitial}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 18,
    minHeight: 58,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: mobileTheme.colors.border,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  itemPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 40,
  },
  itemPressableSpecial: {
    flex: 0,
    marginTop: -8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#f4f6f8',
  },
  iconWrapSpecial: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: mobileTheme.colors.textStrong,
  },
  avatarTab: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTabActive: {
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  avatarInner: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  avatarInnerActive: {
    backgroundColor: mobileTheme.colors.textStrong,
  },
  avatarLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 9,
    fontWeight: '800',
  },
  avatarLabelActive: {
    color: mobileTheme.colors.white,
  },
});

