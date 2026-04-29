import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedAdmin } from './admin-auth.types';
import { ADMIN_ROLES_KEY } from './admin-roles.decorator';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ADMIN_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ adminUser?: AuthenticatedAdmin }>();
    const adminUser = request.adminUser;

    if (!adminUser || !requiredRoles.includes(adminUser.role)) {
      throw new ForbiddenException('Bu admin islemi icin yetkiniz yok.');
    }

    return true;
  }
}
