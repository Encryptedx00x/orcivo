# Achados UAT do primeiro Key User — 2026-10-11

## Objetivo e limite desta etapa

Este documento transforma os achados do primeiro Key User no **Improvement Batch 4** e acumula a evidência de execução. A análise, deduplicação, planejamento e reconciliação foram concluídos; a implementação manual começou pela B4-01. Não houve deploy, publicação de app, alteração de produção ou mudança do design system.

Base operacional preservada:

- produto implantado: `6904bb1`;
- último registro documental: `2659db1`;
- produção com banco reinicializado para UAT e sem dados operacionais no momento do registro;
- arquivos não rastreados preexistentes devem ser preservados;
- Olivers Burger está fora de escopo;
- decisões estratégicas param em ADR e no gate `B4-33-owner-strategy-decisions`.

## Regra de evidência por superfície

Um achado observado no web mobile não é automaticamente atribuído ao desktop ou ao app. Cada tarefa deve:

1. reproduzir primeiro em web desktop, web mobile e app nativo, fácil e completo, quando o fluxo existir;
2. corrigir todas as superfícies em que reproduzir;
3. registrar **não reproduzido** com print/checklist quando não reproduzir;
4. ainda provar que o comportamento correto equivalente existe nas três superfícies;
5. no app, executar tarefas dependentes de login somente depois de `B4-15` e `B4-16`.

Viewports web obrigatórios: `1440×900`, `390×844` e `360×800`. App nativo deve ter evidência iOS/Android quando disponível, com limitação objetiva registrada quando um runtime não estiver disponível.

## Resumo das categorias

| Categoria primária                   | Achados |
| ------------------------------------ | ------: |
| bug confirmado                       |       7 |
| hipótese que precisa ser reproduzida |       4 |
| melhoria de UX                       |       7 |
| decisão estratégica do dono          |       7 |
| nova funcionalidade                  |       4 |

A categoria é primária e não elimina aspectos secundários. Exemplo: o achado 9 é um bug confirmado, mas sua correção também introduz uma confirmação de UX.

## Classificação e deduplicação dos 29 achados

| Achado | Categoria primária                   | Fundamentação                                                                                              | Tarefas                    |
| -----: | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------- |
|      1 | bug confirmado                       | O overflow foi observado no web mobile completo; desktop e app ainda exigem reprodução.                    | B4-06                      |
|      2 | hipótese que precisa ser reproduzida | A ação parece duplicada, mas falta provar headers, arquivo e comportamento de navegador/PWA.               | B4-08                      |
|      3 | bug confirmado                       | O segundo aprovador recebeu erro técnico em um cenário concorrente real.                                   | B4-01                      |
|      4 | bug confirmado                       | A OS automática foi observada em execução, contrariando o fluxo documentado de OS aberta antes de iniciar. | B4-02                      |
|      5 | hipótese que precisa ser reproduzida | Há sinal de estado/foto inconsistente entre modos, mas o ponto de perda ainda não foi isolado.             | B4-03                      |
|      6 | hipótese que precisa ser reproduzida | A receber falhou no fluxo do Key User, sem etapa/erro técnico ainda determinado.                           | B4-04                      |
|      7 | melhoria de UX                       | A atribuição é opcional, porém não é oferecida no momento útil e o termo precisa ser neutro.               | B4-19, B4-20               |
|      8 | bug confirmado                       | O campo de data extrapolou o modal no web mobile.                                                          | B4-07                      |
|      9 | bug confirmado                       | O backend/UI aceitou excedente sem aviso, comparação ou confirmação.                                       | B4-05                      |
|     10 | bug confirmado                       | O estado vazio mostra a ação semanticamente errada Trocar assinatura.                                      | B4-09                      |
|     11 | melhoria de UX                       | É necessário inventariar o que já existe antes de ampliar opções do recibo.                                | B4-23, B4-26, B4-27        |
|     12 | melhoria de UX                       | Crop, reposicionamento e zoom ampliam um upload já existente.                                              | B4-14                      |
|     13 | melhoria de UX                       | Duração e dispensa de toast são ajustes transversais de feedback.                                          | B4-10                      |
|     14 | melhoria de UX                       | O sistema deve proteger conteúdo digitado ainda não incluído.                                              | B4-11                      |
|     15 | decisão estratégica do dono          | O destino pós-geração define o modelo mental do fluxo; primeiro haverá ADR curto e depois implementação.   | B4-12, B4-13               |
|     16 | bug confirmado                       | A build instalada tentou localhost:3000; autenticação real depende da correção.                            | B4-15, B4-16               |
|     17 | hipótese que precisa ser reproduzida | Só a tela inicial foi acessada; a build pode estar antiga e o fluxo de convite existe no repositório.      | B4-17                      |
|     18 | melhoria de UX                       | Tamanho e instalação exigem medição antes de otimização, sem remover recursos cegamente.                   | B4-18                      |
|     19 | decisão estratégica do dono          | Estado parcial por item altera domínio, dinheiro, estoque, garantia e auditoria.                           | B4-32, B4-41, B4-42        |
|     20 | nova funcionalidade                  | É uma nova etapa não bloqueante de revisão de completude.                                                  | B4-21                      |
|     21 | nova funcionalidade                  | Atribuição opcional e nomenclatura multi-nicho ampliam o fluxo de OS.                                      | B4-19, B4-20, B4-29, B4-37 |
|     22 | nova funcionalidade                  | Seleção de assinatura salva ou exclusiva por recibo ainda não forma um fluxo completo.                     | B4-09, B4-22               |
|     23 | nova funcionalidade                  | Evolução estrutural de orçamento/recibo exige modelo, configuração, PDF e validação separados.             | B4-23 a B4-27              |
|     24 | decisão estratégica do dono          | Posicionamento afeta comunicação e possivelmente domínio/permissões; começa por inventário/ADR.            | B4-29, B4-37               |
|     25 | decisão estratégica do dono          | Perfil, nicho, tratamento e termos profissionais alteram requisitos de produto e documentos.               | B4-29, B4-37               |
|     26 | decisão estratégica do dono          | Multiempresa é mudança estrutural de tenancy e segurança.                                                  | B4-30, B4-38, B4-39        |
|     27 | decisão estratégica do dono          | Manter, ocultar ou adaptar o modo completo no web mobile requer decisão de produto baseada em evidência.   | B4-31, B4-40               |
|     28 | decisão estratégica do dono          | Limites, diferenciação de planos e CTAs têm impacto comercial/billing; primeiro ADR, depois gate.          | B4-28, B4-34 a B4-36       |
|     29 | melhoria de UX                       | É melhoria obrigatória do processo de QA e da cobertura que sustenta a experiência.                        | B4-43, B4-44, B4-45        |

Deduplicações principais:

- 7 + 21: um eixo de **responsável pelo serviço**, com ADR de nomenclatura e implementação opcional.
- 10 + 22: estado vazio correto e fluxo completo de assinatura no recibo.
- 11 + 22 + 23: inventário de opções, modelo documental, PDFs e configurações, sem duplicar `doc_options`.
- 24 + 25: um ADR de posicionamento/nomenclatura/onboarding antes de alterar copy ou domínio.
- 17 não presume que as telas internas do app estejam erradas; primeiro diferencia build antiga, Home real e convite já implementado.
- 19, 26, 27 e 28 permanecem atrás de decisão explícita do dono.

## Por que a QA anterior não detectou os achados 1–18

Este é o diagnóstico inicial do gap, não uma justificativa para encerrar os achados. Cada tarefa deve confirmar ou
corrigir a causa ao executar a reprodução. O protocolo correspondente está em `CATALOGO-DE-TESTES.md` §§0.1–0.4.

| Achado | Gap da QA anterior                                                                                                                      | Protocolo que passa a cobrir                                                                                  |
| -----: | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
|      1 | A matriz usava larguras aproximadas e não exigia o modo completo com textos/estados longos no iPhone 16 e Android de 360 px.            | Três viewports exatos × dois modos, screenshot e asserção de `scrollWidth <= innerWidth`.                     |
|      2 | A inspeção validava que os links abriam, mas não esperava um evento de download nem conferia headers, nome e arquivo salvo.             | Download real no navegador, incluindo diferenças de navegador/PWA, separado de “Ver PDF”.                     |
|      3 | O happy path tinha um único aprovador; não havia duas sessões carregadas antes da primeira aprovação.                                   | Duas abas/sessões e spec concorrente serial com unicidade de aprovação, OS, cobranças e auditoria.            |
|      4 | A QA conferia que uma OS existia após aprovar, mas não afirmava seu estado inicial antes de qualquer ação do usuário.                   | Integração aprovação → OS pendente e inspeção imediata nas superfícies.                                       |
|      5 | Fácil e completo eram exercitados isoladamente; não se alternava modo no meio da mesma OS nem se reabria a foto por categoria.          | Troca de modo durante o fluxo, reabertura e comparação de IDs, status e fotos Antes/Durante/Depois.           |
|      6 | Partes de financeiro eram testadas separadamente, sem rastrear condições do orçamento até criação, listagem, baixa e recibo.            | Fluxo ponta a ponta condições → A receber → baixa → recibo, com atualização de listas em cada superfície.     |
|      7 | O roteiro só aceitava a criação automática da OS e não avaliava se a atribuição opcional era oferecida nem se o termo era neutro.       | Caso com/sem responsável após ADR, em fácil/completo, verificando contrato e nomenclatura.                    |
|      8 | O modal não era obrigatório em 390×844 e 360×800; o controle nativo de data e o teclado não foram exercitados.                          | Modal aberto e preenchido nos três viewports, com overflow e foco/teclado verificados.                        |
|      9 | Só foram usados valores iguais ao esperado no happy path; os limites abaixo/acima e a confirmação de excedente não existiam no roteiro. | Matriz abaixo/igual/acima com Decimal, diferença, confirmação, motivo e persistência.                         |
|     10 | A conta usada tinha assinatura salva ou o estado vazio não foi capturado; testou-se a ação, não o verbo exibido.                        | Estados vazio/preenchido obrigatórios e asserção “Adicionar” versus “Trocar”.                                 |
|     11 | As opções do orçamento foram assumidas como equivalentes às do recibo, sem inventário do contrato e do PDF de recibo.                   | Inventário backend/shared/UI/PDF, estados configurados e ausentes, antes de ampliar o modelo.                 |
|     12 | O teste encerrava ao enviar e exibir a logo; não havia requisito de recorte, zoom, reposição, cancelar e fidelidade do preview.         | Casos de imagem horizontal/quadrada/retrato, EXIF, cancelar/salvar e comparação preview/documento.            |
|     13 | A QA só observava presença e texto do toast; não media duração nem procurava uma ação de dispensa.                                      | Relógio controlado no teste e verificação visual do tempo reduzido e do botão OK.                             |
|     14 | O item sempre era adicionado antes de Continuar; o estado “digitado, mas ainda não incluído” nunca foi exercitado.                      | Continuar com conteúdo pendente, cobrindo adicionar e continuar e descarte consciente.                        |
|     15 | O fluxo parava na tela de sucesso; voltar pelo produto/navegador e uma segunda geração não eram testados.                               | Teste de histórico/destino após gerar e prova de ausência de edição ou duplicação acidental.                  |
|     16 | O app era aberto em desenvolvimento/Expo web, onde localhost é válido; não havia checagem de configuração de build distribuída.         | Guard automático contra loopback em produção/preview e autenticação somente após validar a build.             |
|     17 | A QA do repositório não comparou a build realmente instalada, seus metadados e o fluxo de convite existente; o login impediu ir além.   | Auditoria de versão/build, design handoff, Home e convite sem inferir sobre telas internas não acessadas.     |
|     18 | Não houve medição reproduzível do artefato instalado nem orçamento de tamanho; a percepção de 73 MB ficou fora dos testes funcionais.   | Análise de composição do bundle/artefato, baseline, orçamento e verificação de regressão sem cortar recursos. |

Regra vigente: nenhuma tarefa de UI B4-02…B4-42 fecha sem a matriz de evidência aplicável. “Não reproduzido” e
“não aplicável” não são sinônimos: ambos precisam de superfície/build, passos e evidência; o segundo exige provar que
o fluxo não existe naquela superfície. Ações como download, voltar, concorrência e build distribuída devem ser reais.

## Referências documentais em PDF

As referências foram inspecionadas somente por estrutura e conteúdo, sem reutilizar identidade visual:

- o orçamento demonstra hierarquia com data, título/número, cliente/contatos, validade, serviços e produtos separados, descrição detalhada, unidade/quantidade/preços, subtotais, total, pagamento, garantia, adicionais, assinatura e rodapé;
- o recibo demonstra cabeçalho empresarial, data, declaração com cliente/valor/referência/data, pagamento, adicionais e assinatura;
- a implementação futura deve usar exclusivamente os tokens/componentes Orcivo, Inter, Lucide e roxo `#6D28D9`.

## Hipóteses iniciais de por que a QA anterior não pegou 1–18

Estas são hipóteses de planejamento, não conclusões finais. `B4-43` deve confirmar ou corrigir cada causa depois da implementação.

| Achado | Hipótese inicial de gap                                                                    | Protocolo que teria detectado                                                    |
| -----: | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
|      1 | Viewport/combinação de conteúdo não coberta por asserção de overflow.                      | Adicionar 390x844 e 360x800, status longo e ação lado a lado.                    |
|      2 | Foi validada presença/abertura, não um download real e seus headers.                       | Baixar arquivo real e conferir Content-Disposition, MIME, nome e abertura.       |
|      3 | Teste usou uma sessão/requisição por vez.                                                  | Duas sessões/abas aprovando o mesmo orçamento e asserção de uma única OS.        |
|      4 | O teste verificou criação, não o status inicial exibido após aprovação.                    | Asserir OPEN/Aberta no backend e nas superfícies imediatamente após aprovar.     |
|      5 | Cada modo foi testado isoladamente.                                                        | Alternar fácil/completo no meio da OS e reabrir fotos/estado.                    |
|      6 | O fluxo financeiro não foi exercitado de ponta a ponta com condições reais.                | Aprovação → parcelas → A receber → baixa → recibo.                               |
|      7 | Teste focou validade dos campos existentes, não descoberta da atribuição opcional.         | Criar OS com/sem responsável em cada modo.                                       |
|      8 | Modal não foi testado em largura/teclado mobile.                                           | Captura e asserção de overflow com 390x844 e 360x800.                            |
|      9 | Só valores válidos/esperados foram usados.                                                 | Matriz abaixo, igual e acima do saldo, com confirmação/cancelamento.             |
|     10 | Não houve fixture sem assinatura salva.                                                    | Estado vazio e preenchido como casos separados.                                  |
|     11 | PDF foi conferido como saída final, não como matriz configurável.                          | Matriz opção ligada/desligada × conteúdo presente/ausente.                       |
|     12 | Upload foi validado sem edição da imagem.                                                  | Casos logo quadrada, horizontal, retrato, crop/zoom/cancelar.                    |
|     13 | Toast foi observado visualmente sem medir tempo ou dispensa.                               | Fake timers + botão OK + leitor de tela.                                         |
|     14 | Happy path adicionava o item antes de continuar.                                           | Continuar com editor parcialmente preenchido e três escolhas.                    |
|     15 | Não foi testado histórico/back após geração.                                               | Back do navegador/gesto nativo depois de gerar e asserção de rota/imutabilidade. |
|     16 | Expo/dev aceitou fallback local; não houve gate de configuração de produção.               | Teste estático/build que rejeita loopback em perfil distribuído.                 |
|     17 | A build instalada não foi comparada com commit/configuração e o login bloqueou o restante. | Registrar versão/build e comparar somente telas acessíveis com HEAD/handoff.     |
|     18 | Não havia baseline de artefato nem análise de composição.                                  | Medir APK/AAB/IPA, bundle/assets e orçamento de regressão.                       |

## Ordem de execução e dependências

1. `B4-01`: aprovação concorrente.
2. `B4-43`: protocolo de QA obrigatório, imediatamente após B4-01.
3. Blocos 1–2: `B4-02`…`B4-14`; depois `B4-14A` executa e registra a passada exploratória curta obrigatória.
4. Blocos 3–5: `B4-15`…`B4-27`, sem dependências artificiais entre app, fluxos e documentos.
5. `B4-28`…`B4-32`: levantamentos/ADRs; B4-32 é o último item da fase serial não bloqueada.
6. `B4-44`: passada exploratória pré-deploy, dependente explicitamente de todas as tarefas A/B B4-02…B4-32.
7. `B4-33`: gate das decisões do dono, depois da passada pré-deploy.
8. `B4-34`…`B4-42`: ramos estratégicos aprovados.
9. `B4-45`: passada exploratória pós-onda estratégica.

A execução é manual pelo Codex nesta conversa; `pilot.ps1` e dispatcher não devem ser usados.

## Decisões que exigem o dono

O gate `B4-33` consolida, sem antecipar implementação:

- limites/diferenciação de planos e conteúdo da tela Uso;
- novo posicionamento e dados de profissão/nicho/tratamento/termos;
- arquitetura e experiência multiempresa;
- destino do modo completo no web mobile;
- semântica de realização parcial da OS.

Publicação do app, lojas, DNS, billing, LGPD, stack e design system continuam fora deste lote sem autorização específica.

## Pontos de deploy

Nenhum deploy é executado nesta etapa. Na execução futura, os únicos checkpoints planejados são:

| Gate          | Depois de | Escopo                                                             | Evidência obrigatória anterior                                                                    |
| ------------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `DEPLOY-B4-1` | `B4-14A`  | Blocos 1–2: concorrência, dinheiro, estado, visual e UX            | checklist `IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md`, protocolo B4-43 e nenhum defeito aberto |
| `DEPLOY-B4-2` | `B4-44`   | Blocos 3–5: app, fluxos e documentos, com regressão dos blocos 1–2 | passada exploratória completa, testes verdes e nenhum defeito aberto                              |
| `DEPLOY-B4-3` | `B4-45`   | Onda estratégica B4-34…B4-42 aprovada                              | passada exploratória pós-estratégia, testes verdes e nenhum defeito aberto                        |

Cada deploy futuro usa exclusivamente a receita da seção 6 de `CONTINUE.md`.

## Catálogo de tarefas

### B4-01-approval-concurrency — Aprovação concorrente idempotente

- **Categoria:** bug confirmado
- **Problema:** Reproduzir aprovação do mesmo orçamento em duas sessões e eliminar o erro bruto APPROVED → APPROVED.
- **Comportamento esperado:** A segunda aprovação retorna resultado idempotente/conflito de domínio amigável, recarrega o orçamento aprovado e referencia a OS já criada sem duplicá-la.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/quote`, `apps/backend/src/work-order`, `packages/shared-types/src/quote`, `apps/web/app/approve`, `apps/web/app/(app)/orcamentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** nenhuma — primeira tarefa pronta
- **Critérios de aceite:** A segunda aprovação retorna resultado idempotente/conflito de domínio amigável, recarrega o orçamento aprovado e referencia a OS já criada sem duplicá-la. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** spec de estado e integração com duas requisições concorrentes --runInBand; teste de unicidade: uma aprovação, uma OS e cobranças sem duplicação; testes web/app de mapeamento do conflito
- **Testes visuais:** duas abas/sessões em 1440x900, 390x844 e 360x800; web fácil/completo e app fácil/completo após B4-15
- **Autonomia:** Nível A
- **Evidência de execução (2026-10-11):** duas sessões locais reproduziram o segundo envio sobre orçamento já aprovado; a API respondeu de forma idempotente, a página recarregou o estado persistido e exibiu “Este orçamento já foi aprovado. A tela foi atualizada.”. A rota pública é única e independente dos modos fácil/completo; foi verificada sem overflow em `1440×900` (`scrollWidth 1425/innerWidth 1440`), `390×844` (`375/390`) e `360×800` (`345/360` antes e `360/360` após a resposta). O app não possui ação nativa de aprovação encontrada no escopo — **não reproduzido/não aplicável**; deep link externo fica para revalidação após B4-15. A spec serial comprovou 2 respostas bem-sucedidas e somente 1 aprovação, 1 OS, 1 cobrança e 2 auditorias.

### B4-02-approved-os-starts-pending — OS automática inicia pendente

- **Categoria:** bug confirmado
- **Problema:** Validar e corrigir o status inicial da OS criada pela aprovação.
- **Comportamento esperado:** A OS criada por aprovação inicia em OPEN/Aberta (rótulo pendente no fluxo), nunca IN_PROGRESS/Em execução, e só muda por ação explícita auditada.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/quote`, `apps/backend/src/work-order`, `packages/shared-types/src/work-order`, `apps/web/app/(app)/ordens-de-servico`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** A OS criada por aprovação inicia em OPEN/Aberta (rótulo pendente no fluxo), nunca IN_PROGRESS/Em execução, e só muda por ação explícita auditada. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** quote/work-order state-machine specs; integração aprovação → OS OPEN --runInBand
- **Testes visuais:** aprovar e abrir OS nas seis combinações de superfície/modo nos três viewports web
- **Autonomia:** Nível A

### B4-03-mode-state-photo-consistency — Consistência de estado e fotos ao alternar modo

- **Categoria:** hipótese que precisa ser reproduzida
- **Problema:** Reproduzir alternância fácil/completo no meio da OS, incluindo foto Antes, status e atualização concorrente.
- **Comportamento esperado:** Fotos e estado persistem no backend e reaparecem em ambos os modos; categorias Antes/Durante/Depois têm a mesma semântica e não dependem de estado local de uma tela.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/work-order`, `apps/web/app/facil`, `apps/web/app/(app)/ordens-de-servico`, `apps/mobile/src/easy`, `apps/mobile/src/screens`, `apps/web/lib/work-order.service.ts`, `apps/mobile/src/services/work-order.service.ts`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Fotos e estado persistem no backend e reaparecem em ambos os modos; categorias Antes/Durante/Depois têm a mesma semântica e não dependem de estado local de uma tela. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** spec de persistência/categoria de foto; testes de hidratação após troca de modo; testes de atualização/refetch
- **Testes visuais:** alternar modo após upload em 390x844 e 360x800; reabrir no desktop 1440x900 e no app nativo
- **Autonomia:** Nível A

### B4-04-receivables-flow — Corrigir fluxo A receber

- **Categoria:** hipótese que precisa ser reproduzida
- **Problema:** Mapear o passo exato que falhou em A receber desde aprovação/condições até listagem, baixa e recibo.
- **Comportamento esperado:** Cobranças esperadas são criadas uma vez, listadas com valores/status corretos e baixadas sem divergência em todas as superfícies existentes.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/payment`, `apps/backend/src/quote`, `packages/shared-types`, `apps/web/app/(app)/financeiro`, `apps/web/app/facil/screens/Money.tsx`, `apps/mobile/src/screens`, `apps/mobile/src/easy/screens/Money.tsx`
- **Dependências:** B4-01-approval-concurrency, B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Cobranças esperadas são criadas uma vez, listadas com valores/status corretos e baixadas sem divergência em todas as superfícies existentes. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** integração aprovação → parcelas → A receber → baixa --runInBand; spec de Decimal e status; testes de listas e refresh
- **Testes visuais:** fluxo completo nos três viewports web e app após login; registrar não reproduzido por superfície quando aplicável
- **Autonomia:** Nível A

### B4-05-overpayment-confirmation — Confirmação de recebimento excedente

- **Categoria:** bug confirmado
- **Problema:** Adicionar regra de domínio e confirmação quando o valor recebido supera o saldo esperado.
- **Comportamento esperado:** Antes de confirmar, mostrar esperado, recebido e diferença; permitir motivo opcional; exigir confirmação consciente; persistir/auditar excedente e motivo sem Number.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `apps/backend/src/payment`, `packages/shared-types`, `apps/web/app/(app)/financeiro`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-04-receivables-flow
- **Critérios de aceite:** Antes de confirmar, mostrar esperado, recebido e diferença; permitir motivo opcional; exigir confirmação consciente; persistir/auditar excedente e motivo sem Number. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** shared-types build; payment specs abaixo/igual/acima do esperado --runInBand; isolamento company_id e auditoria; testes de confirmação/cancelamento nas UIs
- **Testes visuais:** valores abaixo, iguais e acima nos três viewports e dois modos; teclado mobile, foco e leitura do resumo
- **Autonomia:** Nível B

### B4-06-work-order-mobile-overflow — Conter status e ação da OS no mobile

- **Categoria:** bug confirmado
- **Problema:** Corrigir vazamento de Em execução e Revisar no modo completo sem alterar tokens/componentes aprovados.
- **Comportamento esperado:** Badge, título e ação quebram/empilham de modo acessível, sem overflow horizontal nem corte, inclusive iPhone 16.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/ordens-de-servico/OSContent.tsx`, `apps/web/app/(app)/ordens-de-servico/[id]/WorkOrderDetail.tsx`, `apps/web/app/facil`, `apps/mobile/src/screens/WorkOrderListScreen.tsx`, `apps/mobile/src/screens/WorkOrderDetailScreen.tsx`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Badge, título e ação quebram/empilham de modo acessível, sem overflow horizontal nem corte, inclusive iPhone 16. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** teste automatizado de ausência de overflow horizontal; testes de componente com texto/status longo
- **Testes visuais:** 1440x900, 390x844 e 360x800 em fácil/completo; app iOS/Android equivalente
- **Autonomia:** Nível A

### B4-07-payment-date-modal-overflow — Conter data no modal de recebimento

- **Categoria:** bug confirmado
- **Problema:** Corrigir o campo de data que ultrapassa o modal no web mobile e verificar equivalentes.
- **Comportamento esperado:** O input respeita largura, safe area, teclado e rolagem; não há overflow horizontal ou CTA inacessível.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/financeiro/PaymentRegistrationModal.tsx`, `apps/web/app/(app)/financeiro/PaymentEditModal.tsx`, `apps/web/app/facil/screens/Money.tsx`, `apps/mobile/src/screens`, `apps/mobile/src/easy/screens/Money.tsx`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** O input respeita largura, safe area, teclado e rolagem; não há overflow horizontal ou CTA inacessível. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** teste de layout/overflow do modal; testes de validação de data
- **Testes visuais:** 1440x900, 390x844 e 360x800 com teclado aberto/fechado nos dois modos; app fácil/completo
- **Autonomia:** Nível A

### B4-08-pdf-open-vs-download — Separar visualizar e baixar PDF

- **Categoria:** hipótese que precisa ser reproduzida
- **Problema:** Testar ação real, não simulada, e separar semântica de abertura, download e compartilhamento conforme navegador/PWA/app.
- **Comportamento esperado:** Ver PDF abre preview; Baixar PDF entrega arquivo com nome/MIME corretos ou fallback explícito quando o ambiente não suporta download; nenhuma ação duplica silenciosamente a outra.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/quote`, `apps/backend/src/storage`, `apps/web/app/api/quotes/[id]/pdf`, `apps/web/app/(app)/orcamentos/[id]/OrcamentoDetail.tsx`, `apps/web/app/facil`, `apps/mobile/src/screens/QuoteDetailScreen.tsx`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Ver PDF abre preview; Baixar PDF entrega arquivo com nome/MIME corretos ou fallback explícito quando o ambiente não suporta download; nenhuma ação duplica silenciosamente a outra. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** e2e de Content-Disposition inline/attachment e MIME; teste de download real no navegador; testes de fallback nativo/PWA
- **Testes visuais:** download real e arquivo aberto nos três viewports; web normal/PWA e app nativo nos dois modos
- **Autonomia:** Nível A

### B4-09-signature-empty-copy — Adicionar assinatura quando não existe

- **Categoria:** bug confirmado
- **Problema:** Corrigir rótulo e estado vazio hoje exibido como Trocar assinatura.
- **Comportamento esperado:** Sem assinatura salva, usar Adicionar assinatura; com assinatura, usar Trocar assinatura; ações levam ao fluxo correto e preservam acessibilidade.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/orcamentos/[id]`, `apps/web/components`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Sem assinatura salva, usar Adicionar assinatura; com assinatura, usar Trocar assinatura; ações levam ao fluxo correto e preservam acessibilidade. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de estado vazio/preenchido; testes de navegação da ação
- **Testes visuais:** seis combinações superfície/modo nos três viewports web
- **Autonomia:** Nível A

### B4-10-toast-duration-dismiss — Toasts mais breves e dispensáveis

- **Categoria:** melhoria de UX
- **Problema:** Inventariar notificações transitórias e reduzir pela metade o tempo atual com ação OK, sem encurtar mensagens críticas que exigem leitura.
- **Comportamento esperado:** Toasts comuns duram metade do tempo anterior e todos podem ser dispensados por OK; mensagens críticas mantêm duração/acessibilidade coerentes; leitores de tela são avisados.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/components`, `apps/web/app/facil`, `apps/mobile/src/components`, `apps/mobile/src/easy`, `apps/mobile/src/screens`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Toasts comuns duram metade do tempo anterior e todos podem ser dispensados por OK; mensagens críticas mantêm duração/acessibilidade coerentes; leitores de tela são avisados. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes com fake timers; teste de botão OK e aria-live/acessibilidade
- **Testes visuais:** toasts de sucesso/erro nas seis combinações e três viewports
- **Autonomia:** Nível A

### B4-11-quote-unsaved-item-guard — Avisar item digitado não adicionado

- **Categoria:** melhoria de UX
- **Problema:** Detectar conteúdo preenchido no editor de item quando Continuar é acionado sem Adicionar.
- **Comportamento esperado:** Oferecer Adicionar item e continuar ou Descartar e continuar; cancelar mantém edição; nunca perder conteúdo silenciosamente.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx`, `apps/web/app/facil/screens/QuoteFlow.tsx`, `apps/mobile/src/screens/QuoteCreateScreen.tsx`, `apps/mobile/src/easy/screens/QuoteFlow.tsx`, `packages/shared-types/src/quote`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Oferecer Adicionar item e continuar ou Descartar e continuar; cancelar mantém edição; nunca perder conteúdo silenciosamente. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes das três escolhas e item vazio; testes de rascunho/navegação
- **Testes visuais:** 1440x900, 390x844, 360x800 nos dois modos e app
- **Autonomia:** Nível A

### B4-12-post-generation-navigation-adr — Definir retorno após gerar orçamento

- **Categoria:** melhoria de UX
- **Problema:** Levantar rotas e riscos de duplicação e registrar decisão curta sobre detalhe somente leitura, lista, Home ou nova criação.
- **Comportamento esperado:** ADR escolhe destino único e regras de histórico/back por superfície, priorizando detalhe somente leitura e prevenção de duplicidade, sem mudar código.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/adr`, `apps/web/app/(app)/orcamentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR escolhe destino único e regras de histórico/back por superfície, priorizando detalhe somente leitura e prevenção de duplicidade, sem mudar código. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** revisão documental de rotas e estados
- **Testes visuais:** checklist do fluxo atual nas seis combinações
- **Autonomia:** Nível B

### B4-13-post-generation-navigation — Aplicar navegação pós-geração aprovada

- **Categoria:** melhoria de UX
- **Problema:** Implementar a decisão do ADR B4-12 nas superfícies equivalentes.
- **Comportamento esperado:** Após gerar, voltar não abre editor ambíguo nem duplica documento; destino e CTA Novo orçamento são explícitos e consistentes.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/orcamentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-12-post-generation-navigation-adr
- **Critérios de aceite:** Após gerar, voltar não abre editor ambíguo nem duplica documento; destino e CTA Novo orçamento são explícitos e consistentes. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de histórico/back e idempotência de geração; testes de rota nas UIs
- **Testes visuais:** botão voltar do navegador, gesto nativo e CTA nos três viewports/dois modos
- **Autonomia:** Nível A

### B4-14-logo-crop-position-zoom — Crop, posição e zoom da logo

- **Categoria:** melhoria de UX
- **Problema:** Adicionar edição não destrutiva de logo usando componente compatível com web e app, preservando upload seguro.
- **Comportamento esperado:** Usuário recorta, reposiciona e amplia; preview corresponde ao arquivo final usado nos documentos; cancelar não altera logo; limites de MIME/tamanho continuam ativos.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/company`, `apps/web/components/LogoField.tsx`, `apps/web/app/(app)/configuracoes`, `apps/web/app/facil`, `apps/mobile/src/screens/configuracoes`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Usuário recorta, reposiciona e amplia; preview corresponde ao arquivo final usado nos documentos; cancelar não altera logo; limites de MIME/tamanho continuam ativos. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system. Além da validação própria, integra o conjunto de tarefas cuja evidência agregada é exigida por DEPLOY-B4-1; não depende artificialmente das demais correções do bloco.
- **Testes automáticos:** spec de upload/transformação; testes de crop cancel/save e orientação EXIF; typecheck/lint
- **Testes visuais:** logo horizontal, quadrada e retrato nos três viewports e app
- **Autonomia:** Nível B

### B4-14A-exploratory-block-1-2 — Passada exploratória curta dos blocos 1–2

- **Categoria:** melhoria de UX
- **Problema:** Depois de B4-02…B4-14, executar uma passada exploratória curta das correções de concorrência, dinheiro, estado, visual e UX antes do primeiro deploy.
- **Comportamento esperado:** Checklist em docs/qa cobre 1440×900, 390×844 e 360×800 nos modos fácil e completo, além do app via Expo web quando o fluxo existir; defeitos encontrados são reabertos/corrigidos antes de liberar DEPLOY-B4-1.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/qa/IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md`, `docs/qa`, `apps/web`, `apps/mobile`
- **Dependências:** B4-02-approved-os-starts-pending, B4-03-mode-state-photo-consistency, B4-04-receivables-flow, B4-05-overpayment-confirmation, B4-06-work-order-mobile-overflow, B4-07-payment-date-modal-overflow, B4-08-pdf-open-vs-download, B4-09-signature-empty-copy, B4-10-toast-duration-dismiss, B4-11-quote-unsaved-item-guard, B4-12-post-generation-navigation-adr, B4-13-post-generation-navigation, B4-14-logo-crop-position-zoom
- **Critérios de aceite:** Criar docs/qa/IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md com data, build/commit, superfície, modo, viewport, fluxo, resultado e evidência. Cobrir B4-01…B4-14 conforme aplicabilidade, duas sessões para aprovação, valores abaixo/igual/acima, download real e navegação; app somente onde reproduzido e acessível. DEPLOY-B4-1 permanece bloqueado até checklist completo, testes verdes e zero defeito aberto no escopo.
- **Testes automáticos:** reexecutar testes adicionados em B4-01…B4-14; typecheck/lint dos apps tocados; specs de integração relevantes com --runInBand
- **Testes visuais:** 1440×900 em fácil e completo; 390×844 em fácil e completo; 360×800 em fácil e completo; Expo web :8081 fácil/completo quando o fluxo existir
- **Autonomia:** Nível A

### B4-15-mobile-api-environment-guard — Bloquear localhost em build distribuída

- **Categoria:** bug confirmado
- **Problema:** Centralizar URL de API por ambiente e impedir que builds distribuídos/produção usem localhost ou loopback.
- **Comportamento esperado:** Build de desenvolvimento pode usar host local explícito; preview/distribuição exige URL válida; build de produção falha cedo se apontar para localhost; nenhuma chave é registrada.
- **Superfícies:** app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/mobile/app.config.*`, `apps/mobile/eas.json`, `apps/mobile/src/config`, `apps/mobile/src/services`, `apps/mobile/package.json`
- **Dependências:** B4-14A-exploratory-block-1-2
- **Critérios de aceite:** Build de desenvolvimento pode usar host local explícito; preview/distribuição exige URL válida; build de produção falha cedo se apontar para localhost; nenhuma chave é registrada. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** teste que falha para localhost/127.0.0.1/::1 em perfil de produção; teste de resolução por perfil; typecheck mobile
- **Testes visuais:** abrir build local equivalente a produção e conferir endpoint sanitizado sem expor valor
- **Autonomia:** Nível A

### B4-16-mobile-real-authentication — Validar autenticação real do app

- **Categoria:** bug confirmado
- **Problema:** Depois do guard de ambiente, testar login real local contra backend acessível e documentar diferenças fácil/completo.
- **Comportamento esperado:** Login, refresh, logout e erro de conexão funcionam; nunca exibir localhost ao usuário; evidência cobre app nativo real, não só Expo web.
- **Superfícies:** app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/mobile/src/screens/auth`, `apps/mobile/src/contexts/AuthContext.tsx`, `apps/mobile/src/services/auth.service.ts`, `docs/qa`
- **Dependências:** B4-15-mobile-api-environment-guard
- **Critérios de aceite:** Login, refresh, logout e erro de conexão funcionam; nunca exibir localhost ao usuário; evidência cobre app nativo real, não só Expo web. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** auth service/screen tests; teste de refresh e erro de rede
- **Testes visuais:** dispositivo/emulador iOS e Android quando disponíveis; registrar limitação objetiva; modo fácil e completo após login
- **Autonomia:** Nível A

### B4-17-mobile-start-invite-build-audit — Auditar Home, convite e versão instalada

- **Categoria:** hipótese que precisa ser reproduzida
- **Problema:** Comparar a build instalada com HEAD/design handoff e confirmar que o fluxo Tenho um convite existe no backend antes de mudar a tela.
- **Comportamento esperado:** Relatório distingue build desatualizada de divergência real; convite é mantido e alinhado se funcional, ou removido somente com evidência; não generaliza telas internas não testadas.
- **Superfícies:** app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/mobile/src/screens/auth`, `apps/mobile/src/navigation`, `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/easy/screens/Home.tsx`, `apps/backend/src/invite`, `packages/shared-types/src/invite`, `docs/qa/R9-APP-DESIGN-DIFF.md`
- **Dependências:** B4-16-mobile-real-authentication
- **Critérios de aceite:** Relatório distingue build desatualizada de divergência real; convite é mantido e alinhado se funcional, ou removido somente com evidência; não generaliza telas internas não testadas. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes do fluxo de convite e versão/configuração; inventário de rotas
- **Testes visuais:** comparação build instalada/Expo web/HEAD e handoff; prints apenas de telas realmente acessadas
- **Autonomia:** Nível B

### B4-18-mobile-size-budget — Medir e otimizar tamanho do app com orçamento

- **Categoria:** melhoria de UX
- **Problema:** Medir APK/AAB/IPA e composição do bundle, definir orçamento inicial e otimizar somente pesos sem valor funcional.
- **Comportamento esperado:** Relatório reproduzível identifica assets/dependências; orçamento tem baseline e tolerância; otimizações mantêm recursos; etapa de download/instalação comunica tamanho quando houver superfície controlável.
- **Superfícies:** app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/mobile`, `pnpm-lock.yaml`, `docs/qa`
- **Dependências:** B4-15-mobile-api-environment-guard
- **Critérios de aceite:** Relatório reproduzível identifica assets/dependências; orçamento tem baseline e tolerância; otimizações mantêm recursos; etapa de download/instalação comunica tamanho quando houver superfície controlável. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** comando reprodutível de bundle/análise; checagem de regressão de tamanho no CI quando viável; testes mobile existentes
- **Testes visuais:** instalação/abertura antes e depois; sem publicação em loja
- **Autonomia:** Nível B

### B4-19-service-owner-adr — ADR de responsável pelo serviço e nomenclatura

- **Categoria:** nova funcionalidade
- **Problema:** Deduplicar achados 7 e 21: mapear domínio atual, melhor momento da pergunta, termo neutro padrão e possibilidade futura de termo configurável.
- **Comportamento esperado:** ADR define responsável opcional, padrão Responsável pelo serviço/Responsável, compatibilidade com membros/permissões e comportamento em criação/edição/PDF; não implementa.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/adr`, `prisma/schema.prisma`, `apps/backend/src/work-order`, `apps/web`, `apps/mobile`, `packages/shared-types`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR define responsável opcional, padrão Responsável pelo serviço/Responsável, compatibilidade com membros/permissões e comportamento em criação/edição/PDF; não implementa. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** revisão de esquema/API e ocorrências de technician/técnico
- **Testes visuais:** wireflow/checklist nas seis combinações
- **Autonomia:** Nível B

### B4-20-service-owner-assignment — Atribuição opcional do responsável pelo serviço

- **Categoria:** nova funcionalidade
- **Problema:** Implementar o ADR B4-19 de ponta a ponta sem conceito fixo de técnico.
- **Comportamento esperado:** Criação e edição permitem atribuir/remover responsável opcional; backend valida membro da mesma empresa; termo neutro aparece nos modos fácil/completo e documentos aplicáveis.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `apps/backend/src/work-order`, `packages/shared-types/src/work-order`, `apps/web/app/(app)/ordens-de-servico`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-19-service-owner-adr
- **Critérios de aceite:** Criação e edição permitem atribuir/remover responsável opcional; backend valida membro da mesma empresa; termo neutro aparece nos modos fácil/completo e documentos aplicáveis. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** shared-types build; specs de tenant/membro e CRUD --runInBand; testes das UIs
- **Testes visuais:** criar/editar com, sem e removendo responsável nas seis combinações
- **Autonomia:** Nível B

### B4-21-quote-completeness-review — Revisão de completude antes de gerar/enviar

- **Categoria:** nova funcionalidade
- **Problema:** Adicionar etapa que mostra opcionais vazios e permite preenchê-los sem abandonar o fluxo.
- **Comportamento esperado:** Antes de gerar/enviar, listar somente campos opcionais relevantes ausentes, explicar que não aparecerão, permitir editar/salvar inline e continuar sem bloqueio consciente.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `packages/shared-types/src/quote`, `apps/backend/src/quote`, `apps/web/app/(app)/orcamentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Antes de gerar/enviar, listar somente campos opcionais relevantes ausentes, explicar que não aparecerão, permitir editar/salvar inline e continuar sem bloqueio consciente. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** schema/contrato da completude; testes de campos presentes/ausentes e continuar; testes de navegação sem perda
- **Testes visuais:** completo/incompleto nos três viewports e dois modos/app
- **Autonomia:** Nível B

### B4-22-receipt-signature-flow — Selecionar ou adicionar assinatura no recibo

- **Categoria:** nova funcionalidade
- **Problema:** Unificar os achados 10 e 22 em fluxo de assinatura salva ou exclusiva do documento.
- **Comportamento esperado:** Ao emitir recibo, selecionar assinatura salva, adicionar quando ausente e opcionalmente usar uma assinatura só neste documento sem sobrescrever a padrão sem confirmação.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/payment`, `apps/backend/src/company`, `packages/shared-types`, `apps/web/app/(app)/documentos`, `apps/web/app/facil/screens/Receipts.tsx`, `apps/mobile/src/screens`, `apps/mobile/src/easy/screens/Receipts.tsx`
- **Dependências:** B4-09-signature-empty-copy
- **Critérios de aceite:** Ao emitir recibo, selecionar assinatura salva, adicionar quando ausente e opcionalmente usar uma assinatura só neste documento sem sobrescrever a padrão sem confirmação. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** specs assinatura salva/avulsa/ausente; testes de não sobrescrita; shared-types build
- **Testes visuais:** emitir recibo nos três estados em todas as superfícies existentes
- **Autonomia:** Nível B

### B4-23-receipt-fields-inventory — Inventariar opções de informação do recibo

- **Categoria:** melhoria de UX
- **Problema:** Levantar campos já configuráveis e lacunas do achado 11, sem duplicar opções existentes.
- **Comportamento esperado:** Matriz campo → origem → padrão → configurável → superfície → PDF cobre cabeçalho, declaração, pagamento, adicionais, assinatura e rodapé; recomenda modelo compatível.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `packages/shared-types/src/quote/quote-doc-options.ts`, `packages/shared-types/src/company`, `apps/backend/src/payment/receipt-pdf.service.tsx`, `apps/web/components/ReceiptPaper.tsx`, `apps/web/app/(app)/documentos`, `apps/mobile/src/easy/screens/Receipts.tsx`, `docs/qa`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** Matriz campo → origem → padrão → configurável → superfície → PDF cobre cabeçalho, declaração, pagamento, adicionais, assinatura e rodapé; recomenda modelo compatível. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** revisão de contratos e snapshots atuais
- **Testes visuais:** comparação visual do recibo Orcivo atual com a referência estrutural, sem copiar identidade
- **Autonomia:** Nível B

### B4-24-document-model — Modelo compartilhado para orçamento e recibo evoluídos

- **Categoria:** nova funcionalidade
- **Problema:** Modelar serviços/produtos, unidades, subtotais, pagamento, garantia, adicionais, assinatura e campos configuráveis, reutilizando doc_options quando couber.
- **Comportamento esperado:** Contratos Zod e backend mantêm compatibilidade; cálculos usam Decimal; dados novos têm company_id e migrations idempotentes; opções têm defaults claros.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `packages/shared-types/src/quote`, `packages/shared-types/src/company`, `apps/backend/src/quote`, `apps/backend/src/payment`
- **Dependências:** B4-23-receipt-fields-inventory
- **Critérios de aceite:** Contratos Zod e backend mantêm compatibilidade; cálculos usam Decimal; dados novos têm company_id e migrations idempotentes; opções têm defaults claros. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** shared-types build; specs de migração/default/compatibilidade; cálculos de subtotais serviços/produtos em Decimal; isolamento por empresa
- **Testes visuais:** revisão de fixtures e conteúdo nos modos, sem mudança visual antecipada
- **Autonomia:** Nível B

### B4-25-quote-pdf-structure — Evoluir conteúdo do PDF de orçamento

- **Categoria:** nova funcionalidade
- **Problema:** Aplicar ao PDF Orcivo a estrutura útil da referência sem copiar cores/aparência.
- **Comportamento esperado:** PDF traz cabeçalho Orcivo, cliente, título/número, validade, serviços e produtos separados, descrição, unidade, quantidade, unitário, subtotais, total, pagamento, garantia, adicionais, assinatura e rodapé configurável.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/quote/quote-pdf.service.tsx`, `apps/backend/src/quote/quote-pdf.service.spec.ts`, `packages/shared-types/src/quote`, `apps/web/app/(app)/orcamentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-24-document-model
- **Critérios de aceite:** PDF traz cabeçalho Orcivo, cliente, título/número, validade, serviços e produtos separados, descrição, unidade, quantidade, unitário, subtotais, total, pagamento, garantia, adicionais, assinatura e rodapé configurável. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** snapshots/extração de conteúdo PDF; specs de paginação e Decimal; download real
- **Testes visuais:** render A4 com 1 e múltiplas páginas, textos longos e logo; inspeção sem corte/sobreposição; ações nos três viewports e app
- **Autonomia:** Nível B

### B4-26-receipt-pdf-structure — Evoluir conteúdo configurável do recibo

- **Categoria:** nova funcionalidade
- **Problema:** Aplicar a estrutura declarativa da referência ao recibo Orcivo, preservando identidade.
- **Comportamento esperado:** Recibo contém cabeçalho, data, declaração com cliente/valor/referência/data, pagamento, adicionais, assinatura e rodapé; campos configuráveis obedecem defaults e ausência consciente.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/payment/receipt-pdf.service.tsx`, `apps/backend/src/payment/payment.service.ts`, `packages/shared-types`, `apps/web/components/ReceiptPaper.tsx`, `apps/web/app/(app)/documentos`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`
- **Dependências:** B4-22-receipt-signature-flow, B4-24-document-model
- **Critérios de aceite:** Recibo contém cabeçalho, data, declaração com cliente/valor/referência/data, pagamento, adicionais, assinatura e rodapé; campos configuráveis obedecem defaults e ausência consciente. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** specs de conteúdo/opções/Decimal; render e extração de PDF; testes de assinatura
- **Testes visuais:** render A4 com opções ligadas/desligadas, textos longos e sem assinatura; visual nos três viewports/app
- **Autonomia:** Nível B

### B4-27-document-settings-surfaces — Configurações e preview dos documentos

- **Categoria:** nova funcionalidade
- **Problema:** Expor as opções modeladas em B4-24 nas superfícies aplicáveis, sem recriar o design system.
- **Comportamento esperado:** Empresa define defaults e cada documento pode sobrescrever quando permitido; preview deixa claro o que aparecerá; fácil/completo permanecem consistentes.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/components/QuoteDocOptionsForm.tsx`, `apps/web/app/(app)/configuracoes`, `apps/web/app/facil/DocOptions.tsx`, `apps/mobile/src/easy/DocOptions.tsx`, `apps/mobile/src/screens/configuracoes`, `apps/backend/src/company`, `packages/shared-types/src/company`
- **Dependências:** B4-24-document-model
- **Critérios de aceite:** Empresa define defaults e cada documento pode sobrescrever quando permitido; preview deixa claro o que aparecerá; fácil/completo permanecem consistentes. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de defaults/override/serialização; typecheck/lint web/mobile
- **Testes visuais:** preview/configuração nos três viewports, dois modos e app
- **Autonomia:** Nível B

### B4-28-usage-plans-adr — ADR de Uso, limites e diferenciação de planos

- **Categoria:** decisão estratégica do dono
- **Problema:** Inventariar limites e regras reais no backend, propor tela Uso e indicadores, e avaliar diferenciação por valor sem alterar billing.
- **Comportamento esperado:** ADR lista fonte de cada número, limites úteis/removíveis, estados 80/100/excedido, funcionalidades e CTAs; mantém nomes oficiais e marca escolhas comerciais para aprovação do dono; não implementa bloqueios.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/plan-limits`, `prisma/schema.prisma`, `packages/shared-types`, `apps/web/app/(app)/plano`, `apps/mobile/src`, `apps/site`, `docs/adr`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR lista fonte de cada número, limites úteis/removíveis, estados 80/100/excedido, funcionalidades e CTAs; mantém nomes oficiais e marca escolhas comerciais para aprovação do dono; não implementa bloqueios. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** inventário de PlanLimit/endpoints/feature gates e testes existentes
- **Testes visuais:** wireframes descritivos para desktop/mobile/app sem mudar design system
- **Autonomia:** Nível B

### B4-29-neutral-positioning-adr — ADR de posicionamento e linguagem neutra

- **Categoria:** decisão estratégica do dono
- **Problema:** Mapear todas as ocorrências de técnico/instalador e decidir o que é comunicação, domínio, cadastro, documentos ou permissão; incorporar preferências do achado 25.
- **Comportamento esperado:** ADR propõe padrão neutro, campos profissão/nicho/objetivos/tratamento/termos configuráveis e matriz de impacto; não altera landing, domínio ou textos ainda.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo; site/landing; e-mails; PDFs
- **Escopo provável:** `apps/site`, `apps/web`, `apps/mobile`, `apps/backend/src`, `packages/shared-types`, `docs`, `docs/adr`
- **Dependências:** B4-19-service-owner-adr
- **Critérios de aceite:** ADR propõe padrão neutro, campos profissão/nicho/objetivos/tratamento/termos configuráveis e matriz de impacto; não altera landing, domínio ou textos ainda. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** varredura automatizada de termos com exclusões justificadas; inventário de contratos/copy
- **Testes visuais:** amostras de copy e documentos no design Orcivo, sem implementação
- **Autonomia:** Nível B

### B4-30-multicompany-adr — ADR de multiempresa e isolamento

- **Categoria:** decisão estratégica do dono
- **Problema:** Comparar o cenário Gastrobodes + empresas privadas com o modelo existente de memberships, convites e empresa ativa.
- **Comportamento esperado:** ADR cobre company_id, papéis por empresa, troca de empresa, convite/onboarding, sessão, auditoria, isolamento, migração e ameaças de vazamento; não altera modelo.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `apps/backend/src/auth`, `apps/backend/src/invite`, `apps/backend/src/company`, `apps/web/components/AuthProvider.tsx`, `apps/mobile/src/contexts/AuthContext.tsx`, `packages/shared-types`, `docs/adr`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR cobre company_id, papéis por empresa, troca de empresa, convite/onboarding, sessão, auditoria, isolamento, migração e ameaças de vazamento; não altera modelo. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** inventário de schema/endpoints/guards; matriz de isolamento e testes faltantes
- **Testes visuais:** wireflow Arlindo/Leo/Marcus com troca de empresa
- **Autonomia:** Nível B

### B4-31-web-mobile-mode-adr — ADR do modo completo no web mobile

- **Categoria:** decisão estratégica do dono
- **Problema:** Avaliar manter, esconder ou adaptar o modo completo no web mobile, separado do app nativo.
- **Comportamento esperado:** ADR compara uso, acessibilidade, custo, paridade e risco; mantém modo fácil padrão; não muda visibilidade nem UI.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo
- **Escopo provável:** `apps/web/app/facil`, `apps/web/app/(app)`, `apps/web/components/EasyMode.tsx`, `docs/adr`, `docs/qa`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR compara uso, acessibilidade, custo, paridade e risco; mantém modo fácil padrão; não muda visibilidade nem UI. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** inventário de rotas/telemetria disponível e gaps
- **Testes visuais:** auditoria 390x844/360x800 em ambos os modos
- **Autonomia:** Nível B

### B4-32-partial-work-order-adr — ADR de realização parcial da OS

- **Categoria:** decisão estratégica do dono
- **Problema:** Definir estado por item e efeitos em cobrança, recibo, estoque, garantia e auditoria antes de implementar.
- **Comportamento esperado:** ADR explicita estados/transições, invariantes Decimal, reversões, documentos, estoque e UX; inclui casos três contratados/dois realizados; não muda esquema.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `apps/backend/src/work-order`, `apps/backend/src/payment`, `apps/backend/src/stock`, `apps/backend/src/quote`, `packages/shared-types`, `apps/web`, `apps/mobile`, `docs/adr`
- **Dependências:** B4-43-qa-gap-regression-protocol
- **Critérios de aceite:** ADR explicita estados/transições, invariantes Decimal, reversões, documentos, estoque e UX; inclui casos três contratados/dois realizados; não muda esquema. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** modelagem de transições e matriz de casos
- **Testes visuais:** protótipos de estado parcial nas seis combinações
- **Autonomia:** Nível B

### B4-33-owner-strategy-decisions — Registrar decisões estratégicas do dono

- **Categoria:** decisão estratégica do dono
- **Problema:** Apresentar ADRs B4-28 a B4-32 e registrar decisões explícitas antes de qualquer implementação estratégica.
- **Comportamento esperado:** Cada ADR recebe aprovado, ajustar ou adiar; escopo comercial, posicionamento, multiempresa, modos e OS parcial fica inequívoco; nenhuma implementação ocorre nesta tarefa.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/adr`, `.planning/CONTINUE.md`, `.planning/IMPROVEMENT-ROUNDS.md`
- **Dependências:** B4-44-key-user-exploratory-final
- **Critérios de aceite:** Cada ADR recebe aprovado, ajustar ou adiar; escopo comercial, posicionamento, multiempresa, modos e OS parcial fica inequívoco; nenhuma implementação ocorre nesta tarefa. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** validação documental e rastreabilidade das decisões
- **Testes visuais:** n/a
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-34-usage-backend-contract — Contrato backend da tela Uso

- **Categoria:** decisão estratégica do dono
- **Problema:** Após aprovação B4-33, expor snapshot autoritativo de plano, período, consumo, limites, restante, estado e features.
- **Comportamento esperado:** Backend calcula tudo; shared-types publica códigos/contrato; frontend não reconstrói regras; sem novo billing ou bloqueio não aprovado.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/backend/src/plan-limits`, `apps/backend/src/billing`, `packages/shared-types/src`, `prisma/schema.prisma`, `prisma/migrations`
- **Dependências:** B4-33-owner-strategy-decisions
- **Critérios de aceite:** Backend calcula tudo; shared-types publica códigos/contrato; frontend não reconstrói regras; sem novo billing ou bloqueio não aprovado. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** shared-types build; specs 0/79/80/99/100/excedido; tenant isolation e datas de reset
- **Testes visuais:** fixtures legíveis para UIs
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-35-usage-screen — Tela Uso nas superfícies

- **Categoria:** decisão estratégica do dono
- **Problema:** Consumir B4-34 em Configurações/menu da conta com progresso e CTA contextual.
- **Comportamento esperado:** Mostra plano, assinatura, período/reset, usado/limite/restante de recursos aprovados, membros, armazenamento quando real, features disponíveis/bloqueadas e estados 80/100/excedido.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/configuracoes`, `apps/web/app/(app)/plano`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`, `packages/shared-types`
- **Dependências:** B4-34-usage-backend-contract
- **Critérios de aceite:** Mostra plano, assinatura, período/reset, usado/limite/restante de recursos aprovados, membros, armazenamento quando real, features disponíveis/bloqueadas e estados 80/100/excedido. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de render por estado e contrato; typecheck/lint
- **Testes visuais:** 1440x900, 390x844, 360x800 nos dois modos e app
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-36-usage-early-warnings — Alertas antecipados de uso

- **Categoria:** decisão estratégica do dono
- **Problema:** Exibir indicadores pequenos nas telas relacionadas e alertas antes do bloqueio, somente para limites aprovados.
- **Comportamento esperado:** Estados 80%, 100% e excedido vêm do backend, são acessíveis e não criam bloqueios artificiais; CTA compara planos sem nomenclatura antiga.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app`, `apps/web/components`, `apps/mobile/src`, `packages/shared-types`
- **Dependências:** B4-34-usage-backend-contract
- **Critérios de aceite:** Estados 80%, 100% e excedido vêm do backend, são acessíveis e não criam bloqueios artificiais; CTA compara planos sem nomenclatura antiga. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de limiares/CTA e ausência de regra duplicada
- **Testes visuais:** telas de clientes/orçamentos/OS e Uso nos três viewports/app
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-37-neutral-copy-and-onboarding — Aplicar posicionamento e onboarding aprovados

- **Categoria:** decisão estratégica do dono
- **Problema:** Aplicar ADR B4-29 em landing, onboarding, mensagens, e-mails e documentos, com perfil/nicho/objetivos/tratamento/termos aprovados.
- **Comportamento esperado:** Sem técnico/instalador fixo onde o ADR exigir neutralidade; defaults funcionam; dados novos são tenant-scoped/company_id; documentos respeitam termo profissional configurado.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo; site/landing; e-mails; PDFs
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `apps/site`, `apps/web`, `apps/mobile`, `apps/backend/src`, `packages/shared-types`
- **Dependências:** B4-33-owner-strategy-decisions
- **Critérios de aceite:** Sem técnico/instalador fixo onde o ADR exigir neutralidade; defaults funcionam; dados novos são tenant-scoped/company_id; documentos respeitam termo profissional configurado. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** varredura de termos; shared-types build; specs de defaults/isolamento; testes de onboarding
- **Testes visuais:** landing desktop/mobile, onboarding e documentos nas superfícies
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-38-multicompany-domain-isolation — Domínio e isolamento multiempresa

- **Categoria:** decisão estratégica do dono
- **Problema:** Implementar somente o modelo aprovado no ADR B4-30, preservando empresas existentes.
- **Comportamento esperado:** Um usuário pertence a várias empresas; papéis são por empresa; empresa ativa é validada no backend; nenhum endpoint cruza company_id; convites não recadastram usuário.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `apps/backend/src/auth`, `apps/backend/src/company`, `apps/backend/src/invite`, `packages/shared-types`
- **Dependências:** B4-33-owner-strategy-decisions
- **Critérios de aceite:** Um usuário pertence a várias empresas; papéis são por empresa; empresa ativa é validada no backend; nenhum endpoint cruza company_id; convites não recadastram usuário. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** matriz e2e A/B de isolamento --runInBand; convite de usuário existente/novo; troca de empresa e token/sessão; migration idempotente
- **Testes visuais:** evidência funcional preparada para B4-39
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-39-multicompany-switching-ux — Troca de empresa, convite e onboarding multiempresa

- **Categoria:** decisão estratégica do dono
- **Problema:** Expor B4-38 com empresa ativa clara e fluxos de ingresso/criação nas seis combinações.
- **Comportamento esperado:** Arlindo, Leo e Marcus alternam Gastrobodes e empresas privadas sem vazamento ou recadastro; empresa atual aparece com clareza e ações sensíveis confirmam contexto.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/components/AuthProvider.tsx`, `apps/web/app`, `apps/mobile/src/contexts/AuthContext.tsx`, `apps/mobile/src/screens`, `apps/mobile/src/easy`, `packages/shared-types`
- **Dependências:** B4-38-multicompany-domain-isolation
- **Critérios de aceite:** Arlindo, Leo e Marcus alternam Gastrobodes e empresas privadas sem vazamento ou recadastro; empresa atual aparece com clareza e ações sensíveis confirmam contexto. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de troca/refresh/deep link; testes de permissão por empresa
- **Testes visuais:** cenário completo em 1440x900, 390x844, 360x800 e app
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-40-web-mobile-mode-decision-implementation — Aplicar decisão de modos no web mobile

- **Categoria:** decisão estratégica do dono
- **Problema:** Executar somente a opção aprovada no ADR B4-31: manter, esconder ou adaptar.
- **Comportamento esperado:** Modo fácil continua padrão; alternância/visibilidade e acessibilidade seguem a decisão; nenhuma mudança afeta o app nativo por associação indevida.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo
- **Escopo provável:** `apps/web/app/facil`, `apps/web/app/(app)`, `apps/web/components/EasyMode.tsx`, `docs/qa`
- **Dependências:** B4-33-owner-strategy-decisions
- **Critérios de aceite:** Modo fácil continua padrão; alternância/visibilidade e acessibilidade seguem a decisão; nenhuma mudança afeta o app nativo por associação indevida. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de modo/rota/preferência; testes de acessibilidade/overflow
- **Testes visuais:** 1440x900, 390x844, 360x800 em fácil/completo conforme decisão
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-41-partial-work-order-domain — Domínio da realização parcial

- **Categoria:** decisão estratégica do dono
- **Problema:** Implementar estados por item e efeitos aprovados no ADR B4-32.
- **Comportamento esperado:** Transições são auditadas/idempotentes; cobrança, recibo, estoque e garantia derivam da realização aprovada; Decimal/company_id/migrations idempotentes preservados.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `prisma/schema.prisma`, `prisma/migrations`, `apps/backend/src/work-order`, `apps/backend/src/payment`, `apps/backend/src/stock`, `apps/backend/src/quote`, `packages/shared-types`
- **Dependências:** B4-33-owner-strategy-decisions
- **Critérios de aceite:** Transições são auditadas/idempotentes; cobrança, recibo, estoque e garantia derivam da realização aprovada; Decimal/company_id/migrations idempotentes preservados. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** state-machine specs; integração três itens/dois realizados, reversão e cancelamento --runInBand; isolamento tenant
- **Testes visuais:** fixtures para B4-42
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-42-partial-work-order-surfaces-docs — UI e documentos da realização parcial

- **Categoria:** decisão estratégica do dono
- **Problema:** Expor B4-41 em OS, cobrança, recibo e PDF nas superfícies onde o fluxo existe.
- **Comportamento esperado:** Usuário marca itens realizados/não realizados com motivo quando exigido; totais e documentos explicam a parcialidade; alternar modo não perde estado.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `apps/web/app/(app)/ordens-de-servico`, `apps/web/app/facil`, `apps/mobile/src/screens`, `apps/mobile/src/easy`, `apps/backend/src/quote/quote-pdf.service.tsx`, `apps/backend/src/payment/receipt-pdf.service.tsx`
- **Dependências:** B4-41-partial-work-order-domain
- **Critérios de aceite:** Usuário marca itens realizados/não realizados com motivo quando exigido; totais e documentos explicam a parcialidade; alternar modo não perde estado. Nenhuma validação em produção; usar somente ambiente local. Para toda superfície onde o fluxo não existir ou o defeito não reproduzir, registrar "não reproduzido" com print/checklist e provar o comportamento correto equivalente. Critérios globais: regra de negócio no backend/shared-types; dinheiro somente Decimal/string decimal/formatMoney; dados novos com company_id; migrations idempotentes; pt-BR; planos Orcivo Livre, Solo, Mais e Equipe; Lucide e #6D28D9; sem recriar o design system.
- **Testes automáticos:** testes de UI e PDF parcial; testes de troca de modo
- **Testes visuais:** três itens/dois realizados nos três viewports, dois modos e app
- **Autonomia:** Nível C — gate `batch4-strategy-owner-approval`

### B4-43-qa-gap-regression-protocol — Explicar gaps e institucionalizar regressões

- **Categoria:** melhoria de UX
- **Problema:** Logo depois da primeira correção de concorrência, registrar para os achados 1-18 por que a QA anterior não os detectou e atualizar o catálogo com o protocolo obrigatório antes das demais tarefas de UI.
- **Comportamento esperado:** O protocolo novo entra em vigor antes de B4-02: 1440×900, 390×844 e 360×800, fácil/completo, troca de modo no meio do fluxo, duas sessões, download real, valores acima/abaixo, continuar sem salvar, voltar após gerar e build distribuída do app sem localhost.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/qa/KEY-USER-UAT-FINDINGS-2026-10-11.md`, `docs/qa/CATALOGO-DE-TESTES.md`, `apps/backend/src`, `apps/web`, `apps/mobile`
- **Dependências:** B4-01-approval-concurrency
- **Critérios de aceite:** O protocolo novo entra em vigor antes de B4-02: 1440×900, 390×844 e 360×800, fácil/completo, troca de modo no meio do fluxo, duas sessões, download real, valores acima/abaixo, continuar sem salvar, voltar após gerar e build distribuída do app sem localhost. docs/qa/CATALOGO-DE-TESTES.md e o documento UAT registram protocolo e causa inicial dos achados 1–18; as automações viáveis são especificadas/adicionadas quando a tarefa correspondente for executada. Nenhuma tarefa de UI B4-02…B4-42 fecha sem aplicar o protocolo. Sem deploy nem dados de produção.
- **Testes automáticos:** overflow nos três viewports; aprovação concorrente; guard de localhost em produção; regressões automatizáveis de 1-18
- **Testes visuais:** matriz obrigatória por tarefa UI e evidências referenciadas
- **Autonomia:** Nível A

### B4-44-key-user-exploratory-final — Passada exploratória pré-deploy das correções

- **Categoria:** melhoria de UX
- **Problema:** Após a última tarefa não bloqueada B4-32, executar cadastro → orçamento → aprovação → OS → recebimento → recibo nas três superfícies e dois modos antes do segundo deploy.
- **Comportamento esperado:** Checklist/prints cobrem blocos 3–5 e regressão dos blocos 1–2; todo defeito é corrigido e revalidado; somente depois o checkpoint DEPLOY-B4-2 pode ser liberado.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/qa`, `apps/backend`, `apps/web`, `apps/mobile`, `packages/shared-types`
- **Dependências:** B4-02-approved-os-starts-pending, B4-03-mode-state-photo-consistency, B4-04-receivables-flow, B4-05-overpayment-confirmation, B4-06-work-order-mobile-overflow, B4-07-payment-date-modal-overflow, B4-08-pdf-open-vs-download, B4-09-signature-empty-copy, B4-10-toast-duration-dismiss, B4-11-quote-unsaved-item-guard, B4-12-post-generation-navigation-adr, B4-13-post-generation-navigation, B4-14-logo-crop-position-zoom, B4-15-mobile-api-environment-guard, B4-16-mobile-real-authentication, B4-17-mobile-start-invite-build-audit, B4-18-mobile-size-budget, B4-19-service-owner-adr, B4-20-service-owner-assignment, B4-21-quote-completeness-review, B4-22-receipt-signature-flow, B4-23-receipt-fields-inventory, B4-24-document-model, B4-25-quote-pdf-structure, B4-26-receipt-pdf-structure, B4-27-document-settings-surfaces, B4-28-usage-plans-adr, B4-29-neutral-positioning-adr, B4-30-multicompany-adr, B4-31-web-mobile-mode-adr, B4-32-partial-work-order-adr
- **Critérios de aceite:** Checklist/prints cobrem blocos 3–5 e regressão dos blocos 1–2; todo defeito é corrigido e revalidado; somente depois o checkpoint DEPLOY-B4-2 pode ser liberado. O app usa build distribuída equivalente com API correta; esta tarefa não faz deploy, apenas produz a evidência obrigatória anterior ao deploy. Nenhuma dependência estratégica B4-33…B4-42 é necessária.
- **Testes automáticos:** suite completa serial, integração --runInBand, typecheck/lint/build e secret scan; reexecução de todos os testes adicionados no Batch 4
- **Testes visuais:** 1440x900, 390x844, 360x800 em fácil/completo; app nativo fácil/completo; duas sessões, download real e fluxo completo com evidência
- **Autonomia:** Nível A

### B4-45-key-user-exploratory-post-strategy — Passada exploratória pós-onda estratégica

- **Categoria:** melhoria de UX
- **Problema:** Depois de B4-34…B4-42 aprovadas e concluídas, repetir a passada exploratória completa nas três superfícies e dois modos antes do deploy estratégico.
- **Comportamento esperado:** Checklist/prints cobrem cadastro → orçamento → aprovação → OS → recebimento → recibo, além de Uso, posicionamento/onboarding, multiempresa, estratégia de modos e OS parcial conforme decisões aprovadas.
- **Superfícies:** web desktop - fácil; web desktop - completo; web mobile - fácil; web mobile - completo; app nativo - fácil; app nativo - completo
- **Escopo provável:** `docs/qa`, `apps/backend`, `apps/web`, `apps/mobile`, `packages/shared-types`
- **Dependências:** B4-35-usage-screen, B4-36-usage-early-warnings, B4-37-neutral-copy-and-onboarding, B4-39-multicompany-switching-ux, B4-40-web-mobile-mode-decision-implementation, B4-42-partial-work-order-surfaces-docs
- **Critérios de aceite:** Checklist/prints cobrem cadastro → orçamento → aprovação → OS → recebimento → recibo, além de Uso, posicionamento/onboarding, multiempresa, estratégia de modos e OS parcial conforme decisões aprovadas. Todo defeito é corrigido e revalidado; somente depois o checkpoint DEPLOY-B4-3 pode ser liberado. O app usa build distribuída equivalente com API correta; esta tarefa não faz deploy.
- **Testes automáticos:** suite completa serial, integração --runInBand, typecheck/lint/build e secret scan; reexecução de todos os testes adicionados no Batch 4
- **Testes visuais:** 1440x900, 390x844, 360x800 em fácil/completo; app nativo fácil/completo; duas sessões, download real e fluxo completo com evidência
- **Autonomia:** Nível A
