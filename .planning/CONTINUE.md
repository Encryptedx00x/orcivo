# CONTINUE — ponto exato de retomada (Orcivo)

> **Arquivo vivo.** Quem estiver trabalhando (Claude, Codex, outra IA ou humano) atualiza a seção
> "Estado agora" e a fila **a cada entrega** (commit/deploy), não só no fim da sessão. Se o limite
> acabar no meio de algo, a próxima IA continua daqui sem precisar da conversa anterior.
> Sem segredos, tokens, prompts ou transcrições neste arquivo.

## 1. Estado agora (atualizado 2026-10-13)

| Item | Valor |
| --- | --- |
| `main` / `origin/main` | `685970f` — B4-13 concluída e publicada; produção permanece em `6904bb1` |
| Produção (app/site/api.orcivo.com.br) | `6904bb1` — deploy `20261011-123450`, saudável (`HEALTH` 3× + `DEPLOY_DONE`); migrations aplicadas até `20261010160000_company_home_shortcuts` |
| Banco de produção | Reinicializado em 2026-10-11 14:00 BRT para o primeiro Key User: 33 migrations, 4 `PlanLimit` e 0 linhas de negócio; backup restaurável em `/srv/orcivo/backups/manual-pre-key-user-reset-20261011T165917Z.sql.gz` |
| Última rodada concluída | R5b…R9 e melhoria adicional de seletores concluídas nas quatro superfícies aplicáveis; typecheck, lint, build, testes integrados, varredura de segredos e revisão visual aprovados; produção validada. |
| Próxima fila | **Improvement Batch 4 em andamento, execução manual pelo Codex nesta conversa**: 49 tarefas em `.planning/product/IMPROVEMENT-BATCH-4.tasks.json`, sem autopilot/dispatcher, três checkpoints de deploy e fonte humana em `docs/qa/KEY-USER-UAT-FINDINGS-2026-10-11.md`. |
| Trabalho de segurança (Codex) | concluído; pendências do dono em §5 |

Antes de qualquer coisa: `git status --short`, `git log --oneline -5`, `git fetch && git status -sb`.
Outra IA pode ter commitado no meio (já aconteceu: o Codex commitou a R5a junto com o lote dele).
**Nunca** `reset --hard`, `stash`, `clean`, force-push ou reescrita de histórico.

## 2. Leia antes (nessa ordem, ~10 min)

1. `CLAUDE.md` (regras absolutas: design, nomes de plano, dinheiro em Decimal, `company_id`, commits sem atribuição de IA, pt-BR).
2. `docs/qa/KEY-USER-UAT-FINDINGS-2026-10-11.md` — classificação, deduplicação, critérios e catálogo completo do Batch 4.
3. `.planning/product/IMPROVEMENT-BATCH-4.tasks.json` + `.plan.json` — fila e dependências executáveis.
4. `.planning/IMPROVEMENT-ROUNDS.md` — histórico R0…R9 preservado e nova rodada B4.
5. `docs/qa/CATALOGO-DE-TESTES.md` — roteiro fixo atual; a atualização definitiva dos gaps 1–18 é a tarefa `B4-43`.
6. `docs/runbooks/local-dev.md` — subir local, specs de integração.

## 3. Fila de tarefas (em ordem — pegue a primeira não marcada)

Formato: `[ ]` a fazer · `[~]` em andamento (diga onde parou) · `[x]` feito (commit).

### Improvement Batch 4 — UAT do primeiro Key User (49 tarefas; em andamento)

Fonte de verdade: `docs/qa/KEY-USER-UAT-FINDINGS-2026-10-11.md` e
`.planning/product/IMPROVEMENT-BATCH-4.tasks.json`. O plano foi gerado por
`scripts/orchestration/v2/batch-reconcile.ps1`; não alterar dependências à mão no `.plan.json`.

- [x] **B4-01 — primeira correção:** aprovação concorrente idempotente (`a94d073`).
- [x] **B4-43 — protocolo antecipado:** protocolo obrigatório instituído antes das demais tarefas de UI (`5e9a5bb`).
- [x] **B4-02 — estado inicial da OS:** aprovação cria OS `PENDING`, sem início implícito (`ad02f42`).
- [x] **B4-03 — estado/fotos entre modos:** três etapas persistidas, seletor explícito nos modos fáceis e `Sem data`
      no lugar do travessão solto (`2c7afb6`).
- [x] **B4-04 — A receber:** fluxo não reproduziu falha; integração aprovação → parcelas → baixa → recibo e matriz web
      fácil/completo registradas (`a194c90`).
- [x] **B4-05 — recebimento excedente:** comparação Decimal, confirmação consciente, motivo e auditoria
      (`9264655`).
- [x] **B4-06 — layout mobile da OS:** ações ganharam linha própria e o badge pode quebrar sem cobrir conteúdo
      (`a3aca11`).
- [x] **B4-07 — data no modal:** grade contida e cartão rolável com teclado/viewport reduzida (`8680b68`).
- [x] **B4-08 — PDF visualizar/baixar:** preview inline separado de download real com attachment; matriz web
      fácil/completo e fallback nativo cobertos (`8f1f9f3`).
- [x] **B4-09 — assinatura vazia:** `Adicionar assinatura` sem assinatura salva, `Trocar assinatura` quando existe e
      carregamento correto no recibo (`778c7a0`).
- [x] **B4-10 — toasts:** duração comum reduzida a 3 s, ação `OK`, acessibilidade e 6 s preservados para
      `Desfazer` (`82583d1`).
- [x] **B4-11 — item não adicionado:** classificação compartilhada vazio/incompleto/pronto, escolha consciente no
      modo fácil e equivalência confirmada no editor direto do modo completo (`d703f78`).
- [x] **B4-12 — ADR de navegação pós-geração:** detalhe somente leitura como destino canônico; editor removido do
      histórico e edição/novo orçamento somente por ações explícitas (`04d6adc`, ADR-018).
- [x] **B4-13 — navegação pós-geração:** criação substitui o editor pelo detalhe, Voltar abre a lista, CTAs explícitos
      e guardas contra duplo toque nas superfícies equivalentes (`685970f`).
- [x] **B4-14 — visual/UX:** crop 2:1, zoom, reposicionamento, cancelamento não destrutivo e upload seguro entregues
      em `4427f5a`; matriz web horizontal/quadrada/retrato concluída em `1440×900`, `390×844` e `360×800`, nos modos
      fácil/completo. Saída local confirmada como PNG `1024×512`; app registrado como não reproduzido/bloqueado até
      B4-15/B4-16, sem inferir defeito nativo.
- [x] **B4-46 — inventário responsivo:** matriz de login/onboarding, cliente, orçamento, OS, recebimento e assinatura
      registrada em `docs/qa/IMPROVEMENT-BATCH-4-RESPONSIVE-FORMS-AUDIT.md`; RF-01…RF-03 seguem para B4-47.
- [x] **B4-47 — responsividade transversal:** RF-01 e RF-02 corrigidos nos três viewports; RF-03 reclassificado como
      medição transitória e não reproduzido após estabilização em 320 px. Typecheck/lint web/mobile e 8 testes verdes.
- [x] **B4-48 — PDF em rascunho:** contrato compartilhado, confirmação explícita no web completo/fácil e download
      real DRAFT/SENT validados nos três viewports; app não reproduzido até B4-15/B4-16.
- [ ] **B4-14A — passada curta:** 3 viewports × 2 modos + app quando aplicável, registrada em
      `docs/qa/IMPROVEMENT-BATCH-4-BLOCK-1-2-EXPLORATORY.md`; bloqueia `DEPLOY-B4-1`.
- [ ] **B4-15…B4-18 — app:** URL por ambiente/guard de localhost, autenticação real, auditoria Home/convite/build e tamanho.
- [ ] **B4-19…B4-23 — fluxos:** responsável pelo serviço, completude do orçamento e assinatura/opções de recibo.
- [ ] **B4-24…B4-27 — documentos:** modelo, PDF de orçamento, PDF de recibo e configurações/preview.
- [ ] **B4-28…B4-32 — ADRs:** Uso/planos, posicionamento, multiempresa, modo completo no web mobile e OS parcial.
- [ ] **B4-44 — passada pré-deploy:** depende explicitamente de todas as tarefas A/B B4-02…B4-32 e B4-46…B4-48.
- [ ] **B4-33 — gate do dono:** registrar decisões dos cinco ADRs; nenhuma implementação estratégica passa antes dele.
- [ ] **B4-34…B4-42 — implementação condicionada:** Uso, posicionamento/onboarding, multiempresa, modos e OS parcial.
- [ ] **B4-45 — passada pós-estratégia:** valida B4-34…B4-42 antes do terceiro deploy.

**Próxima ação concreta:** executar `B4-14A-exploratory-block-1-2`. Repetir a passada curta dos blocos 1–2 em
`1440×900`, `390×844` e `360×800`, nos modos completo/fácil, incluindo concorrência, valores, download real,
navegação e os achados B4-46…B4-48. Registrar o checklist em `docs/qa` antes do gate de deploy.

Regras específicas do lote: não fazer deploy; não alterar dados de produção; app com login só depois de `B4-15/B4-16`;
UI só fecha com `1440×900`, `390×844`, `360×800`, fácil/completo e app quando o fluxo existir; reproduzir antes de
atribuir o defeito a desktop/app e registrar `não reproduzido` com evidência. Preservar os não rastreados existentes.

Pontos de deploy futuros, sempre pela receita da §6 e somente após evidência exploratória:

1. `DEPLOY-B4-1` depois de B4-14A: blocos 1–2 e achados B4-46…B4-48, após checklist curto registrado em `docs/qa`.
2. `DEPLOY-B4-2` depois de B4-44: blocos 3–5 e regressão dos blocos 1–2.
3. `DEPLOY-B4-3` depois de B4-45: onda estratégica B4-34…B4-42 aprovada pelo dono.

A execução será manual pelo Codex, tarefa por tarefa e commit por tarefa. Não usar `pilot.ps1`, dispatcher ou autopilot.
Nenhum desses deploys foi executado.

### R5b — OS sob medida (resto) · AB-5…AB-9
- [x] **Status extras da OS:** `AWAITING_PAYMENT` ("Aguardando pagamento") e `WARRANTY` ("Em garantia"),
      cada um liga/desliga em Configurações → Ordem de serviço (`companies.work_order_statuses`?
      decidir: lista de extras ativos). Backend: enum Prisma + `STATUS_ACTION_SPECS` em
      `apps/backend/src/work-order/work-order.service.ts` (transições + auditoria; spec em
      `work-order.state-machine.spec.ts`). Labels em web (`OSContent.tsx`, `WorkOrderDetail.tsx`) e app
      (`WorkOrderListScreen`, `WorkOrderDetailScreen`).
- [x] **Visão por status (colunas)** em `/ordens-de-servico` no web completo (alternar lista ↔ colunas; sem drag-and-drop na 1ª versão — botões de ação já existem).
- [x] **OS em abas** no web: Serviço (dados + equipamento + fotos) / Agenda / Financeiro (card atual de recebimentos + `OsCosts`).
- [x] **Taxa de deslocamento:** item opcional; decidir se é item do orçamento (preferível: catálogo "Deslocamento") — registrar decisão.
- [x] Campos da OS (`work_orders.details`) também no **modo fácil** (web `app/facil`, app `src/easy`) se houver tela de OS lá; e impressos num futuro PDF de OS.

### R6 — Agenda e manutenção recorrente · AB-14, AB-11
- [x] Período (manhã/tarde/noite/comercial) ou horário exato · lembrete (5 min…1 dia) · status (não confirmado/agendado/concluído) · calendário mensal · recorrência (semanal/mensal/N meses → gera OS + cobrança; Orcivo Mais/Equipe). Detalhes em IMPROVEMENT-ROUNDS §R6.

### R7 — Cliente e catálogo · AB-15, AB-16, 999.13
- [x] Cliente: origem, aniversário, 2º telefone, observações internas · estoque com baixa automática (aprovação ou conclusão; devolve ao cancelar; auditado) · custo + margem/markup → preço · unidades editáveis. Entrega: `af85782`.

### R8 — Relatórios, Home e dados · AB-18, AB-12, AB-19, AB-13
- [x] Relatórios (recebido × a receber, por forma, top 5 clientes, origem, receitas × custos) · atalhos da Home · exportar CSV/ZIP (portabilidade LGPD). Indicação permaneceu fora de billing por não haver regra de atribuição aprovada. Entrega: `e414ba9`.

### R9 — **App mobile com o mesmo design do web** (pedido do dono em 2026-10-07)
O app (Expo) diverge visualmente do web desktop/mobile, nos dois modos. Objetivo: o técnico reconhecer
o mesmo produto em qualquer superfície.
- [x] **Levantamento (1ª sessão, sem código):** para cada tela do app (modo completo: `src/screens/*`;
      modo fácil: `src/easy/screens/*`), tirar print no Expo web a 375×812 e comparar com a mesma tela
      do web em 375px (`/facil` e páginas do modo completo). Registrar as diferenças numa tabela em
      `docs/qa/R9-APP-DESIGN-DIFF.md` (tela · web · app · ajuste). Fonte da verdade:
      `docs/design-handoff/orcivo-design-system/` (tokens em `colors_and_type.css`, UI kit mobile em
      `ui_kits/mobile/`) e `docs/FRONTEND_DESIGN_MASTER.md` §4.
- [x] **Tokens únicos no app:** um `src/theme.ts` com cores/raios/espaçamentos/tipografia dos tokens
      (`--purple-600 #6D28D9`, `--ink #0A0A0F`, fundo branco). Hoje cada tela tem `StyleSheet` próprio
      (raios 8/12, cinzas variados) e o modo fácil usa `src/easy/ui.tsx` (`C`, `s`). Unificar os dois em cima do tema.
- [x] **Componentes base** (botão primário/secundário, card, input, chip, cabeçalho, linha de lista,
      badge de status) iguais aos do web; aplicar tela a tela, modo fácil primeiro (é o que o técnico usa).
- [x] Ícones só Lucide (`lucide-react-native`), sem emoji; textos pt-BR; nomes de plano oficiais.
- [x] Aceite: prints lado a lado web × app de cada tela no `R9-APP-DESIGN-DIFF.md` sem divergência
      relevante; testes do app (§7) verdes. **Mudar o design system em si é Nível C** — aqui é só aplicar o aprovado.

### Sempre
- [ ] App só chega aos aparelhos com novo build EAS; publicar nas lojas é **Nível C** (perguntar ao dono).

## 3b. Autopilot — histórico; proibido para o Batch 4

Decisão do dono em 2026-10-11: **não usar `pilot.ps1`, dispatcher ou autopilot no Batch 4**. A execução é manual
pelo Codex nesta conversa. As informações abaixo ficam preservadas apenas como histórico operacional.

- Supervisor: `scripts/orchestration/v2/pilot.ps1` (status / start / stop / approve-gate), runbook em
  `docs/runbooks/agent-orchestration.md`, estado em `.orchestration/v2/` (checkpoints, ledger, runs).
  A configuração ainda aponta para o lote anterior concluído; **não iniciar o piloto** até apontar explicitamente para
  `.planning/product/IMPROVEMENT-BATCH-4.tasks.json`. O Batch 4 e o plano reconciliado já existem, mas execução não começou.
- Executor GLM: `scripts/orchestration/v2/glm.ps1` via OpenCode CLI (1.17.9), hoje **fixado** em
  `nvidia/z-ai/glm-5.3` (rota NVIDIA NIM). A rota direta `zai-coding-plan/glm-5.3` foi aposentada em 2026-09-17,
  mas a credencial **Z.AI Coding Plan** continua no OpenCode. Para a cadeia pedida pelo dono
  (**GLM pelo plano Z.AI → ao acabar a cota, o mesmo GLM 5.3 pelo NVIDIA NIM**) é preciso reativar
  `zai-coding-plan/glm-5.3` como 1ª rota e manter `nvidia/z-ai/glm-5.3` como reserva por cota
  (`PROVIDER_QUOTA`/`RATE_LIMIT`), sem trocar de modelo.
- Revisão (decisão do dono 2026-10-07): **DeepSeek fora**. Sem revisor de outro provedor, o dispatcher usa a
  autorrevisão (`Get-OrcivoReviewProviderWithSelfFallback`): GLM revisa em sessão nova. Além disso, gates
  determinísticos (typecheck, testes, lint, varredura de segredos) e **uma revisão leve do Codex por rodada**
  (stat + diff dos arquivos de regra de negócio/migration). Cuidado: `glm.ps1` lê `Get-DeepSeekRuntimeConfig`
  — tirar o DeepSeek só da lista de revisores; **não** desativar esse runtime, senão o GLM para junto.
  Credenciais no OpenCode: Z.AI Coding Plan, OpenCode Go, OpenRouter (auth) + DeepSeek, NVIDIA (env).
- Modelo: manter **GLM 5.3** nas duas rotas (mesmo comportamento no fallback). Alternativa de código no NIM se o
  GLM falhar muito: `nvidia/moonshotai/kimi-k3`. Nemotron (llama-3.1 e nemotron-3) é generalista/raciocínio, não é
  a melhor escolha para agente de código que edita muitos arquivos.

## 4. Como trabalhar cada tarefa (receita que já funcionou)

1. Backend primeiro: `prisma/schema.prisma` → migration idempotente em `prisma/migrations/<timestamp>_<nome>/migration.sql`
   (`ADD COLUMN IF NOT EXISTS`) → service → spec. Regra de negócio em backend/`packages/shared-types` (rodar `npm run build` no shared-types após mudar).
2. Local: parar o preview do backend antes de `prisma generate` (lock da DLL);
   `set -a; . apps/backend/.env; set +a; npx prisma migrate deploy --schema prisma/schema.prisma`;
   banco de teste: `set -a; . apps/backend/.env.test; set +a; npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma`.
3. Superfícies: web completo → web fácil (`app/facil`) → app fácil (`src/easy`) → app completo (`src/screens`).
4. Verificação: typecheck (`npx tsc --noEmit -p .` em apps/backend, apps/web, apps/mobile); specs do módulo
   (`npx jest src/<mod> --runInBand` — integração exige `--runInBand`); app: `node --test src/hooks/*.test.mjs src/services/*.test.mjs src/screens/*/*.test.mjs`
   (testes de tela compilam o fonte com whitelist de imports: **todo import novo numa tela/stack precisa de mock** nos `screen.test.mjs`).
   Visual: previews `orcivo-backend` (:3000), `orcivo-web` (:3001), `orcivo-mobile-web` (:8081, app no navegador; Metro em CI → reiniciar o preview para pegar mudanças). Login local: conta de teste em `apps/web/.env.local` (`UI_AUDIT_*`) — nunca repetir os valores em chat/commit.
5. Commit pequeno por entrega (commitlint: assunto minúsculo, cabeçalho ≤100), **sem** "Co-authored-by"/"Generated with". Push para `main`.
6. Deploy (§6), conferir produção, marcar `[x]` aqui + atualizar "Andamento" em IMPROVEMENT-ROUNDS.

Armadilhas já vistas: lockfile (`--frozen-lockfile` no Docker; gerar com `pnpm install --lockfile-only`);
React e react-dom do web fixos em `19.1.9`; texto com acento via curl no Windows corrompe (usar Python/UTF-8);
backend em watch reinicia quando arquivos mudam (ERR_CONNECTION_REFUSED momentâneo no local);
limite do Orcivo Livre (10 orçamentos/mês) bloqueia criar/duplicar na conta de teste local.

## 5. Pendências que são do dono (não fazer pela IA)

- Rotacionar credenciais antigas que apareceram em histórico (relatório do Codex: `AUDITORIA-SEGURANCA-FASE-2.md`).
- Resolver com o GitHub a retenção de objetos antigos antes de tornar qualquer repositório público.
- 14 avisos transitivos de dependências exigem versões principais/upstream — planejar à parte, sem overrides forçados.
- Publicação nas lojas, DNS, billing/fiscal, LGPD, mudança de stack/design system: Nível C.

## 5b. Depois da fila de desenvolvimento — segurança e infraestrutura (com o Codex, pedido do dono 2026-10-07)

Fazer **só depois** de R5b…R9, com o Codex (que fez a auditoria de segurança). Não executar pelo autopilot.

- [ ] **Rotação de senhas numa vez só:** o dono decidiu (ordem dele, riscos conhecidos) trocar **todas as senhas**
      (só senhas; o resto não vazou) por **uma única senha**. Entregar um comando/script para ele rodar na VPS que
      substitui todas ao mesmo tempo, com o valor de exemplo `Senha123` no lugar da senha real (ele troca antes de
      rodar). Mapear antes cada lugar onde a senha vive (`.env` de cada projeto, usuários de banco, MinIO, n8n,
      painéis) e reiniciar os serviços na ordem certa; validar health de cada site depois.
- [ ] **Credenciais fixas no código:** revisar todos os projetos da VPS (inclusive **ascn.codes**) atrás de senhas/
      tokens hard-coded ou semelhantes; corrigir e dizer ao dono exatamente o que foi achado e ajustado.
- [ ] **Limpar rastros:** após a rotação, completar a limpeza pendente da auditoria (objetos retidos no GitHub,
      rede de fork de `dio-lab-open-source`) e repetir a varredura em clones novos.
- [ ] **Documentar a VPS do zero (repositório privado):** como a VPS está montada (Docker, Caddy, stack n8n/umami/
      php, cada site, volumes, backups, firewall/SSH), como recriar tudo numa VPS nova passo a passo, o que configurar
      fora (domínios, DNS/Cloudflare, e-mail, Mercado Pago, GitHub). Em cada repositório de projeto: README com como
      configurar e subir sem erro.
- [ ] **Repositórios públicos:** terminar as revisões e tornar os projetos públicos (exceto o repositório privado
      da VPS) — só depois da rotação e da limpeza acima.
- [ ] **Perfil GitHub:** atualizar `Encryptedx00x/Encryptedx00x/README.md` e publicar a extensão Chrome para n8n
      (código está numa conversa do ChatGPT do dono chamada "Criar extensão Chrome n8n" — pedir o código a ele).

## 6. Deploy de produção (Nível A, autorizado pelo dono)

```bash
git archive --format=tar.gz -o /tmp/orcivo-src.tar.gz HEAD
tr -d '\r' < infra/vps/deploy.sh > /tmp/deploy.sh
scp -q /tmp/orcivo-src.tar.gz /tmp/deploy.sh ubuntu@54.38.241.158:/tmp/
ssh ubuntu@54.38.241.158 'bash /tmp/deploy.sh'
```
O script faz backup do banco e `.env`, tag `prev-<ts>`, build completo antes de trocar, migrate + seed,
health check (falha com `DEPLOY_FAILED` e mantém rollback) e limpeza de imagens antigas. Sucesso = `HEALTH: healthy healthy healthy` + `DEPLOY_DONE`.
**O nome do pacote precisa ser `orcivo-src.tar.gz`** (o script extrai esse arquivo; outro nome = deploy de pacote velho ou erro no `tar`).
Conferir migrations em produção: copiar um `.sql` para o container `orcivo-db` e rodar `psql -U $POSTGRES_USER -d $POSTGRES_DB -At -f`.
Depois: abrir https://app.orcivo.com.br e a tela mexida (conta do dono já logada no navegador do app; nunca digitar senha real).

## 7. Registro de entregas (mais recente em cima)

| Data | Commit | Entrega | Produção |
| --- | --- | --- | --- |
| 2026-10-11 | — | Banco `orcivo_prod` reinicializado para UAT do primeiro Key User; PostgreSQL migrado/semeado e Redis transitório limpo | ✅ 0 usuários/empresas/dados operacionais; backend saudável 3× |
| 2026-10-11 | `744fba8`…`6904bb1` | R5b…R9, auditoria/correção de seletores e listas, validação automática/visual e plano de confiabilidade do autopilot | ✅ deploy `20261011-123450`; `HEALTH` saudável 3× + `DEPLOY_DONE` |
| 2026-10-10 | `af85782`…`1d3edeb` | R7, R8 e R9: clientes/estoque, relatórios/portabilidade e tema/componentes do app | ⏳ validação final local bloqueada por Redis/PostgreSQL de teste; não implantado |
| 2026-10-07 | `2d7d2c0` | R5a: campos da OS por segmento (Configurações → Ordem de serviço; Nova OS e "Dados do equipamento" no web e app completo) | ✅ 22:15 UTC |
| 2026-10-07 | `be77dda`…`d2f0cf9` | Codex: segurança (capacidades públicas expiram, throttling), deploy falha se não saudável, dependências | ✅ |
| 2026-10-07 | `beab4c9` | R3: formas de pagamento aceitas no PDF/link; laudo; campo morto removido | ✅ |
| 2026-10-07 | `a15c654` | R4: custos e lucro por OS (web); resultado do mês no app completo | ✅ |
