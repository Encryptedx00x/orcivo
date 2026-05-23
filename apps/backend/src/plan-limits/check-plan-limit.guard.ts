import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_LIMIT_KEY } from './check-plan-limit.decorator';
import { PlanLimitsService } from './plan-limits.service';

@Injectable()
export class CheckPlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride(PLAN_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!feature) return true;
    const req = ctx.switchToHttp().getRequest();
    const companyId: string = req.companyId;
    if (!companyId) return true; // guard sem tenant context não bloqueia
    const result = await this.planLimits.check(companyId, feature);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason ?? 'Limite do plano atingido');
    }
    return true;
  }
}
