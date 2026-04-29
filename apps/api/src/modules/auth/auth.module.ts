import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BrevoService } from './brevo.service';
import { AuthRateLimitService } from './rate-limit.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, BrevoService, AuthRateLimitService],
  exports: [JwtModule],
})
export class AuthModule {}

