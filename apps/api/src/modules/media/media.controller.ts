import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
const { memoryStorage } = require('multer') as { memoryStorage: () => unknown };
import { AdminJwtGuard } from '../../common/admin-auth/admin-jwt.guard';
import { CurrentAdmin } from '../../common/admin-auth/current-admin.decorator';
import type { AuthenticatedAdmin } from '../../common/admin-auth/admin-auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

type MediaResponse = {
  setHeader(name: string, value: string): unknown;
  sendFile(path: string): unknown;
  redirect(statusCode: number, url: string): unknown;
};

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('media/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }))
  uploadForUser(
    @CurrentUser() authUser: AuthenticatedUser,
    @Body() body: UploadMediaDto,
    @UploadedFile() file: unknown,
    @Req() request: { protocol?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.mediaService.uploadForUser(
      authUser.userId,
      file as Parameters<MediaService['uploadForUser']>[1],
      body.purpose,
      this.getOriginBaseUrl(request),
    );
  }

  @Post('admin/media/upload')
  @UseGuards(AdminJwtGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }))
  uploadForAdmin(
    @CurrentAdmin() authAdmin: AuthenticatedAdmin,
    @Body() body: UploadMediaDto,
    @UploadedFile() file: unknown,
    @Req() request: { protocol?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.mediaService.uploadForAdmin(
      authAdmin.adminUserId,
      authAdmin.role,
      file as Parameters<MediaService['uploadForAdmin']>[2],
      body.purpose,
      this.getOriginBaseUrl(request),
    );
  }

  @Get('media/assets/:id/file')
  async getAssetFile(
    @Param('id') assetId: string,
    @Req() request: { headers: Record<string, string | string[] | undefined> },
    @Res() response: MediaResponse,
  ) {
    const authorizationHeader = this.getHeaderValue(request.headers.authorization);
    const { asset, readTarget } = await this.mediaService.getAssetFile(assetId, authorizationHeader);

    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Cache-Control', asset.visibility === 'PUBLIC' ? 'public, max-age=31536000, immutable' : 'private, no-store');

    if (readTarget.kind === 'redirect') {
      return response.redirect(302, readTarget.url);
    }

    return response.sendFile(readTarget.absolutePath);
  }

  private getOriginBaseUrl(request: { protocol?: string; headers: Record<string, string | string[] | undefined> }) {
    const forwardedProto = this.getHeaderValue(request.headers['x-forwarded-proto']);
    const protocol = forwardedProto || request.protocol || 'http';
    const host = this.getHeaderValue(request.headers.host) || 'localhost:3001';
    return `${protocol}://${host}`;
  }

  private getHeaderValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
