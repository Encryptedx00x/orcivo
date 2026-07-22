# Phase 2a — Design Fidelity Audit

**Data:** 2026-05-23
**Auditor:** GSD UI Auditor
**Baseline:** Design system oficial Orcivo (`colors_and_type.css`, `README.md`, `AuthWeb.jsx`, `FormsWeb.jsx`)
**Escopo:** 19 telas/componentes web implementados na Fase 2
**Screenshots:** não capturados (servidor de dev não detectado — auditoria por código)

---

## Padrões de referência (resumo para leitura rápida)

| Token | Valor esperado |
|-------|---------------|
| Primary | `#6D28D9` (`--purple-600`) |
| Fundo de página | `#FFFFFF` (`--bg`) |
| Fundo de cards | `#FFFFFF` com borda `1px #E2E8F0` (`--slate-200`) |
| Fundo de cards (app) | `#FFFFFF` — resting sem sombra |
| Tinta principal | `#0A0A0F` (`--ink`) |
| Texto secundário | `#334155` (`--slate-700`, alias `--fg-2`) |
| Texto terciário | `#64748B` (`--slate-500`, alias `--fg-3`) |
| Fonte | Inter (web) |
| Sidebar width | 260px |
| Header height | 64px |
| Web page padding | 32px |
| Border radius inputs | 12px (`--radius-md`) |
| Border radius cards | 16px (web) / 12px (mobile) |
| Border radius botões | 12px ou pill — **não** 8px |
| Ícones | Lucide only, stroke 1.75, sem fill |
| Layout auth | split 50/50: painel arte escuro + coluna form branca |
| Border foco | 2px `#6D28D9` + 4px halo `#DDD6FE` |

---

## 1. Login

| Campo | Valor |
|-------|-------|
| Status atual | MVP genérico |
| Referência | `AuthWeb.jsx` — `WebLogin()`, `Lote A - Auth & Onboarding.html` |
| Prioridade | P0 |

### Principais diferenças

1. **Layout — ausência do painel de arte escuro (P0):** O design especifica um `aw-shell` com dois filhos: painel esquerdo escuro com glyph Orcivo, headline e testemunho de cliente (`AwArt`), e coluna direita branca com o formulário. A implementação exibe apenas a coluna do formulário centralizada na tela branca, sem qualquer painel de marca.

2. **Inputs sem ícone leading (P1):** O spec define `auth-input-wrap` com `<span class="leading">` contendo um ícone Lucide (`mail`, `lock`). A implementação usa `<input>` simples sem ícones.

3. **Ausência do campo "Manter conectado" (P1):** O spec inclui um checkbox "Manter conectado neste computador". Ausente na implementação.

4. **Ausência do link "Esqueci minha senha" (P1):** Previsto ao lado do label de senha. Ausente.

5. **Título errado (P1):** Spec: `"Entrar na sua conta"` com subtítulo `"Bom te ver de novo."`. Implementação: apenas `"Entrar"`, sem subtítulo.

6. **Border radius dos inputs — 8px vs 12px (P1):** `borderRadius: 8` em todos os inputs. O design token `--radius-md` é 12px.

7. **Border radius do botão — 8px vs 12px ou pill (P1):** `borderRadius: 8`. Spec usa `--radius-md` (12px) ou `--radius-pill` para botões primários.

8. **Foco não fiel (P1):** Inputs sem `focus:ring-2 focus:ring-purple-600/50` ou `outline: 2px solid #6D28D9`. Browser default ativo.

9. **Rodapé ausente (P2):** Spec inclui `© 2026 Orcivo · Termos · Privacidade · Suporte`. Ausente.

10. **Hardcoded `#E5E7EB` como borda dos inputs (P2):** O token correto é `--border-1` = `#E2E8F0` (`--slate-200`). A diferença é sutil mas inconsistente (`#E5E7EB` é `gray-200` de Tailwind, não do design system Orcivo).

### Ação necessária

Reimplementar `login/page.tsx` com layout split 50/50: painel `aw-art` escuro à esquerda (fundo `#0A0A0F`, logo wordmark Orcivo em branco/roxo, headline e testemunho), coluna branca à direita com o formulário correto. Adicionar ícones Lucide nos inputs, link "Esqueci minha senha", checkbox "Manter conectado", subtítulo. Corrigir radii para 12px. Adicionar focus ring `outline: 2px solid #6D28D9; outline-offset: 2px`.

---

## 2. Signup

| Campo | Valor |
|-------|-------|
| Status atual | MVP genérico |
| Referência | `AuthWeb.jsx` — `WebSignup()`, `WebCreateCompany()` |
| Prioridade | P0 |

### Principais diferenças

1. **Ausência do painel de arte (P0):** Mesmo problema do login — sem painel esquerdo escuro com headline e testemunho.

2. **Título divergente (P1):** Spec: `"Criar sua conta"` com subtítulo `"Em 1 minuto você já está fazendo seu primeiro orçamento."`. Implementação: `"Criar conta"` sem subtítulo.

3. **Inputs sem ícones leading (P1):** Spec define ícones `user`, `mail`, `phone`, `lock` nos respectivos campos.

4. **Step 2 — nome do campo errado (P1):** Campo exibe placeholder `"Nome da empresa"` (referência ao banco de dados). O spec usa label `"Nome da empresa"` com leading icon `building`. Semântica ok, mas sem ícone e sem label separado visível.

5. **Ausência de barra de progresso do wizard (P1):** O spec inclui indicador de passo (círculos ou barra `"1 → 2"`) acima do formulário. A implementação usa apenas texto `"Passo 1 de 2"` em estilo inline cinza.

6. **Radii — 8px vs 12px (P1):** Mesmos problemas que o login.

7. **Termos de uso — aceite sem checkbox visível no UI (P1):** A implementação força `accepted_terms: true` no payload sem exibir checkbox para o usuário confirmar. O spec prevê checkbox de termos.

### Ação necessária

Reimplementar com layout split 50/50. Adicionar subtítulo, ícones, barra de wizard visual, checkbox de termos visível e clicável. Corrigir radii.

---

## 3. Auth Layout

| Campo | Valor |
|-------|-------|
| Status atual | MVP genérico |
| Referência | `AuthWeb.jsx` — `aw-shell` |
| Prioridade | P0 |

### Principais diferenças

1. **Layout centralizado vs split (P0):** `layout.tsx` renderiza `min-h-screen flex items-center justify-center bg-white` — centraliza o card filho. O spec exige um shell `display: grid; grid-template-columns: 1fr 1fr` (ou `55% 45%`) que ocupe 100vw e 100vh.

2. **Sem passagem de contexto ao painel de arte (P0):** O layout precisa renderizar o `AwArt` diretamente ou aceitar props para personalizar headline/testemunho por rota.

### Ação necessária

Refatorar `(auth)/layout.tsx` para grid 50/50. Mover lógica do painel de arte para componente `AuthArtPanel` reutilizável (headline e testemunho como props). Cada rota (login, signup) passa o conteúdo correto via slot ou prop.

---

## 4. App Shell — Layout, Sidebar, TopBar

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `ui_kits/web/` — sidebar, header |
| Prioridade | P1 |

### Principais diferenças

**Sidebar (`AppSidebar.tsx`)**

1. **Logo — texto puro vs wordmark gráfico (P1):** A implementação renderiza `<div>Orcivo</div>` em `#6D28D9 font-size:20px font-weight:700`. O spec exige o wordmark SVG (arquivo em `assets/`). Se o SVG não existir ainda, ao menos usar logo com marca tipográfica e glyph lado a lado.

2. **Active indicator — border-right vs background pill (P1):** Implementação usa `borderRight: '3px solid #6D28D9'` como indicador de item ativo. O spec usa fundo `--purple-50` com texto `--purple-600` e **sem** barra vertical — ou fundo + barra interna ao item (pill arredondado). A barra à direita não está no spec.

3. **Padding lateral dos links — 20px vs 24px (P2):** `padding: '10px 20px'`. O token `--web-page-pad` é 32px; para sidebar interna o spec usa `24px` como padding lateral dos nav items.

4. **Ícones — size 18 vs 20 (P2):** Spec: 20px para ícones em botões/nav. Implementação usa `size={18}`.

5. **Texto do nav — font-weight 400 vs 500 para inativo (P2):** O spec usa `--fw-medium` (500) para todos os itens de nav, reservando 600 para o ativo.

6. **Cor do texto inativo — `#374151` vs `--slate-700` `#334155` (P2):** Diferença de 2 hexdígitos; usar o token do design system.

7. **Sem seção de usuário/empresa no rodapé da sidebar (P1):** O spec inclui bloco inferior com avatar/nome do usuário e badge de plano atual. Ausente.

**TopBar (`TopBar.tsx`)**

8. **Sem conteúdo central / barra de busca (P1):** O spec prevê campo de busca global ou breadcrumb na topbar. Implementação mostra só nome da empresa à esquerda e botão "Sair" à direita.

9. **Botão "Sair" sem ícone (P2):** Deveria usar Lucide `log-out` size 16.

10. **Sem sino de notificações (P2):** Spec inclui `bell` icon à direita antes do avatar.

**App Layout (`(app)/layout.tsx`)**

11. **Fundo do main — `#F9FAFB` vs `#FFFFFF` (P1):** O spec define `--bg: #FFFFFF` como fundo de página. O fundo `slate-50` (`#F8FAFC`) é tolerável para mobile list screens, mas no web o fundo da área de conteúdo deve ser `#FFFFFF`. O valor usado `#F9FAFB` é `gray-50` de Tailwind, não exatamente `--slate-50` (`#F8FAFC`) e não é o canônico para web.

12. **Padding do main — 24px vs 32px (P1):** `padding: 24`. O token `--web-page-pad` é 32px.

### Ação necessária

- Sidebar: substituir texto por wordmark SVG; mudar active indicator para fundo pill; ajustar padding para 24px; ícones para 20px; adicionar bloco de usuário/plano no rodapé.
- TopBar: adicionar breadcrumb ou busca; ícone de sino; avatar de usuário com dropdown.
- Layout: mudar `padding` do main para 32px; fundo para `#FFFFFF`.

---

## 5. Dashboard

| Campo | Valor |
|-------|-------|
| Status atual | MVP genérico |
| Referência | `ui_kits/web/` — dashboard |
| Prioridade | P1 |

### Principais diferenças

1. **Conteúdo vazio — placeholder de "Em construção" (P1):** Exibe apenas `"Em construção — disponível em breve."` em cinza. Não é nem um empty state bem-formado — falta o padrão de design system (ícone + statement + sugestão de ação).

2. **Título "Início" vs "Dashboard" ou saudação personalizada (P2):** O spec de web dashboard sugere saudação com nome do usuário e resumo do dia.

3. **Ausência de KPI cards (P1):** O spec prevê cards com: total de orçamentos pendentes, receita do mês, OS abertas, próximo agendamento.

4. **Cor do texto de placeholder — `#6B7280` (P2):** Deve ser `--fg-3` = `#64748B` (`--slate-500`).

### Ação necessária

Implementar dashboard mínimo com 4 KPI cards (dados reais do backend), lista de orçamentos recentes e OSs abertas. Seguir layout do `ui_kits/web/` se disponível. Empty state se não houver dados: ícone Lucide + frase no padrão do design system.

---

## 6. Lista de Clientes

| Campo | Valor |
|-------|-------|
| Status atual | MVP genérico |
| Referência | `ui_kits/web/` — customer list |
| Prioridade | P1 |

### Principais diferenças

1. **Empty state genérico (P1):** Exibe `"Nenhum cliente cadastrado ainda."` como `<p>` puro em `#6B7280`. O spec define o padrão: ícone centralizado + statement + sugestão + CTA link. Falta o ícone Lucide `users`, falta o segundo parágrafo com sugestão de ação, falta o botão "Cadastrar primeiro cliente".

2. **Tabela sem borda/card externo (P1):** `<table>` com `borderRadius: 8, overflow: 'hidden'` mas sem o wrapper `<div>` com `border: '1px solid #E2E8F0'`. O border-color `#E5E7EB` não é o token canônico (`--border-1` = `#E2E8F0`).

3. **Radius 8px vs 12px (P2):** O card que envolve a tabela deveria ter `borderRadius: 12px` (`--radius-md`).

4. **Falta de coluna "E-mail" e "Cidade" (P2):** A interface Customer na página inclui apenas `id, name, phone`. O spec de tela lista mais campos. Pode ser MVP aceitável, mas diverge do spec.

5. **Botão "Novo cliente" sem ícone Lucide `plus` (P2):** O texto `"+ Novo cliente"` usa o caractere `+` (Unicode) em vez de `<Plus size={16} />` de Lucide.

6. **Tabela sem hover state nas linhas (P2):** Linhas sem `cursor: pointer` nem `hover:bg-slate-50`.

### Ação necessária

Adicionar ícone Lucide `plus` no botão. Substituir empty state por padrão completo (ícone + 2 linhas + CTA). Corrigir border-color para `#E2E8F0`. Corrigir radius para 12px. Adicionar hover state nas linhas com link para o detalhe.

---

## 7. Novo Cliente (Formulário)

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `FormsWeb.jsx`, `Lote B - Formularios e captura.html` |
| Prioridade | P1 |

### Principais diferenças

1. **Sem card/wrapper visual (P1):** O formulário renderiza campos diretamente no fundo da página sem card branco com borda. Todos os outros formulários do app (catálogo, orçamento) usam `backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: 28`. Este está inconsistente.

2. **Sem labels visíveis acima dos inputs (P1):** Usa apenas `placeholder`. O design system define label `<label>` explícito acima de cada input, com `--t-caption` ou `--t-small` e `--fw-medium`. Placeholders desaparecem ao digitar, prejudicando UX e acessibilidade.

3. **Radii — 8px vs 12px (P1):** Mesmos problemas.

4. **Sem título de seção com breadcrumb de navegação (P2):** Catálogo/Novo e OS/Detalhe têm breadcrumb. Clientes/Novo não tem — usa apenas `<h1>Novo cliente</h1>` sem link de retorno.

5. **maxWidth 480px vs 580px (P2):** Catálogo usa 580px como `maxWidth` do card. Clientes usa 480px. Inconsistência entre formulários.

### Ação necessária

Envolver formulário em card branco com borda. Adicionar labels explícitos acima de cada campo. Adicionar breadcrumb "Clientes / Novo cliente" no topo. Unificar maxWidth para 580px. Corrigir radii.

---

## 8. Catálogo — Lista

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `ui_kits/web/` — catalog list |
| Prioridade | P1 |

### Principais diferenças

1. **Badge "Produto" usa azul (`#1D4ED8` / `#DBEAFE`) (P0 de identidade de marca):** O badge de tipo usa `DBEAFE/1D4ED8` (azul) para "Produto" e `EDE9FE/6D28D9` (roxo) para "Serviço". O design system proíbe explicitamente o uso de azul `#2563EB`/`#1D4ED8` como cor de marca. Badges de tipo devem usar variações do slate ramp ou diferenciar por forma, não introduzindo uma segunda cor de marca não declarada.

2. **Radius dos cards — 8px vs 12px (P1).**

3. **Border color — `#E5E7EB` vs `#E2E8F0` (P2):** Ver padrão acima.

4. **Empty state — `backgroundColor: '#F9FAFB'` vs `#FFFFFF` com borda (P2):** Empty states de catálogo e orçamentos usam fundo cinza-claro (`#F9FAFB`) em vez de card branco. O spec define card branco com borda `--border-1`.

5. **Icon Package no empty state — color `#D1D5DB` (P2):** Deve ser `--fg-disabled` = `#94A3B8` (`--slate-400`), não `gray-300`.

### Ação necessária

Substituir azul (`#DBEAFE/1D4ED8`) no badge "Produto" por slate: `backgroundColor: '#F1F5F9', color: '#475569'` (slate-100 / slate-600). Corrigir radii e border-color. Mudar empty state para card branco.

---

## 9. Novo Item de Catálogo / Editar Item

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `FormsWeb.jsx` — form layout |
| Prioridade | P1 |

### Principais diferenças

1. **Radius card — 8px vs 12px (P1):** `borderRadius: 8` no card wrapper.

2. **Radius inputs — 8px vs 12px (P1):** `inputStyle` usa `borderRadius: 8`.

3. **Label color — `#374151` vs `--fg-2` `#334155` (P2):** `labelStyle` usa `color: '#374151'` (Tailwind `gray-700`). Token correto é `--slate-700` `#334155`.

4. **Botão secundário "Cancelar" — fundo `#F3F4F6` vs `#FFFFFF` com borda (P2):** O spec para botão secundário é: fundo branco, borda `--border-1`, texto `--fg-1`. Fundo cinza é "ghost" level mais pesado.

5. **Mensagem de ajuda de preço — "Use vírgula ou ponto" (P2):** Texto funcional mas não segue o tom do design system (poderia ser mais direto: "Ex: 150,00"). Não é bloqueador.

6. **Sem mensagem de erro de Server Action (P1):** As actions de criação/edição de catálogo não exibem erro ao usuário em caso de falha — a page simplesmente redireciona ou silencia. O spec exige feedback de erro visível.

### Ação necessária

Corrigir radii para 12px (card e inputs). Corrigir label color para `#334155`. Botão secundário: fundo branco + borda `#E2E8F0`. Adicionar display de erro para falhas de Server Action (via `useActionState` ou `searchParams` de redirect com `?error=...`).

---

## 10. Orçamentos — Lista

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `ui_kits/web/` — quote list |
| Prioridade | P1 |

### Principais diferenças

1. **Status badge "Em andamento" da OS usa azul `#DBEAFE/1E40AF` (P0 de marca):** Não aparece na lista de orçamentos em si, mas o padrão de badge azul vaza do módulo de OS para o mesmo contexto de componentes. Aqui, a lista de orçamentos usa paleta correta (amarelo, verde, vermelho, cinza) — status de orçamentos está fiel.

2. **Empty state padrão inconsistente — fundo cinza vs branco (P1):** Mesmo problema do catálogo.

3. **Radius card e table wrapper — 8px vs 12px (P1).**

4. **Border color — `#E5E7EB` (P2).**

5. **Sem paginação visual (P2):** `quoteService.fetchQuotes(1)` busca página 1 mas não há controle de paginação na UI.

6. **Coluna "Criado em" sem tempo — apenas data (P2):** Tolerável para lista, mas o detalhe mostra data e hora. Consistente.

### Ação necessária

Corrigir radii e border-color. Mudar empty state para card branco. Adicionar paginação básica se a API retornar `meta.total_pages > 1`.

---

## 11. Novo Orçamento (Formulário)

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `FormsWeb.jsx`, `ui_kits/web/` — quote editor |
| Prioridade | P1 |

### Principais diferenças

1. **Card radius — 8px vs 12px (P1):** `card` style usa `borderRadius: 8`.

2. **Input border-radius — 6px vs 12px (P1):** `inputStyle` define `borderRadius: 6` — mais distante ainda do token de 12px.

3. **Input border color — `#D1D5DB` vs `#E2E8F0` (P1):** `inputStyle` usa `border: '1px solid #D1D5DB'` (`gray-300`). O token correto é `--border-1` = `#E2E8F0` (`--slate-200`).

4. **Label font-weight 500 vs 600 (P2):** `labelStyle` usa `fontWeight: 500`. O spec define labels com `--fw-semibold` (600) para formulários de entrada.

5. **Dialog do catálogo sem backdrop correto (P2):** `rgba(0,0,0,0.4)` — o spec define `rgba(10,10,15,0.5)` para scrims.

6. **Botão secundário border — `#D1D5DB` vs `#E2E8F0` (P2).**

7. **Total em roxo `#6D28D9` — correto (ok):** A linha de total usa `color: '#6D28D9'` e `fontWeight: 700` — fiel ao spec de dinheiro em destaque.

8. **Sem indicação de carregamento de customers/catalog (P1):** `useEffect` busca customers e catalog, mas enquanto carrega o `<select>` de cliente exibe apenas `"Selecione um cliente"` sem skeleton ou texto "Carregando...".

### Ação necessária

Corrigir todos os radii para 12px. Corrigir border-color de inputs para `#E2E8F0`. Corrigir scrim para `rgba(10,10,15,0.5)`. Adicionar estado de loading nos selects de cliente e catálogo. Labels com `fontWeight: 600`.

---

## 12. Detalhe do Orçamento

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `ui_kits/web/` — quote detail |
| Prioridade | P1 |

### Principais diferenças

1. **Radius — 8px vs 12px (P1):** Todos os cards internos.

2. **Border color — `#E5E7EB` vs `#E2E8F0` (P1).**

3. **Botão "Iniciar OS" com cor azul `#1D4ED8` (P0 de marca) — em WorkOrderDetail.tsx:** Esse item se repete no detalhe de OS (ver item 14 abaixo).

4. **Uso de `parseFloat` no cálculo de desconto (P1 — técnico/semântico):** `parseFloat(quote.discount_value) / 100` na linha 172. O design system e CLAUDE.md proíbem `number`/`float` para dinheiro. Deve usar `Decimal.js` ou `multiplyDecimal` consistentemente.

5. **Link de aprovação em `<input readOnly>` — sem botão de copiar (P2):** O spec prevê botão "Copiar link" ao lado do input. Apenas clicar para selecionar é funcional mas abaixo do spec.

6. **Botão WhatsApp com `backgroundColor: '#25D366'` (P2):** Cor do WhatsApp brand. O spec define `message-circle` com "green tint" — `#25D366` é aceitável mas não é um token do design system. Deve ser documentado como exceção de marca de terceiro.

### Ação necessária

Corrigir radii e border-color. Remover `parseFloat` — usar `multiplyDecimal`. Adicionar botão "Copiar link" ao lado do input de aprovação. Corrigir botão "Iniciar OS" para não usar azul (ver OS abaixo).

---

## 13. Ordens de Serviço — Lista

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `ui_kits/web/` — OS list |
| Prioridade | P1 |

### Principais diferenças

1. **Badge "Em andamento" usa azul `#DBEAFE/1E40AF` (P0 de marca):** `statusBadgeStyle` define `IN_PROGRESS: { backgroundColor: '#DBEAFE', color: '#1E40AF' }`. Azul é proibido como cor de marca secundária. Deve usar slate ou amber para "em andamento": `{ backgroundColor: '#FEF3C7', color: '#92400E' }` (warning/amber) ou `{ backgroundColor: '#E2E8F0', color: '#334155' }` (slate neutro).

2. **Sem botão de nova OS na lista (P1):** A lista não tem CTA de criação (é esperado — OSs são criadas no mobile). Mas o empty state deveria explicar isso mais claramente.

3. **Empty state — texto ok, mas sem padrão de card branco (P1):** `backgroundColor: '#F9FAFB'` em vez de card branco com borda.

4. **Radius — 8px vs 12px (P1).**

5. **Border color — `#E5E7EB` vs `#E2E8F0` (P2).**

### Ação necessária

Substituir azul do badge `IN_PROGRESS` por amber (`#FEF3C7/92400E`) — que já é usado para `SENT` nos orçamentos, criando consistência semântica "atenção/pendente". Corrigir radius e border. Empty state: card branco.

---

## 14. Detalhe de OS (WorkOrderDetail)

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `OPERATIONS_UI_MISSING_SPECS.md`, `ui_kits/web/` |
| Prioridade | P1 |

### Principais diferenças

1. **Botão "Iniciar OS" usa azul `#1D4ED8` (P0 de marca):** `backgroundColor: '#1D4ED8'` no botão de ação principal de status `PENDING`. Toda ação primária deve usar `#6D28D9` (`--purple-600`). Azul é explicitamente proibido pelo CLAUDE.md ("Primary: `--purple-600` `#6D28D9` — sobrepõe qualquer referência a azul `#2563EB` em docs antigos").

2. **Botão "Concluir" usa verde `#065F46` (P1):** O verde é o token `--success` (`#16A34A`), mas `#065F46` é o foreground do badge de sucesso (texto sobre fundo verde), não o fundo do botão. Botão de conclusão deveria usar `--success` `#16A34A` como background com texto branco, ou usar o padrão primário roxo com variação semântica.

3. **Radius — 8px vs 12px (P1):** Cards com `borderRadius: 8`.

4. **Upload de foto — botão label bem executado (ok):** Uso de `<label>` como trigger para `<input type="file" hidden>` com estilo correto em `--purple-50/--purple-600` — fiel ao design system.

5. **Foto thumbnail — sem lightbox ou link para URL completa (P2):** Imagens são mostradas em 120px de altura sem possibilidade de ampliar.

6. **Breadcrumb correto (ok):** ArrowLeft + "Ordens de Serviço" + "/" + "OS #N" — padrão correto.

7. **infoLabel usa `#6B7280` vs `--slate-500` `#64748B` (P2).**

### Ação necessária

Corrigir botão "Iniciar OS": `backgroundColor: '#6D28D9'`. Corrigir botão "Concluir": usar `backgroundColor: '#16A34A'` (success token) ou roxo primário. Corrigir radii. Corrigir `#6B7280` para `#64748B`.

---

## 15. Página de Aprovação Pública (`/approve/[token]`)

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `Lote D - Paginas publicas.html`, `Public.jsx` |
| Prioridade | P0 |

### Principais diferenças

1. **Header sem logo gráfico (P0):** Exibe `<span style={{ color: '#6D28D9' }}>Orcivo</span>` como texto. Tela pública vista pelo cliente final — deve ter wordmark SVG ou ao menos composição glyph + texto mais cuidadosa.

2. **Fundo geral — `bg-gray-50` vs branco (P1):** `className="min-h-screen bg-gray-50"`. O design system define `--bg: #FFFFFF` como fundo de página. `gray-50` é aceitável para mobile list screens mas não para página de aprovação pública (documento formal para o cliente).

3. **Cor dos títulos — `text-gray-900` vs `--ink` `#0A0A0F` (P1):** `h1 className="text-2xl font-bold text-gray-900"`. `gray-900` do Tailwind é `#111827`, não `#0A0A0F`. Diferença perceptível.

4. **Mistura de Tailwind classes com inline styles (P1):** A página usa Tailwind (`bg-white`, `rounded-lg`, `border-gray-200`, `text-gray-500`) enquanto todas as outras telas usam inline styles. Inconsistência de implementação que gera divergência de tokens — `border-gray-200` é `#E5E5E5` vs `#E2E8F0` do design system.

5. **Input de nome com `focus:ring-purple-500` vs `purple-600` (P2):** `focus:ring-2 focus:ring-purple-500`. O token primary é `purple-600` (`#6D28D9`), não `purple-500` (`#8B5CF6`).

6. **Skeleton de loading — pattern correto (ok):** Usa `animate-pulse` com divs cinza — fiel ao spec de "skeleton blocks fading".

7. **Tab ativa com `border-purple-600 text-purple-700` (ok):** Correto segundo spec.

8. **Estado "Aprovado" — `text-gray-900` em vez de `--ink` (P2):** `h1 className="text-2xl font-bold text-gray-900"`.

9. **Frase de sucesso (P1):** `"Orçamento aprovado!"` com exclamação — o design system diz "Never exclamation marks". Corrigir para `"Orçamento aprovado."` ou `"Aprovação registrada com sucesso."`.

10. **Parágrafo de sucesso referencia "nossa equipe" (P1):** `"Em breve nossa equipe entrará em contato."` — o sistema é B2B para técnicos autônomos; "nossa equipe" soa como equipe do Orcivo, não do técnico. Corrigir para `"Em breve o técnico responsável entrará em contato."`.

### Ação necessária

Substituir `<span>Orcivo</span>` por wordmark SVG no header. Mudar fundo para `#FFFFFF`. Padronizar cores de texto para tokens do design system (`#0A0A0F` em vez de `gray-900`). Migrar classes Tailwind de cor para inline style com tokens Orcivo ou usar CSS variables. Corrigir `ring-purple-500` para `ring-purple-600`. Remover exclamação do estado de sucesso. Corrigir texto "nossa equipe".

---

## 16. SignatureCanvas

| Campo | Valor |
|-------|-------|
| Status atual | Parcialmente fiel |
| Referência | `Lote B`, design system — pen-line interaction |
| Prioridade | P2 |

### Principais diferenças

1. **Borda do canvas — `border-gray-300` vs `--border-1` `#E2E8F0` (P2):** Tailwind `border-gray-300` = `#D1D5DB`, mais escuro que o token correto.

2. **Botão "Limpar assinatura" sem estilo Orcivo (P2):** `text-gray-500 underline` — funcionalmente ok mas deveria ser um link estilizado com `color: #6D28D9` (link primário) ou botão ghost mínimo.

3. **Canvas sem placeholder guia (P2):** O spec prevê uma linha pontilhada ou texto "Assine aqui" dentro do canvas antes do primeiro traço.

4. **Stroke color `#0A0A0F` (ok):** Correto — usa `--ink` para o traço da assinatura.

5. **Touch support implementado (ok):** `onTouchStart`, `onTouchMove`, `onTouchEnd` — correto.

### Ação necessária

Corrigir `border-gray-300` para `#E2E8F0`. Estilizar botão "Limpar" com cor do link Orcivo. Adicionar texto placeholder no canvas.

---

## Resumo de Prioridades

### P0 — Crítico (implementar agora)

Estas issues afetam identidade de marca em telas visíveis externamente ou introduzem azul proibido pelo design system.

1. **Auth layout ausente — sem painel de arte escuro** (`(auth)/layout.tsx`, `login/page.tsx`, `signup/page.tsx`): Todas as telas de auth exibem apenas um card centralizado em fundo branco, sem o painel esquerdo escuro com logo, headline e testemunho que define a identidade de entrada do produto.

2. **Botão "Iniciar OS" em azul `#1D4ED8`** (`WorkOrderDetail.tsx` linha 147): Cor de marca proibida explicitamente pelo CLAUDE.md. Ação primária deve usar `#6D28D9`.

3. **Badge "Em andamento" (OS) em azul `#DBEAFE/1E40AF`** (`ordens-de-servico/page.tsx` linha 18, `WorkOrderDetail.tsx` linha 31): Introduz azul como segunda cor de status que conflita com a identidade "branco, preto e roxo".

4. **Badge "Produto" (catálogo) em azul `#DBEAFE/1D4ED8`** (`catalogo/page.tsx` linha 77): Mesmo problema — azul não é cor do design system Orcivo.

5. **Página de aprovação pública sem wordmark e com copy errado** (`approve/[token]/page.tsx`): Tela vista pelo cliente final do técnico. Header mostra texto puro "Orcivo" sem logo. Frase de sucesso usa exclamação e referencia "nossa equipe" incorretamente.

### P1 — Importante (implementar logo após os P0)

6. **Radii globais — 8px/6px em vez de 12px** (todos os formulários e cards): O token `--radius-md` (12px) é consistentemente ignorado. Afeta inputs, cards e botões em praticamente todas as telas.

7. **Border color global — `#E5E7EB` em vez de `#E2E8F0`**: A cor de borda do design system (`--border-1` = `--slate-200` = `#E2E8F0`) é substituída por `#E5E7EB` (Tailwind `gray-200`) em quase todas as telas.

8. **Padding do shell — 24px em vez de 32px** (`(app)/layout.tsx`): `--web-page-pad` é 32px. Toda a área de conteúdo está com respiro insuficiente.

9. **Empty states incompletos** (clientes, catálogo, orçamentos, OS): Faltam o ícone centralizado, o segundo parágrafo de sugestão e o CTA link/button no padrão do design system.

10. **Formulário de novo cliente sem labels visíveis nem card wrapper** (`clientes/novo/page.tsx`): Usa placeholders apenas, sem labels explícitos — pior para acessibilidade e fidelidade visual.

### P2 — Dívida visual (documentar, implementar depois)

- Sidebar: wordmark SVG, nav item peso 500 inativo, bloco de usuário no rodapé
- TopBar: sino de notificações, avatar, busca global
- Dashboard: KPI cards reais
- Botão "Copiar link" de aprovação no detalhe do orçamento
- SignatureCanvas: border correto, botão Limpar estilizado, placeholder
- Paginação na lista de orçamentos
- Hover states nas linhas de tabela
- Frase "Use vírgula ou ponto" simplificada para "Ex: 150,00"
- Log-out icon no botão "Sair" da TopBar

---

## Padrões divergentes recorrentes (cheat-sheet para fix em lote)

Os seguintes valores aparecem incorretos em múltiplos arquivos e podem ser corrigidos com um search-and-replace global:

| Valor implementado | Valor correto | Token |
|---|---|---|
| `borderRadius: 8` (inputs/cards) | `borderRadius: 12` | `--radius-md` |
| `borderRadius: 6` (inputs NovoOrcamento) | `borderRadius: 12` | `--radius-md` |
| `border: '1px solid #E5E7EB'` | `border: '1px solid #E2E8F0'` | `--border-1` |
| `border: '1px solid #D1D5DB'` | `border: '1px solid #E2E8F0'` | `--border-1` |
| `color: '#6B7280'` (secundário) | `color: '#64748B'` | `--fg-3` / `--slate-500` |
| `color: '#374151'` (label/nav) | `color: '#334155'` | `--fg-2` / `--slate-700` |
| `padding: 24` (main) | `padding: 32` | `--web-page-pad` |
| `backgroundColor: '#1D4ED8'` | `backgroundColor: '#6D28D9'` | `--purple-600` |
| `backgroundColor: '#DBEAFE'` (badge) | ver cada caso | sem azul |
| `rgba(0,0,0,0.4)` (scrim) | `rgba(10,10,15,0.5)` | `--ink` + alpha |

---

## Arquivos auditados

- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/components/AppSidebar.tsx`
- `apps/web/components/TopBar.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/app/(app)/clientes/page.tsx`
- `apps/web/app/(app)/clientes/novo/page.tsx`
- `apps/web/app/(app)/catalogo/page.tsx`
- `apps/web/app/(app)/catalogo/novo/page.tsx`
- `apps/web/app/(app)/catalogo/[id]/editar/page.tsx`
- `apps/web/app/(app)/orcamentos/page.tsx`
- `apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx`
- `apps/web/app/(app)/orcamentos/[id]/OrcamentoDetail.tsx`
- `apps/web/app/(app)/ordens-de-servico/page.tsx`
- `apps/web/app/(app)/ordens-de-servico/[id]/WorkOrderDetail.tsx`
- `apps/web/app/approve/[token]/page.tsx`
- `apps/web/app/approve/[token]/SignatureCanvas.tsx`
- `docs/design-handoff/orcivo-design-system/colors_and_type.css`
- `docs/design-handoff/orcivo-design-system/README.md`
- `docs/design-handoff/orcivo-design-system/screens/AuthWeb.jsx`
