import { UserType, VerificationChannel } from './enums';

export interface AuthUser {
  id: string;
  userType: UserType;
  email?: string | null;
  phone?: string | null;
  username: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  isCommercialApproved: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  userType: UserType;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  tcIdentityNo?: string;
  companyTitle?: string;
  taxNumber?: string;
}

export interface RegisterResponse {
  success: true;
  verificationRequired: true;
  user: AuthUser;
}

export interface SendVerificationCodeRequest {
  identifier: string;
  channel: VerificationChannel;
}

export interface GenericMessageResponse {
  success: boolean;
  message?: string;
}

export interface VerifyCodeRequest {
  identifier: string;
  code: string;
}

export interface VerifyCodeResponse extends AuthTokens {
  user: AuthUser;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse extends AuthTokens {
  user: AuthUser;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  newPassword: string;
}

export interface AuthErrorResponse {
  message: string;
  verificationRequired?: boolean;
}

export interface AuthSessionDevice {
  id: string;
  deviceName: string | null;
  platform: string | null;
  userAgent: string | null;
  ip: string | null;
  approximateLocation: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface AuthSessionsResponse {
  items: AuthSessionDevice[];
}

export interface RevokeAuthSessionResponse {
  success: true;
  revokedSessionId: string;
}
