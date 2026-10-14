# B4-31 — Inventário de modos no web mobile

**Data:** 2026-10-14
**Escopo:** `/facil`, rotas autenticadas do web completo, `EasyMode.tsx` e evidências QA existentes.

## Implementação atual

| Eixo                             | Modo fácil                                                    | Modo completo                               | Consequência                                                |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| entrada                          | rota única `/facil`                                           | 24 páginas sob o layout autenticado         | são duas navegações web, não duas variantes CSS             |
| navegação mobile                 | 5 abas e pilha interna com 25 estados                         | sidebar/topbar responsivos e rotas próprias | esconder o completo quebraria deep links e fluxos avançados |
| navegação desktop                | shell fácil ganha sidebar em `>=1024px`                       | shell padrão                                | ambos já são produtos responsivos                           |
| preferência                      | `localStorage` + `html[data-easy]`, por aparelho              | ausência da flag                            | não há preferência persistida no backend                    |
| troca fácil → completo           | Configurações desliga a flag e abre `/dashboard`              | —                                           | troca explícita                                             |
| troca completo → fácil           | Configurações liga a flag e abre `/facil`                     | —                                           | troca explícita                                             |
| fluxo avançado iniciado no fácil | abre rota completa e mostra botão fixo “Voltar ao Modo fácil” | recebe o deep link                          | o completo funciona como escape deliberado                  |
| estado de negócio                | APIs e entidades compartilhadas                               | APIs e entidades compartilhadas             | alternar não cria cópia dos dados                           |
| estado de navegação/formulário   | pilha/draft em memória no `/facil`                            | estado por rota/componente                  | troca no meio do formulário pode descartar estado não salvo |

## Paridade funcional observável

O modo fácil cobre os fluxos cotidianos: início, clientes, orçamento em etapas, lista de orçamentos, serviços/execução,
agenda, financeiro, recibos, catálogo, configurações e avisos. O modo completo acrescenta superfícies administrativas e
avançadas que não têm equivalente direto no fácil, como equipe, relatórios, importação de catálogo, plano/checkout e
algumas telas de edição dedicadas.

Não existe telemetria de produto no escopo inspecionado para responder:

- quantas sessões mobile usam cada modo;
- em quais rotas o usuário sai do fácil para o completo;
- taxa de conclusão/abandono por fluxo e viewport;
- frequência de alternância ou retorno ao fácil;
- impacto de cada modo em erros, acessibilidade ou suporte.

Logo, qualquer alegação de preferência real do usuário seria especulativa. A decisão deve ser reversível e acompanhada
por métricas anônimas agregadas somente após avaliação de privacidade/LGPD própria; esta ADR não adiciona telemetria.

## Evidência responsiva disponível

As evidências já registradas no Batch 4 cobrem o produto real, sem atribuir comportamento web ao app nativo:

| Fonte                                           | Cobertura relevante                                | Resultado                                                                |
| ----------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md`  | `1440×900`, `390×844`, `360×800`, fácil/completo   | fluxos críticos contidos após correções                                  |
| `IMPROVEMENT-BATCH-4-RESPONSIVE-FORMS-AUDIT.md` | formulários/modais nos três viewports e dois modos | três achados tratados; matriz final sem overflow nos viewports oficiais  |
| achados B4-02…B4-13 no relatório UAT            | OS, orçamento, recebimento, PDF e alternância      | modo completo mobile funciona, mas custa adaptação e regressão contínuas |

Tentativa atual de repetir a auditoria em `390×844` e `360×800`: **bloqueada pelo navegador integrado**, que substituiu
as abas locais por sua página de erro `ERR_TOO_MANY_REDIRECTS`. Isso não é evidência de falha do produto e não substitui
a matriz obrigatória da B4-40/B4-44. Não foi usado navegador alternativo para fabricar uma validação equivalente.

## Gaps e riscos

1. Não há telemetria para justificar ocultação ou remoção.
2. O modo fácil não possui URL por tela; refresh/deep link e retomada são menos precisos que no completo.
3. Drafts e navegação são locais a cada shell; alternar no meio de um formulário exige aviso explícito.
4. O botão fixo de retorno ao fácil pode competir com barras de ação em rotas completas estreitas e precisa permanecer
   na matriz visual.
5. Manter dois shells aumenta a matriz de QA, mas ocultar o completo não elimina sua necessidade: deep links e funções
   avançadas ainda precisam funcionar no mobile.
6. O app nativo tem navegação própria e não participa desta decisão.

## Matriz mínima para a implementação condicionada B4-40

- `1440×900`, `390×844` e `360×800` nos dois modos;
- troca nos estados neutro, formulário vazio, formulário com alterações e rota completa aberta pelo fácil;
- teclado, safe area, zoom de texto, foco, botão voltar e deep link;
- `scrollWidth <= innerWidth`, CTAs alcançáveis e nenhum conteúdo sob o botão de retorno;
- registro separado de “não reproduzido” no app, porque esta é uma decisão exclusiva do web mobile.
