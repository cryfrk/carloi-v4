import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ObdService } from '../obd/obd.service';
import { ConnectObdDeviceDto } from './dto/connect-obd-device.dto';
import { CreateObdReportDto } from './dto/create-obd-report.dto';
import { CreateGarageVehicleDto } from './dto/create-garage-vehicle.dto';
import { UpdateGarageVehicleDto } from './dto/update-garage-vehicle.dto';
import { GarageService } from './garage.service';

@Controller('garage')
@UseGuards(JwtAuthGuard)
export class GarageController {
  constructor(
    private readonly garageService: GarageService,
    private readonly obdService: ObdService,
  ) {}

  @Get('vehicles')
  getMyVehicles(@CurrentUser() user: AuthenticatedUser) {
    return this.garageService.getMyVehicles(user.userId);
  }

  @Post('vehicles')
  createGarageVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateGarageVehicleDto,
  ) {
    return this.garageService.createGarageVehicle(user.userId, body);
  }

  @Post('vehicles/:id/obd/connect')
  connectObdDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() body: ConnectObdDeviceDto,
  ) {
    return this.obdService.connectDevice(user.userId, vehicleId, body);
  }

  @Post('vehicles/:id/obd/report')
  createObdReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() body: CreateObdReportDto,
  ) {
    return this.obdService.createReport(user.userId, vehicleId, body);
  }

  @Get('vehicles/:id')
  getVehicleDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') vehicleId: string) {
    return this.garageService.getVehicleDetail(user.userId, vehicleId);
  }

  @Patch('vehicles/:id')
  updateGarageVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() body: UpdateGarageVehicleDto,
  ) {
    return this.garageService.updateGarageVehicle(user.userId, vehicleId, body);
  }

  @Delete('vehicles/:id')
  deleteGarageVehicle(@CurrentUser() user: AuthenticatedUser, @Param('id') vehicleId: string) {
    return this.garageService.deleteGarageVehicle(user.userId, vehicleId);
  }
}
