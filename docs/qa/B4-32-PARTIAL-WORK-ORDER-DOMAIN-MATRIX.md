# B4-32 — Matriz de realização parcial da OS

**Data:** 2026-10-14
**Escopo inspecionado:** schema, OS, orçamento, recebimentos/recibos, estoque, shared-types e superfícies web/app.

## Estado atual confirmado

| Eixo          | Estado atual                                                                     | Gap para realização parcial                                  |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| orçamento     | `QuoteItem` preserva descrição, tipo, quantidade, preço e total com `company_id` | item aprovado não vira item operacional próprio              |
| OS            | guarda `quote_id`, título, estado e datas; não existe `WorkOrderItem`            | só a OS inteira pode iniciar/concluir/cancelar               |
| detalhe da OS | inclui apenas ID, número e total do orçamento                                    | superfícies não recebem a lista contratada por item          |
| transições    | `PENDING → IN_PROGRESS → DONE`; reabertura/correção auditadas                    | `DONE` não distingue 3/3 de 2/3 realizados                   |
| cobrança      | parcelas do total aprovado nascem no momento da aprovação                        | não há reconciliação entre contratado, realizado e já pago   |
| recibo        | representa um `Payment` pago e recebe número imutável por empresa                | não deve ser reescrito quando um item deixa de ser realizado |
| estoque       | baixa todos os produtos do orçamento na aprovação ou na conclusão da OS          | não conhece produto entregue/não entregue por item           |
| garantia      | texto no orçamento + estado opcional da OS inteira                               | não há elegibilidade/data/acionamento por serviço realizado  |
| auditoria     | registra transição da OS inteira e efeitos financeiros/estoque                   | não identifica item, quantidade ou motivo da não realização  |
| UI            | mostra ações e pagamentos no nível da OS                                         | não oferece checklist/quantidade/motivo por item             |

O enum financeiro `PaymentStatus.PARTIAL` descreve recebimento parcial, não realização parcial da OS. Reutilizá-lo
como estado operacional misturaria dois domínios.

## Matriz de casos obrigatórios

| Caso                                          | Resultado operacional                                     | Dinheiro/documento                                                     | Estoque/garantia                                   |
| --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 3 serviços, 3 realizados                      | OS concluída integralmente                                | total contratado; parcelas atuais seguem                               | garantia nos 3                                     |
| 3 serviços, 2 realizados                      | OS concluída parcialmente; terceiro exige motivo          | revisão explícita do valor final                                       | garantia apenas nos 2                              |
| item com quantidade 3, quantidade 2 realizada | item parcialmente realizado com quantidade decimal válida | cálculo usa Decimal e política aprovada                                | baixa/garantia somente da quantidade realizada     |
| nenhum item realizado                         | não permitir “concluir”; cancelar OS com motivo           | não gerar cobrança nova; conciliar pendências                          | restaurar/reservar conforme evento configurado     |
| produto entregue sem serviço concluído        | estados independentes por item                            | produto pode permanecer cobrável                                       | baixar somente quantidade entregue                 |
| serviço concluído sem produto previsto        | serviço pode concluir                                     | cobrança conforme snapshot                                             | sem movimento de estoque                           |
| pagamento pendente e valor final menor        | pedir confirmação antes de ajustar                        | ajustar/cancelar somente saldo pendente, com auditoria                 | sem efeito retroativo indevido                     |
| pagamento já pago/recibo emitido              | preservar pagamento e recibo                              | diferença vira crédito/devolução/ajuste explícito; nunca apagar recibo | trilha compensatória                               |
| reabrir item antes de conciliar               | OS volta a execução                                       | settlement ainda não congelado pode ser recalculado                    | movimento ainda não finalizado pode ser compensado |
| reabrir após conciliação/recibo               | ação administrativa com motivo                            | novo ajuste, sem mutar documento histórico                             | crédito/débito compensatório                       |
| duas sessões concluem o mesmo item            | uma transição vence                                       | nenhum efeito duplicado                                                | movimento e auditoria idempotentes                 |
| item/OS de outra empresa                      | 404/403 neutro                                            | nenhum dado/valor revelado                                             | nenhum movimento                                   |

## Invariantes propostas para os testes futuros

1. Todo item novo carrega `company_id` e pertence à mesma empresa da OS, orçamento e catálogo de origem.
2. Quantidades e dinheiro usam `Decimal` no backend e string decimal nos contratos; nunca `Number` para cálculo.
3. `completed_quantity` fica entre zero e a quantidade contratada.
4. `DONE` exige todos os itens terminais e pelo menos um item realizado; zero realizado exige cancelamento.
5. “Parcialmente concluída” é resultado derivado dos itens, não substitui estados financeiros.
6. Item não realizado exige motivo e ator; correção/reabertura nunca apaga o evento anterior.
7. Baixa de estoque, snapshot financeiro e auditoria acontecem na mesma transação da conclusão aplicável.
8. Um mesmo comando/idempotency key não produz segunda baixa, ajuste, recibo ou auditoria.
9. Orçamento aprovado e PDF histórico permanecem imutáveis.
10. Recibo numerado permanece imutável; correções financeiras usam evento/documento compensatório.

## Cobertura existente a preservar

- shared-types: máquina de estados e ações permitidas da OS;
- backend: state machine concorrente/auditada, isolamento, criação pendente após aprovação;
- estoque: baixa configurável, idempotência e estorno em cancelamento/reabertura;
- pagamento: parcelas, excedente confirmado, número/assinatura/opções congeladas do recibo;
- orçamento: aprovação idempotente, itens `Decimal`, geração de OS e recebíveis em transação.

Essas suítes provam o comportamento integral atual; não provam itens operacionais, quantidade realizada, settlement
parcial ou garantia por item.
