import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { AdminRoleGuard } from '../../common/admin-auth/admin-role.guard';
import { AdminRoles } from '../../common/admin-auth/admin-roles.decorator';
import { AdminOperationsService } from './admin-operations.service';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@Controller('admin/audit-logs')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class AdminAuditLogsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get()
  getAuditLogs(@Query() query: AdminAuditLogsQueryDto) {
    return this.adminOperationsService.getAuditLogs(query);
  }
}
