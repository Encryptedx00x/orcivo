---
phase: "2A"
plan: "02-P07"
title: "Backend — PDF service + Approval flow (QuoteApproval + WorkOrder automática)"
wave: 4
depends_on: ["02-P04", "02-P05", "02-P06"]
files_modified:
  - apps/backend/src/quote/quote-pdf.service.ts
  - apps/backend/src/quote/quote-pdf.service.spec.ts
  - apps/backend/src/quote/quote.service.ts
  - apps/backend/src/quote/quote.controller.ts
  - apps/backend/src/quote/quote.module.ts
  - apps/backend/tsconfig.json
autonomous: true
requirements: ["D2.3", "D2.4"]

must_haves:
  truths:
    - "POST /quotes/:id/send gera PDF, salva no MinIO e retorna pdf_url + approvalUrl"
    - "PDF contém: logo da empresa, número do orçamento, itens, subtotal, desconto, total, chave Pix, observações"
    - "PDF do plano LIVRE tem marca d'água discreta com texto 'Orcivo Livre'"
    - "POST /quotes/public/:token/approve cria QuoteApproval + muda status para APPROVED + cria WorkOrder automaticamente"
    - "Aprovação dupla retorna 409 (idempotência via $transaction com count check)"
    - "DRAWN_SIGNATURE: base64 PNG decodificado e salvo no MinIO como signature_image_url"
  artifacts:
    - path: "apps/backend/src/quote/quote-pdf.service.ts"
      provides: "generate(quote, company): Promise<Buffer> usando @react-pdf/renderer"
      exports: ["QuotePdfService"]
    - path: "apps/backend/src/quote/quote-pdf.service.spec.ts"
      provides: "Teste que renderToBuffer retorna Buffer não-vazio para quote mock"
      contains: "QuotePdfService"
  key_links:
    - from: "apps/backend/src/quote/quote.service.ts"
      to: "QuotePdfService.generate + StorageService.uploadBuffer"
      via: "método send() atualizado"
      pattern: "pdfService\\.generate|uploadBuffer.*orcivo-pdfs"
    - from: "apps/backend/src/quote/quote.service.ts"
      to: "WorkOrderService.create"
      via: "método approve() após QuoteApproval criado"
      pattern: "workOrderService\\.create"
---

<objective>
Implementar a geração de PDF com @react-pdf/renderer (com marca d'água para plano LIVRE) e o fluxo completo de aprovação pública: POST /quotes/public/:token/approve cria QuoteApproval, atualiza status para APPROVED, e cria WorkOrder automaticamente com idempotência.

Purpose: D2.3 (PDF) e D2.4 (aprovação pública) são os deliverables mais complexos da Fase 2A. O PDF precisa estar gerado quando o quote é enviado (status SENT). A aprovação é o momento de monetização — é crítico que seja idempotente e rastreável.
Output: QuotePdfService; método send() atualizado; endpoint POST /quotes/public/:token/approve; spec do PDF service.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- CRITICAL: @react-pdf/renderer é Node-only — NÃO roda no browser/mobile -->
<!-- Requer JSX no backend: adicionar "jsx": "react-jsx" ao tsconfig do backend -->
<!-- Arquivos de template PDF devem ter extensão .tsx -->
<!-- Pitfall 1 do RESEARCH.md: verificar se tsx + decorators coexistem no tsconfig -->

<!-- Instalação: -->
<!-- pnpm --filter @orcivo/backend add @react-pdf/renderer@4.5.1 -->
<!-- pnpm --filter @orcivo/backend add -D @types/react -->

<!-- Pattern 1 do RESEARCH.md contém código completo do QuotePdfService -->
<!-- Marca d'água: position absolute, opacity 0.15, rotate -45deg, color #6D28D9 -->
<!-- Texto da marca d'água: "Orcivo Livre" (não "FREE") -->

<!-- PlanLimitsService disponível após P02: -->
<!-- check(companyId, PlanFeature.PDF_WATERMARK) retorna { allowed: false } para plano LIVRE -->

<!-- Pitfall 2 do RESEARCH.md: aprovação dupla — usar $transaction + updateMany com count check -->
<!-- Quote.approval é QuoteApproval? (relação @unique) — verificar count antes de criar -->

<!-- WorkOrderService.create importado do WorkOrderModule (que exporta WorkOrderService) -->
<!-- Para criar OS automaticamente: WorkOrderCreateDto = { customer_id, title: "OS #N — {quote.title}" } -->

<!-- Signature: DRAWN_SIGNATURE envia base64 PNG no body como 'signature' (string) -->
<!-- Backend decodifica: buffer = Buffer.from(base64.replace("data:image/png;base64,",""), "base64") -->
<!-- Salva em orcivo-photos/{company_id}/signatures/{uuid}.png -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: QuotePdfService com marca d'água condicional</name>
  <files>
    apps/backend/src/quote/quote-pdf.service.tsx,
    apps/backend/src/quote/quote-pdf.service.spec.ts,
    apps/backend/tsconfig.json
  </files>
  <read_first>
    - apps/backend/tsconfig.json (ler antes de modificar — verificar jsx setting atual)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 1: Geração de PDF no NestJS"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pitfall 1: @react-pdf/renderer requer JSX no backend"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Open Question 2: tsconfig do backend para JSX"
  </read_first>
  <behavior>
    - Test 1: generate() com company.plan_code='LIVRE' → buffer não vazio + PDF contém texto "Orcivo Livre"
    - Test 2: generate() com company.plan_code='SOLO' → buffer não vazio + sem texto "Orcivo Livre"
    - Test 3: generate() com itens → renderToBuffer chamado (mock) com Document component
  </behavior>
  <action>
**Configuração TypeScript:**
Adicionar `"jsx": "react-jsx"` ao tsconfig.json do backend (apps/backend/tsconfig.json).
Adicionar `"react"` às compilerOptions.types se necessário.
Verificar que decorators continuam funcionando (`"experimentalDecorators": true` deve permanecer).

Instalar:
```bash
pnpm --filter @orcivo/backend add @react-pdf/renderer@4.5.1
pnpm --filter @orcivo/backend add -D @types/react
```

**apps/backend/src/quote/quote-pdf.service.tsx** (extensão .tsx obrigatória para JSX):
```tsx
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { Injectable } from '@nestjs/common';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#0A0A0F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 80, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 14, fontWeight: 'bold' },
  companyInfo: { fontSize: 9, color: '#666', marginTop: 2 },
  quoteTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  section: { marginTop: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: '6 4', borderRadius: 2, marginTop: 8 },
  tableRow: { flexDirection: 'row', padding: '5 4', borderBottom: '1px solid #E5E7EB' },
  col_desc: { flex: 3, fontSize: 10 },
  col_qty: { flex: 1, textAlign: 'right', fontSize: 10 },
  col_price: { flex: 1, textAlign: 'right', fontSize: 10 },
  col_total: { flex: 1, textAlign: 'right', fontSize: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalsLabel: { width: 120, fontSize: 10, color: '#666' },
  totalsValue: { width: 80, textAlign: 'right', fontSize: 10 },
  totalFinal: { fontSize: 12, fontWeight: 'bold', color: '#6D28D9' },
  watermark: {
    position: 'absolute', opacity: 0.12, fontSize: 42, top: '38%', left: '5%',
    transform: 'rotate(-45deg)', color: '#6D28D9', fontWeight: 'bold',
  },
  footer: { marginTop: 24, padding: '12 0', borderTop: '1px solid #E5E7EB', fontSize: 9, color: '#888' },
});

interface QuoteData {
  number: number;
  title?: string | null;
  notes?: string | null;
  subtotal: string;
  discount_type: string;
  discount_value: string;
  total: string;
  valid_until?: Date | null;
  items: Array<{ description: string; quantity: string; unit_price: string; total: string }>;
}
interface CompanyData {
  trade_name: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
  pix_key?: string | null;
  plan_code: string;
}

@Injectable()
export class QuotePdfService {
  async generate(quote: QuoteData, company: CompanyData): Promise<Buffer> {
    const showWatermark = company.plan_code === 'LIVRE';
    const location = [company.city, company.state].filter(Boolean).join(' — ');

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {showWatermark && <Text style={styles.watermark}>Orcivo Livre</Text>}

          <View style={styles.header}>
            <View>
              {company.logo_url && <Image style={styles.logo} src={company.logo_url} />}
              <Text style={styles.companyName}>{company.trade_name}</Text>
              {company.phone && <Text style={styles.companyInfo}>{company.phone}</Text>}
              {location && <Text style={styles.companyInfo}>{location}</Text>}
            </View>
            <View>
              <Text style={styles.quoteTitle}>Orçamento #{quote.number}</Text>
              {quote.title && <Text style={{ fontSize: 10, color: '#666' }}>{quote.title}</Text>}
              {quote.valid_until && (
                <Text style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
                  Válido até: {new Date(quote.valid_until).toLocaleDateString('pt-BR')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.tableHeader}>
              <Text style={styles.col_desc}>Descrição</Text>
              <Text style={styles.col_qty}>Qtd</Text>
              <Text style={styles.col_price}>Preço unit.</Text>
              <Text style={styles.col_total}>Total</Text>
            </View>
            {quote.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col_desc}>{item.description}</Text>
                <Text style={styles.col_qty}>{item.quantity}</Text>
                <Text style={styles.col_price}>R$ {item.unit_price}</Text>
                <Text style={styles.col_total}>R$ {item.total}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { alignItems: 'flex-end' }]}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>R$ {quote.subtotal}</Text>
            </View>
            {parseFloat(quote.discount_value) > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Desconto {quote.discount_type === 'PERCENT' ? `(${quote.discount_value}%)` : ''}
                </Text>
                <Text style={styles.totalsValue}>- R$ {quote.discount_value}</Text>
              </View>
            )}
            <View style={[styles.totalsRow, { marginTop: 4 }]}>
              <Text style={[styles.totalsLabel, styles.totalFinal]}>Total</Text>
              <Text style={[styles.totalsValue, styles.totalFinal]}>R$ {quote.total}</Text>
            </View>
          </View>

          {company.pix_key && (
            <View style={[styles.section, { marginTop: 20 }]}>
              <Text style={{ fontSize: 9, color: '#666' }}>Chave Pix: {company.pix_key}</Text>
            </View>
          )}

          {quote.notes && (
            <View style={styles.section}>
              <Text style={{ fontSize: 9, color: '#666', fontWeight: 'bold', marginBottom: 4 }}>Observações:</Text>
              <Text style={{ fontSize: 9, color: '#444' }}>{quote.notes}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text>Gerado pelo Orcivo — sistema de gestão para técnicos instaladores</Text>
          </View>
        </Page>
      </Document>
    );

    return renderToBuffer(doc) as Promise<Buffer>;
  }
}
```

Criar quote-pdf.service.spec.ts com testes usando mock de renderToBuffer.
Para testes, mockar `@react-pdf/renderer` inteiro pois renderToBuffer é Node-only e pode falhar em ambiente Jest sem configuração extra:
```typescript
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
}));
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=quote-pdf 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Testes do QuotePdfService passam (com mocks)
    - tsconfig.json tem "jsx": "react-jsx"
    - quote-pdf.service.tsx compila sem erros
    - Marca d'água presente apenas quando plan_code === 'LIVRE'
    - Texto da marca d'água é "Orcivo Livre" (não "FREE")
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Atualizar send() + implementar approve() com idempotência</name>
  <files>
    apps/backend/src/quote/quote.service.ts,
    apps/backend/src/quote/quote.controller.ts,
    apps/backend/src/quote/quote.module.ts
  </files>
  <read_first>
    - apps/backend/src/quote/quote.service.ts (ler COMPLETO — atualizar send(), adicionar approve())
    - apps/backend/src/quote/quote.controller.ts (ler COMPLETO — adicionar POST public/:token/approve)
    - apps/backend/src/quote/quote.module.ts (ler — adicionar QuotePdfService e WorkOrderModule import)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pitfall 2: Aprovação dupla"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 7: Canvas de assinatura mobile → PNG → MinIO"
    - apps/backend/src/work-order/work-order.service.ts (interface do create — verificar assinatura)
  </read_first>
  <behavior>
    - Test 1: approve() com token válido, status SENT → cria QuoteApproval + muda status APPROVED + cria WorkOrder
    - Test 2: approve() chamado 2x com mesmo token → segundo retorna 409 ConflictException
    - Test 3: approve() com TYPED_NAME sem typed_name → BadRequestException (validação do schema)
    - Test 4: approve() com DRAWN_SIGNATURE → salva signature_image_url no MinIO
  </behavior>
  <action>
**Atualizar quote.service.ts:**

1. Injetar no constructor: `QuotePdfService`, `StorageService`, `WorkOrderService`

2. Atualizar método `send()` para gerar PDF ao enviar:
```typescript
async send(id: string, companyId: string) {
  const quote = await this.findOne(id, companyId);
  // ... validação de transição (já implementada em P05) ...

  // Gerar PDF
  const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const pdfBuffer = await this.pdfService.generate(quote as never, company);
  const pdfObjectName = `${companyId}/quotes/${id}.pdf`;
  const pdfUrl = await this.storage.uploadBuffer('orcivo-pdfs', pdfObjectName, pdfBuffer, 'application/pdf');

  const token = crypto.randomUUID();
  await this.redis.set(`quote:approval:${token}`, id, 'EX', 604800); // 7 dias

  return this.prisma.quote.update({
    where: { id },
    data: { status: 'SENT', approval_token: token, pdf_url: pdfUrl },
  });
}
```

3. Adicionar método `approve()`:
```typescript
async approve(token: string, dto: ApproveQuoteDto, ipAddress: string, userAgent: string) {
  const quote = await this.getByApprovalToken(token);

  // Idempotência via $transaction com count check (Pitfall 2 do RESEARCH.md)
  const result = await this.prisma.$transaction(async (tx) => {
    const updated = await tx.quote.updateMany({
      where: { id: quote.id, status: 'SENT' }, // só atualiza se ainda SENT
      data: { status: 'APPROVED' },
    });
    if (updated.count === 0) return null; // já aprovado ou não é SENT
    return updated;
  });

  if (!result) throw new ConflictException('Orçamento já foi processado');

  // Processar assinatura se DRAWN_SIGNATURE
  let signatureUrl: string | undefined;
  if (dto.approval_method === 'DRAWN_SIGNATURE' && dto.signature) {
    const base64 = (dto.signature as string).replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const objectName = `${quote.company_id}/signatures/${crypto.randomUUID()}.png`;
    signatureUrl = await this.storage.uploadBuffer('orcivo-photos', objectName, buffer, 'image/png');
  }

  // Registrar QuoteApproval
  await this.prisma.quoteApproval.create({
    data: {
      quote_id: quote.id,
      approval_method: dto.approval_method,
      typed_name: dto.typed_name,
      signature_image_url: signatureUrl,
      ip_address: ipAddress,
      user_agent: userAgent ?? '',
    },
  });

  // Criar WorkOrder automaticamente (D2-14)
  const woTitle = quote.title ? `OS — ${quote.title}` : `OS #${quote.number}`;
  await this.workOrderService.create(
    { customer_id: quote.customer_id, title: woTitle },
    quote.company_id,
    quote.created_by_user_id,
    quote.id, // quoteId
  );

  return { status: 'APPROVED' };
}
```

**Atualizar quote.controller.ts** — adicionar endpoint:
```typescript
@Post('public/:token/approve')
@Public()
@HttpCode(200)
async approve(
  @Param('token') token: string,
  @Body(new ZodValidationPipe(ApproveQuoteSchema)) body: unknown,
  @Req() req: Request,
) {
  const ipAddress = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const userAgent = req.headers['user-agent'] ?? '';
  return this.quoteService.approve(token, body as never, ipAddress, userAgent);
}
```

**Atualizar quote.module.ts** — adicionar:
```typescript
import { WorkOrderModule } from '../work-order/work-order.module';
imports: [BullModule.registerQueue({ name: 'quote-expiry' }), WorkOrderModule],
providers: [QuoteService, QuoteExpiryProcessor, QuotePdfService],
```

ApproveQuoteSchema já importado de shared-types. Adicionar campo `signature` opcional ao schema:
Atualizar `packages/shared-types/src/quote/quote-approval.dto.ts` para adicionar:
```typescript
signature: z.string().optional(), // base64 PNG para DRAWN_SIGNATURE
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern="quote.service|quote-pdf" 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Todos os testes passam (incluindo idempotência, TYPED_NAME validation, DRAWN_SIGNATURE)
    - send() salva pdf_url no banco após upload para MinIO
    - approve() usa $transaction com updateMany + count check para idempotência
    - WorkOrder criada automaticamente após aprovação
    - Backend compila sem erros
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| público → POST /quotes/public/:token/approve | Sem autenticação; ip_address e user_agent registrados como evidência de aprovação |
| base64 PNG → MinIO | Dados binários vindos do cliente; tamanho não explicitamente limitado na assinatura |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-18 | Tampering | aprovação dupla (double-submit) | mitigate | $transaction com updateMany({ where: { status: 'SENT' } }) + count === 0 → 409; sem race condition |
| T-2A-19 | Spoofing | ip_address manipulado via X-Forwarded-For | accept | MVP sem reverse proxy configurado; Fase 3 configurará trust proxy no NestJS |
| T-2A-20 | Denial of Service | base64 PNG gigante no DRAWN_SIGNATURE | mitigate | Adicionar limite de 2MB ao campo signature no schema Zod: `z.string().max(2_000_000)` |
| T-2A-21 | Information Disclosure | pdf_url acessível sem autenticação | accept | URL do MinIO requer knowledge da URL exata (UUIDs); não há listagem pública de PDFs |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend test --testPathPattern="quote.service|quote-pdf"
pnpm --filter @orcivo/backend build
grep -n "ConflictException\|updateMany.*count" apps/backend/src/quote/quote.service.ts
grep -n "workOrderService\\.create" apps/backend/src/quote/quote.service.ts
grep -n "pdf_url\|approval_token" apps/backend/src/quote/quote.service.ts
```
</verification>

<success_criteria>
- Todos os testes de quote.service e quote-pdf.service passam
- approve() retorna 409 se chamado duas vezes com mesmo token
- WorkOrder criada automaticamente após aprovação (com quote_id vinculado)
- pdf_url salvo no banco após send()
- Marca d'água "Orcivo Livre" presente no PDF apenas para plano LIVRE
- Backend compila sem erros TypeScript
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P07-SUMMARY.md`
</output>
