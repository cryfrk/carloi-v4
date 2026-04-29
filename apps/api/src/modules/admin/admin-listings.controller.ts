import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { AdminOperationsService } from './admin-operations.service';
import { AdminListingStatusDto } from './dto/admin-listing-status.dto';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';

@Controller('admin/listings')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class AdminListingsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get()
  getListings(@Query() query: AdminListingsQueryDto) {
    return this.adminOperationsService.getListings(query);
  }

  @Get(':id')
  getListingDetail(@Param('id') listingId: string) {
    return this.adminOperationsService.getListingDetail(listingId);
  }

  @Patch(':id/status')
  updateListingStatus(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') listingId: string,
    @Body() body: AdminListingStatusDto,
  ) {
    return this.adminOperationsService.updateListingStatus(adminUser, listingId, body);
  }
}
