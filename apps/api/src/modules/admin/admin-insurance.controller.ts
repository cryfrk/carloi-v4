import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { InsuranceService } from '../insurance/insurance.service';
import { CreateInsuranceOfferDto } from '../insurance/dto/create-insurance-offer.dto';
import { UpdateInsuranceOfferStatusDto } from '../insurance/dto/update-insurance-offer-status.dto';
import { UploadInsuranceDocumentsDto } from '../insurance/dto/upload-insurance-documents.dto';

@Controller('admin/insurance')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.INSURANCE_ADMIN, AdminRole.SUPER_ADMIN)
export class AdminInsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('requests')
  getRequests() {
    return this.insuranceService.getAdminRequests();
  }

  @Get('requests/:id')
  getRequestDetail(@Param('id') requestId: string) {
    return this.insuranceService.getAdminRequestDetail(requestId);
  }

  @Post('requests/:id/offer')
  createOffer(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') requestId: string,
    @Body() body: CreateInsuranceOfferDto,
  ) {
    return this.insuranceService.createOffer(adminUser, requestId, body);
  }

  @Patch('offers/:id/status')
  updateOfferStatus(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') offerId: string,
    @Body() body: UpdateInsuranceOfferStatusDto,
  ) {
    return this.insuranceService.updateOfferStatus(adminUser, offerId, body);
  }

  @Post('requests/:id/documents')
  uploadDocuments(
    @CurrentAdmin() adminUser: AuthenticatedAdmin,
    @Param('id') requestId: string,
    @Body() body: UploadInsuranceDocumentsDto,
  ) {
    return this.insuranceService.uploadDocuments(adminUser, requestId, body);
  }
}
