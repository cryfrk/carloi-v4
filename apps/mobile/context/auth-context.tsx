import type {
  AuthTokens,
  AuthUser,
  LoginResponse,
  RefreshResponse,
  VerifyCodeResponse,
} from '@carloi-v4/types';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { mobileAuthApi } from '../lib/auth-api';

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

const STORAGE_KEY = 'carloi-v4-mobile-auth-sessions';
const REFRESH_INTERVAL_MS = 10 * 60_000;
const REFRESH_GRACE_MS = 60_000;
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
let memoryVault: Record<string, string | null> = {};

const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return typeof window === 'undefined'
        ? memoryVault[key] ?? null
        : window.localStorage.getItem(key);
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryVault[key] ?? null;
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        memoryVault[key] = value;
      } else {
        window.localStorage.setItem(key, value);
      }

      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryVault[key] = value;
    }
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        delete memoryVault[key];
      } else {
        window.localStorage.removeItem(key);
      }

      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      delete memoryVault[key];
    }
  },
};

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
    void (async () => {
      try {
        const raw = await authStorage.getItem(STORAGE_KEY);

        if (raw) {
          const parsed = JSON.parse(raw) as StoredAuthState;
          setSessions(Array.isArray(parsed.sessions) ? parsed.sessions : []);
          setActiveUserId(parsed.activeUserId ?? parsed.sessions?.[0]?.user.id ?? null);
        }
      } catch {
        await authStorage.deleteItem(STORAGE_KEY).catch(() => undefined);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const payload: StoredAuthState = {
      activeUserId,
      sessions,
    };

    void authStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
        const payload = await mobileAuthApi.refresh({
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

    const interval = setInterval(() => {
      void refreshSession(session);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
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
          await mobileAuthApi.logout({ refreshToken: active.refreshToken });
        } catch {
          // Ignore client-side logout transport errors.
        }
      },
      signOutAll: async () => {
        const snapshot = [...sessions];
        setSessions([]);
        setActiveUserId(null);

        await Promise.all(
          snapshot.map(async (item) => {
            try {
              await mobileAuthApi.logout({ refreshToken: item.refreshToken });
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
