import { Body, Controller, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLogoutDto } from './dto/admin-logout.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(
    @Body() body: AdminLoginDto,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.adminAuthService.login(body, {
      ipAddress,
      userAgent,
      deviceName: 'admin-console',
    });
  }

  @Post('refresh')
  refresh(
    @Body() body: AdminRefreshDto,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.adminAuthService.refresh(body, {
      ipAddress,
      userAgent,
      deviceName: 'admin-console',
    });
  }

  @Post('logout')
  logout(@Body() body: AdminLogoutDto) {
    return this.adminAuthService.logout(body);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(@CurrentAdmin() adminUser: AuthenticatedAdmin) {
    return this.adminAuthService.me(adminUser.adminUserId);
  }
}
