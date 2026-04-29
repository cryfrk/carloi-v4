import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObdModule } from '../obd/obd.module';
import { GarageController } from './garage.controller';
import { GarageService } from './garage.service';

@Module({
  imports: [AuthModule, ObdModule],
  controllers: [GarageController],
  providers: [GarageService],
  exports: [GarageService],
})
export class GarageModule {}
