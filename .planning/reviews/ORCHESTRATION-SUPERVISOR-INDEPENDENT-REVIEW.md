# Revisão independente do supervisor de orquestração

VERDICT: REJECT

O supervisor não deve executar tarefas reais, incluindo P03, no estado atual. A arquitetura contém caminhos plausíveis para redisparar uma tarefa já integrada, aprovar ou integrar uma árvore diferente da revisada, contornar gates humanos e manter um processo escritor ativo depois de liberar seu lock. Esses problemas são de segurança e integridade do fluxo, não apenas de robustez operacional.

Esta revisão foi feita sobre `main` em `d8444293f1e3348e8c21e766f3202acd14c87a9c`. A fase GSD observada é 03.1; P02 continua bloqueada pelos gates humanos T12 e T13, e P03 não foi iniciada. A suíte determinística existente terminou com `23 passed, 0 failed`, mas usa agentes falsos e não cobre os cenários críticos descritos abaixo.

O modelo de ameaça considerado inclui: dois supervisores concorrentes; crash ou timeout em qualquer ponto; task spec, diff ou output contendo texto hostil; agente que viola instruções; alteração do target local ou remoto durante a execução; configuração local contaminada; e erros de aplicação que se parecem com falha do provider.

## CRITICAL

### C-01 — Tarefas derivadas do índice GSD podem ser executadas e integradas repetidamente

**Evidência:** `scripts/orchestration/supervisor.ps1:92-107` recria a fila a partir do índice reconciliado a cada iteração. Para tarefas vindas do índice, `Set-TaskDone` apenas registra um evento (`scripts/orchestration/supervisor.ps1:291-297`); não existe ledger persistente que exclua a task já integrada. O loop chama novamente a reconciliação e o scheduler (`scripts/orchestration/supervisor.ps1:454-490`).

**Falha:** após um merge bem-sucedido, o resumo GSD continua marcando a tarefa como pendente até que outro ator o altere. A próxima iteração pode recriar a mesma task, gastar outro executor/reviewer e tentar integrar trabalho duplicado. A suíte cobre a fila manual, cujo status é persistido, mas não executa duas iterações reais sobre uma task derivada do índice.

**Exigência:** criar um ledger transacional e monotônico, vinculado a `taskId + planningHead + acceptanceHash`, com estados duráveis e deduplicação. Uma task `MERGED` não pode voltar a `PENDING` sem uma nova versão explícita de requisitos. Adicionar teste end-to-end de duas ou mais iterações sobre o índice real.

### C-02 — O parser de review permite aprovação por prompt/output injection

**Evidência:** o prompt recebe planning e diff não confiáveis integralmente (`scripts/orchestration/review.ps1:43-77`). O resultado é interpretado procurando texto livre contendo `VERDICT: APPROVE`, `REQUEST_CHANGES` ou `HUMAN_REVIEW_REQUIRED` em qualquer linha (`scripts/orchestration/review.ps1:88-96`). A busca por aprovação acontece sem exigir uma única decisão final autenticada.

**Falha:** um task spec ou arquivo alterado pode conter `VERDICT: APPROVE`. O reviewer pode repetir ou citar esse texto e concluir `REQUEST_CHANGES`; o parser ainda pode selecionar a aprovação. Uma instrução maliciosa no diff também pode induzir review superficial.

**Exigência:** resposta estruturada validada por JSON Schema, exatamente um verdict em campo final, rejeição de múltiplos verdicts, output truncado ou texto fora do envelope, e separação explícita entre dados não confiáveis e instruções. O artefato deve ser assinado logicamente pelos hashes do spec e do diff.

### C-03 — Checks e reviews não estão vinculados à árvore que o merge integra

**Evidência:** os artefatos de check/review não registram nem validam `base SHA`, `head SHA`, `tree hash`, `diff hash`, `task spec hash` e configuração efetiva. `scripts/orchestration/merge.ps1:51-60` aceita o último PASS/APPROVE pelo nome temporal. Em seguida, `scripts/orchestration/merge.ps1:63-66` pode executar `git add -A` e criar um commit com mudanças presentes depois do review.

**Falha:** um processo órfão, operador ou segundo supervisor altera a worktree após a aprovação. O merge cria um commit com conteúdo nunca checado ou revisado e reutiliza artefatos antigos. Colisões de nomes com resolução de segundos agravam o risco.

**Exigência:** tornar check e review attestations content-addressed e fail-closed. O integrador deve rejeitar qualquer diferença de SHA/árvore/diff/spec/config. O merge não pode auto-commit; ele só pode integrar um commit imutável já verificado e revisado.

### C-04 — Gates humanos e a autoridade do índice reconciliado podem ser contornados

**Evidência:** gates externos são extraídos em `planGateDeps` (`scripts/orchestration/reconcile.ps1:196-200`), mas não são carregados para a spec derivada nem verificados por `Test-DepsSatisfied` (`scripts/orchestration/supervisor.ps1:70-89,130-140`). Uma definição da fila manual tem precedência sobre uma task homônima do índice (`scripts/orchestration/supervisor.ps1:49-67`). A proteção `reconciled` existe no loop (`scripts/orchestration/supervisor.ps1:457-462`), mas a execução direta por `-Task` chega a `Invoke-TaskPipeline` sem a mesma precondição (`scripts/orchestration/supervisor.ps1:695-697`).

**Falha:** uma task manual com mesmo ID pode reclassificar uma tarefa gated; uma execução direta pode consumir índice stale/unreconciled; uma dependência externa não satisfeita pode ser ignorada. Isso permite iniciar trabalho que o planejamento declarou bloqueado.

**Exigência:** tornar gates first-class e imutáveis, remover shadowing por ID ou separar namespaces, validar proveniência e `planningHead` em todo entrypoint, e exigir um registro de aprovação humana externo e autenticado. Nenhum campo controlado pela própria task pode desabilitar o gate.

### C-05 — Timeout pode liberar o writer lock enquanto o processo filho continua escrevendo

**Evidência:** no timeout, `scripts/orchestration/run-agent.ps1:102-105` tenta `$p.Kill($true)` e ignora qualquer exceção. A execução usa `powershell.exe`; nessa combinação, o overload com `entireProcessTree` não é garantido, e `Start-Process` pode estar controlando apenas um shim pai. O lock é liberado incondicionalmente em `scripts/orchestration/run-agent.ps1:124-125`.

**Falha:** o supervisor acredita ter encerrado o agente, libera o lock e inicia outro writer. O filho antigo continua alterando a mesma worktree ou Git common dir. Checkpoints e reviews passam a representar uma mistura de dois escritores.

**Exigência:** usar Job Object/process group com encerramento verificável de toda a árvore e aguardar sua morte. Se o término não puder ser comprovado, manter/quarentenar o lease e bloquear reutilização. Cobrir shim, netos, SIG/CTRL, timeout e crash em testes reais no Windows suportado.

### C-06 — A worktree não constitui fronteira de segurança para o executor

**Evidência:** a restrição a uma worktree é apenas textual no prompt (`scripts/orchestration/supervisor.ps1:223-231`). Claude roda com `--permission-mode acceptEdits` e diretório adicional (`scripts/orchestration/run-agent.ps1:75-81`), sem container, ACL, allowlist rígida ou perfil limpo. Worktrees compartilham o Git common dir; caminhos absolutos, shell e credenciais do usuário continuam alcançáveis. Codex usa sandbox de workspace, mas o harness não prova isolamento do common dir, refs e processos externos.

**Falha:** instrução injetada, modelo equivocado ou ferramenta comprometida escreve no main, outra worktree, refs compartilhadas, configuração do usuário ou executa `git push`. Código pode ser perdido, alterado fora do diff esperado ou publicado antes do integrador.

**Exigência:** executor em ambiente descartável com isolamento imposto pelo SO, idealmente clone independente; Git metadata/target e secrets não montados; rede e comandos Git negados; identidade de merge separada; allowlist de ferramentas; diretório de saída explicitamente limitado. Instruções no prompt continuam úteis, mas não podem ser o controle primário.

## HIGH

### H-01 — Classificação textual de falha confunde erro de aplicação com falha de provider

`Classify-AgentFailure` (`scripts/orchestration/lib.ps1:222-271`) procura frases como quota, 429, billing, overloaded e service unavailable no stdout/stderr bruto. O parâmetro de provider não restringe a gramática. Teste, log, task spec ou saída da aplicação pode produzir essas palavras e disparar Claude → Codex ou Codex → Claude, apesar de o provider estar saudável. `HUMAN_GATE` também é reconhecido por texto livre.

É necessário usar os eventos estruturados e códigos de erro próprios de cada CLI. Failover só deve ocorrer quando a falha é atribuída ao transporte/provider antes de trabalho de aplicação; falha de check, ferramenta, build, requisito ou código nunca deve migrar de provider automaticamente.

### H-02 — O reviewer não recebe um contexto realmente fresco

Os dois CLIs herdam configuração, skills, plugins, hooks e memória do usuário. Claude tem hooks de `ai-memory` e MCPs conectados; Codex tem memories/plugins habilitados. Os comandos atuais não criam um perfil efêmero e não usam as opções nativas de isolamento de configuração. Isso pode compartilhar contexto prévio, persistir prompts/diffs e reduzir a independência entre implementer e reviewer.

Reviewer deve iniciar com home/config descartável, sem memória, MCP, plugins, hooks ou session persistence; read-only imposto; sem acesso à conversa ou raciocínio do implementer. Para Codex, a versão instalada oferece `codex exec --ephemeral --ignore-user-config --sandbox read-only` e output schema. Para Claude, usar as opções equivalentes disponíveis na versão instalada (`--bare`/safe ou restricted mode, settings explícitos, MCP estrito e sem persistência), depois de teste de comportamento.

### H-03 — Aprovação superficial é aceita como aprovação válida

O prompt solicita uma checklist, mas o parser exige somente uma palavra de verdict. O reviewer recebe resumo de checks, não os logs/evidências completos (`scripts/orchestration/review.ps1:36-40,60-74`). O diff é truncado em aproximadamente 80 KiB (`scripts/orchestration/review.ps1:33-34`) e ainda pode ser aprovado. Não existe decisão por acceptance criterion, citação de arquivo/linha, demonstração de teste ou análise da qualidade dos checks.

Exigir um schema com decisão e evidência por critério, findings com localização, confirmação de leitura de todos os arquivos alterados e logs dos comandos. Diff truncado, binário não inspecionado, arquivo fora do contexto ou check ausente deve elevar para revisão humana/chunking, nunca aprovar.

### H-04 — Falta um lock global de integração e confirmação remota do push

Os locks são por `runId`; não há mutex do target/main. Dois supervisores podem passar pela janela de verificação e integrar concorrentemente. `scripts/orchestration/merge.ps1:69-99` protege parte da mudança local do target, mas não faz fetch/CAS contra `origin/main`. Falha de push é apenas warning (`scripts/orchestration/merge.ps1:108-115`), enquanto o run pode ser marcado `MERGED`.

Usar lock global atômico do integrador, fetch antes da integração, expected target SHA, e estado separado `INTEGRATED_LOCAL`/`PUSH_FAILED`/`PUBLISHED`. Só declarar `MERGED` após confirmar que o SHA remoto esperado contém o merge. Falha de push deve bloquear, não ser sucesso parcial silencioso.

### H-05 — Writer locks são vulneráveis a TOCTOU e PID reuse

`Acquire-WriterLock` faz `Test-Path`, leitura/remoção e escrita em operações separadas (`scripts/orchestration/lib.ps1:144-156`). Dois processos podem adquirir simultaneamente. O owner é apenas PID, sem host, process start time, nonce ou heartbeat; PID reutilizado pode ser aceito. `runId` tem resolução temporal de segundos (`scripts/orchestration/supervisor.ps1:257`) e não impede duas execuções da mesma task.

Usar criação atômica `CreateNew`/mutex, lease com UUID, PID + start time + host + heartbeat e compare-and-delete. Acrescentar deduplicação por task/version e locks separados para worktree, scheduler e integração.

### H-06 — O executor pode alterar acceptance criteria, checks e políticas

Não há protected paths nem comparação entre escopo declarado e diff real. O executor pode alterar `.planning`, testes, orchestration config/scripts e critérios. O supervisor e o merge usam `git add -A` (`scripts/orchestration/supervisor.ps1:373-376`, `scripts/orchestration/merge.ps1:63-66`). Mesmo que o reviewer possa notar o diff, o protocolo não o obriga a rejeitar mudanças de autoridade.

Congelar spec/acceptance/scope no dispatch, armazenar hashes fora da worktree do executor, negar escrita em políticas e testes de aceitação controlados pelo integrador, e falhar se o diff observado exceder o escopo. Mudança legítima de requisito deve gerar nova versão e novo gate, nunca ser aceita incidentalmente no mesmo run.

### H-07 — Main dirty, base incorreta e índice stale só são descobertos tarde

O run usa o HEAD local corrente como base (`scripts/orchestration/supervisor.ps1:258`) sem provar branch target, worktree limpa, sincronização remota e `planningHead` correspondente. O merge recusa alguns estados dirty depois que modelos e checks já foram gastos. Mudanças não commitadas do planejamento não entram na worktree, logo a task pode executar requisitos diferentes dos visíveis ao operador.

Preflight obrigatório antes do dispatch: target exato, clean tree, fetch concluído, política de ahead/behind, índice reconciliado ao HEAD, spec hash e ausência de outro run da mesma versão.

### H-08 — Crash recovery detecta, mas não fornece retomada segura

O recovery marca estados e preserva trabalho, o que é positivo, mas liveness se baseia no PID do supervisor e não prova o estado de toda a árvore filha. Não há protocolo de resume que valide spec/base/head/tree/lease. Checkpoints temporais podem ficar stale, colidir e conter diff truncado.

Checkpoint deve ser manifesto imutável com hashes e owner lease. Resume precisa revalidar todos eles, reexecutar checks/review e nunca confiar em um verdict anterior. Processo filho morto com supervisor vivo e processo filho vivo com supervisor morto precisam de testes separados.

### H-09 — Verificações podem bloquear indefinidamente e retries não têm orçamento operacional

`scripts/orchestration/verify.ps1:52-55` espera comandos sem timeout/process-tree management. `MaxRetries` aceito pela CLI não tem teto rígido. Não há circuit breaker, cooldown, limite de custo/tokens ou budget por task. Um check travado paralisa o único slot; falso rate-limit pode gastar dois providers premium.

Definir timeout por check e por run, termination comprovada, teto de attempts, backoff com jitter, cooldown por provider, budget de custo/tokens/tempo e kill switch global. Os limites devem vir de configuração validada e não ser ampliáveis pela task.

### H-10 — Parsing de dependências e status GSD é ad hoc e pode produzir grafo incorreto

O frontmatter é interpretado por parser simplificado (`scripts/orchestration/reconcile.ps1:22-38`), e a tabela de tasks depende de regex/formato exato (`scripts/orchestration/reconcile.ps1:211-242`). Fases são convertidas numericamente, o que colapsa valores como 3.10 e 3.1 (`scripts/orchestration/reconcile.ps1:47-50`). Evidência de conclusão é inferida por regex, e dependências explícitas por task não formam um grafo validado.

Usar schema e parser YAML/Markdown estritos, IDs canônicos, grafo explícito, detecção de ciclo e erro fail-closed para linha ou campo desconhecido. Não inferir DONE de evidência parcial ou ausência de linha.

### H-11 — Redaction é posterior, incompleta e não é uma fronteira de segredo

Stdout/stderr bruto é escrito em disco (`scripts/orchestration/run-agent.ps1:42-43`) e só depois do processo terminar é redigido/apagado (`scripts/orchestration/run-agent.ps1:109-113`). Crash deixa o bruto. O arquivo `*.codex-last.txt` é escrito diretamente (`scripts/orchestration/run-agent.ps1:88-89`) e não passa pelo mesmo fluxo. Regex inválida é ignorada em `scripts/orchestration/lib.ps1:104-106`; encoding, JSON, base64 e nomes de arquivo não são cobertos de forma confiável.

O controle primário deve ser não fornecer secrets ao processo. Além disso, usar streaming redaction, temporários com ACL mínima e cleanup em `finally`, redigir todo artefato, scanner de segredo e política de retenção. Nunca copiar auth, histórico ou config de outro agente para obter paridade.

### H-12 — Argumentos PowerShell e IDs não têm contrato seguro

`Start-Process -ArgumentList` é usado para CLIs e checks (`scripts/orchestration/run-agent.ps1:93-100`, `scripts/orchestration/verify.ps1:45-53`). Em Windows, a serialização de arrays para uma command line única é sensível a aspas, espaços e metacaracteres, especialmente com shims `.cmd`. IDs manuais entram em branch/path/commit/run sem allowlist forte.

Validar IDs e caminhos com gramática fechada; resolver executável nativo; evitar shell; usar API de argumentos que preserve fronteiras ou quoting testado para o runtime exato. Config e comandos precisam de schema/allowlist e não podem ser controlados por task spec.

## MEDIUM

### M-01 — Scope-conflict detection é apenas uma aproximação do planning

O mesmo scope de plano é aplicado a várias tasks; globs são comparados por `Contains` após remover `*` (`scripts/orchestration/lib.ps1:286-294`). Não há reclassificação pelo diff observado. Isso gera falsos negativos e falsos positivos. Recalcular conflitos com caminhos normalizados reais, ownership e shared resources antes do check/review/merge.

### M-02 — `maxParallel` não representa a concorrência efetiva

O loop chama a pipeline sincronicamente (`scripts/orchestration/supervisor.ps1:485-490`), portanto um único supervisor não explora paralelismo; múltiplos supervisores, por outro lado, escapam do accounting. Antes de elevar o limite, implementar scheduler único, leases e integração serializada. Até lá, manter 1 é correto, mas não é garantia global.

### M-03 — Não existe contrato explícito para “sem mudanças”

Uma task pode passar checks/review sem produzir o artefato esperado, e o pipeline não exige diff mínimo nem um resultado `NO_CHANGE` justificado. Exigir evidência por acceptance criterion e um estado explícito para no-op; nunca interpretar ausência de falha como conclusão.

### M-04 — Discordância entre Claude e Codex não tem arbitragem baseada em evidência

Após ciclos de correção, o fluxo pausa, mas não distingue finding válido, erro do reviewer, conflito de requisito ou flakiness. Não há registro estruturado da disputa nem terceiro decisor. Para STANDARD, uma correção e nova revisão independente pode bastar; para COMPLEX/CRITICAL, desacordo persistente deve ir a humano ou terceiro reviewer com evidências, sem voto majoritário e sem permitir que o implementer se autoaprove.

### M-05 — O modelo/identidade do reviewer não integra a attestation

O relatório não fixa provider, model version, effective settings, tool policy, prompt template version ou usage. Sem isso, não é possível auditar regressões ou provar independência. Registrar metadados não sensíveis e hashes de configuração.

### M-06 — A suíte prova comportamento simulado, não as integrações reais

Os 23 testes atuais são úteis para regressão de happy path, merge local e fake-agent, mas faltam: output real dos dois CLIs, derived-index em múltiplos loops, parser injection, múltiplos verdicts, lock race, árvore órfã, crash durante raw output, stale attestation, push rejeitado, target remoto concorrente, gate externo, shadowing manual, planning malformado, diff truncado, dirty preflight e shell quoting.

### M-07 — A semântica de gate humano não modela aprovação durável

Uma task de classe HUMAN permanece `WAITING_HUMAN` pela classe em si (`scripts/orchestration/reconcile.ps1:132-137`); editar texto/status do planning pode ser necessário para destravar. Separar definição do gate de sua decisão. A aprovação deve ser um evento durável, com autor, timestamp, escopo e hash dos requisitos aprovados.

### M-08 — Configuração declarada e comportamento não são totalmente verificáveis

Opções como política de rebase/post-merge precisam de teste que prove a semântica exata, não só presença no JSON. O comportamento atual integra target na branch e verifica antes de avançar main, o que é uma boa base; ainda falta provar a árvore final em main e no remoto e rejeitar qualquer divergência.

## LOW

### L-01 — Nomes temporais com precisão de segundos permitem colisão

Run IDs, review e check artifacts devem usar UUID/nonce e criação exclusiva, não apenas timestamp.

### L-02 — Documentação superestima a prontidão

Termos equivalentes a “production-ready” não são sustentados pelo modelo de isolamento, attestation e testes reais. Documentar explicitamente “POC/local-only” até o canary ser aprovado.

### L-03 — Não há telemetria de custo e desperdício por provider

Registrar attempts, duração, tokens/custo quando disponíveis, razão estruturada de failover e cache hit. Não registrar prompts, secrets ou raciocínio interno.

### L-04 — Artefatos binários e arquivos grandes não têm protocolo de review

Definir hash, tipo, scanner e reviewer especializado. Aprovação textual de diff parcial não deve abranger conteúdo que o reviewer não inspecionou.

## ADAPTIVE_ROUTING_RECOMMENDATIONS

O router deve ser determinístico, versionado e executado duas vezes: primeiro sobre requisitos/escopo declarado; depois sobre o diff real. A segunda passagem só pode manter ou elevar a classe. Toda decisão deve registrar dimensões, regras acionadas e budget, sem texto livre como fonte de autoridade.

| Classe | Critérios mínimos | Papéis padrão | Política |
|---|---|---|---|
| `TRIVIAL` | Baixa complexidade; sem security, tenant, Money, billing, schema, arquitetura ou shared infra; no máximo 2 arquivos/50 LOC; docs/cópia/fixture claramente isolado | Implementer + checks; reviewer leve por amostragem ou quando houver código | Modelo econômico, timeout curto, sem auto-merge se tocar protected path |
| `STANDARD` | Mudança contida; no máximo 8 arquivos/300 LOC; nenhum hard override | Implementer, tester quando houver comportamento, cross-reviewer | Um ciclo de correção; checks e review vinculados ao SHA |
| `COMPLEX` | Qualquer auth/security técnica, tenant query, Money implementation, schema/migration efêmera, arquitetura, shared infra/orchestration/CI, múltiplos apps ou limite de tamanho excedido | Scout quando necessário, architect, implementer, tester independente, cross-reviewer; security reviewer quando dimensão sensível | Modelo forte, budget maior, integração serial, re-review após mudança material |
| `CRITICAL` | Billing/provider, persistent migration/data, secrets, produção, ação destrutiva, estratégia multi-tenant/money, mudança de business requirement, Level C ou blast radius amplo | Scout, architect, implementer, tester, reviewer, security reviewer e integrator humano | Sem merge autônomo; gate humano obrigatório vinculado à versão exata |

Hard overrides devem prevalecer sobre score: billing, persistent DB, produção, DNS, secrets, LGPD, destrutivo, mudança deliberada de tenant/money ou requisito de negócio são sempre `CRITICAL`. Security, isolamento de tenant, dinheiro calculado/armazenado, schema, arquitetura e shared infrastructure são no mínimo `COMPLEX`.

As dimensões devem ser avaliadas separadamente em escala curta e auditável: complexity, security, tenant isolation, Money, billing, migrations/schema, architecture, shared infrastructure, UI, business requirement e volume/escopo. UI puramente visual pode ser STANDARD; mudança de fluxo, acessibilidade crítica, checkout, autorização ou requisito visual subjetivo com gate passa a COMPLEX/CRITICAL conforme a dimensão acionada.

Papéis devem seguir menor privilégio:

- `scout`: read-only, barato, produz mapa de evidências, não decide aceite;
- `architect`: read-only, decide interfaces/risco antes da escrita, sem merge;
- `implementer`: escreve apenas no sandbox/clone da task;
- `tester`: valida contrato congelado e, quando criar testes, o faz em artefato/branch separado do implementer;
- `reviewer`: read-only, provider diferente, contexto limpo e schema de evidência;
- `security reviewer`: read-only, obrigatório por dimensão e não substituído pelo reviewer geral;
- `integrator`: processo determinístico com credencial mínima; em CRITICAL, humano.

O router deve ter budget e circuit breaker por classe. Modelos premium não devem ser acionados por retry textual; devem ser reservados a complexidade/risco demonstrado ou escalonamento explícito.

## CROSS_REVIEW_RECOMMENDATIONS

A alternância “Claude implementa → Codex revisa” e “Codex implementa → Claude revisa” reduz parte da correlação de falhas: providers diferentes têm vieses, treinamento e padrões de ferramenta diferentes. Contexto fresco, read-only e ausência do raciocínio privado do implementer também são decisões corretas.

Isso não elimina correlated hallucination. Ambos recebem o mesmo requisito possivelmente errado, confiam nos mesmos testes, leem o mesmo diff e podem herdar memória/configuração do mesmo usuário. Um reviewer pode ainda ancorar no resumo de checks ou na solução já implementada. O protocolo precisa:

1. congelar requirements, acceptance e threat/risk classification antes da implementação;
2. fornecer ao reviewer requisitos congelados, diff completo, changed files, logs de checks e hashes — nunca chain-of-thought;
3. iniciar o reviewer em processo e perfil descartáveis, sem memória, MCP, plugins, hooks ou conversa prévia;
4. exigir decisão estruturada por critério, evidência localizada e lista de riscos não testados;
5. colocar os testes de aceitação sob ownership independente;
6. re-review obrigatório quando a correção muda diff/spec/hash;
7. elevar a humano/terceiro reviewer desacordo persistente em COMPLEX/CRITICAL;
8. proibir autoaprovação, majority vote sem evidência e override do check determinístico.

Para evitar aprovação superficial, uma resposta sem evidência suficiente deve ser `INCOMPLETE_REVIEW`, não `APPROVE`. O sistema deve medir cobertura do review (critérios avaliados, arquivos lidos, conteúdo truncado), não tamanho da prosa.

## SKILL_PARITY_RECOMMENDATIONS

Inventário observado: Claude Code `2.1.258`; Codex CLI `0.152.1`. Codex não tem MCP configurado atualmente. Claude tem conectores Google e `ai-memory`; plugins `frontend-design` e `ponytail`; skills de GSD/Graphify e hooks de ai-memory/RTK. Codex oferece nativamente AGENTS.md, Skills, MCP stdio/HTTP, instruções de projeto/usuário, plugins, memories, hooks, `codex review` e execução não interativa com sandbox/schema.

As capacidades devem ser portadas por contrato e necessidade, não pela cópia de diretórios Claude:

| Capability | Classificação | Recomendação |
|---|---|---|
| `AGENTS.md` e instruções de projeto/usuário | `SHARED_NATIVE` | Codex descobre instruções globais e do repositório nativamente; manter políticas canônicas no repo e testar precedência/tamanho |
| Skills no padrão `.agents/skills` | `SHARED_NATIVE` | Preferir skill portátil e mínimo; revisar cada `SKILL.md`, scripts e permissões |
| Skills GSD atuais de Claude | `NEEDS_CODEX_SKILL` | Portar seletivamente semântica e comandos; não copiar cache/estado; validar triggers e paths no Codex |
| MCP stdio/HTTP | `SHARED_MCP` | Configurar cada server de novo por nome/URL/env reference; least privilege; sem copiar token/config auth |
| `ai-memory` como MCP local | `SHARED_MCP` | Pode ser conectado tecnicamente, mas somente após threat model, escopo e retenção; desabilitar no reviewer |
| Hooks/lifecycle atuais do `ai-memory` para Claude | `CLAUDE_ONLY` | Reimplementar apenas se necessário usando hooks nativos e contrato explícito; não copiar wrappers ou histórico |
| `ai-memory` no reviewer independente | `UNSAFE_TO_SHARE` | Viola contexto fresco e pode persistir requirements/diff/secrets; manter desligado |
| Graphify CLI | `SHARED_CLI` | O CLI instalado declara suporte a instalação Codex; usar o instalador nativo, inspecionar o resultado e não importar auth |
| Workflow/skill Graphify atual de Claude | `NEEDS_CODEX_SKILL` | Criar/instalar variante Codex validada; separar capability do CLI das instruções Claude |
| RTK CLI | `SHARED_CLI` | Pode ser chamado explicitamente em exploração, com versão fixa e output verificável |
| RTK como rewrite automático de output/check | `UNSAFE_TO_SHARE` | Pode resumir/truncar evidência; não usar no verifier/reviewer/integrator crítico |
| Ponytail plugin/hooks Claude | `CLAUDE_ONLY` | A instalação Claude não é uma instalação Codex |
| Artefato Ponytail com suporte Codex | `NEEDS_CODEX_SKILL` | Instalar pela via Codex separada e revisar regras/hooks; não copiar cache Claude |
| `frontend-design` | `SHARED_NATIVE` | Existe como skill nos dois ambientes; alinhar contrato, não arquivos privados |
| Google Drive/Gmail/Calendar conectados no Claude | `UNSAFE_TO_SHARE` | Não são necessários ao harness e ampliam exfiltration/blast radius; desabilitar para todos os papéis CI |
| Auth, tokens, settings privados, histórico e logs Claude | `UNSAFE_TO_SHARE` | Nunca copiar; provisionar secrets por identidade/role e referência externa |
| `codex review` e sandbox read-only | `SHARED_NATIVE` | Usar com perfil efêmero, output schema e config ignorada no reviewer |
| Plugins gerais instalados no Codex | `SHARED_NATIVE` | Desabilitar no harness por default; habilitar apenas capability requerida pela task |
| Memories nativas do Codex | `SHARED_NATIVE` | Úteis interativamente, mas desabilitadas para reviewer e execução reproduzível |

A documentação nativa instalada confirma suporte a [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md), [Skills](https://learn.chatgpt.com/docs/build-skills.md), [MCP](https://learn.chatgpt.com/docs/extend/mcp.md) e [execução não interativa](https://learn.chatgpt.com/docs/non-interactive-mode.md). O importador de outros agentes existe, mas sua própria documentação exige revisão de permissões, auth MCP, hooks e interpolação de shell; portanto ele não deve ser usado como migração cega para o supervisor.

## FAILOVER_RECOMMENDATIONS

1. Consumir JSON/eventos estruturados dos CLIs e mapear error type/status/exit code por provider.
2. Separar `PROVIDER_AUTH`, `PROVIDER_QUOTA`, `PROVIDER_RATE_LIMIT`, `PROVIDER_TRANSIENT`, `TOOL_ERROR`, `APPLICATION_ERROR`, `CHECK_FAILURE`, `POLICY_BLOCK` e `UNKNOWN`.
3. Só permitir failover antes de side effects ou após checkpoint/árvore verificados e encerramento comprovado do processo anterior.
4. Exigir que a falha venha do canal de controle do provider; texto produzido por task, ferramenta, teste ou diff nunca classifica provider.
5. Aplicar backoff/cooldown ao mesmo provider quando apropriado; no máximo um cross-provider failover automático por attempt lineage.
6. Não fazer failover para auth/quota sem health independente do provider secundário e budget disponível.
7. Vincular resume a `runId`, provider attempt, task/spec/base/head/tree hashes e lease owner; checkpoint stale deve ser rejeitado.
8. Tratar check failure e erro de aplicação como correção/review, não como oportunidade de trocar modelo.
9. Criar corpus negativo contendo textos de aplicação com “429”, “quota”, “billing”, “service unavailable” e instruções adversariais.
10. Registrar razão estruturada, custo, duração e resultado do failover; sem prompts, chain-of-thought ou secrets.

## REQUIRED_BEFORE_REAL_TASKS

1. Corrigir C-01 a C-06 e todos os achados HIGH; nenhum deles é aceitável como dívida para uma task real.
2. Implementar ledger monotônico/deduplicação e proveniência do índice GSD.
3. Tornar gates externos/humanos first-class, autenticados e impossíveis de shadowing.
4. Isolar executor/reviewer/integrator por OS, perfil e credencial; merge principal separado dos agentes.
5. Substituir locks por leases atômicos e implementar termination de árvore verificada.
6. Congelar spec/acceptance/scope e proteger policy/tests/planning contra alteração pelo executor.
7. Adotar attestations content-addressed para checks/review/merge/push.
8. Tornar review e failure classification estritamente estruturados e fail-closed.
9. Implementar lock global do target, sincronização remota e estados de publicação corretos.
10. Substituir parsing GSD ad hoc por schema/grafo validado e cobrir gates/dependências reais.
11. Eliminar persistência bruta de outputs/secrets e rodar papéis com capability allowlist.
12. Adicionar timeouts, circuit breaker, retry/cost budgets e kill switch.
13. Executar testes adversariais com CLIs reais em repositório descartável, incluindo todos os gaps de M-06.
14. Manter P03, T12/T13 e qualquer DB persistente fora do canary.

## NICE_TO_HAVE

- Dashboard local de lineage: task version → attempts → checks → reviews → integration → remote SHA.
- Métricas de custo, tempo, retries, false failover, findings por reviewer e flakiness.
- Property-based tests para parsers, state machine e argumentos Windows.
- Chaos tests para crash em cada transição e concorrência de dois supervisores.
- Policy-as-code para protected paths e papéis permitidos por classe.
- Reprodução hermética com versões fixas de CLI/model config e manifest de ferramentas.
- Amostragem periódica de tasks TRIVIAL por reviewer forte para detectar degradação do router.

## READY_FOR_CANARY

Alterações objetivamente necessárias para declarar o harness `READY_FOR_CANARY`:

- [ ] Uma task derivada do índice integrada não volta a ser schedulable em loops posteriores.
- [ ] Todo entrypoint rejeita índice stale/unreconciled, gate pendente, shadow task e base dirty/incorreta.
- [ ] Executor não consegue escrever no main, refs, outras worktrees, policy store ou rede/credenciais fora da allowlist.
- [ ] Timeout/crash encerra toda a árvore ou mantém lease em quarentena; dois writers nunca coexistem.
- [ ] Locks de task/worktree/scheduler/main são atômicos e testados sob concorrência.
- [ ] Spec, acceptance, scope, checks e review são imutáveis e vinculados ao commit/tree/diff exato.
- [ ] Review usa contexto limpo/read-only, schema único e rejeita injection, múltiplos verdicts e truncation.
- [ ] Executor não pode alterar critérios/testes autoritativos nem ampliar scope sem nova versão/gate.
- [ ] Failover usa sinais estruturados, tem corpus negativo, budget, cooldown e nunca reage a erro de aplicação.
- [ ] Output e artefatos não persistem secrets brutos, inclusive em crash/timeout.
- [ ] Integração é serial, remote-aware e só termina `MERGED` após push confirmado e verificação da árvore final.
- [ ] Router adaptativo tem hard overrides, post-diff escalation e papéis/privilegios/budgets por classe.
- [ ] Suite cobre derived-index, gates, locks, orphan tree, injection, stale artifacts, remote race, dirty tree, parser e quoting com os CLIs reais.
- [ ] Canary inicial roda somente uma task sintética `TRIVIAL`, em clone/repo descartável e sem auto-merge; depois uma `STANDARD` sem aplicação/DB, com revisão manual das attestations.
- [ ] Nenhuma task GSD real, P03, T12/T13 ou DB persistente é usada para provar o canary.

Até todos os itens acima estarem satisfeitos com evidência reproduzível, o estado correto é `NOT_READY_FOR_CANARY`.
