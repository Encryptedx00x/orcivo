---
phase: 01-vertical-slice
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - apps/backend/src/prisma/prisma.module.ts
  - apps/backend/src/prisma/prisma.service.ts
  - apps/backend/src/redis/redis.module.ts
  - apps/backend/src/redis/redis.service.ts
  - apps/backend/src/auth/auth.module.ts
  - apps/backend/src/auth/auth.controller.ts
  - apps/backend/src/auth/auth.service.ts
  - apps/backend/src/auth/strategies/jwt.strategy.ts
  - apps/backend/src/auth/strategies/refresh-token.strategy.ts
  - apps/backend/src/auth/guards/jwt-auth.guard.ts
  - apps/backend/src/auth/guards/tenant.guard.ts
  - apps/backend/src/auth/decorators/public.decorator.ts
  - apps/backend/src/auth/decorators/current-user.decorator.ts
  - apps/backend/src/common/zod-validation.pipe.ts
  - apps/backend/src/app.module.ts
  - apps/backend/src/main.ts
  - apps/backend/src/auth/auth.e2e.spec.ts
  - apps/backend/src/auth/guards/tenant.guard.spec.ts
  - apps/backend/.env.example
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]
must_haves:
  truths:
    - "Signup em 2 etapas cria User, depois Company + CompanyMember (OWNER) com plano LIVRE"
    - "Login retorna access_token (15min) + refresh_token e nunca retorna password_hash"
    - "JWT só identifica; TenantGuard injeta company_id revalidado via Redis cache 60s"
    - "Logout revoga o refresh token (próximo uso retorna 401)"
    - "POST /auth/login tem rate limiting"
  artifacts:
    - path: "apps/backend/src/auth/auth.service.ts"
      provides: "argon2 hash, emissão de JWT access+refresh, signup, login, refresh, logout"
      min_lines: 80
    - path: "apps/backend/src/auth/guards/tenant.guard.ts"
      provides: "Injeção de company_id via Redis 60s"
      contains: "request.companyId"
    - path: "apps/backend/src/auth/strategies/jwt.strategy.ts"
      provides: "Validação de access token + revalidação de membership"
  key_links:
    - from: "apps/backend/src/auth/auth.controller.ts"
      to: "auth.service"
      via: "injeção de dependência"
      pattern: "private.*authService"
    - from: "apps/backend/src/auth/strategies/jwt.strategy.ts"
      to: "RedisService + PrismaService"
      via: "revalidação de membership"
      pattern: "redisService\\.(get|setex)"
---

<objective>
Implementar o módulo de autenticação completo do molde arquitetural: infra Prisma/Redis (globais), AuthModule com signup 2 etapas (argon2), login, refresh token single-use, logout, JwtStrategy/RefreshStrategy, JwtAuthGuard, TenantGuard, decorators @Public()/@CurrentUser() e o ZodValidationPipe. Registra ADR-006 (auth) e ADR-012 (2FA deferido).

Purpose: Auth é o coração do molde. Toda fase futura replica este padrão de guards e DTOs validados por Zod.
Output: Backend NestJS com /auth/* funcional e guards prontos para serem usados por Company e Customer.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-vertical-slice/01-RESEARCH.md
@.planning/phases/01-vertical-slice/01-PATTERNS.md
@CLAUDE.md
@.planning/phases/01-vertical-slice/01-01-SUMMARY.md

<interfaces>
<!-- DTOs já criados em P01 — importar de @orcivo/shared-types: -->
```typescript
import { SignupStep1Schema, SignupStep1Dto, SignupStep2Schema, SignupStep2Dto,
         LoginSchema, LoginDto, LoginResponseDto } from '@orcivo/shared-types';
```

<!-- Schema Prisma (P01) — modelos relevantes: -->
<!-- User(id, email @unique, name, phone?, password_hash, accepted_terms_at) -->
<!-- Company(id, trade_name, ..., plan_code @default(LIVRE)) -->
<!-- CompanyMember(company_id, user_id, role @default(TECNICO), active) -->
<!-- RefreshToken(id, user_id, token_hash @unique, expires_at, revoked) -->

JWT payload (D-discrição, ver RESEARCH.md linha 340):
```typescript
interface JwtPayload { sub: string; email: string; iat?: number; exp?: number; }
```

Padrões de código completos: ver PATTERNS.md Grupos 4-8 (linhas 201-409) e RESEARCH.md Patterns 1-2 (linhas 299-391).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Infra Prisma + Redis (módulos globais) e ZodValidationPipe</name>
  <read_first>
    - apps/backend/src/health/health.module.ts (analog de módulo)
    - apps/backend/src/main.ts (bootstrap atual — não quebrar CORS/PORT existentes)
    - apps/backend/src/app.module.ts (registrar novos módulos)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 4 linhas 201-229, Grupo 5 linhas 233-270)
  </read_first>
  <behavior>
    - PrismaService conecta no onModuleInit
    - RedisService expõe get/setex/del e fecha conexão no onModuleDestroy
    - ZodValidationPipe lança BadRequestException (400) com mensagens pt-BR quando o schema rejeita
  </behavior>
  <action>
    1. Instalar dependências backend: `cd apps/backend && pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt argon2 ioredis @nestjs/config @nestjs/throttler` e `pnpm add -D @types/passport-jwt @types/passport`. Versões: @nestjs/passport 11.0.5, @nestjs/jwt 11.0.2, passport-jwt 4.0.1, argon2 0.44.0, ioredis 5.10.1, @nestjs/config 4.0.4.
    2. Criar `src/prisma/prisma.service.ts` (extends PrismaClient implements OnModuleInit, $connect no onModuleInit) e `src/prisma/prisma.module.ts` (@Global, providers/exports PrismaService) — copiar PATTERNS.md Grupo 4.
    3. Criar `src/redis/redis.service.ts` (ioredis singleton via ConfigService REDIS_HOST/REDIS_PORT, métodos get/setex/del, onModuleDestroy quit) e `src/redis/redis.module.ts` (@Global, providers/exports RedisService) — copiar PATTERNS.md Grupo 5.
    4. Criar `src/common/zod-validation.pipe.ts`: implementa PipeTransform, recebe um ZodSchema no construtor, no transform usa `schema.safeParse(value)`; se `!success`, lança `BadRequestException` com `result.error.issues` mapeados para mensagens pt-BR; senão retorna `result.data`.
    5. Atualizar `src/app.module.ts`: adicionar imports ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RedisModule, ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]), manter HealthModule. AuthModule será adicionado na Task 4 (mesmo arquivo — fazer numa única edição final, ver Task 4).
  </action>
  <verify>
    <automated>cd apps/backend && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/backend && pnpm build` compila sem erro
    - grep `extends PrismaClient` em src/prisma/prisma.service.ts
    - grep `@Global()` em src/prisma/prisma.module.ts E src/redis/redis.module.ts
    - grep `safeParse` em src/common/zod-validation.pipe.ts
    - grep `BadRequestException` em src/common/zod-validation.pipe.ts
  </acceptance_criteria>
  <done>PrismaModule e RedisModule globais; ZodValidationPipe pronto; build verde.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Strategies, guards e decorators de auth</name>
  <read_first>
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 6 linhas 274-326, Grupo 7 linhas 330-371, Grupo 8 linhas 375-409)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pattern 1 linhas 299-350, Pattern 2 linhas 352-391, Pitfall 2 linhas 836-840)
    - apps/backend/src/auth/guards/tenant.guard.spec.ts (stub Wave 0 de P01 — implementar real)
  </read_first>
  <behavior>
    - JwtStrategy valida access token via JWT_ACCESS_SECRET; revalida membership via Redis cache `membership:{userId}` 60s; lança UnauthorizedException se sem membership ativo
    - TenantGuard injeta request.companyId via Redis cache `tenant:{userId}` 60s; lança ForbiddenException se sem empresa
    - JwtAuthGuard respeita @Public() (pula validação)
    - RefreshTokenStrategy usa JWT_REFRESH_SECRET (segredo DISTINTO do access)
    - tenant.guard.spec.ts: TenantGuard injeta companyId correto e bloqueia user sem membership
  </behavior>
  <action>
    1. Criar `src/auth/strategies/jwt.strategy.ts` — copiar PATTERNS.md Grupo 6 (linhas 274-326). Usa `configService.getOrThrow('JWT_ACCESS_SECRET')`. validate() revalida membership via Redis 60s e retorna `{ userId, email }`.
    2. Criar `src/auth/strategies/refresh-token.strategy.ts` — PassportStrategy(Strategy, 'jwt-refresh'), `secretOrKey: getOrThrow('JWT_REFRESH_SECRET')`, extrai refresh token do body (`passReqToCallback: true`), validate retorna `{ userId, refreshToken }`.
    3. Criar `src/auth/guards/jwt-auth.guard.ts` — copiar PATTERNS.md Grupo 8 (linhas 388-408): extends AuthGuard('jwt'), Reflector checa IS_PUBLIC_KEY.
    4. Criar `src/auth/guards/tenant.guard.ts` — copiar PATTERNS.md Grupo 7 (linhas 335-368): injeta request.companyId via Redis 60s.
    5. Criar `src/auth/decorators/public.decorator.ts` (IS_PUBLIC_KEY + Public()) e `src/auth/decorators/current-user.decorator.ts` (createParamDecorator que retorna request.user).
    6. Implementar `src/auth/guards/tenant.guard.spec.ts` (substituir it.todo): testes unitários mockando PrismaService e RedisService — caso com cache hit (companyId vem do Redis), cache miss (busca no banco e setex), e sem membership (ForbiddenException).
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test -- --testPathPattern=tenant.guard.spec</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm test -- --testPathPattern=tenant.guard.spec` passa (não it.todo)
    - grep `request.companyId` em src/auth/guards/tenant.guard.ts
    - grep `JWT_REFRESH_SECRET` em src/auth/strategies/refresh-token.strategy.ts
    - grep `JWT_ACCESS_SECRET` em src/auth/strategies/jwt.strategy.ts (segredos distintos)
    - grep `IS_PUBLIC_KEY` em src/auth/decorators/public.decorator.ts E src/auth/guards/jwt-auth.guard.ts
    - grep `setex.*60` ou `60` em tenant.guard.ts (cache 60s)
  </acceptance_criteria>
  <done>Strategies, guards e decorators criados; segredos JWT distintos; tenant.guard.spec verde.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: AuthService + AuthController (signup, login, refresh, logout)</name>
  <read_first>
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pattern 1 linhas 299-350, Anti-Patterns linhas 470-477, Security Domain linhas 972-992, Open Questions linhas 901-911)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 2 linhas 115-172)
    - apps/backend/src/auth/auth.e2e.spec.ts (stub Wave 0 de P01)
    - apps/backend/src/health/health.controller.ts (analog de controller)
  </read_first>
  <behavior>
    - POST /auth/signup/user: cria User com password_hash argon2; rejeita email duplicado (409); resposta nunca inclui password_hash
    - POST /auth/signup/company: cria Company (plan_code LIVRE) + CompanyMember(role OWNER, active true) para o user autenticado; retorna access+refresh token já no contexto da empresa (D-04)
    - POST /auth/login: valida email+senha (argon2.verify); retorna LoginResponseDto (access_token, user, company); rate-limited
    - POST /auth/refresh: valida refresh token, verifica token_hash não-revogado no banco, emite novo par e REVOGA o anterior (single-use, T-1-05)
    - POST /auth/logout: revoga o refresh token no banco e invalida cache Redis membership/tenant do user
  </behavior>
  <action>
    1. Criar `src/auth/auth.service.ts`:
       - `hashPassword(pw)` usa `argon2.hash` (argon2id default).
       - `signupUser(dto: SignupStep1Dto)`: cria User (password_hash, accepted_terms_at = now). Email duplicado → ConflictException(409). Emite um access token "parcial" (sub=userId) para autorizar o step 2 — OU retorna userId para o cliente enviar no step 2 (escolher: emitir access token curto; documentar no SUMMARY).
       - `signupCompany(userId, dto: SignupStep2Dto)`: cria Company(plan_code LIVRE) + CompanyMember(role OWNER, active true) em transação; emite access(15min)+refresh(30d).
       - `login(dto: LoginDto)`: busca User por email, `argon2.verify(password_hash, dto.password)`; em falha → UnauthorizedException(401) genérico (não vazar se email existe). Carrega CompanyMember ativo → company. Emite tokens. Retorna LoginResponseDto.
       - `issueTokens(userId, email)`: JwtService.sign access (expiresIn '15m', secret JWT_ACCESS_SECRET) + refresh (expiresIn '30d', secret JWT_REFRESH_SECRET); salva SHA-256(refresh) em RefreshToken.
       - `refresh(userId, rawRefreshToken)`: confere token_hash no banco (revoked=false, not expired); revoga o atual; emite novo par.
       - `logout(userId)`: marca refresh tokens do user como revoked; `redis.del('membership:'+userId)` e `redis.del('tenant:'+userId)`.
    2. Criar `src/auth/auth.controller.ts` (@Controller('auth')) — copiar padrão PATTERNS.md Grupo 2:
       - `POST signup/user` @Public(), @UsePipes(new ZodValidationPipe(SignupStep1Schema)).
       - `POST signup/company` protegido por JwtAuthGuard (user do step 1), @CurrentUser(), ZodValidationPipe(SignupStep2Schema).
       - `POST login` @Public(), @UseGuards(ThrottlerGuard) (rate limit), ZodValidationPipe(LoginSchema), @HttpCode(200).
       - `POST refresh` @Public() + @UseGuards(RefreshTokenGuard baseado em AuthGuard('jwt-refresh')).
       - `POST logout` protegido por JwtAuthGuard, @CurrentUser().
       - NENHUM endpoint retorna password_hash — selecionar campos explicitamente.
    3. Implementar `src/auth/auth.e2e.spec.ts` (substituir it.todo): testes de integração com supertest cobrindo AUTH-01 (signup cria User+Company+CompanyMember no banco), AUTH-02 (login retorna access+refresh; resposta não contém password_hash), AUTH-04 (logout → próximo refresh retorna 401). Usar test/setup.ts de P01.
    4. Reset de senha: NÃO implementar (deferido para Fase 2 conforme D-19 + recomendação RESEARCH.md Open Question 1). Documentar a decisão no SUMMARY.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test -- --testPathPattern=auth.e2e</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm test -- --testPathPattern=auth.e2e` passa (signup, login, logout cobertos)
    - grep `argon2.hash` E `argon2.verify` em src/auth/auth.service.ts
    - grep `password_hash` NÃO aparece em nenhuma resposta retornada (selects explícitos) — verificar manualmente que o objeto de resposta do login não inclui password_hash
    - grep `plan_code.*LIVRE` ou `LIVRE` em auth.service.ts (signup cria com plano LIVRE)
    - grep `revoked` em auth.service.ts (logout/refresh revogam token)
    - grep `15m` e `30d` em auth.service.ts (durações de token)
    - grep `ThrottlerGuard` em src/auth/auth.controller.ts (rate limit no login)
  </acceptance_criteria>
  <done>AuthService + AuthController completos; signup 2 etapas, login, refresh single-use, logout; auth.e2e verde; reset deferido documentado.</done>
</task>

<task type="auto">
  <name>Task 4: Wire AuthModule, registrar guards globais e ADRs</name>
  <read_first>
    - apps/backend/src/app.module.ts (estado após Task 1)
    - apps/backend/src/main.ts (bootstrap)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (linhas 391: ordem dos guards)
    - docs/decisions/ (formato dos ADRs existentes 001-011)
  </read_first>
  <action>
    1. Criar `src/auth/auth.module.ts`: imports PassportModule, JwtModule.register({}), ConfigModule; providers AuthService, JwtStrategy, RefreshTokenStrategy; controllers AuthController; exports AuthService. PrismaModule/RedisModule já são @Global.
    2. Atualizar `src/app.module.ts`: adicionar AuthModule aos imports. Registrar JwtAuthGuard como APP_GUARD global (via providers `{ provide: APP_GUARD, useClass: JwtAuthGuard }`) para que TODA rota seja protegida por padrão exceto @Public(). TenantGuard NÃO é global — aplicado por controller de domínio (Company/Customer).
    3. Atualizar `src/main.ts`: garantir CORS configurado para credentials (cookies do web) e ALLOWED_ORIGINS existente. Não remover config existente da Fase 0.
    4. Criar `apps/backend/.env.example` com: PORT, ALLOWED_ORIGINS, DATABASE_URL, DATABASE_URL_TEST, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, REDIS_HOST, REDIS_PORT. Comentar que ACCESS e REFRESH secrets DEVEM ser distintos.
    5. Criar `docs/decisions/ADR-012-2fa-deferido.md`: registrar que 2FA/TOTP foi deferido da Fase 1 (D-18) para fase de segurança dedicada antes de produção.
    6. Atualizar `docs/decisions/ADR-006-auth-jwt-proprio.md` se necessário com a decisão de refresh token single-use + hash SHA-256 no banco + reset de senha deferido (D-19).
  </action>
  <verify>
    <automated>cd apps/backend && pnpm build && pnpm test -- --testPathPattern=auth.e2e</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm build` compila sem erro
    - grep `APP_GUARD` E `JwtAuthGuard` em src/app.module.ts
    - grep `AuthModule` em src/app.module.ts imports
    - Arquivo docs/decisions/ADR-012-2fa-deferido.md existe
    - grep `JWT_ACCESS_SECRET` E `JWT_REFRESH_SECRET` em apps/backend/.env.example
    - auth.e2e continua verde após wiring global
  </acceptance_criteria>
  <done>AuthModule registrado; JwtAuthGuard global com @Public() bypass; ADR-012 criado; .env.example completo.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente → /auth/* | Credenciais e DTOs não confiáveis; validar via Zod, rate-limit no login |
| JWT → autorização | Token só identifica; membership revalidado a cada request via Redis/banco |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-01 | Spoofing/Elevation (Brute force) | POST /auth/login | mitigate | ThrottlerGuard (rate limit) + argon2id (time cost) |
| T-1-02 | Information Disclosure (Token theft) | access token | mitigate | access token 15min; refresh 30d; web usa cookie httpOnly (P06) |
| T-1-03 | Information Disclosure (Tenant leak) | TenantGuard | mitigate | TenantGuard obrigatório; company_id revalidado via Redis 60s |
| T-1-04 | Tampering (Mass assignment) | DTOs de auth | mitigate | ZodValidationPipe com schemas strict de shared-types |
| T-1-05 | Elevation (Refresh token reuse) | POST /auth/refresh + logout | mitigate | refresh single-use (revogado após uso) + token_hash no banco + revogação no logout |
</threat_model>

<verification>
- `pnpm build` verde
- `pnpm test -- --testPathPattern=tenant.guard.spec` verde
- `pnpm test -- --testPathPattern=auth.e2e` verde (signup/login/logout)
- Segredos JWT access e refresh distintos no .env.example
</verification>

<success_criteria>
- Signup 2 etapas, login, refresh single-use, logout funcionais e testados
- JwtAuthGuard global; TenantGuard pronto para domínio; @Public() bypass
- Rate limit no login; password_hash nunca exposto; reset deferido documentado
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-02-SUMMARY.md`
</output>
