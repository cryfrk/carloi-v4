import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ChangePasswordDto, UpdatePrivacyDto, UpdateProfileDto } from './dto/profile-settings.dto';
import { ProfilesService } from './profiles.service';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getMyProfile(user.userId);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateMyProfile(user.userId, dto);
  }

  @Get(':username')
  getProfile(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string) {
    return this.profilesService.getProfileByIdentifier(user.userId, username);
  }

  @Get(':username/posts')
  getProfilePosts(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string) {
    return this.profilesService.getProfilePosts(user.userId, username);
  }

  @Get(':username/listings')
  getProfileListings(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string) {
    return this.profilesService.getProfileListings(user.userId, username);
  }

  @Get(':username/vehicles')
  getProfileVehicles(@CurrentUser() user: AuthenticatedUser, @Param('username') username: string) {
    return this.profilesService.getProfileVehicles(user.userId, username);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getSettings(user.userId);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateMyProfile(user.userId, dto);
  }

  @Patch('privacy')
  updatePrivacy(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePrivacyDto) {
    return this.profilesService.updatePrivacy(user.userId, dto);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.profilesService.changePassword(user.userId, dto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('saved-items')
export class SavedItemsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  getSavedItems(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getSavedItems(user.userId);
  }
}
