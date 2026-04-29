import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { AdminOperationsService } from './admin-operations.service';

@Controller('admin/payments')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class AdminPaymentsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get()
  getPayments() {
    return this.adminOperationsService.getPayments();
  }

  @Get(':id')
  getPaymentDetail(@Param('id') paymentId: string) {
    return this.adminOperationsService.getPaymentDetail(paymentId);
  }
}
