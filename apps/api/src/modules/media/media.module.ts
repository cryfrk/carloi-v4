import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Module({
  imports: [ConfigModule, PrismaModule, JwtModule.register({})],
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider, S3StorageProvider],
  exports: [MediaService],
})
export class MediaModule {}
