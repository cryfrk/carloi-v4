import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto, @Ip() ipAddress?: string) {
    return this.authService.register(body, ipAddress);
  }

  @Post('send-verification-code')
  sendVerificationCode(@Body() body: SendVerificationCodeDto, @Ip() ipAddress?: string) {
    return this.authService.sendVerificationCode(body, ipAddress);
  }

  @Post('verify-code')
  verifyCode(
    @Body() body: VerifyCodeDto,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-name') deviceName?: string,
  ) {
    return this.authService.verifyCode(body, {
      ipAddress,
      userAgent,
      deviceName,
    });
  }

  @Post('login')
  login(
    @Body() body: LoginDto,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-name') deviceName?: string,
  ) {
    return this.authService.login(body, {
      ipAddress,
      userAgent,
      deviceName,
    });
  }

  @Post('refresh')
  refresh(
    @Body() body: RefreshDto,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-device-name') deviceName?: string,
  ) {
    return this.authService.refresh(body, {
      ipAddress,
      userAgent,
      deviceName,
    });
  }

  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Ip() ipAddress?: string) {
    return this.authService.forgotPassword(body, ipAddress);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Ip() ipAddress?: string) {
    return this.authService.resetPassword(body, ipAddress);
  }
}
