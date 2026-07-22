# Orcivo — Resultado da Recuperação Git — Etapa A

> **Execução:** 2026-07-21, America/Sao_Paulo
> **Resultado da Etapa A:** PASS
> **Recomendação para cutover agora:** **NO-GO**
> **Motivo do NO-GO:** o candidato passou nos gates Git, mas P00-T08, commit allowlist, remote privado, primeiro push e aprovação específica da Etapa B ainda não ocorreram por restrição expressa desta execução.

## 1. Diretórios criados

| Papel | Caminho | Estado |
|---|---|---|
| Backup privado | `D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354` | íntegro, ACL restrita |
| Snapshot do workspace | `D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\workspace-snapshot` | 576 arquivos após espelhamento dos registros |
| Bundle do Git pai | `D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle` | verificado |
| Clone de trabalho | `D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354` | isolado, ACL restrita |
| Standalone temporário | `C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery` | Git válido, branch `main`, sem remote |
| Rollback de ACL | `D:\OrcivoRecovery\acl-before-20260721-063354.csv` | SDDL original de backup/work |

O diretório atual `C:\Users\Encryptedx\Desktop\orcivo` não foi renomeado, movido ou substituído. Seu `.git` vazio não foi alterado.

## 2. Estratégia utilizada

1. Congelamento de branch, HEAD, tree hash, histórico, índice e inventário do path original.
2. Snapshot filtrado com cópia sem overwrite, SHA-256 por arquivo e bundle `--all` fora do Git pai.
3. Clone `--no-local --no-checkout` do Git pai em `D:`.
4. `git subtree split --prefix=Desktop/orcivo` somente dentro do clone.
5. Clone independente do branch extraído, rename local para `main` e remoção do remote temporário.
6. Gate de árvore/histórico antes de qualquer transporte.
7. Transporte allowlist dos não rastreados, com scan, preflight de colisão e hash após cada cópia.
8. Comparação origem/backup/candidato, scan de secrets no working tree e nos 161 commits e `git fsck --full`.

Nenhuma ref, índice ou árvore rastreada do Git pai foi modificada.

## 3. Comandos executados

Os comandos, scripts fail-fast, resultados intermediários e tentativas interrompidas estão registrados integralmente em `docs/GIT_RECOVERY_EXECUTION_LOG.md`. Os comandos Git estruturantes foram:

```powershell
git -C C:\Users\Encryptedx bundle create D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle --all
git -C C:\Users\Encryptedx bundle verify D:\OrcivoRecovery\orcivo-recovery-backup-20260721-063354\parent-repository-all.bundle

git clone --no-local --no-checkout C:\Users\Encryptedx D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history
git -C D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history switch --detach 419d00df1833efd6f0625f389197f00cee105bc8
git -C D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history subtree split --prefix=Desktop/orcivo --branch=orcivo-extracted 419d00df1833efd6f0625f389197f00cee105bc8
git clone --no-local --branch orcivo-extracted --single-branch D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\parent-history C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery branch -m main
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery remote remove origin

git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery fsck --full
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery log --oneline --decorate -20
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery status --porcelain=v1 --untracked-files=all
```

Não foram executados `reset`, `clean`, rebase, filter-branch, remoção, commit, remote, push, migration ou teste de aplicação.

## 4. Histórico antes e depois

| Marco | Git pai/path original | Standalone |
|---|---|---|
| Branch | `gsd/phase-1` | `main` |
| HEAD/tip | `419d00df1833efd6f0625f389197f00cee105bc8` | `1df213072068255cb11334f1d758ca950fa0ef45` |
| Primeiro commit | `ba05b45d0e01b206303468609599b5951bbc4337` | `6263e8e9564bb6a3f6d904915c6752dc8386a8cc` |
| Data do primeiro | 2026-05-21T23:00:33-03:00 | igual |
| Último commit | `419d00df1833efd6f0625f389197f00cee105bc8` | `1df213072068255cb11334f1d758ca950fa0ef45` |
| Data do último | 2026-06-07T23:47:52-03:00 | igual |
| Mensagem do primeiro | `chore: initialize GSD planning structure for Phase 0` | igual |
| Mensagem do último | `docs: guia de teste manual passo a passo (12 áreas, com o que validar)` | igual |
| Autores distintos | 1 | 1, idêntico |
| Tree hash final | `6b3c57204847c606a338bb761d7cc1179019b337` | igual |
| Hash do log normalizado | `F1C807B751473EF508AB90DB4644BCBBD1530B78E15F4BACEB8CFB04A2FBE521` | igual |

Os SHAs dos commits mudam porque `Desktop/orcivo` passa a ser a raiz de cada commit. Autor, committer, datas e mensagens foram preservados.

## 5. Quantidade de commits preservados

- commits que tocam `Desktop/orcivo` antes: **161**;
- commits no standalone: **161**;
- merges no recorte: **0**;
- commits exclusivos de `gsd/phase-1` versus `master`: **131**;
- perda detectada: **0 commits**.

## 6. Quantidade de arquivos copiados

| Operação | Arquivos | Bytes |
|---|---:|---:|
| Snapshot privado inicial | 575 | 4.110.093 |
| Snapshot privado final, com este relatório | 576 | 4.140.263 |
| Arquivos rastreados recuperados pelo split | 432 | conforme árvore Git |
| Não rastreados transportados pela allowlist inicial | 143 | 1.360.699 |
| Config GSD visual suplementar | 1 | 45 |
| Total não rastreado incorporado antes deste relatório | **144** | **1.360.744** |
| Allowlist final, incluindo este relatório | **145** | conforme `approved-transport-final.csv` |
| Arquivos críticos comparados | 223 | - |

Este relatório e o log de execução foram espelhados no backup e no candidato e receberam validação SHA-256 nas três cópias.

## 7. Arquivos excluídos

Excluídos do snapshot e do transporte:

- todos os `.env` reais identificados somente por nome: backend, backend test, mobile, web local e Prisma;
- `.git`, `node_modules`, `.pnpm-store`, `.next`, `dist`, `build`, `out`, `.expo`, `.turbo`, `coverage`, caches, logs e `*.tsbuildinfo`;
- chaves, certificados e credenciais por extensão/nome;
- `.bg-shell/`, `.gsd/`, `.decision/`, `.gitignore.autonomy.append.txt` e artefatos locais;
- `apps/site/next-env.d.ts`, não rastreado e gerado;
- `docs/handoff/PROMPT.md`;
- 11 arquivos duplicados ou de prompt em `docs/design-handoff/orcivo-design-system/uploads/`.

O `apps/web/next-env.d.ts` é uma exceção: já fazia parte dos 432 arquivos históricos e foi preservado pelo split. Ele não foi copiado pelo transporte nem incluído no snapshot filtrado.

## 8. Conflitos encontrados

**Conflitos reais: 0.**

As paradas preventivas foram:

- sete runbooks classificados inicialmente como não transportáveis porque já eram rastreados;
- diferenças SHA-256 nesses runbooks e em outros arquivos textuais, todas reduzidas a CRLF/LF;
- `.planning/ui-reviews/.gitignore` presente no backup, revisto e incorporado por manifesto suplementar.

Nenhum arquivo histórico foi sobrescrito e nenhuma escolha automática entre conteúdos divergentes foi necessária.

## 9. Resultado do scan de secrets

| Escopo | Suspeitas |
|---|---:|
| 144 arquivos transportados | 0 |
| Working tree completo do candidato | 0 |
| 161 commits extraídos | 0 |
| `.env` real no candidato | 0 |
| `.env` real no histórico | 0 |
| Chave/certificado/credencial por nome | 0 |
| Marcador de autoria em commit message | 0 |

Os scanners emitiram somente paths e contagens; nenhum valor sensível foi impresso. Quatro documentos de política contêm termos proibidos apenas como instruções de proibição, sem atribuição de autoria.

## 10. Resultado do `git fsck`

```text
exit code: 0
output: vazio
```

O comando foi executado antes e depois do transporte. Não há objetos ausentes ou corrupção detectada.

## 11. Comparação dos arquivos críticos

| Gate | Resultado |
|---|---:|
| Arquivos críticos no manifesto | 223 |
| SHA-256 bruto idêntico | 26 |
| Conteúdo idêntico, diferença apenas CRLF/LF | 197 |
| Ausentes | 0 |
| Diferenças de conteúdo | 0 |
| Migrations presentes | 3 arquivos em 3 diretórios |
| Design handoff canônico | 69 arquivos |
| Fase 03.1 | 17 arquivos |

O tree hash idêntico comprova os blobs históricos. Os arquivos não rastreados transportados foram comparados byte a byte por SHA-256.

## 12. Divergências conhecidas

1. Os SHAs dos 161 commits foram reescritos de forma esperada pelo `subtree split`; o log normalizado é idêntico.
2. O checkout standalone usa CRLF em 417 dos 575 arquivos do manifesto; após normalização CRLF/LF, não há diferença de conteúdo e `git status` não acusa modificação rastreada.
3. `apps/web/next-env.d.ts` é gerado, mas já está no histórico; foi preservado como exceção rastreada.
4. `apps/web/.env.local.example` já está rastreado, porém a regra `.env.*` também o ignora quando avaliada com `--no-index`; requer ajuste posterior autorizado.
5. O candidato possui arquivos documentais não rastreados por decisão desta etapa; nenhum commit foi autorizado.
6. Não há remote/upstream e nenhum push foi feito.
7. P00-T08 não foi executado: sem install, lint, typecheck, tests, build, Prisma ou Compose.
8. O standalone temporário aparece como novo repositório aninhado no working tree do Git pai até o cutover/detach aprovado.
9. O archive proposto para o cutover ficará inicialmente como path não rastreado do Git pai; não deve ser apagado.

## 13. Plano exato de rollback

### Antes do cutover, estado atual

O rollback funcional é **não executar nada**: a origem continua intacta e autoritativa. Não é necessário remover candidato, clone ou backup.

Para restaurar somente as ACLs originais, se aprovado:

```powershell
$AclRows = Import-Csv -LiteralPath D:\OrcivoRecovery\acl-before-20260721-063354.csv
foreach ($Row in $AclRows) {
  $Acl = Get-Acl -LiteralPath $Row.Path
  $Acl.SetSecurityDescriptorSddlForm($Row.Sddl)
  Set-Acl -LiteralPath $Row.Path -AclObject $Acl
}
```

### Depois de um cutover futuro

Sem apagar nada, a reversão proposta é:

```powershell
$Desktop = 'C:\Users\Encryptedx\Desktop'
$Official = Join-Path $Desktop 'orcivo'
$Archive = Join-Path $Desktop 'orcivo-pre-recovery-<STAMP_ETAPA_B>'
$FailedCandidate = Join-Path $Desktop 'orcivo-recovery-failed-<STAMP_ETAPA_B>'

Set-Location $Desktop
if (-not (Test-Path -LiteralPath $Official)) { throw 'Path oficial ausente.' }
if (-not (Test-Path -LiteralPath $Archive)) { throw 'Archive ausente.' }
if (Test-Path -LiteralPath $FailedCandidate) { throw 'Destino de quarentena já existe.' }

Rename-Item -LiteralPath $Official -NewName (Split-Path $FailedCandidate -Leaf)
Rename-Item -LiteralPath $Archive -NewName 'orcivo'
```

Se o detach do Git pai já tiver sido commitado, o rollback será `git revert <SHA_DO_COMMIT_DETACH>` somente com nova aprovação. Nunca usar reset ou rewrite.

## 14. Comandos propostos para o cutover

Estes comandos são **propostos, não executados**, e exigem nova aprovação humana. Antes deles, executar P00-T08, criar o commit allowlist, configurar remote privado e verificar o primeiro push.

### 14.1 Gate e baseline P00-T08

```powershell
$Candidate = 'C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery'
git -C $Candidate status --short --branch
git -C $Candidate fsck --full

Set-Location $Candidate
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm --filter @orcivo/backend exec eslint src test --ext .ts
corepack pnpm --filter @orcivo/web exec next lint
corepack pnpm --filter @orcivo/mobile exec eslint src --ext .ts,.tsx
corepack pnpm --filter @orcivo/site exec next lint
corepack pnpm --filter @orcivo/shared-types test
corepack pnpm build
$env:DATABASE_URL = 'postgresql://invalid:invalid@127.0.0.1:1/orcivo_validate_only'
npx prisma validate
docker compose -f infra/docker-compose.dev.yml config --quiet
```

Não executar integração/E2E ou qualquer comando que toque banco não descartável.

### 14.2 Staging allowlist e commit local

```powershell
$Candidate = 'C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery'
$Manifest = Import-Csv -LiteralPath D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\approved-transport-final.csv
foreach ($Entry in $Manifest) {
  git -C $Candidate add -- $Entry.RelativePath
  if ($LASTEXITCODE -ne 0) { throw "Falha no staging: $($Entry.RelativePath)" }
}

git -C $Candidate diff --cached --name-status
git -C $Candidate diff --cached --check
git -C $Candidate status --short
git -C $Candidate commit -m "docs: add recovery and stabilization baseline"
```

O commit requer aprovação própria. Não usar `git add -A`.

### 14.3 Rename de cutover

```powershell
$StampB = Get-Date -Format 'yyyyMMdd-HHmmss'
$Desktop = 'C:\Users\Encryptedx\Desktop'
$Current = Join-Path $Desktop 'orcivo'
$Candidate = Join-Path $Desktop 'orcivo-standalone-recovery'
$Archive = Join-Path $Desktop "orcivo-pre-recovery-$StampB"

if (-not (Test-Path -LiteralPath $Current)) { throw 'Origem atual ausente.' }
if (-not (Test-Path -LiteralPath $Candidate)) { throw 'Candidato ausente.' }
if (Test-Path -LiteralPath $Archive) { throw 'Archive já existe.' }
if ((git -C $Candidate rev-parse --show-toplevel).Trim() -ne $Candidate.Replace('\','/')) { throw 'Toplevel inesperado.' }
if (@(git -C $Candidate status --porcelain=v1).Count -ne 0) { throw 'Candidato não está limpo.' }

Set-Location $Desktop
Rename-Item -LiteralPath $Current -NewName (Split-Path $Archive -Leaf)
Rename-Item -LiteralPath $Candidate -NewName 'orcivo'
```

O teste textual do toplevel deve aceitar a normalização Windows retornada pelo Git; revisar antes de executar, sem enfraquecer o gate.

### 14.4 Restaurar somente ambientes locais ignorados

```powershell
$Official = 'C:\Users\Encryptedx\Desktop\orcivo'
$Archive = 'C:\Users\Encryptedx\Desktop\orcivo-pre-recovery-<STAMP_ETAPA_B>'
$LocalOnly = @(
  'apps\backend\.env',
  'apps\backend\.env.test',
  'apps\web\.env.local',
  'apps\mobile\.env',
  'prisma\.env'
)

foreach ($Relative in $LocalOnly) {
  $From = Join-Path $Archive $Relative
  $To = Join-Path $Official $Relative
  if (Test-Path -LiteralPath $From) {
    if (Test-Path -LiteralPath $To) { throw "Destino local já existe: $Relative" }
    [System.IO.File]::Copy($From, $To, $false)
  }
}

git -C $Official status --short --ignored
git -C $Official rev-parse --show-toplevel
git -C $Official fsck --full
```

Não imprimir conteúdo de nenhum ambiente.

### 14.5 Detach do Git pai, somente em aprovação posterior

```powershell
$ParentRepo = 'C:\Users\Encryptedx'
$Prefix = 'Desktop/orcivo'
$ParentGitDir = (git -C $ParentRepo rev-parse --absolute-git-dir).Trim()
$ParentExclude = Join-Path $ParentGitDir 'info\exclude'
$ExcludeRule = '/Desktop/orcivo/'

if (@(Get-Content -LiteralPath $ParentExclude -ErrorAction SilentlyContinue) -notcontains $ExcludeRule) {
  Add-Content -LiteralPath $ParentExclude -Value $ExcludeRule -Encoding UTF8
}

git -C $ParentRepo rm --cached -r -- $Prefix
git -C $ParentRepo diff --cached --name-status -- $Prefix
git -C $ParentRepo diff --cached --stat -- $Prefix
git -C $ParentRepo commit -m "chore: detach Orcivo into standalone repository"
```

Revisar visualmente que somente `Desktop/orcivo` saiu do índice. O archive permanece preservado.

## 15. Comandos propostos para configurar remote privado posteriormente

Exigem aprovação humana separada e confirmação no provedor de que o repositório é **Private**.

```powershell
$Candidate = 'C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery'
$RemoteUrl = Read-Host 'Informe a URL do repositório privado, sem token'
if ($RemoteUrl -match 'https://[^/]+:[^@]+@') { throw 'URL contém credencial.' }

git -C $Candidate remote add origin $RemoteUrl
git -C $Candidate remote -v
git -C $Candidate ls-remote origin
```

Somente após nova aprovação específica para o primeiro push:

```powershell
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery push -u origin main
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery status --short --branch
git -C C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery ls-remote --heads origin main
```

Confirmar no provedor: visibilidade privada, branch `main` e SHA remoto igual ao local. Nunca embutir token na URL.

## 16. Recomendação final

### **NO-GO para cutover nesta execução**

A recuperação temporária é válida e está apta a entrar na Etapa B: árvore, histórico, arquivos críticos, allowlist, secret scan e `fsck` passaram. O NO-GO é operacional e obrigatório porque esta autorização termina antes de P00-T08, commit, remote, push, rename e detach do Git pai.

Nova aprovação deve começar por **P00-T08 no candidato**, seguida da revisão do manifesto final. O cutover só deve ocorrer depois de commit local, remote privado e primeiro push verificados.
