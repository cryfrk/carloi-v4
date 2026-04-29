'use client';

import type {
  AuthTokens,
  AuthUser,
  LoginResponse,
  RefreshResponse,
  VerifyCodeResponse,
} from '@carloi-v4/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { webAuthApi } from '../lib/auth-api';

type AuthSession = AuthTokens & {
  user: AuthUser;
  syncedAt?: string;
};

type StoredAuthState = {
  activeUserId: string | null;
  sessions: AuthSession[];
};

type AuthContextValue = {
  session: AuthSession | null;
  sessions: AuthSession[];
  isReady: boolean;
  signIn: (payload: LoginResponse | VerifyCodeResponse | RefreshResponse) => void;
  switchAccount: (userId: string) => void;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
};

const STORAGE_KEY = 'carloi-v4-auth-sessions';
const REFRESH_INTERVAL_MS = 10 * 60_000;
const REFRESH_GRACE_MS = 60_000;
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const replaceSession = useCallback((nextSession: AuthSession) => {
    setSessions((current) => [
      nextSession,
      ...current.filter((item) => item.user.id !== nextSession.user.id),
    ]);
    setActiveUserId(nextSession.user.id);
  }, []);

  const removeSession = useCallback((userId: string) => {
    setSessions((current) => {
      const remainingSessions = current.filter((item) => item.user.id !== userId);

      setActiveUserId((currentActiveUserId) => {
        if (currentActiveUserId !== userId) {
          return currentActiveUserId;
        }

        return remainingSessions[0]?.user.id ?? null;
      });

      return remainingSessions;
    });
  }, []);

  useEffect(() => {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (rawState) {
      try {
        const parsed = JSON.parse(rawState) as StoredAuthState;
        setSessions(Array.isArray(parsed.sessions) ? parsed.sessions : []);
        setActiveUserId(parsed.activeUserId ?? parsed.sessions?.[0]?.user.id ?? null);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const payload: StoredAuthState = {
      activeUserId,
      sessions,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [activeUserId, isReady, sessions]);

  const session = useMemo(
    () => sessions.find((item) => item.user.id === activeUserId) ?? sessions[0] ?? null,
    [activeUserId, sessions],
  );

  const refreshSession = useCallback(
    async (targetSession: AuthSession | null, force = false) => {
      if (!targetSession) {
        return null;
      }

      const lastSyncedAt = targetSession.syncedAt ? Date.parse(targetSession.syncedAt) : 0;

      if (!force && lastSyncedAt && Date.now() - lastSyncedAt < REFRESH_GRACE_MS) {
        return targetSession;
      }

      try {
        const payload = await webAuthApi.refresh({
          refreshToken: targetSession.refreshToken,
        });
        const nextSession: AuthSession = {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
          syncedAt: new Date().toISOString(),
        };

        replaceSession(nextSession);
        return nextSession;
      } catch {
        removeSession(targetSession.user.id);
        return null;
      }
    },
    [removeSession, replaceSession],
  );

  useEffect(() => {
    if (!isReady || !session) {
      return;
    }

    const lastSyncedAt = session.syncedAt ? Date.parse(session.syncedAt) : 0;
    const shouldForceRefresh =
      !lastSyncedAt || Number.isNaN(lastSyncedAt) || Date.now() - lastSyncedAt >= REFRESH_GRACE_MS;

    if (shouldForceRefresh) {
      void refreshSession(session, true);
    }
  }, [isReady, refreshSession, session?.refreshToken, session?.syncedAt, session?.user.id]);

  useEffect(() => {
    if (!isReady || !session) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshSession(session);
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isReady, refreshSession, session?.refreshToken, session?.user.id]);

  useEffect(() => {
    if (!isReady || !session) {
      return;
    }

    const handleFocus = () => {
      void refreshSession(session, true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isReady, refreshSession, session?.refreshToken, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      sessions,
      isReady,
      signIn: (payload) => {
        const nextSession: AuthSession = {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          user: payload.user,
          syncedAt: new Date().toISOString(),
        };

        replaceSession(nextSession);
      },
      switchAccount: (userId) => {
        if (sessions.some((item) => item.user.id === userId)) {
          setActiveUserId(userId);
        }
      },
      signOut: async () => {
        const active = session;
        if (!active) {
          return;
        }

        removeSession(active.user.id);

        try {
          await webAuthApi.logout({ refreshToken: active.refreshToken });
        } catch {
          // Ignore client-side logout transport errors.
        }
      },
      signOutAll: async () => {
        const snapshot = [...sessions];
        setSessions([]);
        setActiveUserId(null);
        window.localStorage.removeItem(STORAGE_KEY);

        await Promise.all(
          snapshot.map(async (item) => {
            try {
              await webAuthApi.logout({ refreshToken: item.refreshToken });
            } catch {
              // Ignore client-side logout transport errors.
            }
          }),
        );
      },
    }),
    [isReady, removeSession, replaceSession, session, sessions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
