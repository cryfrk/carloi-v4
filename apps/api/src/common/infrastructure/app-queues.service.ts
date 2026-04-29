import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { RedisService } from './redis.service';

type NotificationQueuePayload = {
  notificationId: string;
  userId: string;
  type: string;
};

type FutureJobPayload = {
  name: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class AppQueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppQueuesService.name);
  private notificationsQueue: Queue<NotificationQueuePayload> | null = null;
  private futureJobsQueue: Queue<FutureJobPayload> | null = null;
  private notificationWorker: Worker<NotificationQueuePayload> | null = null;
  private futureJobsWorker: Worker<FutureJobPayload> | null = null;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    if (!this.redisService.isEnabled()) {
      return;
    }

    const connection = this.redisService.getConnectionOptions();

    this.notificationsQueue = new Queue('notifications', { connection, defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 500 } });
    this.futureJobsQueue = new Queue('future-jobs', { connection, defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 500 } });

    this.notificationWorker = new Worker(
      'notifications',
      async (job) => {
        this.logger.debug(`Notification job processed: ${job.data.notificationId}`);
      },
      { connection },
    );

    this.futureJobsWorker = new Worker(
      'future-jobs',
      async (job) => {
        this.logger.debug(`Future job placeholder processed: ${job.name}`);
      },
      { connection },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.notificationWorker?.close(),
      this.futureJobsWorker?.close(),
      this.notificationsQueue?.close(),
      this.futureJobsQueue?.close(),
    ]);
  }

  async enqueueNotificationCreated(payload: NotificationQueuePayload) {
    if (!this.notificationsQueue) {
      return;
    }

    await this.notificationsQueue.add('notification-created', payload);
  }

  async enqueueFutureJob(name: string, payload: Record<string, unknown>, delayMs = 0) {
    if (!this.futureJobsQueue) {
      return;
    }

    await this.futureJobsQueue.add(name, { name, payload }, { delay: delayMs });
  }

  getHealth() {
    return {
      enabled: Boolean(this.notificationsQueue && this.futureJobsQueue),
      queues: ['notifications', 'future-jobs'],
    };
  }
}
