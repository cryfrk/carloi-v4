import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { FeedQueryDto } from './dto/feed-query.dto';
import { PostsService } from './posts.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  getFeed(@CurrentUser() user: AuthenticatedUser, @Query() query: FeedQueryDto) {
    return this.postsService.getFeed(user.userId, query);
  }
}
