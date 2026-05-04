import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser, AuthTokenPayload } from './auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      authUser?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Yetkilendirme gereklidir.');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Yetkilendirme gereklidir.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Gecersiz oturum.');
      }

      const [user, session] = await Promise.all([
        this.prisma.user.findFirst({
          where: {
            id: payload.sub,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.accountSession.findFirst({
          where: {
            id: payload.sessionId,
            userId: payload.sub,
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

      if (!user || !session) {
        throw new UnauthorizedException('Oturum gecersiz veya suresi dolmus.');
      }

      void this.prisma.accountSession
        .update({
          where: {
            id: payload.sessionId,
          },
          data: {
            lastSeenAt: new Date(),
          },
        })
        .catch(() => undefined);

      request.authUser = {
        userId: payload.sub,
        username: payload.username,
        sessionId: payload.sessionId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Oturum gecersiz veya suresi dolmus.');
    }
  }
}
