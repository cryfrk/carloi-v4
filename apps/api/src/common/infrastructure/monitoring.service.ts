import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cpus } from 'node:os';

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private readonly startedAt = Date.now();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const intervalMs = Number(this.configService.get<string>('UPTIME_LOG_INTERVAL_MS') || 900000);
    if (intervalMs <= 0) {
      return;
    }

    this.logSnapshot('startup');
    this.intervalHandle = setInterval(() => this.logSnapshot('heartbeat'), intervalMs);
    this.intervalHandle.unref();
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  getSnapshot() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(this.startedAt).toISOString(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
        cores: cpus().length,
      },
      pid: process.pid,
      nodeVersion: process.version,
    };
  }

  private logSnapshot(stage: 'startup' | 'heartbeat') {
    const snapshot = this.getSnapshot();
    this.logger.log(
      `${stage} uptime=${snapshot.uptimeSeconds}s rss=${snapshot.memory.rss} heapUsed=${snapshot.memory.heapUsed}`,
    );
  }
}
