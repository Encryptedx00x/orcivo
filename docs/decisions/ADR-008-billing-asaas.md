# ADR-008 — Gateway de pagamento Asaas

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O Orcivo precisa cobrar assinaturas mensais de empresas brasileiras. Os meios de pagamento prioritários são Pix e boleto bancário (perfil de pequenas empresas), com cartão de crédito como secundário. Stripe não suporta Pix nativamente. PagSeguro e Mercado Pago têm burocracia maior.

## Decisão

Usar Asaas como gateway de pagamento para cobrança de assinaturas (implementado na Fase 3). Asaas suporta Pix, boleto e cartão, com API REST e webhooks. Todo evento de webhook será processado com WebhookEvent para idempotência.

## Consequências

**Positivas:**
- Suporte nativo a Pix e boleto — meios preferidos pelo público-alvo
- Sem custo de setup ou mensalidade mínima — pay-per-use
- API REST bem documentada com SDKs disponíveis
- Suporte a cobrança recorrente (assinaturas) nativo

**Negativas / trade-offs:**
- Dependência crítica de terceiro para o fluxo de pagamento
- Asaas pode ter downtime — precisamos de circuit breaker e retry logic
- WebhookEvent obrigatório para todos os eventos — complexidade adicional de implementação
- Mudar de gateway no futuro é custo alto de migração de dados de cobrança
