import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Global guard (APP_GUARD). Runs after TenantGuard.
 * Enforces @Roles(...) against req.role. Routes without @Roles are open to any
 * active member. Fail-closed: @Roles present but req.role missing/not allowed => 403.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<MemberRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const role: MemberRole | undefined = context.switchToHttp().getRequest().role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Ação restrita a administradores da empresa.');
    }
    return true;
  }
}
