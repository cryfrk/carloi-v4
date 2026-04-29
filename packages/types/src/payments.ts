import type { PaymentStatus } from './enums';

export interface PaymentCheckoutPayload {
  method: 'POST';
  actionUrl: string;
  fields: Record<string, string>;
}

export interface CreateInsurancePaymentResponse {
  success: true;
  paymentId: string;
  paymentStatus: PaymentStatus;
  providerMode: 'GARANTI' | 'MOCK';
  checkout: PaymentCheckoutPayload;
  resultUrl: string;
  successUrl: string;
  failureUrl: string;
}

export interface PaymentResultResponse {
  paymentId: string;
  status: PaymentStatus;
  provider: string;
  amount: number;
  currency: string;
  insuranceRequestId: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  listing: {
    id: string;
    title: string;
    listingNo: string;
  } | null;
  documents: Array<{
    id: string;
    documentType: string;
    fileUrl: string;
  }>;
}
