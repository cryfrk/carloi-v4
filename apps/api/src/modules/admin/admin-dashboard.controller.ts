import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { AdminOperationsService } from './admin-operations.service';

@Controller('admin/dashboard')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.INSURANCE_ADMIN, AdminRole.COMMERCIAL_ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get()
  getDashboard(@CurrentAdmin() adminUser: AuthenticatedAdmin) {
    return this.adminOperationsService.getDashboard(adminUser);
  }
}
