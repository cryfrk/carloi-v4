import { Injectable } from '@nestjs/common';
import { SharedRateLimitService } from '../../common/infrastructure/shared-rate-limit.service';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

@Injectable()
export class AdminRateLimitService {
  constructor(private readonly rateLimitService: SharedRateLimitService) {}

  consume(options: RateLimitOptions) {
    return this.rateLimitService.consume({
      ...options,
      message: 'Cok fazla admin giris denemesi yaptiniz. Lutfen daha sonra tekrar deneyin.',
      code: 'ADMIN_RATE_LIMITED',
    });
  }
}
