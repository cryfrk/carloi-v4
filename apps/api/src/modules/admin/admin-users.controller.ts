import { Controller, Get, Param, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { AdminOperationsService } from './admin-operations.service';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Controller('admin/users')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
export class AdminUsersController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.COMMERCIAL_ADMIN)
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminOperationsService.getUsers(query);
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.COMMERCIAL_ADMIN)
  getUserDetail(@Param('id') userId: string) {
    return this.adminOperationsService.getUserDetail(userId);
  }

  @Patch(':id/status')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  updateUserStatus(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') userId: string,
    @Body() body: AdminUserStatusDto,
  ) {
    return this.adminOperationsService.updateUserStatus(adminUser, userId, body);
  }
}
