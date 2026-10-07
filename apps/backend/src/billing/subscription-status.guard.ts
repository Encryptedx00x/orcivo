import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ALLOW_PAST_DUE_KEY } from './allow-past-due.decorator';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Rotas públicas passam sem verificação
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // Rotas marcadas como AllowPastDue passam sempre
    const allowPastDue = this.reflector.getAllAndOverride<boolean>(ALLOW_PAST_DUE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (allowPastDue) return true;

    const req = ctx.switchToHttp().getRequest<{ method?: string; companyId?: string }>();

    // Apenas bloqueia mutations — GETs passam sempre (inadimplente pode visualizar)
    const method = req.method?.toUpperCase();
    if (!method || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

    const companyId = req.companyId;
    // TenantGuard runs before this guard and sets req.companyId for every
    // authenticated non-public route. Missing here on a mutation = fail closed.
    if (!companyId) throw new ForbiddenException();

    const isBlocked = await this.subscriptionService.isBlocked(companyId);
    if (isBlocked) {
      throw new ForbiddenException(
        'Sua assinatura está inativa. Em Plano e assinatura, toque em Gerenciar assinatura.',
      );
    }

    return true;
  }
}
