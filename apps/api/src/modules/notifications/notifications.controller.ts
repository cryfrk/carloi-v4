import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getNotifications(user.userId);
  }

  @Patch('seen-all')
  markAllSeen(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllSeen(user.userId);
  }

  @Patch(':id/seen')
  markSeen(@CurrentUser() user: AuthenticatedUser, @Param('id') notificationId: string) {
    return this.notificationsService.markSeen(user.userId, notificationId);
  }
}
