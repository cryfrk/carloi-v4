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
import { isMobileApiDebugEnabled, MOBILE_API_BASE_URL } from './api-base-url';

export class AuthApiError extends Error {
  verificationRequired?: boolean;
  code?: string;
}

async function postJson<TRequest extends object, TResponse>(path: string, body: TRequest) {
  const url = `${MOBILE_API_BASE_URL}${path}`;

  if (isMobileApiDebugEnabled()) {
    console.info(`[carloi:mobile:auth] POST ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-device-name': 'carloi-mobile',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const error = new AuthApiError(
        typeof payload.message === 'string'
          ? payload.message
          : 'Islem tamamlanamadi.',
      );

      if (typeof payload.verificationRequired === 'boolean') {
        error.verificationRequired = payload.verificationRequired;
      }

      if (typeof payload.code === 'string') {
        error.code = payload.code;
      }

      throw error;
    }

    return payload as TResponse;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    const networkError = new AuthApiError(
      'Baglanti kurulamadı. API yanit vermiyor veya erisim engellendi.',
    );
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }
}

export const mobileAuthApi = {
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

