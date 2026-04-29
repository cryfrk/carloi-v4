import { Injectable } from '@nestjs/common';
import { SharedRateLimitService } from '../../common/infrastructure/shared-rate-limit.service';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

@Injectable()
export class AuthRateLimitService {
  constructor(private readonly rateLimitService: SharedRateLimitService) {}

  consume(options: RateLimitOptions) {
    return this.rateLimitService.consume({
      ...options,
      message: 'Cok fazla deneme yaptiniz. Lutfen daha sonra tekrar deneyin.',
      code: 'AUTH_RATE_LIMITED',
    });
  }
}
