import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GarageModule } from '../garage/garage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, NotificationsModule, GarageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
