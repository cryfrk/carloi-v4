import { createHash, createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CallbackParams = Record<string, string | string[] | undefined>;

export type CallbackVerificationResult = {
  paymentId: string | null;
  providerTransactionId: string | null;
  verified: boolean;
  approved: boolean;
  failureReason: string | null;
  metadata: Record<string, string | string[] | undefined>;
  redirectStatus: 'success' | 'failure';
};

@Injectable()
export class GarantiCallbackVerificationService {
  constructor(private readonly configService: ConfigService) {}

  verify(params: CallbackParams): CallbackVerificationResult {
    if (this.read(params, 'mock') === '1') {
      return this.verifyMock(params);
    }

    return this.verifyGaranti(params);
  }

  private verifyMock(params: CallbackParams): CallbackVerificationResult {
    const paymentId = this.read(params, 'paymentId');
    const outcome = this.read(params, 'outcome') ?? 'failure';
    const providerTransactionId =
      this.read(params, 'providerTransactionId') ?? `MOCK-${paymentId ?? 'unknown'}`;
    const signature = this.read(params, 'signature');
    const expected = createHmac('sha256', this.getSecret())
      .update(`${paymentId}:${outcome}:${providerTransactionId}`)
      .digest('hex');
    const verified = Boolean(paymentId && signature && signature === expected);

    return {
      paymentId,
      providerTransactionId,
      verified,
      approved: verified && outcome === 'success',
      failureReason: verified && outcome === 'success' ? null : 'Mock odeme basarisiz.',
      metadata: params,
      redirectStatus: verified && outcome === 'success' ? 'success' : 'failure',
    };
  }

  private verifyGaranti(params: CallbackParams): CallbackVerificationResult {
    const hashParams = this.read(params, 'hashparams');
    const hashParamsValue = this.read(params, 'hashparamsval');
    const hashValue =
      this.read(params, 'hash') ??
      this.read(params, 'secure3dhash') ??
      this.read(params, 'hashval');
    const calculatedHash =
      hashParamsValue && this.getStoreKey()
        ? createHash('sha512')
            .update(`${hashParamsValue}${this.getStoreKey()}`, 'utf8')
            .digest('hex')
            .toUpperCase()
        : null;
    const paymentId = this.read(params, 'orderid') ?? this.read(params, 'oid');
    const providerTransactionId =
      this.read(params, 'authcode') ??
      this.read(params, 'hostrefnum') ??
      this.read(params, 'transid') ??
      paymentId;
    const mdStatus = this.read(params, 'mdstatus');
    const procReturnCode = this.read(params, 'procreturncode');
    const response = this.read(params, 'response');
    const verified =
      Boolean(hashParams && hashParamsValue && hashValue && calculatedHash) &&
      hashValue?.toUpperCase() === calculatedHash;
    const approved =
      verified &&
      procReturnCode === '00' &&
      ['approved', 'success'].includes((response ?? '').toLowerCase()) &&
      ['1', '2', '3', '4'].includes(mdStatus ?? '');

    return {
      paymentId,
      providerTransactionId,
      verified,
      approved,
      failureReason: approved
        ? null
        : procReturnCode && procReturnCode !== '00'
          ? `Garanti islem kodu: ${procReturnCode}`
          : verified
            ? 'Garanti odemesi onaylanmadi.'
            : 'Garanti callback dogrulamasi basarisiz.',
      metadata: params,
      redirectStatus: approved ? 'success' : 'failure',
    };
  }

  private read(params: CallbackParams, key: string) {
    const direct = params[key];
    const lower = params[key.toLowerCase()];
    const upper = params[key.toUpperCase()];
    const value = direct ?? lower ?? upper;

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }

  private getStoreKey() {
    return this.configService.get<string>('GARANTI_STORE_KEY')?.trim() ?? '';
  }

  private getSecret() {
    return (
      this.getStoreKey() ||
      this.configService.get<string>('JWT_ACCESS_SECRET')?.trim() ||
      'carloi-v4-mock-payment'
    );
  }
}
