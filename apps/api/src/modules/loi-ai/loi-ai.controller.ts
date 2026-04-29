import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CompareListingsDto } from './dto/compare-listings.dto';
import { CreateConversationDto, SendConversationMessageDto } from './dto/conversation.dto';
import { GenerateListingDescriptionDto } from './dto/generate-listing-description.dto';
import { LoiAiService } from './loi-ai.service';

@Controller('loi-ai')
@UseGuards(JwtAuthGuard)
export class LoiAiController {
  constructor(private readonly loiAiService: LoiAiService) {}

  @Post('conversations')
  createConversation(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateConversationDto) {
    return this.loiAiService.createConversation(user.userId, body);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.loiAiService.getConversations(user.userId);
  }

  @Get('conversations/:id')
  getConversation(@CurrentUser() user: AuthenticatedUser, @Param('id') conversationId: string) {
    return this.loiAiService.getConversation(user.userId, conversationId);
  }

  @Delete('conversations/:id')
  deleteConversation(@CurrentUser() user: AuthenticatedUser, @Param('id') conversationId: string) {
    return this.loiAiService.deleteConversation(user.userId, conversationId);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() body: SendConversationMessageDto,
  ) {
    return this.loiAiService.sendMessage(user.userId, conversationId, body);
  }

  @Post('compare-listings')
  compareListings(@CurrentUser() user: AuthenticatedUser, @Body() body: CompareListingsDto) {
    return this.loiAiService.compareListings(user.userId, body.listingIds);
  }

  @Get('listings/:id/seller-questions')
  getSellerQuestions(@CurrentUser() user: AuthenticatedUser, @Param('id') listingId: string) {
    return this.loiAiService.generateSellerQuestions(user.userId, listingId);
  }

  @Post('generate-listing-description')
  generateListingDescription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: GenerateListingDescriptionDto,
  ) {
    return this.loiAiService.generateListingDescription(user.userId, body);
  }
}
