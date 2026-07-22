---
name: orcivo-design
description: Use this skill to generate well-branded interfaces and assets for Orcivo, a B2B SaaS for Brazilian field technicians (installers) that handles clients, quotes (orçamentos), work orders, schedule, inventory and finance. Use for production code, throwaway prototypes, slide decks, or any visual artifact. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components (mobile + web) for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files. The most important entry points:

- `README.md` — brand context, content fundamentals (pt-BR tone), visual foundations, iconography guidance.
- `colors_and_type.css` — every design token as CSS variables; import this from any HTML artifact.
- `assets/` — logo, mark, dark-variant logo. Copy into your artifact when you need the brand mark.
- `preview/` — design-system specimen cards (colors, type, spacing, components, brand).
- `ui_kits/web/` — high-fidelity web app recreation (Next.js / shadcn look-and-feel) with sidebar, dashboard, quote editor, etc.
- `ui_kits/mobile/` — high-fidelity mobile app recreation (RN/Expo look-and-feel) in an iOS frame.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. The simplest possible artifact is:

```html
<!doctype html>
<link rel="stylesheet" href="colors_and_type.css">
<body><h1>Olá, Orcivo</h1></body>
```

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Hard rules

- **Language:** pt-BR for all user-facing copy. Component / file names in English.
- **No emoji** anywhere in product UI.
- **Brand palette:** white, black, purple (`--purple-600` = `#6D28D9`). Use `--purple-*`, `--slate-*` and the semantic tokens — do not introduce new hues.
- **Money** is always `R$ 1.234,56`, tabular-nums, weight ≥ 600. Internally always a decimal string.
- **Icons:** Lucide only. No emoji, no two-tone, no custom drawings.
- **Domain vocabulary:** Cliente · Orçamento · Ordem de Serviço (OS) · Agenda · Recebimento · Catálogo · Técnico · Empresa · Plano. Never lead, pipeline, deal, kanban, workspace, invoice.
