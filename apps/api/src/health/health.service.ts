import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppQueuesService } from '../common/infrastructure/app-queues.service';
import { MonitoringService } from '../common/infrastructure/monitoring.service';
import { RedisService } from '../common/infrastructure/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly queuesService: AppQueuesService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async getHealth() {
    const [databaseStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const snapshot = this.monitoringService.getSnapshot();
    const degraded = [databaseStatus.status, redisStatus.status].includes('degraded');

    return {
      status: degraded ? 'degraded' : 'ok',
      app: 'carloi-v4-api',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: snapshot.uptimeSeconds,
      memory: snapshot.memory,
      cpu: snapshot.cpu,
      checks: {
        database: databaseStatus,
        redis: redisStatus,
        queues: this.queuesService.getHealth(),
      },
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' as const };
    } catch (error) {
      return {
        status: 'degraded' as const,
        message: process.env.NODE_ENV === 'production' ? 'database_unreachable' : String(error),
      };
    }
  }

  private async checkRedis() {
    if (!this.redisService.isEnabled()) {
      return { status: 'disabled' as const };
    }

    try {
      const pong = await this.redisService.ping();
      return { status: pong === 'PONG' ? ('ok' as const) : ('degraded' as const) };
    } catch (error) {
      return {
        status: 'degraded' as const,
        message: process.env.NODE_ENV === 'production' ? 'redis_unreachable' : String(error),
      };
    }
  }
}
