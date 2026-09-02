# ADR-017 — Billing provider-agnostic; Mercado Pago como provedor preferido (P06)

**Status:** Accepted (arquitetura) · Proposed (escolha final do provedor — confirma em P06)
**Data:** 2026-09-01
**Autores:** Dyogo Ortega (owner) · Claude (Decision Agent)
**Substitui parcialmente:** ADR-008 (Asaas) — ver "Relação com ADR-008"
**Relacionado:** `03.1-P06-PLAN.md` (billing e limites),
`03.1-DISCOVERY-UAT-2026-09-01.md` (D-8)

## Contexto

A Fase 3 deixou **placeholders de Asaas** (`billing/asaas.client.ts`, webhook
`webhooks/asaas`, env `ASAAS_*`, `ADR-008`). Nada disso está em produção — não há
conta, credencial nem cobrança real.

O owner tem experiência prévia com **Mercado Pago** (integração, checkout
transparente, webhooks) e prefere usá-lo. Mas trocar de provedor com o domínio
acoplado a um SDK específico é caro (a própria ADR-008 lista isso como risco).

## Decisão

### 1. Arquitetura provider-agnostic (antes de P06, sem integração real)

Definir uma abstração no domínio de billing:

- `PaymentProvider` (interface) — criação de assinatura/cobrança, consulta de
  status, cancelamento, parsing/verificação de webhook, geração de dados de
  checkout transparente.
- `MercadoPagoProvider implements PaymentProvider` — implementação real (P06).
- O domínio (`SubscriptionService`, `WebhookModule`, guards, limites) **depende
  só da interface**, nunca do SDK do Mercado Pago diretamente.
- `WebhookEvent` (idempotência) permanece obrigatório e agnóstico de provedor.
- Config por env, com o provedor selecionável (`BILLING_PROVIDER=mercadopago`).

Os placeholders de Asaas são **renomeados/refatorados** para essa forma (ou
substituídos por um `NoopProvider` até P06). Nenhuma credencial é adicionada.

### 2. Mercado Pago como provedor preferido para P06

Registrado como preferência. **Confirmação formal + ADR de escolha do provedor
acontece no início de P06**, revisando os requisitos de cobrança então vigentes.

### 3. O que P06 precisa cobrir (checklist, quando a fase chegar)

- Revisão dos requisitos de cobrança e ADR da escolha do provedor.
- Mapeamento planos → assinaturas (Orcivo Livre sem gateway; Solo/Mais/Equipe
  com cobrança recorrente).
- Checkout transparente (dados de pagamento no site Orcivo, não redirect).
- Ciclo de vida da assinatura: criação, renovação, upgrade/downgrade, cancelamento.
- Webhooks: verificação de assinatura/origem, `WebhookEvent` idempotente,
  retry/backoff, reconciliação periódica (job) contra a API do provedor.
- Inadimplência: carência por plano, `PAST_DUE → BLOCKED`, banner, e-mail
  (regra já definida na Fase 3 — mantida).
- Pagamentos avulsos (recebimento de OS/orçamento via Pix) — avaliar se entra
  aqui ou fica separado do billing de assinatura.
- Segurança: credenciais só em vault; nada no repo; RBAC (`@AdminOnly` em
  checkout/billing — já feito em P02-T05).
- Sandbox primeiro; produção depois, com aprovação humana explícita.

### 4. Gates humanos (inalterados)

- Criar conta no provedor, gerar/instalar credenciais, ativar o serviço e
  qualquer cobrança real = **HUMAN_APPROVAL** (Nível C).
- Esta ADR **não autoriza** nenhum desses passos. Só fixa a arquitetura e a
  preferência.

## Relação com ADR-008

ADR-008 (Asaas) fica **Superseded** para efeito de escolha de provedor. O que se
aproveita dela: a exigência de `WebhookEvent` para idempotência, circuit
breaker/retry, e a análise de que Pix + boleto são meios prioritários (Mercado
Pago cobre os três: Pix, boleto, cartão). A decisão de provedor passa a ser
Mercado Pago (a confirmar em P06).

## Consequências

**Positivas**

- Domínio isolado do SDK → trocar/adicionar provedor no futuro é implementar uma
  interface, não refatorar billing.
- Alinha com a experiência do owner (menor risco de execução em P06).
- Permite um `NoopProvider`/sandbox para testar todo o fluxo de assinatura sem
  cobrança real.

**Negativas / trade-offs**

- Camada de abstração tem custo inicial (uma interface + um provider) — pequeno e
  pago uma vez.
- Abstração prematura tem risco de não encaixar no provedor real; mitigado
  mantendo a interface mínima (só o que P06 vai usar) e finalizando o desenho em
  P06 com o SDK real em mãos.
- Refatorar os placeholders de Asaas agora é trabalho sem feature visível —
  aceito porque destrava P06 e remove código morto enganoso.

## Não faz parte desta decisão

- Implementar Mercado Pago agora.
- Criar conta, usar credenciais, tocar produção.
- Escolher entre "billing de assinatura" e "recebimento avulso de OS" no mesmo
  provider — isso é decisão de P06 / P07.
