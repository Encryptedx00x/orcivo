# 03-P06 — Site público (apps/site/) — landing + pricing + checkout

## Goal
Criar `apps/site/` com Next.js: landing page do produto, página de pricing com os 4 planos Orcivo, e fluxo de checkout via Asaas.

## Wave
4 (depende de 03-P02 para o endpoint de checkout)

## Context
- `apps/site/` não existe — criar do zero
- Stack: Next.js + Tailwind + TypeScript (mesmo padrão do apps/web/)
- Design: Orcivo design system (--purple-600 #6D28D9, Inter, Lucide)
- Checkout POST para `/billing/checkout` na API backend
- **Nunca mencionar preço no mobile** — apenas no site

## Tasks

### T1 — Scaffold apps/site/

```bash
cd apps/site
# Criar package.json
```

`apps/site/package.json`:
```json
{
  "name": "@orcivo/site",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.3.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "lucide-react": "^0.511.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5"
  }
}
```

Criar `apps/site/next.config.ts`, `apps/site/tsconfig.json`, `apps/site/tailwind.config.ts`, `apps/site/postcss.config.js` (copiar padrão do apps/web/).

### T2 — Layout principal

`apps/site/app/layout.tsx`:
- Fonte Inter (Google Fonts ou local)
- Meta tags: title "Orcivo — Gestão para técnicos instaladores", description
- Viewport, charset, Open Graph básico

`apps/site/app/globals.css`:
- Variáveis CSS do design system: `--purple-600: #6D28D9`, `--bg: #FFFFFF`, `--ink: #0A0A0F`
- Tailwind base/components/utilities

### T3 — Landing page (/)

`apps/site/app/page.tsx` — seções:

**Hero:**
```
Orcivo — Gestão para técnicos instaladores
Orçamentos, OS, PDF e aprovação pelo WhatsApp — tudo no celular.
[Criar conta grátis →]  [Ver planos]
```

**Benefícios (3 colunas):**
- Orçamento em 2 minutos
- PDF profissional com sua logo
- Aprovação pelo WhatsApp

**Como funciona (3 passos):**
1. Cadastre seus serviços e produtos
2. Monte o orçamento no celular
3. Envie pelo WhatsApp e receba aprovação

**CTA final:**
```
Comece grátis. Sem cartão de crédito.
[Criar conta no Orcivo →]
```

**Footer:**
- Links: Planos, Termos de Uso, Política de Privacidade
- © 2026 Orcivo

### T4 — Página de planos (/planos)

`apps/site/app/planos/page.tsx`:

Componente `PricingCard` para cada plano:

| Plano | Mensal | Anual | Destaque |
|-------|--------|-------|---------|
| Orcivo Livre | Grátis | Grátis | 5 clientes, watermark |
| Orcivo Solo | R$9,90/mês | R$79,90/ano | 50 clientes, logo própria |
| Orcivo Mais | R$19,90/mês | R$199,90/ano | 200 clientes, relatórios |
| Orcivo Equipe | R$39,90/mês | R$399,90/ano | Uso amplo, contratos |

Regras de texto:
- Nunca usar "ilimitado" — usar "uso amplo"
- Nunca usar "FREE", "PRO", "TOP"
- Usar nomes exatos: Orcivo Livre, Orcivo Solo, Orcivo Mais, Orcivo Equipe
- Toggle mensal/anual (anual = economia de ~30%)

Botão por plano:
- Livre: "Criar conta grátis" → /signup
- Solo/Mais/Equipe: "Assinar agora" → /checkout?plan=SOLO&cycle=YEARLY

### T5 — Página de checkout (/checkout)

`apps/site/app/checkout/page.tsx`:

1. Ler query params `plan` e `cycle`
2. Se não logado → redirect para /login?redirect=/checkout
3. Se logado → formulário com:
   - Resumo do plano escolhido (nome, preço, período)
   - Botão "Pagar com PIX" / "Pagar com Cartão" (redireciona para Asaas)
4. POST para `${API_URL}/billing/checkout` → retorna `asaas_subscription_id`
5. Mostrar instrução de pagamento (QR Code PIX vem do Asaas via redirect ou webhook)

`apps/site/app/checkout/success/page.tsx`:
- "Pagamento recebido! Sua assinatura está sendo ativada."
- Link para abrir o app

### T6 — Páginas legais

`apps/site/app/termos/page.tsx` — Termos de Uso (texto placeholder, TODO: revisar com advogado)
`apps/site/app/privacidade/page.tsx` — Política de Privacidade (texto placeholder)

Conteúdo mínimo:
- Nome do responsável: placeholder `[Nome/Empresa]`
- E-mail de contato: suporte@orcivo.com.br (placeholder)
- Data de vigência: 2026-01-01
- TODO: contratar consultoria jurídica antes do lançamento (Fase 6)

### T7 — Adicionar apps/site ao monorepo

Em `turbo.json`, incluir `@orcivo/site` nas pipelines de build/lint.
Em `pnpm-workspace.yaml`, garantir que `apps/site` está no glob (deve estar com `apps/*`).

## Verification

```bash
# Site compila
cd apps/site && pnpm install && pnpm build

# Páginas existem
ls apps/site/app/{page,planos/page,checkout/page,termos/page,privacidade/page}.tsx

# Nomes de planos corretos
grep "Orcivo Livre\|Orcivo Solo\|Orcivo Mais\|Orcivo Equipe" apps/site/app/planos/page.tsx

# Palavra proibida não aparece
grep -i "ilimitado\|FREE\|PRO\|TOP\b" apps/site/app/planos/page.tsx && echo "FALHOU" || echo "OK"
```

## Notes
- O checkout real com Asaas requer `ASAAS_API_KEY` configurado no servidor — sem a key, o fluxo retorna erro 500 controlado
- Termos e Privacidade são placeholders — devem ser revisados antes de lançamento público
- Port 3002 para dev local (web=3001, backend=3000, site=3002)
