# Orcivo — Web UI Kit

Pixel-accurate recreation of the Orcivo web app (Next.js + Tailwind + shadcn/ui per the source design package). Built as React/JSX inline components, but **cosmetic only** — there's no real router, no real data, no API.

Audience: small-business owner / admin running their installer business from a desktop or tablet.

## What's here

- `index.html` — interactive click-through. Lands on Dashboard. Sidebar nav switches between Dashboard / Clientes / Catálogo / Orçamentos / OS / Agenda / Financeiro / Configurações. Quote editor is a multi-step form that actually walks through its steps.
- `App.jsx` — shell: sidebar + topbar + page router (hash-based).
- `Sidebar.jsx`, `TopBar.jsx` — chrome.
- `pages/` — one file per page:
  - `Dashboard.jsx` — metric cards + upcoming list + recent activity
  - `Customers.jsx` — search + filtered table
  - `Catalog.jsx` — tabbed product/service table
  - `Quotes.jsx` — list with status filters
  - `QuoteEditor.jsx` — 5-step quote builder (Cliente → Itens → Desconto → Termos → Revisão)
  - `WorkOrders.jsx` — list with status pills
  - `Agenda.jsx` — week view
  - `Finance.jsx` — period summary + receipt table
  - `Settings.jsx` — company settings panel
- `parts/` — atoms (Button, Input, Badge, Card, StatusPill, MoneyDisplay, EmptyState).

## Sources

Faithful to `04_SCREEN_SPECS_WEB.md` and `06_COMPONENTS.md` from the source package, with **white / black / purple** brand colors overriding the source's "azul técnico".

## Coverage caveat

No real codebase or Figma was provided. Components are styled from the spec doc + design tokens — not lifted from production. Layout, spacing and components are accurate to the spec; specific polish details (loading skeleton frequencies, exact toast styling, hover micro-states) would need a real codebase to verify.
