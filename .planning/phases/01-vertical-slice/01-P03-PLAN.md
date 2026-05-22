---
phase: 01-vertical-slice
plan: 03
type: execute
wave: 3
depends_on: [02]
files_modified:
  - apps/backend/src/company/company.module.ts
  - apps/backend/src/company/company.controller.ts
  - apps/backend/src/company/company.service.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: [TENANT-01]
must_haves:
  truths:
    - "Usuário autenticado consegue ler os dados da própria empresa (GET /company/me)"
    - "O contexto da empresa vem do TenantGuard (company_id), nunca de input do cliente"
  artifacts:
    - path: "apps/backend/src/company/company.service.ts"
      provides: "Leitura da empresa do tenant atual"
      contains: "company_id"
    - path: "apps/backend/src/company/company.controller.ts"
      provides: "GET /company/me protegido por JwtAuthGuard + TenantGuard"
  key_links:
    - from: "apps/backend/src/company/company.controller.ts"
      to: "TenantGuard"
      via: "@UseGuards(JwtAuthGuard, TenantGuard)"
      pattern: "TenantGuard"
---

<objective>
Implementar o CompanyModule de leitura do tenant atual: GET /company/me retorna os dados da empresa do usuário autenticado, provando que o TenantGuard injeta corretamente o company_id e que nenhum endpoint de domínio confia em input do cliente para determinar o tenant.

Purpose: Valida o contrato do TenantGuard com um segundo consumidor (além de Customer) e fornece o endpoint que mobile/web usam para exibir o nome da empresa no app.
Output: CompanyController + CompanyService registrados no AppModule.
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
@.planning/phases/01-vertical-slice/01-02-SUMMARY.md

<interfaces>
<!-- Guards e infra de P02 — importar: -->
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service'; // @Global
```
<!-- TenantGuard injeta request.companyId. Acessar via @Req() req: Request & { companyId: string } -->
<!-- Padrão de controller de domínio: PATTERNS.md Grupo 2 (linhas 136-162) e Shared Patterns (linhas 736-748) -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: CompanyService + CompanyController (GET /company/me)</name>
  <read_first>
    - apps/backend/src/auth/guards/tenant.guard.ts (contrato request.companyId — de P02)
    - apps/backend/src/health/health.controller.ts (analog de controller)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 2 linhas 115-162, Shared Patterns linhas 736-771)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Anti-Patterns linhas 470-477)
  </read_first>
  <behavior>
    - GET /company/me retorna a empresa cujo id == request.companyId (do TenantGuard)
    - O company_id NUNCA vem do body/query/param — sempre do TenantGuard
    - Empresa inexistente para o tenant → NotFoundException (404), nunca 403
    - Resposta não inclui campos sensíveis (apenas dados de exibição da empresa)
  </behavior>
  <action>
    1. Criar `src/company/company.service.ts`:
       - `findCurrent(companyId: string)`: `prisma.company.findUnique({ where: { id: companyId }, select: { id, trade_name, document_type, document, phone, city, state, brand_color, logo_url, pix_key, plan_code } })`. Se null → NotFoundException.
    2. Criar `src/company/company.controller.ts` (@Controller('company'), @UseGuards(JwtAuthGuard, TenantGuard)):
       - `GET me` → `@Req() req` → `this.companyService.findCurrent(req.companyId)`. Ordem dos guards obrigatória: JwtAuthGuard, TenantGuard.
    3. Criar `src/company/company.module.ts`: providers CompanyService, controllers CompanyController, exports CompanyService (caso AuthService futuramente injete — opcional).
    4. Implementar teste unitário `src/company/company.service.spec.ts` mockando PrismaService: findCurrent retorna a empresa quando existe, lança NotFoundException quando null.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test -- --testPathPattern=company.service.spec && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm test -- --testPathPattern=company.service.spec` passa
    - `pnpm build` compila sem erro
    - grep `@UseGuards(JwtAuthGuard, TenantGuard)` em src/company/company.controller.ts
    - grep `req.companyId` em src/company/company.controller.ts
    - grep `NotFoundException` em src/company/company.service.ts
    - grep `req.body.company` ou `query.company_id` NÃO aparece (tenant nunca vem do cliente)
  </acceptance_criteria>
  <done>GET /company/me funcional via TenantGuard; teste de service verde; build verde.</done>
</task>

<task type="auto">
  <name>Task 2: Registrar CompanyModule no AppModule</name>
  <read_first>
    - apps/backend/src/app.module.ts (estado após P02)
  </read_first>
  <action>
    Adicionar `CompanyModule` aos imports de `src/app.module.ts`, mantendo todos os módulos já registrados em P01/P02 (ConfigModule, PrismaModule, RedisModule, ThrottlerModule, HealthModule, AuthModule). Edição cirúrgica — não remover imports existentes.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm build` compila sem erro
    - grep `CompanyModule` em src/app.module.ts (import e dentro de imports[])
    - grep `AuthModule` ainda presente em src/app.module.ts (não removido)
  </acceptance_criteria>
  <done>CompanyModule registrado; build verde; módulos anteriores preservados.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente → /company/me | Cliente não fornece company_id; vem do TenantGuard |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-03 | Information Disclosure (Tenant leak) | GET /company/me | mitigate | company_id vem do TenantGuard (não do cliente); 404 para empresa inexistente |
| T-1-06 | Spoofing (Tenant impersonation) | request.companyId | mitigate | TenantGuard deriva company_id de CompanyMember ativo do JWT, não de input |
</threat_model>

<verification>
- `pnpm test -- --testPathPattern=company.service.spec` verde
- `pnpm build` verde
- TenantGuard aplicado no controller
</verification>

<success_criteria>
- GET /company/me retorna a empresa do tenant atual via TenantGuard
- company_id nunca vem de input do cliente
- CompanyModule registrado sem quebrar módulos anteriores
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-03-SUMMARY.md`
</output>
