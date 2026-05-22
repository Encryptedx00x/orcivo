import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.userId;

    if (!userId) throw new ForbiddenException();

    const cacheKey = `tenant:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      request.companyId = cached;
      return true;
    }

    const membership = await this.prisma.companyMember.findFirst({
      where: { user_id: userId, active: true },
      select: { company_id: true },
    });

    if (!membership) throw new ForbiddenException();

    await this.redis.setex(cacheKey, 60, membership.company_id);
    request.companyId = membership.company_id;
    return true;
  }
}
