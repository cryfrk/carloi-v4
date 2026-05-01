import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { GarageService } from '../garage/garage.service';

@Controller('explore')
@UseGuards(JwtAuthGuard)
export class ExploreController {
  constructor(private readonly garageService: GarageService) {}

  @Get('feed')
  getFeed() {
    return this.garageService.getExploreFeed();
  }

  @Get('vehicles/:id')
  getVehicle(@CurrentUser() user: AuthenticatedUser, @Param('id') vehicleId: string) {
    return this.garageService.getVehicleShowcase(user.userId, vehicleId);
  }
}
