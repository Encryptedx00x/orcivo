---
phase: "2A"
plan: "02-P12"
title: "Web pública — Página de aprovação de orçamento + smoke tests + prisma migrate"
wave: 7
depends_on: ["02-P07", "02-P09", "02-P11"]
files_modified:
  - apps/web/src/app/approve/[token]/page.tsx
  - apps/web/src/app/approve/[token]/SignatureCanvas.tsx
  - apps/web/src/lib/approval.service.ts
  - prisma/migrations/
autonomous: false
requirements: ["D2.4"]

must_haves:
  truths:
    - "GET /approve/:token exibe orçamento publicamente (sem login) com itens e total"
    - "Botão 'Aprovar orçamento' (APPROVE_BUTTON) submete aprovação sem exigir nome ou assinatura"
    - "Campo 'Seu nome' (TYPED_NAME) submete aprovação com nome digitado"
    - "Canvas de assinatura (DRAWN_SIGNATURE) captura PNG e envia como base64"
    - "Aprovação bem-sucedida exibe tela de confirmação com mensagem em pt-BR"
    - "prisma migrate dev gera migration e aplica ao banco local"
  artifacts:
    - path: "apps/web/src/app/approve/[token]/page.tsx"
      provides: "Página pública de aprovação sem autenticação (@Public() no backend já configurado)"
      contains: "ApprovePage"
    - path: "apps/web/src/app/approve/[token]/SignatureCanvas.tsx"
      provides: "Canvas de assinatura React para DRAWN_SIGNATURE"
      contains: "SignatureCanvas"
    - path: "apps/web/src/lib/approval.service.ts"
      provides: "fetchPublicQuote(token), approveQuote(token, method, data)"
      contains: "fetchPublicQuote"
  key_links:
    - from: "apps/web/src/app/approve/[token]/page.tsx"
      to: "GET /quotes/public/:token"
      via: "fetchPublicQuote(token) — sem autenticação"
      pattern: "fetchPublicQuote"
    - from: "apps/web/src/app/approve/[token]/page.tsx"
      to: "POST /quotes/public/:token/approve"
      via: "approveQuote(token, method, dto)"
      pattern: "approveQuote"
---

<objective>
Implementar a página pública de aprovação de orçamento (sem autenticação): exibe os dados do orçamento, permite aprovação por 3 métodos (botão, nome digitado, assinatura canvas) e exibe confirmação. Também executa a migration do Prisma e smoke tests finais.

Purpose: D2.4 — a página pública de aprovação fecha o loop: técnico envia via WhatsApp → cliente abre link → aprova → OS gerada automaticamente. É o ponto de maior valor do produto nesta fase.
Output: Página /approve/:token funcional com 3 métodos de aprovação; migration Prisma aplicada; smoke tests documentados.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Rota pública no backend (P07): -->
<!-- GET /quotes/public/:token — sem JWT (retorna dados do orçamento) -->
<!-- POST /quotes/public/:token/approve — sem JWT (ApproveQuoteDto) -->
<!-- ApproveQuoteDto: { approval_method, typed_name?, signature? (base64 string) } -->

<!-- Página web pública: -->
<!-- apps/web/src/app/approve/[token]/page.tsx — FORA do (dashboard) layout -->
<!-- Não usar o layout do dashboard (sem sidebar/navbar de auth) -->
<!-- Layout mínimo: logo Orcivo + conteúdo -->

<!-- Canvas de assinatura web: -->
<!-- Usar <canvas> HTML5 nativo com mouse/touch events -->
<!-- Não requer lib externa — implementar com useRef e canvas API -->
<!-- getImageData → toDataURL('image/png') → base64 string -->
<!-- Se complexo: usar react-signature-canvas (verificar se já instalado) -->

<!-- Estado da aprovação: loading → formulário → confirmação -->
<!-- Confirmação: "Orçamento aprovado com sucesso! Nossa equipe entrará em contato." -->

<!-- prisma migrate dev: rodar APÓS todos os planos de código estarem concluídos -->
<!-- Comando: npx prisma migrate dev --name phase-2a -->
<!-- Em CI: prisma db push (já configurado no workflow do GitHub Actions) -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: approval.service.ts + Página pública /approve/:token</name>
  <files>
    apps/web/src/lib/approval.service.ts,
    apps/web/src/app/approve/[token]/page.tsx,
    apps/web/src/app/approve/[token]/SignatureCanvas.tsx
  </files>
  <read_first>
    - apps/web/src/app/(dashboard)/layout.tsx (verificar que página de aprovação está FORA deste layout)
    - apps/web/src/lib/api.ts (padrão apiFetch — mas aprovação não usa auth, usar fetch direto)
    - apps/web/src/lib/quote.service.ts (QuoteItem interface para reutilizar)
    - packages/shared-types/src/helpers/money.ts (formatMoney — exibir totais)
    - packages/shared-types/src/quote/quote-approval.dto.ts (ApproveQuoteDto)
  </read_first>
  <action>
**approval.service.ts** (sem autenticação — fetch direto):
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface PublicQuote {
  id: string;
  number: number;
  title?: string;
  status: string;
  subtotal: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: string;
  total: string;
  valid_until?: string;
  notes?: string;
  customer: { name: string; phone?: string };
  items: Array<{ description: string; quantity: string; unit_price: string; total: string }>;
}

export const approvalService = {
  async fetchPublicQuote(token: string): Promise<PublicQuote> {
    const res = await fetch(`${API_URL}/quotes/public/${token}`);
    if (!res.ok) throw new Error('Orçamento não encontrado ou link inválido');
    return res.json();
  },

  async approveQuote(token: string, dto: {
    approval_method: 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';
    typed_name?: string;
    signature?: string; // base64 PNG
  }): Promise<{ status: string }> {
    const res = await fetch(`${API_URL}/quotes/public/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? 'Erro ao processar aprovação');
    }
    return res.json();
  },
};
```

**apps/web/src/app/approve/[token]/page.tsx:**
- `'use client'` + useParams()
- FORA do (dashboard) layout — layout mínimo com logo Orcivo (roxo #6D28D9) no topo
- Estados: 'loading' | 'show_quote' | 'show_form' | 'approved' | 'error'
- State 'loading': Skeleton cards
- State 'error': mensagem "Este link de orçamento não é válido ou expirou."
- State 'show_quote': Exibir dados do orçamento:
  - Nome da empresa (exibir como "Orçamento de {customer.name}" — empresa não expostos na rota pública)
  - Número (#N), título opcional, data de validade se houver
  - Tabela de itens: descrição, qtd, preço unit., total (formatMoney)
  - Subtotal, desconto (se > 0), Total em destaque
  - Observações (se houver)
  - Botão "Revisar e aprovar" → state 'show_form'
- State 'show_form': Formulário de aprovação com Tabs (ou accordion):
  - **Aba 1 "Aprovação simples"** (APPROVE_BUTTON):
    - Texto: "Clique abaixo para confirmar sua aprovação deste orçamento."
    - Botão "Aprovar orçamento" → approveQuote(token, { approval_method: 'APPROVE_BUTTON' })
  - **Aba 2 "Assinar com nome"** (TYPED_NAME):
    - Campo: "Seu nome completo" (Input, required)
    - Botão "Aprovar e assinar" → approveQuote(token, { approval_method: 'TYPED_NAME', typed_name })
  - **Aba 3 "Assinar com desenho"** (DRAWN_SIGNATURE):
    - Componente SignatureCanvas
    - Botão "Limpar" + botão "Aprovar com assinatura" → envia base64
  - Loading durante submit
  - Erro: Alert com mensagem de erro
- State 'approved': Tela de confirmação:
  - Ícone CheckCircle verde grande (lucide-react)
  - Título: "Orçamento aprovado!"
  - Texto: "Sua aprovação foi registrada com sucesso. Em breve nossa equipe entrará em contato."
  - Observação sobre o que acontece a seguir (OS gerada automaticamente)

**SignatureCanvas.tsx** — canvas HTML5 simples:
```tsx
'use client';
import { useRef, useState } from 'react';

interface Props {
  onSign: (dataUrl: string) => void;
}

export function SignatureCanvas({ onSign }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0A0A0F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onSign(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onSign(''); // reset
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-gray-300 rounded-md touch-none cursor-crosshair bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button type="button" onClick={clear} className="text-sm text-gray-500 underline self-start">
        Limpar assinatura
      </button>
    </div>
  );
}
```

IMPORTANTE: Esta página fica em `apps/web/src/app/approve/[token]/page.tsx` — NÃO dentro de `(dashboard)`. Verificar se há um `layout.tsx` na raiz que se aplica, ou criar um layout mínimo em `apps/web/src/app/approve/layout.tsx` sem sidebar/auth.
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/web build 2>&1 | grep -E "^.*error|^.*Error" | grep -v "warn" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Build Next.js sem erros
    - Página /approve/:token não usa layout do dashboard (sem sidebar)
    - 3 métodos de aprovação implementados (APPROVE_BUTTON, TYPED_NAME, DRAWN_SIGNATURE)
    - Estado de confirmação exibido após aprovação bem-sucedida
    - Todos os textos de UI em pt-BR
    - SignatureCanvas captura assinatura como base64 PNG
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    - Todos os 11 planos anteriores executados (backend infra, CatalogModule, QuoteModule, WorkOrderModule, PDF service, approval flow, mobile screens, web pages, approval page)
    - Prisma migration executada: `npx prisma migrate dev --name phase-2a`
    - Backend reiniciado com novos módulos
  </what-built>
  <how-to-verify>
Executar smoke tests completos do fluxo principal:

**Setup:**
```bash
# Em terminais separados:
docker compose up -d  # postgres, redis, minio
pnpm --filter @orcivo/backend dev
pnpm --filter @orcivo/web dev
```

**Prisma migration (executar antes dos testes):**
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
npx prisma migrate dev --name phase-2a
```

**Smoke test 1 — Catálogo:**
1. Acessar http://localhost:3000/catalogo
2. Clicar "Novo item"
3. Criar: "Instalação de câmera", tipo Serviço, preço "150.00"
4. Verificar que aparece na lista com "R$ 150,00"

**Smoke test 2 — Orçamento + WhatsApp:**
1. Acessar http://localhost:3000/orcamentos/novo
2. Selecionar cliente existente
3. Adicionar item do catálogo criado acima (qty: "2")
4. Verificar preview: subtotal R$ 300,00
5. Criar orçamento
6. Na página de detalhe: clicar "Enviar orçamento"
7. Verificar que botão WhatsApp aparece com approvalUrl

**Smoke test 3 — Aprovação pública:**
1. Abrir a approvalUrl gerada no smoke test 2
2. Verificar que página /approve/:token exibe o orçamento sem necessidade de login
3. Clicar aba "Assinar com nome"
4. Digitar um nome e clicar "Aprovar e assinar"
5. Verificar tela de confirmação "Orçamento aprovado!"
6. No backend: verificar que WorkOrder foi criada automaticamente

**Smoke test 4 — OS com fotos (mobile):**
1. Executar `pnpm --filter @orcivo/mobile start`
2. Em Expo Go: navegar para "Mais" → "Ordens de Serviço"
3. Abrir a OS criada automaticamente pelo smoke test 3
4. Clicar "Iniciar OS" → status muda para "Em andamento"
5. Na seção "Antes": clicar "Adicionar foto" e enviar uma foto
6. Verificar que foto aparece na lista

**Verificações automatizadas:**
```bash
# CI isolation tests para todos os novos módulos
pnpm --filter @orcivo/backend test:ci
```
  </how-to-verify>
  <resume-signal>
    Digite "aprovado" se todos os smoke tests passaram, ou descreva os problemas encontrados para gap closure.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| internet → /approve/:token | Página completamente pública; token é a única proteção |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-30 | Spoofing | acesso à página de aprovação sem token válido | mitigate | Backend retorna 404 para token inexistente; frontend exibe "link inválido ou expirado" |
| T-2A-31 | Tampering | canvas signature manipulada pelo cliente | accept | Assinatura é evidência, não autenticação criptográfica; ip_address + user_agent + typed_name são as evidências legais |
| T-2A-32 | Denial of Service | cliente tenta aprovar orçamento de outro tenant | mitigate | Backend valida token no Redis/banco; sem company_id na URL pública; cross-tenant impossível por design |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/web build
npx prisma migrate dev --name phase-2a
pnpm --filter @orcivo/backend test:ci
```
</verification>

<success_criteria>
- Build Next.js sem erros
- Página /approve/:token acessível sem login (verificado com curl sem token de auth)
- 3 métodos de aprovação funcionam no browser
- Prisma migration executada sem erros
- Todos os isolation specs do backend passam em CI
- Smoke tests aprovados pelo usuário (checkpoint)
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P12-SUMMARY.md`
</output>
