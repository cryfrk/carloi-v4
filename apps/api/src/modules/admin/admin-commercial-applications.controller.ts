import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { CommercialAccountsService } from '../commercial-accounts/commercial-accounts.service';
import { RejectCommercialApplicationDto } from '../commercial-accounts/dto/reject-commercial-application.dto';

@Controller('admin/commercial-applications')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.COMMERCIAL_ADMIN)
export class AdminCommercialApplicationsController {
  constructor(private readonly commercialAccountsService: CommercialAccountsService) {}

  @Get()
  getApplications() {
    return this.commercialAccountsService.getAdminApplications();
  }

  @Get(':id')
  getApplicationDetail(@Param('id') applicationId: string) {
    return this.commercialAccountsService.getAdminApplicationDetail(applicationId);
  }

  @Post(':id/approve')
  approveApplication(@CurrentAdmin() adminUser: AuthenticatedAdmin, @Param('id') applicationId: string) {
    return this.commercialAccountsService.approveApplication(adminUser, applicationId);
  }

  @Post(':id/reject')
  rejectApplication(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') applicationId: string,
    @Body() body: RejectCommercialApplicationDto,
  ) {
    return this.commercialAccountsService.rejectApplication(adminUser, applicationId, body);
  }
}
