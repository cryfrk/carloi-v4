import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import {
  durationToMs,
  hashToken,
  type SessionContext,
} from '../auth/auth.utils';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AdminAuthTokenPayload } from '../../common/admin-auth/admin-auth.types';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLogoutDto } from './dto/admin-logout.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminRateLimitService } from './admin-rate-limit.service';

type SafeAdminUser = {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'INSURANCE_ADMIN' | 'COMMERCIAL_ADMIN';
  isActive: boolean;
};

const ADMIN_ACCESS_DEFAULT_EXPIRES_IN = '15m';
const ADMIN_REFRESH_DEFAULT_EXPIRES_IN = '30d';
const ADMIN_SHARED_SECRET_KEY = 'ADMIN_JWT_SECRET';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly rateLimitService: AdminRateLimitService,
  ) {}

  async login(dto: AdminLoginDto, sessionContext: SessionContext) {
    const username = dto.username.trim().toLowerCase();
    await this.rateLimitService.consume({
      key: `admin:login:ip:${sessionContext.ipAddress ?? 'unknown'}`,
      limit: 15,
      windowMs: 15 * 60_000,
    });
    await this.rateLimitService.consume({
      key: `admin:login:username:${username}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });

    const adminUser = await this.prisma.adminUser.findUnique({
      where: {
        username,
      },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin giris bilgileri gecersiz.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, adminUser.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Admin giris bilgileri gecersiz.');
    }

    const tokens = await this.issueTokenPair(adminUser, sessionContext);

    return {
      ...tokens,
      admin: this.toSafeAdminUser(adminUser),
    };
  }

  async refresh(dto: AdminRefreshDto, sessionContext: SessionContext) {
    const session = await this.validateRefreshToken(dto.refreshToken);

    await this.prisma.adminSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const adminUser = await this.prisma.adminUser.findUnique({
      where: {
        id: session.adminUserId,
      },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin oturumu yenilenemedi.');
    }

    const tokens = await this.issueTokenPair(adminUser, sessionContext);

    return {
      ...tokens,
      admin: this.toSafeAdminUser(adminUser),
    };
  }

  async logout(dto: AdminLogoutDto) {
    const session = await this.findSessionByToken(dto.refreshToken);

    if (session) {
      await this.prisma.adminSession.updateMany({
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

  async me(adminUserId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: {
        id: adminUserId,
      },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin bulunamadi.');
    }

    return {
      admin: this.toSafeAdminUser(adminUser),
    };
  }

  private async issueTokenPair(
    adminUser: {
      id: string;
      username: string;
      role: 'SUPER_ADMIN' | 'INSURANCE_ADMIN' | 'COMMERCIAL_ADMIN';
    },
    sessionContext: SessionContext,
  ) {
    const refreshExpiresIn = this.getJwtExpiresIn(
      'ADMIN_JWT_REFRESH_EXPIRES_IN',
      ADMIN_REFRESH_DEFAULT_EXPIRES_IN,
    );
    const refreshSecret = this.getAdminJwtSecret('ADMIN_JWT_REFRESH_SECRET');
    const accessExpiresIn = this.getJwtExpiresIn(
      'ADMIN_JWT_ACCESS_EXPIRES_IN',
      ADMIN_ACCESS_DEFAULT_EXPIRES_IN,
    );
    const accessSecret = this.getAdminJwtSecret('ADMIN_JWT_ACCESS_SECRET');
    const expiresAt = new Date(Date.now() + durationToMs(refreshExpiresIn));
    const temporaryHash = hashToken(`${adminUser.id}:${Date.now()}:${Math.random()}`);

    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: adminUser.id,
        sessionTokenHash: temporaryHash,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        expiresAt,
        lastSeenAt: new Date(),
      },
    });

    const accessPayload: AdminAuthTokenPayload = {
      sub: adminUser.id,
      sessionId: session.id,
      type: 'admin-access',
      username: adminUser.username,
      role: adminUser.role,
    };
    const refreshPayload: AdminAuthTokenPayload = {
      sub: adminUser.id,
      sessionId: session.id,
      type: 'admin-refresh',
      role: adminUser.role,
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

    await this.prisma.adminSession.update({
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

    const session = await this.prisma.adminSession.findFirst({
      where: {
        id: payload.sessionId,
        adminUserId: payload.sub,
        sessionTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Admin oturumu yenilenemedi.');
    }

    return session;
  }

  private async findSessionByToken(refreshToken: string) {
    try {
      const payload = await this.verifyRefreshJwt(refreshToken);
      const tokenHash = hashToken(refreshToken);

      return this.prisma.adminSession.findFirst({
        where: {
          id: payload.sessionId,
          adminUserId: payload.sub,
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
      const payload = await this.jwtService.verifyAsync<AdminAuthTokenPayload>(refreshToken, {
        secret: this.getAdminJwtSecret('ADMIN_JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'admin-refresh' || !payload.role) {
        throw new UnauthorizedException('Admin oturumu yenilenemedi.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Admin oturumu yenilenemedi.');
    }
  }

  private getJwtExpiresIn(key: string, fallback: string) {
    const value = this.configService.get<string>(key)?.trim();
    return (value && value.length > 0 ? value : fallback) as StringValue;
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new InternalServerErrorException('Admin auth ayarlari eksik.');
    }

    return value;
  }

  private getAdminJwtSecret(primaryKey: string) {
    const primaryValue = this.configService.get<string>(primaryKey)?.trim();
    if (primaryValue) {
      return primaryValue;
    }

    const sharedValue = this.configService.get<string>(ADMIN_SHARED_SECRET_KEY)?.trim();
    if (sharedValue) {
      return sharedValue;
    }

    throw new InternalServerErrorException('Admin auth ayarlari eksik.');
  }

  private toSafeAdminUser(adminUser: {
    id: string;
    username: string;
    role: 'SUPER_ADMIN' | 'INSURANCE_ADMIN' | 'COMMERCIAL_ADMIN';
    isActive: boolean;
  }): SafeAdminUser {
    return {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      isActive: adminUser.isActive,
    };
  }
}
