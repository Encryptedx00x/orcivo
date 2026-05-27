# 03-P05 — SubscriptionStatusGuard + Bloqueio escalonado

## Goal
Criar `SubscriptionStatusGuard` que bloqueia mutations quando status é BLOCKED, e expor endpoint `GET /me/subscription-status` para o app consultar e exibir banner.

## Wave
3 (depende de 03-P02)

## Context
- `SubscriptionService.isBlocked()` disponível após P02
- Inadimplente PODE: logar, ver dados, exportar
- Inadimplente NÃO PODE: criar/modificar/emitir
- Mensagem mobile: "Sua assinatura está inativa. Acesse orcivo.com.br para regularizar."

## Tasks

### T1 — SubscriptionStatusGuard

Criar `apps/backend/src/billing/subscription-status.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

export const ALLOW_PAST_DUE_KEY = 'allowPastDue';

@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  constructor(
    private readonly subs: SubscriptionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Rotas públicas passam
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // Rotas marcadas como AllowPastDue passam (ex: GET /me/subscription-status)
    const allowPastDue = this.reflector.getAllAndOverride<boolean>(ALLOW_PAST_DUE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (allowPastDue) return true;

    const req = ctx.switchToHttp().getRequest();

    // Apenas bloqueia mutations (POST, PUT, PATCH, DELETE) — GET passa sempre
    const method = req.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

    const companyId = req.companyId as string | undefined;
    if (!companyId) return true; // sem tenant context = deja vu, outro guard cuida

    const isBlocked = await this.subs.isBlocked(companyId);
    if (isBlocked) {
      throw new ForbiddenException(
        'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.'
      );
    }

    return true;
  }
}
```

### T2 — Decorator @AllowPastDue

Criar `apps/backend/src/billing/allow-past-due.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
export const ALLOW_PAST_DUE_KEY = 'allowPastDue';
export const AllowPastDue = () => SetMetadata(ALLOW_PAST_DUE_KEY, true);
```

### T3 — Registrar Guard globalmente

Em `apps/backend/src/app.module.ts`, no array `providers`:

```typescript
import { SubscriptionStatusGuard } from './billing/subscription-status.guard';
import { APP_GUARD } from '@nestjs/core';

// Adicionar ao providers:
{ provide: APP_GUARD, useClass: SubscriptionStatusGuard },
```

**Ordem dos guards globais deve ser:**
1. `JwtAuthGuard` (autentica)
2. `TenantGuard` (seta companyId)
3. `SubscriptionStatusGuard` (verifica bloqueio)

### T4 — Endpoint GET /me/subscription-status

Em `CompanyController` (ou `MeController`), adicionar com `@AllowPastDue()`:

```typescript
@AllowPastDue()
@Get('me/subscription-status')
async getSubscriptionStatus(@Req() req: TenantRequest) {
  const sub = await this.subscriptionService.getOrCreate(req.companyId);
  return {
    status: sub.status,
    plan_code: sub.plan_code,
    is_blocked: sub.status === 'BLOCKED',
    is_past_due: sub.status === 'PAST_DUE',
    message: sub.status === 'BLOCKED'
      ? 'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.'
      : sub.status === 'PAST_DUE'
        ? 'Há um pagamento pendente. Acesse orcivo.com.br para regularizar.'
        : null,
  };
}
```

### T5 — Endpoints que devem ter @AllowPastDue

Adicionar `@AllowPastDue()` nos seguintes endpoints (leitura permitida para inadimplentes):
- `GET /customers` e `GET /customers/:id`
- `GET /quotes` e `GET /quotes/:id`
- `GET /work-orders` e `GET /work-orders/:id`
- `GET /catalog`
- `GET /me/*`
- Todos os endpoints de exportação de dados (LGPD)

Obs: Como o guard já libera todos os GET automaticamente, não é necessário adicionar `@AllowPastDue()` em GETs — apenas em casos especiais de mutations permitidas para inadimplentes (ex: exportar dados via POST).

## Verification

```bash
# TypeCheck
cd apps/backend && npx tsc --noEmit

# Guard registrado globalmente
grep "SubscriptionStatusGuard\|APP_GUARD" apps/backend/src/app.module.ts

# Endpoint subscription-status existe
grep "subscription-status\|getSubscriptionStatus" apps/backend/src/company/company.controller.ts

# Guard libera GETs
grep "method === 'GET'" apps/backend/src/billing/subscription-status.guard.ts
```

## Notes
- Guard é registrado APÓS JwtAuthGuard e TenantGuard para ter acesso a `req.companyId`
- LIVRE sem Subscription retorna `status: null, is_blocked: false` — plano gratuito, sempre ativo
- Endpoint `/me/subscription-status` deve ter `@AllowPastDue()` para que usuário bloqueado possa ver o status
