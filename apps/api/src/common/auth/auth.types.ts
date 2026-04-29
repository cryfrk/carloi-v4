export type AuthTokenPayload = {
  sub: string;
  sessionId: string;
  type: 'access' | 'refresh';
  username?: string;
};

export type AuthenticatedUser = {
  userId: string;
  username?: string;
  sessionId: string;
};
