# Orcivo — RULES (read this first, obey literally)

> You are generating UI for **Orcivo**, a B2B SaaS for Brazilian field technicians
> (*técnicos instaladores*). Reproduce the design system **exactly**. Do not
> reinterpret, modernize, or "improve" it. When in doubt, copy the value from
> `tokens.json` / `tokens.css` and the component code in `ui_kits/`.

---

## 0. The one rule that matters most

**Copy exact values from the tokens and the UI-kit code. Never invent a color,
size, radius, shadow, or font.** If a value isn't in the tokens, derive it from
the closest token — do not introduce a new raw hex/px.

---

## 1. Color — DO / DON'T

- ✅ Primary = `#6D28D9` (`--purple-600`) ONLY. Hover `#5B21B6`, pressed `#4C1D95`.
- ✅ 95% of every surface is white + the slate neutral ramp. Purple is for **intent only**: primary CTA, active nav, focus ring, approved status, money total.
- ✅ Page background pure white `#FFFFFF`. Mobile list screens may use `#F8FAFC`.
- ✅ Semantic colors (success/warning/danger/info) appear ONLY on status badges, validation, money state.
- ❌ NO new purples, NO blue (`#2563EB` is a dead placeholder — never use it).
- ❌ NO gradients on UI chrome. The only gradient allowed is the brand mark tile (`linear-gradient(135deg, #0A0A0F, #6D28D9)`).
- ❌ NO colored shadows, NO glows, NO dark mode (out of scope for MVP).

## 2. Type — DO / DON'T

- ✅ **Inter** everywhere on web. Mobile uses platform default (SF Pro / Roboto) but Inter is acceptable in mockups.
- ✅ Use the scale verbatim: H1 28/36 700, H2 24/32 700, H3 20/28 600, Body 16/24 400, Small 14/20 400, Caption 12/16 400, Button 14 600.
- ✅ Headings use negative tracking (see tokens). Money + table numbers use `tabular-nums`, weight ≥600.
- ❌ NO other typefaces (no Roboto/Arial/Inter-substitutes), NO font sizes outside the scale, NO ALL CAPS except internal status enums.

## 3. Spacing & layout — DO / DON'T

- ✅ 4px base scale: 4 · 8 · 12 · 16 · 24 · 32 · 48. Use flex/grid with `gap`.
- ✅ Mobile: sticky header → content → 5-item bottom tab bar. FAB bottom-right, 16px inset, above tab bar. Screen padding 16.
- ✅ Web: 260px fixed sidebar → 64px top header → content. Tables max-width 1440, forms max-width 960. Detail = 360px aside + flex content.
- ✅ Touch target floor 44×44 mobile.
- ❌ NO arbitrary margins; pick the nearest scale step.

## 4. Radii, borders, shadows — DO / DON'T

- ✅ Inputs 12 · cards 16 (web) / 12 (mobile) · modals 20 · bottom-sheet top corners 24 · badges/pills 9999.
- ✅ Cards lead with **1px `#E2E8F0` border**, NOT shadow. Dividers inside cards 1px `#F1F5F9`.
- ✅ Focus = 2px `#6D28D9` border + 4px `#DDD6FE` halo. Kill the browser default outline.
- ✅ Only two resting shadows exist: `--shadow-card` and `--shadow-modal`. Resting cards have none.
- ❌ NO inner shadows, NO rounded-corner + left-accent-border cliché cards.

## 5. Icons — DO / DON'T

- ✅ **Lucide** only. Stroke 1.75. Sizes 16/20/24/32. `currentColor`, mono.
- ✅ WhatsApp action = `message-circle` with green tint (no official brand glyph available unless user supplies it).
- ❌ NO emoji in product UI. NO custom icon fonts. NO duotone. (Exception: emoji IS allowed on the **public client-facing** quote-approval page — e.g. "Olá, Cliente 👋" — but never in the internal app.)

## 6. Copy & tone (pt-BR) — DO / DON'T

- ✅ Portuguese (pt-BR), informal "você", direct and plain. Verbs first. No hype.
- ✅ Empty states = statement of current state + suggested next action. No exclamation marks.
- ✅ Domain vocabulary: Cliente · Orçamento · Ordem de Serviço (OS) · Serviço · Agenda · Recebimento · Recibo · Documento · Catálogo · Produto · Técnico · Empresa · Plano.
- ✅ Money always `R$ 1.234,56` (non-breaking space after R$), bigger + heavier than surrounding text.
- ✅ Status = badge + label, never color alone.
- ❌ NEVER use: lead, pipeline, deal, kanban, tenant, workspace, invoice.
- ❌ Code identifiers stay English (`CustomerCard.tsx`); user-facing text stays pt-BR.

## 7. Plans & pricing — DO / DON'T (recent product decision)

- ✅ Provisional plan names ONLY: **Orcivo Livre · Orcivo Solo · Orcivo Mais · Orcivo Equipe**.
- ✅ Describe limits as **"uso justo" / "uso ampliado" / "incluído no plano"**.
- ✅ Upsell CTA = "Ver planos" / "Gerenciar assinatura". Plan-limit copy must read as a soft, App-Store-safe nudge.
- ❌ NEVER render: `FREE`, `PRO`, `TOP`, `POP`, the word **"ilimitado"**, "14 dias PRO", or any hard price like `R$ 24,90/mês`. Pricing is decided elsewhere.
- ❌ Real payment confirmation is done by the owner in-app, not by the customer — the public Pix screen says "Avisar que paguei", never "Já paguei".
- ⚠️ The original planning docs (`uploads/.../PLANEJAMENTO_FINAL_V3.md`, `FRONTEND_DESIGN_MASTER.md`, `OPERATIONS_UI_MISSING_SPECS.md`) contain the OLD pricing (POP/PRO/TOP + R$ values) as historical business context. **Never lift plan names, prices, or "ilimitado" from those docs into UI.** They carry a DEPRECATED banner. UI truth = this file + `tokens.json`.

## 8. Motion — DO / DON'T

- ✅ Easing `cubic-bezier(0.2,0,0,1)` in / `cubic-bezier(0.4,0,1,1)` out. Durations 120/200/280ms. Page transition = 120ms cross-fade. Skeletons fade 0.4→0.8→0.4 over 1.2s.
- ❌ NO springs, parallax, scale-from-cursor, celebratory motion, or infinite decorative loops.

---

## Self-check before you ship

1. Every color is a token from `tokens.json`? (grep your output for stray hex)
2. No `FREE` / `PRO` / `TOP` / `ilimitado` / blue `#2563EB` / emoji-in-app?
3. Cards = border not shadow? Focus ring = purple 2px + halo?
4. Money formatted `R$ 1.234,56`, tabular, heavy?
5. Copy is pt-BR, informal, no banned vocabulary?
6. Plan names are the four Orcivo names; limits use "uso justo / ampliado"?
