---
phase: 3
audit_target: web (fases 1-3) vs design system oficial
status: complete
score_total: 13/24
date: 2026-06-04
---

# UI Audit — Orcivo Web vs Design System

> Auditoria retroativa: código implementado comparado ao design system oficial em
> `docs/design-handoff/orcivo-design-system/`. Sem servidor de desenvolvimento
> ativo — auditoria somente por código.

---

## Score Summary

| Pillar | Score | Verdict |
|--------|-------|---------|
| 1. Copywriting | 3/4 | PASS — linguagem correta, 1 desvio menor |
| 2. Visuals | 2/4 | WARN — sidebar sem seções, ações-rápidas sem ícones Lucide corretos |
| 3. Color | 2/4 | FAIL — site usa `text-gray-*` (Tailwind padrão), não tokens Orcivo |
| 4. Typography | 2/4 | WARN — `globals.css` seta `font-size: 14px` no body mas spec é 16px; h1 inconsistente |
| 5. Spacing | 2/4 | WARN — inputs da app web 40px (`.ov-input`), spec exige 52px; form orçamento 8px de borda-radius em vez de 12px |
| 6. Experience Design | 2/4 | WARN — TopBar sem busca global, sidebar sem footer de usuário, modal de catálogo usa `×` literal |
| **Total** | **13/24** | |

---

## Priority Fix List

| # | Pillar | Screen | File | Fix |
|---|--------|--------|------|-----|
| 1 | Spacing | Todos os inputs da app | `apps/web/app/globals.css:123` | Mudar `.ov-input { height: 40px }` para `height: 52px; border-radius: 12px` |
| 2 | Color | Site (landing + planos) | `apps/site/app/page.tsx`, `apps/site/app/planos/page.tsx` | Substituir todas as classes `text-gray-*`, `border-gray-*`, `bg-gray-*` pelos tokens Orcivo (`text-slate-*` ou variáveis CSS `var(--fg-*)`) |
| 3 | Experience Design | AppSidebar | `apps/web/components/AppSidebar.tsx` | Adicionar seções "Principal" / "Conta" com `nav-section`, footer com avatar+nome+empresa conforme spec `ui_kits/web/Sidebar.jsx:34-46` |

---

## Pillar 1 — Copywriting (3/4)

### Findings

| Screen | File | Severity | Issue | Fix |
|--------|------|----------|-------|-----|
| Sidebar | `AppSidebar.tsx:7` | minor | Spec usa label "Dashboard" mas icon é `LayoutDashboard`; spec usa `home`. Icone diverge (veja Pillar 2). | Trocar icon para `Home` de lucide-react |
| Login | `(auth)/login/page.tsx:39` | minor | Heading diz "Entrar na sua conta" — spec `aw-form-center h1` não fixa o texto; aceitável, mas o spec de auth diz apenas "Entrar". Diferença de tom menor. | Normalizar para "Entrar" se quer seguir o spec exato |
| Clientes detail | `clientes/[id]/ClienteDetail.tsx:105` | minor | Botão "WhatsApp" sem ícone — spec usa `message-circle`; texto genérico sem ícone. | Adicionar `<MessageCircle size={16} />` antes do label |
| Sidebar (spec) | `ui_kits/web/Sidebar.jsx:43` | major (spec violation) | Spec mostra plano do usuário na barra lateral ("Ribeiro Elétrica · PRO"). A implementação usa o nome forbiden "PRO". Mas como o **spec** usa "PRO" (legado), a implementação não expõe esse dado — gap neutro. Orcivo Livre/Solo/Mais/Equipe deve aparecer aqui. | Quando sidebar mostrar plano, usar nomes corretos: `Orcivo Livre`, `Orcivo Solo`, etc. |
| Site planos | `site/app/planos/page.tsx:17-54` | PASS | Planos nomeados corretamente: Orcivo Livre, Solo, Mais, Equipe. Nenhum uso de FREE/PRO/TOP/ilimitado. | — |
| Site planos | `site/app/planos/page.tsx:50` | minor | Feature "Uso amplo de clientes" e "Uso amplo de orçamentos" — linguagem aprovada pelo CLAUDE.md. PASS. | — |
| Signup | `(auth)/signup/page.tsx:141` | PASS | CTA "Criar minha conta grátis" é adequado. | — |

**Diagnóstico geral:** Linguagem pt-BR correta em toda a app web. Nomes de plano corretos na página de planos. Termos de domínio corretos (Cliente, Orçamento, OS). Sem emoji em UI. Score penalizado 1 ponto pelo icon errado na nav (Dashboard usa `LayoutDashboard` não `Home`) e ausência do plano no footer da sidebar.

---

## Pillar 2 — Visuals (2/4)

### Findings

| Screen | File | Severity | Issue | Fix |
|--------|------|----------|-------|-----|
| Sidebar | `AppSidebar.tsx:4` | major | Dashboard usa `LayoutDashboard` — spec define `home`. Catálogo usa `Package` ✓, Financeiro usa `DollarSign` ✓. Mas spec README diz: Home→`home`, Catalog→`package`, Finance→`dollar-sign`. `LayoutDashboard` ≠ `home`. | Trocar `LayoutDashboard` por `Home` de `lucide-react` |
| Sidebar | `AppSidebar.tsx` | major | Sem seções de agrupamento ("Principal" / "Conta"), sem footer com avatar+usuário+empresa. Spec `Sidebar.jsx:33-46` mostra essas seções claramente. | Adicionar `nav-section` "Principal" acima dos itens de negócio e "Conta" antes de Configurações; adicionar footer |
| Sidebar brand mark | `AppSidebar.tsx:29-33` | minor | Logo usa SVG de escudo/shield — spec `Sidebar.jsx:19-21` usa check simples `M 5 12 10 17 19 7`. Visual próximo mas não idêntico. | Alinhar SVG com o da spec |
| TopBar | `TopBar.tsx` | major | Spec `TopBar.jsx` e `styles.css:46-53` mostram barra com campo de busca global e botões de iconbtn (notificações, avatar). Implementação tem apenas nome da empresa + botão Sair. | Adicionar search bar (max-width 480px, `background: var(--slate-50)`) e iconbtns de notificação/perfil conforme spec |
| Auth layout | `(auth)/layout.tsx:5` | minor | Art panel implementado via `AuthArtPanel` (não lido, mas estrutura presente no layout). Grid `1fr 1fr` ao invés de `520px 1fr` do spec `.aw-shell`. Em viewports pequenos o painel de arte pode ficar pequeno. | Mudar para `gridTemplateColumns: '520px 1fr'` conforme `.aw-shell` |
| Empty states | vários | PASS | Todos os screens têm empty state com ícone Lucide + texto descritivo + CTA. Padrão correto. | — |
| Loading states | vários | minor | Não há skeleton loaders visíveis no código; páginas server-side não têm suspense boundary explícita. | Adicionar `<Suspense fallback={<SkeletonTable />}>` nas páginas list |
| Formulário orçamento | `orcamentos/novo/NovoOrcamentoForm.tsx:149` | minor | Modal de catálogo fecha com botão `×` (caracter literal `×`) — spec não define esse padrão. Deve usar `<X size={18} />` de Lucide. | Substituir por `<X size={18} />` |

---

## Pillar 3 — Color (2/4)

### Findings

| Location | File | Severity | Issue | Fix |
|----------|------|----------|-------|-----|
| Site landing | `site/app/page.tsx:8,22,48,76` | major | Usa `text-gray-900`, `text-gray-600`, `border-gray-100`, `bg-gray-50`, `bg-gray-100` — paleta Tailwind genérica, não tokens Orcivo slate. O design system define `--slate-900`, `--slate-50`, etc. As cores numéricas de `gray` e `slate` do Tailwind diferem levemente. | Substituir todas as ocorrências de `gray-*` por equivalentes `slate-*` do Tailwind, ou usar variáveis CSS Orcivo |
| Site planos | `site/app/planos/page.tsx:76,108,113` | major | Mesmos problemas: `bg-gray-100`, `text-gray-900`, `border-gray-200`. | Mesmo fix acima |
| Site planos highlight | `site/app/planos/page.tsx:101` | minor | `shadow-primary-100` — essa classe Tailwind não é definida em `tailwind.config.ts` (só `primary.50/100/500/600/700` definidos). Shadow pode ficar inerte. | Usar `shadow-[0_4px_12px_theme(colors.primary.100)]` ou definir shadow no config |
| App globals | `apps/web/app/globals.css:73` | minor | `body { background: var(--slate-50) }` — OK, alinhado com spec (app usa `slate-50` como fundo de página). | — (correto) |
| App globals | `apps/web/app/globals.css:100-103` | PASS | `.ov-btn-primary { background: var(--purple-600) }` correto. | — |
| Hardcoded `#6B7280` | `NovoOrcamentoForm.tsx:149,289` | minor | Cor hardcoded `#6B7280` (Tailwind gray-500 ≠ `--slate-500` `#64748B`). Diferença de 2 pontos em azul — sutil mas tecnicamente fora de spec. | Trocar por `var(--fg-3)` que mapeia para `--slate-500` |
| Auth pages | `login/page.tsx:32,42` | minor | `#64748B` (--slate-500) hardcoded OK — mas poderia usar `var(--fg-3)`. Não é bug visual, só falta de semântica. | Opcional: usar `var(--fg-3)` |
| Focus ring | Nenhum arquivo CSS de app | major | `globals.css` não define `:focus-visible` global para inputs. A spec exige `outline: 2px solid var(--purple-600); box-shadow: var(--shadow-focus)`. `.ov-input:focus` está definido mas inputs inline (login, signup, formulário orçamento) usam `outline: none` sem substituição. | Adicionar em `globals.css`: `input:focus-visible { outline: none; border-color: var(--purple-600); box-shadow: var(--shadow-focus); }` |

---

## Pillar 4 — Typography (2/4)

### Findings

| Location | File | Line | Severity | Issue | Fix |
|----------|------|------|----------|-------|-----|
| globals.css body | `apps/web/app/globals.css` | 75-76 | major | `font-size: 14px; line-height: 20px` — spec define `--t-body: 16px` / `--t-body-lh: 24px` para body. A implementação encolheu o body para 14px. Isso afeta todos os textos de parágrafo. | Mudar para `font-size: 16px; line-height: 24px` (ou aceitar 14px como choice deliberada e documentar) |
| Dashboard h1 | `dashboard/page.tsx` | 57 | minor | `fontSize: 24` hardcoded. Spec `--t-h2: 24px` OK para seção, mas spec web `page-header h1` também é 24px — consistente com a spec do kit, mas `--t-h1: 28px`. A convenção do kit usa 24 para page titles. Aceitável. | — |
| Login h1 | `login/page.tsx` | 39 | minor | `fontSize: 26` — spec `.aw-form-center h1` define `30px`. Diferença de 4px no heading principal da auth. | Mudar para `fontSize: 30` |
| Signup h1 | `signup/page.tsx` | 79 | minor | `fontSize: 24` — mesma spec `.aw-form-center h1: 30px`. | Mudar para `fontSize: 30` |
| Site h1 | `site/app/page.tsx` | 22 | minor | `text-4xl` (36px) / `sm:text-5xl` (48px) — spec `--t-display: 32px`. Site pode usar `display` size mas o Tailwind 4xl/5xl excede. Aceitável para marketing; não é crítico. | — |
| `.ov-metric .value` | `globals.css` | 203 | PASS | `28px / 36px / 700` — correto, alinhado com spec de KPI cards. | — |
| Tabular nums | várias tabelas | PASS | Uso correto de `font-variant-numeric: tabular-nums` em colunas de valor e número. | — |
| Label weight | `globals.css:143` | minor | `.ov-label { font-weight: 500 }` — spec `.t-label` é `font-weight: var(--fw-medium)` (500). PASS. | — |

---

## Pillar 5 — Spacing (2/4)

### Findings

| Location | File | Line | Severity | Issue | Spec value | Actual value | Fix |
|----------|------|------|----------|-------|-----------|--------------|-----|
| `.ov-input` height | `globals.css` | 123 | **CRITICAL** | Inputs da app web têm height 40px. Spec auth.css `.auth-input` e forms.css exigem 52px. Todos os inputs nas telas de app (busca, selects, filtros) ficam 12px mais baixos que o design. | `52px` | `40px` | Mudar `.ov-input { height: 40px }` → `height: 52px; border-radius: 12px` |
| `.ov-btn` height | `globals.css` | 103 | **CRITICAL** | Botões da app têm height 38px. Spec `.auth-btn` é 52px para CTAs primários. O design system web kit `btn` usa 38px para botões compactos — mas os CTAs primários como "Novo orçamento" devem ter 52px. | `52px` (CTAs primários) | `38px` | Criar `.ov-btn-lg { height: 52px; font-size: 16px }` para CTAs de ação principal |
| Form orçamento inputs | `NovoOrcamentoForm.tsx` | 401 | major | `inputStyle: { borderRadius: 8 }` — spec `.auth-input { border-radius: 12px }` e tokens `--radius-md: 12px`. Borda-radius 8px em vez de 12px. | `12px` | `8px` | Mudar `borderRadius: 8` → `borderRadius: 12` em `inputStyle` |
| Sidebar width | `AppSidebar.tsx` | 21 | minor | `width: 260` — spec `--sidebar-w: 260px`. PASS. | `260px` | `260px` | — |
| TopBar height | `TopBar.tsx` | 14 | PASS | `height: 64` — spec `--header-h: 64px`. Correto. | `64px` | `64px` | — |
| Page padding | `globals.css` | 80 | PASS | `.ov-page { padding: 24px 32px }` — spec `--web-page-pad: 32px`. Aceitável. | `24-32px` | `24px 32px` | — |
| Auth layout form col | `(auth)/layout.tsx` | 13-16 | minor | Padding `40px 32px` — spec `.aw-form-col` usa `32px 48px`. Diferença de 16px nas laterais. | `32px 48px` | `40px 32px` | Mudar para `padding: '32px 48px'` |
| Cliente detail breadcrumb | `clientes/[id]/ClienteDetail.tsx` | 73 | minor | Breadcrumb inline com `height: 48px` — spec `.app-tb { height: 56px }`. Diferença de 8px. | `56px` | `48px` | Mudar para `height: 56` |
| Auth grid layout | `(auth)/layout.tsx` | 5 | major | `gridTemplateColumns: '1fr 1fr'` — spec `.aw-shell { grid-template-columns: 520px 1fr }`. O painel de arte deveria ser fixo em 520px, não 50%. | `520px 1fr` | `1fr 1fr` | Mudar para `gridTemplateColumns: '520px 1fr'` |

---

## Pillar 6 — Experience Design (2/4)

### Findings

| Screen | File | Severity | Issue | Fix |
|--------|------|----------|-------|-----|
| TopBar | `TopBar.tsx` | major | Sem busca global, sem botão de notificações, sem avatar do usuário. Spec `styles.css:41-53` e `TopBar.jsx` mostram barra completa: campo de busca (max-w 480px) + iconbtns. Implementação tem apenas nome da empresa e botão Sair. | Implementar busca global e iconbtns conforme spec |
| Sidebar footer | `AppSidebar.tsx` | major | Sem footer de usuário (avatar + nome + empresa + plano). Spec `Sidebar.jsx:38-46` e `styles.css:35-38` definem footer com avatar, nome e plano. | Adicionar div.footer com avatar, nome do usuário e nome da empresa/plano |
| Sidebar seções | `AppSidebar.tsx` | major | Sem agrupamentos "Principal" e "Conta". Spec `Sidebar.jsx:25,34` usa `nav-section` para separar os grupos de navegação. | Adicionar elementos de seção antes dos grupos |
| Modal catálogo | `NovoOrcamentoForm.tsx:149` | minor | Botão de fechar usa `×` literal (caracter de multiplicação) com fontSize 20 e cor `#6B7280`. Spec usa ícone `<X />` de Lucide. | Substituir por `<X size={18} color="var(--slate-600)" />` |
| Formulário orçamento | `NovoOrcamentoForm.tsx` | minor | Botão "Cancelar" como texto genérico. Spec CLAUDE.md proíbe "Cancel" mas permite contextual. Aceitável em pt-BR como "Cancelar". | — |
| Loading skeleton | todos os pages list | minor | Nenhum skeleton de carregamento definido. Servidor Next.js resolve antes de mostrar, mas se API demorar, tela fica em branco. | Adicionar `loading.tsx` com skeleton `<div className="sk">` conforme `states.css:95-99` |
| Confirmação destrutiva | `clientes/[id]/ClienteDetail.tsx:105-112` | minor | Botões de ação rápida (WhatsApp, Ligar, Agendar) são `<button>` sem handler — placeholder OK para fase atual. | Implementar handlers ou desabilitar com `disabled` e tooltip |
| Active state sidebar | `AppSidebar.tsx:48` | PASS | Fundo `#F5F3FF` (purple-50) e cor `#6D28D9` para item ativo — alinhado com `.nav-item.active { background: var(--purple-50); color: var(--purple-800) }`. | — |
| Tabelas hover | `globals.css:170` | PASS | `.ov-table tbody tr:hover td { background: var(--slate-50) }` — correto. | — |
| Error inline | `login/page.tsx:95` | PASS | Mensagem de erro em vermelho `#DC2626` com `fontSize: 13`. Correto. | — |
| Badges status | `OrcamentosContent.tsx:17-24` | PASS | STATUS_BADGE mapeia corretamente para `slate/warning/success/danger`. | — |

---

## Resumo dos defeitos críticos (por impacto visual)

1. **Input height 40px vs 52px** — afeta toda a app web. Visualmente os formulários parecem compactos demais. Um dev pode consertar em 1 linha em `globals.css`.

2. **Site usa paleta `gray-*` (Tailwind) não `slate-*` (Orcivo)** — cores sutilmente diferentes do design system. Qualquer comparação com a landing page parece "off-brand".

3. **Auth layout `1fr 1fr` vs `520px 1fr`** — em viewports de 1024px o painel de arte fica com apenas 512px, perdendo a proporção planejada.

4. **TopBar sem busca global e sem avatar** — a barra superior parece vazia e incompleta vs. o spec.

5. **Sidebar sem seções e sem footer de usuário** — dá sensação de protótipo inacabado.

6. **Login/signup h1 26-24px vs 30px** — heading menor que o especificado na tela de auth.

---

## Files Audited

**Design system (source of truth)**
- `docs/design-handoff/orcivo-design-system/colors_and_type.css`
- `docs/design-handoff/orcivo-design-system/screens/auth.css`
- `docs/design-handoff/orcivo-design-system/screens/forms.css`
- `docs/design-handoff/orcivo-design-system/screens/public.css`
- `docs/design-handoff/orcivo-design-system/screens/states.css`
- `docs/design-handoff/orcivo-design-system/README.md`
- `docs/design-handoff/orcivo-design-system/ui_kits/web/styles.css`
- `docs/design-handoff/orcivo-design-system/ui_kits/web/Sidebar.jsx`

**Implementation**
- `apps/web/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/components/AppSidebar.tsx`
- `apps/web/components/TopBar.tsx`
- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/app/(app)/clientes/ClientesContent.tsx`
- `apps/web/app/(app)/clientes/[id]/ClienteDetail.tsx`
- `apps/web/app/(app)/orcamentos/OrcamentosContent.tsx`
- `apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx`
- `apps/web/app/(app)/catalogo/CatalogoContent.tsx`
- `apps/web/app/(app)/ordens-de-servico/OSContent.tsx`
- `apps/site/app/page.tsx`
- `apps/site/app/planos/page.tsx`

**Screenshots:** não capturados (servidor de desenvolvimento não detectado).
