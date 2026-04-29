import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GarantiCallbackVerificationService } from './garanti-callback-verification.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { GarantiPaymentProvider } from './providers/garanti-payment.provider';
import { MockPaymentProvider } from './providers/mock-payment.provider';

@Module({
  imports: [AuthModule, InsuranceModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    GarantiCallbackVerificationService,
    GarantiPaymentProvider,
    MockPaymentProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
