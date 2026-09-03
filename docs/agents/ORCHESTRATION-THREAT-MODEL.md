# Orchestration threat model — PRAGMATIC V2.1

**Status: `THREAT_MODEL = LOCAL_TRUSTED_HOST` (OWNER decision, 2026-09-03).**

This supersedes every earlier "spine" threat model. The four prior adversarial
reviews (V1 supervisor, V2 spine reviews 1/3/4, V2.1 architecture review) were
run against an _implicit_ zero-trust model in which the owner's own Windows host
and user account were part of the attack surface. The owner has now fixed the
model explicitly, and it is much smaller.

Machine-readable copy: `.orchestration/v2/config.v2.json` → `threatModel` /
`acceptedRisks`. Closeout: `.planning/reviews/PRAGMATIC-V2.1-CLOSEOUT.md`.

---

## 1. What is trusted

`LOCAL_TRUSTED_HOST` — the owner's local Windows 11 machine **and** the Windows
user account the harness runs as are **TRUSTED**:

- the Windows OS and the user account
- the owner, and the developer shell they run
- the NTFS filesystem and its ACLs
- the host Docker daemon
- the local git install and the owner's git / provider credentials on disk

## 2. Explicitly OUT OF SCOPE

`HOST_SAME_USER_ATTACKER = OUT_OF_SCOPE`. Any attack whose execution depends
**only** on _"a process with the same access as the trusted owner manually
alters the host's artifacts, credentials or in-memory state"_ is
**`ACCEPTED_RISK_OUT_OF_SCOPE`**. It is documented, not pretended-fixed, and it
does not block this harness:

- malware already compromising the Windows user
- an arbitrary malicious process running as that same user
- the owner locally tampering with authority artifacts
- a compromised Administrator / root
- a compromised kernel
- a compromised host Docker daemon
- a local attacker with full access to the owner's profile and credentials

`ZONE_A_D_SEPARATE_WINDOWS_IDENTITIES = NOT_REQUIRED`. Zone A (supervisor) and
Zone D (integrator) may run as the same Windows user. The harness will **not**:
create a Windows user, create a dedicated Windows service, require SID
separation, require a TPM, use CNG as a security boundary, or add a credential
broker between Zone A and Zone D.

## 3. What the harness DOES protect against (in scope)

The harness is robust against what the LLM agents and candidate-controlled code
do wrong, and against operational failure:

| #   | In scope                                                                              |
| --- | ------------------------------------------------------------------------------------- |
| 1   | Claude/Codex changing something outside the task scope                                |
| 2   | prompt injection (untrusted spec/acceptance/diff never enter the instruction channel) |
| 3   | agent hallucination                                                                   |
| 4   | an agent attempting a dangerous action                                                |
| 5   | unauthorized modification of policy / planning                                        |
| 6   | accidental secret exposure in agent output or artifacts                               |
| 7   | an LLM ever holding a push credential                                                 |
| 8   | duplicate task / exactly-once publication                                             |
| 9   | stale task                                                                            |
| 10  | stale candidate                                                                       |
| 11  | a review of bytes different from those published                                      |
| 12  | a secret published by accident                                                        |
| 13  | crash                                                                                 |
| 14  | supervisor restart                                                                    |
| 15  | context-window exhaustion                                                             |
| 16  | quota exhaustion                                                                      |
| 17  | provider rate limit                                                                   |
| 18  | provider outage                                                                       |
| 19  | provider auth temporarily unavailable                                                 |
| 20  | a bad review                                                                          |
| 21  | Claude and Codex disagreeing                                                          |
| 22  | an ambiguous integration                                                              |
| 23  | a push whose local result diverges from origin                                        |
| 24  | repeated execution after something was already published                              |
| 25  | a Level C task executed without the owner                                             |
| 26  | automatic generation of product/commercial changes without owner approval             |

## 4. How each in-scope threat is contained

| Threat                                         | Mechanism (V2 spine + V2.1 layer)                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| out-of-scope change (1)                        | contract frozen before dispatch, outside the worktree, content-hashed; the real changed-file list is matched against the declared scope + protected paths; violation → `POLICY_BLOCK`, never integrated (`contract.ps1`).                                                 |
| prompt injection (2)                           | untrusted spec / acceptance / diff transported **out of band** as SHA-256-bound read-only files; the verdict comes only from one schema-validated JSON envelope (`review-envelope.ps1`, `contract.ps1`).                                                                  |
| hallucination / dangerous action (3,4)         | declarative verification profiles + independent review + bounded correction loop; the executor can touch only the current task scope.                                                                                                                                     |
| policy / planning change (5)                   | `.planning/`, `.orchestration/`, `scripts/orchestration/`, `CLAUDE.md`, `AGENTS.md`, policy docs and CI workflows are protected paths; a grant must be an exact allowlist member (`contract.ps1` H3-05).                                                                  |
| secret exposure (6,12)                         | one canonical secret library drives streaming redaction, sanitize-before-write, a pre-publication recursive scan (UTF-8/UTF-16LE/UTF-16BE, committed candidate blob bytes), and a final sweep; a hit → `SECRET_LEAK_BLOCKED`, no push (`lib-v2.ps1`, `integrate.ps1`).    |
| LLM with push credential (7)                   | only the deterministic **integrator** (`integrate.ps1`) ever runs `git push`; the executor/reviewer are the external CLIs with no push path; Wave 0 W0-01.                                                                                                                |
| duplicate / exactly-once (8,24)                | hash-chained monotonic ledger; a `PUBLISHED` / `QUARANTINED` task version is terminal and can never be re-dispatched (`ledger.ps1`); Wave 0 W0-08 / W0-21.                                                                                                                |
| stale task / candidate / review (9,10,11)      | every attestation binds `{taskVersionId, baseSHA, headSHA, treeHash, diffHash, specHash, acceptanceHash, configHash, verificationProfileHash, verificationDefinitionHash, contractHash, createdAt}`; recomputed on read; latest authoritative result wins (`attest.ps1`). |
| crash / restart (13,14)                        | monotonic ledger + **run generation fencing** (`fence.ps1`): recovery must _prove the prior run inactive_ → fence old generation → RECOVERED → new generation; undeterminable → `WAITING_HUMAN` / `QUARANTINED`.                                                          |
| context exhaustion (15)                        | detected from the control channel; NOT quota, NEVER failover; a structured continuation checkpoint (closed whitelist, no hidden reasoning) + fresh invocation on the same lineage (`continuation.ps1`).                                                                   |
| quota / rate limit / outage / auth (16-19)     | failure classification from the CLI control channel only (`classify.ps1`); provider classes → `Get-FailoverDecision` (`providers.ps1`); both unavailable → `WAITING_PROVIDER`, durable wait record, backoff poll, automatic resume, survives restart.                     |
| bad review / disagreement (20,21)              | opposite-provider review preferred; `CROSS_PROVIDER_REQUIRED` for CRITICAL/LEVEL_C; escalate rather than review with the same provider (`router.ps1` `Select-Reviewer`).                                                                                                  |
| ambiguous integration / divergent push (22,23) | durable `INTEGRATION_INTENT` before any publication; after any uncertain exit → **fetch remote, compare SHA/tree/ancestry, reconstruct truth**; never "NOT_PUBLISHED" while remote truth is unknown → `AMBIGUOUS_REMOTE` (`intent.ps1`); origin is the final truth.       |
| Level C without owner (25)                     | classifier + task graph flag Level C (owner gate / risk C / persistent DB migration / production); ledger → `WAITING_HUMAN`, not auto-dispatchable (`taskclass.ps1`, `taskgraph.ps1`, `preflight.ps1`).                                                                   |
| auto product change (26)                       | product backlog stops at `OWNER_APPROVAL`; no code path approves a batch; agents may DISCOVER / TRIAGE / PROPOSE only.                                                                                                                                                    |

## 5. Containment mechanism for the agents

Implementer / test-runner / reviewer should run in a **disposable Docker Linux
container** whenever real execution is technically possible. Docker here exists
to **contain the agents and candidate-controlled code**, not to defend the
trusted Windows host from itself. The worktree / clone is a **scope boundary**,
not claimed as a host security boundary.

`CANDIDATE-CONTROLLED CODE NEVER RUNS IN THE SUPERVISOR'S PRIVILEGED PROCESS`
— pnpm/npm scripts, build, test, lint, typecheck, compiler plugins, generated
executables, hooks, any candidate-origin code run in an untrusted runner. The
supervisor selects checks, invokes the runner, receives a structured result,
validates the bindings, and decides state. Verification profiles are declarative
in-process builtins only; a task cannot supply a command (Wave 0 W0-02).

## 6. Accepted risks (former review findings)

| id    | supersedes                     | why it is out of scope                                                                                                                                                                                                                                |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR-01 | C-05                           | verified process-tree kill on timeout — a runaway child of a timed-out agent on the trusted same-user host is a reliability nuisance, not privilege escalation. Kept: direct-child kill + lease quarantine + run marked non-integratable.             |
| AR-02 | C-06                           | OS-enforced host isolation of executor/reviewer/integrator by SID/service — the executor already runs as the trusted owner; Docker Linux is the containment mechanism when execution is possible.                                                     |
| AR-03 | H4-01, M4-03                   | a coherently self-hashed rewrite of a frozen contract file / closed-world schema — requires writing `.orchestration/v2/contracts/*.json` on the trusted host. Contract immutability still blocks the LLM, which cannot reach the authority namespace. |
| AR-04 | H4-05, M4-02                   | in-process authority-token / lease-quarantine-recovery forgery from a hostile same-user process — requires code execution as the owner. Cheap hardening (atomic recovery, token hashing, `createdAt` in the attestation hash) is kept.                |
| AR-05 | Zone A/D SID, H4-02 junction   | single Windows SID for Zone A/D; NTFS junction redirection of the authority's own out-of-band files.                                                                                                                                                  |
| AR-06 | Docker daemon launch authority | trusted host Docker daemon.                                                                                                                                                                                                                           |

## 7. In-scope fixes applied at V2.1 (not accepted, actually fixed)

| id   | finding                                                                   | fix                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | H4-06 — post-push test seam falsified remote truth                        | `INTEGRATION_INTENT` + `Resolve-RemoteTruth` is the authority; remote SHA/tree/ancestry, fetched, decides `PUBLISHED` / `NOT_PUBLISHED_CONFIRMED` / `AMBIGUOUS_REMOTE`. Wave 0 W0-20/21. |
| F-02 | M4-04 — terminal failure not always durably recorded                      | integration failure paths append a durable ledger event; intent state machine records every transition.                                                                                  |
| F-03 | H4-04 — unhashed `createdAt` chose the authoritative attestation          | `createdAt` is inside `_AttestationCore` now.                                                                                                                                            |
| F-04 | H4-03 (partial) — UTF-16 no-BOM evasion + committed-candidate not scanned | secret scan decodes UTF-8/UTF-16LE/UTF-16BE and scans committed candidate blob bytes (`config.redaction.scanEncodings`, `scanCommittedCandidateTree`).                                   |

## 8. Roles

| Role                 | May touch `main` | May push        | Secrets       | Notes                                                                               |
| -------------------- | ---------------- | --------------- | ------------- | ----------------------------------------------------------------------------------- |
| SUPERVISOR (Zone A)  | no               | no              | policy-scoped | scheduler, classifier, router, lifecycle, gates, batches — deterministic            |
| IMPLEMENTER (Zone B) | no               | no              | none          | disposable clone/worktree; only the current task scope; Docker Linux when possible  |
| TEST RUNNER          | no               | no              | none          | any candidate-controlled code runs here, never in the supervisor                    |
| REVIEWER (Zone C)    | no               | no              | none          | opposite provider preferred; receives task/candidate/diff only, no hidden reasoning |
| INTEGRATOR (Zone D)  | yes (only role)  | yes (only role) | minimal       | deterministic, no LLM; `origin` is publication truth                                |

Zone A and Zone D may be the same Windows user (`AR-05`). The separation that
matters — B/C cannot seal or publish, only D publishes, `origin` wins — is
enforced by the code paths, not by OS identity.

## 9. No more security whack-a-mole

When a finding appears, the question is: _does it violate `LOCAL_TRUSTED_HOST`
and the in-scope list above?_ If not → `ACCEPTED_RISK_OUT_OF_SCOPE`, documented.
If yes → fix it. The harness is not being turned into zero-trust enterprise
infrastructure. The goal is **reliable autonomy for developing Orcivo**.
