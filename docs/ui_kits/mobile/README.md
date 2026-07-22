# Orcivo — Mobile UI Kit

Pixel-accurate recreation of the Orcivo mobile app (React Native + Expo per the source design package), rendered inside an iOS device frame. **Cosmetic only.**

Audience: field technician — fast, one-handed, often outdoors.

## What's here

- `index.html` — interactive click-through inside an iOS frame. Bottom tab navigation works; the **+ Novo orçamento** FAB on Home opens a 5-step quote wizard. The **Aprovar** button on the quote detail flips its status to APPROVED.
- `Mobile.jsx` — every screen + atoms in a single file. Screens covered:
  - **Home** — greeting, metric tiles, quick actions, upcoming agenda
  - **Customers list** — search + customer cards
  - **Quotes list** — status-filtered list with status pills
  - **Quote detail** — itemized, with approve / reject actions
  - **Quote wizard** — 5-step quote creator (Cliente → Itens → Validade → Termos → Revisão)
  - **Agenda** — today/week with appointment cards
  - **Mais** — the secondary nav (Catálogo, Financeiro, OS, Configurações, etc.)

## Sources

Faithful to `04_SCREEN_SPECS_MOBILE.md`, `06_COMPONENTS.md`, and `07_COPYWRITING_PTBR.md`. Brand colors are **white / black / purple** per project direction (overriding the source's azul técnico).

## Coverage caveat

No production codebase or Figma was provided. Components are styled from spec docs + tokens. The iOS frame is from the `ios_frame.jsx` starter so the device chrome is accurate; the *content* is the design.
