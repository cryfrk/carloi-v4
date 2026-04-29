import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedController } from './feed.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [PostsController, FeedController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

