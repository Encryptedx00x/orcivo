---
phase: "2A"
plan: "02-P03"
title: "Auth — Reset de senha (forgot-password + reset-password)"
wave: 2
depends_on: ["02-P01", "02-P02"]
files_modified:
  - apps/backend/src/auth/auth.controller.ts
  - apps/backend/src/auth/auth.service.ts
  - apps/backend/src/auth/auth.service.spec.ts
autonomous: true
requirements: ["AUTH"]

must_haves:
  truths:
    - "POST /auth/forgot-password retorna 200 mesmo quando e-mail não existe (não revela existência)"
    - "POST /auth/forgot-password envia e-mail com link contendo token UUID via MailService"
    - "POST /auth/reset-password com token válido atualiza senha e invalida token (redis.del)"
    - "POST /auth/reset-password com token expirado/inválido retorna 400"
    - "Token armazenado no Redis com TTL de 900 segundos (15 minutos)"
  artifacts:
    - path: "apps/backend/src/auth/auth.service.ts"
      provides: "forgotPassword(email), resetPassword(token, newPassword)"
      contains: "forgotPassword"
    - path: "apps/backend/src/auth/auth.service.spec.ts"
      provides: "Testes unitários: token expirado rejeitado, e-mail não existente retorna 200"
      contains: "forgotPassword"
  key_links:
    - from: "apps/backend/src/auth/auth.controller.ts"
      to: "POST /auth/forgot-password"
      via: "@Post('forgot-password') @Public()"
      pattern: "forgot-password"
    - from: "apps/backend/src/auth/auth.service.ts"
      to: "MailService"
      via: "this.mail.send(...)"
      pattern: "mail\\.send"
---

<objective>
Implementar os endpoints de reset de senha no AuthModule existente: forgot-password (gera token Redis TTL 15min + envia e-mail) e reset-password (valida token, atualiza senha, invalida token).

Purpose: Decisão D2-02 — reset de senha é requisito da Fase 2A. Depende do MailService (P02) e dos DTOs ForgotPasswordSchema/ResetPasswordSchema (P01).
Output: Dois endpoints @Public() no AuthController; dois métodos no AuthService; testes unitários cobrindo casos de erro.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Ler antes de modificar: -->
<!-- apps/backend/src/auth/auth.service.ts — já tem login(), signup(), refresh(), logout() -->
<!-- apps/backend/src/auth/auth.controller.ts — já tem rotas de auth; NÃO remover existentes -->
<!-- apps/backend/src/auth/auth.module.ts — verificar se MailService já está injetável (via @Global MailModule) -->

<!-- RedisService já é @Global() — injetável via constructor sem importar RedisModule -->
<!-- PrismaService já é @Global() — injetável via constructor sem importar PrismaModule -->
<!-- MailService já é @Global() via MailModule (criado em P02) -->

<!-- DTOs disponíveis após P01: -->
<!-- ForgotPasswordSchema, ForgotPasswordDto de @orcivo/shared-types -->
<!-- ResetPasswordSchema, ResetPasswordDto de @orcivo/shared-types -->

<!-- Padrão argon2 existente no AuthService (para hashing de senha) -->
<!-- Redis key pattern para pwd reset: 'pwd:reset:{token}' com TTL 900s (15 min) -->
<!-- APP_WEB_URL env var: URL do frontend para gerar link de reset -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: forgotPassword + resetPassword no AuthService</name>
  <files>
    apps/backend/src/auth/auth.service.ts,
    apps/backend/src/auth/auth.service.spec.ts
  </files>
  <read_first>
    - apps/backend/src/auth/auth.service.ts (ler COMPLETO — adicionar métodos sem remover existentes)
    - apps/backend/src/auth/auth.module.ts (verificar providers e imports atuais)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 8: Reset de senha com Resend + Redis"
  </read_first>
  <behavior>
    - Test 1: forgotPassword com e-mail inexistente → retorna void sem lançar exceção (não revela existência)
    - Test 2: forgotPassword com e-mail existente → chama redis.set com key 'pwd:reset:{uuid}' e TTL 900 + chama mail.send com subject 'Redefinir senha — Orcivo'
    - Test 3: resetPassword com token válido (redis retorna userId) → atualiza password_hash com argon2.hash + chama redis.del(key)
    - Test 4: resetPassword com token inválido (redis retorna null) → lança BadRequestException('Token inválido ou expirado')
  </behavior>
  <action>
Adicionar ao AuthService (sem remover métodos existentes):

```typescript
// Adicionar imports no topo do auth.service.ts:
import { ForgotPasswordDto, ResetPasswordDto } from '@orcivo/shared-types';
import { MailService } from '../mail/mail.service';
// (ConfigService já deve estar importado para APP_WEB_URL)

// Adicionar ao constructor do AuthService:
private readonly mail: MailService,
private readonly config: ConfigService, // se não existir já

// Adicionar métodos:
async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  // Sempre retorna void — não revelar se e-mail existe (ASVS V2)
  if (!user) return;

  const token = crypto.randomUUID();
  await this.redis.set(`pwd:reset:${token}`, user.id, 'EX', 900); // 15 min

  const resetUrl = `${this.config.get('APP_WEB_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
  await this.mail.send({
    to: dto.email,
    subject: 'Redefinir senha — Orcivo',
    html: `<p>Clique no link para redefinir sua senha (válido por 15 minutos):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

async resetPassword(dto: ResetPasswordDto): Promise<void> {
  const redisKey = `pwd:reset:${dto.token}`;
  const userId = await this.redis.get(redisKey);
  if (!userId) throw new BadRequestException('Token inválido ou expirado');

  const hash = await argon2.hash(dto.new_password);
  await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
  await this.redis.del(redisKey); // invalidar token após uso único
}
```

Criar/atualizar apps/backend/src/auth/auth.service.spec.ts com os 4 testes comportamentais acima.
Usar mocks para PrismaService, RedisService e MailService.
Seguir padrão de test existente no projeto (Jest).

Verificar que `crypto` está importado: `import * as crypto from 'crypto'` (Node built-in — sem install).
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=auth.service 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Os 4 testes comportamentais passam (verde)
    - forgotPassword retorna void sem exceção para e-mail inexistente
    - resetPassword lança BadRequestException para token inválido
    - resetPassword chama redis.del após resetar senha
  </done>
</task>

<task type="auto">
  <name>Task 2: Endpoints @Public() no AuthController</name>
  <files>apps/backend/src/auth/auth.controller.ts</files>
  <read_first>
    - apps/backend/src/auth/auth.controller.ts (ler COMPLETO — adicionar endpoints sem remover existentes)
    - apps/backend/src/auth/guards/public.decorator.ts (verificar nome do decorator @Public())
  </read_first>
  <action>
Adicionar ao AuthController (sem remover rotas existentes):

```typescript
// Adicionar imports:
import { ForgotPasswordSchema, ResetPasswordSchema } from '@orcivo/shared-types';

// Adicionar endpoints:
@Post('forgot-password')
@Public()
@HttpCode(200)
forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordSchema)) body: unknown) {
  return this.authService.forgotPassword(body as ForgotPasswordDto);
}

@Post('reset-password')
@Public()
@HttpCode(200)
resetPassword(@Body(new ZodValidationPipe(ResetPasswordSchema)) body: unknown) {
  return this.authService.resetPassword(body as ResetPasswordDto);
}
```

Ambas as rotas devem ter `@Public()` pois o usuário não tem JWT no momento do reset.
`@HttpCode(200)` explícito em ambas (forgot-password retorna void → 200 OK).
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend build 2>&1 | grep -E "^.*error TS" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Backend compila sem erros
    - POST /auth/forgot-password e POST /auth/reset-password presentes no controller
    - Ambas as rotas têm @Public()
    - Rota forgot-password retorna 200 (não 201)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| público → POST /auth/forgot-password | Sem autenticação; rate limiting deve ser configurado no gateway (Fase 3) |
| Redis token → banco | Token é UUID v4 (122 bits entropia); TTL 15min; invalidado após uso |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-06 | Information Disclosure | forgot-password resposta | mitigate | Sempre retornar 200 mesmo quando e-mail não existe — não revelar existência de conta |
| T-2A-07 | Elevation of Privilege | reset token reutilizado | mitigate | `redis.del(key)` imediatamente após uso bem-sucedido — token one-shot |
| T-2A-08 | Spoofing | token UUID adivinhado | accept | UUID v4 = 2^122 possibilidades; TTL 15min reduz janela; risco aceitável sem rate limiting nesta fase |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend test --testPathPattern=auth.service
pnpm --filter @orcivo/backend build
grep -n "forgot-password\|reset-password" apps/backend/src/auth/auth.controller.ts
grep -n "@Public" apps/backend/src/auth/auth.controller.ts
```
</verification>

<success_criteria>
- 4 testes unitários passam (token inválido rejeita, e-mail inexistente retorna void, token válido atualiza senha, token invalidado após uso)
- POST /auth/forgot-password retorna 200 com body vazio
- POST /auth/reset-password retorna 200 ou 400 conforme token
- Backend compila sem erros TypeScript
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P03-SUMMARY.md`
</output>
