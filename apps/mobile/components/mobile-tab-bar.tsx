import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
    href: '/loi-ai',
    label: 'Loi AI',
    icon: 'sparkles-outline',
    activeIcon: 'sparkles',
    matchPrefixes: ['/loi-ai'],
    special: true,
  },
  {
    href: '/garage',
    label: 'Garajim',
    icon: 'cube-outline',
    activeIcon: 'cube',
    matchPrefixes: ['/garage'],
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: 'person-circle-outline',
    activeIcon: 'person-circle',
    matchPrefixes: ['/profile', '/settings', '/saved'],
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
  const activeScale = item.special ? 1.02 : 1.05;
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
          toValue: item.special ? 0.95 : 0.96,
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
            size={item.special ? 23 : 21}
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
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: mobileTheme.colors.border,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  itemPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 42,
  },
  itemPressableSpecial: {
    flex: 0,
    marginTop: -10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#f3f5f8',
  },
  iconWrapSpecial: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: mobileTheme.colors.accent,
  },
  avatarTab: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTabActive: {
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  avatarInner: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  avatarInnerActive: {
    backgroundColor: mobileTheme.colors.accent,
  },
  avatarLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 10,
    fontWeight: '800',
  },
  avatarLabelActive: {
    color: mobileTheme.colors.white,
  },
});
