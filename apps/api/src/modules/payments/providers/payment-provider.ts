export type PaymentSessionInput = {
  paymentId: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  successUrl: string;
  failureUrl: string;
  customerEmail?: string | null;
  customerIpAddress?: string | null;
  description: string;
};

export type PaymentSessionResult = {
  providerMode: 'GARANTI' | 'MOCK';
  checkout: {
    method: 'POST';
    actionUrl: string;
    fields: Record<string, string>;
  };
};

export interface PaymentProvider {
  createPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult>;
}
