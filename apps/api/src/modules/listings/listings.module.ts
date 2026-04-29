import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LegalComplianceModule } from '../legal-compliance/legal-compliance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  imports: [AuthModule, LegalComplianceModule, NotificationsModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
