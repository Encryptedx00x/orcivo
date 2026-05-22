# ADR-001 — Monorepo com Turborepo e pnpm workspaces

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O projeto Orcivo tem cinco superfícies distintas: backend (NestJS), mobile (Expo), web (Next.js), site de marketing e painel admin. Todas compartilham tipos, schemas e potencialmente componentes UI. Manter repositórios separados aumentaria o custo de sincronização de versões, dificultaria refatorações cross-cutting e fragmentaria a visibilidade do pipeline CI.

## Decisão

Usar um monorepo com pnpm workspaces como gerenciador de pacotes e Turborepo como orquestrador de build/lint/test. Estrutura:

```
apps/   — aplicações executáveis (backend, mobile, web, site, admin)
packages/ — bibliotecas internas (@orcivo/shared-types, @orcivo/ui)
```

Turborepo gerencia dependências entre pacotes e executa tarefas em paralelo com cache local.

## Consequências

**Positivas:**
- Refatorações de tipo (shared-types) propagadas imediatamente para todos os consumers
- Cache de build reduz tempo de CI significativamente após o primeiro run
- Scripts unificados: `pnpm lint`, `pnpm build`, `pnpm test` funcionam no root
- Visibilidade única do estado de todos os apps no mesmo PR

**Negativas / trade-offs:**
- Overhead de configuração inicial (turbo.json, tsconfig paths, workspace references)
- Desenvolvedores precisam aprender o conceito de task pipeline do Turborepo
- `pnpm install` instala dependências de todos os apps — ambiente local maior
