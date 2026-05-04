import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { ShareContentDto } from './dto/share-content.dto';
import {
  CreateDirectThreadDto,
  CreateGroupThreadDto,
  SendMessageDto,
} from './dto/thread-actions.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('friends')
  getFriends(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getFriends(user.userId);
  }

  @Get('search-users')
  searchUsers(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchUsersQueryDto) {
    return this.messagesService.searchUsers(user.userId, query.q);
  }

  @Get('threads')
  getThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getThreads(user.userId);
  }

  @Get('threads/:id')
  getThreadDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') threadId: string) {
    return this.messagesService.getThreadDetail(user.userId, threadId);
  }

  @Post('direct')
  createDirectThread(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDirectThreadDto) {
    return this.messagesService.createDirectThread(user.userId, body);
  }

  @Post('group')
  createGroupThread(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateGroupThreadDto) {
    return this.messagesService.createGroupThread(user.userId, body);
  }

  @Post('listing/:listingId/start')
  startListingDeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId') listingId: string,
  ) {
    return this.messagesService.startListingDeal(user.userId, listingId);
  }

  @Post('threads/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') threadId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user.userId, threadId, body);
  }

  @Post('share')
  shareContent(@CurrentUser() user: AuthenticatedUser, @Body() body: ShareContentDto) {
    return this.messagesService.shareContent(user.userId, body);
  }

  @Patch('threads/:id/seen')
  markThreadSeen(@CurrentUser() user: AuthenticatedUser, @Param('id') threadId: string) {
    return this.messagesService.markThreadSeen(user.userId, threadId);
  }

  @Post('listing-deal/:threadId/agree')
  agreeToDeal(@CurrentUser() user: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.messagesService.agreeToListingDeal(user.userId, threadId);
  }

  @Post('listing-deal/:threadId/share-license')
  shareLicense(@CurrentUser() user: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.messagesService.shareLicenseInfo(user.userId, threadId);
  }

  @Post('listing-deal/:threadId/request-insurance')
  requestInsurance(@CurrentUser() user: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.messagesService.requestInsurance(user.userId, threadId);
  }
}
