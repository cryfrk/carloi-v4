import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommercialAccountsController } from './commercial-accounts.controller';
import { CommercialAccountsService } from './commercial-accounts.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [CommercialAccountsController],
  providers: [CommercialAccountsService],
  exports: [CommercialAccountsService],
})
export class CommercialAccountsModule {}

