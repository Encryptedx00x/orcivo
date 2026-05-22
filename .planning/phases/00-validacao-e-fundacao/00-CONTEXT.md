# Phase 0: Validação e Fundação - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Duas trilhas paralelas:
1. **Validação de mercado** — confirmar que técnicos instaladores pagariam pelo Orcivo antes de qualquer código de produto (D0.1)
2. **Fundação técnica** — ter infra + monorepo + hello world prontos para receber código de domínio (D0.2–D0.5)

O critério de conclusão é duplo: evidência de mercado (3+ técnicos confirmariam pagar Orcivo Mais) + fundação técnica verificável (`GET /health` → 200, APK no Android real, web no ar, CI verde).

</domain>

<decisions>
## Implementation Decisions

### D0.1 — Protótipo de Validação

- **D-01:** Usar o design handoff existente em `docs/design-handoff/orcivo-design-system/` como material principal para as entrevistas. Não criar Figma, não criar app funcional, não recriar telas do zero.
- **D-02:** Se precisar de material mais navegável: criar apenas um HTML estático simples (click-through/demo sem backend, sem React complexo, sem regra de negócio). Tempo máximo: meio dia a 1 dia.
- **D-03:** O HTML de demo serve SOMENTE para entrevista — não deve virar implementação real do produto.
- **D-04:** Objetivo das entrevistas: mostrar proposta de valor completa (clientes, orçamento, OS, agenda, financeiro, web/PC); validar se técnico entende o produto; validar se pagaria pelo Orcivo Mais (R$199,90/ano); validar se o design parece profissional; coletar objeções.
- **D-05:** Recrutamento misto: contatos diretos (WhatsApp/indicações) + grupos de técnicos (Facebook, WhatsApp, Telegram). Meta: 5 entrevistas, critério de sucesso: 3+ confirmações de pagamento.
- **D-06:** Entrevistas remotas (videochamada ou WhatsApp).

### D0.2 — VPS

- **D-07:** Provider: **Hostinger**.
- **D-08:** Spec inicial: **KVM1 — 1 vCPU, 4GB RAM, 50GB NVMe**. Suficiente para Fase 0 e Fase 1 com custo baixo.
- **D-09:** Swap de 4GB obrigatório (INFRA-08) dado o limite de RAM.
- **D-10:** Docker Compose enxuto — não subir GlitchTip, Umami, Loki/Grafana ou qualquer observabilidade pesada na Fase 0. Priorizar: PostgreSQL, Redis, MinIO, Caddy, backend, web.
- **D-11:** Caminho de upgrade previsto: KVM2 (2 vCPU, 8GB RAM) quando necessário — Hostinger permite upgrade sem reconfigurar.
- **D-12:** SO: Ubuntu 22.04 LTS ou Debian 12 (conforme INFRA-01).

### D0.3 — Domínio

- **D-13:** Domínio ainda não comprado. Os planos de DNS e Caddyfile devem usar placeholder (ex: `seudominio.com.br`). Substituir pelo domínio real quando comprado.
- **D-14:** Runbook `docs/runbooks/vps-setup.md` deve incluir instrução sobre compra e configuração de domínio como pré-requisito.

### D0.4 — Repositório e Monorepo

- **D-15:** O repositório atual (`orcivo/`) é o monorepo final. Criar no GitHub como repositório **privado** na conta pessoal **Encryptedx00x**.
- **D-16:** Sem GitHub Organization por enquanto. Conta pessoal é suficiente para solo/equipe pequena até Fase 3.
- **D-17:** `.planning/` e `docs/` são versionados junto com o código (já estão no repo).

### Claude's Discretion

- Estrutura interna do Caddyfile (formato de blocos, headers de segurança)
- Configuração específica do fail2ban (thresholds, bantime)
- Configuração do backup automático de volumes (ferramenta, frequência, destino)
- Estrutura do roteiro de entrevista (15 perguntas conforme VAL-01 — Claude define as perguntas)
- Formato de registro das respostas das entrevistas (tabela, planilha, doc)
- Estrutura interna dos ADRs 001-011 (conteúdo conforme decisões travadas em PROJECT.md)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design e protótipo
- `docs/design-handoff/orcivo-design-system/README.md` — Design system oficial; base para o material de entrevistas
- `docs/design-handoff/orcivo-design-system/SKILL.md` — Instruções de uso do design system
- `docs/design-handoff/orcivo-design-system/ui_kits/web/README.md` — UI Kit web
- `docs/design-handoff/orcivo-design-system/ui_kits/mobile/README.md` — UI Kit mobile

### Planejamento e requisitos
- `docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` — Documento mestre do produto (stack §3-4, domínio §5, auth §8, planos §11-13)
- `.planning/REQUIREMENTS.md` — Requisitos completos da Fase 0 (VAL, INFRA, STACK, MONO, CI, HELLO, DOCS)
- `.planning/ROADMAP.md` — Deliverables D0.1–D0.5, critérios de conclusão e gates

### Stack (decisões travadas)
- `.planning/PROJECT.md` — Stack e decisões travadas (PostgreSQL, Redis, MinIO, Caddy, NestJS, Expo, etc.)
- `CLAUDE.md` — Regras de projeto (design, nomenclatura, regras técnicas críticas, autoria)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/design-handoff/orcivo-design-system/` — Design system completo com tokens CSS, UI kits web e mobile. Usar como base para o HTML de demo D0.1.

### Established Patterns
- Repositório já tem `.planning/` versionado — manter estrutura GSD junto com código.
- Stack completamente travado no PROJECT.md — não há decisões de stack em aberto para a Fase 0.

### Integration Points
- `prisma/` — ainda vazio; schema mínimo virá no D0.5 (apenas estrutura de scaffolding).
- `apps/` — ainda vazio; placeholder apps serão criados no D0.4.

</code_context>

<specifics>
## Specific Ideas

- Para D0.1: examinar telas já geradas em `docs/design-handoff/orcivo-design-system/uploads/` — podem ser usadas diretamente como imagens no HTML de demo sem recriar nada.
- Para D0.4: o repo atual já está no diretório certo — apenas `git remote add origin` + push para criar no GitHub.
- KVM1 Hostinger + swap 4GB é configuração-alvo documentada; o plano P0.2.2 deve cobrir setup de swap explicitamente.

</specifics>

<deferred>
## Deferred Ideas

- GlitchTip, Umami, Uptime Kuma — mencionados em REQUIREMENTS.md como out-of-scope para Fase 0; confirmar na Fase 1 ou quando houver folga de RAM na VPS.
- GitHub Organization (ex: `orcivo-app`) — avaliar ao adicionar colaboradores (Fase 2+).
- Domínio real — comprar antes de executar D0.3; não é bloqueante para D0.4/D0.1.

</deferred>

---

*Phase: 00-validacao-e-fundacao*
*Context gathered: 2026-05-21*
