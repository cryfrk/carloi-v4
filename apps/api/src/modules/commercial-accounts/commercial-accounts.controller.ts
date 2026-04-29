import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CommercialAccountsService } from './commercial-accounts.service';
import { SubmitCommercialApplicationDto } from './dto/submit-commercial-application.dto';

@Controller('commercial-applications')
@UseGuards(JwtAuthGuard)
export class CommercialAccountsController {
  constructor(private readonly commercialAccountsService: CommercialAccountsService) {}

  @Post()
  submitApplication(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitCommercialApplicationDto) {
    return this.commercialAccountsService.submitApplication(user.userId, body);
  }

  @Get('me')
  getOwnApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.commercialAccountsService.getOwnApplication(user.userId);
  }
}
