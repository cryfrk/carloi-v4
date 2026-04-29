import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

type ConsumeLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  cost?: number;
  message?: string;
  code?: string;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class SharedRateLimitService {
  private readonly buckets = new Map<string, MemoryBucket>();

  constructor(private readonly redisService: RedisService) {}

  async consume(input: ConsumeLimitInput) {
    const key = `ratelimit:${input.key}`;
    const cost = input.cost ?? 1;
    const message = input.message ?? 'Cok fazla istek gonderdiniz. Lutfen daha sonra tekrar deneyin.';
    const code = input.code ?? 'RATE_LIMITED';

    const result = this.redisService.isReady()
      ? await this.consumeWithRedis(key, input.windowMs, cost)
      : this.consumeWithMemory(key, input.windowMs, cost);

    if (result.count > input.limit) {
      throw new HttpException(
        {
          message,
          code,
          retryAfterMs: Math.max(result.resetAt - Date.now(), 0),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      remaining: Math.max(input.limit - result.count, 0),
      resetAt: new Date(result.resetAt).toISOString(),
    };
  }

  private async consumeWithRedis(key: string, windowMs: number, cost: number) {
    const client = this.redisService.getClient();
    if (!client) {
      return this.consumeWithMemory(key, windowMs, cost);
    }

    const script = `
      local current = redis.call('INCRBY', KEYS[1], ARGV[1])
      local ttl = redis.call('PTTL', KEYS[1])
      if ttl < 0 then
        redis.call('PEXPIRE', KEYS[1], ARGV[2])
        ttl = ARGV[2]
      end
      return { current, ttl }
    `;

    const raw = (await client.eval(script, 1, key, String(cost), String(windowMs))) as [number | string, number | string];
    const count = Number(raw[0] ?? 0);
    const ttl = Number(raw[1] ?? windowMs);

    return {
      count,
      resetAt: Date.now() + Math.max(ttl, 0),
    };
  }

  private consumeWithMemory(key: string, windowMs: number, cost: number) {
    const now = Date.now();
    this.cleanup(now);

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      const next = {
        count: cost,
        resetAt: now + windowMs,
      };
      this.buckets.set(key, next);
      return next;
    }

    current.count += cost;
    this.buckets.set(key, current);
    return current;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
