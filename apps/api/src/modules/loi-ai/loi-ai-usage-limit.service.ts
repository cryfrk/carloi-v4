import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedRateLimitService } from '../../common/infrastructure/shared-rate-limit.service';

@Injectable()
export class LoiAiUsageLimitService {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: SharedRateLimitService,
  ) {}

  async consume(userId: string, action: string, cost = 1) {
    const dailyLimit = Number(this.configService.get<string>('LOI_AI_DAILY_LIMIT') || 40);
    const windowMs = 24 * 60 * 60 * 1000;

    await this.rateLimitService.consume({
      key: `loi-ai:${userId}:${action}`,
      limit: dailyLimit,
      windowMs,
      cost,
      message: 'Gunluk Loi AI kullanim limitine ulastiniz. Lutfen yarin tekrar deneyin.',
      code: 'LOI_AI_DAILY_LIMIT_EXCEEDED',
    });
  }
}
