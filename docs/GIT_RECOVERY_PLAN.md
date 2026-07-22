# Orcivo — Plano de Recuperação do Git

> **Status:** planejamento somente. Nenhum comando de recuperação deste documento foi executado.
> **Gate:** toda operação que cria a cópia recuperada, transporta arquivos, troca diretórios, altera o índice do Git pai, configura remote ou faz push exige aprovação humana explícita.
> **Leitor:** responsável técnico que executará a recuperação em uma janela controlada.
> **Resultado esperado:** `C:\Users\Encryptedx\Desktop\orcivo` torna-se um repositório Git independente, privado, verificável e reproduzível, sem perder o Git pai nem os arquivos locais relevantes.

## 1. Situação atual

Levantamento somente leitura em 20/07/2026:

| Item | Valor confirmado |
|---|---|
| Diretório do projeto | `C:\Users\Encryptedx\Desktop\orcivo` |
| Toplevel resolvido por Git | `C:\Users\Encryptedx` |
| Branch efetiva | `gsd/phase-1` |
| HEAD efetivo | `419d00df1833efd6f0625f389197f00cee105bc8` |
| Branch `master` do Git pai | `c602cff53e39d905557789e8541039eaccb3b726` |
| Remote/upstream | inexistente |
| Distância `master...HEAD` | 0 atrás, 131 commits à frente |
| Commits totais que tocam `Desktop/orcivo` no histórico de HEAD | 161 |
| Primeiro commit do subdiretório | `ba05b45` — 21/05/2026 |
| Último commit do subdiretório | `419d00d` — 07/06/2026 |
| Arquivos rastreados em `HEAD:Desktop/orcivo` | 432 |
| Tree hash do subdiretório em HEAD | `6b3c57204847c606a338bb761d7cc1179019b337` |
| Alterações rastreadas no escopo Orcivo | 0 |
| Arquivos não rastreados no escopo, após criar este planejamento | 159 (141 no preflight + 18 documentos novos) |
| Tamanho dos não rastreados | aproximadamente 1,79 MiB; 135 estão em `docs/` |
| `Orcivo/.git` | diretório vazio; não é um repositório funcional |
| Git disponível | 2.52.0.windows.1; script `git-subtree` presente, mas a invocação padrão falhou no diagnóstico do PowerShell por `GIT_EXEC_PATH`; split funcional não foi executado nesta auditoria |

Os “131 commits” mencionados anteriormente são os commits exclusivos de `gsd/phase-1` em relação ao `master` local. O histórico total que altera o caminho Orcivo possui 161 commits: 30 já alcançáveis por `master` e 131 exclusivos da branch.

O `git status` sem pathspec tenta percorrer partes do perfil do usuário e encontra diretórios sem permissão. Toda validação deve usar `-C C:/Users/Encryptedx` e, quando possível, `-- Desktop/orcivo` até o repositório independente estar ativo.

Arquivos locais de ambiente existem por nome em backend, web, mobile e Prisma. Seus valores não foram lidos. O `.gitignore` atual cobre `.env`, `.env.*`, dependências, builds, caches, certificados e `.decision/`.

## 2. Riscos

| ID | Risco | Impacto | Controle obrigatório |
|---|---|---|---|
| GIT-R01 | Executar `subtree split` no Git pai e criar refs/cache nele | Contamina o repositório do perfil | Executar somente em clone local isolado. |
| GIT-R02 | Capturar apenas os 131 commits exclusivos e perder os 30 ancestrais que também alteram Orcivo | Histórico incompleto | Baseline e comparação usam 161 commits que tocam o path. |
| GIT-R03 | `subtree split` reescrever hashes e simplificar merges | Contagem diferente apesar de conteúdo correto | Preservar bundle completo do Git pai, comparar logs normalizados e exigir tree hash idêntico. |
| GIT-R04 | Perder os 159 não rastreados | Perda de handoff, docs e planejamento recente | Snapshot verificável e transporte por allowlist depois da extração. |
| GIT-R05 | Copiar `.env`, tokens, chaves ou certificados para o novo histórico | Incidente de segurança | Backup privado separado; nunca colocar esses arquivos no staging Git. |
| GIT-R06 | Copiar `node_modules`, `.next`, `dist`, caches e builds | Repositório enorme e não reproduzível | Excluir artefatos regeneráveis e reconstruí-los pelo lockfile. |
| GIT-R07 | Copiar prompts/transcripts do handoff como documentação | Viola as regras de autoria | Revisão humana da allowlist; excluir arquivos de prompt/transcript/log. |
| GIT-R08 | Caminhos longos do pnpm falharem no Windows | Backup ou inventário parcial | Não percorrer `node_modules`; usar destino curto e `robocopy` com log/exit code. |
| GIT-R09 | Trocar o diretório antes de validar a cópia | Indisponibilidade ou rollback difícil | Candidato paralelo; cutover somente após todos os gates. |
| GIT-R10 | Manter Orcivo rastreado simultaneamente pelo Git pai e pelo Git novo | Status ambíguo e commits no repo errado | Destacar o path do índice pai em commit próprio, somente depois de backup e remote privado confirmados. |
| GIT-R11 | Criar remote público ou embutir token na URL | Exposição do código/credencial | Criar repositório privado; usar Credential Manager/SSH agent; nunca token na URL. |
| GIT-R12 | Alterar line endings ou arquivos durante a cópia | Tree hash divergente | Comparar o tree extraído antes de transportar não rastreados ou formatar arquivos. |
| GIT-R13 | Comando nativo falhar e PowerShell 5.1 continuar | Backup/split/push parcial tratado como sucesso | Wrapper fail-fast obrigatório para Git, ACL, package e Docker; `robocopy` valida faixa 0–7. |
| GIT-R14 | Script `git-subtree` existir, mas a invocação estar quebrada | Extração não acontece ou deixa candidato inválido | Validar `GIT_EXEC_PATH`; split só no clone e qualquer exit bloqueia; fallback requer decisão/aprovação. |

## 3. Estratégia escolhida

Usar **extração em clone isolado com `git subtree split`**, com `GIT_EXEC_PATH` explicitamente validado e fail-fast, seguida de candidato paralelo e cutover reversível. O helper jamais é assumido funcional só por existir: o próprio split no clone é um gate. Se ele falhar, a execução para sem tocar o Git pai; `git filter-repo` só poderá virar a alternativa equivalente após nova decisão Nível B e aprovação humana para instalar/verificar a ferramenta.

1. Congelar uma janela de recuperação e confirmar que nenhum processo escreve no projeto.
2. Criar backup privado e verificável do Git pai e dos arquivos não regeneráveis do workspace.
3. Clonar o Git pai com `--no-checkout` para um diretório curto e temporário.
4. Validar `GIT_EXEC_PATH` e rodar `git subtree split --prefix=Desktop/orcivo` somente nesse clone; qualquer exit não zero aborta.
5. Clonar o branch extraído como candidato standalone e remover o remote local temporário.
6. Comparar o tree hash e a lista de 432 arquivos rastreados antes de copiar qualquer não rastreado.
7. Gerar allowlist explícita para documentação, handoff e planejamento não rastreados; nunca copiar tudo às cegas.
8. Corrigir/revisar `.gitignore` no candidato antes de staging.
9. Validar histórico, árvore, ausência de segredos, instalação limpa e gates do monorepo.
10. Configurar um remote **privado** somente após aprovação; fazer o primeiro push somente após uma segunda aprovação.
11. Fazer cutover por renomeação, preservando o diretório antigo como archive; não apagar nada.
12. Depois que o standalone estiver remoto e verificável, remover o path Orcivo apenas do **índice** do Git pai em um commit normal e reversível. O Git pai não é removido.

`git filter-repo` não está instalado no baseline e fica apenas como fallback formal se `subtree split` falhar ou não reproduzir a árvore/histórico. Essa alternativa adiciona ferramenta, exige checksum/origem verificável, nova decisão técnica Nível B e `HUMAN_APPROVAL`; não deve ser improvisada durante a janela. `git filter-branch` não é fallback aceito por causa dos riscos conhecidos de reescrita incorreta.

## 4. Comandos exatos para PowerShell

Todos os blocos abaixo são **futuros**. Os blocos que escrevem ou movem arquivos estão identificados como `HUMAN_APPROVAL`. Eles devem ser executados na mesma sessão de PowerShell 5.1+ e começar pelo bootstrap abaixo; ele transforma qualquer exit code nativo não zero em erro terminante. `robocopy` é tratado separadamente porque códigos 0–7 são sucesso/aviso documentado.

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-CheckedNative {
  param(
    [Parameter(Mandatory)] [string]$Executable,
    [Parameter()] [object[]]$NativeArgs = @()
  )

  $output = & $Executable @NativeArgs
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "$Executable falhou com exit code $exitCode. Execução interrompida."
  }
  $output
}

function git { Invoke-CheckedNative -Executable 'git.exe' -NativeArgs $args }
function corepack { Invoke-CheckedNative -Executable 'corepack.cmd' -NativeArgs $args }
function npx { Invoke-CheckedNative -Executable 'npx.cmd' -NativeArgs $args }
function docker { Invoke-CheckedNative -Executable 'docker.exe' -NativeArgs $args }
function icacls { Invoke-CheckedNative -Executable 'icacls.exe' -NativeArgs $args }
```

Se a sessão for reiniciada, o bootstrap deve ser repetido antes de qualquer bloco.

### 4.1 Preflight somente leitura — SAFE_AUTO

```powershell
$ParentRepo = 'C:\Users\Encryptedx'
$ProjectPath = 'C:\Users\Encryptedx\Desktop\orcivo'
$SourceHead = '419d00df1833efd6f0625f389197f00cee105bc8'
$Prefix = 'Desktop/orcivo'
$ExpectedTop = 'C:/Users/Encryptedx'
$ExpectedBranch = 'gsd/phase-1'
$ExpectedTree = '6b3c57204847c606a338bb761d7cc1179019b337'
$ExpectedPathCommits = 161
$ExpectedBranchOnly = 131
$ExpectedTrackedFiles = 432
$ExpectedUntrackedCount = 159
$ExpectedUntrackedPathHash = '7329ab02b4f16bd469802a1078ba9e305386f25c916b1b92d782bbea5753a090'

$ActualTop = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-parse --show-toplevel
$ActualBranch = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo branch --show-current
$ActualHead = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-parse HEAD
$RemoteNames = @(git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo remote)
$TrackedStatus = @(git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo status --short --untracked-files=no -- $Prefix)
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo log --oneline --decorate -30 -- $Prefix
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo remote -v

$SourceTree = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-parse "${SourceHead}:$Prefix"
$SourcePathCommits = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-list --count $SourceHead -- $Prefix
$SourceBranchOnly = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-list --count master..$SourceHead -- $Prefix
$SourceFiles = @(git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo ls-tree -r --name-only "${SourceHead}:$Prefix")
$UntrackedPaths = @(git -c safe.directory=C:/Users/Encryptedx -c core.quotePath=false -C $ParentRepo ls-files --others --exclude-standard -- $Prefix)
$UntrackedBytes = [Text.Encoding]::UTF8.GetBytes((($UntrackedPaths -join "`n") + "`n"))
$UntrackedPathHash = ([BitConverter]::ToString(
  [Security.Cryptography.SHA256]::Create().ComputeHash($UntrackedBytes)
)).Replace('-', '').ToLowerInvariant()

if (($ActualTop -replace '\\', '/') -ne $ExpectedTop) { throw 'Git toplevel mudou.' }
if ($ActualBranch -ne $ExpectedBranch) { throw 'Branch mudou; refazer auditoria.' }
if ($ActualHead -ne $SourceHead) { throw 'HEAD mudou; refazer baseline e aprovação.' }
if ($RemoteNames.Count -ne 0) { throw 'Remote apareceu; revisar estratégia antes de continuar.' }
if ($TrackedStatus.Count -ne 0) { throw 'Há alteração rastreada no Orcivo; interromper.' }
if ($SourceTree -ne $ExpectedTree) { throw 'Tree do Orcivo mudou.' }
if ([int]$SourcePathCommits -ne $ExpectedPathCommits) { throw 'Contagem de commits do path mudou.' }
if ([int]$SourceBranchOnly -ne $ExpectedBranchOnly) { throw 'Contagem branch-only mudou.' }
if ($SourceFiles.Count -ne $ExpectedTrackedFiles) { throw 'Contagem de arquivos rastreados mudou.' }
if ($UntrackedPaths.Count -ne $ExpectedUntrackedCount -or
    $UntrackedPathHash -ne $ExpectedUntrackedPathHash) {
  throw 'Manifesto de paths não rastreados mudou; revisar allowlist e obter nova aprovação.'
}

[pscustomobject]@{
  SourceTree = $SourceTree
  PathCommits = $SourcePathCommits
  BranchOnlyCommits = $SourceBranchOnly
  TrackedFiles = $SourceFiles.Count
  UntrackedFiles = $UntrackedPaths.Count
  UntrackedPathHash = $UntrackedPathHash
}
```

O resultado esperado no baseline atual é tree `6b3c572...`, 161 commits no path, 131 exclusivos da branch, 432 rastreados e 159 paths não rastreados com o hash de manifesto acima. Qualquer divergência interrompe a execução; não se atualiza o SHA esperado sem nova auditoria e aprovação humana.

### 4.2 Backup privado — HUMAN_APPROVAL

O operador escolhe um volume local confiável, fora de `C:\Users\Encryptedx` e fora de qualquer pasta sincronizada. O backup de workspace pode conter `.env`; deve permanecer privado e nunca ser enviado ao Git.

```powershell
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupBase = 'D:\BackupsPrivados' # substituir por destino aprovado
$BackupRoot = Join-Path $BackupBase "orcivo-recovery-$Stamp"
$WorkspaceBackup = Join-Path $BackupRoot 'workspace-private'
$ParentBundle = Join-Path $BackupRoot 'parent-repository-all.bundle'

if ($BackupBase -like 'C:\Users\Encryptedx*') {
  throw 'O backup deve ficar fora do Git pai.'
}

New-Item -ItemType Directory -Path $WorkspaceBackup -Force | Out-Null
icacls $BackupRoot /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F"

git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo bundle create $ParentBundle --all
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo bundle verify $ParentBundle

robocopy $ProjectPath $WorkspaceBackup /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XJ /SL /NP `
  /XD node_modules .pnpm-store .next dist build out .expo .expo-shared .turbo coverage .cache web-build `
  /XF *.log *.tsbuildinfo

if ($LASTEXITCODE -gt 7) {
  throw "Backup robocopy falhou com exit code $LASTEXITCODE"
}
```

Validar sem exibir conteúdo de ambientes:

```powershell
$SecretNamePattern = '\\(\.env($|\.)|[^\\]+\.(pem|key|crt|p12|pfx|jks|p8|mobileprovision)$)'
$SkippedFilePattern = '(?i)\.(log|tsbuildinfo)$'
$SkipDirs = [System.Collections.Generic.HashSet[string]]::new(
  [System.StringComparer]::OrdinalIgnoreCase
)
@('node_modules','.pnpm-store','.next','dist','build','out','.expo','.expo-shared','.turbo','coverage','.cache','web-build') |
  ForEach-Object { [void]$SkipDirs.Add($_) }

function Get-PrunedInventory([string]$Root) {
  $rootItem = Get-Item -LiteralPath $Root
  $stack = [System.Collections.Generic.Stack[System.IO.DirectoryInfo]]::new()
  $stack.Push($rootItem)

  while ($stack.Count -gt 0) {
    $directory = $stack.Pop()
    foreach ($file in $directory.GetFiles()) {
      if ($file.Name -notmatch $SkippedFilePattern) {
        [pscustomobject]@{
          Relative = $file.FullName.Substring($rootItem.FullName.Length + 1)
          Length = $file.Length
          SensitiveName = [bool]($file.FullName -match $SecretNamePattern)
        }
      }
    }
    foreach ($child in $directory.GetDirectories()) {
      $isLink = [bool]($child.Attributes -band [IO.FileAttributes]::ReparsePoint)
      if (-not $isLink -and -not $SkipDirs.Contains($child.Name)) {
        $stack.Push($child)
      }
    }
  }
}

$SourceInventory = @(Get-PrunedInventory $ProjectPath | Sort-Object Relative)
$BackupInventory = @(Get-PrunedInventory $WorkspaceBackup | Sort-Object Relative)

$BackupDiff = @(Compare-Object $SourceInventory $BackupInventory -Property Relative,Length,SensitiveName)
if ($BackupDiff.Count -ne 0) {
  throw "Backup diverge do inventário podado em $($BackupDiff.Count) entrada(s)."
}
```

`Compare-Object` deve produzir saída vazia. Não gerar hash de `.env` ou certificados no terminal. Para os demais arquivos, um manifesto SHA-256 pode ser criado dentro do próprio backup privado.

### 4.3 Clone isolado e extração — HUMAN_APPROVAL

```powershell
$RecoveryRoot = "C:\tmp\orcivo-git-recovery-$Stamp"
$ParentClone = Join-Path $RecoveryRoot 'parent-history'
$Candidate = "C:\Users\Encryptedx\Desktop\orcivo-recovered-$Stamp"

if (Test-Path -LiteralPath $RecoveryRoot) { throw 'RecoveryRoot já existe.' }
if (Test-Path -LiteralPath $Candidate) { throw 'Candidate já existe.' }

New-Item -ItemType Directory -Path $RecoveryRoot | Out-Null
git clone --no-local --no-checkout $ParentRepo $ParentClone
git -C $ParentClone switch --detach $SourceHead
git -C $ParentClone status --short

$env:GIT_EXEC_PATH = git --exec-path
$GitSetup = Join-Path $env:GIT_EXEC_PATH 'git-sh-setup'
$GitSubtree = Join-Path $env:GIT_EXEC_PATH 'git-subtree'
if (-not (Test-Path -LiteralPath $GitSetup -PathType Leaf) -or
    -not (Test-Path -LiteralPath $GitSubtree -PathType Leaf)) {
  throw 'git-subtree não passou no preflight; parar e abrir fallback aprovado.'
}

git -C $ParentClone subtree split `
  --prefix=$Prefix `
  --branch=orcivo-extracted `
  $SourceHead

$SplitTip = git -C $ParentClone rev-parse orcivo-extracted
if ([string]::IsNullOrWhiteSpace($SplitTip)) { throw 'Split não produziu tip.' }
git clone --branch orcivo-extracted --single-branch $ParentClone $Candidate
git -C $Candidate branch -m main
git -C $Candidate remote remove origin
```

Esses comandos criam refs apenas no clone descartável. Não criam branch, cache de subtree ou commit no Git pai. A configuração explícita de `GIT_EXEC_PATH` contorna somente o diagnóstico quebrado observado; não transforma falha de split em sucesso. O wrapper aborta imediatamente em qualquer exit não zero.

### 4.4 Comparar árvore e histórico — SAFE_AUTO após a cópia

```powershell
$CandidateTree = git -C $Candidate rev-parse 'HEAD^{tree}'
$CandidateFiles = @(git -C $Candidate ls-tree -r --name-only HEAD)
$CandidateCommits = git -C $Candidate rev-list --count HEAD

[pscustomobject]@{
  SourceTree = $SourceTree
  CandidateTree = $CandidateTree
  TreesMatch = ($SourceTree -eq $CandidateTree)
  SourceTrackedFiles = $SourceFiles.Count
  CandidateTrackedFiles = $CandidateFiles.Count
  SourcePathCommits = $SourcePathCommits
  CandidateCommits = $CandidateCommits
}

if ($SourceTree -ne $CandidateTree) { throw 'Tree hash divergente; bloquear cutover.' }
if ($SourceFiles.Count -ne $CandidateFiles.Count) { throw 'Contagem de arquivos divergente.' }
$FileDiff = @(Compare-Object $SourceFiles $CandidateFiles)
if ($FileDiff.Count -ne 0) { throw 'Lista de paths rastreados diverge.' }
if ([int]$CandidateCommits -ne [int]$SourcePathCommits) {
  throw 'Contagem de commits extraídos diverge; análise e nova aprovação obrigatórias.'
}

git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo `
  log --reverse --format='%aI|%an|%s' $SourceHead -- $Prefix |
  Set-Content -LiteralPath (Join-Path $RecoveryRoot 'source-path-history.txt') -Encoding UTF8

git -C $Candidate log --reverse --format='%aI|%an|%s' |
  Set-Content -LiteralPath (Join-Path $RecoveryRoot 'candidate-history.txt') -Encoding UTF8

$HistoryDiff = @(Compare-Object `
  (Get-Content (Join-Path $RecoveryRoot 'source-path-history.txt')) `
  (Get-Content (Join-Path $RecoveryRoot 'candidate-history.txt')))
if ($HistoryDiff.Count -ne 0) {
  throw 'Histórico normalizado diverge; bloquear cutover e investigar.'
}
```

Tree hash, lista/contagem de arquivos e histórico normalizado são gates absolutos desta estratégia. Se commits diferirem, o script para; qualquer aceitação de simplificação de merges exige análise documentada e nova aprovação, não continuação automática. O bundle do Git pai continua sendo a prova completa e o rollback.

### 4.5 Classificar e transportar não rastreados — HUMAN_APPROVAL

Gerar primeiro uma lista, sem copiar:

```powershell
git -c safe.directory=C:/Users/Encryptedx -c core.quotePath=false -C $ParentRepo `
  status --short --untracked-files=all -- $Prefix |
  Set-Content -LiteralPath (Join-Path $RecoveryRoot 'untracked-source.txt') -Encoding UTF8
```

Allowlist inicial a revisar:

- `docs/PROJECT_RESUME_AUDIT.md` e `docs/GIT_RECOVERY_PLAN.md`;
- documentos mestres `FRONTEND_DESIGN_MASTER`, `OPERATIONS_UI_MISSING_SPECS` e planejamento atualizado;
- handoff canônico, screens, UI kits e runbooks, sem prompts/transcripts duplicados;
- fase `.planning/phases/03.1-estabilizacao-pos-fase-3/` e revisão visual relevante;
- documentação do decision consultant;
- `apps/site/next-env.d.ts`, após confirmar consistência com o web.

Itens não autorizados para transporte ao histórico:

- `.bg-shell/`, `.gsd/`, `.decision/` e scratchpads;
- `.gitignore.autonomy.append.txt` sem revisão linha a linha;
- `node_modules`, builds, caches, logs e outputs gerados;
- `.env` reais, chaves, certificados ou credenciais;
- arquivos chamados prompt, transcript ou logs de agentes;
- duplicatas brutas em `uploads/` sem justificar uma fonte canônica.

O array abaixo é o manifesto executável inicial. Ele inclui as referências canônicas e exclui `uploads/` e `PROMPT.md`; toda inclusão/remoção exige revisão humana e novo hash do manifesto.

```powershell
$ApprovedRoots = @(
  'docs\PROJECT_RESUME_AUDIT.md',
  'docs\GIT_RECOVERY_PLAN.md',
  'docs\FRONTEND_DESIGN_MASTER.md',
  'docs\OPERATIONS_UI_MISSING_SPECS.md',
  'docs\PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md',
  'docs\design-handoff\orcivo-design-system\README.md',
  'docs\design-handoff\orcivo-design-system\SKILL.md',
  'docs\design-handoff\orcivo-design-system\android-frame.jsx',
  'docs\design-handoff\orcivo-design-system\colors_and_type.css',
  'docs\design-handoff\orcivo-design-system\design-canvas.jsx',
  'docs\design-handoff\orcivo-design-system\assets',
  'docs\design-handoff\orcivo-design-system\preview',
  'docs\design-handoff\orcivo-design-system\screens',
  'docs\design-handoff\orcivo-design-system\ui_kits',
  'docs\handoff\COMPONENTS.md',
  'docs\handoff\README.md',
  'docs\handoff\RULES.md',
  'docs\handoff\tokens.css',
  'docs\handoff\tokens.json',
  'docs\runbooks',
  'docs\screens',
  'docs\ui_kits',
  'tools\decision-consultant\README.md',
  'apps\site\next-env.d.ts',
  '.planning\phases\03.1-estabilizacao-pos-fase-3'
)

$ApprovedFiles = foreach ($RelativeRoot in $ApprovedRoots) {
  $FromRoot = Join-Path $ProjectPath $RelativeRoot
  if (-not (Test-Path -LiteralPath $FromRoot)) { throw "Allowlist ausente: $RelativeRoot" }
  $item = Get-Item -LiteralPath $FromRoot
  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $FromRoot -File -Recurse | ForEach-Object {
      $_.FullName.Substring($ProjectPath.Length + 1)
    }
  } else {
    $RelativeRoot
  }
}
$ApprovedFiles = @($ApprovedFiles | Sort-Object -Unique)

$ApprovedManifest = foreach ($Relative in $ApprovedFiles) {
  $From = Join-Path $ProjectPath $Relative
  [pscustomobject]@{
    Relative = $Relative
    Length = (Get-Item -LiteralPath $From).Length
    Sha256 = (Get-FileHash -LiteralPath $From -Algorithm SHA256).Hash
  }
}
$ManifestPath = Join-Path $RecoveryRoot 'approved-transport-manifest.csv'
$ApprovedManifest | Export-Csv -LiteralPath $ManifestPath -NoTypeInformation -Encoding UTF8

foreach ($entry in $ApprovedManifest) {
  $From = Join-Path $ProjectPath $entry.Relative
  $To = Join-Path $Candidate $entry.Relative
  New-Item -ItemType Directory -Path (Split-Path $To -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $From -Destination $To -Force
  $CopiedHash = (Get-FileHash -LiteralPath $To -Algorithm SHA256).Hash
  if ($CopiedHash -ne $entry.Sha256) { throw "Hash diverge após copiar: $($entry.Relative)" }
}
```

O manifesto fica no diretório privado de recuperação, fora do candidato. Não ampliar `$ApprovedRoots` por wildcard e não incluir `docs/design-handoff/**/uploads`, `docs/handoff/PROMPT.md` ou qualquer outra fonte duplicada sem curadoria explícita.

### 4.6 Revisar `.gitignore`, staging e reprodutibilidade — HUMAN_APPROVAL

```powershell
git -C $Candidate status --short --untracked-files=all
git -C $Candidate status --ignored --short

$MustBeIgnored = @(
  'apps/backend/.env',
  'apps/backend/.env.test',
  'apps/web/.env.local',
  'apps/mobile/.env',
  'prisma/.env',
  'node_modules',
  'apps/web/.next',
  'apps/backend/dist',
  '.decision/QUESTION.md'
)
foreach ($Relative in $MustBeIgnored) {
  $IgnoreEvidence = @(git -C $Candidate check-ignore -v -- $Relative)
  if ($IgnoreEvidence.Count -eq 0) { throw "Path obrigatório não está ignorado: $Relative" }
}
```

Revisar o diff da `.gitignore`; incluir somente regras necessárias. Depois, fazer staging somente dos arquivos expandidos do manifesto e da `.gitignore` revisada:

```powershell
$AllowedStage = @('.gitignore') + $ApprovedFiles
foreach ($Relative in $AllowedStage) {
  git -C $Candidate add -- $Relative
}

$Staged = @(git -C $Candidate diff --cached --name-only)
$AllowedSet = [System.Collections.Generic.HashSet[string]]::new(
  [System.StringComparer]::OrdinalIgnoreCase
)
$AllowedStage | ForEach-Object { [void]$AllowedSet.Add(($_ -replace '\\', '/')) }
foreach ($Relative in $Staged) {
  if (-not $AllowedSet.Contains(($Relative -replace '\\', '/'))) {
    throw "Path staged fora do manifesto: $Relative"
  }
}

$ForbiddenPath = '(?i)(^|/)(\.env($|\.)|\.decision|\.gsd|\.bg-shell|node_modules|dist|build|\.next|\.expo|\.turbo|coverage|[^/]*(prompt|transcript|agent[-_]?log)[^/]*|[^/]+\.(pem|key|crt|p12|pfx|jks|p8|mobileprovision))($|/)'
$ForbiddenContent = '(?im)(-----BEGIN [A-Z ]*PRIVATE KEY-----|(?<![A-Za-z0-9])(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})(?![A-Za-z0-9])|(OPENAI_API_KEY|ASAAS_API_KEY|JWT_SECRET|MINIO_SECRET_KEY)\s*[:=]\s*["'']?(?!<|example|placeholder|changeme|invalid|\$\{|\$env:)[A-Za-z0-9_./+=:@-]{16,}|postgres(?:ql)?://(?!invalid:invalid@|user:password@|orcivo:orcivo@|<)[^:\s]+:[^@\s]+@)'
$AuthorshipMarkers = @(
  ('Generated with ' + 'Claude'),
  ('Co-authored-by ' + 'Claude'),
  ('AI' + '-generated'),
  ('created by ' + 'AI')
)
$Violations = [System.Collections.Generic.List[string]]::new()
foreach ($Relative in $Staged) {
  $Normalized = $Relative -replace '\\', '/'
  if ($Normalized -match $ForbiddenPath) { $Violations.Add($Relative); continue }
  $FullPath = Join-Path $Candidate $Relative
  if ((Get-Item -LiteralPath $FullPath).Length -le 5MB -and
      [IO.Path]::GetExtension($FullPath) -match '^\.(md|txt|json|ya?ml|js|mjs|cjs|ts|tsx|jsx|css|html|svg)$') {
    $Content = [IO.File]::ReadAllText($FullPath)
    if ($Content -match $ForbiddenContent -or
        @($AuthorshipMarkers | Where-Object { $Content.Contains($_) }).Count -gt 0) {
      $Violations.Add($Relative)
    }
  }
}
if ($Violations.Count -ne 0) {
  $ViolationPaths = ($Violations | Sort-Object -Unique) -join ', '
  throw "Scanner bloqueou path(s) staged: $ViolationPaths"
}

git -C $Candidate diff --cached --name-status
git -C $Candidate diff --cached --check
```

O scanner só informa paths, nunca o valor encontrado. O staging deve ser cancelado se incluir qualquer arquivo local/sensível, prompt/transcript ou artefato gerado. Não usar `git add -A` durante a recuperação.

Instalação e validações do candidato, ainda sem remote. O script raiz atual de lint pode editar arquivos e a suite agregada pode acionar cleanup; portanto não executar `pnpm lint` nem `pnpm test` nesta wave:

```powershell
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

Falhas conhecidas do baseline não podem ser ocultadas. Wave 0 prova recuperação e registra a baseline; testes backend de integração/E2E ficam explicitamente não executados até o harness isolado de P08. As correções pertencem às waves seguintes.

### 4.7 Commit local de recuperação — HUMAN_APPROVAL

Somente arquivos aprovados e não rastreados devem entrar neste commit. O histórico extraído já está em `HEAD`.

```powershell
git -C $Candidate status --short
git -C $Candidate diff --cached --stat
git -C $Candidate commit -m "docs: add recovery and stabilization baseline"
```

Nenhum push nesta etapa.

### 4.8 Configurar remote privado — HUMAN_APPROVAL

Pré-condições humanas:

1. repositório remoto criado como **privado**;
2. proprietário/organização e nome confirmados;
3. autenticação via Git Credential Manager ou SSH agent;
4. nenhuma credencial embutida na URL;
5. aprovação separada para o primeiro push.

```powershell
$RemoteUrl = Read-Host 'Informe a URL do repositório privado, sem token'
if ($RemoteUrl -match 'https://[^/]+:[^@]+@') { throw 'URL contém credencial.' }

git -C $Candidate remote add origin $RemoteUrl
git -C $Candidate remote -v
git -C $Candidate ls-remote origin
```

Depois da aprovação específica de push:

```powershell
git -C $Candidate push -u origin main
git -C $Candidate status --short --branch
git -C $Candidate ls-remote --heads origin main
```

### 4.9 Cutover sem exclusão — HUMAN_APPROVAL

Somente após remote privado, push verificado, tree/history gates e backup confirmados:

```powershell
$Archive = "C:\Users\Encryptedx\Desktop\orcivo-pre-recovery-$Stamp"

if (Test-Path -LiteralPath $Archive) { throw 'Archive já existe.' }
if (-not (Test-Path -LiteralPath $Candidate)) { throw 'Candidate ausente.' }

Rename-Item -LiteralPath $ProjectPath -NewName (Split-Path $Archive -Leaf)
Rename-Item -LiteralPath $Candidate -NewName 'orcivo'
```

Restaurar apenas os arquivos locais necessários, sem mostrar conteúdo e sem staging:

```powershell
$LocalOnly = @(
  'apps\backend\.env',
  'apps\backend\.env.test',
  'apps\web\.env.local',
  'apps\mobile\.env',
  'prisma\.env'
)

foreach ($Relative in $LocalOnly) {
  $From = Join-Path $Archive $Relative
  $To = Join-Path $ProjectPath $Relative
  if (Test-Path -LiteralPath $From) {
    Copy-Item -LiteralPath $From -Destination $To
  }
}

git -C $ProjectPath status --short --ignored
```

### 4.10 Destacar Orcivo do índice do Git pai — HUMAN_APPROVAL

Este é o último passo e só ocorre quando o standalone está validado e remoto. Não remove o Git pai nem apaga o projeto; cria um commit normal no pai que deixa de rastrear o subdiretório. A estratégia escolhida para o perfil local é registrar `/Desktop/orcivo/` em `.git/info/exclude` do Git pai, sem alterar o `.gitignore` versionado de todo o perfil.

```powershell
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo status --short -- $Prefix
$ParentGitDir = git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rev-parse --absolute-git-dir
$ParentExclude = Join-Path $ParentGitDir 'info\exclude'
$ExcludeRule = '/Desktop/orcivo/'

$ExistingExclude = @(Get-Content -LiteralPath $ParentExclude -ErrorAction SilentlyContinue)
if ($ExistingExclude -notcontains $ExcludeRule) {
  Add-Content -LiteralPath $ParentExclude -Value $ExcludeRule -Encoding UTF8
}

git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo rm --cached -r -- $Prefix

# Revisar: somente entradas de Desktop/orcivo podem aparecer como removidas do índice.
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo diff --cached --name-status -- $Prefix
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo diff --cached --stat -- $Prefix
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo check-ignore -v -- Desktop/orcivo/package.json
```

Depois da revisão:

```powershell
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo commit -m "chore: detach Orcivo into standalone repository"
$ParentPathStatus = @(git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo status --short --untracked-files=all -- $Prefix)
if ($ParentPathStatus.Count -ne 0) {
  throw 'Git pai ainda reporta o standalone após detach; não encerrar a wave.'
}
```

Não rebasear, resetar, limpar ou reescrever o histórico pai. O exclude local deve entrar no inventário privado de rollback; clones futuros do Git pai exigirão regra equivalente ou `.gitignore` versionado aprovado em tarefa separada.

## 5. Pontos que exigem aprovação humana

| Gate | Ação |
|---|---|
| H1 | Escolher destino/ACL do backup privado, especialmente por conter arquivos locais de ambiente. |
| H2 | Criar clone de recuperação, branch de subtree e candidato paralelo. |
| H3 | Aprovar a allowlist dos 159 não rastreados e as fontes canônicas do handoff. |
| H4 | Aprovar qualquer ajuste de `.gitignore`, staging e commit local de baseline. |
| H5 | Criar/configurar remote privado. |
| H6 | Autorizar o primeiro push. |
| H7 | Autorizar cutover por renomeação dos diretórios. |
| H8 | Autorizar restauração/cópia de `.env` locais para o novo diretório. |
| H9 | Autorizar a remoção do path apenas do índice do Git pai e o commit correspondente. |
| H10 | Autorizar instalação/verificação e uso de `git filter-repo` se o subtree não passar nas validações; exige também decisão Nível B. |

Force push, reset hard, clean, exclusão de diretórios/branches, reescrita do Git pai, remote público e token em URL permanecem proibidos.

## 6. Validações antes e depois

### Antes da extração

- `git rev-parse --show-toplevel` retorna `C:/Users/Encryptedx`.
- Branch/HEAD são `gsd/phase-1` e `419d00d...`.
- Remote está vazio.
- Orcivo possui 0 alterações rastreadas, 432 arquivos em HEAD e tree `6b3c572...`.
- Baseline registra 161 commits que tocam o path e 131 exclusivos da branch.
- Lista dos 159 não rastreados e tamanho aproximado são arquivados.
- Bundle do Git pai passa em `git bundle verify`.
- Snapshot privado tem mesma lista/tamanho de arquivos não regeneráveis.

### Antes do cutover

- Tree do candidato é exatamente igual ao subtree de origem antes dos arquivos novos.
- Contagem rastreada inicial é 432.
- Histórico normalizado foi comparado; qualquer diferença está explicada e aprovada.
- Nenhum `.env`, certificado, segredo, prompt, transcript, dependência ou build está staged.
- `.gitignore` cobre todos os locais sensíveis/gerados.
- Remote, se configurado, é privado e não contém credencial na URL.
- Commit remoto de `main` corresponde ao commit local aprovado.
- O diretório original e o bundle continuam intactos.

### Depois do cutover

```powershell
git -C C:\Users\Encryptedx\Desktop\orcivo rev-parse --show-toplevel
git -C C:\Users\Encryptedx\Desktop\orcivo branch --show-current
git -C C:\Users\Encryptedx\Desktop\orcivo status --short --branch
git -C C:\Users\Encryptedx\Desktop\orcivo remote -v
git -C C:\Users\Encryptedx\Desktop\orcivo log --oneline --decorate -30
git -C C:\Users\Encryptedx\Desktop\orcivo fsck --full
```

Esperado: toplevel igual ao próprio Orcivo, branch `main`, nenhum arquivo sensível rastreado, remote privado correto, histórico presente e `git fsck` sem corrupção.

O Git pai deve continuar íntegro:

```powershell
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx rev-parse --show-toplevel
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx log -1 --oneline
git -c safe.directory=C:/Users/Encryptedx -C C:\Users\Encryptedx status --short -- Desktop/orcivo
```

## 7. Plano de rollback

### Antes do cutover

Não há rollback de produção: o diretório original nunca foi alterado. Apagar cópias temporárias não faz parte do procedimento automático; o operador apenas abandona o candidato e mantém o backup para análise.

### Durante o cutover

Se a segunda renomeação falhar:

```powershell
if (-not (Test-Path -LiteralPath $ProjectPath) -and (Test-Path -LiteralPath $Archive)) {
  Rename-Item -LiteralPath $Archive -NewName 'orcivo'
}
```

### Depois do cutover, antes de destacar do Git pai

```powershell
$FailedCandidate = "C:\Users\Encryptedx\Desktop\orcivo-recovery-failed-$Stamp"
Rename-Item -LiteralPath $ProjectPath -NewName (Split-Path $FailedCandidate -Leaf)
Rename-Item -LiteralPath $Archive -NewName 'orcivo'
```

Nada é apagado. O remote standalone e o bundle continuam disponíveis.

### Depois do commit que destaca o índice pai

O rollback correto é um novo commit de `git revert`, nunca reset/rewrite:

```powershell
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo log -1 --oneline
# Após confirmar que o último commit é exatamente o detach:
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo revert <SHA_DO_COMMIT_DETACH>

$ExcludeLines = @(Get-Content -LiteralPath $ParentExclude)
$ExcludeLines | Where-Object { $_ -ne $ExcludeRule } |
  Set-Content -LiteralPath $ParentExclude -Encoding UTF8
git -c safe.directory=C:/Users/Encryptedx -C $ParentRepo status --short -- $Prefix
```

Esse passo também exige aprovação humana. A remoção da regra local acompanha o revert para que o estado anterior seja restaurado. O archive não deve ser removido até pelo menos uma validação completa e um backup remoto comprovado.

## 8. Arquivos que não podem ser copiados ou versionados

### Nunca versionar

- `.env`, `.env.*` reais; somente `*.env.example`/`.env.local.example` revisados.
- `*.pem`, `*.key`, `*.crt`, `*.p12`, `*.pfx`, `*.jks`, `*.p8`, `*.mobileprovision`.
- tokens em URLs, credenciais Docker/MinIO/Asaas, cookies ou dumps.
- `node_modules/`, `.pnpm-store/`, `dist/`, `build/`, `.next/`, `out/`, `.expo/`, `.turbo/`, `coverage/`, `.cache/`.
- logs, dumps, uploads de runtime e volumes Docker.
- `.decision/`, `.gsd/runtime/`, `.bg-shell/`, `.codex/`, `.claude/`, `.agents/` e scratchpads locais.
- prompts, transcripts, logs de agentes ou arquivos com marcas de autoria automatizada.
- o `.git` vazio atual ou o `.git` do Git pai como conteúdo do novo repositório.

### Copiar apenas para backup privado, nunca para staging

- arquivos reais de ambiente necessários ao desenvolvimento local;
- certificados/chaves locais, se existirem e se o responsável aprovar;
- logs necessários a forensics, desde que permaneçam fora do repositório.

### Exigem curadoria antes de versionar

- duplicatas em `docs/design-handoff/**/uploads/`;
- `docs/handoff/PROMPT.md` e arquivos `*PROMPT*` — padrão é excluir;
- `.gitignore.autonomy.append.txt`;
- arquivos gerados como `next-env.d.ts` — comparar com o workspace equivalente antes de decidir;
- revisões/auditorias antigas que afirmam conclusão sem evidência.

## 9. Configuração posterior do remote privado

1. Criar o repositório vazio na conta/organização correta, com visibilidade **Private**.
2. Não criar README, license ou `.gitignore` remoto que introduza histórico concorrente.
3. Preferir SSH agent ou Git Credential Manager. Nunca salvar token na URL ou em arquivo do projeto.
4. Adicionar `origin` somente no candidato já validado.
5. Confirmar `git remote -v` e `git ls-remote origin` antes do push.
6. Autorizar e executar um push normal de `main`; force push é proibido.
7. Confirmar no provedor que a visibilidade continua privada e que o SHA de `main` coincide.
8. Configurar proteção/CI/secrets apenas em tarefas posteriores e com aprovações próprias; não faz parte da recuperação.

## 10. Como provar que o histórico foi preservado

Preservação não é apenas “o log parece longo”. A evidência mínima é:

1. **Prova integral:** bundle `--all` do Git pai validado e armazenado fora do pai.
2. **Prova de origem:** registrar branch, HEAD, primeiro/último commit, 161 commits no path e 131 exclusivos da branch.
3. **Prova de conteúdo:** `HEAD:Desktop/orcivo` e `HEAD^{tree}` do candidato possuem o mesmo tree hash antes do transporte.
4. **Prova de arquivos:** os dois lados possuem os mesmos 432 paths rastreados iniciais.
5. **Prova semântica:** comparar logs normalizados por data/autor/assunto e investigar qualquer diferença causada por merges/simplificação.
6. **Prova de marcos:** localizar no candidato os assuntos dos commits de fundação, Fase 1, Fase 2A, Fase 3 e os commits finais de 07/06.
7. **Prova de integridade:** `git fsck --full` verde no candidato e, depois, no standalone.
8. **Prova remota:** `main` local e `refs/heads/main` remoto apontam para o mesmo SHA aprovado.
9. **Prova de working tree:** arquivos locais permitidos aparecem ignorados, e `git status --short` não mostra perdas ou staging acidental.
10. **Prova de rollback:** archive original e bundle continuam presentes até sign-off humano posterior.

Se tree hash ou lista de arquivos divergirem, a recuperação para. Se apenas a contagem de commits divergir, a recuperação permanece bloqueada até uma análise de merges demonstrar que nenhum estado do subtree foi perdido.

---

**Decisão de execução:** pendente de aprovação humana.
**Comandos executados nesta elaboração:** bootstrap e preflight 4.1 somente leitura, além das inspeções da auditoria; nenhum bloco `HUMAN_APPROVAL`, split, cópia, alteração de ref/índice, remote, commit ou push foi executado.
