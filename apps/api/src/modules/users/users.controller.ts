import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/public-profile')
  getPublicProfile(@Param('id') targetUserId: string) {
    return this.usersService.getPublicProfile(targetUserId);
  }

  @Get(':id/public-garage')
  getPublicGarage(@Param('id') targetUserId: string) {
    return this.usersService.getPublicGarage(targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  followUser(@CurrentUser() user: AuthenticatedUser, @Param('id') targetUserId: string) {
    return this.usersService.followUser(user.userId, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollowUser(@CurrentUser() user: AuthenticatedUser, @Param('id') targetUserId: string) {
    return this.usersService.unfollowUser(user.userId, targetUserId);
  }
}

