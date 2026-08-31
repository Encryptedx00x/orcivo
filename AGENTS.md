# AGENTS.md — Orcivo

## Before working

Read:

```text
docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md
docs/FRONTEND_DESIGN_MASTER.md
docs/OPERATIONS_UI_MISSING_SPECS.md
docs/AUTONOMY_POLICY.md
docs/DECISION_MATRIX.md
docs/GPT_DECISION_BRIDGE.md
```

## Autonomy

Follow `docs/AUTONOMY_POLICY.md` and `docs/DECISION_MATRIX.md`.

**Level A:** Execute alone — boilerplate, docs, tests, lint, typecheck, builds, refactors, bug fixes, internal architecture, library choice among equivalents, implementation order, ephemeral-DB migrations, local Docker, CI, commits, normal push, any reversible technical decision.

**Level B — Claude decides autonomously:** internal architecture decisions, technical tradeoffs, choice between valid approaches, data-modeling decisions, implementation strategy, research, requirements interpretation, planning, technical-scope decisions, problems with multiple valid solutions, library choice, execution order, phase planning strategy (discuss vs plan), ambiguous error fixes.

Process: research when needed (existing code, official docs) → use Graphify/installed skills when they help → pick the simplest, most robust solution given the locked stack/design → record the decision (ADR or plan/summary note) when it's architecturally relevant → execute without asking the user.

`tools/decision-consultant/consult-gpt.mjs` is available as an optional second opinion — never a required gate, and nothing here depends on `OPENAI_API_KEY` being set.

**Level C:** Ask the user directly — stack change, new paid service, deploy, DNS, externally supplied secret/API key, billing, LGPD, data loss, destructive command, deliberate multi-tenant/money-handling strategy change, a decision that explicitly changes a business requirement, subjective visual judgment that can't be validated by tests/screenshots.

## Git and GitHub

Repository is private and used for development/testing only.

Auto-allowed (no confirmation needed):

- git status, git diff, git add, git commit
- git push to main/master and gsd/\* branches
- commits during GSD plan execution
- push after each completed plan/deliverable
- push after lint/typecheck/test fixes

Pre-push checklist (automated):

- no secrets or API keys in diff
- no "Generated with Claude" or "Co-authored-by Claude"
- no AI prompt/transcript/log files
- run available validations when applicable

Never without explicit user approval:

- git push --force or --force-with-lease
- git reset --hard or git clean -fd
- delete remote branches
- rewrite history
- make repo public
- modify GitHub Secrets
- production deploy, DNS, VPS/SSH, billing, LGPD
- stack changes, design system changes, destructive commands

## Safe read-only commands (auto-approve)

The following are safe to run without confirmation:

- ls, dir, cat, type, grep, findstr
- node -e (inspection only)
- pnpm lint, pnpm typecheck, pnpm test, pnpm turbo run
- npx prisma validate, npx prisma generate
- git status, git diff
- file/folder existence checks

## No AI traces

Do not add:

- Generated with Claude
- Co-authored-by Claude
- AI-generated
- created by AI

Do not commit prompt logs, transcripts or scratchpad decision files.

## Design

Follow the Orcivo design handoff.

Do not recreate the design system.

## Plans

Visible plan names:

- Orcivo Livre
- Orcivo Solo
- Orcivo Mais
- Orcivo Equipe

Do not use:

- FREE
- POP
- PRO
- TOP
- ilimitado
- 14 dias
- Assinar PRO
