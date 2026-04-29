import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationCodePurpose, VerificationTargetType } from '@prisma/client';
import {
  BREVO_EMAIL_ENDPOINT,
  BREVO_SMS_ENDPOINT,
  VerificationChannel,
} from './auth.constants';

type DispatchCodeInput = {
  channel: VerificationChannel;
  targetType: VerificationTargetType;
  targetValue: string;
  code: string;
  purpose: VerificationCodePurpose;
  firstName: string;
};

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly developmentCodes = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  async sendCode(input: DispatchCodeInput) {
    const apiKey = this.getApiKey();
    const isProduction = process.env.NODE_ENV === 'production';

    if (!apiKey) {
      if (!isProduction) {
        const key = this.getMemoryKey(input.targetValue, input.purpose);
        this.developmentCodes.set(key, input.code);
        this.logger.debug(
          `[Carloi Auth Debug] ${input.purpose} code for ${input.targetValue}: ${input.code}`,
        );
        return;
      }

      throw new InternalServerErrorException(
        'Dogrulama servisi su anda kullanilamiyor. Lutfen daha sonra tekrar deneyin.',
      );
    }

    try {
      if (input.channel === VerificationChannel.EMAIL) {
        await this.sendEmail(apiKey, input);
        return;
      }

      await this.sendSms(apiKey, input);
    } catch (error) {
      this.logger.error('Brevo dispatch failed', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(
        'Dogrulama servisi su anda kullanilamiyor. Lutfen daha sonra tekrar deneyin.',
      );
    }
  }

  peekLatestCode(targetValue: string, purpose: VerificationCodePurpose) {
    return this.developmentCodes.get(this.getMemoryKey(targetValue, purpose)) ?? null;
  }

  private getApiKey() {
    const apiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();

    if (!apiKey || apiKey === 'replace-me') {
      return undefined;
    }

    return apiKey;
  }

  private async sendEmail(apiKey: string, input: DispatchCodeInput) {
    const senderEmail = this.configService.get<string>('BREVO_EMAIL_SENDER')?.trim();

    if (!senderEmail || senderEmail === 'replace-me') {
      throw new Error('BREVO_EMAIL_SENDER is not configured');
    }

    const subject =
      input.purpose === VerificationCodePurpose.PASSWORD_RESET
        ? 'Carloi V4 sifre sifirlama kodunuz'
        : 'Carloi V4 dogrulama kodunuz';

    const textContent =
      input.purpose === VerificationCodePurpose.PASSWORD_RESET
        ? `Merhaba ${input.firstName}, sifrenizi sifirlamak icin kodunuz: ${input.code}. Kod 15 dakika boyunca gecerlidir.`
        : `Merhaba ${input.firstName}, hesabinizi dogrulamak icin kodunuz: ${input.code}. Kod 10 dakika boyunca gecerlidir.`;

    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Carloi V4',
          email: senderEmail,
        },
        to: [{ email: input.targetValue, name: input.firstName }],
        subject,
        textContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo email request failed with status ${response.status}`);
    }
  }

  private async sendSms(apiKey: string, input: DispatchCodeInput) {
    const sender = this.configService.get<string>('BREVO_SMS_SENDER')?.trim();

    if (!sender || sender === 'replace-me') {
      throw new Error('BREVO_SMS_SENDER is not configured');
    }

    const content =
      input.purpose === VerificationCodePurpose.PASSWORD_RESET
        ? `Carloi V4 sifre sifirlama kodunuz: ${input.code}. 15 dakika gecerlidir.`
        : `Carloi V4 dogrulama kodunuz: ${input.code}. 10 dakika gecerlidir.`;

    const response = await fetch(BREVO_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipient: input.targetValue.replace(/^\+/, ''),
        content,
        type: 'transactional',
        tag:
          input.purpose === VerificationCodePurpose.PASSWORD_RESET
            ? 'password-reset'
            : 'account-verification',
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo SMS request failed with status ${response.status}`);
    }
  }

  private getMemoryKey(targetValue: string, purpose: VerificationCodePurpose) {
    return `${purpose}:${targetValue}`;
  }
}
