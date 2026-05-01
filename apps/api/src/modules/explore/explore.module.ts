import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GarageModule } from '../garage/garage.module';
import { ExploreController } from './explore.controller';

@Module({
  imports: [AuthModule, GarageModule],
  controllers: [ExploreController],
})
export class ExploreModule {}
