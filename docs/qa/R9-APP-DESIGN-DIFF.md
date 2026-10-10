# R9 — comparação visual web × app

Fonte de verdade: `docs/design-handoff/orcivo-design-system/`, sobretudo
`colors_and_type.css` e `ui_kits/mobile/`. Esta tabela é o inventário inicial
para a aplicação do design aprovado; não cria um design system novo.

## Base aprovada

| Elemento         | Referência aprovada      | Situação encontrada no app                                   | Ajuste R9                                                              |
| ---------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Cor primária     | `#6D28D9`                | Já usada, mas repetida em dezenas de telas                   | Exportar por `src/theme.ts`                                            |
| Fundo/superfície | branco e `#F8FAFC`       | Alternância inconsistente entre `#FFFFFF` e cinzas não-token | Usar aliases únicos do tema                                            |
| Texto            | `#0A0A0F`, slate 700/500 | Mistura de slate, gray e hex avulsos                         | Usar escala do tema                                                    |
| Espaço           | base 4; 8/12/16/24/32    | Valores locais sem semântica comum                           | Usar `space` do tema                                                   |
| Raios            | 8/12/16/20/24            | 8, 10, 12, 14, 16, 20 locais                                 | Usar `radius` do tema                                                  |
| Toque            | mínimo 44 px             | Alguns botões menores                                        | Componentes base garantem 44/48 px                                     |
| Ícones           | Lucide                   | Lucide já predomina                                          | Remover qualquer símbolo textual/emoji remanescente nas telas tratadas |

## Modo fácil — prioridade

| Tela/grupo                  | Web de referência                 | App atual                                                 | Ajuste alvo                                             |
| --------------------------- | --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Home                        | `/facil`, cartões e ações grandes | `easy/screens/Home.tsx`, usa `ui.tsx` próprio             | Reapontar `C`/`s` ao tema único e aos componentes base  |
| Clientes                    | `/facil`, lista/tarjeta           | `easy/screens/Clients.tsx`                                | Card, linha, input e estado vazio padronizados          |
| Orçamentos                  | `/facil`, fluxo de orçamento      | `easy/screens/Quotes.tsx`, `QuoteFlow.tsx`                | Botões, etapas, chips e valores monetários padronizados |
| Agenda                      | `/facil`, lista de compromissos   | `easy/screens/Agenda.tsx`                                 | Cabeçalho, lista, chip de status e ação primária        |
| Financeiro/recibos          | `/facil`, dinheiro em destaque    | `easy/screens/Money.tsx`, `Receipts.tsx`                  | Cartões, status e tipografia tabular comuns             |
| Serviços/menu/configurações | `/facil`                          | `Services.tsx`, `Menu.tsx`, `Settings.tsx`, `Notices.tsx` | Lista, opções e campos com os mesmos tokens             |

## Modo completo

| Tela/grupo                       | Web de referência                           | App atual                                           | Ajuste alvo                                              |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Início                           | `/dashboard`                                | `screens/inicio/InicioScreen.tsx`                   | KPIs, ações rápidas e agenda no mesmo grid/escala mobile |
| Clientes                         | `/clientes`                                 | `screens/clientes/*`                                | Cabeçalho, busca, cards e formulário                     |
| Orçamentos                       | `/orcamentos`                               | `QuoteList/Detail/CreateScreen.tsx`                 | Chips, cartões, editor e resumo monetário                |
| Agenda                           | `/agenda`                                   | `screens/agenda/*`                                  | Calendário, lista, formulário e detalhe                  |
| OS/catálogo                      | páginas de OS/catálogo                      | `WorkOrder*`, `Catalog*`                            | Linha de lista, formulário, badge e ações                |
| Financeiro/relatórios/documentos | `/financeiro`, `/relatorios`, `/documentos` | `financeiro/*`, `relatorios/*`, `documentos/*`      | Métricas, card, lista, exportação e estados              |
| Empresa                          | `/configuracoes`, `/equipe`, `/plano`       | `configuracoes/*`, `equipe/*`, `plano/*`, `conta/*` | Campos, opções, cards e hierarquia visual                |
| Autenticação                     | handoff de Auth & Onboarding                | `screens/auth/*`                                    | Campos, botões, erros e espaçamento do kit               |

## Evidência visual a completar após a implementação

Os prints comparativos em 375×812 serão adicionados na rodada final com Expo
web e as páginas web correspondentes. Critério de aceite: nenhuma divergência
relevante de token, hierarquia, toque, componente, texto pt-BR ou ícone entre
o app e a referência mobile aprovada.
