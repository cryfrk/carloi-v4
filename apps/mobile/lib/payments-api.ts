import type {
  CreateInsurancePaymentResponse,
  PaymentResultResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class PaymentsApiError extends Error {}

async function parseJson<TResponse>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new PaymentsApiError(
      typeof payload.message === 'string' ? payload.message : 'Odeme islemi tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const mobilePaymentsApi = {
  async createInsurancePayment(accessToken: string, requestId: string) {
    const response = await fetch(`${API_BASE_URL}/payments/insurance/${requestId}/create`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-device-name': 'carloi-mobile',
      },
    });

    return parseJson<CreateInsurancePaymentResponse>(response);
  },
  async getPaymentResult(paymentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/payments/garanti/result?paymentId=${encodeURIComponent(paymentId)}`,
    );

    return parseJson<PaymentResultResponse>(response);
  },
  async submitMockPayment(fields: Record<string, string>) {
    const params = new URLSearchParams({
      ...fields,
      mockClient: 'json',
    });
    const response = await fetch(`${API_BASE_URL}/payments/garanti/callback`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: params.toString(),
    });

    return parseJson<{
      success: boolean;
      paymentId: string;
      paymentStatus: string;
      resultUrl: string;
      failureReason: string | null;
    }>(response);
  },
};
