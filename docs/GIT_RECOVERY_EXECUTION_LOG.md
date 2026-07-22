# Orcivo — Execução da Recuperação Git — Etapa A

> **Status:** Etapa A PASS; cutover NO-GO nesta execução.
> **Início:** 2026-07-21 06:33:54 -03:00
> **Aprovação:** mensagem do responsável em 21/07/2026, exclusivamente para a Etapa A.
> **Proibido nesta execução:** cutover, rename do diretório atual, alteração do Git pai, remoção do `.git` vazio, remote, commit, push, migration, teste de aplicação ou exclusão.

## Caminhos congelados

| Papel | Caminho |
|---|---|
| Origem preservada | `C:\Users\Encryptedx\Desktop\orcivo` |
| Git pai preservado | `C:\Users\Encryptedx` |
| Backup Stage A | `D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354` |
| Work clone descartável | `D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354` |
| Standalone temporário | `C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery` |

Todos os três destinos estavam ausentes no preflight. Nenhum será sobrescrito ou removido automaticamente.

## Registro de comandos

### A00 — Leitura obrigatória

```powershell
Get-Content -Encoding utf8 docs/GIT_RECOVERY_PLAN.md
Get-Content -Encoding utf8 .planning/phases/03.1-estabilizacao-pos-fase-3/03.1-P00-PLAN.md
Get-Content -Encoding utf8 docs/PROJECT_RESUME_AUDIT.md
Get-Content -Encoding utf8 .gitignore
```

**Resultado:** PASS. Foram relidos integralmente o plano, P00, auditoria e `.gitignore`. A execução foi limitada a P00-T01 a P00-T07; P00-T08 em diante não está autorizada nesta etapa.

### A01 — Git efetivo

```powershell
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-parse --show-toplevel
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx branch --show-current
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-parse HEAD
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx remote -v
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx status --short --untracked-files=no -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx log --oneline --decorate -30 -- Desktop/orcivo
```

**Resultado:** PASS.

| Invariante | Valor |
|---|---|
| Top-level | `C:/Users/Encryptedx` |
| Branch | `gsd/phase-1` |
| HEAD | `419d00df1833efd6f0625f389197f00cee105bc8` |
| Remote/upstream | nenhum |
| Alterações rastreadas em `Desktop/orcivo` | 0 |
| `.git` local | diretório vazio, 0 entradas |

### A02 — Histórico restrito ao Orcivo

```powershell
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-list --count HEAD -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-list --count --full-history HEAD -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-list --count master..HEAD -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-parse HEAD:Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx ls-tree -r --name-only HEAD:Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx log --reverse --format='%H|%aI|%an|%ae|%s' HEAD -- Desktop/orcivo
```

**Resultado:** PASS.

| Métrica | Valor |
|---|---:|
| Commits no path | 161 |
| Commits com `--full-history` | 161 |
| Merges | 0 |
| Commits exclusivos vs. `master` | 131 |
| Commits do path já em `master` | 30 |
| Árvores distintas do subdiretório | 161 |
| Arquivos rastreados no HEAD | 432 |
| Tree hash | `6b3c57204847c606a338bb761d7cc1179019b337` |
| Primeiro commit | `ba05b45d0e01b206303468609599b5951bbc4337`, 2026-05-21T23:00:33-03:00 |
| Último commit | `419d00df1833efd6f0625f389197f00cee105bc8`, 2026-06-07T23:47:52-03:00 |
| Autores distintos | 1 (`Encryptedx00x`) |

Os hashes dos commits extraídos podem mudar, mas autor, committer, datas e mensagens devem permanecer equivalentes. Como não há merges e cada commit possui uma árvore distinta, o candidato deve conter exatamente 161 commits.

### A03 — Inventário de arquivos e exclusões

```powershell
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx ls-files -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -c core.quotePath=false -C C:\Users\Encryptedx ls-files --others --exclude-standard -- Desktop/orcivo
git -c safe.directory=C:/Users/Encryptedx -c core.quotePath=false -C C:\Users\Encryptedx ls-files --others --ignored --exclude-standard --directory -- Desktop/orcivo
```

**Resultado:** PASS.

| Classe | Quantidade |
|---|---:|
| Rastreado | 432 |
| Não rastreado antes deste log | 159 |
| Grupos ignorados | 31 |
| Arquivos copiáveis após poda | 585 |
| Tamanho copiável aproximado | 4,41 MiB |
| Arquivos locais sensíveis por nome | 5 |

Arquivos locais excluídos, identificados somente por caminho: `apps/backend/.env`, `apps/backend/.env.test`, `apps/mobile/.env`, `apps/web/.env.local` e `prisma/.env`. Seus conteúdos não foram lidos. O histórico contém somente cinco arquivos de exemplo com nome `.env`: backend, mobile, web, infra e Prisma.

Também ficam excluídos: `.git`, `node_modules`, `.pnpm-store`, `.next`, `dist`, `build`, `out`, `.expo`, `.expo-shared`, `.turbo`, `coverage`, `.cache`, `web-build`, `docker-data`, `tmp`, `temp`, logs, `*.tsbuildinfo`, IDEs, certificados/chaves, `.decision`, `.gsd`, `.bg-shell`, contextos locais e arquivos de prompt/transcript.

### A04 — Espaço e ferramentas

```powershell
Get-PSDrive -PSProvider FileSystem
git --version
git --exec-path
Test-Path (Join-Path (git --exec-path) 'git-subtree')
Test-Path (Join-Path (git --exec-path) 'git-sh-setup')
Get-Command robocopy.exe
Get-Command git-filter-repo -ErrorAction SilentlyContinue
$PSVersionTable.PSVersion
```

**Resultado:** PASS para a estratégia primária.

| Item | Resultado |
|---|---|
| Livre em `C:` | 92,56 GiB |
| Livre em `D:` | 142,05 GiB |
| Git | `2.52.0.windows.1` |
| `git-subtree` | script presente |
| `git-sh-setup` | presente |
| `git-filter-repo` | não instalado; não será instalado nesta etapa |
| `robocopy` | disponível |
| PowerShell | `5.1.26100.8875` |

### A05 — Ocorrências sem efeito

Duas consultas PowerShell de inventário falharam por erro de digitação local (`Sort-Object-Unique`). Elas foram repetidas corretamente. Nenhuma das tentativas criou arquivo, diretório, ref ou alteração Git.

## Estado antes do primeiro write externo

Preflight **PASS**. A origem está limpa entre rastreados, os destinos não existem, há espaço suficiente, a estratégia `subtree split` pode ser tentada somente no clone, e todas as exclusões sensíveis estão definidas. A criação deste log é o único write feito até este ponto.

### A06 — Invariantes imediatamente antes do backup

```powershell
git -C C:\Users\Encryptedx rev-parse --show-toplevel
git -C C:\Users\Encryptedx branch --show-current
git -C C:\Users\Encryptedx rev-parse HEAD
git -C C:\Users\Encryptedx status --porcelain=v1 --untracked-files=no -- Desktop/orcivo
git -C C:\Users\Encryptedx ls-files --others --exclude-standard -- Desktop/orcivo
Get-ChildItem -LiteralPath C:\Users\Encryptedx\Desktop\orcivo\.git -Force
Test-Path D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354
Test-Path D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354
Test-Path C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery
```

**Resultado:** PASS. Branch, HEAD, índice e remotes permaneceram iguais ao preflight. A criação deste log aumentou de forma explicada os não rastreados de 159 para 160. O `.git` local continuou vazio e os três destinos continuavam ausentes.

### A07 — Backup filtrado e manifests

Foi executado um script PowerShell fail-fast que criou somente destinos antes inexistentes, percorreu a origem com poda de diretórios, copiou arquivos com `[System.IO.File]::Copy(..., $false)` e comparou SHA-256 de origem e destino. Não houve `Copy-Item -Force`, wildcard de transporte ou leitura de conteúdo de `.env` real.

```powershell
New-Item -ItemType Directory D:\OrcivoRecovery
New-Item -ItemType Directory D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354
git -C C:\Users\Encryptedx bundle create D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle --all
git -C C:\Users\Encryptedx bundle verify D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle
```

Artefatos gerados:

- `workspace-snapshot/`: snapshot filtrado da origem;
- `manifests/backup-files.csv`: path, bytes e hashes SHA-256 de origem/backup;
- `manifests/critical-hashes.csv`: 223 arquivos críticos;
- `manifests/excluded-directories.csv` e `excluded-files.csv`;
- `manifests/exclusion-rules.txt` e `backup-summary.json`;
- `parent-repository-all.bundle`: bundle completo do Git pai.

| Validação | Resultado |
|---|---:|
| Arquivos no snapshot inicial | 575 |
| Bytes no snapshot | 4.110.093 (3,92 MiB) |
| Arquivos críticos | 223 |
| Arquivos ausentes após cópia | 0 |
| Hashes divergentes | 0 |
| Paths proibidos no snapshot | 0 |
| Tamanho do bundle | 1.212.241 bytes (1,16 MiB) |
| `git bundle verify` | exit 0, `is okay` |

**Ocorrência sem efeito na origem:** a primeira captura de `git bundle verify` foi tratada pelo PowerShell 5.1 como `NativeCommandError`, porque a mensagem informativa do Git foi escrita em stderr. O bundle e o snapshot já estavam completos; a verificação foi repetida sem recriação, retornou exit 0 e foi salva em `manifests/bundle-verify.txt`.

### A08 — ACL privada e rollback de ACL

O backup e o clone de trabalho herdavam inicialmente leitura para usuários locais autenticados. Antes de restringir os dois diretórios novos, os descritores originais foram salvos em `D:\OrcivoRecovery\acl-before-20260721-063354.csv`.

```powershell
icacls.exe D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354 /inheritance:r /grant:r "Encryptedx:(OI)(CI)F"
icacls.exe D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354 /inheritance:r /grant:r "Encryptedx:(OI)(CI)F"
```

**Resultado:** PASS. Os dois roots ficaram com herança protegida e uma regra FullControl para o usuário atual. Arquivos amostrados do bundle, snapshot e clone herdaram somente essa identidade. O rollback exato usa os SDDL salvos, sem remoção de arquivos.

### A09 — Clone isolado e `subtree split`

```powershell
git clone --no-local --no-checkout C:\Users\Encryptedx D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history
git -C D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history switch --detach 419d00df1833efd6f0625f389197f00cee105bc8
git -C D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history subtree split --prefix=Desktop/orcivo --branch=orcivo-extracted 419d00df1833efd6f0625f389197f00cee105bc8
git clone --no-local --branch orcivo-extracted --single-branch D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery branch -m main
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery remote remove origin
```

**Resultado:** PASS. O split ocorreu somente no clone isolado. O tip extraído é `1df213072068255cb11334f1d758ca950fa0ef45`, a branch do candidato é `main`, seu toplevel é o próprio candidato e não há remote.

### A10 — Gate antes do transporte

```powershell
git -C C:\Users\Encryptedx rev-parse 419d00df1833efd6f0625f389197f00cee105bc8:Desktop/orcivo
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery rev-parse HEAD^{tree}
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery rev-list --count HEAD
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery ls-files
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery fsck --full
```

Além das chamadas acima, os dois logs completos foram normalizados por autor, e-mail, author date, committer, committer date e mensagem, e então comparados por SHA-256.

| Gate | Origem | Candidato | Resultado |
|---|---|---|---|
| Tree hash | `6b3c57204847c606a338bb761d7cc1179019b337` | igual | PASS |
| Commits | 161 | 161 | PASS |
| Paths rastreados | 432 | 432 | PASS |
| Diferenças de paths | - | 0 | PASS |
| Hash do histórico normalizado | `F1C807B...BE521` | igual | PASS |
| Working tree antes do transporte | - | 0 entradas | PASS |
| Remotes | 0 | 0 | PASS |
| `git fsck --full` | - | exit 0, sem saída | PASS |

O primeiro commit extraído passou de `ba05b45...` para `6263e8e...`; o último passou de `419d00d...` para `1df2130...`. A mudança de SHA é esperada pelo novo root de árvore. Autoria, datas e mensagens são idênticas.

### A11 — Transporte allowlist

O manifesto inicial foi expandido por grupo, cruzado contra `git ls-files --others --exclude-standard`, escaneado sem imprimir valores e verificado integralmente antes da primeira cópia. Destinos existentes com hash diferente seriam bloqueantes.

```powershell
git -C C:\Users\Encryptedx ls-files --others --exclude-standard -- Desktop/orcivo
git -C C:\Users\Encryptedx ls-files -- Desktop/orcivo
Get-FileHash -Algorithm SHA256 <origem-aprovada>
[System.IO.File]::Copy(<origem-aprovada>, <candidato>, $false)
Get-FileHash -Algorithm SHA256 <candidato>
```

| Grupo | Arquivos transportados |
|---|---:|
| Handoff canônico de design | 69 |
| Handoff canônico adicional | 5 |
| Decision consultant | 1 |
| Documentos mestres de design | 3 |
| Fase GSD 03.1 | 17 |
| Revisão visual da Fase 3 | 1 |
| Registros de recuperação existentes | 3 |
| Screens de referência | 20 |
| UI kits de referência | 23 |
| Runbook novo | 1 |
| `.planning/ui-reviews/.gitignore` suplementar | 1 |
| **Total** | **144** |

Os sete runbooks já rastreados foram comparados, não sobrescritos. Seus bytes diferem somente por CRLF/LF no checkout do candidato; o conteúdo normalizado e os blobs Git são idênticos.

**Tentativas interrompidas antes de copiar:**

1. o primeiro classificador encontrou sete entries da allowlist que já eram rastreados e parou;
2. a comparação SHA-256 bruta desses sete parou por CRLF/LF;
3. após classificar `LINE_ENDING_ONLY`, o transporte definitivo copiou 143 arquivos sem conflito;
4. a comparação completa identificou `.planning/ui-reviews/.gitignore` no backup e não no candidato; após revisão do conteúdo, o arquivo de 45 bytes foi transportado em manifesto suplementar.

Nenhuma dessas paradas sobrescreveu arquivo. Os manifests estão em `D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354`.

### A12 — Segurança, `.gitignore` e integridade após transporte

```powershell
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery status --porcelain=v1 --untracked-files=all
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery check-ignore -q --no-index -- <path-hipotetico>
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery grep -I -l -P -e <padroes-de-secret> <161-commits>
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery log --oneline --decorate -20
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery fsck --full
```

O scan de conteúdo procurou chaves privadas, prefixes conhecidos de tokens, assignments sensíveis e URLs PostgreSQL com credencial não placeholder. Somente paths seriam gravados; nenhum valor foi exibido.

| Validação | Resultado |
|---|---:|
| Arquivos no candidato antes do relatório final | 576 |
| Rastreados / não rastreados aprovados | 432 / 144 |
| Modificados rastreados / staged | 0 / 0 |
| Comparados contra backup | 575 + 1 exceção histórica |
| Hash bruto igual | 158 |
| Diferença somente CRLF/LF | 417 |
| Diferença real | 0 |
| Arquivos críticos comparados | 223 |
| Gaps críticos | 0 |
| `.env` real no candidato ou histórico | 0 |
| Chaves/certificados/prompts/transcripts copiados | 0 |
| Diretórios gerados copiados | 0 |
| Suspeitas de secret no working tree | 0 |
| Suspeitas de secret nos 161 commits | 0 |
| Marcadores de autoria em commit message | 0 |
| `git fsck --full` | exit 0, sem saída |
| Migrations / handoff / arquivos Fase 03.1 | 3 / 69 / 17 |

Quatro documentos históricos contêm os termos de autoria proibidos exclusivamente como regras de proibição: `.planning/PROJECT.md`, `AGENTS.md`, `CLAUDE.md` e `docs/AUTONOMY_POLICY.md`. Não são atribuições de autoria e não aparecem em mensagens de commit.

**Advertência não bloqueante:** os 13 testes de ignore obrigatórios passaram. O arquivo rastreado `apps/web/.env.local.example` é alcançado pela regra `.env.*`; por já ser rastreado, está preservado, mas a exceção do `.gitignore` deveria ser refinada em tarefa posterior autorizada. Nenhuma configuração foi alterada nesta etapa.

### A13 — Operações explicitamente não executadas

- nenhum teste, lint, typecheck, build, install, Prisma ou Docker da aplicação;
- nenhum `git add`, commit, remote ou push;
- nenhum rename/cutover;
- nenhuma migration, seed, reset ou cleanup;
- nenhuma remoção ou alteração do `.git` vazio da origem;
- nenhuma alteração de ref, índice, working tree rastreado ou histórico do Git pai;
- nenhum restore de `.env` local no candidato.

## Resultado consolidado

Etapa A **PASS**. A extração e o transporte são tecnicamente válidos, mas o cutover permanece **NO-GO nesta execução** até aprovação da Etapa B, baseline de aplicação P00-T08, commit local allowlist, remote privado e primeiro push verificado. O diretório atual continua sendo a origem autoritativa e nenhum passo irreversível foi executado.

### A14 — Espelhamento dos registros e gate final

`docs/GIT_RECOVERY_EXECUTION_LOG.md` e `docs/GIT_RECOVERY_STAGE_A_RESULT.md` foram espelhados na árvore do backup e no candidato. Antes de atualizar o log já existente, sua versão anterior foi preservada em `manifests/execution-log-before-finalization.md`. O manifesto anterior também foi preservado como `backup-files-before-final-reports.csv`.

```powershell
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery status --porcelain=v1 --untracked-files=all
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery rev-parse HEAD^{tree}
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery rev-list --count HEAD
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery fsck --full
git -C C:\Users\Encryptedx bundle verify D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle
git -C C:\Users\Encryptedx status --porcelain=v1 --untracked-files=no -- Desktop/orcivo
```

| Gate final | Resultado |
|---|---:|
| Arquivos no snapshot final | 576 |
| Bytes no snapshot final | 4.140.263 |
| Arquivos no candidato | 577 |
| Rastreados / allowlist não rastreada | 432 / 145 |
| Diferenças de path inesperadas | 0 |
| Hash bruto igual / somente newline | 159 / 417 |
| Diferenças reais | 0 |
| Arquivos críticos / gaps críticos | 223 / 0 |
| Secret suspects working tree / histórico | 0 / 0 |
| `git fsck --full` | exit 0, sem saída |
| `git bundle verify` | exit 0, `is okay` |
| Branch/HEAD Git pai | `gsd/phase-1` / `419d00d...` |
| Alterações rastreadas no path original | 0 |
| Não rastreados no path original | 161, sendo 2 registros desta execução |
| Entradas no `.git` local vazio | 0 |

**Ocorrência sem efeito:** a primeira tentativa de espelhamento final parou numa expressão PowerShell com dois `Test-Path` sem parênteses. Somente as cópias de preservação do manifesto/resumo pré-final haviam sido criadas. A expressão foi corrigida, os hashes pré-existentes foram confirmados e o espelhamento prosseguiu sem overwrite silencioso.

## Encerramento da Etapa A

> **Fim:** 2026-07-21 07:04:25 -03:00
> **Etapa A:** PASS
> **Cutover:** NO-GO nesta execução
> **Primeiro passo futuro:** obter aprovação específica para executar P00-T08 no candidato.
