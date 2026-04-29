import {
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedAdmin, AdminAuthTokenPayload } from './admin-auth.types';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_SHARED_SECRET_KEY = 'ADMIN_JWT_SECRET';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      adminUser?: AuthenticatedAdmin;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin yetkilendirmesi gereklidir.');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Admin yetkilendirmesi gereklidir.');
    }

    try {
      const secret =
        this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET')?.trim() ||
        this.configService.get<string>(ADMIN_SHARED_SECRET_KEY)?.trim();

      if (!secret) {
        throw new InternalServerErrorException('Admin auth ayarlari eksik.');
      }

      const payload = await this.jwtService.verifyAsync<AdminAuthTokenPayload>(token, {
        secret,
      });

      if (payload.type !== 'admin-access' || !payload.role) {
        throw new UnauthorizedException('Gecersiz admin oturumu.');
      }

      const [adminUser, session] = await Promise.all([
        this.prisma.adminUser.findFirst({
          where: {
            id: payload.sub,
            isActive: true,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.adminSession.findFirst({
          where: {
            id: payload.sessionId,
            adminUserId: payload.sub,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (!adminUser || !session) {
        throw new UnauthorizedException('Admin oturumu gecersiz veya suresi dolmus.');
      }

      request.adminUser = {
        adminUserId: payload.sub,
        username: payload.username,
        role: payload.role,
        sessionId: payload.sessionId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Admin oturumu gecersiz veya suresi dolmus.');
    }
  }
}
