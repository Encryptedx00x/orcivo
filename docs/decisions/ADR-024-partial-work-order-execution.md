# ADR-024 — Realização parcial de ordem de serviço

**Status:** Proposto — aguarda decisão do dono na B4-33
**Data:** 2026-10-14
**Relacionado:** B4-32 (levantamento), B4-41/B4-42 (implementação condicionada)

## Contexto

Hoje uma OS aponta para o orçamento aprovado, mas não possui itens próprios. A conclusão muda a OS inteira para
`DONE`, pode baixar todos os produtos do orçamento e não reconcilia as parcelas criadas na aprovação. Assim, marcar
dois de três serviços como realizados não pode ser representado com segurança por um novo rótulo na UI.

A matriz do estado atual e dos casos está em `docs/qa/B4-32-PARTIAL-WORK-ORDER-DOMAIN-MATRIX.md`.

## Decisão proposta

### 1. Criar snapshot operacional dos itens

Ao criar a OS a partir de orçamento aprovado, copiar cada `QuoteItem` para `WorkOrderItem`. O orçamento e seu PDF
continuam imutáveis; a execução passa a operar no snapshot da OS.

Campos mínimos propostos:

- `id`, `company_id`, `work_order_id`, `source_quote_item_id?`, `catalog_item_id?`;
- descrição, tipo, unidade, quantidade contratada, preço unitário e total contratado congelados;
- `status`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `PARTIALLY_COMPLETED`, `NOT_PERFORMED`;
- `completed_quantity` como `Decimal(10,3)`;
- `started_at`, `completed_at`, `not_performed_reason`, ator e timestamps;
- versão para concorrência otimista e chave única segura para o item de origem.

OS manual nasce com pelo menos um item de serviço criado a partir do título. Para legado, a migration idempotente cria
um item sintético por OS sem snapshot; não tenta reconstruir detalhes inexistentes.

### 2. Preservar o estado macro da OS

Não adicionar `PARTIAL` ao enum principal. `DONE` continua significando encerrada, enquanto `completion_kind` é
derivado:

- `FULL`: todos os itens realizados integralmente;
- `PARTIAL`: ao menos um realizado e ao menos um parcial/não realizado;
- `NONE`: nenhum realizado — não pode concluir, deve cancelar.

A OS só conclui quando todos os itens estão terminais (`COMPLETED`, `PARTIALLY_COMPLETED` ou `NOT_PERFORMED`) e algum
foi realizado. Item `NOT_PERFORMED` exige motivo. Reabrir seleciona itens, volta a OS para `IN_PROGRESS` e cria eventos
compensatórios; não apaga histórico.

### 3. Separar realização de decisão financeira

Realização não deve alterar cobrança silenciosamente. Na conclusão parcial, o backend calcula com `Decimal` um
snapshot de conciliação contendo total contratado, total correspondente ao realizado, valores já pagos, saldo
pendente e diferença. O usuário autorizado escolhe a política aprovada pelo dono antes de finalizar:

- cobrar somente o realizado;
- manter o valor contratado;
- informar valor final manual com justificativa.

Recomendação inicial: **cobrar somente o realizado como sugestão, nunca como mutação automática**. A confirmação
congela um `WorkOrderSettlement` auditável. Parcelas pendentes podem ser ajustadas/canceladas dentro do saldo aprovado;
pagamentos `PAID` e recibos numerados nunca são reescritos. Diferença sobre valor já pago exige crédito/devolução ou
ajuste explícito, fora de um simples toggle de item.

Não usar `PaymentStatus.PARTIAL` para indicar OS parcial: ele continua significando pagamento parcialmente recebido.

### 4. Estoque por quantidade efetivamente entregue

- empresa configurada para baixa na aprovação: produtos não entregues recebem movimento de crédito compensatório na
  conciliação final;
- empresa configurada para baixa na conclusão: debitar somente `completed_quantity` de itens `PRODUCT`;
- todo `StockMovement` novo referencia `work_order_item_id`, mantém `company_id` e chave idempotente;
- reabertura/correção cria movimento inverso; nunca edita movimento histórico.

Serviços não geram estoque. Produto entregue pode ser concluído mesmo que outro serviço não seja realizado.

### 5. Garantia por item realizado

Somente item realizado ganha `warranty_started_at`, normalmente na data de conclusão do item, e snapshot da condição
de garantia aplicável. Item não realizado não ganha garantia. Acionar garantia exige selecionar ao menos um item
elegível; o status macro `WARRANTY` continua sendo um indicador da OS, enquanto o vínculo e histórico ficam por item.

Prazo estruturado, cobertura e documento específico de garantia exigem requisito próprio se o texto livre atual não
for suficiente. Esta ADR não inventa prazo.

### 6. Auditoria e concorrência

Eventos mínimos:

- `work_order_item.started/completed/partially_completed/not_performed/reopened`;
- `work_order.partially_completed` ou `work_order.completed` com resumo dos itens;
- `work_order.settlement_confirmed` com valores string decimal e política;
- eventos compensatórios de estoque e financeiro.

Conclusão de item usa versão/estado esperado e idempotency key. Finalização da OS, settlement, movimentos e auditoria
rodam em transação. Uma segunda sessão recebe estado atual amigável e refaz a leitura, sem duplicar efeitos.

## Wireframes funcionais por superfície

### Web desktop — completo

Tabela no detalhe da OS: item, contratado, realizado, estado e ação. Ao concluir, painel lateral resume “2 de 3
realizados”, valores e efeitos antes da confirmação.

### Web desktop — fácil

Checklist em cartões grandes: “Feito”, “Feito em parte” ou “Não realizado”. Uma etapa final simples mostra pendências
e abre “Revisar valores” quando necessário.

### Web mobile — completo

Itens em cartões/accordions de uma coluna; quantidade e motivo aparecem dentro do item. CTA fixo só habilita após
todos estarem terminais e não pode cobrir conteúdo/safe area.

### Web mobile — fácil

Fluxo guiado, um item por vez, com resumo final “Você realizou 2 de 3”. A escolha financeira nunca fica implícita.

### App nativo — completo

Lista nativa com estado por item, suporte offline somente após definir fila/idempotência; sincronização conflitante
mostra o estado do servidor e permite revisar.

### App nativo — fácil

Mesmo fluxo guiado do web fácil em componentes nativos. Só implementar/validar após reproduzir o fluxo autenticado;
não inferir layout do DOM web.

## Decisões reservadas ao dono (B4-33)

1. Aprovar snapshot `WorkOrderItem` e item sintético para OS manual/legada.
2. Aprovar `DONE` + resultado derivado `FULL/PARTIAL`, sem novo status macro `PARTIAL`.
3. Escolher política financeira padrão: somente realizado (recomendado), valor contratado ou sempre decisão manual.
4. Definir quem pode confirmar valor final e ajustes/créditos após pagamento.
5. Aprovar baixa de estoque pela quantidade entregue e estorno compensatório quando a baixa ocorreu na aprovação.
6. Aprovar início de garantia por item realizado e seleção de item ao acionar garantia.
7. Definir se `PARTIALLY_COMPLETED` permite quantidade parcial em qualquer item ou somente quando unidade/negócio
   permitir.
8. Aprovar o tratamento de legado: item sintético sem reconstrução retroativa de detalhes.

## Alternativas descartadas

- apenas novo status `PARTIAL` na OS: não identifica item, quantidade nem efeitos;
- editar/remover `QuoteItem`: altera contrato/PDF aprovado;
- reutilizar `PaymentStatus.PARTIAL`: mistura execução com recebimento;
- reduzir parcelas automaticamente: pode reescrever obrigação já paga e recibo;
- usar `Number`: perde precisão monetária/decimal;
- baixar todos os produtos ao concluir parcialmente: diverge da entrega real;
- guardar itens como JSON na OS: enfraquece integridade, concorrência, índices e auditoria.

## Critérios para B4-41/B4-42, se aprovadas

1. Migration idempotente, `company_id` e backfill sintético; backend/shared-types primeiro.
2. State machine por item, constraints Decimal e conclusão agregada cobertas por specs.
3. Integração `3 contratados / 2 realizados`, zero realizado, quantidade parcial, duas sessões e isolamento tenant com
   `--runInBand` em banco local.
4. Financeiro, recibo, estoque e garantia seguem a política aprovada e usam efeitos compensatórios auditáveis.
5. Web desktop/mobile e app fácil/completo compartilham contratos; app só recebe defeito após reprodução.
6. Matriz `1440×900`, `390×844`, `360×800`, dois modos e app, incluindo teclado, offline/conflito e textos longos.
7. Nenhum billing, dado de produção, loja ou design system é alterado.
