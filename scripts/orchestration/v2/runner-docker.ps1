<#
runner-docker.ps1 - disposable Docker Linux runner for the implementer agent and
                    candidate-controlled build/test code.  (PRAGMATIC V2.1, PARTE 3/4/5)

THREAT_MODEL = LOCAL_TRUSTED_HOST. Docker here CONTAINS the untrusted agent /
candidate code; it is not a defence of the trusted host against itself.

Enforced at `docker run` time:
  - candidate clone mounted READ-ONLY
  - test-runner stage: --network none
  - no -v /var/run/docker.sock
  - no HOME / USERPROFILE mount, no secrets in env
  - non-root, --rm, --cpus/--memory/--pids-limit, --security-opt no-new-privileges

The pilot NEVER builds an image, pulls a base image, or starts the daemon on its
own. `Test-DockerPreflight` reports exactly what the owner must do.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

function Get-PilotDockerConfig { return (Get-V2Config).pilot.docker }

# --- preflight: is the composition runnable right now? ---------------------
function Test-DockerPreflight {
    $cfg = Get-PilotDockerConfig
    $repo = Get-AuthorityRoot   # the real repo that ships the Dockerfile, even when cwd is a fixture
    $result = [ordered]@{
        ready             = $false
        dockerCli         = $false
        daemonRunning     = $false
        image             = "$($cfg.image)"
        imagePresent      = $false
        baseImage         = "$($cfg.baseImage)"
        dockerfile        = (Join-Path $repo ($cfg.dockerfile -replace '/', '\'))
        dockerfilePresent = $false
        neededActions     = @()
        checkedAt         = (Get-Date).ToUniversalTime().ToString('o')
    }

    $result.dockerfilePresent = (Test-Path -LiteralPath $result.dockerfile)
    if (-not $result.dockerfilePresent) { $result.neededActions += "restore $($cfg.dockerfile)" }

    $cli = Get-Command 'docker' -ErrorAction SilentlyContinue
    if (-not $cli) {
        $result.neededActions += "install Docker (owner action - Docker Desktop is expected)"
        return $result
    }
    $result.dockerCli = $true

    $ver = ''
    try { $ver = (& docker version --format '{{.Server.Version}}' 2>&1) -join ' ' } catch { }
    if ($ver -match 'Cannot connect|dockerDesktopLinuxEngine|daemon is not running|error during connect|open //') {
        $result.daemonRunning = $false
        $result.neededActions += "start Docker Desktop (the Linux engine) - installed but not running. Not a settings change."
        return $result
    }
    $result.daemonRunning = $true
    $result.serverVersion = ($ver.Trim())

    $img = ''
    try { $img = (& docker images --format '{{.Repository}}:{{.Tag}}' "$($cfg.image)" 2>&1) -join ' ' } catch { }
    $result.imagePresent = ($img -match [regex]::Escape("$($cfg.image)"))
    if (-not $result.imagePresent) {
        $result.neededActions += "one-time: docker build -f $($cfg.dockerfile) -t $($cfg.image) infra/orchestration  (pulls $($cfg.baseImage), ~75MB, no credential)"
    }

    $result.ready = ($result.dockerCli -and $result.daemonRunning -and $result.imagePresent -and $result.dockerfilePresent)
    return $result
}

# --- the containment invariants as an explicit, testable argv builder -----
# Returns the `docker run` argument list for a given stage. Pure - does not run.
function Get-DockerRunArgs {
    param(
        [Parameter(Mandatory)][ValidateSet('implement', 'test', 'review')][string]$Stage,
        [Parameter(Mandatory)][string]$CandidateDir,   # host path, mounted read-only
        [Parameter(Mandatory)][string]$OutDir,         # host path, bind-mounted rw
        [string[]]$Command = @('sh', '-lc', 'true'),
        [string]$Name = ''
    )
    $cfg = Get-PilotDockerConfig
    if (-not $Name) { $Name = "orcivo-runner-$Stage-$((New-Nonce).Substring(0, 8))" }

    $a = New-Object System.Collections.Generic.List[string]
    foreach ($x in @('run', '--rm', '--name', $Name,
            '--user', "$($cfg.user)",
            '--security-opt', 'no-new-privileges',
            '--cap-drop', 'ALL',
            '--cpus', "$($cfg.cpus)",
            '--memory', "$($cfg.memory)",
            '--pids-limit', "$($cfg.pidsLimit)",
            '--read-only',
            '--tmpfs', '/work:rw,size=1g,mode=1777',
            '--tmpfs', '/tmp:rw,size=256m',
            '--mount', "type=bind,src=$CandidateDir,dst=/candidate,ro=true",
            '--mount', "type=bind,src=$OutDir,dst=/out",
            '--workdir', '/candidate',
            '--env', 'CI=1', '--env', 'HOME=/home/runner')) { $a.Add($x) }

    # the TEST stage has NO network; implement/review may need the model API
    if ($Stage -eq 'test') { $a.Add('--network'); $a.Add('none') }
    else { $a.Add('--network'); $a.Add('bridge') }

    # NEVER mount the docker socket, NEVER mount HOME (asserted by Test-DockerRunArgsSafe)

    $a.Add("$($cfg.image)")
    foreach ($c in @($Command)) { $a.Add($c) }
    return @($a.ToArray())
}

# static safety assertion over an argv - used by the pilot / Wave 0 selftest.
function Test-DockerRunArgsSafe {
    param([Parameter(Mandatory)][string[]]$RunArgs)
    $joined = ($RunArgs -join ' ')
    $problems = @()
    if ($joined -match 'docker\.sock|/var/run/docker') { $problems += 'mounts the docker socket' }
    if ($joined -match 'USERPROFILE|\\Users\\|dst=/root\b') { $problems += 'mounts a HOME / user profile directory' }
    if ($joined -notmatch '--user\s+\S') { $problems += 'no non-root --user' }
    if ($joined -notmatch '--rm(\s|$)') { $problems += 'not --rm (not disposable)' }
    if ($joined -notmatch 'no-new-privileges') { $problems += 'missing --security-opt no-new-privileges' }
    if ($joined -notmatch 'dst=/candidate,ro=true') { $problems += 'candidate not mounted read-only' }
    if ($joined -notmatch '--memory\s+\S') { $problems += 'missing --memory cap' }
    if ($joined -notmatch '--cpus\s+\S') { $problems += 'missing --cpus cap' }
    if ($joined -notmatch '--pids-limit\s+\S') { $problems += 'missing --pids-limit cap' }
    foreach ($k in @('AWS_SECRET', 'GITHUB_TOKEN', 'GH_TOKEN', 'ANTHROPIC_API', 'OPENAI_API', 'DATABASE_URL', 'ORCIVO_SECRET')) {
        if ($joined -match [regex]::Escape($k)) { $problems += "leaks a secret-shaped env var ($k)" }
    }
    return [ordered]@{ ok = ($problems.Count -eq 0); problems = @($problems) }
}

# --- run (only reached when Test-DockerPreflight.ready) --------------------
function Invoke-DockerRunner {
    param(
        [Parameter(Mandatory)][ValidateSet('implement', 'test', 'review')][string]$Stage,
        [Parameter(Mandatory)][string]$CandidateDir,
        [Parameter(Mandatory)][string]$OutDir,
        [Parameter(Mandatory)][string[]]$Command,
        [int]$TimeoutSec = 900
    )
    $pf = Test-DockerPreflight
    if (-not $pf.ready) {
        return [ordered]@{ ok = $false; stage = $Stage; reason = "docker composition not ready: $($pf.neededActions -join ' ; ')"; preflight = $pf }
    }
    $runArgs = Get-DockerRunArgs -Stage $Stage -CandidateDir $CandidateDir -OutDir $OutDir -Command $Command
    $safe = Test-DockerRunArgsSafe -RunArgs $runArgs
    if (-not $safe.ok) {
        return [ordered]@{ ok = $false; stage = $Stage; reason = "refusing unsafe docker run: $($safe.problems -join '; ')" }
    }
    $exe = (Get-Command 'docker').Source
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    $r = Invoke-NativeCaptured -Exe $exe -Arguments $runArgs -WorkingDirectory (Get-RepoRoot) `
        -StdoutLog (Join-Path $OutDir "docker-$Stage.stdout.log") -StderrLog (Join-Path $OutDir "docker-$Stage.stderr.log") -TimeoutSec $TimeoutSec
    return [ordered]@{
        ok          = ($r.exitCode -eq 0 -and -not $r.timedOut)
        stage       = $Stage; exitCode = $r.exitCode; timedOut = $r.timedOut
        durationSec = $r.durationSec; stdout = $r.stdout; stderr = $r.stderr
    }
}

# --- Wave 0 / pilot selftest: static invariant proof (no daemon needed) ---
function Test-DockerCompositionSelftest {
    $fail = @()
    $repo = Get-AuthorityRoot

    $df = Join-Path $repo (((Get-PilotDockerConfig).dockerfile) -replace '/', '\')
    if (-not (Test-Path $df)) { $fail += "Dockerfile missing: $df" }
    else {
        $t = Get-Content -Raw -LiteralPath $df
        if ($t -notmatch 'useradd .*runner') { $fail += 'Dockerfile does not create a non-root user' }
        if ($t -match '(?im)^\s*USER\s+root\s*$') { $fail += 'Dockerfile ends as USER root' }
        if ($t -notmatch '(?im)^\s*USER\s+runner') { $fail += 'Dockerfile does not switch to USER runner' }
    }

    $ia = Get-DockerRunArgs -Stage 'implement' -CandidateDir 'C:\tmp\cand' -OutDir 'C:\tmp\out' -Command @('sh', '-lc', 'echo hi')
    $ta = Get-DockerRunArgs -Stage 'test' -CandidateDir 'C:\tmp\cand' -OutDir 'C:\tmp\out' -Command @('sh', '-lc', 'pnpm test')

    $si = Test-DockerRunArgsSafe -RunArgs $ia
    if (-not $si.ok) { $fail += "implement argv unsafe: $($si.problems -join '; ')" }
    $st = Test-DockerRunArgsSafe -RunArgs $ta
    if (-not $st.ok) { $fail += "test argv unsafe: $($st.problems -join '; ')" }

    if (($ta -join ' ') -notmatch '--network none') { $fail += 'test stage is not --network none' }
    if (($ia -join ' ') -match '--network none') { $fail += 'implement stage should not be --network none' }
    if (($ia -join ' ') -match 'docker\.sock') { $fail += 'implement argv references the docker socket' }

    $pf = Test-DockerPreflight
    if ($null -eq $pf.ready) { $fail += 'preflight returned no ready flag' }
    if (-not $pf.ready -and @($pf.neededActions).Count -eq 0) { $fail += 'preflight not ready but lists no needed actions' }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail); preflight = $pf }
}
