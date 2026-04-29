import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { InsuranceService } from './insurance.service';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('requests')
  getRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.insuranceService.getUserRequests(user.userId);
  }

  @Get('requests/:id')
  getRequestDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.insuranceService.getUserRequestDetail(user.userId, requestId);
  }

  @Get('requests/:id/documents')
  getDocuments(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.insuranceService.getDocuments(user.userId, requestId);
  }

  @Post('offers/:id/accept')
  acceptOffer(@CurrentUser() user: AuthenticatedUser, @Param('id') offerId: string) {
    return this.insuranceService.acceptOffer(user.userId, offerId);
  }

  @Post('offers/:id/reject')
  rejectOffer(@CurrentUser() user: AuthenticatedUser, @Param('id') offerId: string) {
    return this.insuranceService.rejectOffer(user.userId, offerId);
  }
}
