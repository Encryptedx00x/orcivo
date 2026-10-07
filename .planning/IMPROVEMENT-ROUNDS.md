# Rodadas de melhoria e correção — a partir de 2026-10-08

Fonte dos itens: benchmark `.planning/research/AGENDA-BOA-BENCHMARK.md` (AB-1…AB-24), varredura
`docs/qa/2026-10-06-bateria-de-testes.md` (V1…V16) e backlog 999.x do `ROADMAP.md`.
Roteiro de testes de cada rodada: `docs/qa/CATALOGO-DE-TESTES.md` (IDs O/S/F/N/P/W).

## Regras de cada rodada

1. Ler esta página + o item AB/V da rodada; não reinvestigar o que já está descrito.
2. Backend primeiro (schema → migration idempotente → service → spec), depois web completo, web fácil,
   app fácil, app completo — **a mesma regra de negócio em um lugar só** (backend/shared-types).
3. Dinheiro: `Prisma.Decimal` / string decimal / `formatMoney`, nunca `Number`. Toda tabela nova com `company_id`.
4. Fechar a rodada: testes automáticos (§7 do catálogo) + blocos do catálogo indicados → log da rodada →
   commit por entrega → push → deploy (§8) → conferir em produção.
5. **Lockfile:** a cópia de trabalho do web tem uma migração para Next 15/React 19 **não commitada**. Ao mexer em dependências, gerar o lockfile com o `apps/web/package.json` do commit (`git show HEAD:apps/web/package.json`) e `pnpm install --lockfile-only`; o Docker usa `--frozen-lockfile`. Decidir na R0 se essa migração entra ou é descartada.
6. Opções novas que mudam o PDF entram em `doc_options`/`quote_default_doc_options` (JSONB) quando couber —
   evita migration.

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
