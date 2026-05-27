# Fase 3 — Monetização — CONTEXT.md

## Goal
Asaas integrado, site público com checkout, limites de plano enforced, bloqueio escalonado por inadimplência.

## Scope
- Schema: Subscription, SubscriptionPayment, WebhookEvent
- Backend: BillingModule, webhooks idempotentes, SubscriptionStatusGuard
- PlanLimitsService: GET /me/plan-limits, enforce nos endpoints de criação
- Bloqueio escalonado: PAST_DUE → BLOCKED com carência por plano
- Site público (apps/site/): landing + pricing + checkout Asaas
- Banner de inadimplência no mobile e web
- Convites de membros

## Estado atual (pré-Fase 3)
- `Company.plan_code` já existe (PlanCode enum: LIVRE/SOLO/MAIS/EQUIPE)
- `PlanLimitsService` existe como scaffold (apenas PDF_WATERMARK para LIVRE)
- Sem `Subscription`, `WebhookEvent` no schema
- `apps/site/` não existe

## Regras críticas

### Store rules (Apple/Google compliance)
- Checkout 100% no site público (apps/site/) — Next.js
- Sem botão "Assinar" ou preço no mobile
- Mensagem neutra no mobile: "Sua assinatura está inativa. Acesse orcivo.com.br para regularizar."
- Nunca mencionar "pague fora do app" ou "mais barato no site"

### Asaas
- API key via env `ASAAS_API_KEY` — configurada pelo usuário no servidor
- Ambiente: `ASAAS_ENV=sandbox|production`
- Base URL sandbox: `https://api-homologacao.asaas.com/v3`
- Base URL production: `https://api.asaas.com/v3`
- Orcivo Livre: não cria Customer/Subscription no Asaas

### Webhook idempotência
- POST /webhooks/asaas → valida HMAC → idempotency_key = sha256(provider+event_id+event_type)
- INSERT WebhookEvent ON CONFLICT DO NOTHING → se conflict: 200 sem processar
- Se inserido: enfileira job BullMQ → worker processa em transação
- Marcar PROCESSED (ou FAILED + retry backoff) após processar

### Bloqueio escalonado
- Inadimplente PODE: logar, visualizar, exportar, ver tela de regularização
- Inadimplente NÃO PODE: criar/modificar/emitir qualquer recurso
- Carência: LIVRE=0, SOLO=1-2d, MAIS=3d, EQUIPE=5-7d (configurável no banco)
- Status: ACTIVE → PAST_DUE → BLOCKED → ACTIVE (via webhook payment_confirmed)

### Limites de plano
- Limites vêm do backend, nunca hardcoded no app
- App pede via GET /me/plan-limits
- Estourou limite → bloqueia criação; NÃO bloqueia visualização

## Limites por plano (§11 do planejamento)
```
LIVRE:   5 clientes, 10 orçamentos/mês, 5 OS/mês, 1 usuário, logo Orcivo, watermark PDF
SOLO:    50 clientes, 50 orçamentos/mês, 30 OS/mês, 1 usuário, logo próprio, sem watermark
MAIS:    200 clientes, ilimitado*¹ orçamentos, ilimitado*¹ OS, 3 usuários, + relatórios
EQUIPE:  ilimitado*¹, 10 usuários, + contratos, gráficos, busca avançada
*¹ "uso justo" — nunca usar palavra "ilimitado" na UI
```

## Planos criados
- 03-P01-PLAN.md — Schema Prisma + DTOs (Wave 1)
- 03-P02-PLAN.md — BillingModule backend + Asaas client (Wave 2)
- 03-P03-PLAN.md — WebhookModule + BullMQ worker (Wave 2)
- 03-P04-PLAN.md — PlanLimitsService completo + GET /me/plan-limits + enforce (Wave 3)
- 03-P05-PLAN.md — SubscriptionStatusGuard + bloqueio escalonado (Wave 3)
- 03-P06-PLAN.md — Site público apps/site/ — landing + pricing + checkout (Wave 4)
- 03-P07-PLAN.md — Banner de inadimplência mobile + web (Wave 4)
- 03-P08-PLAN.md — Convites de membros (InviteModule) (Wave 4)
- 03-P09-PLAN.md — Prisma migrate + smoke tests + documentação (Wave 5)
