# Orcivo — Design System

> **Orcivo** — Um sistema simples, acessível e barato para gerenciar seus orçamentos, estoque e muito mais.

Orcivo is a B2B SaaS for Brazilian field technicians (installers / *técnicos instaladores*) — the small-business plumber, electrician, AC tech, alarm/CCTV installer, solar installer, etc. — to run their day-to-day: clients, quotes (*orçamentos*), work orders (*ordens de serviço*), schedule (*agenda*), inventory (*estoque*) and basic finance.

The product is dual-surface:

| Surface | Stack | Audience |
|---|---|---|
| **Mobile app** | React Native + Expo + TypeScript | Field technician — fast, one-handed, sometimes offline |
| **Web app** | Next.js + Tailwind + shadcn/ui | Owner / admin — overview, gestão, batch work |
| **Marketing site** | Next.js | Public pricing + signup (out of scope here) |

Both surfaces speak the same domain vocabulary and share the same design tokens.

---

## Sources

This design system was built from a single attached source package:

```
front_design_package_tecnicos/
  01_DESIGN_SYSTEM.md         — palette, type, spacing, radii, status badges
  02_FRONTEND_ARCHITECTURE.md — apps, navigation, state, errors
  03_UX_FLOWS.md              — auth, customer, quote, OS, agenda, finance flows
  04_SCREEN_SPECS_MOBILE.md   — every mobile screen
  05_SCREEN_SPECS_WEB.md      — every web screen
  06_COMPONENTS.md            — base + domain component inventory
  07_COPYWRITING_PTBR.md      — tone of voice, terms, empty states, CTAs
  08_GSD_FRONTEND_EXECUTION.md
  09_CLAUDE_DESIGN_PROMPT.md
  10_ACCEPTANCE_CHECKLIST.md
  PLANEJAMENTO_FINAL_V3.md
```

No Figma, no logo files, no live codebase, no production screenshots were available. The brand visual treatment (especially the color direction) was given verbally by the project owner:

> **Branco, preto e roxo** — white, black, purple.

This overrides the placeholder "azul técnico" (#2563EB) palette in `01_DESIGN_SYSTEM.md`. Everything else from those docs (Inter, Lucide, slate neutrals, spacing scale, radii, status semantics, pt-BR copy) is preserved.

---

## Index

Root files:

- **`README.md`** — this file. Brand context, content & visual foundations, iconography.
- **`SKILL.md`** — entry point for AI agents (Claude / Claude Code) producing Orcivo artifacts.
- **`colors_and_type.css`** — design tokens as CSS variables (colors, type, spacing, radii, shadows) plus semantic element styles (h1, h2, body, code…).
- **`fonts/`** — Inter (variable). Inter is loaded via Google Fonts CDN at runtime; the local copies are a fallback.
- **`assets/`** — logo, wordmark, brand mark variants, favicon, illustrations.
- **`preview/`** — design-system specimen cards. Open `preview/<card>.html` to see swatches, type, components, etc.
- **`ui_kits/web/`** — pixel-accurate web (Next.js / shadcn) UI kit — sidebar, dashboard, quote editor, customer list, etc.
- **`ui_kits/mobile/`** — pixel-accurate mobile (Expo / RN) UI kit — home, customer detail, quote wizard, agenda, OS detail.

---

## Content fundamentals

**Language.** All user-facing copy is **Portuguese (pt-BR)**. Component names and code identifiers stay in English (`CustomerCard.tsx`, `MoneyInput.tsx`).

**Tone.** Direct, professional, plain. Treats the technician as a peer — no hype, no condescension, no startup jargon. Use the second person ("você") informally. Never use "tu" or regional slang.

**Casing.** Sentence case for buttons, titles, menu items and badges. **Never ALL CAPS** except for: status enums internally (`DRAFT`, `APPROVED`) which are translated for display, and the plan tier names which are intentionally shouty (**Grátis · POP · PRO · TOP**).

**Emoji.** **Never.** This is explicit in the source docs: "*Não usar emoji em UI profissional.*" Use Lucide icons.

**Pronouns.** "Você" (informal you) for the technician. The system speaks **about** the customer, never **to** them inside the app (the customer only sees the generated PDF, which is more formal).

**Domain vocabulary — always use:**

> Cliente · Orçamento · Ordem de Serviço (OS) · Serviço · Agenda · Recebimento · Recibo · Documento · Catálogo · Produto · Técnico · Empresa · Plano

**Never use** (these leak from generic SaaS templates):

> ~~lead~~ · ~~pipeline~~ · ~~deal~~ · ~~kanban~~ · ~~tenant~~ · ~~workspace~~ · ~~invoice~~

**Vibe.** "Feito para campo" — built for the field. The technician opens the app between jobs, hands dirty, in the sun. Copy is short. Verbs first. Numbers and money are big and unambiguous.

**Sample copy** — empty state, customers list:

> Você ainda não cadastrou clientes.
> Cadastre seu primeiro cliente para criar orçamentos e serviços.

Notice: a **statement** of the current state, then a **suggested next action**. No exclamation marks, no "Let's go!", no rocket emoji. This is the pattern for every empty state.

**Sample copy** — error, no permission:

> Você não tem permissão para acessar este recurso.
> Peça acesso ao administrador da empresa.

Notice: states the fact, gives the unblock path. Never blames the user.

**Sample copy** — plan upsell (especially on iOS — App Store-safe language):

> Este recurso faz parte de outro plano.
> Você pode continuar usando os recursos disponíveis no seu plano atual.

**Never** say "pague fora do app" or anything that implies steering around the store.

**Money.** Always `R$ 1.234,56` (pt-BR format, non-breaking space after `R$`). Internally always a decimal string, **never** a JS number. Display larger and heavier than surrounding text — money is the technician's livelihood.

**Status.** Always badge + label, never color alone. Labels are short and unambiguous: `Rascunho`, `Pendente`, `Aprovado`, `Rejeitado`, `Expirado`, `Cancelado` (quotes); `Aberta`, `Agendada`, `Em execução`, `Aguardando cliente`, `Aguardando material`, `Finalizada`, `Cancelada` (work orders).

---

## Visual foundations

### Color philosophy — white, black, purple

The palette is **deliberately quiet**. A field tool has to read in direct sunlight and survive being looked at for eight hours; we lean on a very neutral slate ramp for 95% of the surface and reserve **roxo Orcivo** for moments of intent — the primary CTA, an active nav item, a focus ring, an approved status, a money total.

| Role | Token | Hex | Use |
|---|---|---|---|
| Primary | `--purple-600` | `#6D28D9` | Buttons, links, primary actions |
| Primary dark | `--purple-800` | `#4C1D95` | Pressed/hover, focused borders |
| Primary tint | `--purple-50` | `#F5F3FF` | Subtle backgrounds, selected rows |
| Ink | `--ink` | `#0A0A0F` | Display + heading text, logo |
| Surface | `--bg` | `#FFFFFF` | Page background |
| Neutrals | `--slate-50…950` | slate ramp | Borders, secondary text, dividers |

Semantic colors (success / warning / danger / info) follow the source doc verbatim — they're recognizable utility hues, not part of the brand palette. They appear only on status badges, validation messages and money state.

**No gradients on UI chrome.** The mark uses a tight ink→purple gradient as its single brand-expressive moment; everything else is flat fill.

### Typography

**Inter** — variable, loaded from Google Fonts. (Local TTFs in `fonts/` for offline preview.) The source doc specifies Inter for web and System default for mobile (SF Pro on iOS, Roboto on Android); the mobile UI kit follows that, the web UI kit and all marketing artifacts use Inter.

Scale (matching the source doc):

| Step | Size / line | Weight | Use |
|---|---|---|---|
| Display | 32 / 40 | 700 | Marketing only |
| H1 | 28 / 36 | 700 | Page title |
| H2 | 24 / 32 | 700 | Section title |
| H3 | 20 / 28 | 600 | Card title, dialog title |
| Body | 16 / 24 | 400 | Default text |
| Small | 14 / 20 | 400 | Helper, table cells |
| Caption | 12 / 16 | 400 | Labels, metadata |
| Button | 14–16 / 20–24 | 600 | CTAs |

Money uses **tabular-nums** + weight 600 minimum. Numbers in tables also use tabular-nums for alignment.

### Spacing

4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`. Mobile screen padding 16. Web page padding 24–32. Card gap 16–24. Touch target floor 44×44.

### Backgrounds

- **No full-bleed photos**, no hand-drawn illustrations, no repeating textures, no gradient backgrounds in app chrome.
- Page background is pure white (`#FFFFFF`).
- On mobile, list screens use a *very* faint slate-50 (`#F8FAFC`) page background so white cards float clearly.
- Marketing surfaces (landing, onboarding) may use a single `--purple-50` blob behind hero art; never more.
- Dark mode is **out of scope for MVP** — flagged for future.

### Cards

- Background: `#FFFFFF`.
- Border: 1px `--slate-200` (#E2E8F0). Cards lead with **border**, not shadow.
- Radius: `--radius-md` (12px). Modals 20, bottom sheets 24 (top corners only).
- Shadow: `--shadow-card` = `0 1px 3px rgba(15, 23, 42, 0.08)`. Used **only** on hover/lift, or on the floating action button, or on dropdowns/menus. Resting cards have no shadow.
- Modal shadow: `--shadow-modal` = `0 20px 40px rgba(15, 23, 42, 0.18)`.

### Radii

`8 / 12 / 16 / 20 / 24`. Inputs 12, cards 16 (web) / 12 (mobile), modals 20, bottom-sheet top 24, pills/badges full (`9999`).

### Borders

- Hairlines are 1px `--slate-200`.
- Dividers inside cards are 1px `--slate-100`.
- Focused inputs get a 2px `--purple-600` border + a 4px `--purple-200` halo. **No bluish outline** browser default.

### Shadows

Two shadow tokens only:

```css
--shadow-card:  0 1px 3px rgba(15, 23, 42, 0.08);
--shadow-modal: 0 20px 40px rgba(15, 23, 42, 0.18);
```

No inner shadows. No glow. No colored shadows.

### Hover / press / focus

- **Hover (web):** background shifts up one neutral step (`white → slate-50`, `slate-50 → slate-100`). Primary button: `purple-600 → purple-700`.
- **Press (mobile):** opacity 0.85, no scale, no haptic-mimicking shrink. On dark backgrounds, brighten by 8%; on light, darken by 6%.
- **Focus:** 2px solid `--purple-600` + 4px `--purple-200` halo. Always visible on web. Mobile uses the system focus ring.
- **Disabled:** opacity 0.5, no pointer events. Text shows real disabled color (`--slate-400`), not just opacity.

### Animation

- **No bouncy springs.** No parallax. No celebratory motion.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (standard "decelerate" curve) for entries; `cubic-bezier(0.4, 0, 1, 1)` for exits.
- Durations: 120ms (hover/state), 200ms (component appear/disappear), 280ms (bottom sheet / drawer).
- Page transitions: a 120ms cross-fade. No slide. No flip. No scale-from-cursor.
- Loading: skeleton blocks fading 0.4 → 0.8 → 0.4 opacity over 1.2s. Spinner only when work is truly indeterminate and brief.

### Transparency & blur

Used sparingly. The sticky mobile header gets `backdrop-filter: blur(12px)` over `rgba(255,255,255,0.85)` only when content scrolls beneath. Dropdowns and menus are fully opaque — no glass. Bottom sheets sit over a `rgba(10,10,15,0.5)` scrim.

### Layout rules

- **Mobile.** Header (sticky) → content → bottom tab bar (5 items, fixed). FAB floats bottom-right above the tab bar with 16px inset. Forms are full-screen with a sticky bottom CTA bar on long forms.
- **Web.** Sidebar 260px fixed → top header 64px fixed → content area. Page content max-width 1440 for tables, 960 for forms. Two-column detail layouts: 360px sidebar + flex content.

### Iconography color & sizing

- Default stroke: 1.75 (Lucide default-ish).
- Icon sizes: 16 (inline, small), 20 (button), 24 (header / FAB), 32+ (illustration-grade).
- Color: inherits `currentColor`. Icons are mono — no two-tone, no fill+stroke mix.

### Imagery vibe

When real product imagery is used (avatars, customer-supplied logos, OS photos taken by technicians in the field), it's shown **as-is** — no filters, no grain, no color shift. The customer's logo on a quote PDF must look exactly like the customer's logo.

---

## Iconography

**Library: Lucide.**

- **Mobile:** `lucide-react-native`
- **Web:** `lucide-react`

No emoji anywhere in product UI. No custom icon font. No two-tone or duotone icons. If a needed icon doesn't exist in Lucide, prefer composing two Lucide icons over drawing a one-off — and if you must draw a custom SVG, match Lucide's 1.75px stroke, 24px viewBox, no fill.

**Key icons in use:**

| Use | Icon |
|---|---|
| Tab / nav: Home | `home` |
| Tab / nav: Customers | `users` |
| Tab / nav: Quotes | `file-text` |
| Tab / nav: Work orders | `clipboard-list` |
| Tab / nav: Agenda | `calendar` |
| Tab / nav: Finance | `dollar-sign` |
| Tab / nav: Catalog | `package` |
| Tab / nav: Settings | `settings` |
| Search | `search` |
| Add / new | `plus` |
| Forward | `chevron-right` |
| Camera (OS photos) | `camera` |
| Signature | `pen-line` |
| Share | `share-2` |
| Download | `download` |
| Upload | `upload` |
| Notifications | `bell` |
| Status: success | `check-circle` |
| Status: warning | `alert-circle` |
| Status: error | `x-circle` |
| Plan / lock | `lock` |
| WhatsApp action | `message-circle` (placeholder — flag below) |

**Substitution flagged:** Lucide does not ship a WhatsApp brand glyph (and using brand marks via Lucide isn't appropriate anyway). For "Compartilhar no WhatsApp" CTAs we use `message-circle` with a green tint, or the WhatsApp brand SVG provided by the WhatsApp Business brand kit (must be supplied by the user). The current UI kit uses `message-circle`. **Please supply the official WhatsApp brand SVG** if you want the real glyph.

**Unicode characters.** Avoid. The only places where a glyph beats an icon are: the `R$` currency prefix (always typed as the two ASCII characters), the `·` middot used between metadata items (`Rua Tal · São Paulo/SP`), and the `—` em dash.

---

## Font substitution flag

The source package specifies **Inter** for web and platform-default for mobile. Inter is freely available on Google Fonts and is loaded from CDN; local TTFs (Inter Variable + a Roman static fallback) are dropped in `fonts/` as a courtesy.

> **Ask:** If you have an exact Inter version pinned (e.g. Inter v4 vs v3), or you'd like to swap to a different typeface entirely (e.g. Geist, Manrope), drop the files in `fonts/` and call it out.

---

## Logo

A wordmark + standalone mark are provided in `assets/`. **No reference logo was supplied with the project**, so these are an original interpretation of the brand direction (purple + sharp + utility-feeling).

> **Ask:** If Orcivo already has an official logo, please drop the SVG/PNG in `assets/` and we'll swap the placeholder mark across all kits and slides.

---

## Caveats & open questions

See the **final summary** in the chat for the live list of caveats and asks.
