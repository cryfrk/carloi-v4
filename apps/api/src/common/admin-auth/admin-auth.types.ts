import type { AdminRole } from '@prisma/client';

export type AdminAuthTokenPayload = {
  sub: string;
  sessionId: string;
  type: 'admin-access' | 'admin-refresh';
  username?: string;
  role?: AdminRole;
};

export type AuthenticatedAdmin = {
  adminUserId: string;
  username?: string;
  role: AdminRole;
  sessionId: string;
};
