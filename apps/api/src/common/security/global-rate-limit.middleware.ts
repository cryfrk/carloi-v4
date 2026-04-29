import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedRateLimitService } from '../infrastructure/shared-rate-limit.service';

type MinimalRequest = {
  path?: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket: { remoteAddress?: string | null };
};

type NextFunction = () => void;

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly rateLimitService: SharedRateLimitService,
    private readonly configService: ConfigService,
  ) {}

  async use(request: MinimalRequest, _response: unknown, next: NextFunction) {
    const path = request.path || request.originalUrl || '';

    if (path.startsWith('/health') || path.startsWith('/payments/garanti/callback')) {
      return next();
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim();
    const ipAddress = forwardedIp || request.ip || request.socket.remoteAddress || 'unknown';
    const limit = Number(this.configService.get<string>('GLOBAL_RATE_LIMIT_MAX') || (process.env.NODE_ENV === 'production' ? 300 : 3000));
    const windowMs = Number(this.configService.get<string>('GLOBAL_RATE_LIMIT_WINDOW_MS') || 60000);

    await this.rateLimitService.consume({
      key: `global:${ipAddress}`,
      limit,
      windowMs,
      message: 'Cok fazla istek gonderdiniz. Lutfen biraz bekleyip tekrar deneyin.',
      code: 'GLOBAL_RATE_LIMITED',
    });

    return next();
  }
}
