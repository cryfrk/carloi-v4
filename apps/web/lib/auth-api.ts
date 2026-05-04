import type {
  AuthSessionsResponse,
  ForgotPasswordRequest,
  GenericMessageResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  RevokeAuthSessionResponse,
  ResetPasswordRequest,
  SendVerificationCodeRequest,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from '@carloi-v4/types';
import { isWebApiDebugEnabled, WEB_API_BASE_URL } from './api-base-url';

export class AuthApiError extends Error {
  verificationRequired?: boolean;
  code?: string;
}

async function postJson<TRequest extends object, TResponse>(path: string, body: TRequest) {
  const url = `${WEB_API_BASE_URL}${path}`;

  if (isWebApiDebugEnabled()) {
    console.info(`[carloi:web:auth] POST ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-device-name': 'carloi-web',
        'x-platform': 'web',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const message =
        typeof payload.message === 'string'
          ? payload.message
          : response.status >= 500
            ? 'API yanit vermiyor. Lutfen biraz sonra tekrar deneyin.'
            : 'Islem tamamlanamadi.';
      const error = new AuthApiError(message);

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
      'Baglanti kurulamadi. API yanit vermiyor veya erisim engellendi.',
    );
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }
}

async function authorizedJson<TResponse>(
  path: string,
  accessToken: string,
  method: 'GET' | 'DELETE' = 'GET',
) {
  const url = `${WEB_API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-device-name': 'carloi-web',
        'x-platform': 'web',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new AuthApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
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
  getSessions(accessToken: string) {
    return authorizedJson<AuthSessionsResponse>('/auth/sessions', accessToken);
  },
  revokeSession(accessToken: string, sessionId: string) {
    return authorizedJson<RevokeAuthSessionResponse>(`/auth/sessions/${sessionId}`, accessToken, 'DELETE');
  },
};

