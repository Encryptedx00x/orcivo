# Relatório de validação — Improvement Batch 3

Data: 2026-10-11  
Escopo: R5b, R6, R7, R8, R9 e auditoria de seletores/listas crescentes.

## Resumo executivo

O código das 14 tarefas do lote foi revisado no estado consolidado de `main` e
a melhoria adicional de seletores foi concluída diretamente. A infraestrutura
de teste roda isolada no Windows, sem Docker e sem interferir em outro projeto:
PostgreSQL `5433`, Redis `6380` e S3 compatível `9002`.

## Entregas confirmadas

- R5b: estados extras e fluxos de OS, colunas, abas, deslocamento e campos no
  modo fácil.
- R6: agenda mensal, períodos, lembretes, status e recorrência.
- R7: dados de cliente, contatos, catálogo, preço, estoque e unidades.
- R8: relatórios, atalhos da Home e exportação/portabilidade.
- R9: tema único, componentes base e aplicação do design nas telas do app,
  incluindo autenticação.
- UX adicional: listas e seletores crescentes limitados, pesquisáveis e com
  continuação explícita nas quatro superfícies aplicáveis.

## Correções feitas na validação

- Busca backend por nome/telefone de cliente e por título/número de OS e
  orçamento, sempre tenant-scoped.
- Vínculo de recibo filtrado pelo cliente selecionado.
- Valores de recibo validados como string decimal, sem `Number`.
- Testes mobile ajustados para os novos componentes e efeitos.
- Login mobile alinhado ao handoff por `AuthScaffold`.
- Buscas assíncronas protegidas contra respostas fora de ordem; busca por
  telefone preservada também no filtro visual dos seletores.
- Timeout do setup E2E de storage elevado de 5 s para 30 s, pois usa Nest,
  PostgreSQL, Redis e S3 reais na inicialização fria.

## Verificações automáticas

| Verificação                | Resultado                                  |
| -------------------------- | ------------------------------------------ |
| Typecheck do monorepo      | 8/8 pacotes                                |
| Lint backend               | 0 erros; 1 aviso preexistente em `main.ts` |
| Lint web                   | 0 erros; avisos preexistentes de `<img>`   |
| Lint mobile                | 0 erros/avisos                             |
| Build web                  | 53 páginas geradas                         |
| Testes mobile              | 94/94                                      |
| Backend isolado de storage | 8/8                                        |
| Backend completo           | 48/48 suítes; 531 aprovados; 5 `todo`      |

A primeira execução completa encontrou apenas o timeout de 5 s do setup de
storage. Depois da correção, a suíte isolada e a suíte completa passaram.

## Verificação visual e de uso

Navegador integrado e massa sintética criada somente no banco local efêmero,
sem qualquer escrita em produção:

- web completa: novo orçamento, nova OS, agenda, financeiro e recibos;
- web fácil: clientes, novo orçamento e novo recibo;
- app completo: Home, clientes, agenda e financeiro;
- app fácil: Home, clientes, novo orçamento e novo recibo em 375×812.

Foram verificados busca por nome e telefone, limite inicial de dez opções,
“Ver mais”, vazio, carregamento, seleção, hierarquia, roxo `#6D28D9`, Lucide,
pt-BR e alvos de toque. O console web terminou sem erros ou avisos; o Expo web
registrou apenas avisos de depreciação conhecidos da camada React Native Web.

## Produção

- Código consolidado e enviado para `main` até `6904bb1`.
- Pacote gerado com o nome obrigatório `orcivo-src.tar.gz`.
- Deploy `20261011-123450` concluído com backup
  `pre-20261011-123450.sql.gz` e tag de retorno `prev-20261011-123450`.
- Backend, migrations, web e site foram construídos antes da troca.
- Receita final: `HEALTH: healthy healthy healthy` e `DEPLOY_DONE`.
- O executor informou que todas as migrations foram aplicadas com sucesso.
- A migration `20261010160000_company_home_shortcuts` foi executada novamente
  em produção como prova de idempotência; PostgreSQL informou que a coluna já
  existia e concluiu com `ALTER TABLE`.

## Próximo trabalho

O plano para corrigir as pausas e atrasos do autopilot está em
`docs/runbooks/AUTOPILOT-RELIABILITY-IMPROVEMENT-PLAN.md`. Ele não foi
implementado nesta rodada para não misturar infraestrutura de orquestração com
o fechamento do produto.
