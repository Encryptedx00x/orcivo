# Orcivo — CLAUDE.md

Guia de trabalho para este projeto. Leia sempre antes de qualquer ação.

## Contexto do projeto

SaaS B2B para técnicos instaladores brasileiros. Dual-surface: mobile (técnico em campo) + web (gestão no PC).

**Documento mestre:** `/docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md`
**Design system oficial:** `/docs/design-handoff/orcivo-design-system/`

## Regras absolutas

### Design e identidade visual

- **Não recriar o design do zero.** Seguir o design system aprovado.
- **Não alterar** paleta, fonte, espaçamentos, tokens ou componentes sem aprovação explícita.
- Primary: `--purple-600` `#6D28D9` (roxo Orcivo) — sobrepõe qualquer referência a azul `#2563EB` em docs antigos.
- Fundo: `--bg` `#FFFFFF`; tinta: `--ink` `#0A0A0F`.
- Fonte web: **Inter**. Fonte mobile: system default (SF Pro/Roboto).
- Ícones: **Lucide only** — sem emoji, sem custom icons, sem two-tone.
- Idioma UI: **pt-BR**. Nomes de componentes e variáveis: inglês.

### Nomenclatura de planos

Usar **sempre**:
- `Orcivo Livre`
- `Orcivo Solo`
- `Orcivo Mais`
- `Orcivo Equipe`

**Nunca usar:** FREE, POP, PRO, TOP, "ilimitado", "14 dias de teste", "Assinar PRO".

### Linguagem de produto

**Usar:** uso justo · uso ampliado · Ver planos · Gerenciar assinatura

**Nunca usar:** "pague fora do app" · "evite taxa da Apple" · "compre mais barato no site"

### Regras técnicas críticas

- **Money:** sempre `Prisma.Decimal` (backend), string decimal (API JSON), `Decimal.js` (mobile/web). Nunca `number`/`float`.
- **Multi-tenant:** toda tabela de negócio tem `company_id`. Sem exceção.
- **JWT:** só identifica. Autorização revalida a cada request com cache Redis 60s.
- **shared-types:** não importa `@prisma/client`, `@nestjs/*`, `react`, `react-native`.
- **WebhookEvent:** obrigatório para todo provedor externo.
- **RequestIdempotency:** obrigatório para mutations do mobile (`X-Client-Request-Id`).
- **ESLint rule:** `no-restricted-imports` em mobile/web bloqueando `@prisma/*`.

### Regras de autoria e commits

- **Não** adicionar "Generated with Claude" em commits, comentários ou código.
- **Não** adicionar "Co-authored-by Claude" ou similar.
- **Não** criar comentários dizendo que código foi gerado por IA.
- **Não** commitar prompts, transcripts, logs de IA ou arquivos temporários.
- Commits devem ser técnicos, objetivos e humanos.

## Workflow GSD

Este projeto usa GSD (Get Shit Done) para execução estruturada.

### Estado atual

```
Fase 0 — Planejada, aguardando execução
```

### Arquivos de planejamento

```
.planning/PROJECT.md       — contexto do projeto
.planning/REQUIREMENTS.md  — requisitos da Fase 0
.planning/ROADMAP.md       — fases e deliverables
.planning/STATE.md         — estado atual e progresso
```

### Comandos de trabalho

```
/gsd-plan-phase 0     — criar planos de execução da Fase 0
/gsd-execute-phase 0  — executar planos aprovados
/gsd-progress         — ver progresso atual
/gsd-discuss-phase N  — discutir abordagem de uma fase
```

### Regra de ouro

**Não pular a Fase 1.** O vertical slice da Fase 1 é o molde arquitetural. Se ficar limpo, todas as features seguem o mesmo padrão.

## Estrutura do repositório

```
apps/
  backend/      NestJS API (fonte única de verdade)
  mobile/       React Native + Expo
  web/          Next.js + Tailwind + shadcn/ui
  site/         Landing + pricing + checkout (Fase 3)
  admin/        Admin master (Fase 4)
packages/
  shared-types/ DTOs, Zod schemas, enums (sem Prisma)
  ui/           Componentes compartilhados (Fase 4+)
prisma/         Schema + migrations + seed
docs/           Documentação técnica + design system
infra/          Docker Compose, scripts, Caddyfile
.planning/      GSD planning (versionado no git)
```

## O que NÃO fazer

- Não criar feature de domínio antes da Fase 1 estar pronta
- Não duplicar regra de negócio entre mobile e web
- Não importar Prisma Client no mobile ou web
- Não usar `number`/`float` para dinheiro em nenhum contexto
- Não fazer tenant-scoped query sem `company_id`
- Não processar webhook sem `WebhookEvent` de idempotência
- Não iniciar Fase 2 sem o molde arquitetural da Fase 1 validado
- Não publicar nas lojas antes de 3+ técnicos reais validarem o produto
- Não consultar sobre fiscal antes de contratar consultor contábil (Fase 6)

## Referências rápidas

| Tema | Arquivo |
|---|---|
| Stack e arquitetura | `/docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §3-4 |
| Modelo de domínio | `/docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §5 |
| Auth | `/docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §8 |
| Planos e limites | `/docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §11-13 |
| Design system | `/docs/design-handoff/orcivo-design-system/README.md` |
| Tokens CSS | `/docs/design-handoff/orcivo-design-system/colors_and_type.css` |
| UI Kit web | `/docs/design-handoff/orcivo-design-system/ui_kits/web/` |
| UI Kit mobile | `/docs/design-handoff/orcivo-design-system/ui_kits/mobile/` |
| Screen specs | `/docs/FRONTEND_DESIGN_MASTER.md` §4 (mobile) §5 (web) |
| Telas operacionais | `/docs/OPERATIONS_UI_MISSING_SPECS.md` |
| GSD Fase 0 | `.planning/ROADMAP.md` |
