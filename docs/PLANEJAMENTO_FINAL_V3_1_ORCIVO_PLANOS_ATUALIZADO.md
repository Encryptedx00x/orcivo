# PLANEJAMENTO_FINAL_V3.1 — SaaS B2B para Técnicos Instaladores

> Documento consolidado de execução. **Mobile + Web em paralelo.** Stack auto-hospedada na VPS própria. Custos recorrentes ≈ R$0. Posicionamento: alternativa mais barata e mais focada em técnicos instaladores que sistemas genéricos como Agenda Boa.
>
> **Status:** versão final para iniciar desenvolvimento — revisada com nomenclatura Orcivo Livre/Solo/Mais/Equipe
> **Stack mobile:** React Native + Expo + TypeScript
> **Stack web:** Next.js + TypeScript
> **Stack backend:** NestJS + Prisma + PostgreSQL (self-hosted)
> **Estratégia:** mobile-first para técnico em campo, web para gestão no PC, multiempresa desde o início, monetização anual + add-ons, fiscal via hub
> **Data:** Maio/2026

---

## Sumário

0. [Como usar este documento com GSD + Claude Code](#0-como-usar-este-documento-com-gsd--claude-code)
1. [Resumo executivo e posicionamento](#1-resumo-executivo-e-posicionamento)
2. [Decisões finais travadas](#2-decisões-finais-travadas)
3. [Stack final (self-hosted)](#3-stack-final-self-hosted)
4. [Arquitetura lógica (mobile + web + backend)](#4-arquitetura-lógica-mobile--web--backend)
5. [Modelo de domínio completo](#5-modelo-de-domínio-completo)
6. [Status e enums](#6-status-e-enums)
7. [Multi-tenancy e isolamento de dados](#7-multi-tenancy-e-isolamento-de-dados)
8. [Auth próprio com NestJS Passport](#8-auth-próprio-com-nestjs-passport)
9. [Papéis e permissões](#9-papéis-e-permissões)
10. [Admin master e suporte interno](#10-admin-master-e-suporte-interno)
11. [Planos Orcivo Livre / Solo / Mais / Equipe](#11-planos-grátis--pop--pro--top)
12. [Add-ons e regras de billing](#12-add-ons-e-regras-de-billing)
13. [Assinatura SaaS e bloqueio escalonado](#13-assinatura-saas-e-bloqueio-escalonado)
14. [Billing com Asaas e webhooks idempotentes](#14-billing-com-asaas-e-webhooks-idempotentes)
15. [Idempotência de requests do mobile](#15-idempotência-de-requests-do-mobile)
16. [Nota fiscal](#16-nota-fiscal)
17. [Money handling](#17-money-handling)
18. [Documentos: PDFs, contratos e templates](#18-documentos-pdfs-contratos-e-templates)
19. [Catálogo, estoque e código de barras](#19-catálogo-estoque-e-código-de-barras)
20. [Agenda e lembretes](#20-agenda-e-lembretes)
21. [Arquivos e storage (MinIO)](#21-arquivos-e-storage-minio)
22. [Sincronização e operação em campo](#22-sincronização-e-operação-em-campo)
23. [Auditoria](#23-auditoria)
24. [Segurança](#24-segurança)
25. [LGPD e retenção](#25-lgpd-e-retenção)
26. [Observabilidade self-hosted](#26-observabilidade-self-hosted)
27. [Infraestrutura na VPS](#27-infraestrutura-na-vps)
28. [Backup e disaster recovery](#28-backup-e-disaster-recovery)
29. [Custos reais](#29-custos-reais)
30. [Roadmap em fases (mobile + web)](#30-roadmap-em-fases-mobile--web)
31. [GSD breakdown — Fase 0](#31-gsd-breakdown--fase-0)
32. [GSD breakdown — Fase 1](#32-gsd-breakdown--fase-1)
33. [GSD breakdown — Fase 2](#33-gsd-breakdown--fase-2)
34. [O que NÃO fazer no MVP](#34-o-que-não-fazer-no-mvp)
35. [Estrutura de repositório](#35-estrutura-de-repositório)
36. [Validação Zod vs class-validator](#36-validação-zod-vs-class-validator)
37. [Documentação em `/docs`](#37-documentação-em-docs)
38. [Workflow com IA](#38-workflow-com-ia)
39. [Definition of Done](#39-definition-of-done)
40. [Testes obrigatórios](#40-testes-obrigatórios)
41. [Riscos críticos e mitigação](#41-riscos-críticos-e-mitigação)
42. [Glossário](#42-glossário)

---

## 0. Como usar este documento com GSD + Claude Code

Este documento é a referência central do projeto. Não comece criando telas ou pedindo features ao Claude Code. Use **GSD** (Goal → Deliverable → Task) para quebrar o projeto em pedaços executáveis.

### Estrutura GSD

```text
Goal:        objetivo da fase (1 frase)
Deliverable: entrega concreta verificável (3-5 dias)
Task:        ação específica (1-4 horas)
```

### Prompt inicial para Claude Code

```text
Você está trabalhando no projeto SaaS B2B para técnicos instaladores.

Use /docs/PLANEJAMENTO_FINAL_V3.md como documento mestre.
Use /docs/DESIGN_SYSTEM.md para qualquer decisão visual.
Não implemente código ainda.

Primeiro, inicialize a estrutura GSD do projeto criando:
- /docs/PROJECT.md
- /docs/REQUIREMENTS.md
- /docs/ROADMAP.md
- /docs/STATE.md
- /docs/decisions/ADR-001-stack.md a ADR-011 (decisões já tomadas)

Depois, quebre apenas a Fase 0 em deliverables e tasks.
Não planeje o MVP inteiro em detalhes agora.
Não avance para implementação sem eu aprovar o plano.

Respeite estas decisões já travadas:
- React Native + Expo + TypeScript no mobile
- Next.js + TypeScript no web (em paralelo desde a Fase 1)
- NestJS + TypeScript no backend
- Prisma + PostgreSQL self-hosted
- Docker Compose na VPS
- Auth próprio com NestJS Passport + JWT
- Redis + BullMQ
- MinIO (S3-compatible)
- Multi-tenant obrigatório por company_id
- Quote → WorkOrder automático na aprovação
- Money sempre como Prisma.Decimal/string decimal/Decimal.js
- WebhookEvent + RequestIdempotency obrigatórios
- Bloqueio escalonado por ação (não bloqueio total)
- Planos: Orcivo Livre, Orcivo Solo, Orcivo Mais, Orcivo Equipe (anuais como oferta principal)
```

### Ordem de execução

```text
Fase 0:  validação com técnicos + fundação técnica + hello world (mobile + web)
Fase 1:  vertical slice multi-tenant (mobile + web compartilhando backend)
Fase 2:  MVP funcional (clientes, catálogo, orçamento, PDF, OS, agenda, financeiro básico)
Fase 3:  monetização (Asaas + checkout + bloqueio escalonado)
Fase 4:  recursos Orcivo Mais/Equipe (contratos, gráficos, busca avançada, beta access)
Fase 5:  estoque e catálogo avançado (fotos de produtos, código de barras)
Fase 6:  fiscal (NFS-e via PlugNotas)
Fase 7:  iOS, escala, IA, expansão nacional
```

### Regra de ouro

**Não pule a Fase 1.** A Fase 1 é o molde arquitetural. Se o vertical slice ficar limpo, todo o resto segue o mesmo padrão.

---

## 1. Resumo executivo e posicionamento

### Produto

SaaS B2B para técnicos instaladores e pequenas empresas de serviços técnicos:

```text
portões eletrônicos
câmeras de segurança
alarmes
cercas elétricas
fechaduras eletrônicas
circuitos elétricos
interfones
energia solar
automação residencial
redes e internet
serviços técnicos similares
```

### Fluxo central

```text
Cliente
→ Orçamento profissional (mobile ou web)
→ PDF compartilhado via WhatsApp/link
→ Aprovação por link público + assinatura
→ Ordem de Serviço gerada automaticamente
→ Execução em campo (fotos, materiais, assinatura)
→ Finalização
→ Controle de recebimento
→ Nota fiscal quando aplicável
```

### Plataformas

```text
Mobile (React Native + Expo):
  uso principal do técnico em campo;
  captura de foto, assinatura, criação rápida de orçamento.

Web (Next.js):
  uso no PC para gestão, configuração e operação administrativa;
  compartilha o mesmo backend e a mesma identidade visual.

Backend (NestJS):
  fonte única de verdade;
  serve mobile, web e admin master.
```

### Proposta de valor

> *App e site para técnicos criarem orçamentos profissionais, organizarem serviços e atenderem melhor seus clientes — pelo celular e pelo computador, com a identidade visual da própria empresa, por preço menor que sistemas genéricos do mercado.*

### ICP inicial

```text
Técnico autônomo
MEI
Microempresa com até 3 técnicos
Prestador que hoje usa WhatsApp, Excel, Word, bloco de notas ou PDF manual
```

### Posicionamento competitivo

```text
Mais barato que sistemas genéricos como Agenda Boa.
Mais simples que ERP completo.
Mais profissional que orçamento no WhatsApp.
Feito para técnico que trabalha em campo.
Mobile + Web na mesma assinatura.
```

### Estratégia de execução

```text
1. Validar com técnicos reais
2. Vertical slice arquitetural multi-tenant
3. MVP funcional mobile + web
4. Monetização (Asaas)
5. Recursos competitivos Orcivo Mais/Equipe (contratos, relatórios, gráficos)
6. Estoque e código de barras (EQUIPE)
7. Fiscal (NFS-e)
8. Publicação iOS, escala
```

---

## 2. Decisões finais travadas

### Produto

```text
Cliente final NÃO tem conta no sistema.
Cliente recebe PDF, link público ou mensagem via WhatsApp.
Orçamento aprovado gera OS automaticamente.
OS também pode ser criada manualmente.
Financeiro inicial é apenas registro interno.
Sistema NÃO processa pagamento do cliente final.
Pix inicial é chave Pix manual da empresa.
Nota fiscal via hub fiscal terceirizado (Fase 6).
Assinatura cobrada via site externo (Asaas).
Sem trial no MVP. Orcivo Livre com limites de teste cumpre o papel de teste.
Bloqueio por inadimplência é escalonado por ação, não por acesso.
Planos anuais como oferta principal (oferta secundária mensal).
```

### Multiempresa

```text
Tenant = empresa.
Empresa pode representar CNPJ ou CPF de autônomo.
1 CNPJ = 1 assinatura.
Outro CNPJ = outra assinatura.
CPF pode ser vinculado quando aplicável.
Todas as tabelas de negócio têm company_id.
Usuário pode pertencer a mais de uma empresa (futuro).
Cada empresa é silo isolado.
```

### Plataformas

```text
Mobile cross-platform desde o código (React Native + Expo).
Web cross-browser desde o código (Next.js).
Distribuição inicial: web pública + Android Closed Testing.
iOS depois de 5+ tenants Android pagantes.
Mobile e web consomem a MESMA API REST.
Mobile e web compartilham shared-types (DTOs, schemas Zod, enums).
Identidade visual idêntica nas duas plataformas.
```

### Técnicas

```text
Backend: NestJS + TypeScript.
ORM: Prisma com Prisma.Decimal.
Banco: PostgreSQL self-hosted.
Auth: NestJS Passport + JWT próprio (sem dependência externa).
Storage: MinIO self-hosted (S3-compatible).
Cache/fila: Redis self-hosted + BullMQ.
PDF: @react-pdf/renderer (Puppeteer só se design exigir).
Fiscal: PlugNotas (primário) ou Focus NFe.
Billing: Asaas.
Monólito modular. Sem microsserviços no MVP.
Money sempre como Prisma.Decimal/string decimal/Decimal.js.
WebhookEvent obrigatório para todo provedor externo.
RequestIdempotency obrigatório para mutations do mobile.
JWT só identifica — autorização revalida a cada request com cache 60s.
```

### Operacionais

```text
Tudo self-hosted na VPS própria.
Docker Compose orquestra serviços.
Caddy faz reverse proxy + HTTPS automático.
Backup automatizado em volume externo.
Admin master mínimo desde a Fase 2.
Painel admin profissional (admin-web) na Fase 4.
Online-first com cache resiliente (não offline-first completo).
Testes de isolamento multi-tenant obrigatórios em CI.
```

---

## 3. Stack final (self-hosted)

```text
Mobile (apps/mobile/):
  React Native + Expo + TypeScript
  Build: EAS Build free tier (30/mês) + fallback GitHub Actions
  Push: Expo Notifications

Web (apps/web/):
  Next.js 14+ App Router + TypeScript
  React Server Components onde fizer sentido
  Tailwind CSS para styling
  shadcn/ui como base de componentes
  Imagem: Next/Image

Admin web (apps/admin/):
  Next.js (mesma base de apps/web/)
  Acesso restrito por role + IP allowlist
  Inicia simples (Fase 2), profissional (Fase 4)

Backend (apps/backend/):
  NestJS + TypeScript
  Node 20 LTS em container Docker

Site público (apps/site/):
  Next.js (landing + pricing + checkout)
  Estático sempre que possível

ORM:
  Prisma (Prisma.Decimal para dinheiro)

Banco:
  PostgreSQL 16 em Docker
  Volume persistente na VPS

Auth:
  NestJS Passport + JWT
  argon2 para hash de senha
  otplib para 2FA TOTP
  Email transacional via Resend free tier (3k/mês)

Cache/fila:
  Redis 7 em Docker
  BullMQ para jobs (NF, PDF, webhook retry, lembretes)

Storage:
  MinIO em Docker (S3-compatible)
  Buckets privados, signed URLs

PDF:
  @react-pdf/renderer no início
  Puppeteer (pool de Chromium) só se necessário

Reverse proxy + HTTPS:
  Caddy (HTTPS automático via Let's Encrypt)

Billing:
  Asaas (taxa por transação, sem custo upfront)

Fiscal:
  PlugNotas (primário) — começa na Fase 6
  Pagamento por nota emitida

Email:
  Resend free tier (3000/mês, 100/dia)
  Fallback: Brevo free (300/dia = 9k/mês)

Observabilidade:
  GlitchTip em Docker (compatível com Sentry SDK)
  Uptime Kuma em Docker (monitoring)
  Umami em Docker (analytics de produto)

CI/CD:
  GitHub Actions (free 2000 min/mês)
  Build mobile: EAS free tier
  Deploy backend e web: SSH para VPS + Docker pull

Hosting:
  VPS própria (mínimo 4GB RAM / 2 vCPU / 80GB SSD; recomendado 8GB)
  Docker + Docker Compose
```

### Justificativas

| Camada | Escolha | Motivo |
|---|---|---|
| Mobile | React Native + Expo | TS full-stack, EAS, ecossistema maduro, cross-platform |
| Web | Next.js + Tailwind + shadcn/ui | Mesmo TS, SSR/SSG, fácil manutenção solo, design system maduro |
| Backend | NestJS | Modularidade, DI, guards, decorators, testável |
| ORM | Prisma | Schema declarativo, migrations, `Prisma.Decimal`, IA-friendly |
| Banco | PostgreSQL self-hosted | Sem custo recorrente, total controle, ideal multi-tenant |
| Auth | NestJS próprio | Zero dependência externa, controle total, sem custo |
| Storage | MinIO | S3-compatible, na VPS, sem egress fee |
| PDF | @react-pdf/renderer | Leve, sem Chromium, suficiente para MVP |
| Push | Expo Notifications | Free, envelopa FCM/APNs |
| Billing | Asaas | Brasil, Pix/boleto/cartão, recorrência, sem custo upfront |
| Fiscal | PlugNotas | Cobertura nacional, abstrai SEFAZ/prefeituras |

---

## 4. Arquitetura lógica (mobile + web + backend)

### Visão geral

```text
[Mobile RN/Expo]   [Web Next.js]   [Admin Web Next.js]   [Site público]
       ↓                ↓                 ↓                      ↓
       └────────────────┴─────────┬───────┴──────────────────────┘
                                  ↓
                    [Caddy reverse proxy + HTTPS]
                                  ↓
                       [NestJS API em Docker]
                                  ↓
                    [Módulos de domínio (compartilhados)]
                                  ↓
                       [PostgreSQL + Prisma]
                                  ↓
       [Redis/BullMQ] [MinIO] [Asaas] [PlugNotas] [Resend] [Expo Push]
```

Tudo dentro da mesma VPS, exceto integrações externas.

### Subdomínios

```text
api.dominio.com.br        → backend NestJS
app.dominio.com.br        → web (Next.js)
admin.dominio.com.br      → admin web (Next.js, IP allowlist)
www.dominio.com.br        → site público (Next.js)
status.dominio.com.br     → Uptime Kuma
errors.dominio.com.br     → GlitchTip
analytics.dominio.com.br  → Umami
storage.dominio.com.br    → MinIO (signed URLs apenas)
```

### Estrutura modular do backend

```text
apps/backend/src/modules/
  auth/                   # signup, login, refresh, 2FA, password reset
  users/                  # perfil, devices, sessões
  companies/              # tenant, brand, settings, profile público
  members/                # company_members, permissions, invites
  customers/              # clientes finais + contatos + endereços
  catalog/                # itens reutilizáveis (produto/serviço/mão-de-obra)
  stock/                  # estoque, movimentações, fotos de produto, barcode (Fase 5)
  quotes/                 # orçamentos, versões, aprovações
  work-orders/            # OS, execução, fotos, assinaturas, checklist
  appointments/           # agenda + lembretes
  finance/                # recebimentos manuais, recibos, resumo financeiro
  invoices/               # NFS-e/NF-e via hub (Fase 6)
  documents/              # templates, textos padronizados, contratos, geração
  subscriptions/          # planos, limites, billing
  files/                  # upload, signed URLs, MinIO
  notifications/          # push, in-app, email
  audit/                  # audit log centralizado
  admin-master/           # ações internas
  webhooks/               # WebhookEvent, idempotência
  usage/                  # métricas de uso por tenant
  locks/                  # edit locks pessimistas
  idempotency/            # client_request_id para mobile
  feature-flags/          # FeatureFlag + BetaAccess
  search/                 # busca interna (Fase 4)
shared/
  tenant-context/
  repository-base/
  audit-decorator/
  permission-guards/
  subscription-guards/
  decimal-utils/
  errors/
  logger/
```

### Princípio de camadas

```text
Controller (rota, validação, guards)
  ↓
Service (regra de negócio, transações, audit)
  ↓
Repository (Prisma, filtro tenant automático)
  ↓
Prisma → PostgreSQL
```

**Regras não-negociáveis:**

```text
Controller não contém regra de negócio.
Toda query tenant-scoped filtra company_id automaticamente.
Toda mutation sensível gera audit_log.
Toda rota protegida usa AuthGuard.
Toda rota tenant-scoped usa TenantGuard.
Toda ação crítica usa PermissionGuard.
Toda ação de escrita usa SubscriptionGuard.
Nenhuma regra de plano hardcoded no app — vem do backend.
Mobile e web consomem os mesmos endpoints (alguns endpoints podem ser web-only ou mobile-only).
```

---

## 5. Modelo de domínio completo

Convenções:

```text
id: UUID v7 ou CUID2
created_at, updated_at em todas tabelas
deleted_at em tabelas com soft delete
company_id em toda tabela de negócio (FK indexada)
valores monetários: numeric(12,2) banco, Decimal backend, string API
```

### IDENTIDADE E TENANT

#### User

Fonte de verdade do auth: **backend próprio**.

```text
id
name
email                      # único global, indexado
email_verified_at
phone
password_hash              # argon2
totp_secret                # nullable, criptografado
totp_enabled
last_login_at
last_login_ip
status                     # ACTIVE, DISABLED, PENDING_EMAIL_VERIFICATION
failed_login_attempts
locked_until
created_at
updated_at
```

#### RefreshToken

```text
id
user_id
token_hash
device_fingerprint
expires_at
revoked_at
created_from_ip
created_at
```

#### PasswordResetToken

```text
id
user_id
token_hash
expires_at
used_at
created_at
```

#### Company

```text
id
legal_name
trade_name
document_type              # CPF, CNPJ
document_number            # criptografado pgcrypto
email
phone
address_json
pix_key_type               # CPF, CNPJ, EMAIL, PHONE, RANDOM
pix_key
pix_recipient_name
logo_file_id
brand_color
tax_profile_json
status                     # ACTIVE, BLOCKED, CANCELLED
created_at
updated_at
deleted_at
```

#### CompanyProfile

Perfil enriquecido (público se quiser).

```text
id
company_id
description
service_areas_json
categories_json
website
instagram
whatsapp
public_profile_enabled
created_at
updated_at
```

#### CompanyMember

```text
id
company_id
user_id
role                       # OWNER, MEMBER
permissions_json
active
joined_at
deactivated_at
deactivated_by_user_id
created_at
updated_at
```

#### Invite

```text
id
company_id
email
role
permissions_json
token
expires_at
accepted_at
created_by_user_id
created_at
```

### CLIENTES

#### Customer

```text
id
company_id
type                       # PF, PJ
name
document_type
document_number            # criptografado pgcrypto
email
phone
notes
created_by_user_id
assigned_to_user_id
created_at
updated_at
deleted_at
```

#### CustomerContact

```text
id
company_id
customer_id
name
phone
email
role
created_at
updated_at
```

#### CustomerAddress

```text
id
company_id
customer_id
label                      # residência, empresa, loja, obra
street
number
complement
district
city
state
zipcode
geo_json
created_at
updated_at
```

### CATÁLOGO E ESTOQUE

#### CatalogItem

```text
id
company_id
type                       # PRODUCT, SERVICE, LABOR, TRAVEL, OTHER
name
description
unit
unit_price
tax_code
active
created_at
updated_at
deleted_at
```

#### ProductPhoto (Orcivo Equipe)

```text
id
company_id
catalog_item_id
file_id
sort_order
created_at
```

#### Barcode (Orcivo Equipe)

```text
id
company_id
catalog_item_id
code
type                       # EAN13, CODE128, QR, OTHER
created_at
```

#### StockItem (Orcivo Equipe)

```text
id
company_id
catalog_item_id
quantity
min_quantity
location
created_at
updated_at
```

#### StockMovement (Orcivo Equipe)

```text
id
company_id
stock_item_id
type                       # IN, OUT, ADJUSTMENT
quantity
reason
work_order_id nullable
created_by_user_id
created_at
```

#### BarcodeScanLog (Orcivo Equipe)

```text
id
company_id
catalog_item_id
scanned_by_user_id
context                    # QUOTE, WORK_ORDER, STOCK
created_at
```

### ORÇAMENTOS

#### Quote

**Regra:** não usar `CONVERTED_TO_WORK_ORDER` como status. Conversão deduzida por `work_order_id IS NOT NULL`.

```text
id
company_id
customer_id
work_order_id nullable
number
status                     # DRAFT, PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED
valid_until
subtotal
discount_amount
discount_percent
tax_amount
total
terms
notes
public_approval_token
public_approval_expires_at
pdf_file_id
current_version_id
approved_at
rejected_at
created_by_user_id
created_at
updated_at
deleted_at
```

#### QuoteItem

```text
id
company_id
quote_id
catalog_item_id nullable
type                       # PRODUCT, SERVICE, LABOR, TRAVEL, OTHER
description
quantity
unit_price
discount_amount
total
sort_order
created_at
updated_at
```

#### QuoteVersion

Histórico imutável.

```text
id
company_id
quote_id
version_number
snapshot_json
created_by_user_id
created_at
```

#### QuoteApproval

```text
id
company_id
quote_id
approval_type              # PUBLIC_LINK, PHYSICAL_SIGNATURE, INTERNAL
approved_by_name
approved_by_document
signature_file_id
approval_ip
approval_user_agent
approval_geo_json
approved_at
created_at
```

### ORDENS DE SERVIÇO

#### WorkOrder

```text
id
company_id
customer_id
quote_id nullable
number
status                     # OPEN, SCHEDULED, IN_PROGRESS, WAITING_CUSTOMER, WAITING_PARTS, FINISHED, CANCELLED
scheduled_at
started_at
finished_at
description
materials_used
service_report
assigned_to_user_id
created_by_user_id
final_pdf_file_id
created_at
updated_at
deleted_at
```

#### WorkOrderItem

```text
id
company_id
work_order_id
description
quantity
unit_price
total
created_at
updated_at
```

#### WorkOrderChecklistItem

```text
id
company_id
work_order_id
description
required
checked
checked_at
checked_by_user_id
created_at
updated_at
```

#### WorkOrderPhoto

```text
id
company_id
work_order_id
file_id
type                       # BEFORE, DURING, AFTER, OTHER
caption
sort_order
created_at
```

#### WorkOrderSignature

```text
id
company_id
work_order_id
signature_file_id
signer_name
signer_document
signed_at
created_at
```

### AGENDA

#### Appointment

```text
id
company_id
customer_id nullable
quote_id nullable
work_order_id nullable
assigned_to_user_id nullable
title
description
starts_at
ends_at
status                     # SCHEDULED, DONE, CANCELLED, NO_SHOW
reminder_minutes_before
location_text
location_geo_json
created_by_user_id
created_at
updated_at
deleted_at
```

#### AppointmentReminder

```text
id
company_id
appointment_id
type                       # PUSH, EMAIL
scheduled_for
sent_at
status                     # PENDING, SENT, FAILED, CANCELLED
created_at
```

### DOCUMENTOS

#### StandardText

Textos padronizados reutilizáveis.

```text
id
company_id
type                       # QUOTE_TERMS, SERVICE_DESCRIPTION, CONTRACT_CLAUSE, MESSAGE
title
content
active
created_by_user_id
created_at
updated_at
```

#### DocumentTemplate

Templates customizáveis para PDF.

```text
id
company_id
type                       # QUOTE, WORK_ORDER, RECEIPT, CONTRACT, REPORT
name
content_json               # estrutura do documento
style_json                 # variações visuais
active
created_at
updated_at
```

#### GeneratedDocument

Histórico de PDFs gerados.

```text
id
company_id
template_id
owner_type                 # QUOTE, WORK_ORDER, CUSTOMER, PAYMENT
owner_id
pdf_file_id
status                     # GENERATED, FAILED
created_by_user_id
created_at
```

#### ContractTemplate (Orcivo Equipe)

```text
id
company_id
name
content
variables_json
active
created_at
updated_at
```

#### ContractDocument (Orcivo Equipe)

```text
id
company_id
customer_id
quote_id nullable
work_order_id nullable
contract_template_id
status                     # DRAFT, SIGNED, CANCELLED
pdf_file_id
signature_file_id nullable
signed_at nullable
created_at
updated_at
```

### FINANCEIRO

#### PaymentRecord

Financeiro apenas gerencial.

```text
id
company_id
customer_id
quote_id nullable
work_order_id nullable
amount
method                     # PIX_MANUAL, CASH, CARD_EXTERNAL, BOLETO_EXTERNAL, BANK_TRANSFER, OTHER
status                     # PENDING, PAID, PARTIAL, OVERDUE, CANCELLED
due_date
paid_at
notes
financial_category_id nullable
created_by_user_id
created_at
updated_at
```

#### FinancialCategory (Orcivo Mais/Equipe)

Categoria de receitas/despesas para resumo financeiro.

```text
id
company_id
name
type                       # INCOME, EXPENSE
color
active
created_at
updated_at
```

### NOTA FISCAL

#### Invoice

```text
id
company_id
customer_id
quote_id nullable
work_order_id nullable
payment_record_id nullable
type                       # NFSE, NFE, NFCE, RECEIPT
provider                   # PLUGNOTAS, FOCUS_NFE, MANUAL
provider_reference
status                     # DRAFT, PROCESSING, ISSUED, FAILED, CANCELLED
number
series
xml_file_id
pdf_file_id
view_url
error_message
retry_count
issued_at
cancelled_at
created_at
updated_at
```

### PLANO E ASSINATURA

#### Plan

```text
id
code                       # LIVRE, SOLO, MAIS, EQUIPE
name
monthly_price
yearly_price
limits_json
features_json
nf_included_per_month
nf_extra_price
addons_available_json
active
created_at
updated_at
```

#### Subscription

```text
id
company_id
plan_id
status                     # ACTIVE, PAST_DUE, BLOCKED, CANCELLED, PENDING_PAYMENT
billing_provider           # ASAAS
provider_subscription_id
billing_cycle              # MONTHLY, YEARLY
current_period_start
current_period_end
next_billing_at
grace_period_ends_at
cancelled_at
blocked_at
created_at
updated_at
```

#### SubscriptionPayment

```text
id
company_id
subscription_id
provider_payment_id
amount
status                     # PENDING, PAID, FAILED, REFUNDED
due_date
paid_at
failed_at
failure_reason
raw_payload_json
created_at
updated_at
```

#### SubscriptionAddon

Add-ons ativos por assinatura.

```text
id
subscription_id
addon_code                 # EXTRA_USER, EXTRA_STORAGE_500MB, EXTRA_NF_PACK, etc
quantity
unit_price
total_price
billing_cycle              # MONTHLY, YEARLY
active
created_at
updated_at
```

### SISTEMA

#### FileAsset

```text
id
company_id
owner_type                 # customer, work_order, company, invoice, quote, contract, product
owner_id
file_type                  # LOGO, PHOTO, PDF, XML, SIGNATURE, OTHER
storage_provider           # MINIO
storage_key
mime_type
size_bytes
sha256
created_by_user_id
created_at
deleted_at
```

#### WebhookEvent

Idempotência e auditoria de webhooks.

```text
id
provider                   # ASAAS, PLUGNOTAS, FOCUS_NFE
event_id
event_type
idempotency_key            # sha256(provider + event_id + relevant_fields)
payload_json
status                     # RECEIVED, PROCESSED, IGNORED, FAILED
error_message
retry_count
processed_at
created_at
updated_at
```

UNIQUE em `idempotency_key`.

#### RequestIdempotency

Deduplicação de mutations do mobile.

```text
id
company_id nullable
user_id
client_request_id          # UUID gerado pelo app
endpoint
response_status
response_body_hash
expires_at                 # 7 dias
created_at
```

UNIQUE em `(user_id, client_request_id)`.

#### UsageMetric

```text
id
company_id
year_month                 # 2026-05
quotes_created
work_orders_created
work_orders_finished
invoices_issued
appointments_created
storage_used_mb
active_members
created_at
updated_at
```

#### EditLock

```text
id
company_id
resource_type
resource_id
locked_by_user_id
locked_until
created_at
updated_at
```

#### AuditLog

Append-only.

```text
id
company_id nullable
actor_user_id nullable
actor_type                 # USER, SYSTEM, SUPER_ADMIN, SUPPORT_ADMIN
action
entity_type
entity_id
before_json
after_json
reason nullable
ip
user_agent
created_at
```

#### Notification

```text
id
company_id
user_id
type
title
body
deep_link
data_json
read_at
created_at
```

#### DeviceToken

```text
id
user_id
company_id nullable
token                      # Expo push token
platform                   # IOS, ANDROID, WEB
app_version
last_seen_at
created_at
updated_at
```

#### FeatureFlag

```text
id
key
description
enabled_globally
created_at
updated_at
```

#### BetaAccess

Tenants Orcivo Equipe ganham acesso prioritário a features novas.

```text
id
company_id
feature_flag_id
enabled
enabled_by_user_id
created_at
updated_at
```

---

## 6. Status e enums

### QuoteStatus

```text
DRAFT, PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED
```

Não usar `CONVERTED_TO_WORK_ORDER`. `work_order_id IS NOT NULL` indica conversão.

### WorkOrderStatus

```text
OPEN, SCHEDULED, IN_PROGRESS, WAITING_CUSTOMER, WAITING_PARTS, FINISHED, CANCELLED
```

### AppointmentStatus

```text
SCHEDULED, DONE, CANCELLED, NO_SHOW
```

### AppointmentReminderStatus

```text
PENDING, SENT, FAILED, CANCELLED
```

### InvoiceStatus

```text
DRAFT, PROCESSING, ISSUED, FAILED, CANCELLED
```

### InvoiceType

```text
NFSE, NFE, NFCE, RECEIPT
```

### PaymentRecordStatus

```text
PENDING, PAID, PARTIAL, OVERDUE, CANCELLED
```

### PaymentMethod

```text
PIX_MANUAL, CASH, CARD_EXTERNAL, BOLETO_EXTERNAL, BANK_TRANSFER, OTHER
```

### SubscriptionStatus

```text
ACTIVE, PAST_DUE, BLOCKED, CANCELLED, PENDING_PAYMENT
```

### SubscriptionPaymentStatus

```text
PENDING, PAID, FAILED, REFUNDED
```

### UserRole

```text
SUPER_ADMIN, SUPPORT_ADMIN, OWNER, MEMBER
```

### UserStatus

```text
ACTIVE, DISABLED, PENDING_EMAIL_VERIFICATION
```

### WebhookEventStatus

```text
RECEIVED, PROCESSED, IGNORED, FAILED
```

### CatalogItemType

```text
PRODUCT, SERVICE, LABOR, TRAVEL, OTHER
```

### StockMovementType

```text
IN, OUT, ADJUSTMENT
```

### ContractDocumentStatus

```text
DRAFT, SIGNED, CANCELLED
```

### DocumentTemplateType

```text
QUOTE, WORK_ORDER, RECEIPT, CONTRACT, REPORT
```

### StandardTextType

```text
QUOTE_TERMS, SERVICE_DESCRIPTION, CONTRACT_CLAUSE, MESSAGE
```

### FinancialCategoryType

```text
INCOME, EXPENSE
```

### PlanCode

```text
LIVRE, SOLO, MAIS, EQUIPE
```

### BillingCycle

```text
MONTHLY, YEARLY
```

### DevicePlatform

```text
IOS, ANDROID, WEB
```

---

## 7. Multi-tenancy e isolamento de dados

Toda tabela de negócio tem `company_id`. Sem exceção.

```text
Banco único.
Schema compartilhado.
company_id em todas tabelas tenant-scoped.
TenantScopedRepository injeta filtro automático.
```

### TenantScopedRepository

Toda repository tenant-scoped herda de uma base que injeta `company_id`. Sem `company_id` no contexto → exception em runtime. Bypass de filtro → falha em CI.

### Teste obrigatório (em CI)

```text
criar empresa A;
criar empresa B;
criar usuário da empresa A;
criar recurso na empresa B;
logar como usuário da empresa A;
tentar acessar recurso da empresa B por ID direto (mobile ou web);
esperar 403 ou 404;
nunca retornar 200;
nunca vazar dados no body.
```

Mobile e web compartilham o mesmo backend, então o teste cobre ambos.

---

## 8. Auth próprio com NestJS Passport

### Stack de auth

```text
@nestjs/passport
@nestjs/jwt
passport-jwt
argon2
otplib
nodemailer ou Resend SDK
```

### Fluxo de signup

```text
POST /auth/signup { email, password, name, phone }
1. Validar email e password (mínimo 10 chars, zxcvbn score >= 3)
2. Hash com argon2 (memoryCost: 65536, parallelism: 4)
3. Criar User com status PENDING_EMAIL_VERIFICATION
4. Gerar token de verificação (sha256, expira 24h)
5. Enviar email via Resend
6. Retornar 201
```

### Fluxo de login

```text
POST /auth/login { email, password, totp_code? }
1. Buscar User por email
2. Checar rate limit (5 tentativas/min por IP)
3. Checar failed_login_attempts (lock após 10 falhas, 15min)
4. Verificar argon2.verify(password, hash)
5. Se totp_enabled, exigir totp_code (otplib.verify)
6. Atualizar last_login_at, last_login_ip, resetar failed_attempts
7. Gerar access token (JWT, 15min) + refresh token (JWT, 30 dias)
8. Salvar refresh_token_hash em RefreshToken
9. Retornar { access_token, refresh_token }
```

### JWT payload

```text
{
  sub: user.id,
  email: user.email,
  iat,
  exp,
  type: "access" | "refresh"
}
```

`company_id` NÃO vai no JWT. Empresa atual selecionada via `POST /me/select-company` e armazenada em sessão Redis curta OU header `X-Company-Id` validado a cada request.

### JWT NÃO é autorização

```text
JWT só identifica o usuário.
JWT não prova permissão atual.
Backend revalida tudo a cada request tenant-scoped.
```

### Revalidação por request

```sql
SELECT cm.active, cm.role, cm.permissions_json,
       c.status AS company_status,
       s.status AS subscription_status,
       s.grace_period_ends_at
FROM company_members cm
JOIN companies c ON c.id = cm.company_id
JOIN subscriptions s ON s.company_id = cm.company_id
WHERE cm.user_id = ? AND cm.company_id = ?
```

### Cache em Redis

```text
key: user:{user_id}:company:{company_id}:access
ttl: 60 segundos
value: { active, role, permissions, company_status, subscription_status }
```

Invalidar quando: CompanyMember desativado, permissão alterada, Subscription muda status, Company bloqueada, plano alterado.

### Refresh token rotativo

```text
POST /auth/refresh { refresh_token }
1. Verificar JWT
2. Buscar RefreshToken por token_hash
3. Se revoked_at ou expires_at < now: rejeitar
4. Revogar refresh atual
5. Gerar novo access + refresh
6. Salvar novo RefreshToken
7. Retornar novo par
```

Token comprometido é detectável: refresh usado 2x → revogar tudo do user.

### Reset de senha

```text
POST /auth/forgot-password { email }
- Sempre retornar 200 (não vazar se email existe)
- Se user existe, gerar PasswordResetToken (sha256, expira 30min)
- Enviar email com link

POST /auth/reset-password { token, new_password }
- Buscar PasswordResetToken
- Validar expires_at, used_at
- Atualizar password_hash
- Marcar token used_at
- Revogar todos RefreshTokens do user
- Audit log
```

### 2FA TOTP

```text
POST /auth/2fa/enable
- Gerar totp_secret
- Salvar criptografado em User.totp_secret
- Retornar QR code (otpauth URL)

POST /auth/2fa/confirm { totp_code }
- Validar com totp_secret
- Marcar totp_enabled = true
- Audit log

POST /auth/2fa/disable { password, totp_code }
- Reexigir senha + código
- Limpar totp_secret
- Marcar totp_enabled = false
- Audit log
```

### Rate limiting

```text
Login:         5/min por IP
Signup:        3/hora por IP
Recuperar senha: 3/hora por email
Refresh:       30/min por user
Mutations:     100/min por user
Geral:         200/min por IP
```

Implementação: Redis com `SETEX rate:{action}:{key}`.

---

## 9. Papéis e permissões

### Roles

```text
SUPER_ADMIN     — você, operação máxima
SUPPORT_ADMIN   — suporte interno futuro
OWNER           — dono da empresa
MEMBER          — técnico/funcionário
```

### SUPER_ADMIN

Você. Operação máxima do SaaS.

Pode: ver tenants, gerenciar planos, reprocessar webhooks, ver falhas, executar ações administrativas com motivo.

Regras: 2FA obrigatório, IP allowlist, toda ação auditada, motivo obrigatório, dados mascarados por padrão.

### SUPPORT_ADMIN

Suporte interno (futuro).

Pode: ver informações limitadas, ajudar em falhas, consultar logs.

Não pode: excluir tenant, alterar plano, acessar fiscal sensível, impersonar livremente, baixar arquivos privados sem motivo.

### OWNER

Dono da empresa cliente.

Pode: gerenciar empresa, gerenciar membros, ver/editar tudo, ver financeiro, emitir nota se plano permitir, gerenciar catálogo, configurar identidade e Pix, exportar dados, ver audit log se plano permitir.

### MEMBER

Permissões configuráveis em `permissions_json`:

```text
ver_clientes_atribuidos       (vs ver_todos_clientes)
ver_todos_clientes
criar_cliente
editar_cliente
criar_orcamento
editar_orcamento
criar_os
editar_os
ver_financeiro
registrar_recebimento
emitir_nf
gerenciar_catalogo
gerenciar_estoque
gerenciar_membros             # perigoso, só OWNER concede
ver_relatorios
ver_audit_log
ver_agenda_geral
gerenciar_agenda
```

Quando `ver_todos_clientes = false`, vê apenas:

```text
customer.created_by_user_id = user.id
OU customer.assigned_to_user_id = user.id
OU work_order.assigned_to_user_id = user.id
OU appointment.assigned_to_user_id = user.id
```

---

## 10. Admin master e suporte interno

### Por que é obrigatório no MVP

Sem admin master, você mexe direto no banco em produção. Perigoso, lento, sem audit, não escala.

### Funções mínimas (Fase 2)

```text
listar empresas;
ver status assinatura;
alterar plano manualmente (com motivo);
bloquear/desbloquear empresa;
ver uso de storage;
ver webhooks recebidos e FAILED;
reprocessar webhook;
ver jobs falhos (Bull Board);
ver falhas fiscais;
forçar retry de NF;
ver usuários da empresa;
consultar audit log;
ver métricas (MRR, churn, ativação).
```

### Implementação inicial (Fase 2)

```text
rotas /admin/* protegidas por @Role(SUPER_ADMIN);
2FA obrigatório no login admin;
templates simples server-side OU JSON consumido por admin-web Next.js minimal;
Bull Board para BullMQ.
```

### Painel admin profissional (Fase 4)

```text
apps/admin/ em Next.js
mesma identidade visual mas com tema "operacional"
acesso restrito por IP (Caddy matcher) + role
```

### Restrições obrigatórias

```text
2FA obrigatório para SUPER_ADMIN e SUPPORT_ADMIN.
IP allowlist quando viável.
Sem impersonation livre.
Impersonation exige motivo escrito.
Janela máxima de 4h.
Toda impersonation gera audit log.
Dados sensíveis mascarados por padrão.
Ações destrutivas exigem segunda confirmação.
Alteração de plano manual exige motivo.
Download de arquivo privado exige motivo.
Certificado A1 nunca baixável pelo admin.
Senha de certificado nunca exibida.
```

---

## 10.1. Nomenclatura final de planos e copy comercial

Decisão final de produto/design: **não usar nomes iguais aos do Agenda Boa** nos planos do Orcivo.

### Nomes visíveis ao usuário

```text
Orcivo Livre   — plano gratuito/teste
Orcivo Solo    — técnico solo
Orcivo Mais    — técnico com mais volume
Orcivo Equipe  — pequena empresa/equipe
```

### Códigos internos

```text
LIVRE
SOLO
MAIS
EQUIPE
```

### Evitar na UI e no marketing

```text
FREE
POP
PRO
TOP
ilimitado
14 dias grátis / trial
Assinar PRO
R$ 24,90/mês solto dentro do app mobile
```

### Usar na UI e no marketing

```text
uso justo
uso ampliado
Ver planos
Gerenciar assinatura
Sua assinatura é gerenciada pelo painel da sua conta.
```

### Observação

Os nomes POP/PRO/TOP podem aparecer apenas quando o documento estiver comparando explicitamente com o **Agenda Boa** como benchmark. Eles não devem ser usados como nomes de planos do Orcivo.

---

## 11. Planos Orcivo Livre / Solo / Mais / Equipe

Posicionamento competitivo: **mais barato que Agenda Boa, equivalente em features ou superior em foco no nicho**.

Limites e preços abaixo seguem a decisão oficial do owner[^precos]; a tabela consolidada está ao final desta seção.

### Orcivo Livre — R$0

Aquisição, teste e viralidade.

```text
1 empresa (CPF ou CNPJ)
1 usuário
até 5 clientes
até 10 orçamentos/mês
até 15 OS/mês
até 1 agendamento/dia
PDF simples com marca d'água discreta
sem logo personalizada
sem assinatura digital no aparelho
sem fotos em pedidos/OS
sem contratos
sem estoque
sem gráficos financeiros
sem web completa (web read-only)
sem nota fiscal
busca limitada
suporte: tutoriais e FAQ
```

Função: deixar técnico testar o fluxo. Converte quando precisa de logo, mais documentos, web e recursos profissionais.

### Orcivo Solo — R$79,90/ano (R$6,66/mês equiv.)

Mais barato que Agenda Boa POP (R$99,90/ano). **Diferença: R$20,00/ano.**

Indicado para técnico solo que quer sair do improviso.

```text
1 empresa
1 usuário
até 50 clientes
até 50 orçamentos/mês
até 30 OS/mês
até 50 agendamentos/mês
logo nos documentos
cor personalizada nos documentos
compartilhamento WhatsApp
catálogo de serviços
catálogo de produtos simples (sem fotos)
duplicar orçamentos/pedidos
textos padronizados (até 5)
recibos simples
agenda básica + lembretes push
busca por nome
web/PC em modo básico (mesmas funções do mobile)
100 MB de arquivos
suporte: e-mail + tutoriais (resposta em até 24h úteis)
sem fotos em pedidos
sem assinatura digital
sem contratos
sem estoque
sem gráficos
sem NF automática (NF via add-on quando disponível)
```

### Orcivo Mais — R$199,90/ano (R$16,66/mês equiv.)

Mais barato que Agenda Boa PRO (R$249,90/ano). **Diferença: R$50,00/ano.**

Indicado para técnico com volume que quer aparência profissional.

```text
1 empresa
até 3 usuários
até 200 clientes
orçamentos com uso justo
OS com uso justo
agendamentos com uso justo
PDF profissional sem marca d'água
logo + cor personalizada + identidade visual completa
textos padronizados com uso justo
catálogo de serviços e produtos completo
fotos nos pedidos/OS
assinatura digital do cliente no aparelho
relatório do pedido/OS em PDF
recibos profissionais
controle financeiro
filtros financeiros por período
resumo financeiro
agenda completa + lembretes push e email
busca por nome, documento, telefone
duplicar pedidos, produtos, serviços
web/PC completa para operação
500 MB de arquivos
suporte: e-mail + WhatsApp em horário comercial (resposta em até 8h úteis)
sem contratos
sem estoque
sem gráficos visuais
30 NFS-e/mês inclusas (quando fiscal disponível)
NF extra: R$1,50 cada
```

### Orcivo Equipe — R$389,90/ano (R$32,49/mês equiv.)

Mais barato que Agenda Boa TOP (R$459,90/ano). **Diferença: R$70,00/ano.**

Indicado para pequena empresa com equipe.

```text
1 empresa
até 8 usuários
clientes uso justo
orçamentos uso justo
OS uso justo
agendamentos uso justo
todos recursos do Orcivo Mais, além de:
contratos com modelos customizáveis
geração de contrato a partir de orçamento
controle de estoque simples
fotos de produtos
leitor de código de barras (mobile)
movimentações de estoque
alerta de estoque baixo
gráficos financeiros (receitas, despesas, evolução)
relatórios avançados
permissões granulares por usuário
atribuição de clientes/OS por técnico
checklist obrigatório opcional em OS
2FA obrigatório para OWNER
audit log completo visível ao OWNER
exportação completa de dados
testar novidades primeiro (BetaAccess automático)
1 GB de arquivos
suporte prioritário (resposta em até 4h úteis)
100 NFS-e/mês inclusas (quando fiscal disponível)
NF extra: R$0,90 cada
```

### Por que 100 NFs no EQUIPE e não 200

Custo do hub fiscal R$0,40/un × 200 = R$80/mês — estoura a margem do plano. Com 100 inclusas: R$40/mês de custo, margem ainda saudável. Excedente cobrado a R$0,90 mantém receita marginal positiva.

### Comparação direta com Agenda Boa

| | Agenda Boa | Nosso |
|---|---:|---:|
| Grátis | R$0 | R$0 |
| Agenda Boa POP / Orcivo Solo | R$99,90 | **R$79,90** |
| Agenda Boa PRO / Orcivo Mais | R$249,90 | **R$199,90** |
| Agenda Boa TOP / Orcivo Equipe | R$459,90 | **R$389,90** |

### Cobrança mensal (oferta secundária)

Valores oficiais (não são exemplo; coincidem com `PLAN_PRICING` em `packages/shared-types/src/billing/plans.ts`):

```text
Orcivo Solo mensal:  R$9,90/mês
Orcivo Mais mensal:  R$24,90/mês
Orcivo Equipe mensal:  R$49,90/mês
```

Anual com desconto agressivo é a oferta padrão. Mensal existe para quem prefere.

### Tabela oficial de limites e preços

| Plano | Mensal | Anual | Clientes | Orçamentos/mês | OS/mês | Usuários |
|---|---:|---:|---:|---:|---:|---:|
| Orcivo Livre | R$0 | R$0 | 5 | 10 | 15 | 1 |
| Orcivo Solo | R$9,90 | R$79,90 | 50 | 50 | 30 | 1 |
| Orcivo Mais | R$24,90 | R$199,90 | 200 | uso justo | uso justo | 3 |
| Orcivo Equipe | R$49,90 | R$389,90 | uso justo | uso justo | uso justo | 8 |

"Uso justo" corresponde a limite nulo no código (`null`); a UI e o marketing nunca usam a palavra "ilimitado".

[^precos]: Decisão do owner em 2026-10-01 (`ownerDecisions.PRICING`, `.planning/product/MVP-LAUNCH-BATCH-2.tasks.json`). Este documento e o código (`packages/shared-types/src/billing/plans.ts`) foram sincronizados com esses valores na task L2-P01-docs-pricing-reconcile.

---

## 12. Add-ons e regras de billing

### Add-ons disponíveis

```text
Usuário extra:
  Orcivo Solo / Orcivo Mais / Orcivo Equipe
  R$7,90/mês ou R$79,90/ano

+500 MB de armazenamento:
  qualquer plano
  R$9,90/mês ou R$99,90/ano

Pacote +50 NFs:
  MAIS/EQUIPE
  R$39,00 (avulso)
  cobrado quando módulo fiscal estiver ativo

NF avulsa excedente:
  Orcivo Mais: R$1,50/un acima da franquia
  Orcivo Equipe: R$0,90/un acima da franquia

CNPJ adicional:
  nova assinatura completa, vinculada à mesma conta

Suporte premium:
  apenas Orcivo Equipe
  futuro (Fase 7+)
```

### Regras de plano

```text
Limites vêm do backend, nunca hardcoded no app.
App pede limites via GET /me/plan-limits.
Estourou limite → bloqueia criação nova, NÃO bloqueia visualização.
Upgrade libera limite imediatamente (prorate Asaas).
Downgrade aplica próximo ciclo se houver excesso.
Cancelamento mantém acesso até fim do período pago.
Orcivo Livre sem cobrança via Asaas (não cria Subscription com gateway).
```

### Como vender mais barato sem destruir margem

```text
1. Limites claros (não promete uso sem limites).
2. Cobrança anual antecipada (caixa + redução de churn).
3. Add-ons cobrindo casos extremos.
4. NF como custo passável (franquia + excedente).
5. Operação enxuta (self-hosted, baixo overhead fixo).
6. Conversão de Grátis → SOLO via friction points (logo, web, PDF profissional).
```

---

## 13. Assinatura SaaS e bloqueio escalonado

### Preço oficial de cobrança

Os preços cobrados nesta assinatura são os da tabela oficial da §11[^precos]: mensal Solo R$9,90, **Mais R$24,90**, **Equipe R$49,90**; anual Solo R$79,90, Mais R$199,90, Equipe R$389,90. Não há outro valor mensal vigente para Mais/Equipe.

### Regra final

**Bloqueio por ação, não por acesso.** Inadimplente continua entrando.

### Inadimplente PODE

```text
logar (mobile e web);
visualizar dados;
exportar dados;
ver tela de regularização;
atualizar pagamento;
falar com suporte;
cancelar definitivamente.
```

### Inadimplente NÃO PODE

```text
criar cliente;
criar orçamento;
gerar novo PDF;
criar OS;
finalizar OS;
emitir nota;
criar agendamento;
convidar usuário;
fazer upload novo;
usar recursos premium.
```

### Carência por plano

```text
Grátis:        0 (sem inadimplência)
Orcivo Solo:           1-2 dias
Orcivo Mais:           3 dias
Orcivo Equipe:           5-7 dias
```

Configurável, nunca hardcoded.

### Fluxo

```text
Asaas envia webhook payment_failed
→ subscription.status = PAST_DUE
→ banner no app/web + email + push
→ fim da carência
→ subscription.status = BLOCKED
→ bloqueio de escrita
→ pagamento confirmado (webhook payment_confirmed)
→ subscription.status = ACTIVE
→ banner sai, ações liberadas
```

### Estratégia das lojas

```text
sem preço no app mobile;
sem botão "comprar plano" no mobile;
sem texto "evite taxa da Apple";
sem checkout interno no mobile;
mensagem neutra: "Sua assinatura está inativa. Acesse o site para regularizar."
checkout 100% no site público (Next.js).
```

---

## 14. Billing com Asaas e webhooks idempotentes

### Por que Asaas

Brasil, Pix/boleto/cartão, recorrência nativa, webhooks confiáveis, encaixe MEI/PME.

### WebhookEvent obrigatório

Todo webhook recebido vira registro em `WebhookEvent` antes de qualquer processamento.

### Regras de webhook

```text
webhook pode chegar duplicado;
webhook pode chegar fora de ordem;
webhook pode ser reenviado;
webhook pode falhar no meio;
handler deve ser idempotente sempre.
```

### Fluxo de recebimento

```text
POST /webhooks/asaas
→ validar assinatura HMAC
→ idempotency_key = sha256(provider + event_id + event_type)
→ INSERT WebhookEvent ON CONFLICT (idempotency_key) DO NOTHING RETURNING id
→ se conflict: retornar 200
→ se inserido: enfileirar job BullMQ
→ retornar 200 imediato
→ worker processa em transação:
  → buscar Subscription/SubscriptionPayment
  → aplicar regra (não confiar na ordem)
  → atualizar status
  → invalidar cache Redis dos users
  → marcar PROCESSED
  → se falhar: FAILED + retry com backoff
```

### Eventos principais

```text
payment_created
payment_confirmed
payment_overdue
payment_failed
payment_refunded
subscription_created
subscription_updated
subscription_cancelled
```

### Cuidados

```text
não confiar na ordem;
não ativar assinatura com evento antigo se estado atual for cancelled;
não duplicar pagamento;
salvar raw_payload_json sempre;
todo PROCESSED gera audit_log.
```

---

## 15. Idempotência de requests do mobile

### Problema

Mobile perde rede no meio do POST. Reenvio pode duplicar (orçamento 2x, OS duplicada).

### Solução: client_request_id

Toda mutation do mobile envia header opcional `X-Client-Request-Id` com UUID gerado offline.

### Fluxo

```text
1. App gera UUID antes de enviar request
2. Persiste em SQLite local com payload
3. Envia request com header X-Client-Request-Id
4. Backend:
   a. Sem header: processa normal
   b. Com header:
      - busca RequestIdempotency (user_id, client_request_id)
      - se existe e expires_at > now: retorna response_status anterior, NÃO reexecuta
      - se não existe: executa, salva RequestIdempotency, retorna
5. App, ao receber 2xx, remove do SQLite local
6. App, em retry, reenvia mesmo header
```

### Decorator `@Idempotent()`

```typescript
@Post('/quotes')
@Idempotent()
async create(...) { ... }
```

### Job de limpeza diário

```sql
DELETE FROM request_idempotency WHERE expires_at < NOW();
```

### Web não precisa

Web não tem fila offline. Mutations da web podem usar idempotência opcional, mas não é obrigatório.

---

## 16. Nota fiscal

### Decisão

Não criar integração própria com SEFAZ/prefeituras. Usar hub:

```text
PlugNotas (primário)
Focus NFe (alternativa)
Nuvem Fiscal (futuro)
```

### Estratégia por fases

```text
MVP:               recibo/PDF + controle manual
Fase fiscal 1:     NFS-e via hub
Fase fiscal 2:     NF-e/NFC-e se houver demanda real
```

### NFS-e avulsa via SEFAZ

**Não é estratégia principal.** Limitada a prestador eventual, não cobre todos municípios, não escala. Pode existir como **campo manual** para registrar número/link de nota emitida fora.

### Certificado A1

```text
arquivo criptografado AES-256 (chave por tenant);
senha criptografada;
nunca logar/retornar senha em response/error;
acesso auditado;
remoção controlada;
download bloqueado para admin;
storage em MinIO bucket privado.
```

### Falha fiscal

```text
status = FAILED;
salvar error_message;
incrementar retry_count;
retry exponencial via BullMQ;
notificar usuário (push + email);
alertar admin se sistêmica;
NUNCA travar OS/orçamento.
```

### Retry

```text
5min, 30min, 2h, 6h, 24h
```

Após 5 tentativas: FAILED definitivo, retry manual disponível, alerta admin.

### Promessa correta

```text
NÃO prometer: "Emissão fiscal completa em qualquer empresa do Brasil"
PROMETER:     "Emissão fiscal integrada conforme disponibilidade da empresa,
              município, cadastro fiscal e provedor homologado"
```

### Consultoria contábil obrigatória

Antes da Fase 6: 2-4h com contador especializado em SaaS/MEI. Custo R$300-600. Validar regime tributário, CNAEs, ISS, NFS-e, certificado, retenções, cancelamento.

---

## 17. Money handling

### Regra obrigatória

```text
NUNCA usar float/number para dinheiro.
NUNCA confiar só no cálculo do app.
Backend SEMPRE recalcula totais.
PDF e NF usam valores do backend, não do payload.
```

### Modelo final

```text
Banco:    PostgreSQL numeric(12,2)
Backend:  Prisma.Decimal
API JSON: string decimal
Mobile:   Decimal.js
Web:      Decimal.js
```

### Exemplo de payload

```json
{
  "items": [
    {
      "unit_price": "150.00",
      "quantity": "2",
      "discount_amount": "10.00"
    }
  ],
  "discount_percent": "5.00"
}
```

Backend desserializa para `Prisma.Decimal`, recalcula `total`, ignora total enviado pelo cliente (mobile ou web).

### Proibido

```text
unit_price: 150.00 como number JSON
total calculado só no app
arredondamento sem regra
parseFloat para valor monetário
```

### Regras de cálculo

```text
soma dos itens no backend;
desconto aplicado no backend;
imposto calculado no backend;
arredondamento half-even (banker's rounding);
PDF usa valores finais do backend;
NF usa valores finais do backend.
```

---

## 18. Documentos: PDFs, contratos e templates

### Geração de PDF

```text
Tecnologia: @react-pdf/renderer (server-side, sem Chromium)
Migrar para Puppeteer apenas se design exigir.
```

### Tipos de documento

```text
Quote                    — orçamento (todos planos pagos)
WorkOrder                — ordem de serviço (todos planos pagos)
Receipt                  — recibo (todos planos)
ServiceReport            — relatório do pedido/OS (Orcivo Mais/Equipe)
Contract                 — contrato (Orcivo Equipe)
```

### Personalização por empresa

```text
logo (FileAsset)
brand_color
nome fantasia
razão social
CPF/CNPJ
telefone, email, endereço
chave Pix
termos padrão (StandardText do tipo QUOTE_TERMS)
rodapé customizável
campo de assinatura
```

### StandardText

Textos reutilizáveis (cláusulas, descrições, mensagens). Usuário cria, edita, marca como padrão.

```text
Tipos:
  QUOTE_TERMS         — termos de orçamento
  SERVICE_DESCRIPTION — descrição de serviço pré-pronta
  CONTRACT_CLAUSE     — cláusula de contrato
  MESSAGE             — mensagem padrão para WhatsApp
```

### DocumentTemplate

Templates customizáveis (Fase 4+):

```text
content_json: estrutura blocos do documento
style_json:   variações visuais (header, layout, tipografia)
```

MVP usa templates fixos hardcoded (`quote-default`, `work-order-default`, `receipt-default`). Templates customizáveis via UI vêm na Fase 4+.

### Contratos (Orcivo Equipe, Fase 4)

```text
ContractTemplate:
  conteúdo com placeholders {{cliente_nome}}, {{servico}}, {{valor}}, etc.
  variables_json define quais placeholders existem.

ContractDocument:
  instância gerada para um cliente/orçamento/OS específico.
  pode ter assinatura digital (mesmo fluxo de QuoteApproval).
```

### Regras

```text
PDF gerado no backend, nunca no app.
PDF armazenado em MinIO.
PDF tem FileAsset.
Compartilhamento via WhatsApp = signed URL (TTL 30 dias).
Re-geração cria nova versão; antiga preservada.
```

---

## 19. Catálogo, estoque e código de barras

### Catálogo (todos planos pagos)

`CatalogItem` reutilizável. Tipos: PRODUCT, SERVICE, LABOR, TRAVEL, OTHER.

### Fotos de produto (Orcivo Equipe, Fase 5)

`ProductPhoto` linkado a `CatalogItem`. Múltiplas fotos por item, ordenáveis. Apenas planos EQUIPE (MAIS pode ter foto de pedido/OS, mas não de catálogo).

### Estoque simples (Orcivo Equipe, Fase 5)

```text
StockItem:
  quantidade atual por item;
  quantidade mínima (alerta);
  localização opcional (gaveta, estante).

StockMovement:
  IN  — entrada de material;
  OUT — saída por uso em OS;
  ADJUSTMENT — correção manual.

Alerta de estoque baixo:
  notificação push quando StockItem.quantity <= min_quantity.

Vincular OS a saídas:
  ao finalizar OS, descontar materiais usados do estoque (opt-in).
```

**O estoque NÃO é ERP.** Não tem cálculo de custo médio, não tem movimentação de transferência, não tem contas a pagar. É controle simples.

### Código de barras (Orcivo Equipe, Fase 5)

```text
Barcode entidade:
  vincula código a CatalogItem.

Mobile:
  câmera lê código (expo-barcode-scanner);
  busca CatalogItem por código;
  adiciona ao orçamento/OS rapidamente.

BarcodeScanLog:
  histórico de leituras (auditoria).
```

---

## 20. Agenda e lembretes

### Appointment

Compromisso vinculável a Customer, Quote, WorkOrder ou nenhum. Atribuível a usuário (técnico).

### Visões

```text
Mobile:
  agenda do dia/semana;
  visualização do técnico logado por padrão;
  OWNER pode ver todos.

Web:
  calendário mensal/semanal/diário;
  filtros por técnico, cliente, tipo;
  drag-and-drop para mover compromissos (Fase 4).
```

### Lembretes

```text
AppointmentReminder agendado via BullMQ delayed job.
Tipos: PUSH (Expo Notifications), EMAIL.
Default: 1h antes (configurável via reminder_minutes_before).
Orcivo Solo: lembrete básico push.
Orcivo Mais/Equipe: push + email + customização.
```

### Regras

```text
SCHEDULED → DONE quando técnico marca
SCHEDULED → CANCELLED se cancelado
SCHEDULED → NO_SHOW se cliente faltou
Compromisso vinculado a OS pode mudar status da OS automaticamente.
Audit log para criação, mudança e cancelamento.
```

---

## 21. Arquivos e storage (MinIO)

### Storage

```text
MinIO self-hosted em Docker
Buckets privados por padrão
S3-compatible (mesmo SDK que AWS)
Volume persistente: /mnt/minio na VPS
```

### Buckets

```text
saas-uploads        # geral (logos, anexos)
saas-photos         # fotos de OS e produto
saas-pdfs           # PDFs gerados
saas-fiscal         # XMLs e PDFs de nota
saas-temp           # uploads em andamento (TTL 24h)
```

### Path

```text
{bucket}/companies/{company_id}/{owner_type}/{owner_id}/{file_id}.{ext}
```

### Signed URLs

```text
GET privado: signed URL com expiração 5min
PUT upload: signed URL pré-assinada (mobile faz upload direto, sem passar pelo backend)
Validação: extrair company_id do path, comparar com JWT
```

### Regras

```text
arquivos privados por padrão;
acesso via signed URL com TTL curto;
company_id validado antes de gerar URL;
compressão de imagem no app antes do upload (mobile e web);
sem vídeo no MVP;
limite por plano enforced em endpoint de upload;
audit log para downloads sensíveis (NF, certificado, contrato).
```

### Compressão de imagem

```text
Mobile (React Native):
  expo-image-manipulator
  JPEG, qualidade 75-85
  largura máxima 1920px
  alvo: 300 KB - 1,5 MB

Web (Next.js):
  browser-image-compression ou similar
  mesma especificação
```

### Backup

```text
rsync diário /mnt/minio → /mnt/backups/minio
rotação: 7 dias
teste de restore mensal
```

---

## 22. Sincronização e operação em campo

**Online-first com cache resiliente.** Não offline-first completo.

### Cache local (mobile)

```text
Biblioteca: WatermelonDB ou MMKV + Zustand persist

Cacheado:
  clientes recentes;
  catálogo;
  OS abertas;
  orçamentos recentes;
  agenda do dia/semana;
  configuração da empresa;
  rascunhos.
```

### Web (não tem fila offline)

Web pressupõe rede ativa. Caches via React Query com staleTime configurado por endpoint.

### Escrita resiliente (mobile)

```text
Sem internet:
  salvar rascunho local;
  mostrar "pendente de sincronização";
  NÃO fingir que salvou no servidor;
  sincronizar quando rede voltar via fila local.

X-Client-Request-Id em toda mutation (ver §15).
```

### Upload de fotos (mobile)

```text
captura → compressão local → fila local em SQLite → upload em background com retry → indicador de pendências visível.
```

### Ações que exigem internet

```text
login;
aprovação por link público;
geração final de PDF;
emissão fiscal;
alteração de plano;
upload definitivo;
sincronização final.
```

### Lock pessimista

```text
Usuário A abre orçamento → POST /quotes/:id/lock
Backend cria EditLock por 5min
Usuário B tenta editar → 423 LOCKED
App de A renova lock a cada 60s (heartbeat)
Lock expira sozinho após perda de conexão.
```

Funciona igual em mobile e web.

---

## 23. Auditoria

### AuditLog append-only

```text
sem UPDATE (REVOKE em Postgres);
sem DELETE comum;
retenção mínima 5 anos (fiscal);
anonimização após retenção;
acesso auditado.
```

### Eventos auditáveis

```text
auth.signup, auth.email_verified, auth.login_succeeded, auth.login_failed,
auth.logout, auth.password_changed, auth.password_reset_requested,
auth.password_reset_completed, auth.2fa_enabled, auth.2fa_disabled

company.created, company.updated, company.branding_changed,
company.pix_changed, company.blocked, company.unblocked

member.invited, member.joined, member.permissions_changed, member.deactivated

customer.created, customer.updated, customer.deleted

quote.created, quote.updated, quote.sent, quote.approved, quote.rejected,
quote.expired, quote.cancelled, quote.pdf_generated

work_order.created, work_order.scheduled, work_order.started, work_order.finished,
work_order.cancelled, work_order.photo_uploaded, work_order.signature_added

appointment.created, appointment.updated, appointment.cancelled, appointment.done

document.template_created, document.generated, contract.created,
contract.signed, contract.cancelled

stock.movement_created, stock.alert_triggered

payment.recorded, payment.updated, payment.cancelled

invoice.requested, invoice.processing, invoice.issued, invoice.failed,
invoice.cancelled, invoice.retry_requested

subscription.created, subscription.payment_failed, subscription.payment_succeeded,
subscription.past_due, subscription.blocked, subscription.unblocked,
subscription.cancelled, subscription.upgraded, subscription.downgraded,
subscription.addon_added, subscription.addon_removed

webhook.received, webhook.processed, webhook.failed, webhook.reprocessed

admin_master.viewed_tenant, admin_master.impersonation_started,
admin_master.impersonation_finished, admin_master.changed_plan,
admin_master.reprocessed_job, admin_master.downloaded_sensitive_file
```

---

## 24. Segurança

### Obrigatório desde o MVP

```text
HTTPS via Caddy (Let's Encrypt automático);
JWT validado a cada request;
revalidação de membership a cada request (cache 60s);
company_id obrigatório em queries tenant-scoped;
guards de permissão;
rate limit em login, signup, forgot, mutations;
signed URLs para arquivos privados;
audit log de ações sensíveis;
logs sem dados sensíveis (Pino redact);
segredos fora dos clients (env vars no backend);
backups automáticos;
GlitchTip sem PII;
validação server-side de tudo;
mesmo backend serve mobile e web (mesma proteção).
```

### Dados sensíveis

```text
CPF/CNPJ                  # criptografados pgcrypto, mascarados na UI
telefone                   # parcialmente mascarado em admin
endereço                   # acesso restrito
XML de nota                # bucket privado
certificado A1             # AES-256 com chave por tenant
senha de certificado       # criptografada, nunca em log/response
logs administrativos       # bucket separado
arquivos privados          # signed URLs
```

### Proteções específicas

```text
argon2id senha (memoryCost 65536);
2FA TOTP via otplib;
2FA obrigatório SUPER_ADMIN, SUPPORT_ADMIN;
2FA obrigatório OWNER no Orcivo Equipe;
IP allowlist /admin/* via Caddy;
rate limit auth;
proteção brute-force (lock 15min após 10 falhas);
CORS estrito por origem (mobile.app, dominio.com.br, etc);
headers segurança (HSTS, CSP, X-Frame-Options);
Pino redact: ['password', 'totp_secret', 'token', 'certificate'];
mensagem genérica em forgot password.
```

### Certificado A1

```text
AES-256-GCM com chave derivada por tenant;
senha criptografada com chave separada;
nunca exibir, logar, retornar em response/error;
auditar todo uso;
download bloqueado para admin master.
```

---

## 25. LGPD e retenção

### Posição

```text
Empresa cliente: controlador.
SaaS: operador.
```

### Obrigatório no MVP

```text
Política de Privacidade clara em pt-BR;
Termos de Uso;
DPA simplificado embutido nos ToS;
registro de aceite no signup;
exportação completa via ZIP;
processo de exclusão/anonimização;
retenção definida e visível;
controle de acesso interno;
logs de admin auditados;
e-mail dpo@dominio.com.br (você responde).
```

### Exportação

ZIP via job assíncrono BullMQ. Email com link signed URL (TTL 7 dias). Inclui:

```text
clientes.csv + clientes.json
orçamentos.csv + orçamentos.json
OS.csv + OS.json
agendamentos.csv
recebimentos.csv + recebimentos.json
notas.csv + notas.json
contratos.csv + contratos.json
/pdfs/
/xmls/
/fotos/
/arquivos/
audit_logs_relevantes.csv
```

### Retenção pós-cancelamento

```text
Até fim do ciclo pago:    acesso normal
+30 dias:                 leitura/exportação
+60-90 dias:              avisos de exclusão
Após 90 dias:             exclusão OU anonimização conforme política
Documentos fiscais:       preservados (5+ anos legal)
Audit log:                retido com anonimização parcial
```

### Linguagem correta

Evitar prometer hard delete absoluto. Usar:

> *exclusão ou anonimização conforme política de retenção e obrigações legais aplicáveis.*

---

## 26. Observabilidade self-hosted

```text
GlitchTip       — error tracking (Sentry SDK compatible)
Uptime Kuma     — uptime monitoring + alertas
Umami           — analytics de produto
Loki + Grafana  — logs centralizados (opcional inicial)
```

### Configurar GlitchTip em mobile, web e backend

DSN diferentes para cada app, source maps upload no build, beforeSend filtra PII.

### Healthchecks backend

```text
GET /health
GET /health/db
GET /health/redis
GET /health/storage
GET /ready
```

### Eventos Umami

```text
signup_started, signup_completed, email_verified
company_created, brand_configured
first_customer_created
quote_created, quote_pdf_generated, quote_shared_whatsapp, quote_approved
work_order_created, work_order_finished
appointment_created
payment_record_created
invoice_requested, invoice_issued, invoice_failed
subscription_paid, subscription_past_due, subscription_blocked, subscription_cancelled
upgrade_clicked, addon_added
```

### Métricas SaaS (job semanal)

```text
MRR atual; ARR atual; churn 30d; ARPU; ativação;
tempo até primeiro orçamento; orçamentos/empresa/mês;
OS finalizadas/mês; falhas fiscais; storage por tenant;
empresas bloqueadas; conversão signup → primeira ação → pagamento.
```

---

## 27. Infraestrutura na VPS

### Requisitos

```text
RAM:     4 GB mínimo, 8 GB recomendado, 16 GB se rodar admin-web e site no mesmo nó
CPU:     2 vCPU mínimo, 4 vCPU recomendado
Disco:   80 GB SSD mínimo, 160 GB recomendado
Sistema: Ubuntu 22.04 LTS ou Debian 12
Banda:   1 TB/mês conservador
IPv4:    dedicado
```

### Estimativa de RAM

```text
PostgreSQL:        512 MB
Redis:             256 MB
MinIO:             512 MB
Backend NestJS:    512 MB
Backend worker:    384 MB
Web Next.js:       512 MB (SSR)
Site público:      256 MB (estático)
Admin web:         256 MB
Caddy:              64 MB
GlitchTip:         512 MB
Postgres GlitchTip: 256 MB
Uptime Kuma:       128 MB
Umami:             256 MB
Postgres Umami:    256 MB
Overhead SO:       512 MB
─────────────────────────
TOTAL:           ~5.2 GB

Margem para 8 GB: confortável
Para 4 GB: mover GlitchTip/Umami para VPS auxiliar futuramente
```

### Setup inicial

```text
1. atualizar sistema;
2. usuário não-root com sudo;
3. SSH só por chave (PermitRootLogin no, PasswordAuthentication no);
4. UFW (allow 22, 80, 443);
5. fail2ban com jail SSH;
6. Docker + Docker Compose plugin;
7. timezone America/Sao_Paulo;
8. swap 4GB se RAM <= 4GB;
9. logrotate para containers;
10. backup script automático.
```

### Caddy

```text
api.dominio.com.br        → backend:3000
app.dominio.com.br        → web:3001
admin.dominio.com.br      → admin-web:3002 (matcher remote_ip)
www.dominio.com.br        → site:3003
status.dominio.com.br     → uptime-kuma:3001
errors.dominio.com.br     → glitchtip:8000
analytics.dominio.com.br  → umami:3000
storage.dominio.com.br    → minio:9000
```

HTTPS automático via Let's Encrypt.

### .env (não versionado)

```text
NODE_ENV (production)
POSTGRES_URL
REDIS_URL
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
ARGON2_SECRET
ENCRYPTION_KEY
ASAAS_API_KEY
ASAAS_WEBHOOK_SECRET
PLUGNOTAS_API_KEY
RESEND_API_KEY
GLITCHTIP_DSN_BACKEND
GLITCHTIP_DSN_WEB
GLITCHTIP_DSN_MOBILE
EXPO_ACCESS_TOKEN
NEXT_PUBLIC_API_URL (ex.: https://api.dominio.com.br)
NEXT_PUBLIC_UMAMI_ID
```

Backup do `.env` em vault seguro fora da VPS.

### Deploy

```text
Backend:
  GitHub Actions push main → CI → build imagem → SSH VPS → docker pull + compose up

Web e site:
  mesma estratégia, containers separados

Mobile:
  EAS Build → APK/IPA
  Android: internal track Google Play
  iOS: TestFlight (Fase 7)

Migrations Prisma rodam no entrypoint do container backend.
```

OTA mobile via EAS Update (sem republicar).

---

## 28. Backup e disaster recovery

### Estratégia

```text
Postgres:   pg_dump diário → tar.gz → volume externo
            últimos 30 dias + 12 mensais
MinIO:      rsync diário → volume externo
            últimos 7 dias
Configs:    backup semanal de /opt/saas
.env:       em vault seguro fora da VPS
```

### Cron

```text
0 2 * * *  /opt/saas/scripts/backup-postgres.sh
0 3 * * *  /opt/saas/scripts/backup-minio.sh
0 4 * * 0  /opt/saas/scripts/backup-configs.sh
```

### Backup externo

```text
opção 1: outra VPS via rsync over SSH
opção 2: rclone para Backblaze B2 free 10GB
opção 3: disco externo conectado à VPS
```

### Teste de restore mensal

Em staging:

```text
1. derrubar staging;
2. restaurar backup do dia anterior;
3. verificar conexão app, dados, upload, login;
4. registrar em /docs/runbooks/restore-test.md.
```

Backup nunca testado = não tem backup.

### RPO/RTO MVP

```text
RPO:  24h (backup diário)
RTO:  4h (provisionar nova VPS + restore)
```

---

## 29. Custos reais

### Mensais recorrentes

```text
VPS:                 R$0 (já tem)
Domínio:             R$0 já tem ou ~R$3/mês
Claude Code:         R$0 (já paga)
ChatGPT:             R$0 (já paga)
Resend free:         R$0 (3000 emails/mês)
Expo free:           R$0 (push + 30 builds/mês)
GitHub Actions:      R$0 (2000 min/mês)
GlitchTip:           R$0 (self-hosted)
Uptime Kuma:         R$0 (self-hosted)
Umami:               R$0 (self-hosted)
─────────────────────
Total recorrente:    R$0/mês até ~50 tenants
```

### Eventuais

```text
Apple Developer:     R$500/ano (Fase 7)
Google Play:         R$130 único (Fase 5/7)
Domínio renovação:   R$40-100/ano
```

### Por uso

```text
Asaas:               ~3% cartão / 1% Pix por transação
PlugNotas:           R$0,29-0,59 por nota emitida
```

### Margem por plano (referência)

```text
Grátis:              R$0
  custo: ~R$0 (uso muito limitado)
  margem: -R$X (custo de operação dividido pela base ativa)

SOLO R$79,90/ano (R$6,66/mês equiv):
  custo Asaas (~3% × R$79,90/12): R$0,20/mês
  margem: ~R$6,46/mês

MAIS R$199,90/ano (R$16,66/mês equiv):
  custo NF (30 incluídas × R$0,40 = R$12 quando fiscal ativo)
  custo Asaas: ~R$0,50/mês
  margem antes do fiscal: ~R$16,16/mês
  margem com fiscal usado totalmente: ~R$4/mês
  realisticamente: maioria não usa 30 NFs, margem média ~R$10-13/mês

EQUIPE R$389,90/ano (R$32,49/mês equiv):
  custo NF (100 × R$0,40 = R$40 se usar tudo)
  custo Asaas: ~R$1/mês
  margem antes fiscal: ~R$31,49/mês
  margem com fiscal pleno: -R$9,50/mês ← negativa se todos usarem 100 NFs

Mitigação:
  monitorar uso real;
  ajustar franquia para baixo se uso médio > 60%;
  excedente cobrado mantém receita marginal.
```

### Cenários

| | 10 tenants | 100 tenants | 1000 tenants |
|---|---:|---:|---:|
| MRR aproximado | R$200 (mix) | R$2.000 | R$20.000 |
| Custo VPS extra | R$0 | R$0 (16GB upgrade) | R$300 (split) |
| Custo NF | R$0 (Fase 6+) | R$200 | R$2.000 |
| Custo Asaas | R$6 | R$60 | R$600 |
| Total custo | ~R$10 | ~R$280 | ~R$3.000 |
| Margem bruta | 95% | 86% | 85% |

Self-hosted mantém margem alta. Custo só cresce com NF e gateway.

### Escalonamento futuro

```text
50-150 tenants:    upgrade VPS para 16GB RAM
150-500 tenants:   separar VPS de banco
500+ tenants:      considerar managed Postgres
```

Otimizar pra escala depois de receita validada.

---

## 30. Roadmap em fases (mobile + web)

### Visão geral

```text
Fase 0 — Validação e fundação                    2 semanas
Fase 1 — Vertical slice (mobile + web)           2-3 semanas
Fase 2 — MVP funcional (mobile + web paralelo)   12-14 semanas
Fase 3 — Monetização                             4-6 semanas
Fase 4 — Recursos Orcivo Mais/Equipe                        6-8 semanas
Fase 5 — Estoque e código de barras              4-6 semanas
Fase 6 — Fiscal                                  4-6 semanas
Fase 7 — iOS, escala, IA                         contínuo

MVP monetizável solo + IA: 22-28 semanas (~5-7 meses)
```

Ajuste vs V2 anterior: +3-5 semanas pelo desenvolvimento web em paralelo. Vale o investimento — web é diferencial competitivo direto vs Agenda Boa.

### Fase 3 — Monetização (4-6 semanas)

```text
Site externo (Next.js, apps/site/) com landing + pricing + checkout Asaas
Webhooks Asaas idempotentes (WebhookEvent)
Bloqueio escalonado por carência
SubscriptionStatusGuard por endpoint
Limites de plano enforced (Grátis/Orcivo Solo/Orcivo Mais/Orcivo Equipe)
Fluxo de upgrade/downgrade
SubscriptionAddon ativo
Convites de membros + permissões granulares
Programa de indicação (referral)
Exportação LGPD acionável (mobile e web)
Política de privacidade + DPA + ToS publicados
```

### Fase 4 — Recursos Orcivo Mais/Equipe (6-8 semanas)

```text
Contratos (Orcivo Equipe):
  ContractTemplate, ContractDocument
  geração a partir de orçamento
  assinatura digital
Relatórios Orcivo Mais:
  relatório do pedido/OS em PDF
  resumo financeiro
Gráficos financeiros (Orcivo Equipe):
  receitas vs despesas
  evolução mensal
  top clientes
Busca avançada:
  busca por nome, documento, telefone, email
  filtros combinados
DocumentTemplate customizável (Orcivo Equipe):
  editor simples no web
FeatureFlag + BetaAccess:
  ativar features novas para clientes Orcivo Equipe primeiro
Web admin profissional (apps/admin/):
  Next.js com identidade própria
  reaproveita backend
```

### Fase 5 — Estoque e código de barras (4-6 semanas)

```text
ProductPhoto (Orcivo Equipe)
StockItem + StockMovement
Alerta de estoque baixo
Barcode + leitor mobile
Vincular OS a saídas de estoque
Dashboard de estoque (web)
```

### Fase 6 — Fiscal (4-6 semanas)

**Antes:** consultoria 2-4h com contador.

```text
Integração PlugNotas (NFS-e)
Upload certificado A1 criptografado
Fluxo: OS → emitir → fila → polling → callback
Retry exponencial
Storage XML + PDF MinIO
Cancelamento via API
NF extra cobrada via Asaas
Telemetria de falhas por município
```

### Fase 7 — Escala e contínuo (mês 12+)

```text
Beta privado iOS (TestFlight)
Publicação App Store
IA orçamento automático (descrição/foto → estrutura)
Catálogo compartilhado por categoria
Garantia do serviço
Agenda + Google Calendar
CRM básico
Rastreamento GPS opcional
NF-e e NFC-e se houver demanda
White-label parcial (não da marca, mas do design)
Marketplace (long shot, só com PMF claro)
```

---

## 31. GSD breakdown — Fase 0

**Duração:** 2 semanas
**Goal:** validar a dor com técnicos reais E ter infra básica + repos prontos para receber código de domínio.

### Deliverable 0.1 — Validação com técnicos reais (5 dias)

**Critério de pronto:** 3+ técnicos disseram que pagariam R$199,90/ano (MAIS) depois de ver o fluxo.

**Tasks:**

```text
[ ] Listar 10 técnicos conhecidos
[ ] Criar protótipo Figma do fluxo orçamento → aprovação → OS → recebimento
    Telas-chave: home, lista clientes, novo cliente, novo orçamento, detalhe orçamento, PDF preview, lista OS, executar OS, recebimento
[ ] Roteiro de entrevista (15 perguntas, 30min):
    - Como faz orçamento hoje?
    - Quantos por semana?
    - Tempo gasto?
    - Já perdeu cliente por demora?
    - Cliente reclama do PDF?
    - Maior incômodo na gestão?
    - Usa PC ou só celular?
    - [mostrar protótipo]
    - Resolveria sua dor?
    - O que falta?
    - Pagaria R$199,90/ano = R$16,66/mês MAIS?
    - Compraria anual ou prefere mensal?
[ ] Marcar 5 entrevistas
[ ] Conduzir, gravar áudio com permissão
[ ] Síntese: tabela quem pagaria, quem não, motivos
[ ] Se < 3 sim: PAUSA, ajusta proposta
```

### Deliverable 0.2 — VPS segura e provisionada (2 dias)

**Critério de pronto:** VPS pronta, SSH só por chave, firewall ativo, Docker instalado.

**Tasks:**

```text
[ ] apt update && upgrade
[ ] usuário não-root com sudo
[ ] copiar chave SSH para authorized_keys
[ ] testar login com chave
[ ] /etc/ssh/sshd_config:
    PermitRootLogin no
    PasswordAuthentication no
    PubkeyAuthentication yes
[ ] systemctl restart ssh; testar
[ ] UFW: allow 22/80/443; enable
[ ] fail2ban + jail SSH
[ ] Docker + Docker Compose plugin
[ ] timedatectl set-timezone America/Sao_Paulo
[ ] swap 4GB se RAM ≤ 4GB
[ ] documentar em /docs/runbooks/vps-setup.md
```

### Deliverable 0.3 — Stack core deployada (3 dias)

**Critério de pronto:** Postgres, Redis, MinIO, Caddy rodando em Docker, acessíveis via HTTPS.

**Tasks:**

```text
[ ] DNS: A record para api, app, admin, www, status, errors, analytics, storage
[ ] /opt/saas e clone repo
[ ] docker-compose.yml com:
    - postgres:16
    - redis:7
    - minio
    - caddy
[ ] Volumes em /mnt/data
[ ] Caddyfile com reverse proxy + HTTPS automático
[ ] docker compose up -d
[ ] Verificar:
    - psql conecta
    - redis-cli ping
    - mc admin info no minio
    - HTTPS válido nos subdomínios
[ ] Credenciais em vault
```

### Deliverable 0.4 — Repo monorepo e CI (3 dias)

**Critério de pronto:** push em main dispara lint + test + build de backend, mobile e web no GitHub Actions.

**Tasks:**

```text
[ ] Repo GitHub privado: tech-service-saas
[ ] Estrutura monorepo:
    apps/backend, apps/mobile, apps/web, apps/site, apps/admin (placeholders)
    packages/shared-types, packages/ui (placeholders)
    prisma/, docs/, infra/, .claude/
[ ] pnpm workspaces + Turborepo
[ ] tsconfig.base.json
[ ] .gitignore robusto
[ ] .nvmrc Node 20
[ ] ESLint + Prettier + commitlint
[ ] Husky pre-commit (lint-staged)
[ ] GitHub Actions:
    .github/workflows/backend.yml
    .github/workflows/mobile.yml
    .github/workflows/web.yml
[ ] README.md com setup local
[ ] /docs/ com PRODUCT.md, ARCHITECTURE.md (esqueletos)
[ ] /docs/decisions/ com ADRs 001-011
```

### Deliverable 0.5 — Hello world mobile + web + backend (2 dias)

**Critério de pronto:** API responde GET /health; mobile abre uma tela mostrando "ok"; web app.dominio.com.br também.

**Tasks:**

```text
[ ] apps/backend:
    nest new (manual)
    Prisma schema mínimo
    GET /health
    Dockerfile multi-stage
    docker compose service backend
[ ] Deploy backend via SSH + docker pull
[ ] Testar https://api.dominio.com.br/health
[ ] apps/mobile:
    expo create
    TS + Expo SDK 51+
    tela inicial fetch /health
    EAS configurado
    EAS Build internal distribution
[ ] Testar APK no celular
[ ] apps/web:
    next create
    TS + Tailwind + shadcn/ui setup
    página inicial fetch /health
    Dockerfile
    docker compose service web
[ ] Deploy web via SSH + docker pull
[ ] Testar https://app.dominio.com.br
[ ] Documentar deploy em /docs/runbooks/deploy.md
```

---

## 32. GSD breakdown — Fase 1

**Duração:** 2-3 semanas
**Goal:** provar arquitetura. Vertical slice de cadastrar cliente, do banco até a UI (mobile e web), com tudo que toda feature futura vai precisar.

**Princípio:** *Se este slice fica limpo, todas as outras features seguem o molde.*

### Deliverable 1.1 — Auth funcional (4 dias)

**Critério de pronto:** signup, verify email, login com 2FA opcional, refresh rotativo, reset password — funciona em mobile e web.

**Tasks:**

```text
[ ] Prisma schema: User, RefreshToken, PasswordResetToken
[ ] Migration aplicada
[ ] Módulo auth/
[ ] Endpoints completos (ver §8)
[ ] argon2 hash
[ ] otplib TOTP
[ ] Resend integrado
[ ] AuthGuard valida JWT
[ ] Rate limiting Redis
[ ] Testes unitários services
[ ] Testes E2E fluxos
[ ] Mobile: telas signup, verify, login, esqueci, 2FA
[ ] Mobile: secure storage refresh token (expo-secure-store)
[ ] Web: telas signup, verify, login, esqueci, 2FA
[ ] Web: HTTP-only cookie para refresh token (mais seguro que localStorage)
[ ] Telemetria: signup_*, login_*
```

### Deliverable 1.2 — Tenant context e isolamento (3 dias)

**Critério de pronto:** Company, CompanyMember criados; TenantGuard funciona; cache invalidation funciona.

**Tasks:**

```text
[ ] Prisma: Company, CompanyMember, Invite, CompanyProfile
[ ] Migrations
[ ] Módulo companies/, members/
[ ] Endpoints:
    POST /companies
    GET /me/companies
    POST /me/select-company/:id
    POST /companies/:id/invites
    POST /invites/:token/accept
    PATCH /companies/:id (logo, brand_color)
[ ] TenantContextMiddleware
[ ] TenantGuard
[ ] Revalidação SQL + cache Redis 60s
[ ] TenantScopedRepository base class
[ ] Cache invalidation
[ ] Audit log para member events
[ ] Mobile: criar empresa pós-signup
[ ] Mobile: seletor de empresa no header
[ ] Web: mesmas telas, design consistente
```

### Deliverable 1.3 — Vertical slice de Customer (mobile + web) (5 dias)

**Critério de pronto:** criar/listar/editar/deletar cliente em mobile E web, com tenant isolation testado.

**Tasks:**

```text
[ ] Prisma: Customer, CustomerContact, CustomerAddress, AuditLog
[ ] Módulo customers/
[ ] Repository herda TenantScopedRepository
[ ] Endpoints:
    POST /customers
    GET /customers (paginado, filtros)
    GET /customers/:id
    PATCH /customers/:id
    DELETE /customers/:id (soft delete)
[ ] DTOs com class-validator
[ ] Schemas Zod em shared-types
[ ] @Audit() decorator
[ ] @Idempotent() (RequestIdempotency)
[ ] Teste E2E ESSENCIAL multi-tenant (ver §40)
[ ] Mobile:
    tela "Clientes" (lista paginada)
    tela "Novo cliente"
    tela "Detalhe cliente"
    cache local WatermelonDB
    fila de escrita com client_request_id
[ ] Web:
    tela "Clientes" (table com paginação)
    drawer/modal "Novo cliente"
    tela "Detalhe cliente"
    React Query com cache
[ ] Telemetria: first_customer_created
```

### Deliverable 1.4 — Documentação do molde (1 dia)

**Critério de pronto:** outro dev (ou outro Claude) consegue replicar o padrão lendo o doc.

**Tasks:**

```text
[ ] /docs/specs/template-vertical-slice.md
[ ] /docs/decisions/ADR-009-vertical-slice-pattern.md
[ ] Atualizar ARCHITECTURE.md com diagrama
[ ] Atualizar DEFINITION_OF_DONE.md
[ ] Skills locais .claude/skills/vertical-slice-check/
[ ] Tag git: v0.1.0-vertical-slice
```

---

## 33. GSD breakdown — Fase 2

**Duração:** 12-14 semanas
**Goal:** MVP funcional mobile + web. Técnico consegue: cadastrar cliente, fazer orçamento, gerar PDF, compartilhar via WhatsApp, receber aprovação, executar OS, registrar pagamento, gerenciar agenda.

### Deliverables (visão de alto nível)

```text
D2.1 — Catálogo (mobile + web)                  1 semana
D2.2 — Orçamento estruturado                    2 semanas
D2.3 — Geração de PDF                           1 semana
D2.4 — Aprovação por link público + assinatura  1 semana
D2.5 — Ordem de Serviço                         2 semanas
D2.6 — Agenda + lembretes                       1 semana
D2.7 — Recebimentos manuais                     0.5 semana
D2.8 — Notificações push                        0.5 semana
D2.9 — Web operacional completa                 paralelo às anteriores
D2.10 — Admin master mínimo                     0.5 semana
D2.11 — Lock pessimista                         0.5 semana
D2.12 — Hardening final                         1 semana
```

Cada deliverable tem versão mobile E web (exceto onde claramente faz sentido só uma plataforma — captura de assinatura é mobile, calendário visual é melhor na web).

### Estratégia de paralelismo

```text
Para cada deliverable:
1. Backend: schema + repository + service + controller + testes
2. Mobile: tela + integração API + cache local
3. Web: página + integração API + componentes shadcn/ui

Feature está PRONTA quando funciona em mobile E web.
NÃO mergear backend sem mobile E web prontos.
```

Detalhamento de cada deliverable surge na execução real, não vale especificar a fundo agora — vai mudar com aprendizado.

### Princípios da Fase 2

```text
Cada feature segue o molde da Fase 1.
Mobile e web compartilham shared-types.
Web NÃO duplica backend — consome API.
Lock pessimista funciona igual nas duas plataformas.
PDF gerado no backend, baixado por ambos.
Loading/error/empty states em toda tela.
i18n pt-BR via t().
GlitchTip em mobile, web e backend.
Umami trackando eventos-chave.
Toda feature tem teste E2E de tenant isolation.
```

---

## 34. O que NÃO fazer no MVP

```text
NÃO criar marketplace.
NÃO criar app para cliente final.
NÃO virar ERP completo.
NÃO criar gateway de pagamento pro cliente final.
NÃO criar integração fiscal direta com SEFAZ.
NÃO fazer offline-first completo com CRDT.
NÃO começar com microsserviços.
NÃO adiar multiempresa.
NÃO vender NF sem limite em planos baratos.
NÃO permitir mais de 1 CNPJ por assinatura.
NÃO publicar iOS antes do Android maduro.
NÃO investir em design system complexo antes da Fase 5.
NÃO usar Firebase/Firestore como banco principal.
NÃO esconder limites de plano no app.
NÃO importar Prisma Client no mobile ou web.
NÃO confiar em JWT como autorização.
NÃO usar number/float para dinheiro.
NÃO processar webhook sem idempotência.
NÃO trafegar dinheiro como number no JSON.
NÃO prometer hard delete absoluto LGPD.
NÃO publicar nas lojas antes de testar com 3+ técnicos reais.
NÃO ignorar consultoria contábil antes da Fase 6.
NÃO criar abstração arquitetural antes do segundo caso de uso.
NÃO duplicar regra de negócio entre mobile e web — backend é fonte única.
NÃO criar painel admin profissional antes da Fase 4.
NÃO implementar contratos antes do MVP estar validado.
NÃO implementar estoque antes do MVP estar validado.
NÃO prometer suporte em 6 minutos como Agenda Boa — começa com SLA conservador.
```

---

## 35. Estrutura de repositório

Monorepo com Turborepo + pnpm workspaces.

```text
tech-service-saas/
  apps/
    backend/                     NestJS API
      src/
        modules/                 (ver §4)
        shared/
        main.ts
      test/
      Dockerfile
      package.json
    mobile/                      React Native + Expo
      src/
        features/
          auth/
          companies/
          customers/
          catalog/
          quotes/
          work-orders/
          appointments/
          finance/
          settings/
        shared/
        core/
      app.json
      eas.json
      package.json
    web/                         Next.js (app principal)
      app/
        (auth)/                  rotas de auth
        (app)/                   rotas autenticadas
          dashboard/
          customers/
          catalog/
          quotes/
          work-orders/
          appointments/
          finance/
          settings/
      components/
      lib/
      Dockerfile
      package.json
    site/                        Next.js (landing + checkout) — Fase 3
      app/
      components/
      Dockerfile
      package.json
    admin/                       Next.js (admin master) — Fase 4
      app/
      components/
      Dockerfile
      package.json
  packages/
    shared-types/
      src/
        dtos/                    interfaces TS puras
        schemas/                 Zod schemas
        enums/                   enums compartilhados
      package.json               SEM @prisma/client
    ui/                          componentes RN + Web reutilizáveis (Fase 4+)
      src/
        mobile/
        web/
      package.json
  prisma/
    schema.prisma
    migrations/
    seed.ts
  docs/
    PRODUCT.md
    DOMAIN.md
    ARCHITECTURE.md
    DATABASE.md
    API_CONTRACT.md
    SECURITY.md
    PERMISSIONS.md
    FISCAL.md
    SUBSCRIPTIONS.md
    ROADMAP.md
    TEST_PLAN.md
    DEFINITION_OF_DONE.md
    DESIGN_SYSTEM.md             (referência para UI)
    decisions/
      ADR-001 a ADR-011
    specs/
      template-feature.md
      template-vertical-slice.md
    runbooks/
      vps-setup.md
      deploy.md
      restore-test.md
      incident-response.md
  infra/
    docker/
      docker-compose.yml
      docker-compose.dev.yml
      caddy/Caddyfile
    scripts/
      backup-postgres.sh
      backup-minio.sh
      restore-postgres.sh
      provision-vps.sh
  .claude/
    skills/
      multi-tenant-check/
      money-decimal-check/
      webhook-idempotency-check/
      vertical-slice-check/
    PROMPT_BASE.md
  .github/
    workflows/
      backend.yml
      mobile.yml
      web.yml
      e2e.yml
  README.md
  pnpm-workspace.yaml
  turbo.json
```

### shared-types — regra crítica

```text
shared-types NÃO importa @prisma/client.
shared-types NÃO depende de @nestjs/*.
shared-types pode exportar:
  - DTOs (interfaces TypeScript puras)
  - Zod schemas
  - Enums
  - Tipos derivados (Pick, Omit, etc)
Backend converte Prisma models para DTOs antes de responder.
Mobile e Web importam shared-types e nunca Prisma.
```

ESLint regra `no-restricted-imports` no mobile/web bloqueando `@prisma/*`.

---

## 36. Validação Zod vs class-validator

### Decisão

Usar os dois, divisão clara:

```text
Zod (em packages/shared-types/schemas/):
  - schemas compartilhados (mobile + web + backend)
  - validação no app/web antes de enviar
  - validação de payloads do client no backend (parser na borda)
  - inferência de tipos via z.infer<typeof schema>

class-validator (em apps/backend/src/**/dto/):
  - validação de DTOs internos do NestJS
  - integração com @nestjs/swagger
  - usado em DTOs que só existem no backend (interno, jobs)
```

### Fluxo prático

```text
Mobile/Web cria Quote:
1. Client usa Zod schema de shared-types pra validar antes
2. Envia request
3. Backend tem ValidationPipe global com Zod (zod-validation-pipe ou custom)
4. Backend valida com mesmo schema
5. Se passa, dispara service
```

DTOs internos (jobs, scheduled tasks, internal calls) podem usar class-validator pra integrar com Pipes e Swagger.

### Convenção

```text
packages/shared-types/schemas/quote.schema.ts
  → export const QuoteCreateSchema = z.object({...})

apps/backend/src/modules/quotes/dto/create-quote.dto.ts
  → exporta tipo inferido OU classe DTO se for interno

apps/mobile/src/features/quotes/use-quotes.ts
  → importa QuoteCreateSchema, valida formulário antes de enviar

apps/web/components/quotes/QuoteForm.tsx
  → usa react-hook-form + zodResolver(QuoteCreateSchema)
```

Detalhe vira **ADR-011** no início do projeto.

---

## 37. Documentação em `/docs`

### Arquivos obrigatórios

```text
PRODUCT.md             visão, ICP, diferenciais, escopo
DOMAIN.md              glossário, entidades, regras, status
ARCHITECTURE.md        diagramas, camadas, princípios
DATABASE.md            schema, índices, migrations
API_CONTRACT.md        OpenAPI gerado + endpoints
SECURITY.md            princípios, threat model, controles
PERMISSIONS.md         roles, flags, matriz
FISCAL.md              estratégia hub, certificados
SUBSCRIPTIONS.md       planos Orcivo Livre/Solo/Mais/Equipe, add-ons, bloqueio
ROADMAP.md             fases, marcos
TEST_PLAN.md           tipos de teste, obrigatórios
DEFINITION_OF_DONE.md  checklist exato
DESIGN_SYSTEM.md       referência visual/UX (separado, ver arquivo dedicado)
```

### `/docs/runbooks/`

```text
vps-setup.md
deploy.md
restore-test.md
incident-response.md
rollback.md
oncall.md
```

### `/docs/decisions/` — ADRs iniciais

```text
ADR-001-stack-rn-nestjs-web.md
ADR-002-auth-proprio-nestjs.md
ADR-003-multi-tenant-company-id.md
ADR-004-redis-bullmq-self-hosted.md
ADR-005-pdf-react-pdf-first.md
ADR-006-money-string-decimal-api.md
ADR-007-bloqueio-escalonado.md
ADR-008-fiscal-via-hub.md
ADR-009-vertical-slice-pattern.md
ADR-010-request-idempotency.md
ADR-011-zod-class-validator-split.md
ADR-012-web-em-paralelo.md
ADR-013-planos-anuais-como-padrao.md
```

Formato:

```text
# ADR-XXX: Título curto
## Contexto
## Decisão
## Alternativas consideradas
## Consequências
```

---

## 38. Workflow com IA

### Ferramentas

```text
Claude Code:    arquitetura, refatoração, módulos completos
Cursor:         edições rápidas, navegação
ChatGPT:        segunda opinião, brainstorm
VSCode:         base diária
EAS CLI:        build/submit mobile
```

### Fluxo por feature

```text
1. Spec em /docs/specs/{feature}.md (você, não IA)
2. IA lê spec + ARCHITECTURE.md + DOMAIN.md + DESIGN_SYSTEM.md
3. IA retorna PLANO sem código
4. Você revisa, corrige desvios
5. IA gera migration/schema → revisa
6. IA gera DTOs/schemas Zod → revisa
7. IA gera repository → revisa (filtro tenant!)
8. IA gera service → revisa
9. IA gera controller → revisa (guards)
10. IA gera testes → revisa
11. IA gera mobile feature → revisa
12. IA gera web feature → revisa
13. Roda testes
14. Code review humano: tenant, money, idempotência, permissions
15. Commit pequeno
16. CI verde → merge
```

### Prompt base (no `.claude/PROMPT_BASE.md`)

```text
Implemente o módulo [NOME] seguindo:
- /docs/ARCHITECTURE.md
- /docs/DOMAIN.md
- /docs/DATABASE.md
- /docs/API_CONTRACT.md
- /docs/SECURITY.md
- /docs/PERMISSIONS.md
- /docs/DESIGN_SYSTEM.md
- /docs/specs/[nome].md

Regras obrigatórias:
- toda tabela de negócio TEM company_id;
- toda rota valida auth + permissão;
- autorização é no backend, não no client;
- nenhuma query tenant-scoped sem company_id;
- toda mutation sensível gera audit_log;
- dinheiro usa string decimal na API e Prisma.Decimal no backend;
- jamais usar number/float para dinheiro;
- webhooks são idempotentes via WebhookEvent;
- mutations do mobile aceitam X-Client-Request-Id;
- não importar Prisma no mobile ou web;
- escrever teste E2E de isolamento tenant;
- mobile e web seguem mesmo design system;
- não inventar biblioteca sem justificar;
- registrar ADR se alterar padrão global.
```

### Anti-padrões de IA

```text
inventar lib inexistente;
usar number para dinheiro;
esquecer company_id;
confiar em JWT como permissão;
misturar status de orçamento com OS;
ignorar idempotência de webhook;
ignorar idempotência de request mobile;
gerar PDF no client;
hardcodar plano no app/web;
importar Prisma no shared-types;
colocar regra de negócio no controller;
criar abstração prematura;
duplicar lógica entre mobile e web;
gerar teste que só valida mock;
omitir tenant isolation no teste E2E;
prometer hard delete absoluto LGPD;
ignorar DESIGN_SYSTEM.md ao gerar UI.
```

### Skills locais

```text
.claude/skills/
  multi-tenant-check/
  money-decimal-check/
  webhook-idempotency-check/
  vertical-slice-check/
  design-system-check/        valida tokens e componentes em UI gerada
```

---

## 39. Definition of Done

Uma feature só está **pronta** se:

```text
[ ] Spec em /docs/specs/{feature}.md aprovada
[ ] ADR criada se houver decisão arquitetural nova
[ ] Migration Prisma revisada e backward-compatible
[ ] DTOs/schemas Zod em shared-types
[ ] Repository tenant-scoped
[ ] Service com regra de negócio (não no controller)
[ ] Controller só roteia
[ ] Guards aplicados (Auth, Tenant, Permission, Subscription)
[ ] @Audit() em mutations sensíveis
[ ] @Idempotent() em mutations que mobile possa duplicar
[ ] Money fields como Prisma.Decimal verificados
[ ] Webhook handlers idempotentes
[ ] Testes unitários do service
[ ] Testes de integração com banco real
[ ] Teste E2E de tenant isolation passando
[ ] Mobile com loading/error/empty states
[ ] Mobile com cache local e write queue
[ ] Mobile envia X-Client-Request-Id em mutations
[ ] Web com loading/error/empty states
[ ] Web usa React Query com cache adequado
[ ] Mobile e web seguem DESIGN_SYSTEM.md
[ ] i18n pt-BR (strings via t())
[ ] Telemetria Umami nos eventos-chave
[ ] GlitchTip captura erros sem PII
[ ] Logs sensíveis redactados (Pino redact)
[ ] Documentação atualizada (DOMAIN.md, API_CONTRACT.md)
[ ] CI verde (lint + typecheck + test)
[ ] Smoke test em staging passou
[ ] Code review humano aprovado
```

Sem todos: não merge.

---

## 40. Testes obrigatórios

### Multi-tenant isolation (crítico)

```text
cria empresa A;
cria empresa B;
cria usuário A;
cria recurso B;
logar como A (mobile e web);
GET /resource/:id_b → 404
PATCH /resource/:id_b → 404
DELETE /resource/:id_b → 404
GET /resources (lista) → não vê recursos B
nunca retornar 200
nunca vazar dados no body
```

### Auth e membership

```text
usuário desativado não acessa;
access token antigo não funciona após cache expirar 60s;
cache Redis invalidado ao desativar membro;
cache invalidado ao mudar permissão/subscription;
permissão alterada reflete em ≤60s;
2FA obrigatório bloqueia login sem TOTP;
rate limit dispara após 5/min;
refresh token rotativo: usar 2x revoga tudo.
```

### Billing

```text
webhook duplicado não duplica pagamento;
webhook fora de ordem não ativa errado;
falha → PAST_DUE;
fim carência → BLOCKED;
pagamento confirmado reativa;
limite plano bloqueia criação;
visualização permanece liberada;
HMAC inválido rejeita.
```

### Fiscal (Fase 6)

```text
emissão cria PROCESSING;
sucesso salva XML/PDF;
falha salva error_message;
retry não duplica (provider_reference único);
limite NF respeitado;
sem permissão emitir → bloqueia;
falha hub não trava OS.
```

### Orçamento

```text
criação calcula total exato (Decimal);
desconto valor funciona;
desconto percentual funciona;
PDF gerado;
aprovação cria WorkOrder em transação atômica;
status permanece APPROVED;
work_order_id preenchido;
versão preservada após edição;
rejeitado não cria OS;
expirado bloqueia aprovação.
```

### Money

```text
0.1 + 0.2 sem erro de arredondamento;
payload usa string decimal;
backend converte para Prisma.Decimal;
backend RECALCULA total;
total dos itens bate com total do orçamento;
PDF exibe formatado;
NF emite valor exato.
```

### WebhookEvent

```text
evento recebido salvo SEMPRE;
evento duplicado ignorado;
evento FAILED reprocessável;
payload bruto armazenado;
processamento transacional;
HMAC válido aceito, inválido rejeitado.
```

### RequestIdempotency

```text
mesma mutation com mesmo X-Client-Request-Id retorna resposta anterior;
sem header processa normal;
header expirado (>7d) trata como nova;
limpeza diária remove expirados.
```

### Arquivos

```text
arquivo empresa B não baixável por A;
signed URL expira em ≤5min;
upload respeita limite plano;
download NF/certificado gera audit;
imagem comprimida antes upload;
arquivo deletado vai para soft delete.
```

### Mobile + Web paridade

```text
funcionalidade X funciona igual em mobile e web onde aplicável;
mesma validação Zod nas duas plataformas;
mesmos eventos Umami disparados;
mesma identidade visual (DESIGN_SYSTEM.md).
```

---

## 41. Riscos críticos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Escopo virar ERP completo | Alta | Lista §34 sempre visível |
| Web atrasar mobile | Alta | Web em paralelo, não sequencial; web reaproveita backend |
| Fiscal mal modelado | Alta | Hub + consultoria 2-4h antes Fase 6 |
| Vazamento multi-tenant | Catastrófica | TenantScopedRepository + teste E2E CI |
| Auth confiar só no JWT | Alta | Revalidação per-request com cache 60s |
| Webhook duplicado | Alta | WebhookEvent + idempotency_key UNIQUE |
| Money com number/float | Alta | Decimal/string + testes + skill |
| Vazamento certificado A1 | Catastrófica | AES-256 + senha nunca log + audit |
| NF estourar margem | Média | Franquia menor + excedente + monitoramento |
| BullMQ falhar Redis instável | Média | Redis tradicional self-hosted |
| Apple rejeitar app | Média | Android-first, comunicação neutra, iOS Fase 7 |
| Bloqueio agressivo gerar churn | Média | Bloqueio por ação, viewing/export liberados |
| IA gerar código ruim | Média | Specs + DoD + revisão + skills |
| Burnout solo | Alta | Slices pequenos, validação cedo, ciclos 2 semanas |
| Concorrência (Agenda Boa) | Média | Foco no nicho técnico instalador, preço menor, web junto |
| Preços não competitivos | Média | Anual antecipado + add-ons claros + UVP |
| NestJS pesar demais | Baixa | Plano B Fastify+Zod |
| VPS cair sem backup testado | Alta | Restore mensal documentado |
| Request mobile duplicar | Alta | RequestIdempotency + X-Client-Request-Id |
| Custos infra estourarem | Baixa | Self-hosted, monitoramento de uso |
| Suporte explodir | Média | Limites + onboarding + docs claras |
| Mobile e web divergirem | Média | shared-types obrigatório + DoD exige paridade |

---

## 42. Glossário

```text
Tenant:                 unidade de isolamento. Aqui = empresa.
MRR/ARR:                receita recorrente mensal/anual.
ARPU:                   receita média por usuário.
Churn:                  cancelamento.
ICP:                    perfil ideal de cliente.
PMF:                    product-market fit.
RBAC:                   controle de acesso baseado em papéis.
DPA:                    acordo de tratamento de dados.
DPO:                    encarregado de dados.
ADR:                    registro de decisão arquitetural.
DoD:                    definition of done.
GSD:                    "getting stuff done", quebra Goal→Deliverable→Task.
NFS-e:                  nota fiscal de serviço eletrônica.
NF-e:                   nota fiscal eletrônica de produto.
NFC-e:                  nota fiscal de consumidor eletrônica.
A1:                     certificado digital em arquivo.
A3:                     certificado digital em token físico.
Hub fiscal:             provedor que abstrai SEFAZ/prefeituras (PlugNotas, Focus).
Idempotência:           mesma operação repetida sem efeito duplicado.
Signed URL:             URL temporária assinada para arquivo.
OTA:                    over-the-air update.
TOTP:                   time-based one-time password (2FA).
HMAC:                   hash-based message authentication code.
RPO:                    recovery point objective (perda máxima).
RTO:                    recovery time objective (tempo de recuperação).
TenantScopedRepository: classe base que filtra company_id.
WebhookEvent:           entidade de idempotência/auditoria de webhook.
RequestIdempotency:     dedupe de mutations do mobile.
EditLock:               lock pessimista temporário.
Vertical slice:         feature do banco até a UI passando por todas camadas.
shared-types:           pacote de tipos compartilhados sem Prisma/NestJS.
shadcn/ui:              biblioteca de componentes web baseada em Radix.
EAS:                    Expo Application Services (build/submit/update).
```

---

## Conclusão

Arquitetura final travada:

```text
React Native + Expo (mobile)
Next.js + Tailwind + shadcn/ui (web, site, admin)
NestJS (auth próprio, multi-tenant, idempotente)
Prisma + PostgreSQL self-hosted
Redis tradicional + BullMQ
MinIO self-hosted
@react-pdf/renderer
Asaas
PlugNotas/Focus (Fase 6)
GlitchTip + Uptime Kuma + Umami
Caddy reverse proxy
Docker Compose na VPS
```

Custo recorrente: **R$0/mês** até ~50 tenants.

Posicionamento: **mais barato que Agenda Boa, mobile + web na mesma assinatura, foco no técnico instalador.**

Ordem correta:

```text
1. Validar com técnicos reais.
2. Provisionar VPS + Docker stack.
3. Repo monorepo + CI + hello world (mobile + web + backend).
4. Vertical slice (auth + tenant + customer em mobile e web).
5. MVP feature por feature seguindo o molde, mobile e web em paralelo.
6. Monetização (Asaas + bloqueio escalonado).
7. Recursos Orcivo Mais/Equipe (contratos, gráficos, busca).
8. Estoque e código de barras.
9. Fiscal (após consultoria contábil).
10. iOS, escala, IA, expansão nacional.
```

**A maior ameaça não é técnica. É escopo.**

Sucesso depende de começar pequeno, resolver muito bem o fluxo orçamento/OS em mobile + web, validar com 5-10 técnicos pagantes locais, e só depois avançar para fiscal completo, estoque e escala nacional.

Bom desenvolvimento.
