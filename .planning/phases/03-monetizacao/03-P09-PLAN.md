# 03-P09 — Prisma migrate + smoke tests + documentação

## Goal
Gerar migration oficial da Fase 3, rodar smoke tests de integração para os fluxos críticos de billing, e documentar runbook de configuração do Asaas.

## Wave
5 (depende de todos os planos anteriores)

## Tasks

### T1 — Gerar migration Prisma

```bash
cd apps/backend
npx prisma migrate dev --name "phase_3_billing"
npx prisma generate
```

Verificar que a migration inclui:
- Tabelas `subscriptions`, `subscription_payments`, `webhook_events`, `plan_limits`
- Tabela `company_invites`
- Índices em `webhook_events.idempotency_key` (UNIQUE)

### T2 — Seed dos PlanLimits

Garantir que `prisma/seed.ts` tem os 4 planos:

```typescript
const planLimits = [
  { plan_code: 'LIVRE', customers_max: 5, quotes_per_month: 10, work_orders_per_month: 5, members_max: 1, has_logo: false, pdf_watermark: true, has_reports: false, has_contracts: false },
  { plan_code: 'SOLO', customers_max: 50, quotes_per_month: 50, work_orders_per_month: 30, members_max: 1, has_logo: true, pdf_watermark: false, has_reports: false, has_contracts: false },
  { plan_code: 'MAIS', customers_max: 200, quotes_per_month: null, work_orders_per_month: null, members_max: 3, has_logo: true, pdf_watermark: false, has_reports: true, has_contracts: false },
  { plan_code: 'EQUIPE', customers_max: null, quotes_per_month: null, work_orders_per_month: null, members_max: 10, has_logo: true, pdf_watermark: false, has_reports: true, has_contracts: true },
];

for (const limit of planLimits) {
  await prisma.planLimit.upsert({ where: { plan_code: limit.plan_code as any }, create: limit as any, update: {} });
}
```

### T3 — Smoke tests críticos

Criar `apps/backend/test/billing.e2e-spec.ts`:

```typescript
describe('Billing smoke tests', () => {
  it('GET /me/plan-limits retorna limites para empresa LIVRE', async () => {
    // 1. Criar empresa + login
    // 2. GET /me/plan-limits
    // 3. Verificar: plan_code=LIVRE, pdf_watermark=true, customers_max=5
  });

  it('POST /customers falha com 403 após atingir limite de 5 clientes', async () => {
    // 1. Criar 5 clientes
    // 2. Tentar criar 6° cliente → 403
  });

  it('POST /webhooks/asaas é idempotente — segundo envio retorna duplicate:true', async () => {
    const payload = { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_test_123', customer: 'cus_test', status: 'CONFIRMED', value: 79.90, dueDate: '2026-06-01' } };
    // 1. POST /webhooks/asaas → { received: true }
    // 2. POST /webhooks/asaas (mesmo payload) → { received: true, duplicate: true }
  });

  it('GET /me/subscription-status retorna is_blocked:false para empresa LIVRE', async () => {
    // GET /me/subscription-status → { is_blocked: false, status: null }
  });
});
```

### T4 — Runbook: configurar Asaas em produção

Criar `docs/runbooks/asaas-setup.md`:

```markdown
# Runbook — Configurar Asaas em produção

## Pré-requisitos
- Conta Asaas criada em https://asaas.com
- CNPJ da empresa registrado

## Variáveis de ambiente

Adicionar ao `.env` do servidor (nunca comitar):

```
ASAAS_API_KEY=seu_token_aqui
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=token_aleatorio_seguro
```

## Configurar webhook no painel Asaas

1. Acessar Configurações → Integrações → Webhooks
2. URL: `https://api.orcivo.com.br/webhooks/asaas`
3. Token: valor de `ASAAS_WEBHOOK_TOKEN`
4. Eventos: PAYMENT_CONFIRMED, PAYMENT_OVERDUE, SUBSCRIPTION_CANCELLED

## Testar

```bash
curl -X POST https://api.orcivo.com.br/webhooks/asaas \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_CONFIRMED","payment":{"id":"test_001","customer":"cus_test","status":"CONFIRMED","value":79.90,"dueDate":"2026-06-01"}}'
# Esperado: {"received":true}
```

## Sandbox

Para testar em sandbox, usar:
- `ASAAS_ENV=sandbox`
- `ASAAS_API_KEY=token_sandbox` (obtido na conta de sandbox)
- URL sandbox: https://api-homologacao.asaas.com/v3
```

### T5 — Atualizar ROADMAP.md e STATE.md

Marcar Fase 3 como concluída:
- ROADMAP.md: `**Status:** ✅ Completa — 2026-MM-DD`
- STATE.md: fase ativa → 4, status → "Fase 3 concluída"

### T6 — Commit e push

```bash
git add -A
git commit -m "feat(billing): Fase 3 — Asaas, limites de plano, bloqueio escalonado, site, convites"
git push
```

## Verification

```bash
# Migration existe
ls prisma/migrations/ | grep phase_3

# Seed tem os 4 planos
grep "LIVRE\|SOLO\|MAIS\|EQUIPE" prisma/seed.ts | wc -l
# Esperado: >= 4 linhas

# TypeCheck geral
cd apps/backend && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/site && npx tsc --noEmit

# Runbook existe
ls docs/runbooks/asaas-setup.md
```

## Notes
- Migration em produção requer `npx prisma migrate deploy` (não `dev`)
- `ASAAS_API_KEY` nunca deve ser commitada — usar `.env.local` ou secrets do servidor
- Smoke tests podem rodar sem Asaas real (mock da classe AsaasClient nos tests)
