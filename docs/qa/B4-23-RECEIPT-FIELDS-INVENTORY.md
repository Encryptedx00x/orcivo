# B4-23 — Inventário de campos do recibo

Data do levantamento: 2026-10-14. Este documento descreve o contrato atual e orienta B4-24, B4-26 e B4-27. Ele não altera modelo, PDF nem configuração.

## Limites da comparação

Os PDFs fornecidos foram usados somente como referência de estrutura e conteúdo. Cores, composição, ícones e identidade não devem ser copiados. O recibo Orcivo continua usando os tokens, a tipografia, o roxo `#6D28D9` e os componentes já aprovados.

A referência de recibo contém cabeçalho empresarial completo, data do documento, declaração com pagador, valor, referência e data, seção de pagamento, informações adicionais e assinatura. A referência de orçamento confirma a utilidade de separar dados da empresa e do cliente, mas não cria opções de recibo por si só.

## Matriz atual

Legenda de configuração:

- **valor**: o usuário pode preencher o conteúdo, mas não escolher separadamente sua visibilidade;
- **documento**: escolha feita naquele recibo;
- **não**: não existe configuração equivalente hoje.

| Grupo / campo                             | Origem atual                                                       | Padrão atual                                          | Configurável hoje | Web completo/fácil                          | App completo/fácil     | PDF atual                        | Lacuna / destino recomendado                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- | ----------------- | ------------------------------------------- | ---------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| Logo                                      | `company.logo_url`                                                 | mostra se existir; iniciais no preview quando ausente | valor             | sim                                         | sim                    | sim, com iniciais quando ausente | manter; visibilidade pode integrar `company_header` em B4-24                            |
| Nome da empresa                           | `company.trade_name`                                               | sempre                                                | não               | sim                                         | sim                    | sim                              | núcleo do emissor; não ocultar isoladamente                                             |
| CPF/CNPJ da empresa                       | `company.document_type/document`                                   | mostra se preenchido                                  | valor             | sim                                         | sim                    | sim                              | incluir em `company_details`, ligado por padrão                                         |
| Telefone/endereço/cidade/UF da empresa    | perfil da empresa                                                  | mostra partes preenchidas                             | valor             | sim                                         | sim                    | sim                              | incluir em `company_details`, ligado por padrão                                         |
| Instagram/site                            | `company.instagram/website`                                        | mostra se preenchido                                  | valor             | preview web não recebe ambos; app não exibe | não                    | sim                              | alinhar previews ao PDF e incluir em `company_details`                                  |
| Registro profissional                     | `company.professional_registration`                                | somente junto da assinatura                           | valor             | não aparece no preview                      | não aparece no preview | sim                              | alinhar previews; não usar “técnico” como rótulo fixo                                   |
| Número do recibo                          | `payment.receipt_number`                                           | sempre                                                | não               | sim                                         | sim                    | sim                              | núcleo do documento; manter obrigatório                                                 |
| Valor recebido                            | `payment.amount` decimal                                           | sempre, `formatMoney`                                 | não               | sim                                         | sim                    | sim                              | núcleo do documento; manter obrigatório e decimal string                                |
| Nome do pagador                           | `payment.customer.name`                                            | sempre                                                | não               | sim                                         | sim                    | sim                              | núcleo da declaração; manter obrigatório                                                |
| CPF/CNPJ, telefone e endereço do pagador  | `payment.customer`                                                 | mostra partes preenchidas                             | não               | sim                                         | sim                    | sim                              | criar `client_details`, ligado por padrão                                               |
| Referência                                | descrição do pagamento e vínculo com OS/orçamento                  | sempre com fallback “serviços prestados”              | não               | sim                                         | sim                    | sim                              | núcleo; B4-24 deve preservar snapshot legível                                           |
| Data do recebimento                       | `paid_at`, fallback `updated_at/created_at`                        | sempre                                                | não               | sim                                         | sim                    | sim                              | núcleo; manter; B4-26 pode incorporá-la também à declaração                             |
| Forma de pagamento                        | `payment.method`                                                   | sempre, “Não informado” se ausente                    | não               | sim                                         | sim                    | sim                              | criar opção `payment_details`, ligada por padrão                                        |
| Informações adicionais                    | não há campo documental próprio; `description` compõe a referência | ausente                                               | não               | não                                         | não                    | não                              | modelar campo próprio opcional, sem duplicar a referência                               |
| Assinatura                                | snapshot em `receipt_signature_key` e nome do signatário           | oculta quando não escolhida                           | documento         | sim                                         | sim                    | sim                              | B4-22 cobre salva/avulsa/ausente; manter decisão por recibo                             |
| Chave Pix                                 | `company.pix_key`                                                  | mostra se preenchida                                  | valor             | sim                                         | sim                    | sim                              | opção `pix`, ligada quando houver valor                                                 |
| Frase de rodapé                           | `company.document_footer`                                          | mostra se preenchida                                  | valor             | não aparece nos previews                    | não aparece no preview | sim                              | alinhar previews e incluir opção `footer`                                               |
| Garantia                                  | não existe no recibo                                               | ausente                                               | não               | não                                         | não                    | não                              | não levar automaticamente do orçamento; somente se B4-24 definir semântica útil         |
| Meios/condições de pagamento do orçamento | `quote.payment_terms`                                              | não pertence ao recibo atual                          | não               | não                                         | não                    | não                              | recibo registra o pagamento realizado; não copiar condições futuras sem regra explícita |

## O que já existe e não deve ser duplicado

1. `QuoteDocOptions` é exclusivo do orçamento e já controla título, cor, detalhes do cliente, preços, subtotal, total, validade, condições e Pix.
2. `COMPANY_DOC_FIELDS` já centraliza Instagram, site, registro profissional e frase de rodapé. Esses valores devem ser reutilizados pelo recibo.
3. Perfil da empresa já contém logo, nome, documento, telefone, endereço e Pix.
4. B4-22 já congela a assinatura por recibo. Uma configuração de visibilidade não pode sobrescrever nem transformar a assinatura reutilizável.

Não se deve reutilizar o objeto inteiro de opções do orçamento: `item_prices`, `subtotal`, `total`, `validity`, título e cor têm semântica diferente ou inexistente no recibo.

## Contrato recomendado para B4-24

Criar `ReceiptDocOptionsSchema` separado, com nomes compartilhados somente quando a semântica for idêntica:

| Chave proposta    | Default | Regra                                                                  |
| ----------------- | ------- | ---------------------------------------------------------------------- |
| `company_details` | `true`  | contatos, endereço, Instagram e site; nome do emissor continua visível |
| `client_details`  | `true`  | CPF/CNPJ, telefone e endereço; nome do pagador continua visível        |
| `payment_details` | `true`  | forma de pagamento; data continua no núcleo do recibo                  |
| `additional_info` | `true`  | renderiza somente quando o novo conteúdo existir                       |
| `pix`             | `true`  | renderiza somente quando houver chave cadastrada                       |
| `footer`          | `true`  | renderiza somente quando houver frase cadastrada                       |

Assinatura permanece uma escolha por documento (`NONE`, `SAVED`, `ONCE`), não um default de visibilidade. Número, valor, pagador, referência e data são o núcleo mínimo e não devem ter chaves de ocultação.

Para manter o documento estável depois da emissão, B4-24 deve definir:

- defaults da empresa em um contrato compartilhado;
- snapshot das opções resolvidas no pagamento/recibo, com migração idempotente;
- resolução no backend; web e app apenas exibem o contrato recebido;
- campos novos vinculados ao `company_id` por meio do recibo/pagamento existente;
- compatibilidade de recibos antigos com todos os defaults ligados.

## Diferenças visuais verificadas

O PDF Orcivo gerado a partir do código atual preserva o design aprovado: cartão com cantos arredondados, hierarquia forte para o valor, blocos “Quem recebeu/Quem pagou”, pagamento, Pix e rodapé. A referência usa seções lineares e cabeçalho denso. A evolução deve incorporar apenas a completude estrutural da referência.

Lacunas verificadas no Orcivo atual:

- não há seção própria de informações adicionais;
- não há controle de visibilidade do recibo;
- previews web/app omitem Instagram, site, registro profissional e rodapé que o PDF já conhece;
- data aparece separada, enquanto a referência também a inclui na declaração;
- informações opcionais vazias são simplesmente omitidas, sem preview/configuração explícita.

## Protocolo de validação das próximas tarefas

- specs do schema, defaults, rejeição de chaves desconhecidas e compatibilidade com registros antigos;
- integração serial provando isolamento por empresa e snapshot das opções;
- snapshots/extração do PDF com cada grupo ligado e desligado;
- paridade entre preview web, preview app e PDF;
- PDF A4 renderizado com combinações completa, mínima e sem dados opcionais;
- matriz visual `1440×900`, `390×844` e `360×800`, modos fácil/completo e app quando o fluxo existir;
- nenhum cálculo monetário em `Number` e nenhuma mudança no design system.
