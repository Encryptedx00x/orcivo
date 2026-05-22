# Phase 2A: MVP Core — Research

**Researched:** 2026-05-22
**Domain:** Catálogo / Orçamento / PDF / Aprovação pública / Ordem de Serviço
**Confidence:** HIGH (stack travada, molde validado na Fase 1, bibliotecas verificadas no registry)

---

## Summary

A Fase 2A constrói o núcleo operacional do produto: técnico cadastra itens no catálogo, monta orçamento, gera PDF, compartilha via WhatsApp, recebe aprovação do cliente por link público (3 métodos) e executa a OS com fotos. O molde arquitetural da Fase 1 (CustomerModule) é o template a replicar para cada novo módulo de domínio — CatalogModule, QuoteModule, WorkOrderModule — sem desvios.

Todas as decisões de stack estão travadas no CONTEXT.md. As questões em aberto da discussão (presigned URL vs proxy, token JWT curto vs UUID opaco, Redis counter vs DB sequence, lib de canvas) foram pesquisadas e têm recomendação clara neste documento. O planner não precisa re-discutir essas escolhas — deve consumir as recomendações diretamente.

Reset de senha (via Resend + Redis TTL) e PlanLimitsService scaffold são entregáveis paralelos que seguem o mesmo padrão modular mas não dependem dos fluxos de Orçamento/OS.

**Recomendação primária:** Replicar exatamente o padrão CustomerModule para cada domínio. As únicas adições de infraestrutura são `@nestjs/bullmq` (expiração de orçamentos), `minio` SDK (upload de fotos/PDF), `@react-pdf/renderer` (geração de PDF no backend), e `resend` (e-mail de reset).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D2-01:** Fase 2 dividida em 2A (core) e 2B (operacional). Feature só está pronta quando funciona em mobile E web.
- **D2-02:** Reset de senha na Fase 2A. Endpoints: `POST /auth/forgot-password` + `POST /auth/reset-password`. Email via Resend. Token TTL 15min no Redis.
- **D2-03:** Catálogo com campos: id, company_id, name, description?, type (SERVICE|PRODUCT), unit_price (Decimal), unit?, is_active, created_at, updated_at.
- **D2-04:** Itens do catálogo são reutilizáveis em orçamentos. Sem estoque.
- **D2-05:** Quote com estados DRAFT | SENT | APPROVED | REJECTED | CANCELLED | EXPIRED.
- **D2-06:** Campos mínimos do Quote incluindo number (sequencial por empresa), discount_type, subtotal, total (todos Decimal).
- **D2-07:** QuoteItem com catalog_item_id opcional (pode ser item manual).
- **D2-08:** Transições de estado definidas e imutáveis após APPROVED.
- **D2-09:** PDF gerado no backend com @react-pdf/renderer. Armazenado no MinIO.
- **D2-10:** Compartilhamento via wa.me deep link — sem WhatsApp Business API.
- **D2-11:** PDF do Orcivo Livre tem marca d'água discreta. Orcivo Solo+ sem marca d'água.
- **D2-12:** QuoteApproval separada do Quote com campos ip_address, user_agent, approved_at.
- **D2-13:** Três métodos: APPROVE_BUTTON, TYPED_NAME, DRAWN_SIGNATURE.
- **D2-14:** Aprovação cria QuoteApproval + muda status + cria WorkOrder automaticamente + audit log.
- **D2-14b:** Rota pública de aprovação usa @Public() + token único no link.
- **D2-15b:** WorkOrder com campos definidos (ver CONTEXT.md D7).
- **D2-16:** WorkOrderPhoto com photo_stage: BEFORE | DURING | AFTER. Fotos opcionais.
- **D2-17:** Fotos uploadadas via endpoint do backend (validação de tipo/tamanho).
- **D2-18:** PlanLimitsService scaffold — todos retornam "permitido" exceto marca d'água para LIVRE.
- **D2-30:** Toda feature segue o molde da Fase 1 (CustomerModule como referência).
- **D2-31:** Money: Prisma.Decimal backend, string decimal JSON, Decimal.js mobile/web.
- **D2-32:** Toda tabela de negócio tem company_id. Sem exceção.
- **D2-33:** RequestIdempotency obrigatório para mutations mobile (X-Client-Request-Id).
- **D2-34:** Toda feature tem teste de tenant isolation em CI.
- **D2-35:** i18n pt-BR em toda UI.
- **D2-36:** Loading/error/empty states em toda tela.

### Claude's Discretion

- Estrutura interna dos módulos NestJS para cada domínio
- Schema Prisma exato (campos adicionais, índices, constraints)
- Estratégia de upload de fotos (presigned URL do MinIO vs proxy do backend)
- Estratégia de cache local no mobile (React Query / TanStack Query)
- Implementação exata do canvas de assinatura
- Formato do link público de aprovação (token JWT curto ou UUID opaco)
- Ordem de execução dos planos dentro de cada sub-fase
- Geração do número sequencial de Orçamento e OS por empresa

### Deferred Ideas (OUT OF SCOPE)

- WhatsApp Business API
- Gateway de pagamento para cliente final
- Fiscal / NFS-e
- Contratos, iOS, GlitchTip+Umami ativos, Push web completo
- Impersonation de tenant, 2FA/TOTP, Estoque
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D2.1 | Catálogo de serviços/produtos (mobile + web) | CatalogModule seguindo molde CustomerModule; schema verificado |
| D2.2 | Orçamento estruturado com máquina de estados (mobile + web) | QuoteModule; state machine via enum + service; BullMQ para expiração |
| D2.3 | Geração de PDF + compartilhamento WhatsApp | @react-pdf/renderer renderToBuffer + MinIO; wa.me deep link |
| D2.4 | Aprovação por link público (3 métodos) | @Public() + UUID opaco; QuoteApproval entity; react-native-signature-canvas |
| D2.5 | Ordem de Serviço com fotos (mobile + web) | WorkOrderModule + WorkOrderPhoto; upload proxy via backend; MinIO |
| AUTH | Reset de senha via Resend | Redis TTL 15min; Resend v4 SDK; token UUID opaco |
| PLAN | PlanLimitsService scaffold | Decorator @CheckPlanLimit; enum PlanFeature; always-permit exceto watermark |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Catálogo CRUD | API / Backend | — | Dados multi-tenant; sem lógica no cliente |
| Cálculo de totais do orçamento | API / Backend | Frontend (preview) | Fonte da verdade é o backend; frontend pode pre-calcular para UX |
| Geração de PDF | API / Backend | — | @react-pdf/renderer é Node-only; acesso a logo/dados da empresa no servidor |
| Armazenamento de PDF/fotos | MinIO / Storage | — | S3-compatible; backend é proxy de upload |
| Máquina de estados do orçamento | API / Backend | — | Transições com efeitos colaterais (criar OS, audit log) exigem servidor |
| Link público de aprovação | API / Backend | Frontend Server (Next.js) | Token validado no backend; página pública renderizada no Next.js |
| Canvas de assinatura | Browser / Client (mobile) | — | Entrada do usuário; PNG enviado ao backend via multipart |
| Upload de fotos da OS | API / Backend | — | Validação de tipo/tamanho; proxy para MinIO |
| PlanLimitsService | API / Backend | — | Lê plan_code da empresa; guard no controller |
| Número sequencial por empresa | API / Backend | — | Redis INCR com key por company_id garante unicidade |
| Reset de senha (e-mail) | API / Backend | — | Token no Redis; e-mail via Resend |
| Compartilhamento WhatsApp | Browser / Client | — | wa.me deep link gerado no frontend com URL do link público |

---

## Standard Stack

### Core (todos verificados no npm registry em 2026-05-22)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.5.1 | Geração de PDF no Node.js | Única lib React-based para PDF server-side; API renderToBuffer verificada [VERIFIED: npm registry] |
| minio | 8.0.7 | Cliente MinIO/S3 para upload de fotos e PDFs | SDK oficial MinIO; S3-compatible; já no infra docker-compose [VERIFIED: npm registry] |
| @nestjs/bullmq | 11.0.4 | Jobs BullMQ integrado ao NestJS | Wrapper oficial NestJS para BullMQ; peerDep: bullmq 3-5 [VERIFIED: npm registry] |
| bullmq | 6.12.3 | Queue Redis para expiração de orçamentos | Já implícito na stack Redis; delayed jobs verificados [VERIFIED: npm registry] |
| resend | 6.12.3 | E-mail transacional (reset de senha) | Free tier; SDK Node oficial [VERIFIED: npm registry] |
| decimal.js | 10.6.0 | Money handling no mobile/web | Nunca number/float — regra absoluta do projeto [VERIFIED: npm registry] |
| react-native-signature-canvas | 5.0.2 | Canvas de assinatura no mobile | WebView-based; peer dep react-native-webview >=13; compatível com Expo SDK 51 [VERIFIED: npm registry] |
| react-native-webview | 13.16.1 | Dependência do signature-canvas | Peer dep obrigatório; versão verificada [VERIFIED: npm registry] |
| expo-image-picker | 56.0.12 | Seleção de fotos da câmera/galeria (OS) | Biblioteca oficial Expo; SDK 51 compatível [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-file-system | 56.0.7 | Leitura de arquivo para upload multipart | Necessário para ler URI do image picker antes do upload |
| @shopify/react-native-skia | 2.6.2 | Canvas nativo alternativo | Apenas se react-native-signature-canvas tiver problemas de performance; mais pesado |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| minio SDK | @aws-sdk/client-s3 (3.1053.0) | aws-sdk funciona com MinIO via endpoint custom; minio SDK é mais simples para MinIO self-hosted |
| react-native-signature-canvas | @shopify/react-native-skia | Skia é nativo/performático mas requer mais código; WebView-based é suficiente para assinatura simples |
| UUID opaco (crypto.randomUUID) | JWT curto para approval token | JWT teria payload legível; UUID opaco armazenado no Redis é mais simples e não expõe dados |

**Installation (backend):**
```bash
pnpm --filter @orcivo/backend add @react-pdf/renderer minio @nestjs/bullmq bullmq resend
```

**Installation (mobile):**
```bash
pnpm --filter @orcivo/mobile add decimal.js react-native-signature-canvas react-native-webview expo-image-picker expo-file-system
```

**Installation (web):**
```bash
pnpm --filter @orcivo/web add decimal.js
```

**Installation (shared-types):**
```bash
pnpm --filter @orcivo/shared-types add decimal.js
```

---

## Architecture Patterns

### System Architecture Diagram

```
Mobile / Web
     │
     │  1. CRUD catálogo, orçamento, OS
     ▼
[NestJS API]
  ├── CatalogController (JwtAuthGuard + TenantGuard)
  ├── QuoteController   (JwtAuthGuard + TenantGuard)
  │     └── POST /quotes/:id/send → gera PDF → salva MinIO → retorna URL
  ├── QuoteController   (rota pública @Public())
  │     └── GET  /quotes/public/:token  → exibe orçamento
  │     └── POST /quotes/public/:token/approve → registra aprovação → cria OS
  ├── WorkOrderController (JwtAuthGuard + TenantGuard)
  │     └── POST /work-orders/:id/photos → valida → envia MinIO
  └── AuthController
        └── POST /auth/forgot-password → envia e-mail Resend
        └── POST /auth/reset-password  → valida token Redis → atualiza senha

[PrismaService] ──→ PostgreSQL 16
[RedisService]  ──→ Redis 7
                      ├── TenantGuard cache (tenant:{userId} TTL 60s)
                      ├── Approval token (quote:approval:{token} TTL 24h)
                      ├── Password reset token (pwd:reset:{token} TTL 15min)
                      └── Quote number counter (quote:seq:{company_id})

[BullMQ Worker]  ←── Redis queue
  └── quote-expiry job: marca DRAFT|SENT como EXPIRED quando valid_until expirou

[MinIO]
  ├── bucket: orcivo-pdfs/{company_id}/quotes/{quote_id}.pdf
  └── bucket: orcivo-photos/{company_id}/work-orders/{wo_id}/{stage}/{uuid}.jpg

[Resend] ←── AuthService.sendPasswordReset()
```

### Recommended Project Structure

```
apps/backend/src/
  catalog/
    catalog.module.ts
    catalog.controller.ts
    catalog.service.ts
    catalog.isolation.spec.ts
  quote/
    quote.module.ts
    quote.controller.ts
    quote.service.ts
    quote-pdf.service.ts        # geração do PDF isolada
    quote-expiry.processor.ts   # BullMQ worker
    quote.isolation.spec.ts
  work-order/
    work-order.module.ts
    work-order.controller.ts
    work-order.service.ts
    work-order-photo.service.ts
    work-order.isolation.spec.ts
  plan-limits/
    plan-limits.module.ts
    plan-limits.service.ts
    check-plan-limit.decorator.ts
    check-plan-limit.guard.ts
  storage/
    storage.module.ts           # MinIO client global
    storage.service.ts
  mail/
    mail.module.ts              # Resend client global
    mail.service.ts

packages/shared-types/src/
  catalog/
    catalog-item-create.dto.ts
    catalog-item-update.dto.ts
  quote/
    quote-create.dto.ts
    quote-item.dto.ts
    quote-status.enum.ts
    quote-approval.dto.ts
  work-order/
    work-order-create.dto.ts
    work-order-photo.dto.ts
  plan/
    plan-feature.enum.ts
  auth/
    forgot-password.dto.ts
    reset-password.dto.ts
```

### Pattern 1: Geração de PDF no NestJS (renderToBuffer)

**What:** Gerar PDF server-side e enviar buffer para MinIO
**When to use:** Sempre que Quote.status mudar para SENT

```typescript
// Source: Context7 /diegomura/react-pdf — verified
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// quote-pdf.service.ts
@Injectable()
export class QuotePdfService {
  async generate(quote: QuoteData, company: CompanyData): Promise<Buffer> {
    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {company.logo_url && (
            <Image style={styles.logo} src={company.logo_url} />
          )}
          {/* Marca d'água condicional — apenas LIVRE */}
          {company.plan_code === 'LIVRE' && (
            <Text style={styles.watermark}>Gerado pelo Orcivo Livre</Text>
          )}
          <Text style={styles.title}>Orçamento #{quote.number}</Text>
          {/* ... itens, totais, Pix, observações ... */}
        </Page>
      </Document>
    );
    return renderToBuffer(doc);
  }
}
```

```typescript
// Estilos com marca d'água posicionada absolutamente
const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    opacity: 0.15,
    fontSize: 40,
    top: '40%',
    left: '10%',
    transform: 'rotate(-45deg)',
    color: '#6D28D9',
  },
});
```

**Nota crítica:** `@react-pdf/renderer` usa JSX mas roda em Node puro — não precisa de browser. Requer que o arquivo use extensão `.tsx` e que o tsconfig do backend inclua `"jsx": "react"`. [VERIFIED: Context7 /diegomura/react-pdf]

### Pattern 2: Upload para MinIO via proxy do backend

**What:** Backend recebe multipart, valida, faz upload para MinIO, salva URL no banco
**When to use:** Upload de fotos da OS e armazenamento de PDFs gerados
**Decisão:** proxy do backend (não presigned URL direto do cliente)

**Rationale:** Presigned URL bypassa validação de tipo/tamanho e tenant isolation no backend. Com Expo mobile, CORS e assinatura de requests seriam complexos. Proxy é a abordagem correta para o MVP.

```typescript
// Source: minio SDK v8 — [ASSUMED padrão S3 SDK; API verificada no npm]
import { Client } from 'minio';

@Injectable()
export class StorageService {
  private client: Client;

  constructor(private config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow('MINIO_ENDPOINT'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
  }

  async uploadBuffer(bucket: string, objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    // URL pública (MinIO configurado com policy pública para leitura)
    return `${this.config.get('MINIO_PUBLIC_URL')}/${bucket}/${objectName}`;
  }
}
```

**Path convention:**
- PDFs: `orcivo-pdfs/{company_id}/quotes/{quote_id}.pdf`
- Fotos OS: `orcivo-photos/{company_id}/work-orders/{work_order_id}/{stage}/{uuid}.jpg`

### Pattern 3: Link público de aprovação (UUID opaco + Redis)

**What:** Token de aprovação sem JWT, armazenado no Redis com TTL
**When to use:** Geração do link de compartilhamento via WhatsApp

```typescript
// auth/guards/public.decorator.ts — já existe na Fase 1
// Aprovação pública usa @Public() — sem JwtAuthGuard

// quote.service.ts — geração do token
async sendQuote(quoteId: string, companyId: string): Promise<{ approvalUrl: string }> {
  const quote = await this.findOne(quoteId, companyId); // 404 cross-tenant
  if (quote.status !== 'DRAFT') throw new BadRequestException('Apenas rascunhos podem ser enviados');

  const token = crypto.randomUUID(); // UUID v4 opaco
  const ttl = 7 * 24 * 60 * 60; // 7 dias em segundos
  await this.redis.set(`quote:approval:${token}`, quoteId, 'EX', ttl);

  await this.prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'SENT', approval_token: token },
  });

  const approvalUrl = `${this.config.get('APP_WEB_URL')}/approve/${token}`;
  return { approvalUrl };
}
```

```typescript
// quote.controller.ts — rota pública
@Get('public/:token')
@Public()
async getPublicQuote(@Param('token') token: string) {
  return this.quoteService.getByApprovalToken(token);
}

@Post('public/:token/approve')
@Public()
async approve(@Param('token') token: string, @Body() body: ApproveQuoteDto, @Req() req: Request) {
  return this.quoteService.approve(token, body, req.ip, req.headers['user-agent']);
}
```

### Pattern 4: Máquina de estados via enum + service (sem biblioteca)

**What:** Validar transições de estado no service antes de persistir
**When to use:** Toda mutação de Quote.status

```typescript
// packages/shared-types/src/quote/quote-status.enum.ts
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED', 'EXPIRED'],
  SENT:      ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED:  [],  // terminal
  REJECTED:  [],  // terminal
  CANCELLED: [],  // terminal
  EXPIRED:   [],  // terminal
};

export function assertValidTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(`Transição inválida: ${from} → ${to}`);
  }
}
```

### Pattern 5: BullMQ para expiração de orçamentos

**What:** Job delayed quando valid_until é definido; cron diário como fallback
**When to use:** Sempre que Quote.valid_until é salvo

```typescript
// Source: Context7 /taskforcesh/bullmq — verified
// quote-expiry.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('quote-expiry')
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }

  async process(job: Job<{ quoteId: string }>) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: job.data.quoteId, status: { in: ['DRAFT', 'SENT'] } },
    });
    if (!quote) return; // já em estado terminal
    if (quote.valid_until && quote.valid_until > new Date()) return; // still valid

    await this.prisma.quote.update({
      where: { id: job.data.quoteId },
      data: { status: 'EXPIRED' },
    });
  }
}

// No service, ao salvar valid_until:
await this.quoteExpiryQueue.add(
  'expire',
  { quoteId: quote.id },
  { delay: quote.valid_until.getTime() - Date.now() },
);
```

### Pattern 6: Número sequencial por empresa (Redis INCR)

**What:** Número legível e sequencial por empresa (Quote #1, #2, ...)
**When to use:** Criação de Quote e WorkOrder
**Decisão:** Redis INCR — atômico, sem lock de banco, eventual persistence via Redis AOF

```typescript
// storage/redis.service.ts — adicionar método
async nextSequence(key: string): Promise<number> {
  return this.client.incr(key); // atômico
}

// quote.service.ts
const number = await this.redis.nextSequence(`quote:seq:${companyId}`);
await this.prisma.quote.create({ data: { ...dto, number, company_id: companyId } });
```

**Risco:** Se Redis for resetado sem persistência, contadores reiniciam. Mitigação: Redis AOF ativado (já configurado no docker-compose via `--appendonly yes`). [VERIFIED: infra/docker-compose.yml linha "appendonly yes"]

### Pattern 7: Canvas de assinatura mobile → PNG → MinIO

**What:** react-native-signature-canvas captura assinatura como dataURL base64, backend decodifica e salva no MinIO

```typescript
// Mobile — SignatureScreen.tsx
import SignatureCanvas from 'react-native-signature-canvas';

const ref = useRef<SignatureCanvas>(null);

const handleOK = async (signature: string) => {
  // signature = "data:image/png;base64,..."
  const formData = new FormData();
  formData.append('file', {
    uri: signature,
    type: 'image/png',
    name: 'signature.png',
  } as any);
  await api.post(`/quotes/public/${token}/signature`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

```typescript
// Backend — extrai base64 e faz upload
const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
const buffer = Buffer.from(base64Data, 'base64');
const url = await this.storage.uploadBuffer('orcivo-photos', `signatures/${uuid}.png`, buffer, 'image/png');
```

### Pattern 8: Reset de senha com Resend + Redis

```typescript
// auth.service.ts
async forgotPassword(email: string): Promise<void> {
  const user = await this.prisma.user.findUnique({ where: { email } });
  // Sempre retorna 200 — não revelar se e-mail existe
  if (!user) return;

  const token = crypto.randomUUID();
  await this.redis.set(`pwd:reset:${token}`, user.id, 'EX', 900); // 15 min

  await this.mail.send({
    from: 'noreply@orcivo.com.br',
    to: email,
    subject: 'Redefinir senha — Orcivo',
    html: `<a href="${APP_URL}/reset-password?token=${token}">Redefinir senha</a>`,
  });
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await this.redis.get(`pwd:reset:${token}`);
  if (!userId) throw new BadRequestException('Token inválido ou expirado');

  const hash = await argon2.hash(newPassword);
  await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
  await this.redis.del(`pwd:reset:${token}`); // invalidar após uso
}
```

### Pattern 9: PlanLimitsService scaffold

```typescript
// plan-limits/plan-limits.service.ts
export enum PlanFeature {
  PDF_WATERMARK = 'PDF_WATERMARK',
  PHOTOS_IN_OS = 'PHOTOS_IN_OS',
  MAX_CUSTOMERS = 'MAX_CUSTOMERS',
  MAX_QUOTES_PER_MONTH = 'MAX_QUOTES_PER_MONTH',
  MAX_WORK_ORDERS_PER_MONTH = 'MAX_WORK_ORDERS_PER_MONTH',
}

@Injectable()
export class PlanLimitsService {
  async check(companyId: string, feature: PlanFeature): Promise<{ allowed: boolean; limit?: number }> {
    // Fase 2: todos permitidos — Fase 3 plugará valores reais
    if (feature === PlanFeature.PDF_WATERMARK) {
      const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
      return { allowed: company.plan_code !== 'LIVRE' };
    }
    return { allowed: true };
  }
}
```

### Anti-Patterns to Avoid

- **Calcular totais no cliente sem revalidar no servidor:** frontend pode pre-calcular para UX, mas o backend sempre recalcula `subtotal` e `total` a partir dos itens antes de salvar.
- **Usar `number` ou `float` para valores monetários:** sempre `Prisma.Decimal` no schema, string decimal no JSON, `Decimal.js` no cliente. Nunca `parseFloat()` em valores de dinheiro.
- **Aprovar orçamento sem idempotência:** verificar `quote.status !== 'SENT'` antes de criar QuoteApproval; retornar 409 se já aprovado.
- **Expor `company_id` em URLs públicas:** link de aprovação usa apenas o token UUID opaco; o backend resolve o quote_id a partir do token no Redis.
- **Rodar `@react-pdf/renderer` no browser/mobile:** é Node-only; toda geração de PDF ocorre no backend.
- **Fazer query sem company_id em módulos de negócio:** mesmo para rotas públicas, validar o token e resolver o company_id antes de qualquer operação de escrita.
- **Usar `db push` em produção:** apenas `prisma migrate dev` em dev, `prisma migrate deploy` em CI/prod.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geração de PDF | Template HTML + puppeteer/wkhtmltopdf | @react-pdf/renderer | Stack travada; renderToBuffer é server-side puro; sem browser headless |
| Upload de arquivos | Streaming manual para MinIO | minio SDK v8 `putObject` | SDK cuida de multipart, retry, checksums |
| Jobs agendados | setInterval / setTimeout | BullMQ + @nestjs/bullmq | Persistência em Redis; restart-safe; retry automático |
| E-mail transacional | nodemailer + SMTP próprio | Resend SDK | Free tier; deliverability; sem configuração de servidor |
| Validação de schema | if/else manual | Zod schemas em shared-types | Já é o padrão do projeto; ZodValidationPipe reutilizável |
| Número sequencial | MAX(number)+1 em SQL | Redis INCR | Race condition em MAX()+1 sob concorrência; INCR é atômico |
| Canvas de assinatura | Canvas HTML5 customizado | react-native-signature-canvas | WebView-based; funciona em Expo sem eject; peer deps gerenciáveis |

**Key insight:** Toda a infraestrutura (MinIO, Redis, PostgreSQL, BullMQ) já está provisionada no docker-compose. O trabalho da Fase 2A é usar esses serviços via SDK, não reinventá-los.

---

## Common Pitfalls

### Pitfall 1: @react-pdf/renderer requer JSX no backend

**What goes wrong:** Backend TypeScript não tem `"jsx": "react"` no tsconfig, causando erro de compilação ao usar componentes JSX no PDF.
**Why it happens:** NestJS usa TypeScript sem JSX por padrão; @react-pdf/renderer usa JSX puro.
**How to avoid:** Criar `tsconfig.pdf.json` ou adicionar `"jsx": "react-jsx"` ao `tsconfig.json` do backend e importar `React` nos arquivos de template PDF. Arquivos de template devem ter extensão `.tsx`.
**Warning signs:** Erro `JSX element implicitly has type 'any'` ou `Cannot use JSX unless '--jsx' flag is provided`.

### Pitfall 2: Aprovação dupla de orçamento

**What goes wrong:** Dois requests simultâneos de aprovação (cliente clicou duas vezes) criam dois `QuoteApproval` e duas `WorkOrder`.
**Why it happens:** Verificar `status === 'SENT'` e depois atualizar não é atômico no Prisma.
**How to avoid:** Usar Prisma `$transaction` com `updateMany({ where: { id, status: 'SENT' }, data: { status: 'APPROVED' } })` e verificar `count === 1` antes de criar os efeitos colaterais. Se `count === 0`, retornar 409.
**Warning signs:** Múltiplos `WorkOrder` vinculados ao mesmo `quote_id`.

### Pitfall 3: Decimal.js esquecido no mobile/web

**What goes wrong:** `parseFloat(quote.total)` ou operações aritméticas JavaScript em valores de dinheiro causam imprecisão de ponto flutuante.
**Why it happens:** Regra do projeto é absoluta mas fácil de esquecer em frontend.
**How to avoid:** Criar helper `formatMoney(value: string): string` em shared-types que usa `new Decimal(value).toFixed(2)`. Usar em toda exibição de valores. Nunca `Number(price) * quantity`.
**Warning signs:** Valores como `R$ 10.999999999` na UI.

### Pitfall 4: MinIO sem bucket pré-criado

**What goes wrong:** `putObject` falha silenciosamente ou com erro 404 se o bucket não existir.
**Why it happens:** MinIO não cria bucket automaticamente.
**How to avoid:** `StorageService.onModuleInit()` deve verificar e criar buckets `orcivo-pdfs` e `orcivo-photos` via `client.bucketExists()` + `client.makeBucket()`. Definir policy pública de leitura via `client.setBucketPolicy()`.
**Warning signs:** Erro `NoSuchBucket` nos logs; fotos retornam 404.

### Pitfall 5: react-native-signature-canvas em Expo sem expo-build-properties

**What goes wrong:** `react-native-webview` em Expo Managed requer configuração nativa que o Expo Go não suporta completamente em versões antigas.
**Why it happens:** O projeto usa Expo SDK ~51; react-native-webview 13.x é compatível mas requer `expo-build-properties` para configuração nativa no EAS Build.
**How to avoid:** Para desenvolvimento local com Expo Go, a assinatura pode retornar PNG vazio — implementar fallback para TYPED_NAME quando `DRAWN_SIGNATURE` não estiver disponível. Para EAS Build, funciona nativamente.
**Warning signs:** `WebView` renderiza em branco no Expo Go; funciona em build APK.

### Pitfall 6: BullMQ job delay muito longo não garantido

**What goes wrong:** Job com delay de 30 dias (valid_until distante) pode ser perdido se Redis reiniciar sem AOF.
**Why it happens:** Jobs delayed ficam no sorted set do Redis; sem persistência, são perdidos.
**How to avoid:** Adicionar job cron diário `quote-expiry-sweep` que busca `WHERE status IN ('DRAFT','SENT') AND valid_until < NOW()` e marca como EXPIRED. Delay jobs são otimização, cron é o fallback garantido.
**Warning signs:** Orçamentos vencidos ainda aparecem como SENT após restart.

### Pitfall 7: Token de aprovação armazenado apenas no Redis

**What goes wrong:** Se Redis reiniciar, links já enviados via WhatsApp ficam inválidos.
**Why it happens:** Token só existe no Redis, não no banco.
**How to avoid:** Salvar `approval_token` na tabela `quotes` também. Redis é cache; banco é fonte da verdade. Ao validar token: verificar Redis primeiro (hit), depois verificar banco (miss).

---

## Code Examples

### Schema Prisma para os novos modelos

```prisma
// Adicionar após o model Customer existente

model CatalogItem {
  id          String      @id @default(uuid())
  company_id  String
  name        String
  description String?
  type        CatalogItemType
  unit_price  Decimal     @db.Decimal(12, 2)
  unit        String?
  is_active   Boolean     @default(true)
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt

  company    Company     @relation(fields: [company_id], references: [id], onDelete: Cascade)
  quote_items QuoteItem[]

  @@index([company_id])
  @@index([company_id, is_active])
  @@map("catalog_items")
}

enum CatalogItemType {
  SERVICE
  PRODUCT
}

model Quote {
  id                  String      @id @default(uuid())
  company_id          String
  customer_id         String
  number              Int
  status              QuoteStatus @default(DRAFT)
  title               String?
  notes               String?
  valid_until         DateTime?
  approval_token      String?     @unique
  discount_type       DiscountType @default(PERCENT)
  discount_value      Decimal     @db.Decimal(12, 2) @default(0)
  subtotal            Decimal     @db.Decimal(12, 2)
  total               Decimal     @db.Decimal(12, 2)
  pdf_url             String?
  created_by_user_id  String
  created_at          DateTime    @default(now())
  updated_at          DateTime    @updatedAt

  company    Company       @relation(fields: [company_id], references: [id], onDelete: Cascade)
  customer   Customer      @relation(fields: [customer_id], references: [id])
  items      QuoteItem[]
  approval   QuoteApproval?
  work_order WorkOrder?

  @@unique([company_id, number])
  @@index([company_id])
  @@index([company_id, status])
  @@index([approval_token])
  @@map("quotes")
}

enum QuoteStatus {
  DRAFT
  SENT
  APPROVED
  REJECTED
  CANCELLED
  EXPIRED
}

enum DiscountType {
  PERCENT
  FIXED
}

model QuoteItem {
  id              String   @id @default(uuid())
  quote_id        String
  catalog_item_id String?
  description     String
  quantity        Decimal  @db.Decimal(10, 3)
  unit_price      Decimal  @db.Decimal(12, 2)
  total           Decimal  @db.Decimal(12, 2)

  quote        Quote        @relation(fields: [quote_id], references: [id], onDelete: Cascade)
  catalog_item CatalogItem? @relation(fields: [catalog_item_id], references: [id])

  @@index([quote_id])
  @@map("quote_items")
}

model QuoteApproval {
  id                String         @id @default(uuid())
  quote_id          String         @unique
  approval_method   ApprovalMethod
  typed_name        String?
  signature_image_url String?
  ip_address        String
  user_agent        String
  approved_at       DateTime       @default(now())

  quote Quote @relation(fields: [quote_id], references: [id], onDelete: Cascade)

  @@map("quote_approvals")
}

enum ApprovalMethod {
  APPROVE_BUTTON
  TYPED_NAME
  DRAWN_SIGNATURE
}

model WorkOrder {
  id                  String          @id @default(uuid())
  company_id          String
  customer_id         String
  quote_id            String?         @unique
  number              Int
  title               String
  status              WorkOrderStatus @default(PENDING)
  scheduled_at        DateTime?
  started_at          DateTime?
  finished_at         DateTime?
  notes               String?
  assigned_to_user_id String?
  created_by_user_id  String
  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  company    Company          @relation(fields: [company_id], references: [id], onDelete: Cascade)
  customer   Customer         @relation(fields: [customer_id], references: [id])
  quote      Quote?           @relation(fields: [quote_id], references: [id])
  photos     WorkOrderPhoto[]

  @@unique([company_id, number])
  @@index([company_id])
  @@index([company_id, status])
  @@map("work_orders")
}

enum WorkOrderStatus {
  PENDING
  IN_PROGRESS
  DONE
  CANCELLED
}

model WorkOrderPhoto {
  id                  String     @id @default(uuid())
  company_id          String
  work_order_id       String
  uploaded_by_user_id String
  photo_stage         PhotoStage
  file_url            String
  caption             String?
  created_at          DateTime   @default(now())

  work_order WorkOrder @relation(fields: [work_order_id], references: [id], onDelete: Cascade)

  @@index([work_order_id])
  @@index([company_id])
  @@map("work_order_photos")
}

enum PhotoStage {
  BEFORE
  DURING
  AFTER
}
```

### DTO Zod — QuoteCreate

```typescript
// packages/shared-types/src/quote/quote-create.dto.ts
import { z } from 'zod';

export const QuoteItemSchema = z.object({
  catalog_item_id: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  quantity: z.string().regex(/^\d+(\.\d{1,3})?$/), // string decimal
  unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/), // string decimal
});

export const QuoteCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  valid_until: z.string().datetime().optional(),
  discount_type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  discount_value: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  items: z.array(QuoteItemSchema).min(1),
});

export type QuoteCreateDto = z.infer<typeof QuoteCreateSchema>;
export type QuoteItemDto = z.infer<typeof QuoteItemSchema>;
```

### wa.me deep link (web)

```typescript
// apps/web/lib/whatsapp.ts
export function buildWhatsAppLink(phone: string, approvalUrl: string, quoteName: string): string {
  const message = encodeURIComponent(
    `Olá! Segue o orçamento "${quoteName}" para sua aprovação:\n${approvalUrl}`
  );
  const normalized = phone.replace(/\D/g, '');
  return `https://wa.me/55${normalized}?text=${message}`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer/wkhtmltopdf para PDF | @react-pdf/renderer (Node puro) | 2020+ | Sem browser headless; deploy mais leve |
| Bull (v3) | BullMQ (v5+) | 2022 | API mais TypeScript-friendly; melhor suporte a delayed jobs |
| nodemailer + SMTP | Resend SDK | 2023+ | Zero-config; deliverability gerenciada |
| react-native-canvas | react-native-signature-canvas (WebView) | 2021+ | Mais estável em Expo; não requer eject |

**Deprecated/outdated:**
- `Bull` (não BullMQ): não usar — stack usa BullMQ 6.x
- `@react-pdf` v1-v2: API diferente; projeto usa v4.5.x
- `aws-sdk` v2: usar minio SDK ou @aws-sdk v3

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MinIO SDK v8 `putObject` API é compatível com MinIO self-hosted configurado no docker-compose | Standard Stack, Code Examples | Upload falha; precisaria ajustar endpoint/auth |
| A2 | react-native-signature-canvas funciona no Expo Go SDK 51 (além de EAS Build) | Pitfall 5 | Dev experience prejudicada; fallback para TYPED_NAME em dev |
| A3 | `@react-pdf/renderer` aceita `jsx: react-jsx` no tsconfig do backend sem conflito com decorators NestJS | Pitfall 1 | Erro de compilação; precisa de arquivo tsconfig separado para templates PDF |
| A4 | Redis AOF `appendonly yes` está ativo no docker-compose da VPS (não apenas local) | Pattern 6 | Contadores de sequence resetam em restart; workaround: leitura do MAX(number) do banco na inicialização |

---

## Open Questions

1. **Buckets MinIO — política de leitura pública**
   - O que sabemos: MinIO suporta políticas S3 via `setBucketPolicy()`
   - O que não está claro: se a VPS do Dyogo tem o MinIO exposto publicamente ou apenas na rede interna
   - Recomendação: Planner deve incluir tarefa Wave 0 para criar buckets e configurar policies; URL pública gerada deve usar `MINIO_PUBLIC_URL` do env

2. **tsconfig do backend para JSX**
   - O que sabemos: NestJS usa TypeScript sem JSX; @react-pdf/renderer precisa de JSX
   - O que não está claro: se adicionar `jsx: react-jsx` ao tsconfig principal quebra decorators NestJS
   - Recomendação: Criar `tsconfig.pdf.json` extendendo o principal, apenas para compilação dos templates PDF; manter `nx build` ou `nest build` separado

3. **Resend domínio verificado**
   - O que sabemos: Resend free tier requer domínio verificado para envio
   - O que não está claro: se `orcivo.com.br` está configurado no Resend
   - Recomendação: Task de configuração de DNS do Resend é Nível C (DNS/domínio) — planner deve marcar como bloqueante com nota para o usuário

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | MinIO, PostgreSQL, Redis | ✓ | 29.2.1 | — |
| Node.js | Backend, shared-types build | ✓ | 24.11.1 | — |
| pnpm | Workspace | ✓ | 9.15.0 | — |
| PostgreSQL 16 | Backend (via Docker) | ✓ (Docker) | 16-alpine | — |
| Redis 7 | BullMQ, cache (via Docker) | ✓ (Docker) | 7-alpine | — |
| MinIO | Storage PDF/fotos (via Docker) | ✓ (Docker) | latest | — |
| Resend (externo) | Reset de senha | ? | — | Console log em dev (`MAIL_DRIVER=console`) |

**Missing dependencies com fallback:**
- Resend: em desenvolvimento local, implementar `ConsoleMailService` que apenas faz `console.log` do link de reset — evita bloquear dev por falta de credenciais. Configuração real do Resend é Nível C (DNS).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29 + supertest 7 |
| Config file | `apps/backend/src/` (rootDir jest no package.json) |
| Quick run command | `pnpm --filter @orcivo/backend test --testPathPattern="catalog\|quote\|work-order"` |
| Full suite command | `pnpm --filter @orcivo/backend test:ci` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D2.1 | CatalogItem CRUD com tenant isolation | integration | `pnpm --filter @orcivo/backend test --testPathPattern=catalog.isolation` | ❌ Wave 0 |
| D2.2 | Quote state machine — transições inválidas rejeitadas | unit | `pnpm --filter @orcivo/backend test --testPathPattern=quote.service` | ❌ Wave 0 |
| D2.2 | Quote tenant isolation | integration | `pnpm --filter @orcivo/backend test --testPathPattern=quote.isolation` | ❌ Wave 0 |
| D2.3 | PDF gerado como Buffer válido | unit | `pnpm --filter @orcivo/backend test --testPathPattern=quote-pdf` | ❌ Wave 0 |
| D2.4 | Aprovação pública — idempotência (duplo clique rejeitado) | integration | `pnpm --filter @orcivo/backend test --testPathPattern=quote.approval` | ❌ Wave 0 |
| D2.5 | WorkOrder criada automaticamente após aprovação | integration | `pnpm --filter @orcivo/backend test --testPathPattern=work-order.isolation` | ❌ Wave 0 |
| AUTH | Reset de senha — token expirado rejeitado | unit | `pnpm --filter @orcivo/backend test --testPathPattern=auth.service` | ❌ Wave 0 |

### Sampling Rate

- **Por commit de task:** `pnpm --filter @orcivo/backend test --testPathPattern={módulo}` (< 30s)
- **Por merge de wave:** `pnpm --filter @orcivo/backend test:ci` (todos isolation specs)
- **Phase gate:** Suite completa verde antes de `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/catalog/catalog.isolation.spec.ts`
- [ ] `apps/backend/src/quote/quote.service.spec.ts` — testa state machine em memória
- [ ] `apps/backend/src/quote/quote.isolation.spec.ts`
- [ ] `apps/backend/src/work-order/work-order.isolation.spec.ts`
- [ ] `apps/backend/src/quote/quote-pdf.service.spec.ts` — mock de renderToBuffer

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT existente + reset via token Redis TTL 15min |
| V3 Session Management | yes | Reset token invalidado após uso único (redis DEL) |
| V4 Access Control | yes | TenantGuard em todos os controllers autenticados; @Public() apenas em rotas de aprovação |
| V5 Input Validation | yes | Zod schemas em shared-types; ZodValidationPipe no backend |
| V6 Cryptography | parcial | argon2 para senha (já existe); tokens são UUID v4 (criptograficamente seguros) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access | Information Disclosure | TenantGuard + findFirst({ where: { id, company_id } }) + 404 cross-tenant |
| Aprovação duplicada (double-submit) | Tampering | Prisma $transaction updateMany + count check; retornar 409 |
| Token de aprovação adivinhado | Spoofing | UUID v4 = 122 bits de entropia; TTL 7 dias; armazenado no banco também |
| Upload de arquivo malicioso | Tampering | Validar `Content-Type: image/*`; tamanho máximo (ex: 10MB) no multer/interceptor |
| Token de reset de senha reutilizado | Elevation of Privilege | `redis.del(token)` imediatamente após uso |
| Enumeração de e-mail (forgot-password) | Information Disclosure | Sempre retornar 200, mesmo se e-mail não existe |

---

## Project Constraints (from CLAUDE.md)

Diretivas obrigatórias que o planner deve verificar em cada tarefa:

| Diretiva | Impacto na Fase 2A |
|----------|--------------------|
| Money: Prisma.Decimal backend / string decimal JSON / Decimal.js mobile-web | Todo campo de preço nos schemas, DTOs e UI deve seguir este padrão |
| Multi-tenant: company_id em toda tabela de negócio | CatalogItem, Quote, QuoteItem, WorkOrder, WorkOrderPhoto — todos têm company_id |
| JWT só identifica; autorização via Redis 60s cache | TenantGuard já implementado; não criar atalhos |
| shared-types sem @prisma/client, @nestjs/*, react, react-native | Nenhum import proibido nos DTOs de catálogo/orçamento/OS |
| WebhookEvent obrigatório para provedores externos | Resend (e-mail) não é webhook — não se aplica agora; relevante na Fase 3 (Asaas) |
| RequestIdempotency obrigatório para mutations mobile | X-Client-Request-Id em POST/PATCH/DELETE no mobile |
| Ícones: Lucide only | Nenhum emoji ou ícone customizado nas telas |
| Nomenclatura de planos: Orcivo Livre/Solo/Mais/Equipe | Marca d'água do PDF usa "Orcivo Livre", não "FREE" |
| Commits: sem traces de IA | Commits técnicos e objetivos |
| Idioma UI: pt-BR | Todos os textos de interface em português |

---

## Sources

### Primary (HIGH confidence)

- Context7 `/diegomura/react-pdf` — `renderToBuffer`, Image component, StyleSheet, watermark positioning
- Context7 `/taskforcesh/bullmq` — delayed jobs, cron scheduling, Worker/Processor pattern
- npm registry (2026-05-22) — versões verificadas: @react-pdf/renderer@4.5.1, minio@8.0.7, @nestjs/bullmq@11.0.4, bullmq@6.12.3, resend@6.12.3, decimal.js@10.6.0, react-native-signature-canvas@5.0.2
- `infra/docker-compose.yml` — MinIO, Redis (appendonly yes), PostgreSQL confirmados
- `docs/ARCHITECTURE-MOLD.md` — molde canônico CustomerModule
- `apps/backend/src/auth/auth.service.ts` — padrão Redis, JWT, argon2 existente
- `prisma/schema.prisma` — schema existente (User, Company, Customer, RefreshToken)

### Secondary (MEDIUM confidence)

- npm peerDependencies de react-native-signature-canvas: requer react-native-webview >=13 (v13.16.1 verificado)
- npm peerDependencies de @nestjs/bullmq: compatível com bullmq 3-5 (usando v6 — verificar compatibilidade real)

### Tertiary (LOW confidence)

- Comportamento do react-native-signature-canvas no Expo Go SDK 51 (não testado nesta sessão) [ASSUMED — marcado como Pitfall 5]
- Compatibilidade de `jsx: react-jsx` com decorators NestJS no mesmo tsconfig [ASSUMED — marcado como Open Question 2]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — versões verificadas no registry em 2026-05-22
- Architecture: HIGH — molde Fase 1 validado; padrões Context7-verified
- Pitfalls: HIGH (técnicos) / MEDIUM (Expo Go behavior) — baseado em análise de peer deps e padrões conhecidos
- Schema Prisma: HIGH — extensão direta do schema existente com mesmos padrões

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (bibliotecas estáveis; Expo SDK 51 sem mudanças previstas)
