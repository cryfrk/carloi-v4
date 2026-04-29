import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { SanitizeInputPipe } from './common/http/sanitize-input.pipe';
import { InfrastructureModule } from './common/infrastructure/infrastructure.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { GlobalRateLimitMiddleware } from './common/security/global-rate-limit.middleware';
import { HealthModule } from './health/health.module';
import { DOMAIN_MODULES } from './modules/domain-modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '../../.env'), join(process.cwd(), '.env')],
    }),
    InfrastructureModule,
    PrismaModule,
    HealthModule,
    ...DOMAIN_MODULES,
  ],
  providers: [SanitizeInputPipe],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GlobalRateLimitMiddleware).forRoutes('*');
  }
}
