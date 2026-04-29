import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommercialAccountsModule } from '../commercial-accounts/commercial-accounts.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminCommercialApplicationsController } from './admin-commercial-applications.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminInsuranceController } from './admin-insurance.controller';
import { AdminListingsController } from './admin-listings.controller';
import { AdminOperationsService } from './admin-operations.service';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminRateLimitService } from './admin-rate-limit.service';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [AuthModule, InsuranceModule, CommercialAccountsModule, NotificationsModule],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminCommercialApplicationsController,
    AdminUsersController,
    AdminListingsController,
    AdminInsuranceController,
    AdminPaymentsController,
    AdminAuditLogsController,
  ],
  providers: [
    AdminAuthService,
    AdminOperationsService,
    AdminRateLimitService,
    AdminJwtGuard,
    AdminRoleGuard,
  ],
  exports: [AdminAuthService],
})
export class AdminModule {}
