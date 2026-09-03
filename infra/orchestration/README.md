# infra/orchestration — disposable agent / test runner composition

`THREAT_MODEL = LOCAL_TRUSTED_HOST`. This composition **contains the untrusted
implementer agent and any candidate-controlled build/test code**. It is not a
defence of the trusted Windows host against itself (see
`docs/agents/ORCHESTRATION-THREAT-MODEL.md`).

## Files

| file                                                         | role                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `Dockerfile.agent-runner`                                    | disposable Debian-slim + Node 22 + pnpm + git image                                                          |
| (driver) `scripts/orchestration/v2/runner-docker.ps1`        | `Test-DockerPreflight`, `Invoke-DockerRunner` — builds the `docker run` invocation with the invariants below |
| (config) `.orchestration/v2/config.v2.json` → `pilot.docker` | knobs (image name, caps, network)                                                                            |

## Invariants (enforced by `runner-docker.ps1`, not the Dockerfile)

- the candidate clone is mounted **read-only**; the agent writes to a separate
  `--tmpfs` overlay and a bind-mounted `out/` directory
- the **test runner** stage runs with `--network none`
- **no** `-v /var/run/docker.sock` (the container cannot reach the host daemon)
- **no** HOME / USERPROFILE mount; **no** secrets in the environment
- non-root user (`runner`, uid 10001), `--rm`, `--cpus`, `--memory`,
  `--pids-limit`, `--read-only` root fs where possible, `--security-opt no-new-privileges`
- the harness passes the **exact** command; the image only provides the toolchain

## When is Docker actually required?

- **Synthetic pilot** (`pilot.runnerMode = inproc-fake`, the default): **not
  required** — the fake agent runs no untrusted code.
- **A real `PB1-*` task under the current verification profiles (A/B/C)**: **not
  required** — the profiles are declarative structural builtins
  (`no-merge-markers`, `no-large-binary`); they never run `pnpm build` / `pnpm
test`. The implementer agent under `LOCAL_TRUSTED_HOST` may run `host-trusted`
  (AR-02), and candidate build/test still never runs in the supervisor process
  (Wave 0 W0-02).
- **Required** once a verification profile is extended to execute
  candidate-controlled build / test — then that profile pins `runnerMode =
docker` and this composition is the boundary.

## Bringing it live (owner action — smallest necessary)

1. Start **Docker Desktop** (the Linux engine) — it is installed (29.2.1) but not
   running. This is not a settings change.
2. First run only: `docker build -f infra/orchestration/Dockerfile.agent-runner
-t orcivo-agent-runner:v1 infra/orchestration` — pulls `node:22-bookworm-slim`
   (~75 MB, no credential).

Then `powershell -File scripts/orchestration/v2/pilot.ps1 docker-preflight`
reports `READY`, and a verification profile may set `runnerMode = docker`.
