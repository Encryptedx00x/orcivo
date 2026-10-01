---
type: product-batch
batch: MVP Launch Batch #2
date: 2026-10-01
state: OWNER_APPROVED
machine_readable: .planning/product/MVP-LAUNCH-BATCH-2.tasks.json
---

# MVP Launch Batch #2 — landing, planos, Mercado Pago, legal, gaps de produção

Sessão de lançamento: landing (apps/site), planos/preços, checkout/assinatura via
**Mercado Pago** (substituindo Asaas), Termos/Privacidade completos e lacunas
restantes de produção (reset de senha, e-mail, infra). Trabalho local, sem deploy —
a VPS é atualizada depois, quando o owner avisar.

## Decisão de preços/limites (Passo 1 — Nível C, resolvida 2026-10-01)

Ver `ownerDecisions.PRICING` em `MVP-LAUNCH-BATCH-2.tasks.json`. Resumo:

| Plano | Mensal | Anual | Clientes | Orçamentos/mês | OS/mês | Membros |
|---|---|---|---|---|---|---|
| Orcivo Livre | Grátis | Grátis | 5 | 10 | 15 | 1 |
| Orcivo Solo | R$9,90 | R$79,90 | 50 | 50 | 30 | 1 |
| Orcivo Mais | R$24,90 | R$199,90 | 200 | ilimitado* | ilimitado* | 3 |
| Orcivo Equipe | R$49,90 | R$389,90 | uso justo | uso justo | uso justo | 8 |

(*"ilimitado" aqui é rótulo interno do limite = null; a UI/copy nunca usa a
palavra "ilimitado" — usa "uso justo"/"uso ampliado" conforme a regra de
linguagem de produto.)

Fonte única de verdade: `packages/shared-types/src/billing/plans.ts`
(L2-P01-plan-source-of-truth). Doc mestre e código sincronizados nos dois
sentidos (L2-P01-docs-pricing-reconcile).

## Paridade mobile/web (owner, 2026-10-01: "ambos devem crescer juntos")

Auditoria encontrou 3 gaps reais entre mobile e o que o Batch 2 estava
construindo só para web/site — corrigidos nas tasks correspondentes:

- **L2-P03-mobile-plan-pricing-sync** (nova task): `apps/mobile/src/screens/plano/plans.ts`
  tinha preços hardcoded já desatualizados (Mais R$19,90, Equipe R$39,90) —
  passa a consumir a mesma fonte única de `L2-P01-plan-source-of-truth`.
- **L2-P04-legal-docs** (escopo ampliado): checkbox de aceite de termos com
  versão+data agora cobre o signup mobile também (mesmo endpoint/schema que
  o web já usa), + link "Ver termos de uso" na tela de signup do mobile.
- **L2-P05-password-reset-invite-ui** (escopo ampliado): mobile não tinha
  NENHUMA tela de recuperação de senha nem de aceite de convite — adiciona
  `ForgotPasswordScreen` e `AcceptInviteScreen` nativas no `AuthStack`,
  reaproveitando os mesmos endpoints do backend.

Não precisa de paridade (decisão deliberada, não gap): checkout/Mercado Pago
(`L2-P02-*`) e SEO/sitemap do site (`L2-P03-site-seo-metadata`) — mobile não
faz cobrança própria por política de loja (`PlanoScreen` já só linka para o
site) e SEO não se aplica a app nativo.

## Autonomia desta sessão (owner, 2026-10-01)

O owner concedeu autonomia total para este batch: toda decisão que normalmente
pararia em `WAITING_HUMAN` (incluindo regras/valores de plano, decisões de
negócio) é decidida pelo agente/autopilot sem perguntar. **Única excepção
real:** `L2-P02-mp-production-activation` — credenciais de produção do
Mercado Pago e cadastro do webhook no painel MP, porque isso depende de uma
conta/ação que só o owner pode fazer. Tudo o resto (desenvolvimento,
sandbox/teste do MP, textos legais, infra como arquivo) é Nível A/B para este
batch.

## Ordem de execução

1. **L2-P01** — fonte única de planos, seed idempotente, doc reconciliado.
2. **L2-P02** — Mercado Pago (provider, webhook, checkout, remoção Asaas, testes) → termina no gate humano de produção.
3. **L2-P03** — site consumindo a fonte única de planos + SEO/metadata.
4. **L2-P04** — Termos/Privacidade completos + aceite no signup.
5. **L2-P05** — reset de senha/convite, Resend, infra (backup + redirect).

## O que entregar ao owner ao final

- O que mudou (resumo por fase).
- Decisões tomadas (preços/limites, arquitetura MP, conteúdo legal) e a única
  pendente (`L2-P02-mp-production-activation`).
- Checklist exato para atualizar a VPS: build, migrate, seed de PlanLimit,
  variáveis novas em `/srv/orcivo/.env` (MP_*, RESEND_*), URL do webhook a
  cadastrar no painel do Mercado Pago.

## Regen

`powershell -File scripts/orchestration/v2/batch-reconcile.ps1 -TasksFile .planning/product/MVP-LAUNCH-BATCH-2.tasks.json`
