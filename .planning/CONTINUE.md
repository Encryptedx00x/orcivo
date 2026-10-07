# CONTINUE — ponto exato de retomada (Orcivo)

> **Arquivo vivo.** Quem estiver trabalhando (Claude, Codex, outra IA ou humano) atualiza a seção
> "Estado agora" e a fila **a cada entrega** (commit/deploy), não só no fim da sessão. Se o limite
> acabar no meio de algo, a próxima IA continua daqui sem precisar da conversa anterior.
> Sem segredos, tokens, prompts ou transcrições neste arquivo.

## 1. Estado agora (atualizado 2026-10-07 19:25 BRT)

| Item | Valor |
| --- | --- |
| `main` / `origin/main` | último commit de docs após `2d7d2c0` (ver `git log`) |
| Produção (app/site/api.orcivo.com.br) | `ffe0291` = código de `2d7d2c0` (R5a) — deploy 2026-10-07 22:15 UTC, saudável, migration `20261009100000_work_order_segment_fields` aplicada |
| Última rodada concluída | R5a em produção. **Próxima tarefa: R5b → "Status extras da OS" (§3)** |
| Trabalho de segurança (Codex) | concluído; pendências do dono em §5 |

Antes de qualquer coisa: `git status --short`, `git log --oneline -5`, `git fetch && git status -sb`.
Outra IA pode ter commitado no meio (já aconteceu: o Codex commitou a R5a junto com o lote dele).
**Nunca** `reset --hard`, `stash`, `clean`, force-push ou reescrita de histórico.

## 2. Leia antes (nessa ordem, ~10 min)

1. `CLAUDE.md` (regras absolutas: design, nomes de plano, dinheiro em Decimal, `company_id`, commits sem atribuição de IA, pt-BR).
2. `.planning/IMPROVEMENT-ROUNDS.md` — rodadas R0…R9, tabela "Andamento", decisões.
3. `docs/qa/CATALOGO-DE-TESTES.md` — roteiro fixo de testes (O, S, F, N, P, W, §7 automático, §8 deploy).
4. `.planning/research/AGENDA-BOA-BENCHMARK.md` — só o item AB-x da tarefa em curso.
5. `docs/runbooks/local-dev.md` — subir local, specs de integração.

## 3. Fila de tarefas (em ordem — pegue a primeira não marcada)

Formato: `[ ]` a fazer · `[~]` em andamento (diga onde parou) · `[x]` feito (commit).

### R5b — OS sob medida (resto) · AB-5…AB-9
- [ ] **Status extras da OS:** `AWAITING_PAYMENT` ("Aguardando pagamento") e `WARRANTY` ("Em garantia"),
      cada um liga/desliga em Configurações → Ordem de serviço (`companies.work_order_statuses`?
      decidir: lista de extras ativos). Backend: enum Prisma + `STATUS_ACTION_SPECS` em
      `apps/backend/src/work-order/work-order.service.ts` (transições + auditoria; spec em
      `work-order.state-machine.spec.ts`). Labels em web (`OSContent.tsx`, `WorkOrderDetail.tsx`) e app
      (`WorkOrderListScreen`, `WorkOrderDetailScreen`).
- [ ] **Visão por status (colunas)** em `/ordens-de-servico` no web completo (alternar lista ↔ colunas; sem drag-and-drop na 1ª versão — botões de ação já existem).
- [ ] **OS em abas** no web: Serviço (dados + equipamento + fotos) / Agenda / Financeiro (card atual de recebimentos + `OsCosts`).
- [ ] **Taxa de deslocamento:** item opcional; decidir se é item do orçamento (preferível: catálogo "Deslocamento") — registrar decisão.
- [ ] Campos da OS (`work_orders.details`) também no **modo fácil** (web `app/facil`, app `src/easy`) se houver tela de OS lá; e impressos num futuro PDF de OS.

### R6 — Agenda e manutenção recorrente · AB-14, AB-11
- [ ] Período (manhã/tarde/noite/comercial) ou horário exato · lembrete (5 min…1 dia) · status (não confirmado/agendado/concluído) · calendário mensal · recorrência (semanal/mensal/N meses → gera OS + cobrança; Orcivo Mais/Equipe). Detalhes em IMPROVEMENT-ROUNDS §R6.

### R7 — Cliente e catálogo · AB-15, AB-16, 999.13
- [ ] Cliente: origem, aniversário, 2º telefone, observações internas · estoque com baixa automática (aprovação ou conclusão; devolve ao cancelar; auditado) · custo + margem/markup → preço · unidades editáveis.

### R8 — Relatórios, Home e dados · AB-18, AB-12, AB-19, AB-13
- [ ] Relatórios (recebido × a receber, por forma, top 5 clientes, origem, receitas × custos) · atalhos da Home · exportar CSV/ZIP (portabilidade LGPD) · indicação (avaliar com billing).

### R9 — **App mobile com o mesmo design do web** (pedido do dono em 2026-10-07)
O app (Expo) diverge visualmente do web desktop/mobile, nos dois modos. Objetivo: o técnico reconhecer
o mesmo produto em qualquer superfície.
- [ ] **Levantamento (1ª sessão, sem código):** para cada tela do app (modo completo: `src/screens/*`;
      modo fácil: `src/easy/screens/*`), tirar print no Expo web a 375×812 e comparar com a mesma tela
      do web em 375px (`/facil` e páginas do modo completo). Registrar as diferenças numa tabela em
      `docs/qa/R9-APP-DESIGN-DIFF.md` (tela · web · app · ajuste). Fonte da verdade:
      `docs/design-handoff/orcivo-design-system/` (tokens em `colors_and_type.css`, UI kit mobile em
      `ui_kits/mobile/`) e `docs/FRONTEND_DESIGN_MASTER.md` §4.
- [ ] **Tokens únicos no app:** um `src/theme.ts` com cores/raios/espaçamentos/tipografia dos tokens
      (`--purple-600 #6D28D9`, `--ink #0A0A0F`, fundo branco). Hoje cada tela tem `StyleSheet` próprio
      (raios 8/12, cinzas variados) e o modo fácil usa `src/easy/ui.tsx` (`C`, `s`). Unificar os dois em cima do tema.
- [ ] **Componentes base** (botão primário/secundário, card, input, chip, cabeçalho, linha de lista,
      badge de status) iguais aos do web; aplicar tela a tela, modo fácil primeiro (é o que o técnico usa).
- [ ] Ícones só Lucide (`lucide-react-native`), sem emoji; textos pt-BR; nomes de plano oficiais.
- [ ] Aceite: prints lado a lado web × app de cada tela no `R9-APP-DESIGN-DIFF.md` sem divergência
      relevante; testes do app (§7) verdes. **Mudar o design system em si é Nível C** — aqui é só aplicar o aprovado.

### Sempre
- [ ] App só chega aos aparelhos com novo build EAS; publicar nas lojas é **Nível C** (perguntar ao dono).

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
| 2026-10-07 | `2d7d2c0` | R5a: campos da OS por segmento (Configurações → Ordem de serviço; Nova OS e "Dados do equipamento" no web e app completo) | ✅ 22:15 UTC |
| 2026-10-07 | `be77dda`…`d2f0cf9` | Codex: segurança (capacidades públicas expiram, throttling), deploy falha se não saudável, dependências | ✅ |
| 2026-10-07 | `beab4c9` | R3: formas de pagamento aceitas no PDF/link; laudo; campo morto removido | ✅ |
| 2026-10-07 | `a15c654` | R4: custos e lucro por OS (web); resultado do mês no app completo | ✅ |
