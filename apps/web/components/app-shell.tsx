'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './auth-provider';
import { webNotificationsApi } from '../lib/notifications-api';
import {
  BellIcon,
  CarIcon,
  GarageIcon,
  HomeIcon,
  MessageIcon,
  PlusIcon,
  SettingsIcon,
  SparkIcon,
} from './app-icons';

type NavItem = {
  href: string;
  label: string;
  matchPrefixes: string[];
  special?: boolean;
  renderIcon: (active: boolean) => ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Anasayfa',
    matchPrefixes: ['/', '/posts'],
    renderIcon: (active) => <HomeIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/listings',
    label: 'Ilanlar',
    matchPrefixes: ['/listings'],
    renderIcon: (active) => <CarIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/messages',
    label: 'Mesajlar',
    matchPrefixes: ['/messages'],
    renderIcon: (active) => <MessageIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/loi-ai',
    label: 'Loi AI',
    matchPrefixes: ['/loi-ai'],
    special: true,
    renderIcon: (active) => <SparkIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/create',
    label: 'Olustur',
    matchPrefixes: ['/create'],
    renderIcon: (active) => <PlusIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/notifications',
    label: 'Bildirimler',
    matchPrefixes: ['/notifications'],
    renderIcon: (active) => <BellIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/garage',
    label: 'Garajim',
    matchPrefixes: ['/garage'],
    renderIcon: (active) => <GarageIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
  {
    href: '/profile',
    label: 'Profil',
    matchPrefixes: ['/profile', '/saved'],
    renderIcon: (active) => (
      <span className={`dock-profile-dot${active ? ' active' : ''}`}>P</span>
    ),
  },
  {
    href: '/settings',
    label: 'Ayarlar',
    matchPrefixes: ['/settings'],
    renderIcon: (active) => <SettingsIcon className={`dock-icon${active ? ' active' : ''}`} filled={active} />,
  },
];

function isNavActive(pathname: string, item: NavItem) {
  return item.matchPrefixes.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/';
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function AvatarInitial({ username }: { username: string }) {
  return <span className="session-avatar">{username.slice(0, 1).toUpperCase()}</span>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, sessions, signOut, switchAccount, isReady } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void webNotificationsApi
      .getNotifications(session.accessToken)
      .then((response) => setUnreadCount(response.unreadCount))
      .catch(() => undefined);
  }, [pathname, session?.accessToken]);

  const quickActionHref = pathname === '/profile' ? '/settings' : '/messages';
  const quickActionLabel = pathname === '/profile' ? 'Ayarlar' : 'Mesajlar';
  const activeAccounts = useMemo(() => sessions.slice(0, 3), [sessions]);

  if (!session) {
    return <div className="public-shell">{children}</div>;
  }

  return (
    <div className="app-shell">
      <header className="compact-topbar">
        <div className="compact-brand">
          <Link className="compact-logo" href="/">
            <span className="compact-logo-mark">C</span>
            <span className="compact-logo-text">Carloi</span>
          </Link>
          <div className="compact-brand-copy">
            <strong>@{session.user.username}</strong>
            <span>{session.user.userType === 'COMMERCIAL' ? 'Ticari hesap' : 'Bireysel hesap'}</span>
          </div>
        </div>

        <div className="compact-topbar-actions">
          <div className="account-chip-row">
            {activeAccounts.map((item) => (
              <button
                key={item.user.id}
                className={`account-chip ${item.user.id === session.user.id ? 'active' : ''}`}
                type="button"
                onClick={() => switchAccount(item.user.id)}
              >
                <AvatarInitial username={item.user.username} />
                <span>@{item.user.username}</span>
              </button>
            ))}
          </div>

          <div className="topbar-icon-row">
            <Link aria-label="Olustur" className="topbar-icon-button" href="/create">
              <PlusIcon className="topbar-icon" />
            </Link>
            <Link aria-label="Bildirimler" className="topbar-icon-button" href="/notifications">
              <BellIcon className="topbar-icon" />
              {unreadCount > 0 ? <span className="topbar-badge">{unreadCount}</span> : null}
            </Link>
            <Link aria-label={quickActionLabel} className="topbar-icon-button" href={quickActionHref}>
              {pathname === '/profile' ? (
                <SettingsIcon className="topbar-icon" />
              ) : (
                <MessageIcon className="topbar-icon" />
              )}
            </Link>
            <button
              aria-label="Cikis yap"
              className="topbar-signout"
              type="button"
              onClick={() => {
                void signOut().then(() => router.push('/login'));
              }}
            >
              Cikis
            </button>
          </div>
        </div>
      </header>

      <main className="content">{children}</main>

      <nav className="dock-nav compact" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavActive(pathname, item);

          return (
            <Link
              key={item.href}
              aria-label={item.label}
              className={`dock-link compact${item.special ? ' special' : ''}`}
              data-active={isActive}
              href={item.href}
              title={item.label}
            >
              {item.href === '/profile' ? (
                <span className={`dock-profile-dot${isActive ? ' active' : ''}`}>
                  {session.user.username.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                item.renderIcon(isActive)
              )}
              <span className="dock-tooltip">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
