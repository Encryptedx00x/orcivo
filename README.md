# Orcivo

SaaS B2B para técnicos instaladores brasileiros.

## Setup local

### Pré-requisitos

- Node.js 20+ (use `nvm use` ou `fnm use`)
- pnpm 9+ (`npm install -g pnpm`)

### Instalação

```bash
pnpm install
```

### Desenvolvimento

```bash
# Backend (NestJS)
pnpm --filter @orcivo/backend dev

# Mobile (Expo)
pnpm --filter @orcivo/mobile dev

# Web (Next.js)
pnpm --filter @orcivo/web dev
```

### Build

```bash
pnpm build  # todos os apps via Turborepo
```

### Lint e tipagem

```bash
pnpm lint
pnpm typecheck
```

## Estrutura

```
apps/
  backend/      NestJS API
  mobile/       React Native + Expo
  web/          Next.js + Tailwind + shadcn/ui
  site/         Landing + pricing (Fase 3)
  admin/        Admin master (Fase 4)
packages/
  shared-types/ DTOs, Zod schemas, enums
  ui/           Componentes compartilhados (Fase 4+)
prisma/         Schema + migrations
docs/           Documentação técnica
infra/          Docker Compose, scripts, Caddyfile
.planning/      GSD planning (versionado)
```

## Documentação

- [Planejamento e roadmap](.planning/ROADMAP.md)
- [Decisões de design](docs/decisions/)
