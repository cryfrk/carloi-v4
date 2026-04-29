import type {
  CreateInsurancePaymentResponse,
  PaymentResultResponse,
} from '@carloi-v4/types';

import { WEB_API_BASE_URL } from './api-base-url';

const API_BASE_URL = WEB_API_BASE_URL;

export class PaymentsApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST';
  accessToken?: string;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.accessToken
        ? {
            authorization: `Bearer ${options.accessToken}`,
            'x-device-name': 'carloi-web',
          }
        : {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new PaymentsApiError(
      typeof payload.message === 'string' ? payload.message : 'Odeme islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const webPaymentsApi = {
  createInsurancePayment(accessToken: string, requestId: string) {
    return requestJson<CreateInsurancePaymentResponse>(`/payments/insurance/${requestId}/create`, {
      method: 'POST',
      accessToken,
    });
  },
  getPaymentResult(paymentId: string) {
    return requestJson<PaymentResultResponse>(`/payments/garanti/result?paymentId=${encodeURIComponent(paymentId)}`, {
      method: 'GET',
    });
  },
};

