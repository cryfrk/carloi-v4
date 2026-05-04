import {
  Body,
  Controller,
  Delete,
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
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingsFeedQueryDto } from './dto/listings-feed-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  createListing(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateListingDto) {
    return this.listingsService.createListing(user.userId, body);
  }

  @Get('feed')
  getListingsFeed(@CurrentUser() user: AuthenticatedUser, @Query() query: ListingsFeedQueryDto) {
    return this.listingsService.getListingsFeed(user.userId, query);
  }

  @Get('count')
  getListingsCount(@CurrentUser() user: AuthenticatedUser, @Query() query: ListingsFeedQueryDto) {
    return this.listingsService.getListingsCount(user.userId, query).then((count) => ({ count }));
  }

  @Get(':id')
  getListingDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') listingId: string) {
    return this.listingsService.getListingDetail(user.userId, listingId);
  }

  @Post(':id/save')
  saveListing(@CurrentUser() user: AuthenticatedUser, @Param('id') listingId: string) {
    return this.listingsService.saveListing(user.userId, listingId);
  }

  @Delete(':id/save')
  unsaveListing(@CurrentUser() user: AuthenticatedUser, @Param('id') listingId: string) {
    return this.listingsService.unsaveListing(user.userId, listingId);
  }

  @Patch(':id')
  updateListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') listingId: string,
    @Body() body: UpdateListingDto,
  ) {
    return this.listingsService.updateListing(user.userId, listingId, body);
  }

  @Delete(':id')
  deleteListing(@CurrentUser() user: AuthenticatedUser, @Param('id') listingId: string) {
    return this.listingsService.deleteListing(user.userId, listingId);
  }
}
