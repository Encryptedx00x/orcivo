# Improvement Batch 4 — passada exploratória dos blocos 1–2

Data: 2026-10-13

Tarefa: `B4-14A-exploratory-block-1-2`

Build avaliada: `main` em `2a8617a`, com backend, web e Expo web locais. PostgreSQL e Redis locais; PostgreSQL descartável de integração em `127.0.0.1:5433`; sem Docker e sem acesso à produção.

## Resultado

**Aprovado para o gate `DEPLOY-B4-1`.** A passada não deixou defeito aberto no escopo dos blocos 1–2. O deploy não faz parte desta tarefa.

## Matriz visual curta

| Superfície  | Modo     | Viewport   | Fluxos observados                            | Resultado e evidência                                                                                             |
| ----------- | -------- | ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| web desktop | fácil    | `1440×900` | lista de orçamentos e ações do rascunho      | `clientWidth/scrollWidth = 1440/1440`; card, CTAs e valores legíveis                                              |
| web mobile  | fácil    | `390×844`  | lista de orçamentos e ações do rascunho      | `390/390`; sem corte ou overflow após estabilização                                                               |
| web mobile  | fácil    | `360×800`  | orçamento, serviços e financeiro             | `360/360`; OS mostrou `Sem data`, `Para fazer` e `Começar`; financeiro mostrou `Lançar gasto` sem travessão solto |
| web desktop | completo | `1440×900` | detalhe do orçamento, PDF e navegação        | `1425/1425` com scrollbar vertical; ações completas e cards contidos                                              |
| web mobile  | completo | `390×844`  | detalhe do orçamento                         | `375/375`; título, ações, itens e totais contidos                                                                 |
| web mobile  | completo | `360×800`  | detalhe/lista de orçamento, OS e recebimento | `345/345`; sidebar recolhida fora da tela não ampliou o documento; modal e CTAs acessíveis por rolagem            |

## Checklist por achado

| Tarefa      | Fluxo executado                                                                                       | Resultado                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B4-01       | mesmo link de aprovação aberto em duas abas; primeira aprovação seguida por nova tentativa na segunda | primeira sessão aprovou; segunda exibiu `Este orçamento já foi aprovado. A tela foi atualizada.`; sem `APPROVED → APPROVED` e sem overflow em `1440×900`, `390×844` e `360×800`                     |
| B4-02       | orçamento aprovado e OS aberta nos modos completo e fácil                                             | OS apareceu como `Pendente`/`Para fazer`, com ação explícita `Iniciar`/`Começar`; nenhuma inicialização implícita                                                                                   |
| B4-03       | lista fácil da OS e contratos de foto/estado                                                          | `Sem data` substituiu o travessão solto; regressão automatizada preservou categorias e releitura após upload                                                                                        |
| B4-04       | integração aprovação → recebíveis → baixa → releitura                                                 | integração serial verde; criação única, `company_id`, valores e recibo permaneceram consistentes                                                                                                    |
| B4-05       | valores abaixo, igual e acima do esperado; cenário visual `275,00` contra `250,00`                    | testes cobriram as três relações decimais; UI mostrou esperado `R$ 250,00`, recebido `R$ 275,00`, diferença `R$ 25,00`, motivo e confirmação obrigatória; operação foi cancelada antes de persistir |
| B4-06       | lista completa de OS em `360×800`                                                                     | badge, serviço e ação ocuparam áreas distintas, sem interseção nem overflow horizontal                                                                                                              |
| B4-07       | modal completo de recebimento/edição em `360×800`                                                     | data, situação, texto e barra de ação permaneceram contidos; rolagem vertical alcançou o CTA                                                                                                        |
| B4-08       | visualização e download real                                                                          | rascunho exigiu confirmação; download gerou PDF real de 47.360 bytes, uma página A4; renderização mostrou conteúdo íntegro e marca `Rascunho`                                                       |
| B4-09       | estados de assinatura em contratos web/app                                                            | regressões de `Adicionar assinatura`/`Trocar assinatura` verdes; nenhuma cópia incorreta reapareceu                                                                                                 |
| B4-10       | duração, `OK` e acessibilidade do toast                                                               | três regressões com timers/ARIA verdes; toast compartilhado permaneceu contido                                                                                                                      |
| B4-11       | continuar com item vazio/incompleto/pronto                                                            | regressões das escolhas adicionar/descartar/cancelar verdes nas superfícies equivalentes                                                                                                            |
| B4-12       | ADR-018                                                                                               | decisão documental continua coerente com o comportamento observado                                                                                                                                  |
| B4-13       | botão `Voltar` após geração/aprovação                                                                 | abriu `/orcamentos`; o editor `/orcamentos/novo` não reapareceu e a lista mostrou o documento único                                                                                                 |
| B4-14       | crop, cancelamento e upload de logo                                                                   | testes frescos de crop/picker e contrato de upload verdes; evidência visual dedicada da B4-14 permanece válida na mesma linhagem de `main`                                                          |
| B4-46/B4-47 | formulários responsivos                                                                               | RF-01/RF-02 continuaram corrigidos; RF-03 não reapareceu nos viewports oficiais                                                                                                                     |
| B4-48       | semântica de PDF em rascunho                                                                          | `Ver prévia`/`Baixar prévia` em DRAFT e `Ver PDF`/`Baixar PDF` após envio; confirmação impediu entrega ambígua                                                                                      |

## Verificações automáticas frescas

- `@orcivo/shared-types`: build, Jest, typecheck e lint com código 0.
- contratos web/mobile B4-03…B4-14 e B4-48: **38/38**.
- backend, incluindo aprovação concorrente, recebíveis/excedente, OS, PDF e logo: **191/191**, 8 suítes, integrações com `--runInBand`.
- typecheck e lint de backend, web e mobile: código 0; apenas avisos preexistentes de `console` no bootstrap e `<img>` no web.
- o banco descartável local estava com schema antigo; `prisma db push` foi aplicado somente em `orcivo_test` na porta 5433 antes da repetição verde das integrações.

## App nativo

`Não reproduzido/bloqueado.` Os fluxos autenticados ainda dependem de B4-15 e B4-16 porque a build observada tentou usar `localhost:3000`. O Expo web estava disponível, mas não havia acesso autenticado seguro aos fluxos deste checklist; portanto, nenhum defeito web foi atribuído ao app. Os contratos nativos aplicáveis foram executados, e a matriz runtime será repetida após a correção de ambiente e autenticação.

## Evidências locais não versionadas

- PDF baixado: `C:\Users\Encryptedx\Downloads\orcamento-758d82ed-1d04-4d1f-b08b-3e10528faecb (2).pdf`.
- Inspeção: uma página A4, PDF 1.3, 47.360 bytes, renderização íntegra com badge e marca d'água de rascunho.
- As capturas foram inspecionadas no navegador integrado; PNGs temporários e arquivos já não rastreados não foram adicionados ao commit.

## Conclusão do gate

`DEPLOY-B4-1` foi executado em 2026-10-14 a partir de `fade582`: backup `pre-20261014-005020.sql.gz`, tag
`prev-20261014-005020`, `HEALTH: healthy healthy healthy` e `DEPLOY_DONE`. A consulta SQL somente leitura confirmou
34 migrations concluídas e `20261011210000_payment_overpayment_confirmation` aplicada exatamente uma vez.
