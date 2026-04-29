import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule, NotificationsModule, InsuranceModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}

