import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  Prisma,
  UserType,
  VerificationCodePurpose,
  VerificationTargetType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import {
  ACCESS_TOKEN_DEFAULT_EXPIRES_IN,
  CODE_RESEND_COOLDOWN_SECONDS,
  PASSWORD_RESET_TTL_MINUTES,
  REFRESH_TOKEN_DEFAULT_EXPIRES_IN,
  VERIFICATION_CODE_TTL_MINUTES,
  VerificationChannel,
} from './auth.constants';
import { BrevoService } from './brevo.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthRateLimitService } from './rate-limit.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import type { AuthTokenPayload } from '../../common/auth/auth.types';
import {
  addMinutes,
  authUserSelect,
  durationToMs,
  generateVerificationCode,
  getVerificationPurpose,
  hashToken,
  isUsername,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
  normalizeUsername,
  registrationRequiresCompanyFields,
  resolveContactIdentifier,
  toSafeAuthUser,
  type AuthUserRecord,
  type SessionContext,
} from './auth.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly brevoService: BrevoService,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    await this.rateLimitService.consume({
      key: `auth:register:${ipAddress ?? 'unknown'}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });

    this.validateRegisterDto(dto);

    const userType = dto.userType;
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);
    const username = normalizeUsername(dto.username);
    const tcIdentityNo = dto.tcIdentityNo?.trim();
    const companyTitle = dto.companyTitle?.trim();
    const taxNumber = dto.taxNumber?.trim();

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            userType,
            email,
            phone,
            username,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            tcIdentityNo,
            isVerified: false,
            isCommercialApproved: false,
          },
          select: authUserSelect,
        });

        await tx.profile.create({
          data: {
            userId: createdUser.id,
          },
        });

        if (userType === UserType.COMMERCIAL) {
          await tx.commercialApplication.create({
            data: {
              userId: createdUser.id,
              companyName: companyTitle!,
              taxNumber: taxNumber!,
              contactEmail: email,
              contactPhone: phone,
            },
          });
        }

        return createdUser;
      });

      return {
        success: true,
        verificationRequired: true,
        user: toSafeAuthUser(user),
      };
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  async sendVerificationCode(dto: SendVerificationCodeDto, ipAddress?: string) {
    await this.rateLimitService.consume({
      key: `auth:send-verification:${ipAddress ?? 'unknown'}`,
      limit: 20,
      windowMs: 10 * 60_000,
    });

    const target = this.resolveTargetForChannel(dto.identifier, dto.channel);
    const user = await this.findUserByContact(target.targetType, target.value);

    if (!user || user.isVerified) {
      return {
        success: true,
        message: 'Eger hesap uygunsa dogrulama kodu gonderilecektir.',
      };
    }

    await this.rateLimitService.consume({
      key: `auth:send-verification:target:${target.value}`,
      limit: 5,
      windowMs: 10 * 60_000,
    });

    const latestCode = await this.prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        purpose: getVerificationPurpose(),
        targetValue: target.value,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestCode && latestCode.createdAt.getTime() + CODE_RESEND_COOLDOWN_SECONDS * 1000 > Date.now()) {
      return {
        success: true,
        message: 'Eger hesap uygunsa dogrulama kodu gonderilecektir.',
      };
    }

    const code = this.createCode();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.verificationCode.create({
      data: {
        userId: user.id,
        targetType: target.targetType,
        targetValue: target.value,
        purpose: getVerificationPurpose(),
        codeHash,
        expiresAt: addMinutes(new Date(), VERIFICATION_CODE_TTL_MINUTES),
      },
    });

    await this.brevoService.sendCode({
      channel: dto.channel,
      targetType: target.targetType,
      targetValue: target.value,
      code,
      purpose: getVerificationPurpose(),
      firstName: user.firstName,
    });

    return {
      success: true,
      message: 'Eger hesap uygunsa dogrulama kodu gonderilecektir.',
    };
  }

  async verifyCode(dto: VerifyCodeDto, sessionContext: SessionContext) {
    await this.rateLimitService.consume({
      key: `auth:verify-code:${sessionContext.ipAddress ?? 'unknown'}`,
      limit: 15,
      windowMs: 10 * 60_000,
    });

    const target = resolveContactIdentifier(dto.identifier);

    if (!target) {
      throw new BadRequestException('Dogrulama icin email veya telefon kullanin.');
    }

    const user = await this.findUserByContact(target.targetType, target.value);

    if (!user) {
      throw new UnauthorizedException('Kod hatali veya suresi dolmus.');
    }

    const activeCodes = await this.prisma.verificationCode.findMany({
      where: {
        userId: user.id,
        targetValue: target.value,
        purpose: getVerificationPurpose(),
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const matchedCode = await this.findMatchingVerificationCode(activeCodes, dto.code);

    if (!matchedCode) {
      if (activeCodes[0]) {
        await this.prisma.verificationCode.update({
          where: { id: activeCodes[0].id },
          data: { attemptCount: { increment: 1 } },
        });
      }

      throw new UnauthorizedException('Kod hatali veya suresi dolmus.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });

      await tx.verificationCode.update({
        where: { id: matchedCode.id },
        data: { consumedAt: new Date() },
      });
    });

    const freshUser = await this.getAuthUserById(user.id);
    const tokens = await this.issueTokenPair(freshUser, sessionContext);

    return {
      ...tokens,
      user: toSafeAuthUser(freshUser),
    };
  }

  async login(dto: LoginDto, sessionContext: SessionContext) {
    await this.rateLimitService.consume({
      key: `auth:login:${sessionContext.ipAddress ?? 'unknown'}`,
      limit: 20,
      windowMs: 15 * 60_000,
    });

    const user = await this.findUserWithPasswordByIdentifier(dto.identifier);

    if (!user) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    if (!user.isVerified) {
      throw new ForbiddenException({
        message: 'Hesabinizi aktiflestirmek icin dogrulama kodunu onaylayin.',
        verificationRequired: true,
      });
    }

    const authUser = await this.getAuthUserById(user.id);
    const tokens = await this.issueTokenPair(authUser, sessionContext);

    return {
      ...tokens,
      user: toSafeAuthUser(authUser),
    };
  }

  async refresh(dto: RefreshDto, sessionContext: SessionContext) {
    await this.rateLimitService.consume({
      key: `auth:refresh:${sessionContext.ipAddress ?? 'unknown'}`,
      limit: 20,
      windowMs: 15 * 60_000,
    });

    const session = await this.validateRefreshToken(dto.refreshToken);

    await this.prisma.accountSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const authUser = await this.getAuthUserById(session.userId);
    const tokens = await this.issueTokenPair(authUser, sessionContext);

    return {
      ...tokens,
      user: toSafeAuthUser(authUser),
    };
  }

  async logout(dto: LogoutDto) {
    const session = await this.findSessionByToken(dto.refreshToken);

    if (session) {
      await this.prisma.accountSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      success: true,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string) {
    await this.rateLimitService.consume({
      key: `auth:forgot-password:${ipAddress ?? 'unknown'}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });

    const target = resolveContactIdentifier(dto.identifier);

    if (!target) {
      return {
        success: true,
        message: 'Eger hesap uygunsa sifre sifirlama kodu gonderilecektir.',
      };
    }

    const user = await this.findUserByContact(target.targetType, target.value);

    if (!user) {
      return {
        success: true,
        message: 'Eger hesap uygunsa sifre sifirlama kodu gonderilecektir.',
      };
    }

    const latestReset = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestReset && latestReset.createdAt.getTime() + CODE_RESEND_COOLDOWN_SECONDS * 1000 > Date.now()) {
      return {
        success: true,
        message: 'Eger hesap uygunsa sifre sifirlama kodu gonderilecektir.',
      };
    }

    const code = this.createCode();
    const tokenHash = await bcrypt.hash(code, 10);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addMinutes(new Date(), PASSWORD_RESET_TTL_MINUTES),
      },
    });

    await this.brevoService.sendCode({
      channel:
        target.targetType === VerificationTargetType.EMAIL
          ? VerificationChannel.EMAIL
          : VerificationChannel.SMS,
      targetType: target.targetType,
      targetValue: target.value,
      code,
      purpose: VerificationCodePurpose.PASSWORD_RESET,
      firstName: user.firstName,
    });

    return {
      success: true,
      message: 'Eger hesap uygunsa sifre sifirlama kodu gonderilecektir.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string) {
    await this.rateLimitService.consume({
      key: `auth:reset-password:${ipAddress ?? 'unknown'}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });

    const target = resolveContactIdentifier(dto.identifier);

    if (!target) {
      throw new UnauthorizedException('Kod hatali veya suresi dolmus.');
    }

    const user = await this.findUserByContact(target.targetType, target.value);

    if (!user) {
      throw new UnauthorizedException('Kod hatali veya suresi dolmus.');
    }

    const activeTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    const matchedToken = await this.findMatchingResetToken(activeTokens, dto.code);

    if (!matchedToken) {
      throw new UnauthorizedException('Kod hatali veya suresi dolmus.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: now },
      });

      await tx.accountSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      success: true,
      message: 'Sifreniz basariyla guncellendi.',
    };
  }

  private validateRegisterDto(dto: RegisterDto) {
    if (!normalizeEmail(dto.email) && !normalizePhone(dto.phone)) {
      throw new BadRequestException('Email veya telefon alanlarindan en az biri zorunludur.');
    }

    if (!isUsername(dto.username)) {
      throw new BadRequestException('Kullanici adi 3-30 karakter olmali ve sadece harf, rakam, nokta, tire veya alt cizgi icermelidir.');
    }

    if (registrationRequiresCompanyFields(dto.userType)) {
      if (!dto.companyTitle?.trim() || !dto.tcIdentityNo?.trim() || !dto.taxNumber?.trim()) {
        throw new BadRequestException(
          'Ticari uyelik icin firma unvani, TC kimlik no ve vergi numarasi zorunludur.',
        );
      }
    }
  }

  private async getAuthUserById(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      select: authUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    return user;
  }

  private async findUserByContact(targetType: VerificationTargetType, value: string) {
    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        ...(targetType === VerificationTargetType.EMAIL ? { email: value } : { phone: value }),
      },
      select: authUserSelect,
    });
  }

  private async findUserWithPasswordByIdentifier(identifier: string) {
    const normalized = normalizeIdentifier(identifier);

    const where: Prisma.UserWhereInput =
      normalized.kind === 'email'
        ? { email: normalized.value }
        : normalized.kind === 'phone'
          ? { phone: normalized.value }
          : { username: normalized.value };

    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        ...where,
      },
    });
  }

  private async findMatchingVerificationCode(
    records: Array<{ id: string; codeHash: string }>,
    code: string,
  ) {
    for (const record of records) {
      if (await bcrypt.compare(code, record.codeHash)) {
        return record;
      }
    }

    return undefined;
  }

  private async findMatchingResetToken(
    records: Array<{ id: string; tokenHash: string }>,
    code: string,
  ) {
    for (const record of records) {
      if (await bcrypt.compare(code, record.tokenHash)) {
        return record;
      }
    }

    return undefined;
  }

  private resolveTargetForChannel(identifier: string, channel: VerificationChannel) {
    const target = resolveContactIdentifier(identifier);

    if (!target) {
      throw new BadRequestException('Dogrulama icin email veya telefon kullanin.');
    }

    if (channel === VerificationChannel.EMAIL && target.kind !== 'email') {
      throw new BadRequestException('EMAIL kanali icin gecerli bir email adresi girin.');
    }

    if (channel === VerificationChannel.SMS && target.kind !== 'phone') {
      throw new BadRequestException('SMS kanali icin gecerli bir telefon numarasi girin.');
    }

    return target;
  }

  private createCode() {
    return generateVerificationCode();
  }

  private async issueTokenPair(user: AuthUserRecord, sessionContext: SessionContext) {
    const refreshExpiresIn = this.getJwtExpiresIn(
      'JWT_REFRESH_EXPIRES_IN',
      REFRESH_TOKEN_DEFAULT_EXPIRES_IN,
    );
    const refreshSecret = this.getRequiredConfig('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.getJwtExpiresIn(
      'JWT_ACCESS_EXPIRES_IN',
      ACCESS_TOKEN_DEFAULT_EXPIRES_IN,
    );
    const accessSecret = this.getRequiredConfig('JWT_ACCESS_SECRET');
    const expiresAt = new Date(Date.now() + durationToMs(refreshExpiresIn));

    const temporaryHash = hashToken(`${user.id}:${Date.now()}:${Math.random()}`);

    const session = await this.prisma.accountSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: temporaryHash,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        deviceName: sessionContext.deviceName,
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

    const accessPayload: AuthTokenPayload = {
      sub: user.id,
      sessionId: session.id,
      type: 'access',
      username: user.username,
    };

    const refreshPayload: AuthTokenPayload = {
      sub: user.id,
      sessionId: session.id,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    await this.prisma.accountSession.update({
      where: {
        id: session.id,
      },
      data: {
        sessionTokenHash: hashToken(refreshToken),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async validateRefreshToken(refreshToken: string) {
    const payload = await this.verifyRefreshJwt(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const session = await this.prisma.accountSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        sessionTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }

    return session;
  }

  private async findSessionByToken(refreshToken: string) {
    try {
      const payload = await this.verifyRefreshJwt(refreshToken);
      const tokenHash = hashToken(refreshToken);

      return this.prisma.accountSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          sessionTokenHash: tokenHash,
          revokedAt: null,
        },
      });
    } catch {
      return null;
    }
  }

  private async verifyRefreshJwt(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Oturum yenilenemedi.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new InternalServerErrorException('Auth ayarlari eksik.');
    }

    return value;
  }

  private getJwtExpiresIn(key: string, fallback: StringValue) {
    const value = this.configService.get<string>(key)?.trim();
    return (value && value.length > 0 ? value : fallback) as StringValue;
  }

  private handlePrismaWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta.target.filter((item): item is string => typeof item === 'string')
        : [];

      if (targets.includes('username')) {
        throw new ConflictException('Bu kullanici adi zaten kullaniliyor.');
      }

      if (targets.includes('email')) {
        throw new ConflictException('Bu email adresi zaten kullaniliyor.');
      }

      if (targets.includes('phone')) {
        throw new ConflictException('Bu telefon numarasi zaten kullaniliyor.');
      }

      if (targets.includes('tcIdentityNo')) {
        throw new ConflictException('Bu TC kimlik numarasi zaten kullaniliyor.');
      }

      throw new ConflictException('Girdiginiz bilgilerden biri zaten kullaniliyor.');
    }

    throw new InternalServerErrorException('Islem tamamlanamadi. Lutfen tekrar deneyin.');
  }
}
