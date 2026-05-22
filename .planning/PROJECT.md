# Orcivo — PROJECT.md

## O que é

SaaS B2B para técnicos instaladores brasileiros (portões eletrônicos, câmeras, alarmes, cercas elétricas, energia solar, automação residencial e similares) organizarem clientes, criarem orçamentos profissionais, gerirem Ordens de Serviço e controlarem recebimentos — pelo celular em campo e pelo computador no escritório.

## Core Value

**Um técnico consegue criar um orçamento profissional com a identidade visual da própria empresa, compartilhar via WhatsApp, receber aprovação do cliente e ter a Ordem de Serviço gerada automaticamente — tudo pelo celular.**

## Contexto

- **Produto:** Dual-surface — app mobile (técnico em campo) + web app (gestão no PC)
- **ICP:** Técnico autônomo / MEI / microempresa com até 3 técnicos que hoje usa WhatsApp + Excel + Word
- **Diferencial:** mais barato que Agenda Boa, mais simples que ERP, feito para técnico em campo, mobile + web na mesma assinatura
- **Modelo de receita:** assinatura anual (oferta principal) + mensal
- **Distribuição inicial:** web pública + Android Closed Testing; iOS pós-5 tenants pagantes

## Plataformas

| Surface | Stack | Audiência |
|---|---|---|
| Mobile (apps/mobile/) | React Native + Expo + TypeScript | Técnico em campo — rápido, uma mão, às vezes offline |
| Web (apps/web/) | Next.js + Tailwind + shadcn/ui | Dono / admin — visão geral, gestão em batch |
| Backend (apps/backend/) | NestJS + Prisma + PostgreSQL | Fonte única de verdade |
| Site público (apps/site/) | Next.js estático | Landing + pricing + checkout (Fase 3) |
| Admin master (apps/admin/) | Next.js | Operação interna (Fase 4) |

## Stack (decisões travadas)

```
Backend:   NestJS + TypeScript + Prisma + PostgreSQL 16
Auth:      NestJS Passport + JWT próprio + argon2 + otplib
Cache:     Redis 7 + BullMQ
Storage:   MinIO (S3-compatible, self-hosted)
PDF:       @react-pdf/renderer
Billing:   Asaas
Fiscal:    PlugNotas (Fase 6)
Email:     Resend (free tier) + Brevo fallback
Push:      Expo Notifications (envelopa FCM/APNs)
Deploy:    Docker Compose na VPS própria, Caddy (HTTPS automático)
CI/CD:     GitHub Actions + EAS Build (mobile)
Erros:     GlitchTip (self-hosted, Sentry SDK)
Analytics: Umami (self-hosted)
```

## Decisões travadas de produto

- Cliente final NÃO tem conta — recebe PDF, link público ou WhatsApp
- Orçamento aprovado gera OS automaticamente
- Financeiro inicial: apenas registro interno (sem gateway para cliente final)
- Sem trial — Orcivo Livre com limites cumpre o papel
- Bloqueio por inadimplência: escalonado por ação, não acesso total
- Multi-tenant obrigatório desde o início (company_id em toda tabela)
- Money sempre como `Prisma.Decimal` / string decimal / `Decimal.js` — nunca `number`
- JWT só identifica — autorização revalida a cada request com cache 60s Redis
- `WebhookEvent` obrigatório para todo provedor externo
- `RequestIdempotency` obrigatório para mutations do mobile
- `shared-types` não importa `@prisma/client`

## Planos

| Código | Nome | Ciclo |
|---|---|---|
| LIVRE | Orcivo Livre | — |
| SOLO | Orcivo Solo | Anual (principal) / Mensal |
| MAIS | Orcivo Mais | Anual (principal) / Mensal |
| EQUIPE | Orcivo Equipe | Anual (principal) / Mensal |

**Nunca usar:** FREE, POP, PRO, TOP, "ilimitado", "14 dias de teste", "Assinar PRO".

## Design system (fonte oficial)

- Visual: branco / preto / roxo
- Primary: `--purple-600` `#6D28D9`
- Fonte web: Inter; mobile: system default (SF Pro / Roboto)
- Ícones: Lucide only (sem emoji)
- Tokens: `docs/design-handoff/orcivo-design-system/colors_and_type.css`
- UI Kit web: `docs/design-handoff/orcivo-design-system/ui_kits/web/`
- UI Kit mobile: `docs/design-handoff/orcivo-design-system/ui_kits/mobile/`

## Regras de autoria

- Não adicionar "Generated with Claude" em commits, comentários ou código
- Não adicionar "Co-authored-by Claude"
- Commits técnicos, objetivos e humanos
- Não commitar prompts, transcripts, logs de IA ou arquivos temporários

## Roadmap de alto nível

| Fase | Goal | Duração |
|---|---|---|
| **0** | Validação com técnicos reais + fundação técnica (infra + monorepo + hello world) | 2 semanas |
| 1 | Vertical slice multi-tenant: Auth + Company + Customer (mobile + web) | 2-3 semanas |
| 2 | MVP funcional: Catálogo, Orçamento, PDF, OS, Agenda, Financeiro básico | 12-14 semanas |
| 3 | Monetização: Asaas, checkout, limites de plano, bloqueio escalonado | 4-6 semanas |
| 4 | Orcivo Mais/Equipe: contratos, gráficos, busca avançada, admin master | 6-8 semanas |
| 5 | Estoque e código de barras (Orcivo Equipe) | 4-6 semanas |
| 6 | Fiscal: NFS-e via PlugNotas | 4-6 semanas |
| 7 | iOS, escala, IA, expansão | contínuo |

**Regra de ouro:** não pular a Fase 1. O vertical slice é o molde arquitetural de tudo.

## Requirements

### Validated

(Nenhum ainda — entregar para validar)

### Active

**Fase 0:**
- [ ] Validar dor com 3+ técnicos reais (critério: dispostos a pagar R$ 199,90/ano)
- [ ] VPS provisionada com Docker, firewall e SSH por chave
- [ ] Stack core: PostgreSQL, Redis, MinIO, Caddy rodando via Docker Compose
- [ ] Monorepo configurado (Turborepo + pnpm workspaces, CI no GitHub Actions)
- [ ] Hello world: backend responde `GET /health`, mobile abre tela, web abre página

**Fase 1+ (não planejar ainda):**
- [ ] Auth (signup, login, 2FA, refresh, reset)
- [ ] Multi-tenant (Company, CompanyMember, TenantGuard)
- [ ] CRUD Cliente mobile + web com isolamento multi-tenant verificado em CI
- [ ] Catálogo de serviços/produtos
- [ ] Criação de Orçamento com itens
- [ ] Geração de PDF com identidade visual da empresa
- [ ] Compartilhamento via WhatsApp
- [ ] Aprovação de Orçamento (link público + assinatura digital)
- [ ] Criação automática de OS ao aprovar Orçamento
- [ ] Execução de OS (fotos antes/durante/depois, materiais, assinatura do cliente)
- [ ] Agenda com lembretes
- [ ] Financeiro básico (registro de recebimentos)
- [ ] Notificações push

### Out of Scope (MVP)

- Marketplace — fora do foco
- App para cliente final — cliente recebe apenas PDF/link
- Gateway de pagamento para cliente final — apenas chave Pix manual
- Fiscal (NFS-e) — Fase 6
- Estoque avançado — Fase 5
- Contratos — Fase 4
- Gráficos financeiros — Fase 4
- iOS — após 5 tenants Android pagantes
- Offline-first completo (CRDT) — online-first com cache resiliente
- Microsserviços — monólito modular

## Key Decisions

| Decisão | Razão | Situação |
|---|---|---|
| Self-hosted na VPS própria | Custo ≈ R$0/mês até ~50 tenants | Travada |
| Auth próprio (NestJS Passport) | Zero dependência externa, controle total | Travada |
| Prisma.Decimal para money | Nunca float, evita erros financeiros | Travada |
| Multi-tenant por company_id (não schema) | Banco único, queries mais simples | Travada |
| Asaas para billing | Brasil, Pix/boleto/cartão, sem custo upfront | Travada |
| PlugNotas para fiscal | Cobertura nacional, abstrai SEFAZ | Travada (Fase 6) |
| EAS Build free tier para mobile | 30 builds/mês, sem custo | Travada |
| Planos anuais como oferta principal | LTV maior, churn reduzido | Travada |
| Roxo como cor principal (#6D28D9) | Identidade visual aprovada | Travada |

## Evolution

Este documento evolui a cada transição de fase.

**Após cada fase:**
1. Requirements validados → mover para Validated com referência da fase
2. Requirements invalidados → mover para Out of Scope com motivo
3. Novos requirements → adicionar em Active
4. Decisões novas → adicionar em Key Decisions

---
*Inicializado: 2026-05-21*
