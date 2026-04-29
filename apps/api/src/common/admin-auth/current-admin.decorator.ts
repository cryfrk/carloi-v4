import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedAdmin } from './admin-auth.types';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
    const request = context.switchToHttp().getRequest<{ adminUser: AuthenticatedAdmin }>();
    return request.adminUser;
  },
);
