# Phase 0: Validação e Fundação - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 0 — Validação e Fundação
**Areas discussed:** Protótipo de validação, Domínio e VPS, Repositório e monorepo, Recrutamento para entrevistas

---

## Protótipo de Validação

| Option | Description | Selected |
|--------|-------------|----------|
| HTML estático | Usa o design system existente, valida proposta de valor E design ao mesmo tempo | ✓ |
| Figma | Mais rápido, zero código, mas dependeria de Figma configurado | |

**User's choice:** Usar o design handoff existente como protótipo principal. HTML estático simples como click-through se necessário.

**Notes:** Não criar Figma, não criar app funcional, não recriar telas do zero. Usar cards/telas já gerados em `/docs/design-handoff/orcivo-design-system`. HTML apenas para navegação, sem backend nem React. Tempo máximo: meio dia a 1 dia. Não deve virar implementação real.

---

## Domínio e VPS

| Option | Description | Selected |
|--------|-------------|----------|
| Hetzner | Melhor custo-benefício global, CX22 ~€3,79/mês | |
| Hostinger | Brasil, KVM com bom custo, suporte pt-BR | ✓ |
| Já tenho VPS / outro provider | — | |

**Provider escolhido:** Hostinger

| Spec | RAM | CPU | Disco | Selected |
|------|-----|-----|-------|----------|
| KVM2 | 8GB | 2 vCPU | 100GB NVMe | |
| KVM1 | 4GB | 1 vCPU | 50GB NVMe | ✓ |

**User's choice:** KVM1. Suficiente para Fase 0/1, custo baixo, upgrade para KVM2 quando necessário.

**Notes:** Configurar swap 4GB. Docker Compose enxuto — sem GlitchTip, Umami, observabilidade pesada na Fase 0. Priorizar PostgreSQL, Redis, MinIO, Caddy, backend, web. Hostinger permite upgrade sem reconfigurar.

---

## Domínio

| Option | Description | Selected |
|--------|-------------|----------|
| Já tenho domínio comprado | Usar domínio real nos planos | |
| Ainda não comprei | Usar placeholder nos planos | ✓ |

**User's choice:** Ainda não comprado. Planos usam placeholder (`seudominio.com.br`).

---

## Repositório e Monorepo

| Option | Description | Selected |
|--------|-------------|----------|
| Este repo é o monorepo final | Push do repo atual para GitHub | ✓ |
| Repo novo separado | Este fica só para planejamento | |

| Option | Description | Selected |
|--------|-------------|----------|
| Conta pessoal (Encryptedx00x) | Mais simples, adequado para solo | ✓ |
| GitHub Organization | Mais profissional, mais setup | |

**User's choice:** Repo atual → GitHub privado na conta pessoal Encryptedx00x.

---

## Recrutamento para Entrevistas

| Option | Description | Selected |
|--------|-------------|----------|
| Contatos diretos | WhatsApp/indicações, maior qualidade | |
| Grupos e fóruns | Facebook, Telegram, mais volume | |
| Misto | Contatos diretos + grupos | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Remotas | Videochamada/WhatsApp, fácil de agendar | ✓ |
| Presenciais | Mais ricas, requer deslocamento | |

**User's choice:** Misto (contatos + grupos). Entrevistas remotas.

---

## Claude's Discretion

- Estrutura interna do Caddyfile
- Configuração do fail2ban (thresholds, bantime)
- Configuração do backup automático de volumes
- Estrutura do roteiro de entrevista (15 perguntas)
- Formato de registro das respostas
- Conteúdo dos ADRs 001-011

## Deferred Ideas

- GlitchTip / Umami — fora do escopo Fase 0, avaliar em Fase 1
- GitHub Organization — avaliar ao adicionar colaboradores (Fase 2+)
- Domínio real — comprar antes de D0.3, não bloqueante para D0.4/D0.1
