import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentProvider, PaymentSessionInput, PaymentSessionResult } from './payment-provider';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly configService: ConfigService) {}

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
    const providerTransactionId = `MOCK-${input.paymentId}`;
    const signature = this.createSignature(input.paymentId, 'success', providerTransactionId);

    return {
      providerMode: 'MOCK',
      checkout: {
        method: 'POST',
        actionUrl: input.callbackUrl,
        fields: {
          mock: '1',
          paymentId: input.paymentId,
          outcome: 'success',
          providerTransactionId,
          signature,
        },
      },
    };
  }

  createSignature(paymentId: string, outcome: string, providerTransactionId: string) {
    return createHmac('sha256', this.getSecret())
      .update(`${paymentId}:${outcome}:${providerTransactionId}`)
      .digest('hex');
  }

  private getSecret() {
    return (
      this.configService.get<string>('GARANTI_STORE_KEY')?.trim() ||
      this.configService.get<string>('JWT_ACCESS_SECRET')?.trim() ||
      'carloi-v4-mock-payment'
    );
  }
}
