import type {
  ForgotPasswordRequest,
  GenericMessageResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  SendVerificationCodeRequest,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class AuthApiError extends Error {
  verificationRequired?: boolean;
}

async function postJson<TRequest extends object, TResponse>(path: string, body: TRequest) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'carloi-web',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const error = new AuthApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );

    if (typeof payload.verificationRequired === 'boolean') {
      error.verificationRequired = payload.verificationRequired;
    }

    throw error;
  }

  return payload as TResponse;
}

export const webAuthApi = {
  register(body: RegisterRequest) {
    return postJson<RegisterRequest, RegisterResponse>('/auth/register', body);
  },
  sendVerificationCode(body: SendVerificationCodeRequest) {
    return postJson<SendVerificationCodeRequest, GenericMessageResponse>(
      '/auth/send-verification-code',
      body,
    );
  },
  verifyCode(body: VerifyCodeRequest) {
    return postJson<VerifyCodeRequest, VerifyCodeResponse>('/auth/verify-code', body);
  },
  login(body: LoginRequest) {
    return postJson<LoginRequest, LoginResponse>('/auth/login', body);
  },
  refresh(body: RefreshRequest) {
    return postJson<RefreshRequest, RefreshResponse>('/auth/refresh', body);
  },
  logout(body: LogoutRequest) {
    return postJson<LogoutRequest, GenericMessageResponse>('/auth/logout', body);
  },
  forgotPassword(body: ForgotPasswordRequest) {
    return postJson<ForgotPasswordRequest, GenericMessageResponse>('/auth/forgot-password', body);
  },
  resetPassword(body: ResetPasswordRequest) {
    return postJson<ResetPasswordRequest, GenericMessageResponse>('/auth/reset-password', body);
  },
};
