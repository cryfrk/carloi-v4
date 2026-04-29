import { Global, Module } from '@nestjs/common';
import { AppQueuesService } from './app-queues.service';
import { MonitoringService } from './monitoring.service';
import { RedisService } from './redis.service';
import { SharedRateLimitService } from './shared-rate-limit.service';

@Global()
@Module({
  providers: [RedisService, SharedRateLimitService, AppQueuesService, MonitoringService],
  exports: [RedisService, SharedRateLimitService, AppQueuesService, MonitoringService],
})
export class InfrastructureModule {}
