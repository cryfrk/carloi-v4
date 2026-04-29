import type { AdminLoginResponse } from '@carloi-v4/types';
import { createContext, useContext, useMemo, useState } from 'react';

type AdminSession = AdminLoginResponse;

type AdminAuthContextValue = {
  session: AdminSession | null;
  signIn: (payload: AdminSession) => void;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      session,
      signIn: (payload) => setSession(payload),
      signOut: () => setSession(null),
    }),
    [session],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}