import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface TenantContext {
  companyId: string;
  role: MemberRole;
}

/**
 * Global guard (APP_GUARD). Runs after JwtAuthGuard, before SubscriptionStatusGuard.
 * Resolves the caller's active membership into req.companyId + req.role.
 * Fail-closed: no user / no active membership => 403. Skips @Public() routes.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    if (!userId) throw new ForbiddenException();

    const ctx = await this.resolve(userId);
    request.companyId = ctx.companyId;
    request.role = ctx.role;
    return true;
  }

  private async resolve(userId: string): Promise<TenantContext> {
    const cacheKey = `tenant:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TenantContext;
        if (parsed?.companyId && parsed?.role) return parsed;
      } catch {
        // fall through to DB on malformed cache
      }
    }

    const membership = await this.prisma.companyMember.findFirst({
      where: { user_id: userId, active: true },
      select: { company_id: true, role: true },
    });
    if (!membership) throw new ForbiddenException();

    const ctx: TenantContext = { companyId: membership.company_id, role: membership.role };
    await this.redis.setex(cacheKey, 60, JSON.stringify(ctx));
    return ctx;
  }
}
