# Orcivo — STATE.md

## Estado atual

**Fase ativa:** 0 — Validação e Fundação
**Status:** Planejada — aguardando aprovação para iniciar execução
**Data:** 2026-05-21

## Deliverables da Fase 0

| Deliverable | Status | Critério de pronto |
|---|---|---|
| D0.1 — Validação com técnicos | Não iniciado | 3+ técnicos confirmariam pagar Orcivo Mais |
| D0.2 — VPS segura | Não iniciado | SSH por chave, firewall ativo, Docker instalado |
| D0.3 — Stack core deployada | Não iniciado | Postgres, Redis, MinIO, Caddy com HTTPS |
| D0.4 — Monorepo e CI | Não iniciado | CI verde em push para main |
| D0.5 — Hello world | Não iniciado | health API + APK Android + web no ar |

## Bloqueios

Nenhum bloqueio ativo.

**Gate D0.1:** se < 3 técnicos confirmarem pagamento, pausar e ajustar proposta antes de continuar.

## Decisões tomadas nesta sessão

- Modo de execução: Interativo
- Granularidade: Detalhado (fine)
- Git tracking: Sim (planning docs versionados)
- Agentes: Pesquisa + Verificador de plano + Verificador pós-execução
- Pesquisa de domínio: pulada (toda documentação já existe em `/docs/`)

## Próximos passos

1. Usuário aprova este plano
2. `/gsd-plan-phase 0` para criar planos detalhados de execução
3. Execução deliverable a deliverable, começando por D0.1

## Histórico

| Data | Evento |
|---|---|
| 2026-05-21 | Projeto inicializado no GSD; Fase 0 planejada |
