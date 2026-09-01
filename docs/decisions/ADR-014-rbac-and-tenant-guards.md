# ADR-014 — RBAC e ordem dos guards de tenant/autorização

**Status:** Accepted
**Data:** 2026-09-01
**Contexto:** Fase 03.1 — P02 (Tenant isolation e autorização). Fecha os gaps
G-1..G-4 de `03.1-P02-T01-ACCESS-MATRIX.md`.

## Contexto

A auditoria de rotas (P02-T01) encontrou:

- **G-1** — `InviteController` sem `TenantGuard`: `req.companyId` ficava
  `undefined` e `GET /invites` / `DELETE /invites/:id` vazavam entre empresas.
- **G-2** — `SubscriptionStatusGuard` (global) executava **antes** do
  `TenantGuard` (por-controller). Como guards globais rodam antes dos de
  controller, `req.companyId` era sempre `undefined` no `SubscriptionStatusGuard`
  → `if (!companyId) return true` → bloqueio de inadimplência nunca disparava.
- **G-3** — Webhook Asaas fail-open com token vazio (tratado em P06; nota aqui).
- **G-4** — Zero verificação de papel server-side. O enum `MemberRole`
  (`OWNER`/`ADMIN`/`TECNICO`) existia no schema mas nunca era checado.

## Decisão

### 1. `TenantGuard` passa a ser global e resolve papel

`TenantGuard` deixa de ser aplicado por-controller e vira `APP_GUARD`, na ordem:

```
1. JwtAuthGuard          (global) — identidade; respeita @Public()
2. TenantGuard           (global) — resolve membership ativa -> req.companyId + req.role; respeita @Public(); fail-closed
3. SubscriptionStatusGuard (global) — bloqueio de inadimplência; agora enxerga req.companyId
4. RoleGuard             (global) — enforce só quando @Roles(...) presente
```

- `TenantGuard` resolve **uma** membership `active: true` do usuário
  (`companyMember.findFirst`) e injeta `req.companyId` **e** `req.role`.
- Sem `userId` (não deveria acontecer pós-JWT) ou sem membership ativa → `403`.
  **Fail-closed.** Nunca `return true` por falta de contexto.
- Cache Redis `tenant:<userId>` (TTL 60s) passa a guardar JSON
  `{"companyId","role"}`. Invalidado ao mudar membership/role (P02-T10).
- Rotas `@Public()` (auth, `quotes/public`, `webhooks`, `health`, `invites/accept`)
  são ignoradas pelo `TenantGuard`.
- Efeito colateral desejado: qualquer controller novo já nasce tenant-scoped e
  deny-by-default; `InviteController` fica coberto sem código próprio (fecha G-1).

Os `@UseGuards(JwtAuthGuard, TenantGuard)` por-controller são removidos por
serem 100% redundantes com os guards globais — não é refactor oportunista, é o
mecanismo da correção de G-2.

### 2. `SubscriptionStatusGuard` fail-closed

`if (!companyId)` deixa de ser `return true`. Se o request chegou autenticado,
não-público, não-`@AllowPastDue`, e é mutation, mas não tem `companyId` →
`ForbiddenException`. `@Public()` e `@AllowPastDue()` continuam com short-circuit
antes dessa checagem.

### 3. RBAC — `@Roles()` + `RoleGuard`

- `@Roles(...MemberRole[])` (decorator) + `RoleGuard` (global, após `TenantGuard`).
- `RoleGuard` só nega quando há metadata `@Roles` **e** `req.role` não está no
  conjunto permitido. Rota sem `@Roles` = qualquer membro ativo (papel de
  domínio comum). Deny-by-default aplica-se apenas às rotas classificadas.
- `req.role` ausente numa rota com `@Roles` → `403` (fail-closed).

### 4. Mapa de papéis (decisão Nível B — Claude decision agent)

| Conceito                     | `MemberRole`                                 | Capacidades                                                                                                                                                                |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dono                         | `OWNER`                                      | tudo de `ADMIN` + imutável/único por empresa (criado no signup step 2)                                                                                                     |
| administrador                | `ADMIN`                                      | convites, `approval-methods`, checkout/billing, **mutations financeiras**                                                                                                  |
| membro / técnico             | `TECNICO`                                    | CRUD de customer, catalog, quote, work-order, appointment; **leitura** financeira; **não** faz ações administrativas                                                       |
| master (admin global Orcivo) | **fora do enum / fora de `company_members`** | identidade global separada; nenhum acesso concedido por role de empresa; entra por `apps/admin` (Fase 4). P02 só garante que master não é modelado como membership tenant. |

"admin-capable" = `[OWNER, ADMIN]`.

**Rotas com `@Roles(OWNER, ADMIN)`:**

- `GET /company/members`
- `PATCH /company/approval-methods`
- `POST /billing/checkout`
- `POST /invites`, `GET /invites`, `DELETE /invites/:id`
- `POST /payments`, `PATCH /payments/:id/settle`, `DELETE /payments/:id`

`GET /payments` e `GET /billing/*` permanecem abertos a qualquer membro ativo
(técnico precisa ver status de recebimento e do plano).

### 5. Ownership de IDs relacionados (P02-T06)

Guards resolvem **quem** e **qual empresa**. Não resolvem se um `customer_id`
no body pertence à empresa. Um `TenantOwnershipService`
(`common/tenant/tenant-ownership.service.ts`) valida, antes de qualquer write,
que `customer_id`, `catalog_item_id`, `quote_id`, `work_order_id` e
`assigned_to_user_id` (membro ativo) pertencem à empresa do request. Falha →
`404` (não `403` — não revelar existência, consistente com ADR-013).

## Consequências

**Positivas**

- Um único ponto de resolução de tenant/role; ordem de guards explícita e testada.
- Controllers novos nascem protegidos (deny-by-default global).
- `InviteController` deixa de vazar sem código próprio.
- Bloqueio de inadimplência volta a funcionar.

**Trade-offs**

- `req.companyId`/`req.role` agora vêm de guard global; um teste unitário de
  controller isolado precisa simular esses campos (os testes de integração
  A/B cobrem o caminho real).
- Papel é resolvido por `findFirst` de membership ativa; usuário em múltiplas
  empresas tem seleção não-determinística de tenant — **fora do escopo de P02**
  (não é vazamento: é sempre uma empresa da qual o usuário é membro). "Trocar de
  empresa" é decisão de produto futura.

## Não faz

- Não muda a estratégia multi-tenant (`company_id` continua). Não é schema-por-tenant.
- Não muda o provider de auth (JWT próprio, ADR-006).
- Não implementa o admin master (Fase 4) — apenas garante que ele não é um
  `MemberRole`.
