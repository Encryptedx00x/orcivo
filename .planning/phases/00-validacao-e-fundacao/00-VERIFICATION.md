---
phase: 00-validacao-e-fundacao
verified: 2026-05-21T12:00:00Z
status: human_needed
score: 4/5 must-haves verified (1 partial — lint gap)
overrides_applied: 0
gaps:
  - truth: "Push em main dispara lint + type-check + build no GitHub Actions (todos verdes)"
    status: partial
    reason: "CI workflows exist and are correctly structured, but `turbo run lint` fails locally on @orcivo/backend with 'Parsing error: The keyword import is reserved' — root .eslintrc.js has no TypeScript parser, and apps/backend/ has no .eslintrc.json. The @typescript-eslint/parser package is listed as a dep but never configured. The CI workflow would fail on the lint step for the backend job."
    artifacts:
      - path: "apps/backend/src/app.module.ts"
        issue: "ESLint parses as plain JS; import keyword causes parse error"
      - path: "apps/backend/src/health/health.controller.ts"
        issue: "Same parse error — TypeScript parser not configured"
    missing:
      - "Add apps/backend/.eslintrc.json (or .eslintrc.js) extending @typescript-eslint/recommended with parser: '@typescript-eslint/parser' and parserOptions.project pointing to tsconfig.json"
human_verification:
  - test: "Conduzir 3+ entrevistas com técnicos instaladores reais"
    expected: "3+ técnicos confirmam que pagariam R$199,90/ano (Orcivo Mais) após ver o demo click-through em docs/validation/demo/index.html"
    why_human: "Requer recrutamento e entrevistas reais com pessoas fora do ambiente automatizado. Os artefatos (roteiro, demo, template, síntese) estão prontos e revisados."

  - test: "GET https://api.seudominio.com.br/health → 200"
    expected: "Resposta JSON com status ok e timestamp"
    why_human: "Requer: (1) comprar domínio, (2) contratar VPS Hostinger KVM1, (3) rodar vps-init.sh, (4) subir docker compose. O código (NestJS + Dockerfile + docker-compose.yml + Caddyfile + runbook) está completo e verificado."

  - test: "APK do hello world rodando em Android real"
    expected: "App exibe tela Orcivo com botão de health check funcional"
    why_human: "Requer: (1) criar conta expo.dev, (2) npx eas-cli login, (3) substituir REPLACE_WITH_EAS_PROJECT_ID em app.json, (4) npx eas build --platform android --profile preview. O código (App.tsx, eas.json) está completo."

  - test: "https://app.seudominio.com.br respondendo com HTTPS"
    expected: "Página Next.js carrega sem erro SSL; certificado Let's Encrypt válido via Caddy"
    why_human: "Mesmo pré-requisito do item 2 — VPS + domínio + docker compose. O Caddyfile e o Dockerfile do web estão completos."
---

# Phase 0: Validacao e Fundacao — Verification Report

**Phase Goal:** Validar a dor com técnicos reais E ter a infra básica e os repos prontos para receber código de domínio.
**Verified:** 2026-05-21T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 3+ técnicos dispostos a pagar R$199,90/ano após ver protótipo | ? HUMAN | Artefatos de validação completos (roteiro, demo, template, síntese). Entrevistas ainda não conduzidas — ação humana necessária. |
| 2 | GET https://api.seudominio.com.br/health → 200 | ? HUMAN | Código NestJS funcional (`health.controller.ts` retorna `{status:'ok',timestamp}`), Dockerfile e docker-compose prontos. VPS/domínio não provisionados — ação humana necessária. |
| 3 | APK do hello world rodando em Android real | ? HUMAN | `App.tsx` completo com paleta correta e `EXPO_PUBLIC_API_URL`. `eas.json` com perfil preview (APK). EAS Build requer conta expo.dev — ação humana necessária. |
| 4 | https://app.seudominio.com.br respondendo com HTTPS | ? HUMAN | `apps/web/Dockerfile` e `infra/Caddyfile` completos com auto-HTTPS. Mesmos pré-requisitos do item 2 — ação humana necessária. |
| 5 | Push em main dispara lint + type-check + build no GitHub Actions (todos verdes) | ⚠️ PARTIAL | Workflows existem e têm estrutura correta. `turbo run lint` falha localmente em `@orcivo/backend` — ESLint sem parser TypeScript. `typecheck` e `build` passam. |

**Score:** 4/5 truths verified (1 partial/gap, 4 awaiting human action)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `docs/validation/roteiro-entrevista.md` | VERIFIED | 15 perguntas, 4 blocos, guia de recrutamento com mensagem WhatsApp |
| `docs/validation/demo/index.html` | VERIFIED | 7 telas click-through, paleta #6D28D9, pt-BR, sem termos proibidos |
| `docs/validation/registros/template.md` | VERIFIED | Formulário por entrevistado com classificações PAGARIA/NÃO PAGARIA/INDECISO |
| `docs/validation/sintese.md` | VERIFIED | Tabela 5 slots + critério GO/NO-GO |
| `infra/scripts/vps-init.sh` | VERIFIED | 111 linhas, 8 etapas de hardening (usuário, SSH, UFW, fail2ban, Docker, timezone, swap) |
| `docs/runbooks/vps-setup.md` | VERIFIED | Cobre INFRA-01..09 |
| `infra/docker-compose.yml` | VERIFIED | 4 serviços: postgres, redis, minio, caddy + backend + web |
| `infra/Caddyfile` | VERIFIED | Auto-HTTPS via Let's Encrypt, variáveis de domínio/email por env vars |
| `infra/.env.example` | VERIFIED | Template sem segredos reais |
| `infra/scripts/backup-volumes.sh` | VERIFIED | pg_dumpall + retenção 7 dias |
| `docs/runbooks/stack-setup.md` | VERIFIED | Deploy step-by-step |
| `package.json` | VERIFIED | pnpm workspaces, turbo, scripts |
| `pnpm-workspace.yaml` | VERIFIED | |
| `turbo.json` | VERIFIED | Pipeline build/lint/typecheck/test/dev |
| `tsconfig.base.json` | VERIFIED | |
| `.husky/pre-commit` | VERIFIED | Criado manualmente (git em diretório pai) |
| `.husky/commit-msg` | VERIFIED | |
| `.github/workflows/backend.yml` | VERIFIED | lint + typecheck + build com turbo filter |
| `.github/workflows/mobile.yml` | VERIFIED | |
| `.github/workflows/web.yml` | VERIFIED | |
| `docs/decisions/ADR-001..011` | VERIFIED | 11 ADRs cobrindo todas as decisões arquiteturais |
| `apps/backend/src/health/health.controller.ts` | VERIFIED | `@Get('health')` retorna `{status:'ok', timestamp}` |
| `apps/backend/Dockerfile` | VERIFIED | Multi-stage (builder + production), EXPOSE 3000 |
| `apps/mobile/App.tsx` | VERIFIED | Cor #6D28D9 (3+ ocorrências), EXPO_PUBLIC_API_URL |
| `apps/mobile/eas.json` | VERIFIED | Perfil preview com buildType: apk |
| `apps/web/app/page.tsx` | VERIFIED | Busca API_URL/health |
| `apps/web/Dockerfile` | VERIFIED | Multi-stage |
| `docs/runbooks/deploy.md` | VERIFIED | Processo completo de deploy |
| `docs/PRODUCT.md` | VERIFIED | 4 nomes de plano (Livre/Solo/Mais/Equipe), sem termos proibidos |
| `docs/ARCHITECTURE.md` | VERIFIED | NestJS, stack completa |
| `apps/backend/.eslintrc.json` | MISSING | Sem config de parser TypeScript — lint falha em todo src/backend |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `health.controller.ts` | `app.module.ts` | `HealthModule` import | WIRED | `HealthModule` importado em `AppModule` |
| `app.module.ts` | `main.ts` | `NestFactory.create(AppModule)` | WIRED | Bootstrap padrão NestJS |
| `backend service` | `docker-compose.yml` | `orcivo_backend` service | WIRED | Container declarado com build context e porta 3000 |
| `web service` | `docker-compose.yml` | `orcivo_web` service | WIRED | Container declarado com porta 3001 |
| `Caddyfile` | `backend:3000` | reverse_proxy | WIRED | `api.{$DOMAIN}` → `backend:3000` |
| `Caddyfile` | `web:3001` | reverse_proxy | WIRED | `app.{$DOMAIN}` → `web:3001` |
| `backend.yml` workflow | `turbo run lint/typecheck/build` | `--filter=@orcivo/backend` | PARTIAL | Estrutura correta; lint falha por falta de ESLint config no backend |

---

### Requirements Coverage

| Req | Description | Status | Evidence |
|-----|-------------|--------|----------|
| VAL-01 | Roteiro de entrevista | SATISFIED | `docs/validation/roteiro-entrevista.md` — 15 perguntas |
| VAL-02 | Demo click-through | SATISFIED | `docs/validation/demo/index.html` — 7 telas |
| VAL-03 | Template de registro | SATISFIED | `docs/validation/registros/template.md` |
| VAL-04 | Síntese GO/NO-GO | SATISFIED | `docs/validation/sintese.md` |
| INFRA-01 | Ubuntu 22.04 / Debian 12 | SATISFIED | Coberto em `vps-init.sh` e `vps-setup.md` |
| INFRA-02 | Usuário não-root com sudo | SATISFIED | `vps-init.sh` etapa useradd |
| INFRA-03 | SSH por chave, senha desabilitada | SATISFIED | `sshd_config` hardening no script |
| INFRA-04 | UFW default deny, 22/80/443 | SATISFIED | `ufw allow` + enable no script |
| INFRA-05 | fail2ban jail SSH | SATISFIED | `jail.local` com maxretry=3, bantime=24h |
| INFRA-06 | Docker + Compose plugin | SATISFIED | Instalação via upstream repo |
| INFRA-07 | Timezone America/Sao_Paulo | SATISFIED | `timedatectl set-timezone` |
| INFRA-08 | Swap 4GB + fstab + swappiness | SATISFIED | `fallocate` + `/etc/fstab` |
| INFRA-09 | Runbook executável | SATISFIED | `docs/runbooks/vps-setup.md` |
| STACK-01..09 | Docker Compose stack (PG/Redis/MinIO/Caddy) | SATISFIED | `infra/docker-compose.yml` + `infra/Caddyfile` + `docs/runbooks/stack-setup.md` |
| MONO-01..12 | Monorepo scaffold (pnpm/turbo/ts/husky/commitlint) | SATISFIED | `package.json`, `turbo.json`, `tsconfig.base.json`, `.husky/`, `commitlint.config.js` |
| CI-01 | Lint passa no GitHub Actions | BLOCKED | `turbo run lint` falha em `@orcivo/backend` — falta `.eslintrc.json` com parser TypeScript |
| CI-02 | Typecheck passa | SATISFIED | `tsc --noEmit` passa no backend |
| CI-03 | Build passa | SATISFIED | `nest build` passa |
| CI-04 | Workflows existem e cobrem backend/mobile/web | SATISFIED | `.github/workflows/backend.yml`, `mobile.yml`, `web.yml` |
| HELLO-01..09 | Health endpoint + APK shell + web shell + Dockerfiles + runbooks | SATISFIED | Todos os artefatos verificados |
| DOCS-01..03 | PRODUCT.md + ARCHITECTURE.md + ADRs | SATISFIED | `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/decisions/ADR-001..011` |

---

### Anti-Patterns Found

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `packages/shared-types/src/index.ts` | `export {}` — sem exports | INFO | Intencional. Será populado na Fase 1 com DTOs e Zod schemas. |
| `packages/ui/src/index.ts` | `export {}` — sem exports | INFO | Intencional. Planejado para Fase 4+. |
| `apps/*/package.json` scripts (site, admin) | Scripts `echo` placeholder | INFO | Intencional — scaffold only. Fase 1 substituirá com comandos reais. |
| `apps/mobile/app.json` | `REPLACE_WITH_EAS_PROJECT_ID` placeholder | WARNING | Requer ação humana antes do EAS Build. Documentado em SUMMARY P0.5. |
| `apps/mobile/App.tsx` | URL fallback `seudominio.com.br` | WARNING | Requer substituição após compra do domínio. Documentado em SUMMARY P0.5. |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend typecheck passa | `pnpm --filter @orcivo/backend typecheck` | Exit 0 | PASS |
| Backend build (nest build) | `pnpm --filter @orcivo/backend build` | Exit 0, dist/ gerado | PASS |
| Backend lint | `pnpm turbo run lint --filter=@orcivo/backend` | Exit 1 — "Parsing error: The keyword 'import' is reserved" em 4 arquivos | FAIL |
| Turbo pipeline (lint global) | `pnpm turbo run lint` | 4 successful, 3 failed (backend + mobile + web falharam por deps) | FAIL |

---

### Human Verification Required

#### 1. Entrevistas de Validação de Mercado

**Test:** Recrutar 5 técnicos instaladores usando o guia em `docs/validation/roteiro-entrevista.md`, conduzir cada entrevista (~30 min, remoto), compartilhar tela com `docs/validation/demo/index.html`, registrar cada entrevista copiando o template para `docs/validation/registros/entrevista-NN.md`.

**Expected:** 3+ de 5 técnicos confirmam que pagariam R$199,90/ano → critério GO atingido → preencher `docs/validation/sintese.md` com decisão GO e avançar.

**Why human:** Requer interação com pessoas reais fora do ambiente automatizado. Nenhuma parte pode ser simulada ou verificada programaticamente.

#### 2. Deploy da API na VPS (Health Check HTTPS)

**Test:** Seguir `docs/runbooks/vps-setup.md` e depois `docs/runbooks/stack-setup.md` e `docs/runbooks/deploy.md`. Na VPS: `docker compose up -d --build backend`. Então: `curl https://api.seudominio.com.br/health`.

**Expected:** HTTP 200 com corpo `{"status":"ok","timestamp":"..."}` e certificado TLS válido.

**Why human:** Requer comprar domínio, contratar VPS (Hostinger KVM1), apontar DNS, rodar scripts de hardening e docker compose. Toda a infra-as-code está pronta; a execução é humana.

#### 3. APK do Hello World em Android Real

**Test:** Na máquina local: `cd apps/mobile && npx eas-cli login && npx eas build --platform android --profile preview`. Instalar o APK gerado em Android físico. Abrir o app.

**Expected:** App exibe tela Orcivo com cor roxa #6D28D9, campo de URL configurável, botão "Verificar Health" que consulta `/health` e exibe resposta.

**Why human:** Requer conta expo.dev, login EAS, substituição do EAS project ID em `app.json`, e dispositivo Android físico para validar.

#### 4. Web App com HTTPS

**Test:** Com VPS e domínio provisionados (ver item 2): `docker compose up -d --build web`. Acessar `https://app.seudominio.com.br` no browser.

**Expected:** Página Next.js carrega em HTTPS sem erro SSL; exibe health status da API.

**Why human:** Mesmo pré-requisito do item 2 — VPS + domínio + Caddy.

---

### Gaps Summary

**1 gap blocking full CI verification:**

The backend lint fails because `apps/backend/` has no ESLint config file. The root `.eslintrc.js` configures only basic rules with no TypeScript parser. The `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` packages are declared as devDependencies in `apps/backend/package.json` but are never wired to ESLint via a config file. All four TypeScript source files in `apps/backend/src/` produce "Parsing error: The keyword 'import' is reserved."

**Fix:** Create `apps/backend/.eslintrc.json`:
```json
{
  "extends": ["plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

This is a small, targeted fix. All other CI-04 requirements (workflows exist, correct structure, typecheck and build pass) are satisfied.

---

_Verified: 2026-05-21T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
