import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CommentsQueryDto } from './dto/comments-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePostDto) {
    return this.postsService.createPost(user.userId, body);
  }

  @Get(':id')
  getPostDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') postId: string) {
    return this.postsService.getPostDetail(user.userId, postId);
  }

  @Post(':id/like')
  likePost(@CurrentUser() user: AuthenticatedUser, @Param('id') postId: string) {
    return this.postsService.likePost(user.userId, postId);
  }

  @Delete(':id/like')
  unlikePost(@CurrentUser() user: AuthenticatedUser, @Param('id') postId: string) {
    return this.postsService.unlikePost(user.userId, postId);
  }

  @Post(':id/save')
  savePost(@CurrentUser() user: AuthenticatedUser, @Param('id') postId: string) {
    return this.postsService.savePost(user.userId, postId);
  }

  @Delete(':id/save')
  unsavePost(@CurrentUser() user: AuthenticatedUser, @Param('id') postId: string) {
    return this.postsService.unsavePost(user.userId, postId);
  }

  @Post(':id/comments')
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') postId: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.postsService.createComment(user.userId, postId, body);
  }

  @Get(':id/comments')
  getComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') postId: string,
    @Query() query: CommentsQueryDto,
  ) {
    return this.postsService.getComments(user.userId, postId, query);
  }

  @Post(':postId/comments/:commentId/like')
  likeComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.likeComment(user.userId, postId, commentId);
  }

  @Delete(':postId/comments/:commentId/like')
  unlikeComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.unlikeComment(user.userId, postId, commentId);
  }
}

