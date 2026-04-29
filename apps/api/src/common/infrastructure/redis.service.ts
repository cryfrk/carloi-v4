import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    if (!this.isEnabled()) {
      return;
    }

    this.client = new Redis(this.getConnectionOptions());
    this.client.on('error', (error) => {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`Redis hatasi: ${error.message}`);
      }
    });

    try {
      await this.client.ping();
      this.logger.log('Redis baglantisi hazir.');
    } catch (error) {
      this.logger.error('Redis baglantisi baslatilamadi.', error instanceof Error ? error.stack : String(error));
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  isEnabled() {
    return Boolean(this.configService.get<string>('REDIS_URL')?.trim());
  }

  isReady() {
    return this.client?.status === 'ready';
  }

  getClient() {
    return this.client;
  }

  async ping() {
    if (!this.client) {
      return 'disabled';
    }

    return this.client.ping();
  }

  getConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (redisUrl) {
      const parsed = new URL(redisUrl);
      const dbPath = parsed.pathname.replace('/', '').trim();

      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        db: dbPath ? Number(dbPath) : 0,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST')?.trim() || '127.0.0.1',
      port: Number(this.configService.get<string>('REDIS_PORT') || 6379),
      password: this.configService.get<string>('REDIS_PASSWORD')?.trim() || undefined,
      db: Number(this.configService.get<string>('REDIS_DB') || 0),
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    } satisfies RedisOptions;
  }
}
