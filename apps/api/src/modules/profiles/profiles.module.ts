import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController, SavedItemsController, SettingsController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController, SettingsController, SavedItemsController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
