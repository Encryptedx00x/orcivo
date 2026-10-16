# Rodadas de melhoria e correção — a partir de 2026-10-08

Fonte dos itens: benchmark `.planning/research/AGENDA-BOA-BENCHMARK.md` (AB-1…AB-24), varredura
`docs/qa/2026-10-06-bateria-de-testes.md` (V1…V16) e backlog 999.x do `ROADMAP.md`.
Roteiro de testes de cada rodada: `docs/qa/CATALOGO-DE-TESTES.md` (IDs O/S/F/N/P/W).

## Andamento (atualizado 2026-10-12)

| Rodada | Status | Commits principais |
| --- | --- | --- |
| Next 15 / React 19 (web) | ✅ produção | `e8c2092`, `63aacf6` |
| R0 | ✅ produção — copiar link, preço do site sem `Number`, 999.1 ok, Nova OS (seta), ações rápidas na lista de OS (999.4), feed clicável (999.8), fuso `TZ` no web, PDF com fuso | `78c53fc`, `057cbcf` |
| R1 | ✅ — app completo: criar OS, detalhe com valor/data/obs/WhatsApp, endereço da empresa, desconto + condições + opções no orçamento, validade corrigida (dava 400), desconto % exibido certo | `8d3ef40` |
| R2 | ✅ produção — 6 tipos de documento, cor, contato do cliente, Instagram/site, registro profissional, frase de rodapé (PDF orçamento + recibo) | `f7df634`, `6b8a8ae` |
| R3 | ✅ produção — duplicar orçamento (4 telas), condição de pagamento estruturada → **cobranças criadas na aprovação**, garantia; mensagens de limite com "Ver planos" | `7338121`, `1479e25` |
| R5b…R9 | ✅ produção — OS sob medida, agenda/recorrência, clientes/estoque, relatórios/portabilidade, tema/app e seletores/listas limitados. Validação integrada e visual concluída nas quatro superfícies aplicáveis. | `744fba8`…`6904bb1` |
| R4 | ✅ produção — custos (`/expenses`), resumo do mês, web completo + fácil + app fácil; **custos e lucro por OS** (web), resultado do mês no Financeiro do app completo | `b28e341`, `6422c1b`, `d380c1a`, `a15c654` |
| R3 (sobras) | ✅ produção — formas de pagamento aceitas (em `payment_terms.methods`, sem migration) no PDF/link; laudo = Observações rotuladas "Laudo técnico" quando o tipo é LAUDO; campo morto "Observações internas" removido do novo orçamento web | `beab4c9` |
| R5a | ✅ produção — campos da OS por segmento: `companies.work_order_fields` + `work_orders.details` (JSONB), modelos ar-condicionado/elétrica/CFTV/portões, Configurações → Ordem de serviço (web), Nova OS + cartão "Dados do equipamento" (web e app completo) | `2d7d2c0` |
| Improvement Batch 4 | 🟡 em andamento — B4-38 concluiu sessões e isolamento multiempresa no backend; próxima B4-39, execução manual sem autopilot | `a94d073`…`c36c0f7` |

Decisões:
- Desconto separado serviços × produtos: **descartado** por ora — itens livres não têm tipo; exigiria tipo no item, dois pares de desconto e recálculo em 6 telas para pouco ganho sobre o desconto geral. Reabrir se técnicos pedirem.
- Erro React #418: não reproduz mais em aba limpa em nenhuma página (era anterior ao `TZ` no container web).

Pendências registradas para depois:
- A fila R5b…R9 foi concluída e implantada; o plano separado de confiabilidade do autopilot está em `docs/runbooks/AUTOPILOT-RELIABILITY-IMPROVEMENT-PLAN.md`.
- App mobile: as mudanças só chegam aos aparelhos com um novo build (EAS) — publicação nas lojas é Nível C.
- Improvement Batch 4: fonte humana em `docs/qa/KEY-USER-UAT-FINDINGS-2026-10-11.md`, fila em
  `.planning/product/IMPROVEMENT-BATCH-4.tasks.json` e plano gerado em `.planning/product/IMPROVEMENT-BATCH-4.plan.json`.

## Regras de cada rodada

1. Ler esta página + o item AB/V da rodada; não reinvestigar o que já está descrito.
2. Backend primeiro (schema → migration idempotente → service → spec), depois web completo, web fácil,
   app fácil, app completo — **a mesma regra de negócio em um lugar só** (backend/shared-types).
3. Dinheiro: `Prisma.Decimal` / string decimal / `formatMoney`, nunca `Number`. Toda tabela nova com `company_id`.
4. Fechar a rodada: testes automáticos (§7 do catálogo) + blocos do catálogo indicados → log da rodada →
   commit por entrega → push → deploy (§8) → conferir em produção.
5. **Lockfile:** o Docker usa `--frozen-lockfile`. Ao mexer em dependências: `pnpm install --lockfile-only` e validar com `pnpm install --frozen-lockfile --lockfile-only`.
6. Opções novas que mudam o PDF entram em `doc_options`/`quote_default_doc_options` (JSONB) quando couber —
   evita migration.
7. No Batch 4, toda tarefa de UI exige evidência em `1440×900`, `390×844` e `360×800`, nos modos fácil e
   completo; o app entra quando o fluxo existir e somente após corrigir/validar a URL de API. Defeito observado no
   web mobile só é atribuído ao desktop/app depois de reprodução; caso contrário registrar `não reproduzido`.

---

## Improvement Batch 4 — achados do primeiro Key User (planejado em 2026-10-11)

| Ordem | Tarefas | Entrega verificável |
| --- | --- | --- |
| 1 | B4-01 → B4-43 → B4-02…B4-05 | Concorrência primeiro; protocolo de QA antecipado; estado, A receber e dinheiro com Decimal e testes integrados. |
| 2 | B4-06…B4-14 + B4-46…B4-48 → B4-14A → DEPLOY-B4-1 | Quebras mobile e UX; auditoria/correção transversal de formulários e PDF rascunho; passada curta em 3 viewports × 2 modos + app aplicável registrada em docs/qa antes do deploy. |
| 3 | B4-15…B4-18 | App sem localhost em build distribuída, login real validado, Home/convite auditados e tamanho medido. |
| 4 | B4-19…B4-23 | Responsável neutro, completude de orçamento e assinatura/opções de recibo. |
| 5 | B4-24…B4-27 | Modelo e PDFs de orçamento/recibo evoluídos no design Orcivo, com configuração e preview. |
| 6 | B4-28…B4-32 | ADRs de Uso/planos, posicionamento, multiempresa, modos e realização parcial; sem implementar. |
| 7 | B4-44 → DEPLOY-B4-2 | B4-44 depende de todas as tarefas A/B B4-02…B4-32 e B4-46…B4-48; segundo deploy somente após evidência completa. |
| 8 | B4-33 | Decisões explícitas do dono registradas; gate obrigatório. |
| 9 | B4-34…B4-42 → B4-45 → DEPLOY-B4-3 | Implementações estratégicas aprovadas, seguida da mesma passada exploratória e terceiro deploy. |

Primeira tarefa: `B4-01-approval-concurrency`; a segunda é obrigatoriamente `B4-43-qa-gap-regression-protocol`.
Depois, o Codex executa manualmente nesta conversa, sem `pilot.ps1`/dispatcher/autopilot, respeitando a ordem do plano.
Dependências, checkpoints, escopo, critérios e autonomia estão no JSON e no documento UAT. As decisões estratégicas
são Nível C no gate `B4-33`; levantamentos/ADRs anteriores são Nível B e não antecipam mudanças de produto.

Andamento em 2026-10-14: blocos 1–2 encerrados com zero defeito aberto no checklist
`docs/qa/IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md`. `DEPLOY-B4-1` `20261014-005020` concluiu com backup,
tag `prev-*`, `HEALTH` 3×, `DEPLOY_DONE` e 34 migrations confirmadas por consulta somente leitura. B4-15
centralizou a URL da API, bloqueou loopback em builds distribuídas e validou o Expo equivalente a produção sem
publicar o app. B4-16 confirmou login, refresh, logout e os dois modos no ambiente local, com erro de conexão
sanitizado e limitação de dispositivo/emulador registrada. B4-17 confirmou o fluxo de convite e as duas Homes no
HEAD; a build observada pelo Key User é provavelmente anterior, mas o APK não estava disponível para hash. B4-18
instituiu export Hermes reproduzível e orçamento de regressão; APK/AAB/IPA seguem sem medição exata na ausência de
artefato e SDK. B4-19 definiu na ADR-019 a atribuição opcional com “Responsável pelo serviço”, reutilizando o vínculo
existente e sem antecipar terminologia configurável. B4-20 concluiu a atribuição opcional nas seis superfícies,
incluindo os proxies autenticados ausentes na web e a matriz visual completa. B4-21 validou a revisão de completude
não bloqueante nas seis superfícies e corrigiu o aviso residual após o
preenchimento inline. B4-22 concluiu assinatura ausente, salva e avulsa nas seis superfícies, corrigindo a ação ausente
no web completo. Próxima: B4-25.

B4-25 concluiu a estrutura do PDF de orçamento com fixtures A4 de uma e múltiplas páginas, matriz web de ações e
fallback nativo verificado. Próxima: B4-26.

B4-26 concluiu o recibo configurável com fixtures A4 completa, mínima e longa e matriz nas seis superfícies. Próxima:
B4-27.

B4-27 concluiu defaults, overrides e previews de documentos nas seis superfícies, consolidando a matriz visual das
configurações, revisão e documentos. A B4-44 concluiu o fluxo fresco nas três superfícies e corrigiu o modal de
recibo mobile. O gate B4-33 formalizou as decisões já aprovadas nas ADRs 020–024; próxima: B4-34 e a onda
B4-34…B4-42. A B4-34 publicou o snapshot tenant-scoped de Uso em shared-types/backend, com período/reset,
contadores, estados e features autoritativas. A B4-35 separou Uso de cobrança e publicou progresso, recursos, estados
e CTAs nas seis superfícies, com matriz visual completa. A B4-36 levou indicadores autoritativos para Clientes,
Orçamentos e OS e validou o alerta de 80% sem regra duplicada. A B4-37 aplicou a linguagem neutra aprovada,
preferências progressivas de nicho/objetivos/tratamento/termos e snapshots documentais, com matriz de 24 cenários
nas seis superfícies e PDFs A4 inspecionados. A B4-38 vinculou cada sessão a uma empresa ativa, eliminou seleção
ambígua de tenant, preservou refresh legado de associação única e comprovou A/B, troca, sessões paralelas, RBAC e
convites sem recadastro em integração local; próxima: B4-39.

Decisão de 2026-10-15: o dono aprovou o pacote recomendado das ADRs 020–024. A aprovação foi registrada sem antecipar
a implementação estratégica: o gate B4-33 só fecha depois da passada B4-44, conforme o DAG. Uso mantém limites
vigentes/uso justo e alerta em 80%; linguagem passa a neutra; multiempresa usa `AuthSession`; web mobile mantém fácil
como entrada e completo acessível; OS parcial usa snapshot por item e conciliação explícita. Billing, LGPD e dados de
produção permanecem fora do escopo.

---

## R0 — Correções rápidas e limpeza (1 sessão)

| Item | O que fazer | Onde |
| --- | --- | --- |
| V10 | Botão "Copiar link" ao lado do link de aprovação (web completo) | `orcamentos/[id]/OrcamentoDetail.tsx` |
| V15 | Preço do site sem `Number` (usar string decimal + `formatMoney`) | `apps/site/app/planos/plan-catalog.ts:27` |
| 999.1 | Nome do cliente não atualiza no detalhe após editar (revalidar rota) | `clientes/[id]` |
| 999.2 | Padding do seletor de cliente na Nova OS | `ordens-de-servico/novo` |
| 999.3 | Justificativa de reabertura no histórico da OS | `work-order.service.ts` (audit) |
| 999.4 | Mudar status da OS direto na lista/painel | `OSContent.tsx` |
| 999.8 | Feed de atividades com caminho da ação (link para o registro) | `AuditHistoryFeed.tsx`, dashboard |
| V16 | Fechar no ROADMAP: 999.6, 999.7, 999.9, 999.10, 999.12 (já entregues) | `ROADMAP.md` |
| Ambiente | Specs de isolamento: rodar com Redis limpo/backend parado; documentar no runbook | `docs/runbooks/local-dev.md` |

Aceite: N1–N4 nas rotas tocadas; S1, S4; O9 (copiar).

## R1 — Paridade do app completo (2 sessões)

| Item | O que fazer |
| --- | --- |
| V4 | App completo: criar OS avulsa; detalhe com total (do orçamento), data marcada, orçamento vinculado, observações, cliente com WhatsApp |
| V5 | Configurações do app completo: campo Endereço da empresa (já existe no backend) |
| V6 | Novo/editar orçamento no app completo: desconto, validade, condições e `DocOptionsFields` (reusar `easy/DocOptions.tsx`) |

Aceite: O1–O9, S1–S5 em **AC**.

## R2 — Documento profissional (3 sessões) · AB-1, AB-2, AB-3, AB-4, AB-20, AB-21, AB-24

| Entrega | Detalhe |
| --- | --- |
| Tipos de documento | `QUOTE_DOC_TITLES` + Contrato de serviço, Ordem de serviço, Laudo técnico, Lista de materiais (só produtos), Fatura. Gerar também a partir da OS. |
| Aparência | Cor do documento (paleta curta, padrão roxo), dados da empresa no cabeçalho ou rodapé, dados do cliente liga/desliga (nome, endereço, telefone, e-mail), data do documento (atual / do orçamento / perguntar). Tudo em `quote_default_doc_options`. |
| Textos padrão | Separar Condições em: informações adicionais, condições de garantia, cláusulas de contrato (só no tipo Contrato). |
| Assinaturas | Assinatura padrão do técnico **no perfil** (desenha uma vez) + registro profissional (CREA/CFT/CRT) no rodapé do PDF; assinatura/aceite do cliente impresso no PDF depois de aprovado. |
| Empresa | Redes sociais (Instagram, Facebook, YouTube, site, WhatsApp comercial) e frase de rodapé no PDF. Migration: colunas em `companies`. |
| Recibo | Ao emitir: mostrar serviços / preço de cada / subtotais / detalhes; texto de declaração com "referente a" (entrada, parcela 1/3). |

Aceite: O5, O9, O13, F1, F4 em todas as superfícies; PDF conferido visualmente em cada tipo.

## R3 — Orçamento completo (2 sessões) · AB-22, AB-17

| Entrega | Detalhe |
| --- | --- |
| Desconto separado | Serviços e produtos, % ou R$, atalhos 5%/10%; PDF "Desconto em serviços (10%)". Migration: `discount_*` por tipo. |
| Condição de pagamento | À vista / entrada (% ou R$, atalhos 30%/50%) + restante na conclusão ou em N parcelas; texto extra. Frase pronta no PDF e no link. Ao aprovar: **gerar as cobranças a receber** (entrada + restante/parcelas). |
| Formas aceitas | Marcar Pix, dinheiro, cartão, transferência, boleto; sai no PDF. |
| Garantia | Prazo (dias/meses/anos, atalhos 30/90) + condições (texto padrão). |
| Laudo | Texto livre (situação / observado / executado) — alimenta o tipo Laudo técnico (R2). |
| Duplicar | Orçamento → novo rascunho com os mesmos itens; item do catálogo → cópia. |

Aceite: O1–O13 + F2 (cobranças geradas) em todas as superfícies.

## R4 — Custos e resultado (3 sessões) · AB-10, AB-23, parte de AB-18

| Entrega | Detalhe |
| --- | --- |
| Modelo `Expense` | `company_id`, valor (Decimal), categoria, vencimento, pago em, forma, descrição, observações, `customer_id?`, `quote_id?`/`work_order_id?`, status (pago/previsto/vencido). Spec de isolamento. |
| Categorias | ~20 prontas (combustível, alimentação, material/peças, ferramentas, aluguel, impostos, fornecedor, pró-labore, manutenção do veículo, marketing, funcionário, outros) + criar próprias. |
| Financeiro | Resumo do período: receitas (recebido, a receber, vencido), custos (pago, previsto, vencido), **resultado**. |
| Por serviço | Aba Financeiro no orçamento/OS: total, recebido, não lançado, custos e **lucro do serviço**. Página do cliente: receitas e custos. |
| Configurações | Conta bancária (banco, agência, conta, titular) impressa no documento quando ligada. |

Aceite: F1–F5 + novos testes de custo (criar, pagar, vencer, excluir) em WC e WF; AF/AC com lançar custo rápido.

## R5 — OS sob medida para o segmento (3 sessões) · AB-5, AB-6, AB-7, AB-8, AB-9

| Entrega | Detalhe |
| --- | --- |
| Campos do segmento | Empresa liga: marca, modelo, equipamento, nº de série, defeito relatado, BTUs, prazos (validade/execução em data ou dias úteis), hora início/fim. JSONB `segment_fields` + lista ativa em `companies`. Presets no onboarding por segmento (ar-condicionado, elétrica, CFTV, portões). |
| Campos opcionais | Esconder do formulário o que a empresa não usa; adicionar taxa de deslocamento. |
| Status extras | `AWAITING_PAYMENT`, `WARRANTY` (liga/desliga). |
| Lista | Visão por status (colunas) no web completo. |
| Detalhe em abas | OS: Serviço / Agenda / Financeiro. |

Aceite: S1–S5 com campos do segmento no PDF (R2).

## R6 — Agenda e manutenção recorrente (2 sessões) · AB-14, AB-11

| Entrega | Detalhe |
| --- | --- |
| Período | Marcar por período (manhã/tarde/noite/horário comercial, horas configuráveis) ou horário exato. |
| Lembrete | 5 min / 15 min / 30 min / 1 h / 1 dia antes (push no app, sino no web). |
| Status | Não confirmado / agendado / concluído; aviso "compromissos pendentes". |
| Calendário | Visão mensal com marcação nos dias + lista do dia. |
| Recorrência | Repetir (semanal, mensal, a cada N meses) — base do **contrato de manutenção** (ex.: limpeza de ar a cada 6 meses gera OS + cobrança). Recurso do Orcivo Mais/Equipe. |

## R7 — Cliente e catálogo (2 sessões) · AB-15, AB-16, 999.13

| Entrega | Detalhe |
| --- | --- |
| Cliente | Origem (indicação, Instagram, Google, Facebook, outro), aniversário, 2º telefone, observações internas; app: salvar nos contatos do celular (sempre/nunca/perguntar — Expo Contacts). |
| Estoque | Baixa automática quando o orçamento é aprovado **ou** a OS é concluída (escolha da empresa); devolve ao cancelar; movimento auditado. |
| Preço | Custo + margem % ou markup % calculando o preço de venda (999.13). Código interno e marca. |
| Unidades | Lista editável; renomear catálogo. |

## R8 — Relatórios, Home e dados (2 sessões) · AB-18, AB-12, AB-19, AB-13

| Entrega | Detalhe |
| --- | --- |
| Relatórios | Recebido × a receber, por forma de pagamento, top 5 clientes, novos clientes por origem, receitas × custos (Orcivo Mais/Equipe). |
| Home | Atalhos escolhidos pela empresa (web completo). |
| Exportar dados | CSV/ZIP de clientes, orçamentos, OS, recebimentos, custos (portabilidade LGPD). |
| Indicação | Avaliar com billing (registrar decisão). |

---

## O que **não** copiar do Agenda Boa
- "Salvar alterações?" sem opção **Descartar**.
- Perder sessão ao recarregar/abrir link direto.
- Selo do plano superior no meio dos formulários.

## Ordem e estimativa
R0 → R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 (≈20 sessões). R2 e R3 primeiro porque o documento é o que o
cliente final vê e é onde o Orcivo já está à frente (link de aprovação).
