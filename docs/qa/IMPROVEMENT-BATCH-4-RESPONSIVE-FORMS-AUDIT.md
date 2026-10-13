# Improvement Batch 4 — Auditoria de formulários responsivos

Data: 2026-10-13

Tarefa: `B4-46-responsive-form-inventory`

Ambiente: web e API locais; Postgres, Redis e armazenamento locais; nenhuma operação em produção

## Protocolo

A auditoria aplicou o protocolo da B4-43 em `1440×900`, `390×844` e `360×800`, nos modos completo e fácil. A largura `320×800` foi usada somente como diagnóstico adicional. Em cada etapa foram conferidos:

- `document.scrollWidth <= document.clientWidth`;
- controles visíveis, rótulos, valores, placeholders e barras de ação;
- formulários, modais e sheets abertos, não apenas a página em repouso;
- rolagem vertical até o CTA e ausência de corte horizontal;
- equivalência entre fácil/completo quando o fluxo existe.

A sidebar completa recolhida por `transform` no mobile foi excluída dos resultados: ela fica deliberadamente fora da tela e não aumenta a largura rolável do documento. Também não foi tratado como defeito o `scrollWidth` interno natural de um `input` cujo conteúdo permanece navegável e cujo rótulo/valor visível não é cortado.

## Inventário de defeitos reproduzidos

| ID    | Rota/etapa                            | Superfície e modo               | Viewport                                | Componente                               | Sintoma reproduzido                                                                                                                                                                                                                                     | Severidade | Evidência                                                                                                |
| ----- | ------------------------------------- | ------------------------------- | --------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| RF-01 | `/financeiro` → Registrar recebimento | web mobile, completo            | `360×800`                               | grade `Situação` + `Data do recebimento` | A grade mantém duas colunas em uma área útil de 345 px. O valor `Recebido` aparece como `Rece...` e o campo de data fica estreito. Em `390×844` e desktop o conteúdo é legível.                                                                         | alta       | screenshot da sessão e inspeção visual; documento sem overflow global, mas controles perdem legibilidade |
| RF-02 | `/configuracoes` → Identidade visual  | web mobile, completo            | `360×800`; também `320×800` diagnóstico | lista horizontal de abas                 | Ao selecionar uma aba central, o início da faixa mostra apenas o final da aba anterior (`conta`/`nta`) sem indicação clara de que há conteúdo rolável. Não há overflow global, mas o fragmento solto parece conteúdo quebrado.                          | média      | screenshots em 360 e 320; `bodyScrollWidth` igual ao viewport                                            |
| RF-03 | `/facil` → assinatura desenhada       | diagnóstico web estreito, fácil | `320×800`                               | shell/header do modo fácil               | A tela visível permanece utilizável, porém a árvore mantém conteúdo do shell deslocado e o documento mede 577 px para 305 px úteis. Isso cria overflow horizontal latente e pode deslocar a página por gesto/teclado. Não reproduz em 360, 390 ou 1440. | média      | medição `scrollWidth=577`, `clientWidth=305`; screenshot diagnóstico                                     |

## Matriz executada

| Fluxo                                           | Completo 1440           | Completo 390            | Completo 360            | Fácil 1440                     | Fácil 390                      | Fácil 360                      | Resultado                                                                                           |
| ----------------------------------------------- | ----------------------- | ----------------------- | ----------------------- | ------------------------------ | ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Login                                           | ok                      | ok                      | ok                      | compartilhado                  | compartilhado                  | compartilhado                  | sem overflow; formulário e CTA legíveis                                                             |
| Cadastro/onboarding — etapa de conta            | ok                      | ok                      | ok                      | compartilhado                  | compartilhado                  | compartilhado                  | sem overflow; termos, senha e CTA acessíveis                                                        |
| Cliente novo                                    | ok                      | ok                      | ok                      | ok                             | ok                             | ok                             | formulário completo e modal contextual contidos                                                     |
| Orçamento novo — cliente/item/revisão acessível | ok                      | ok                      | ok                      | ok                             | ok                             | ok                             | barra de ações e modais contidos; conteúdo interno de input não foi contado como overflow da página |
| OS nova                                         | ok                      | ok                      | ok                      | fluxo equivalente sem OS local | fluxo equivalente sem OS local | fluxo equivalente sem OS local | formulário completo legível; placeholder longo permanece dentro do campo                            |
| Recebimento                                     | ok                      | ok                      | **RF-01**               | ok                             | ok                             | ok                             | sheet fácil e recibo avulso acessíveis; defeito isolado na grade do modal completo                  |
| Recibo e assinatura                             | disponível no documento | disponível no documento | disponível no documento | ok                             | ok                             | ok                             | recibo e editor de assinatura sem overflow nos viewports oficiais; diagnóstico 320 gerou RF-03      |
| Configurações/identidade                        | ok                      | **RF-02**               | **RF-02**               | ok                             | ok                             | ok                             | conteúdo da logo cabe; problema está na orientação visual da faixa de abas                          |

## Verificações adicionais

- O formulário de OS completo em `360×800` foi percorrido verticalmente: título, observações, agendamento e CTA continuam dentro da área útil.
- O modal completo de recebimento foi comparado aberto nos três viewports. Em 390 px o valor `Recebido` volta a ficar integral; em desktop não há compressão.
- No modo fácil, foram abertos o sheet de escolha de recebimento, o recibo avulso, o recibo criado e o editor de assinatura. CTAs permanecem alcançáveis com rolagem vertical.
- Os textos soltos que existiam antes de `Lançar gasto` e no título da OS não apareceram na build auditada.
- A verificação dinâmica não excedeu 120 requisições por minuto; as rotas foram exercitadas em grupos pequenos.

## App nativo

`Não reproduzido/bloqueado.` A autenticação nativa ainda depende de B4-15 e B4-16. Nenhum defeito web foi atribuído ao app. Após o desbloqueio, os mesmos fluxos devem ser executados nos modos fácil e completo; os componentes nativos devem ser comparados pelos critérios de legibilidade e overflow, não por inferência do DOM web.

## Fila de correção

A B4-47 deve corrigir RF-01, RF-02 e RF-03 sem recriar o design system. Depois da correção, a matriz acima deve ser repetida e os três IDs atualizados com evidência de revalidação.
