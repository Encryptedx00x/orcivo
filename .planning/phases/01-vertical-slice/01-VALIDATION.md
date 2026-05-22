---
phase: 1
slug: vertical-slice
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + Supertest (backend) · Jest 29 + @testing-library/react-native (mobile) · Jest 29 + @testing-library/react (web) |
| **Config file** | `apps/backend/jest.config.ts` · `apps/mobile/jest.config.ts` · `apps/web/jest.config.ts` |
| **Quick run command** | `pnpm --filter backend test:ci` |
| **Full suite command** | `turbo run test --filter=backend --filter=web` |
| **Estimated runtime** | ~30 seconds (sem cobertura) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test:ci`
- **After every plan wave:** Run `turbo run test --filter=backend --filter=web`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | Prisma schema | 1 | MULTI-TENANT | T-1-01 | customers nunca retornam sem company_id | integration | `pnpm --filter backend test -- customer.spec` | ❌ W0 | ⬜ pending |
| 1-02-01 | Auth signup | 1 | AUTH | T-1-02 | senha nunca retorna em resposta JSON | integration | `pnpm --filter backend test -- auth.spec` | ❌ W0 | ⬜ pending |
| 1-02-02 | Auth login | 1 | AUTH | T-1-03 | JWT inválido retorna 401 | integration | `pnpm --filter backend test -- auth.spec` | ❌ W0 | ⬜ pending |
| 1-02-03 | Refresh token | 1 | AUTH | T-1-04 | refresh token single-use (revogado após uso) | integration | `pnpm --filter backend test -- auth.spec` | ❌ W0 | ⬜ pending |
| 1-03-01 | TenantGuard | 2 | MULTI-TENANT | T-1-05 | empresa A não acessa customers da empresa B | integration | `pnpm --filter backend test -- tenant.spec` | ❌ W0 | ⬜ pending |
| 1-03-02 | Customer CRUD | 2 | CUSTOMER | — | listagem filtra por company_id automaticamente | integration | `pnpm --filter backend test -- customer.spec` | ❌ W0 | ⬜ pending |
| 1-04-01 | Mobile auth screens | 3 | MOBILE-AUTH | — | telas de login e signup renderizam sem erro | unit | `pnpm --filter mobile test` | ❌ W0 | ⬜ pending |
| 1-05-01 | Web sidebar layout | 3 | WEB-AUTH | — | sidebar renderiza com 9 itens de navegação | unit | `pnpm --filter web test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/auth/__tests__/auth.spec.ts` — stubs para signup, login, refresh, token inválido
- [ ] `apps/backend/src/customer/__tests__/customer.spec.ts` — stubs para CRUD + tenant isolation
- [ ] `apps/backend/src/common/__tests__/tenant.spec.ts` — stubs para TenantGuard isolation test
- [ ] `apps/backend/test/jest.config.ts` — configuração de integration tests com banco real
- [ ] `apps/mobile/src/__tests__/auth-screens.spec.tsx` — stubs para LoginScreen, SignupStep1Screen, SignupStep2Screen
- [ ] `apps/web/src/__tests__/sidebar.spec.tsx` — stubs para AppSidebar com 9 itens

*Se framework já configurado no monorepo: confirmar que `pnpm --filter backend test` funciona antes do Wave 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bottom tabs aparecem corretamente no Android real | D-06 | Expo navigation requer device/emulator | Abrir APK debug, verificar 5 tabs visíveis no rodapé |
| Sidebar responsiva no mobile viewport web | D-10 | CSS comportamento depende de browser real | Abrir web em mobile viewport, verificar sidebar colapsa/expande |
| Signup fluxo completo 2 etapas — mobile | D-01 | Fluxo multi-tela requer interação real | Signup step 1 → step 2 → home, verificar company_id no token |
| Signup fluxo completo 2 etapas — web | D-01 | Idem web | Mesmo fluxo no browser |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
