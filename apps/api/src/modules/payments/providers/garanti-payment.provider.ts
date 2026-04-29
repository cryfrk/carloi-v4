import { createHash } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentProvider, PaymentSessionInput, PaymentSessionResult } from './payment-provider';

type GarantiMode = 'test' | 'prod';

@Injectable()
export class GarantiPaymentProvider implements PaymentProvider {
  constructor(private readonly configService: ConfigService) {}

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
    const merchantId = this.getRequiredConfig('GARANTI_MERCHANT_ID');
    const terminalId = this.getRequiredConfig('GARANTI_TERMINAL_ID');
    const provisionUser = this.getRequiredConfig('GARANTI_PROVISION_USER');
    const provisionPassword = this.getRequiredConfig('GARANTI_PROVISION_PASSWORD');
    const storeKey = this.getRequiredConfig('GARANTI_STORE_KEY');
    const mode = this.getMode();
    const amount = this.toMinorUnits(input.amount);
    const txType = 'sales';
    const installmentCount = '';
    const currencyCode = this.resolveCurrencyCode(input.currency);
    const securityData = this.sha1Upper(
      `${provisionPassword}${terminalId.padStart(9, '0')}`,
    );
    const hashData = this.sha512Upper(
      `${terminalId}${input.paymentId}${amount}${currencyCode}${input.successUrl}${input.failureUrl}${txType}${installmentCount}${storeKey}${securityData}`,
    );

    return {
      providerMode: 'GARANTI',
      checkout: {
        method: 'POST',
        actionUrl:
          mode === 'test'
            ? 'https://sanalposprovtest.garantibbva.com.tr/servlet/gt3dengine'
            : 'https://sanalposprov.garantibbva.com.tr/servlet/gt3dengine',
        fields: {
          apiversion: '512',
          mode: mode === 'test' ? 'TEST' : 'PROD',
          terminalid: terminalId,
          terminalmerchantid: merchantId,
          terminalprovuserid: provisionUser,
          terminaluserid: 'PROVAUT',
          txntype: txType,
          txnamount: amount,
          txncurrencycode: currencyCode,
          txninstallmentcount: installmentCount,
          orderid: input.paymentId,
          successurl: input.successUrl,
          errorurl: input.failureUrl,
          customeremailaddress: input.customerEmail ?? '',
          customeripaddress: input.customerIpAddress ?? '',
          lang: 'tr',
          secure3dsecuritylevel: '3D_PAY',
          txntimestamp: new Date().toISOString(),
          companyname: 'Carloi V4',
          refreshtime: '5',
          secure3dhash: hashData,
        },
      },
    };
  }

  private getMode(): GarantiMode {
    const rawMode = this.configService.get<string>('GARANTI_MODE')?.trim().toLowerCase();
    return rawMode === 'prod' ? 'prod' : 'test';
  }

  private resolveCurrencyCode(currency: string) {
    const normalized = currency.trim().toUpperCase();
    return normalized === 'TRY' ? '949' : normalized;
  }

  private toMinorUnits(amount: number) {
    return Math.round(amount * 100).toString();
  }

  private sha1Upper(value: string) {
    return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
  }

  private sha512Upper(value: string) {
    return createHash('sha512').update(value, 'utf8').digest('hex').toUpperCase();
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new InternalServerErrorException('Garanti odeme ayarlari eksik.');
    }

    return value;
  }
}
