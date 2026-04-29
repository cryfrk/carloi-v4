import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoriesService } from './stories.service';
import { Body } from '@nestjs/common';

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  createStory(@CurrentUser() authUser: AuthenticatedUser, @Body() dto: CreateStoryDto) {
    return this.storiesService.createStory(authUser.userId, dto);
  }

  @Get('feed')
  getFeed(@CurrentUser() authUser: AuthenticatedUser) {
    return this.storiesService.getStoryFeed(authUser.userId);
  }

  @Get('user/:userId')
  getUserStories(@CurrentUser() authUser: AuthenticatedUser, @Param('userId') userId: string) {
    return this.storiesService.getUserStories(authUser.userId, userId);
  }

  @Post(':id/view')
  markViewed(@CurrentUser() authUser: AuthenticatedUser, @Param('id') storyId: string) {
    return this.storiesService.markViewed(authUser.userId, storyId);
  }

  @Get(':id/viewers')
  getViewers(@CurrentUser() authUser: AuthenticatedUser, @Param('id') storyId: string) {
    return this.storiesService.getViewers(authUser.userId, storyId);
  }

  @Delete(':id')
  deleteStory(@CurrentUser() authUser: AuthenticatedUser, @Param('id') storyId: string) {
    return this.storiesService.deleteStory(authUser.userId, storyId);
  }
}
