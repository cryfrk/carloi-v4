'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth-provider';
import { webNotificationsApi } from '../lib/notifications-api';

const NAV_ITEMS = [
  { href: '/', label: 'Anasayfa', meta: 'Feed' },
  { href: '/listings', label: 'Ilanlar', meta: 'Cars' },
  { href: '/messages', label: 'Mesajlar', meta: 'DM' },
  { href: '/loi-ai', label: 'Loi AI', meta: 'Assist' },
  { href: '/create', label: 'Olustur', meta: 'New' },
  { href: '/notifications', label: 'Bildirimler', meta: 'Alerts' },
  { href: '/garage', label: 'Garajim', meta: 'Garage' },
  { href: '/profile', label: 'Profil', meta: 'Me' },
  { href: '/settings', label: 'Ayarlar', meta: 'Config' },
] as const;

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

  const activeAccounts = useMemo(() => sessions.slice(0, 3), [sessions]);

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <div className="brand-kicker">Carloi V4</div>
          <h1 className="brand-title">Drive the network.</h1>
          <p className="brand-copy">
            Sosyal feed, arac kesfi ve operasyonel akislar tek bir deneyimde bulusuyor.
          </p>
        </div>
        <div className="shell-session">
          {isReady && session ? (
            <>
              <div className="session-copy">
                <strong>@{session.user.username}</strong>
                <span>{session.user.userType === 'COMMERCIAL' ? 'Ticari hesap' : 'Bireysel hesap'}</span>
              </div>
              <div className="account-chip-row">
                {activeAccounts.map((item) => (
                  <button key={item.user.id} className={`account-chip ${item.user.id === session.user.id ? 'active' : ''}`} type="button" onClick={() => switchAccount(item.user.id)}>
                    @{item.user.username}
                  </button>
                ))}
              </div>
              <button
                className="session-button"
                type="button"
                onClick={() => {
                  void signOut().then(() => router.push('/login'));
                }}
              >
                Cikis yap
              </button>
            </>
          ) : (
            <div className="auth-nav auth-nav-inline">
              <Link className="session-link" href="/login">Giris yap</Link>
              <Link className="session-link" href="/register">Uye ol</Link>
            </div>
          )}
        </div>
      </header>

      {session ? (
        <div className="top-action-strip">
          <Link className="action-strip-link" href="/create">Olustur</Link>
          <Link className="action-strip-link" href="/notifications">Bildirimler{unreadCount > 0 ? ` (${unreadCount})` : ''}</Link>
          <Link className="action-strip-link" href={pathname === '/profile' ? '/settings' : '/messages'}>{pathname === '/profile' ? 'Ayarlar' : 'Mesajlar'}</Link>
        </div>
      ) : null}

      <main className="content">{children}</main>

      <nav className="dock-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} className="dock-link" href={item.href} data-active={isActive}>
              <span className="dock-label">{item.label}</span>
              <span className="dock-meta">{item.meta}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
