# Phase 2: MVP Funcional — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

**Goal:** Técnico consegue: cadastrar cliente, fazer orçamento com itens do catálogo, gerar PDF com identidade visual da empresa, compartilhar via WhatsApp, receber aprovação do cliente, executar OS com fotos, registrar recebimento e gerenciar agenda — tudo no mobile e na web.

**Divisão aprovada:**
- **Fase 2A** (~7 semanas): Catálogo, Orçamento, PDF, Aprovação por link, OS
- **Fase 2B** (~5-7 semanas): Agenda, Financeiro, Notificações push, Admin master mínimo, Observabilidade, Hardening

**Deliverables Fase 2A:**
- D2.1 — Catálogo (mobile + web)
- D2.2 — Orçamento estruturado (mobile + web)
- D2.3 — Geração de PDF + compartilhamento WhatsApp
- D2.4 — Aprovação por link público (3 métodos)
- D2.5 — Ordem de Serviço com fotos (mobile + web)

**Deliverables Fase 2B:**
- D2.6 — Agenda + lembretes
- D2.7 — Recebimentos manuais (Financeiro básico)
- D2.8 — Notificações push mobile (BullMQ + Expo)
- D2.9 — Admin master mínimo (/admin)
- D2.10 — Observabilidade scaffold + eventos mapeados
- D2.11 — Lock pessimista
- D2.12 — Hardening final

**Fora de escopo desta fase:**
- WhatsApp Business API (custo — Fase C)
- Gateway de pagamento para cliente final
- Fiscal / NFS-e (Fase 6)
- Contratos (Fase 4)
- iOS (após 5 tenants Android pagantes)
- GlitchTip + Umami self-hosted completos (Fase 3)
- Push web completo (Fase 3+)
- Impersonation de tenant (arquitetura preparada, não ativada)
- 2FA/TOTP (diferido)
- Estoque (Fase 5)

</domain>

<decisions>
## Implementation Decisions

### D1 — Estrutura de fase

- **D2-01:** Fase 2 dividida em **2A** (core) e **2B** (operacional). Cada sub-fase tem seu próprio conjunto de planos GSD. Feature só está pronta quando funciona em mobile E web — não mergear backend sem as duas superfícies prontas.

### D2 — Reset de senha

- **D2-02:** Implementar reset de senha na **Fase 2A**. Endpoints: `POST /auth/forgot-password { email }` + `POST /auth/reset-password { token, new_password }`. Email via Resend. Token com TTL curto (15 min) armazenado no Redis.

### D3 — Catálogo (D2.1)

- **D2-03:** Catálogo de serviços e produtos da empresa. Campos: `id`, `company_id`, `name`, `description` (opcional), `type` (SERVICE | PRODUCT), `unit_price` (Decimal — nunca number/float), `unit` (opcional: "hr", "un", "m²"), `is_active`, `created_at`, `updated_at`.
- **D2-04:** Itens do catálogo são reutilizáveis em orçamentos. Sem estoque nesta fase.

### D4 — Orçamento e máquina de estados (D2.2)

- **D2-05:** Entidade `Quote` com os seguintes estados:
  - `DRAFT` — rascunho, não enviado ao cliente
  - `SENT` — compartilhado via link/WhatsApp, aguardando resposta
  - `APPROVED` — cliente aprovou; gera OS automaticamente
  - `REJECTED` — cliente recusou; motivo opcional
  - `CANCELLED` — técnico cancelou; motivo opcional; imutável após cancelamento
  - `EXPIRED` — job BullMQ marca automaticamente quando `valid_until` passou e status ainda é DRAFT ou SENT

- **D2-06:** Campos mínimos do `Quote`: `id`, `company_id`, `customer_id`, `number` (sequencial por empresa), `status`, `title` (opcional), `notes` (opcional), `valid_until` (opcional), `discount_type` (PERCENT | FIXED), `discount_value` (Decimal), `subtotal` (Decimal), `total` (Decimal), `created_by_user_id`, `created_at`, `updated_at`.

- **D2-07:** Entidade `QuoteItem`: `id`, `quote_id`, `catalog_item_id` (opcional — pode ser item manual), `description`, `quantity` (Decimal), `unit_price` (Decimal), `total` (Decimal).

- **D2-08:** Transições válidas:
  - DRAFT → SENT (técnico compartilha)
  - SENT → APPROVED (cliente aprova via link)
  - SENT → REJECTED (cliente recusa via link)
  - DRAFT | SENT → CANCELLED (técnico cancela)
  - DRAFT | SENT → EXPIRED (job automático)
  - APPROVED → não pode voltar atrás

### D5 — PDF e compartilhamento WhatsApp (D2.3)

- **D2-09:** PDF gerado no **backend** com `@react-pdf/renderer`. Template inclui: logo da empresa, nome/telefone/cidade, número do orçamento, data, validade, itens, subtotal, desconto, total, chave Pix da empresa, observações. Arquivo armazenado no MinIO.
- **D2-10:** Compartilhamento via **wa.me deep link** — sem WhatsApp Business API. URL: `https://wa.me/55{telefone}?text={mensagem_pre_formatada_com_link}`. Link aponta para a tela pública de aprovação do orçamento.
- **D2-11:** PDF do Orcivo Livre tem marca d'água discreta. Orcivo Solo+ sem marca d'água. Verificação pelo scaffold de limites de plano (ver D2-15).

### D6 — Aprovação por link público (D2.4)

- **D2-12:** Entidade `QuoteApproval` separada do `Quote`. Campos:
  ```
  id
  quote_id
  approval_method: APPROVE_BUTTON | TYPED_NAME | DRAWN_SIGNATURE
  typed_name?: string
  signature_image_url?: string (MinIO)
  ip_address: string
  user_agent: string
  approved_at: DateTime
  ```
- **D2-13:** Métodos de aprovação suportados:
  - **APPROVE_BUTTON** — cliente clica em "Aprovar orçamento". Registra timestamp + IP + user_agent.
  - **TYPED_NAME** — cliente digita o nome + clica em "Aprovar orçamento". Padrão inicial do produto.
  - **DRAWN_SIGNATURE** — cliente desenha assinatura em canvas (React Signature Canvas). Gera PNG armazenado no MinIO. Implementar se custo técnico for razoável; caso contrário, preparar banco + DTOs + API sem UI mobile agora.
- **D2-14:** Ao aprovar:
  1. `quote.status` → APPROVED
  2. `QuoteApproval` criada com evidências
  3. `WorkOrder` criada automaticamente (OS)
  4. Evento registrado no audit/histórico
  5. Idempotência obrigatória (não aprovar duas vezes o mesmo orçamento)
- **D2-14b:** Rota pública de aprovação não requer autenticação JWT (usa `@Public()` + token único no link).

### D7 — Ordem de Serviço (D2.5)

- **D2-15b:** Entidade `WorkOrder` com campos: `id`, `company_id`, `customer_id`, `quote_id` (opcional — pode ser criada manualmente), `number` (sequencial por empresa), `title`, `status` (PENDING | IN_PROGRESS | DONE | CANCELLED), `scheduled_at` (opcional), `started_at`, `finished_at`, `notes`, `assigned_to_user_id` (opcional), `created_by_user_id`, `created_at`, `updated_at`.

- **D2-16:** **Fotos da OS** — entidade `WorkOrderPhoto`:
  ```
  id
  company_id
  work_order_id
  uploaded_by_user_id
  photo_stage: BEFORE | DURING | AFTER
  file_url (MinIO)
  caption (opcional)
  created_at
  ```
  - 3 momentos suportados desde o início: BEFORE, DURING, AFTER
  - Fotos opcionais por padrão; recomendação de ao menos antes + depois na UI
  - Campo de configuração por empresa (`require_photo_before`, `require_photo_after`) — pode ser booleano no `CompanySettings` para ativar depois; estrutura preparada mesmo que UI de configuração venha na Fase 4

- **D2-17:** Fotos uploadadas diretamente para MinIO via endpoint de upload do backend. Backend valida tipo (image/*), tamanho máximo e salva path no banco.

### D8 — Limites de plano (scaffold)

- **D2-18:** Fase 2 implementa o **scaffold de limites**, não a enforcement com billing real. Criar:
  - Decorator/guard `@CheckPlanLimit(feature: PlanFeature)` aplicável em endpoints
  - Enum `PlanFeature` com: PDF_WATERMARK, PHOTOS_IN_OS, MAX_CUSTOMERS, MAX_QUOTES_PER_MONTH, MAX_WORK_ORDERS_PER_MONTH, etc.
  - Serviço `PlanLimitsService` que lê o plano da empresa e retorna se a feature está permitida e o limite
  - Na Fase 2, todos os limites retornam "permitido" (sem enforcement real) — exceto marca d'água no PDF do Orcivo Livre
  - Fase 3 plugará os valores reais e o bloqueio escalonado junto com o billing Asaas

### D9 — Financeiro básico (D2.7)

- **D2-19:** Entidade `Payment` (ou `Receivable`) — independente, não obrigatoriamente vinculada a OS:
  ```
  id
  company_id (obrigatório)
  customer_id? (opcional)
  quote_id? (opcional)
  work_order_id? (opcional)
  source_type: MANUAL | QUOTE | WORK_ORDER
  amount: Decimal (nunca number/float)
  payment_method: PIX | CASH | CREDIT_CARD | DEBIT_CARD | BOLETO | BANK_TRANSFER | OTHER
  status: PENDING | PAID | PARTIAL | OVERDUE | CANCELLED
  due_date? (opcional)
  paid_at? (opcional)
  notes? (opcional)
  created_by_user_id
  created_at
  updated_at
  ```
- **D2-20:** MVP UI: fluxo principal é "OS finalizada → Registrar recebimento", mas UI de Financeiro também permite criar registro manual sem vínculo.
- **D2-21:** Funcionalidades mínimas: registrar, listar, filtrar (período/status/método/cliente), resumo simples (recebido / pendente / vencido no período). Sem conciliação bancária, sem contas a pagar, sem gateway.

### D10 — Notificações push (D2.8)

- **D2-22:** Implementar na **Fase 2B**. Arquitetura:
  - `DeviceToken`: `id`, `user_id`, `company_id`, `expo_push_token`, `platform` (IOS | ANDROID), `is_active`, `created_at`
  - `NotificationLog`: id, user_id, type, title, body, sent_at, status, error
  - BullMQ job para lembretes de agenda/OS: 15min, 30min, 1h, 1 dia antes (padrão: 30min antes)
  - Endpoint `POST /notifications/device-token` para registrar token do Expo
- **D2-23:** Mobile: registrar Expo Push Token na inicialização, pedir permissão, salvar no backend. Web push não implementado nesta fase — apenas dropdown/placeholder de notificações internas.
- **D2-24:** Para UAT local, implementar modo simulado (log no console) se credenciais FCM não estiverem configuradas.

### D11 — Admin master (D2.9)

- **D2-25:** Rota `/admin` protegida por role `SUPER_ADMIN` (separado de `CompanyMember`). Funcionalidades Fase 2B:
  - Listar tenants (tabela com busca por nome/documento/e-mail)
  - Detalhe do tenant: plano, status, data criação, nº usuários, clientes, orçamentos, OS, último acesso
  - Ativar/desativar tenant manualmente
  - Alterar plano manualmente (antes do billing real)
  - Toda ação admin gera `AuditLog` com `actor_type = SUPER_ADMIN`, `reason` obrigatório
- **D2-26:** Impersonation **não implementada** nesta fase. Arquitetura preparada:
  - `AuditLog` tem campo `actor_type` (SUPER_ADMIN | SYSTEM)
  - `AdminSession` futura com `expires_at` e `acting_as_company_id` — modelo criado mas endpoint não exposto

### D12 — Observabilidade scaffold (D2.10)

- **D2-27:** Fase 2B cria abstrações — Fase 3 ativa serviços reais:
  - `ErrorReporter` interface + implementação `ConsoleErrorReporter` (dev) / `GlitchTipErrorReporter` (prod)
  - `AnalyticsReporter` interface + implementação `ConsoleAnalyticsReporter` (dev) / `UmamiAnalyticsReporter` (prod)
  - Env flags: `ERROR_REPORTER=console|glitchtip`, `ANALYTICS_REPORTER=console|umami`
- **D2-28:** Arquivo `infra/docker-compose.observability.yml` com GlitchTip + Umami — opcional, não no compose principal.
- **D2-29:** Eventos mínimos mapeados (não necessariamente todos ativos na Fase 2B):
  - Backend: `auth.login_success`, `auth.login_failed`, `quote.created`, `quote.sent`, `quote.approved`, `work_order.created`, `work_order.finished`, `payment.registered`, `notification.failed`
  - Web/Mobile: `screen_view`, `signup_completed`, `customer_created`, `quote_created`, `quote_shared_whatsapp`, `work_order_started`, `work_order_finished`

### D13 — Princípios de implementação

- **D2-30:** Toda feature segue o molde da Fase 1 (CustomerModule como referência — ver `docs/ARCHITECTURE-MOLD.md`).
- **D2-31:** Money sempre `Prisma.Decimal` no backend, string decimal no JSON, `Decimal.js` no mobile/web.
- **D2-32:** Toda tabela de negócio tem `company_id`. Sem exceção.
- **D2-33:** `RequestIdempotency` obrigatório para mutations do mobile (`X-Client-Request-Id`).
- **D2-34:** Toda feature tem teste de tenant isolation em CI.
- **D2-35:** i18n pt-BR em toda UI (via `t()` mesmo que simples no início).
- **D2-36:** Loading/error/empty states em toda tela.
- **D2-37:** `WebhookEvent` obrigatório para todo provedor externo (relevante quando integrações chegarem na Fase 3).

### Claude's Discretion

- Estrutura interna dos módulos NestJS para cada domínio (Catalog, Quote, WorkOrder, Appointment, Payment, Notification, Admin)
- Schema Prisma exato (campos adicionais, índices, constraints)
- Estratégia de upload de fotos (presigned URL do MinIO vs proxy do backend)
- Estratégia de cache local no mobile (React Query / TanStack Query)
- Implementação exata do canvas de assinatura (react-native-signature-canvas vs outra lib compatível com Expo)
- Formato do link público de aprovação (token JWT curto ou UUID opaco)
- Ordem de execução dos planos dentro de cada sub-fase
- Geração do número sequencial de Orçamento e OS por empresa (Redis counter vs DB sequence)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system
- `docs/design-handoff/orcivo-design-system/README.md`
- `docs/design-handoff/orcivo-design-system/colors_and_type.css`
- `docs/design-handoff/orcivo-design-system/ui_kits/web/README.md`
- `docs/design-handoff/orcivo-design-system/ui_kits/mobile/README.md`
- `docs/FRONTEND_DESIGN_MASTER.md` — Screen specs
- `docs/OPERATIONS_UI_MISSING_SPECS.md` — Telas operacionais

### Arquitetura
- `docs/ARCHITECTURE-MOLD.md` — Molde arquitetural da Fase 1; TODOS os módulos da Fase 2 seguem este padrão
- `docs/decisions/ADR-011-multi-tenant-company-id.md` — Multi-tenancy
- `docs/decisions/ADR-010-money-decimal.md` — Money handling
- `docs/decisions/ADR-013-tenant-isolation-testing.md` — Isolation testing em CI

### Planejamento
- `.planning/PROJECT.md` — Stack travada, decisões de produto
- `CLAUDE.md` — Regras absolutas
- `docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §33 — GSD breakdown Fase 2

### Código existente (molde)
- `apps/backend/src/customer/` — CustomerModule como referência canônica
- `apps/backend/src/auth/` — Auth module com guards, decorators, TenantGuard
- `packages/shared-types/src/` — DTOs e enums; todos os novos módulos adicionam seus DTOs aqui
- `prisma/schema.prisma` — Schema Prisma existente; estender com novos modelos

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Patterns (da Fase 1)
- `TenantGuard` + `@Public()` — padrão para todas as rotas; rotas públicas de aprovação usam `@Public()`
- `CustomerModule` — template de módulo com repository, service, controller, DTOs, isolation spec
- `RequestIdempotency` — já existe na stack; aplicar em todas as mutations mobile
- `shared-types` build → `dist/` — lembrar de compilar antes de usar em backend/web/mobile

### Mobile shell existente
- 5 bottom tabs: Início | Clientes | Orçamentos | Agenda | Mais
- "Mais" inclui: Ordens de Serviço, Catálogo, Financeiro (placeholders) — Fase 2A/2B preenche estas telas

### Web shell existente
- Sidebar com 9 itens: Dashboard | Clientes | Catálogo | Orçamentos | Ordens de Serviço | Agenda | Financeiro | Documentos | Configurações (placeholders) — Fase 2A/2B preenche

### Backend
- Prisma schema tem: User, Company, CompanyMember, Customer, RefreshToken
- `AppModule` já registra: PrismaModule, RedisModule, AuthModule, CompanyModule, CustomerModule
- Fase 2 adiciona: CatalogModule, QuoteModule, WorkOrderModule, AppointmentModule, PaymentModule, NotificationModule, AdminModule

</code_context>

<deferred>
## Deferred to Later Phases

- **2FA/TOTP** — fase de segurança dedicada
- **WhatsApp Business API** — custo; requer aprovação do usuário (Nível C)
- **GlitchTip + Umami self-hosted ativos** — Fase 3 (quando houver usuários reais)
- **Push web** — Fase 3+
- **Impersonation de tenant** — arquitetura preparada, não ativada
- **Relatórios financeiros avançados** — Fase 4
- **Contas a pagar** — Fase 4
- **Conciliação bancária** — Fase 4
- **Contratos** — Fase 4
- **Estoque** — Fase 5
- **NFS-e / PlugNotas** — Fase 6
- **iOS publicação** — após 5 tenants Android pagantes
- **Onboarding wizard** — Fase 3 com billing
- **Admin impersonation UI** — Fase 4
- **Template customizável de PDF** — Fase 4
- **Integração Google Calendar** — Fase 7
- **IA no orçamento** — Fase 7

</deferred>

---

*Phase: 02-mvp-funcional*
*Context gathered: 2026-05-22*
*Discussão conduzida com: Dyogo*
