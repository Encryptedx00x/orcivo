---
phase: "2A"
plan: "02-P01"
title: "Schema Prisma + DTOs shared-types"
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - packages/shared-types/src/index.ts
  - packages/shared-types/src/catalog/catalog-item-create.dto.ts
  - packages/shared-types/src/catalog/catalog-item-update.dto.ts
  - packages/shared-types/src/quote/quote-create.dto.ts
  - packages/shared-types/src/quote/quote-update.dto.ts
  - packages/shared-types/src/quote/quote-status.enum.ts
  - packages/shared-types/src/quote/quote-approval.dto.ts
  - packages/shared-types/src/work-order/work-order-create.dto.ts
  - packages/shared-types/src/work-order/work-order-update.dto.ts
  - packages/shared-types/src/plan/plan-feature.enum.ts
  - packages/shared-types/src/auth/forgot-password.dto.ts
  - packages/shared-types/src/auth/reset-password.dto.ts
  - packages/shared-types/src/helpers/money.ts
autonomous: true
requirements: ["D2.1", "D2.2", "D2.4", "D2.5"]

must_haves:
  truths:
    - "Schema Prisma compila sem erros com os novos modelos"
    - "pnpm --filter @orcivo/shared-types build produz dist/ sem erros"
    - "Todos os campos monetários usam Decimal @db.Decimal(12,2)"
    - "Toda tabela de negócio tem company_id com @@index([company_id])"
    - "assertValidTransition exportado de shared-types e testável em isolamento"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Modelos CatalogItem, Quote, QuoteItem, QuoteApproval, WorkOrder, WorkOrderPhoto, AuditLog"
      contains: "model AuditLog"
    - path: "packages/shared-types/src/quote/quote-status.enum.ts"
      provides: "QuoteStatus, assertValidTransition, VALID_TRANSITIONS"
      exports: ["QuoteStatus", "assertValidTransition"]
    - path: "packages/shared-types/src/helpers/money.ts"
      provides: "formatMoney, parseMoney helpers usando Decimal.js"
      exports: ["formatMoney", "parseMoney"]
  key_links:
    - from: "packages/shared-types/src/index.ts"
      to: "todos os novos DTOs"
      via: "barrel export"
      pattern: "export \\* from"
---

<objective>
Extensão do schema Prisma com os 7 novos modelos da Fase 2A e criação de todos os DTOs Zod em shared-types que os módulos backend, mobile e web consumirão.

Purpose: Esses artefatos são a fundação de todos os plans Wave 2+. Nada pode ser implementado antes do schema estar correto e dos DTOs estarem exportados.
Output: Schema Prisma com CatalogItem/Quote/QuoteItem/QuoteApproval/WorkOrder/WorkOrderPhoto/AuditLog; DTOs Zod completos; helpers de money; state machine de Quote exportada.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Schema existente — estender, não substituir -->
<!-- prisma/schema.prisma já contém: User, Company, CompanyMember, Customer, RefreshToken -->
<!-- Company já tem: plan_code PlanCode @default(LIVRE), pix_key, logo_url, brand_color -->

<!-- shared-types existente -->
<!-- packages/shared-types/src/index.ts exporta: PlanCodeEnum, CustomerTypeEnum, DocumentTypeEnum, auth/*, customer/* -->
<!-- NUNCA importar @prisma/client, @nestjs/*, react, react-native em shared-types -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Estender schema Prisma com modelos da Fase 2A</name>
  <files>prisma/schema.prisma</files>
  <read_first>
    - prisma/schema.prisma (leia o arquivo completo antes de modificar — não substituir modelos existentes)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Schema Prisma para os novos modelos" (código pronto para copiar)
  </read_first>
  <action>
Adicionar os seguintes modelos AO FINAL do schema.prisma existente (após o model RefreshToken), sem alterar nada do existente:

1. Adicionar relações faltantes em modelos existentes:
   - Company: adicionar `catalog_items CatalogItem[]`, `quotes Quote[]`, `work_orders WorkOrder[]`
   - Customer: adicionar `quotes Quote[]`, `work_orders WorkOrder[]`

2. Adicionar enums: CatalogItemType, QuoteStatus, DiscountType, ApprovalMethod, WorkOrderStatus, PhotoStage

3. Adicionar modelos (copiar EXATAMENTE do RESEARCH.md §"Schema Prisma"):
   - CatalogItem (company_id, name, description?, type CatalogItemType, unit_price Decimal @db.Decimal(12,2), unit?, is_active, created_at, updated_at; @@index([company_id]), @@index([company_id, is_active]), @@map("catalog_items"))
   - Quote (todos os campos do RESEARCH.md incluindo approval_token String? @unique, pdf_url, discount_type DiscountType @default(PERCENT), discount_value/subtotal/total todos Decimal @db.Decimal(12,2); @@unique([company_id, number]), @@index([approval_token]), @@map("quotes"))
   - QuoteItem (quote_id, catalog_item_id?, description, quantity Decimal @db.Decimal(10,3), unit_price/total Decimal @db.Decimal(12,2); @@index([quote_id]), @@map("quote_items"))
   - QuoteApproval (quote_id @unique, approval_method ApprovalMethod, typed_name?, signature_image_url?, ip_address, user_agent, approved_at @default(now()); @@map("quote_approvals"))
   - WorkOrder (company_id, customer_id, quote_id? @unique, number Int, title, status WorkOrderStatus @default(PENDING), scheduled_at?, started_at?, finished_at?, notes?, assigned_to_user_id?, created_by_user_id; @@unique([company_id, number]), @@index([company_id]), @@index([company_id, status]), @@map("work_orders"))
   - WorkOrderPhoto (company_id, work_order_id, uploaded_by_user_id, photo_stage PhotoStage, file_url, caption?; @@index([work_order_id]), @@index([company_id]), @@map("work_order_photos"))
   - AuditLog — adicionar ao schema (D2-14: audit trail de aprovações de orçamento):
   ```prisma
   model AuditLog {
     id          String   @id @default(uuid())
     company_id  String
     actor_type  String   // "USER" | "SYSTEM"
     action      String   // ex: "quote.approved"
     entity_type String   // ex: "quote"
     entity_id   String
     metadata    Json?
     created_at  DateTime @default(now())

     @@index([company_id])
     @@index([company_id, entity_type, entity_id])
     @@map("audit_logs")
   }
   ```

CRÍTICO:
- NUNCA usar number/float para valores monetários — SEMPRE Decimal @db.Decimal(12,2)
- NUNCA remover company_id de qualquer tabela de negócio
- QuoteApproval NÃO tem company_id (acesso via Quote → company_id)
- AuditLog tem company_id e NÃO é uma tabela de negócio principal, mas deve ter company_id para multi-tenancy
- Verificar que `prisma validate` passa antes de finalizar
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && npx prisma validate</automated>
  </verify>
  <done>
    - `npx prisma validate` retorna sem erros
    - Todos os 7 novos modelos presentes no arquivo (incluindo AuditLog)
    - Todo campo monetário usa Decimal @db.Decimal(12,2) ou Decimal @db.Decimal(10,3)
    - Toda tabela de negócio tem company_id com @@index([company_id])
    - AuditLog tem @@map("audit_logs") e @@index([company_id])
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: DTOs Zod em shared-types + helpers de money + state machine</name>
  <files>
    packages/shared-types/src/catalog/catalog-item-create.dto.ts,
    packages/shared-types/src/catalog/catalog-item-update.dto.ts,
    packages/shared-types/src/quote/quote-create.dto.ts,
    packages/shared-types/src/quote/quote-update.dto.ts,
    packages/shared-types/src/quote/quote-status.enum.ts,
    packages/shared-types/src/quote/quote-approval.dto.ts,
    packages/shared-types/src/work-order/work-order-create.dto.ts,
    packages/shared-types/src/work-order/work-order-update.dto.ts,
    packages/shared-types/src/plan/plan-feature.enum.ts,
    packages/shared-types/src/auth/forgot-password.dto.ts,
    packages/shared-types/src/auth/reset-password.dto.ts,
    packages/shared-types/src/helpers/money.ts,
    packages/shared-types/src/index.ts
  </files>
  <read_first>
    - packages/shared-types/src/index.ts (ler antes de modificar — não remover exports existentes)
    - packages/shared-types/src/customer/customer-create.dto.ts (padrão de DTO a replicar)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"DTO Zod — QuoteCreate" e §"Pattern 4: Máquina de estados"
  </read_first>
  <action>
Criar os seguintes arquivos em packages/shared-types/src/:

**catalog/catalog-item-create.dto.ts:**
```typescript
import { z } from 'zod';
export const CatalogItemCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['SERVICE', 'PRODUCT']),
  unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/), // string decimal — nunca number
  unit: z.string().max(20).optional(),
  is_active: z.boolean().default(true),
});
export type CatalogItemCreateDto = z.infer<typeof CatalogItemCreateSchema>;
```

**catalog/catalog-item-update.dto.ts:**
```typescript
import { z } from 'zod';
import { CatalogItemCreateSchema } from './catalog-item-create.dto';
export const CatalogItemUpdateSchema = CatalogItemCreateSchema.partial();
export type CatalogItemUpdateDto = z.infer<typeof CatalogItemUpdateSchema>;
```

**quote/quote-status.enum.ts:**
```typescript
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type DiscountType = 'PERCENT' | 'FIXED';

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED', 'EXPIRED'],
  SENT:      ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED:  [],
  REJECTED:  [],
  CANCELLED: [],
  EXPIRED:   [],
};

export function assertValidTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}`);
  }
}

export function isTerminalStatus(status: QuoteStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
```

**quote/quote-create.dto.ts** (conforme RESEARCH.md §"DTO Zod — QuoteCreate"):
```typescript
import { z } from 'zod';
const decimalStr = (decimals = 2) => z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`));

export const QuoteItemSchema = z.object({
  catalog_item_id: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  quantity: decimalStr(3),
  unit_price: decimalStr(2),
});
export const QuoteCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  valid_until: z.string().datetime().optional(),
  discount_type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  discount_value: decimalStr(2).default('0'),
  items: z.array(QuoteItemSchema).min(1),
});
export type QuoteCreateDto = z.infer<typeof QuoteCreateSchema>;
export type QuoteItemDto = z.infer<typeof QuoteItemSchema>;
```

**quote/quote-update.dto.ts:**
```typescript
import { z } from 'zod';
import { QuoteCreateSchema } from './quote-create.dto';
export const QuoteUpdateSchema = QuoteCreateSchema.omit({ items: true }).partial().extend({
  items: z.array(z.object({
    catalog_item_id: z.string().uuid().optional(),
    description: z.string().min(1).max(300),
    quantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
    unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  })).min(1).optional(),
});
export type QuoteUpdateDto = z.infer<typeof QuoteUpdateSchema>;
```

**quote/quote-approval.dto.ts:**
```typescript
import { z } from 'zod';
export const ApproveQuoteSchema = z.object({
  approval_method: z.enum(['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE']),
  typed_name: z.string().min(2).max(200).optional(),
}).refine(
  (d) => d.approval_method !== 'TYPED_NAME' || !!d.typed_name,
  { message: 'typed_name obrigatório para TYPED_NAME', path: ['typed_name'] }
);
export type ApproveQuoteDto = z.infer<typeof ApproveQuoteSchema>;
```

**work-order/work-order-create.dto.ts:**
```typescript
import { z } from 'zod';
export const WorkOrderCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  notes: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});
export type WorkOrderCreateDto = z.infer<typeof WorkOrderCreateSchema>;
```

**work-order/work-order-update.dto.ts:**
```typescript
import { z } from 'zod';
export const WorkOrderUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  scheduled_at: z.string().datetime().optional(),
  started_at: z.string().datetime().optional(),
  finished_at: z.string().datetime().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});
export type WorkOrderUpdateDto = z.infer<typeof WorkOrderUpdateSchema>;
```

**plan/plan-feature.enum.ts:**
```typescript
export enum PlanFeature {
  PDF_WATERMARK = 'PDF_WATERMARK',
  PHOTOS_IN_OS = 'PHOTOS_IN_OS',
  MAX_CUSTOMERS = 'MAX_CUSTOMERS',
  MAX_QUOTES_PER_MONTH = 'MAX_QUOTES_PER_MONTH',
  MAX_WORK_ORDERS_PER_MONTH = 'MAX_WORK_ORDERS_PER_MONTH',
}
```

**auth/forgot-password.dto.ts:**
```typescript
import { z } from 'zod';
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
```

**auth/reset-password.dto.ts:**
```typescript
import { z } from 'zod';
export const ResetPasswordSchema = z.object({
  token: z.string().uuid(),
  new_password: z.string().min(8).max(128),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
```

**helpers/money.ts:**
```typescript
import Decimal from 'decimal.js';
/** Formata valor string decimal para exibição: "1234.56" → "R$ 1.234,56" */
export function formatMoney(value: string | null | undefined): string {
  if (!value) return 'R$ 0,00';
  const d = new Decimal(value);
  return `R$ ${d.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
/** Multiplica dois valores string decimal: "10.00" * "3.000" → "30.00" */
export function multiplyDecimal(a: string, b: string): string {
  return new Decimal(a).mul(new Decimal(b)).toFixed(2);
}
/** Soma array de valores string decimal */
export function sumDecimal(values: string[]): string {
  return values.reduce((acc, v) => new Decimal(acc).add(new Decimal(v)).toFixed(2), '0');
}
```

Por fim, atualizar **packages/shared-types/src/index.ts** adicionando (SEM remover os exports existentes):
```typescript
export * from './catalog/catalog-item-create.dto';
export * from './catalog/catalog-item-update.dto';
export * from './quote/quote-create.dto';
export * from './quote/quote-update.dto';
export * from './quote/quote-status.enum';
export * from './quote/quote-approval.dto';
export * from './work-order/work-order-create.dto';
export * from './work-order/work-order-update.dto';
export * from './plan/plan-feature.enum';
export * from './auth/forgot-password.dto';
export * from './auth/reset-password.dto';
export * from './helpers/money';
```

CRÍTICO:
- NUNCA importar @prisma/client, @nestjs/*, react, react-native neste package
- Instalar decimal.js se não estiver: `pnpm --filter @orcivo/shared-types add decimal.js@10.6.0`
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/shared-types build</automated>
  </verify>
  <done>
    - `pnpm --filter @orcivo/shared-types build` completa sem erros TypeScript
    - dist/ gerado com todos os arquivos compilados
    - assertValidTransition throw Error para transições inválidas (testável em isolamento)
    - formatMoney("1234.56") retorna "R$ 1.234,56"
    - Nenhum import de @prisma/client, @nestjs/*, react, react-native nos arquivos criados
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shared-types → backend/mobile/web | DTOs são contratos — validados por Zod antes de qualquer operação de negócio |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-01 | Tampering | QuoteItemSchema.unit_price | mitigate | Regex `/^\d+(\.\d{1,2})?$/` rejeita notação científica e valores negativos antes de chegar ao backend |
| T-2A-02 | Information Disclosure | QuoteStatus enum público | accept | Estado é dado de negócio sem sensibilidade; transições inválidas jogam erro antes de qualquer escrita |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
npx prisma validate
pnpm --filter @orcivo/shared-types build
grep -r "@prisma/client\|@nestjs/\|from 'react'" packages/shared-types/src/ || echo "OK — sem imports proibidos"
grep -r "Decimal" prisma/schema.prisma | grep -v "db.Decimal" | grep -v "//" | grep -E "Float|number" || echo "OK — sem float/number monetário"
grep "model AuditLog" prisma/schema.prisma || echo "MISSING — AuditLog não encontrado"
```
</verification>

<success_criteria>
- `npx prisma validate` — sem erros
- `pnpm --filter @orcivo/shared-types build` — sem erros TypeScript
- 7 novos modelos no schema (CatalogItem, Quote, QuoteItem, QuoteApproval, WorkOrder, WorkOrderPhoto, AuditLog)
- Todo campo monetário: `Decimal @db.Decimal(12,2)` ou `Decimal @db.Decimal(10,3)`
- Toda tabela de negócio com company_id e @@index([company_id])
- shared-types sem imports proibidos
- assertValidTransition presente e exportado
- formatMoney/multiplyDecimal/sumDecimal exportados de helpers/money
- AuditLog model no schema com company_id, actor_type, action, entity_type, entity_id, metadata, created_at
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P01-SUMMARY.md`
</output>
