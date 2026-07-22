# Orcivo Design System — Handoff Package

This folder is a self-contained handoff for generating **pixel-faithful Orcivo
UI**. It exists because rendered screens/PDFs are interpreted (low fidelity)
while **tokens + component code + explicit rules** are reproduced (high fidelity).

## Read in this order

1. **`RULES.md`** — imperative do/don't. Load this into context first, always.
2. **`tokens.json`** — every design token as data (colors, type, spacing, radii, shadows, motion, plans). The machine-readable source of truth.
3. **`tokens.css`** — same tokens as CSS custom properties + base element styles. Import/paste literally; don't redefine values.
4. **`COMPONENTS.md`** — exact sizes + states for each component (buttons, inputs, cards, badges, nav, modals, skeletons, public/PDF).
5. **The real code** — copy from these, don't reinvent:
   - `ui_kits/web/*.jsx` + `ui_kits/web/styles.css`
   - `ui_kits/mobile/*.jsx` + `ui_kits/mobile/styles.css`
   - `screens/*` (the four lotes: Auth, States, Forms, Public)

## Hard constraints (the short version)

- Primary purple `#6D28D9` only · white + slate ramp for everything else · no gradients on chrome · no blue.
- Inter · type scale verbatim · money `R$ 1.234,56` tabular + heavy.
- Cards = 1px `#E2E8F0` border, no resting shadow · focus = 2px purple + 4px `#DDD6FE` halo.
- Lucide icons, stroke 1.75, mono · **no emoji in the internal app** (emoji allowed only on the public client page).
- pt-BR, informal "você" · banned words: lead/pipeline/deal/kanban/tenant/workspace/invoice.
- Plans: **Orcivo Livre · Solo · Mais · Equipe** · limits = "uso justo / uso ampliado" · **never** FREE/PRO/TOP/POP/"ilimitado"/hard prices.

## How to use with a generator (GSD / Claude Code / etc.)

Paste `PROMPT.md` as the system/instruction message, then attach this whole
folder (plus the `ui_kits/` and `screens/` source). Tell the tool to **read
`RULES.md` and `tokens.json` before generating** and to **copy values, not
approximate them**. After generation, run the self-check at the end of `RULES.md`.

## Files

```
handoff/
  README.md        ← this file
  PROMPT.md        ← paste as the instruction/system message
  RULES.md         ← imperative do/don't (read first)
  tokens.json      ← tokens as data
  tokens.css       ← tokens as CSS vars + base styles
  COMPONENTS.md    ← per-component sizes + states
```

Bring along (from the project root) for full fidelity:
```
ui_kits/web/      ui_kits/mobile/      screens/
```
