# Orchestration V2.1 — trust architecture

> ## SUPERSEDED IN PART — `THREAT_MODEL = LOCAL_TRUSTED_HOST` (2026-09-03)
>
> The OWNER has fixed the threat model. The zero-trust-of-the-host framing that
> most of this document is written to is **no longer the target**. Read this
> document for the _directional_ trust split (Zone B/C cannot seal or publish;
> Zone D alone publishes; `origin` wins over local push belief; candidate
> identity is content-addressed; the implementer never holds a push credential;
> candidate code never runs in the supervisor). Everything below that assumes
> `HOST_SAME_USER_ATTACKER` is in scope — separate Windows SIDs, a credential
> broker between Zone A and Zone D, TPM/CNG boundaries, defence against a
> coherently self-hashed rewrite of a frozen authority artifact — is now
> **`ACCEPTED_RISK_OUT_OF_SCOPE`**.
>
> Authoritative now:
>
> - `docs/agents/ORCHESTRATION-THREAT-MODEL.md` — the pragmatic threat model
> - `.planning/reviews/PRAGMATIC-V2.1-CLOSEOUT.md` — what was built + accepted risks
> - `.orchestration/v2/config.v2.json` → `threatModel` / `acceptedRisks`
>
> `ZONE_A_D_SEPARATE_WINDOWS_IDENTITIES = NOT_REQUIRED`.
> `PRINCIPAL_BOUNDARY = disposable Docker Linux when execution is technically
possible; the worktree is a scope boundary, not a host security boundary.`

---

Status (historical): **ARCHITECTURE / THREAT-MODEL SESSION ONLY. NOT IMPLEMENTED. NO PASS.**

Baseline: `3829442c7999a1cb18431ea3656266c94a6083eb` (`3829442 docs(orchestration):
fourth independent spine security review`).

Trigger: `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW-4.md` —
`VERDICT = REQUEST_CHANGES`, `SECURITY_SPINE_REVIEW = FAIL`,
`NEXT_REMEDIATION_STAGE_ALLOWED = NO`.

This document does **not** change runtime, tests, config, or planning state. It
does not run a task, does not touch P03/T12/T13, does not touch a persistent DB,
and does not do adaptive/model routing or skills. It defines the trust boundary
V2.1 must enforce so the next remediation is a boundary change, not another patch.

Companion: `ORCHESTRATION-V2.1-AUTHORITY-SCHEMAS.md` (closed schemas, referenced
throughout as _Schemas §n_).

---

## 0. Owner decisions (APPROVED — 2026-09-02)

The owner has approved the direction of this architecture with the following
binding decisions. They are recorded here as settled; the rest of the document is
written to them.

```
PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS
WINDOWS_DEDICATED_ACCOUNTS  = FALLBACK_ONLY
MAESTRO_SPIKE_TARGET        = tinhtran24/maestro
TRUST_CORE                  = CUSTOM_V2_1
MAESTRO_TRUST_ROLE          = UNTRUSTED_ORCHESTRATION_SUBSTRATE
```

### D1 — Principal boundary

- **Zones B and C run in Docker Desktop / Linux containers** as the principal
  security boundary. This is `PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS`.
- **Dedicated Windows accounts are `FALLBACK_ONLY`** — used only if a Claude or
  Codex incompatibility inside the container is proven and not reasonably
  solvable.
- **Docker alone is not assumed to satisfy C-06.** The concrete container
  configuration must be **proven adversarially** in Wave 0 (§13.0) before it is
  trusted.
- Mandatory container properties (all must hold for both Zone B and Zone C
  containers):

  | #   | Property                                                                      |
  | --- | ----------------------------------------------------------------------------- |
  | 1   | disposable (`--rm`, no reuse across runs)                                     |
  | 2   | independent clone / workspace only                                            |
  | 3   | **never** mount the authority root (`.orchestration/v2_1/**`, authority repo) |
  | 4   | **never** mount the primary `.git`                                            |
  | 5   | **never** mount the full `USERPROFILE` / `HOME`                               |
  | 6   | **never** mount Git / SSH credentials                                         |
  | 7   | **never** receive the push credential                                         |
  | 8   | **never** receive the seal key                                                |
  | 9   | **never** mount `docker.sock`                                                 |
  | 10  | no `--privileged`                                                             |
  | 11  | minimal capabilities (`--cap-drop ALL`, add back none unless proven needed)   |
  | 12  | `--security-opt no-new-privileges` when supported                             |
  | 13  | minimal filesystem / volumes                                                  |
  | 14  | reviewer container is read-only (`--read-only` rootfs + ro candidate mount)   |
  | 15  | implementer container has no path to the authority                            |
  | 16  | no integration credential of any kind inside the LLM zone                     |

- **Zone A** = deterministic supervisor + the **sole seal authority**.
- **Zone D** = deterministic integrator + the **sole push authority**.
- The **seal key and the push credential are different secrets, stored
  separately**, held by different principals (A and D respectively).

### D2 — Maestro

- The "Maestro" to evaluate is specifically **`https://github.com/tinhtran24/maestro`**
  (`MAESTRO_SPIKE_TARGET = tinhtran24/maestro`).
- Maestro is a **candidate only** for: session orchestration, worker lifecycle,
  workspace management, Claude/Codex adapters, reviewer coordination, CI/review
  feedback loops, observability/cockpit.
- Maestro is **`UNTRUSTED_ORCHESTRATION_SUBSTRATE`** — never automatically trusted
  for: the seal key, the push credential, task authority, attestation authority,
  the security ledger, human-approval authority, or C-06 isolation.
- **Worktree isolation is not OS security isolation** and does not count toward
  the principal boundary.
- Nothing is installed or migrated yet.

### Still explicitly NOT decided / NOT declared

`C-06 PASS`, `READY_FOR_CANARY`, `READY_TO_IMPLEMENT_V2_1`, real-task execution,
H-10 promotion, real-provider smoke. The next step is an **independent Codex
review of this V2.1 architecture, before any implementation.**

---

## Background — why this is not a patch list

Four independent reviews have now rejected this work (V1, first V2 spine, second
remediation, third remediation). The third remediation added ~30 regression
tests and reached V1 8/8 + V2 108/108; the fourth review still reproduced six
HIGH failures (H4-01…H4-06) and four MEDIUM (M4-01…M4-04) **in controls the
remediation reports declared PASS**.

The pattern across all four reviews is one root cause:

> **Every "root of trust" in V2 is an unkeyed SHA-256 over bytes a same-user
> process can rewrite.** `contractHash`, the ledger hash chain + sealed head, the
> attestation integrity hash, the quarantine marker, the review manifest, the
> secret-scan target, the fetch observation — all of them are recomputable by
> exactly the actor they are meant to constrain.

A hash is only an integrity control against an actor who cannot recompute it.
The V2 adversary — a same-user process that can edit files, recompute SHA-256,
dot-source PowerShell, open absolute paths, mutate files after hashing, reach the
Git common dir, and manipulate temp files — can recompute all of them. So the
controls are, at best, tamper-_evident to an honest reader_ and provide **no
tamper-resistance** against the modelled adversary.

V2.1 therefore has exactly two kinds of real root of trust available on this
machine:

1. **The Git remote (`origin`).** Its refs are authenticated by a push
   credential the executor role does not hold. Remote SHAs are the one fact the
   executor cannot rewrite.
2. **A different OS principal.** A separate Windows account, a container, or a VM
   has its own security context. A key or capability held by that principal, and
   never exposed to the executor principal, is something the executor cannot
   forge.

Everything else in V2.1 hangs off those two.

---

## 1. THREAT MODEL

### 1.1 Assets (unchanged from V2, tightened)

| #   | Asset                                                                             | Why it matters                                                                        |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A1  | `origin/main` and its history                                                     | the published product; a bad publish ships to the team                                |
| A2  | `.planning/`, `CLAUDE.md`, `AGENTS.md`, `docs/*POLICY*`, `.github/workflows/`     | policy & autonomy authority; changing these changes what the harness is allowed to do |
| A3  | `scripts/orchestration/**`, `.orchestration/**`                                   | the harness itself                                                                    |
| A4  | authoritative acceptance tests (`**/*.isolation.spec.ts`, `prisma/schema.prisma`) | the definition of "correct"                                                           |
| A5  | provider credentials, the Git push credential, the V2.1 authority seal key        | capability to publish / to forge authority                                            |
| A6  | "this task ran exactly once and what shipped is what was reviewed"                | the core end-to-end guarantee                                                         |
| A7  | the append-only truth (ledger + attestation lineage + lease authority log)        | crash/replay correctness                                                              |

### 1.2 Adversary (the one this document must defeat)

**Same-user local process with the executor/reviewer role's reach.** Concretely
able to:

- read and write any file the developer user can (including all of
  `.orchestration/**`, temp dirs, and `.git/**`);
- compute SHA-256 and any unkeyed hash the harness computes;
- dot-source or import any PowerShell in the repo and call its functions
  directly (bypassing `spine.ps1`);
- open absolute paths, create junctions / reparse points / hardlinks;
- modify a file _after_ it has been hashed but _before_ it is consumed (TOCTOU);
- write loose objects and update refs in the **shared Git object store / common
  dir** (this is what a `git worktree` executor can already do);
- create, rename, delete and race temp files and lock/marker files;
- run concurrent processes to race any non-atomic sequence.

**Not modelled** (out of scope for V2.1, as for V2): kernel compromise, admin
escalation, physical access, supply-chain compromise of git/PowerShell/Node,
malicious Anthropic/OpenAI infrastructure, the developer themselves acting
maliciously at the console.

### 1.3 What the adversary is trying to do

1. Get unreviewed or malicious content onto `origin/main` with a valid-looking
   attestation trail (A1, A6).
2. Retrofit authority: widen scope, add a protected-path grant, weaken the
   verification profile, drop a gate or a dependency, under the same task version
   (H4-01, A2/A4/A6).
3. Make a negative review/check disappear behind an older positive one (H4-04).
4. Publish a secret to `origin` while the gate reports clean (H4-03).
5. Reset or race lease/quarantine so two integrators run at once (H4-05).
6. Make durable local state disagree with `origin` — claim "not published" when
   it was, or "published" when it was not (H4-06, M4-04).
7. Replay an old approval against a new candidate (H4-02).

### 1.4 STRIDE summary of the fourth-review findings

| Finding                                            | Spoof | Tamper | Repud. | Info | DoS | EoP |
| -------------------------------------------------- | ----- | ------ | ------ | ---- | --- | --- |
| H4-01 self-hashed contract retrofits authority     |       | ●      |        |      |     | ●   |
| H4-02 review manifest/data TOCTOU + replay         | ●     | ●      |        | ●    |     |     |
| H4-03 secret scan reads worktree not candidate     |       | ●      |        | ●    |     |     |
| H4-04 unhashed `createdAt` picks the winner        |       | ●      | ●      |      |     | ●   |
| H4-05 quarantine recovery unauth/replay/non-atomic | ●     | ●      |        |      | ●   | ●   |
| H4-06 runtime fault seams falsify remote truth     |       | ●      | ●      |      |     |     |
| M4-01 JSON dup keys / singleton-array coercion     |       | ●      |        |      |     |     |
| M4-02 fetch authority caller-mutable               | ●     |        |        |      |     |     |
| M4-03 contract/index no closed schema              |       | ●      |        |      |     |     |
| M4-04 integration fails without durable record     |       |        | ●      |      |     |     |

---

## 2. TRUST BOUNDARIES

V2.1 defines **three trust zones** and one external authority.

```
        ┌─────────────────────────────────────────────────────────────┐
        │  ZONE A — AUTHORITY  (supervisor principal)                  │
        │  • holds the authoritySeal key (Schemas §1)                  │
        │  • holds NOTHING an LLM produced as trusted input            │
        │  • deterministic PowerShell only; no LLM, no MCP, no plugins │
        │  writes: task-authority-manifest, candidate-descriptor,      │
        │          review-request, attestation lineage + head,         │
        │          ledger events, lease-authority log, gate records,   │
        │          fetch-observation, run-manifest                     │
        └───────────────┬─────────────────────────────┬───────────────┘
                        │ sealed manifest / request   │ validated attestation
                        │ read-only candidate blobs   │ lineage + candidate
                        ▼                             ▼
   ┌────────────────────────────┐        ┌────────────────────────────────┐
   │ ZONE B — IMPLEMENTATION     │        │ ZONE D — INTEGRATION           │
   │ (implementer principal)     │        │ (integrator principal)         │
   │ IMPLEMENTER (LLM) + SCOUT   │        │ deterministic; no LLM          │
   │ • disposable CLONE (own .git)│       │ • the ONLY holder of the push  │
   │ • no target-branch write    │        │   credential                  │
   │ • no push credential        │        │ • consumes candidate +        │
   │ • no authority artifacts    │        │   sealed attestation lineage  │
   │ • no planning/policy write  │        │ • performs push + remote      │
   │ • network deny / allowlist  │        │   reconciliation, writes      │
   │ • filesystem allowlist      │        │   integration-evidence        │
   └────────────────────────────┘        └────────────────────────────────┘
   ┌────────────────────────────┐
   │ ZONE C — REVIEW            │         ┌────────────────────────────────┐
   │ (reviewer principal)       │         │ EXTERNAL — origin (Git remote) │
   │ REVIEWER (LLM)             │         │ authenticated by push cred;    │
   │ • fresh disposable profile │         │ its refs are the only fact the │
   │ • read-only candidate blobs│         │ executor cannot rewrite        │
   │ • NO MCP / memory / plugins│         └────────────────────────────────┘
   │   / hooks / user config    │
   │ • no repo / authority write│
   └────────────────────────────┘
```

**The boundary that matters.** Zones B and C run code driven by an LLM and by
untrusted task text. They must run **as a principal that Zone A's seal key is not
readable by, and that does not hold the push credential.** If B/C run as the same
OS principal as A, with the same file ACLs, then — by the §1.2 adversary
definition — B/C can read the seal key and forge Zone A artifacts, and every
control in this document collapses. **This is the C-06 dependency, and it is
load-bearing** (see §2a).

**Realisation (owner decision D1).** Zones B and C are **Docker Linux containers**
(one per run, `--rm`); the container is the principal. Zones A and D run as the
normal developer user on the host — acceptable _because_ the LLM zones are in
containers, so the §1.2 adversary (the executor) is no longer a same-user host
process. The seal key (Zone A) and push credential (Zone D) live in
host-side stores that no container mounts. Docker is not assumed sufficient —
Wave 0 (§13.0) proves the container cannot reach either secret or the authority
tree.

Zone D is deterministic and holds the push credential; it must be a principal the
LLM zones cannot inject into. It can share the host principal with Zone A (both
are "trusted, non-LLM") but uses a **separate** credential store, or be its own
principal.

`origin` is the external authority for **publication truth only**. It is not
trusted for task authority (an attacker who somehow moved `origin` still cannot
produce a sealed manifest).

### 2a. DECISION — must C-06 move before the authority spine?

**The question, precisely:** can H4-01 / H4-02 / H4-05 be fixed with _real_
guarantees against the §1.2 adversary while C-06 (OS-enforced executor/reviewer
isolation) stays fully deferred?

**Answer: NO.**

Walk it through against the modelled adversary, with no appeal to prompt rules:

- **H4-01.** The fix is "bind every authority field into identity + seal the
  manifest with a key the executor cannot use." Identity-binding alone is
  defeated: the adversary regenerates the ledger genesis, every ledger event
  hash, the sealed head, and every attestation for the _new_ taskVersionId —
  all unkeyed SHA-256. So the fix _requires_ the `authoritySeal` (Schemas §1).
  The seal is only real if its key is unreadable by the executor principal. With
  C-06 deferred, the executor principal == the developer user == can read the
  key file (or call the same DPAPI/CNG context, since user-scope DPAPI and a
  user-ACL'd CNG key are both usable by any process of that user). **No pure-crypto
  fix exists** because there is no secret the same-user adversary lacks.

- **H4-02.** The fix is "launcher-enforced no-follow stable-handle reads or
  immutable copied blobs + before/after revalidation + nonce/blob binding." The
  copied-blob and `git cat-file` approach removes the _path_ TOCTOU. But the
  adversary is also the reviewer's own process and a concurrent local process: it
  can read the sealed request, run its own "reviewer" that emits an `APPROVE`
  envelope with all the right hashes (they are in the request), and hand that
  back. The only thing stopping a self-authored `APPROVE` is that the _real_
  reviewer runs somewhere the adversary can't substitute its output — i.e. a
  different principal / process boundary. With C-06 deferred, "the reviewer" is a
  process the adversary controls.

- **H4-05.** The fix is "externally issued single-use capability bound to
  namespace/key/quarantine-hash + serialized recovery + append-only authority
  event." The capability must be _issued by someone the adversary is not_ — else
  the adversary issues its own capability event (unkeyed log) and "recovers" the
  lease. Sealed events (Schemas §7) need the seal key ⇒ same C-06 dependency.

**Conclusion.** The fourth review already observed that "some current guarantees
silently depend on C-06 and H-08." V2.1 makes that explicit: **the minimum of
C-06 required is a principal boundary such that Zone A's seal key and Zone D's
push credential are not reachable by the Zone B/C principal.** That is less than
"full network + filesystem sandboxing of the executor" (the full C-06), but it is
a hard prerequisite of the authority spine. It cannot be a prompt rule, an ACL
the same user can rewrite, or an unkeyed hash.

`C06_MUST_MOVE_BEFORE_SPINE_PASS = YES` (the principal-boundary minimum).

**Owner decision (D1):** the principal boundary is **Docker Linux containers**
for Zones B and C (`PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS`),
dedicated Windows accounts `FALLBACK_ONLY`. Docker is **not assumed** to satisfy
this minimum — the exact container configuration (§0 D1 table) is proven
adversarially in Wave 0 (§13.0) before it is trusted. Until Wave 0 passes, the
principal boundary is _designed_ but not _established_, and no spine PASS is
possible.

### 2b. DECISION — H-08 minimum

H4-05 and M4-04 are crash-integrity failures: quarantine is a deletable marker,
recovery is unauthenticated and non-atomic, and integration can return a terminal
status without persisting it. The minimum slice of H-08 that must move:

1. an **append-only, sealed authority event log** for lease / quarantine /
   recovery (Schemas §7) — quarantine state is "latest sealed event", not a file;
2. **single-use capability tokens** for recovery, issued by Zone A, bound to
   namespace + key + quarantined-record hash;
3. **serialized recovery** under the relevant lease, reconciled against live-owner
   probes and (for integration) `origin`;
4. **crash-point determinism**: for every point where the process can die
   mid-operation, the sealed logs + the immutable run manifest must determine a
   single next state (no "plausible rebuild").

`H08_MINIMUM_MUST_MOVE_BEFORE_SPINE_PASS = YES`.

The _full_ H-08 (immutable checkpoint manifest for every intermediate state,
full replay) can still follow — but not the four items above.

---

## 3. ROLE / CAPABILITY MATRIX

| Capability                                   | SUPERVISOR (A) | SCOUT (B)  | IMPLEMENTER (B)             | TESTER       | REVIEWER (C)           | INTEGRATOR (D)          |
| -------------------------------------------- | -------------- | ---------- | --------------------------- | ------------ | ---------------------- | ----------------------- |
| LLM-driven                                   | no             | yes (read) | **yes**                     | no           | **yes**                | no                      |
| Runs as principal                            | authority      | impl       | impl                        | authority¹   | review                 | integrator              |
| Read authority repo `.planning`/policy       | yes            | yes (ro)   | **no**²                     | yes (ro)     | **no**                 | yes (ro)                |
| Write `.planning` / `CLAUDE.md` / policy     | **no**³        | no         | no                          | no           | no                     | no                      |
| Read task spec / acceptance                  | yes            | yes        | via sealed manifest         | via manifest | via sealed request     | via manifest            |
| Write disposable clone / workspace           | no             | no         | **yes**                     | no           | no                     | no                      |
| Write target branch                          | no             | no         | **no**                      | no           | no                     | **no**⁴                 |
| Hold Git push credential                     | no             | no         | **no**                      | no           | no                     | **yes (only)**          |
| Hold authoritySeal key                       | **yes (only)** | no         | no                          | no           | no                     | yes⁵                    |
| Write task-authority-manifest                | **yes**        | no         | no                          | no           | no                     | no                      |
| Write candidate-descriptor                   | **yes**        | no         | no                          | no           | no                     | no                      |
| Write attestation lineage                    | **yes**        | no         | no                          | no           | no                     | integration entry only  |
| Write ledger events                          | **yes**        | no         | no                          | no           | no                     | publication events only |
| Write lease-authority log                    | **yes**        | no         | no                          | no           | no                     | no                      |
| Issue recovery capability                    | **yes**        | no         | no                          | no           | no                     | no                      |
| Write gate records                           | **yes**⁶       | no         | no                          | no           | no                     | no                      |
| Network                                      | as needed      | allowlist  | **deny / allowlist**        | none         | **deny**⁷              | origin only             |
| Filesystem                                   | authority tree | ro repo    | **allowlist (clone + tmp)** | candidate ro | **candidate blobs ro** | authority + clone ro    |
| MCP / memory / plugins / hooks / user config | none           | none       | none (task-scoped only)     | none         | **none (hard)**        | none                    |
| Docker daemon control / `docker.sock`        | no             | no         | **no**                      | no           | **no**                 | no                      |
| See IMPLEMENTER workspace / reasoning        | n/a            | n/a        | self                        | no           | **no (hard)**          | no                      |
| Terminate on timeout (Job Object)            | —              | yes        | **yes**                     | yes          | yes                    | —                       |

¹ TESTER is deterministic; it can share the authority principal or the integrator
principal. It never runs LLM code and never sees task text as instructions.
² IMPLEMENTER gets **only** the sealed `task-authority-manifest` fields it needs
(spec, acceptance, declared scope, risk) — not the `.planning` tree, not other
tasks, not policy docs.
³ SUPERVISOR _reads_ policy to freeze a manifest; it never writes A2 assets. A
protected-path change is authored by a human and only _granted_ (not performed)
via `protectedGrants`.
⁴ INTEGRATOR merges the reviewed candidate and pushes; it never creates new
content — the candidate already contains the target as a parent.
⁵ INTEGRATOR needs a seal key only to seal `integration-evidence` and the
integration attestation entry. It may use a separate integrator key so a Zone D
compromise cannot forge Zone A task authority.
⁶ Gate _records_ are durable, hash-bound, sealed. The gate _decision_ comes from
an externally authenticated human (C-04 full — still deferred; V2.1 keeps the
durable record and the spec-hash binding).
⁷ REVIEWER network denied entirely — it reads content-addressed blobs from a
local materialisation; it never needs the network.

### 3.0 Unambiguous capability statements (owner-refined)

These four statements are normative. Any implementation that violates one is
non-conformant regardless of what the matrix rows say.

- **IMPLEMENTER** has **no** seal key, **no** push credential, **no** authority
  root (read or write), and **no** Docker daemon control (`docker.sock` is never
  mounted; it cannot start, stop, or inspect containers). It has an independent
  disposable clone and task-scoped tmp only.
- **REVIEWER** has **no** seal key, **no** push credential, **no** authority
  root, **no** write access to any repo, **no** MCP servers, **no** memory
  (`ai-memory` or any persistence), **no** plugins, **no** hooks, and **no**
  IMPLEMENTER context (it never sees the implementer's workspace, reasoning,
  chat history, or scratch files — only the sealed `review-request` and
  read-only candidate blobs).
- **SUPERVISOR** holds **seal authority** (the only seal key) but **does not
  need and does not use the push credential** — it never pushes. Deterministic
  PowerShell only; never runs an LLM; never consumes task text as instructions.
- **INTEGRATOR** holds **push authority** (the only push credential) but
  **never executes an LLM** and never consumes task text. Deterministic only.
  Its seal key (if any) is a _separate_ integrator key used solely to seal
  `integration-evidence` / the integration attestation entry — it cannot seal a
  `task-authority-manifest`.

### 3.1 IMPLEMENTER — least privilege detail

- **Disposable clone, not a worktree.** `git clone --no-hardlinks
<authority> <tmp>` (or clone from a supervisor-built bare mirror). A
  `git worktree` shares `.git/objects` and `.git/worktrees/<id>` with the
  authority repo — the §1.2 adversary can write loose objects and move refs in
  the shared store. A separate clone has its own object DB; the worst it can do
  is corrupt its own throwaway clone.
- No target-branch write: the clone is checked out on `orch/<runId>`; the
  supervisor fetches the candidate **by SHA** from the clone, never by branch
  name it doesn't control.
- No authority root: the clone does not contain `.orchestration/v2*/` runtime
  (it is gitignored) and the process has no path to the authority tree.
- No Git remote credential: the clone's `origin` is the local authority repo
  (read-only), not GitHub. Push from the clone goes nowhere.
- No planning/policy write: enforced by principal ACL (Zone B principal has no
  write ACE on the authority tree) **and** by the post-candidate scope check.
- Network: `--network none` (container) or a WFP/Defender-Firewall per-principal
  outbound-deny with an allowlist for the provider API host only.
- Filesystem: container bind-mounts, or a Zone B principal whose profile is the
  only writable location + the clone.

### 3.2 REVIEWER — freshness detail

- Fresh disposable profile every review: a container from a pinned image, or a
  throwaway Windows profile dir with `CLAUDE_CONFIG_DIR` / `HOME` / `APPDATA`
  pointed at an empty tmp tree.
- No MCP servers, no `ai-memory`, no plugins, no hooks, no `settings.json`
  inheritance, no `CLAUDE.md` discovery: the reviewer is launched with an
  explicit minimal config and `--strict-mcp-config` / equivalent, cwd = an empty
  dir, not the repo.
- Input = the sealed `review-request` + a read-only materialisation of
  `candidateTree` (`git archive` unpacked to a ro dir, or served via
  `git cat-file --batch`). The reviewer reads blobs by the SHAs in the request.
- Output = one `review-envelope/2` on stdout. Provenance is captured by the
  launcher, not self-reported (Schemas §4.2).
- No write to the repo or authority: the reviewer principal has no write ACE
  anywhere except its own stdout pipe and tmp scratch.

### 3.3 INTEGRATOR — determinism detail

- Pure PowerShell, no scriptblock parameters, no LLM, no task text.
- Inputs: `candidate-descriptor`, the sealed `attestation-lineage-head` +
  the full chain, the frozen `task-authority-manifest`. It re-verifies every
  seal and every binding before acting.
- Only role with the push credential (a CNG/credential-manager entry ACL'd to
  the integrator principal).
- Publication = §10 state machine. Every ambiguous push outcome ⇒ reconcile
  against `origin` before recording a terminal state.

---

## 4. WINDOWS ISOLATION OPTIONS

Investigated on the actual machine (no installs, no config changes):

- Windows 11 Pro build 26200, **non-admin** interactive user (`Encryptedx`).
- **PowerShell 5.1 only** (no PowerShell 7).
- Git 2.52.0.windows.1. Node 24.11.1.
- **Docker Desktop present and working**, Linux-container mode, WSL2 backend
  (`docker run --rm alpine echo` succeeded).
- **WSL2 present**: `kali-linux` (running) + `docker-desktop` distro.
- **Windows Sandbox not installed** (`WindowsSandbox.exe` absent; enabling needs
  admin + reboot).
- `runas.exe` present.
- Local accounts already include **`CodexSandboxOffline`, `CodexSandboxOnline`**
  (created by the Codex CLI for its own sandboxing) and `WDAGUtilityAccount`.
- Claude CLI: `C:\Users\...\.local\bin\claude.exe` v2.1.259 — **native exe**.
- Codex CLI: `...\npm\codex` + `codex.cmd` + `codex.ps1` — **no native `.exe`**
  (a `.cmd`/`.ps1` wrapper; `Resolve-Executable -NativeOnly` would reject it —
  a real gap for using Codex as the launched reviewer/executor).
- `.orchestration/` ACL: `BUILTIN\Users:(OI)(CI)(M)` inherited — **any local user
  has Modify by default**; ACL isolation needs explicit `DENY` ACEs or moving the
  authority tree out of the inheritable location.

| Option                                                                         | Security strength (vs §1.2 adversary)                                                                                                                                   | Automation feasibility                                                                                                                                                                | Credential handling                                                                                  | Startup cost                                                                                                           | Windows compat                                    | Claude CLI                                           | Codex CLI                                        | Needs HUMAN_APPROVAL / new dep / admin                                                                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **A. Separate local Windows user account** for Zone B and Zone C (Codex-style) | **Strong** — distinct SID, distinct DPAPI, ACLs enforced by kernel; seal key ACL'd away from B/C is truly unreadable                                                    | Good — `CreateProcessWithLogonW` / scheduled task / `runas /savecred`; needs the account credential stored (DPAPI **under the supervisor account**, which is fine — supervisor ≠ B/C) | Push cred + seal key: CNG/Cred Manager ACL'd to supervisor/integrator SIDs only; B/C accounts DENied | One-time: create 2 accounts, set ACLs/DENY ACEs, move authority runtime to a supervisor-owned dir. Per run: ~s (logon) | Native; already used by Codex CLI on this box     | Runs as any user (native exe)                        | Runs as any user                                 | **HUMAN_APPROVAL + one-time admin** (account creation, ACLs). No new software.                                                   |
| **B. Docker Linux container** for Zone B and Zone C                            | **Strong** — separate kernel namespaces, fs, PID, network; `--network none`; disposable; reproducible from a pinned image                                               | Excellent — `docker run --rm --network none -v <clone>:/w -v <out>:/out ...`; output via bind mount                                                                                   | No host cred ever ent:the container; seal key/push cred stay on host, only Zone A/D touch them       | Image build once (~min); per run ~1–2 s                                                                                | Docker Desktop already installed & working (WSL2) | Claude Code runs in Linux (npm) — works in container | Codex CLI has a Linux build — works in container | **HUMAN_APPROVAL** to make container use a dependency of the spine. Docker Desktop already installed (no new install). No admin. |
| **C. WSL2 (existing `kali-linux`) boundary**                                   | Medium–Strong — separate Linux user/namespace, but the distro is long-lived and shares a filesystem view with `\\wsl$`; less disposable than B                          | Good — `wsl -d <distro> -u <user> -- ...`                                                                                                                                             | Same as B if `\\wsl$` host mounts are avoided                                                        | Low (distro exists); per run ~s                                                                                        | Present, running                                  | Works (Linux)                                        | Works (Linux)                                    | **HUMAN_APPROVAL**. No install, no admin. Weaker disposability than B.                                                           |
| **D. Windows Sandbox** (throwaway VM) for Zone C                               | Very strong — full VM boundary, nothing persists                                                                                                                        | Poor–Medium — `.wsb` config + start; slow (seconds–minutes); scripting the handshake is fiddly                                                                                        | Clean — no host secret reachable                                                                     | Not available now: **needs admin + Hyper-V + reboot**; per run 10–60 s                                                 | Not installed                                     | Would work inside                                    | Would work inside                                | **HUMAN_APPROVAL + admin + reboot + feature install.** Defer.                                                                    |
| **E. Hyper-V VM** (persistent)                                                 | Very strong                                                                                                                                                             | Medium (Hyper-V PowerShell) but heavy                                                                                                                                                 | Clean                                                                                                | High: build + maintain a VM image; needs admin                                                                         | Needs admin to enable                             | Works                                                | Works                                            | **HUMAN_APPROVAL + admin.** Not justified vs A/B.                                                                                |
| **F. Job Object + restricted token / AppContainer** in-process                 | **Weak as a trust boundary** — a same-user process can create its own job / not join one / open the token; AppContainer from PS 5.1 needs P/Invoke and breaks many CLIs | Job Object kill: good (solves C-05). Restricted token / AppContainer launch: poor from PS 5.1                                                                                         | Does not protect a key from the same user                                                            | Medium (P/Invoke)                                                                                                      | Job Objects: yes. AppContainer: painful           | AppContainer likely breaks Claude CLI (network, fs)  | Likely breaks Codex CLI                          | No admin. **Useful for C-05 (process-tree kill) only — NOT a §1.2 boundary.**                                                    |
| **G. ACLs only, same user**                                                    | **None** vs §1.2 — the user has `M`/ownership on `.orchestration`; can rewrite the ACL or take ownership                                                                | Trivial                                                                                                                                                                               | No protection                                                                                        | Low                                                                                                                    | Yes                                               | n/a                                                  | n/a                                              | No admin. **Insufficient alone**; only meaningful combined with A or B.                                                          |

### 4.1 Decision for §10 (Windows isolation) — APPROVED

- **Zone B (IMPLEMENTER/SCOUT) and Zone C (REVIEWER): Option B (Docker Linux
  container)** — `PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS` (owner
  decision D1). Disposable, reproducible, no host credential exposure, Docker
  Desktop already present. The mandatory container properties are the §0 D1
  table (16 items). The configuration is **proven adversarially in Wave 0**
  before it is trusted — Docker is not assumed to satisfy C-06 by itself.
- **Option A (dedicated local Windows accounts) is `WINDOWS_DEDICATED_ACCOUNTS =
FALLBACK_ONLY`** — used only if a Claude/Codex incompatibility inside the
  container is proven in Wave 0 §C and not reasonably solvable.
- **Zone A (SUPERVISOR) and Zone D (INTEGRATOR): the normal developer user is
  acceptable because Zone B/C are in containers** (the §1.2 adversary — the
  executor — is no longer a same-user host process). Harden with **Option G**:
  authority runtime in a supervisor-owned directory, seal key in CNG (Zone A
  only), push credential in Credential Manager (Zone D only) — **two separate
  secrets, two separate principals**.
- **Option F (Job Objects)** in addition, for all launched children, to close
  C-05 (process-tree termination) — orthogonal to the trust boundary.
- **Option D (Windows Sandbox)** noted as the strongest reviewer-freshness
  option; revisit only if the container reviewer profile proves insufficient and
  admin + Hyper-V become available.

This is a **stack/onboarding change** and needs the one-time human approvals in
§15 (#1, #2, #4) before Wave 0.

---

## 5. AUTHORITY MANIFEST (replaces the self-hashed contract — fixes H4-01)

Full schema: _Schemas §2_. Design points:

1. **`taskVersionId` binds every semantically authoritative field** — taskId,
   planningHead, spec hash, acceptance hash **and** acceptanceCriteriaIds, risk,
   declared scope + mode, protected grants, gate, dependencies, verification
   profile id + version + definition hash, the bound schema versions/hashes, and
   configHash. An executor that changes any of these and re-hashes gets a
   _different_ taskVersionId, which does not match the ledger, the index, the
   gate record, or any attestation binding.
2. **`authoritySeal` (supervisor)** over the canonical manifest minus the seal.
   This is the root of trust the executor cannot recompute (Q7): it requires the
   seal key, which lives outside Zone B/C (§2a, §4).
3. **Closed schema, validated before any cast/compare/hash** — `additionalProperties:
false` recursively, explicit types, duplicate-key rejection, exact schema
   version, no float coercion (fixes M4-01, M4-03). Singleton-array `taskId`,
   string `declaredScope`, unknown root field ⇒ reject.
4. **The manifest lives in Zone A**, not in the executor sandbox. Zone B gets a
   _projection_ (only the fields it needs) delivered as a sealed
   `run-manifest` + inline spec/acceptance, never write access to the manifest
   file.

### Option comparison for the manifest root of trust

| Option                                                                  | Mechanism                                                                                                                                   | Real trust assumption on Windows                                                                                                                                                                                                                    | Verdict                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **A. Supervisor-owned immutable manifest outside the executor sandbox** | manifest file in a dir the executor principal cannot read/write                                                                             | Executor is a _different principal_ (container or account). Same-user ⇒ no protection.                                                                                                                                                              | Necessary but not sufficient alone (a reader with the path still can't tell a genuine manifest from a swapped one without a seal) |
| **B. Signed / HMAC manifest, signing capability never in the executor** | `authoritySeal`; key in CNG non-exportable, ACL'd to the SUPERVISOR principal (Zone A, host-side), never present in the Zone B/C containers | Key is unreadable/uncallable by the executor principal because the executor runs in a container that never mounts it. Requires the §2a principal boundary (Docker — decided). TPM-backed CNG raises the bar further (non-exportable even to admin). | **Chosen.** The only option that survives a reader who has the file path.                                                         |
| **C. Independent disposable clone + a supervisor authority process**    | supervisor runs in its own clone/process; executor never shares fs with it                                                                  | Process/fs boundary = a principal boundary (container/account). Without it, dot-sourcing defeats it.                                                                                                                                                | Complementary to B (it's _where_ B's key-holder runs)                                                                             |
| **D. Combination (B inside C, delivered as A)**                         | sealed manifest (B), produced by an isolated supervisor process (C), stored where the executor can't write (A)                              | All three assumptions together; each covers a different attack (path swap, key theft, process injection)                                                                                                                                            | **Recommended full design**                                                                                                       |

**Trust assumptions stated plainly:** V2.1's manifest authority is real **iff**
(i) the seal key is held by a principal the Zone B/C processes cannot read from
or execute as, and (ii) that principal's code is deterministic and never
consumes LLM output or task text as instructions. On this machine that means
Docker containers for B/C (Option B in §4) or dedicated accounts (Option A),
plus CNG/Cred-Manager key storage. Absent (i), there is **no** manifest
authority and the spine cannot pass — this is not a limitation that a better
hash fixes.

---

## 6. CANDIDATE MODEL (fixes H4-03; supports H4-02)

One immutable candidate identity. Full schema: _Schemas §3_.

1. The supervisor builds the integration candidate (merge `origin/<target>` into
   `orch/<runId>` **inside the disposable clone**), reads its commit and tree
   SHA, fetches that commit **by SHA** into the authority repo, and seals a
   `candidate-descriptor`.
2. **`candidateCommit` + `candidateTree` are the only identity.** `baseTargetCommit`
   records the `origin/<target>` SHA it was built on.
3. After the descriptor is sealed, **nothing operates on a worktree**:
   - verification (§ TESTER) runs the declarative profile against a materialisation
     of `candidateTree`;
   - the secret scan (§7) runs against the same materialisation / the git blobs;
   - the reviewer (§ Zone C) reads blobs by SHA from the same materialisation.
     A "materialisation" is `git archive <candidateTree> | tar -x` into a fresh
     read-only dir, or `git cat-file --batch`, with `materializationHash` checked
     against the descriptor.
4. **Any mutation ⇒ new candidate.** If the clone's branch moves, or the worktree
   is touched, the supervisor computes a new `candidateCommit`, seals a new
   descriptor, and **every gate re-runs**. There is no "re-scan the same
   candidate after an edit" path.
5. The integrator merges/pushes **`candidateCommit`** — the exact object that was
   scanned and reviewed — never a freshly re-merged target (fixes the fourth
   review's "merge uses `HeadSha` not the bytes scanned").

---

## 7. SECRET SCANNING (fixes H4-03)

The gate scans **the exact candidate bytes**, from the immutable tree, and binds
the tree into the evidence.

1. **Source = git objects, not the worktree.** Enumerate
   `git ls-tree -r <candidateTree>`; for each blob, `git cat-file blob <sha>`.
   The worktree is never read. A dirty worktree cannot hide or inject anything.
2. **Binary handling.** Git's own binary heuristic (NUL in first 8 KB) + explicit
   `.gitattributes` `binary`. Binary blobs: scan for the raw synthetic-secret
   marker and high-entropy PEM/JWT shapes on the byte stream; do not attempt text
   patterns. A binary blob that can't be classified ⇒ **fail closed** (policy:
   `unknownEncoding = FAIL`).
3. **Encoding matrix.** For text blobs, decode and scan under **each** of:
   UTF-8 (BOM + no BOM), UTF-16LE (BOM + no BOM), UTF-16BE (BOM + no BOM). Scan
   every decoding (fixes the fourth review's UTF-16LE-no-BOM miss). A blob that
   decodes to replacement characters under all candidates ⇒ fail closed.
4. **Multiline / large.** PEM and multi-line credential blocks scanned with the
   `multilinePatterns` over the whole decoded blob. Blobs over a size cap:
   streamed, still scanned, never skipped.
5. **Symlink / reparse.** Git stores symlinks as blobs with mode `120000`;
   scan the link target string; a link mode outside `{100644,100755,120000,
160000,040000}` ⇒ fail closed. There is no filesystem reparse point to follow
   because we never touch the filesystem.
6. **Git LFS.** If `.gitattributes` marks a path as LFS and the blob is an LFS
   pointer, the real content is not in the tree ⇒ **fail closed** (`LFS content
not materialised — cannot prove clean`). (Orcivo does not use LFS today; this
   is a guard, not a feature.)
7. **Read / regex errors are not swallowed.** A `cat-file` failure or a regex
   engine error on any blob ⇒ the scan result is `LEAK`/`INDETERMINATE`, fail
   closed (fixes the fourth review's "read failures silently skipped, per-pattern
   regex errors swallowed").
8. **Evidence binds the tree.** The `secret-scan` attestation entry (Schemas §5)
   carries `candidateTree` + `materializationHash` + the pattern-library hash. A
   scan is only valid for the exact tree it names.
9. **One pattern library** (`redaction.secretPatterns` + `multilinePatterns`)
   shared by the redactor and the scanner (already true in V2 — keep it), plus
   the always-present `ORCIVO_SYNTHETIC_SECRET_[A-Za-z0-9]{8,}` marker.

Unknown / unreadable / unknown-encoding / LFS-pointer / bad-mode ⇒ **fail
closed**, ledger `SECRET_LEAK_BLOCKED` → `QUARANTINED`, no push.

---

## 8. ATTESTATION LINEAGE (fixes H4-04, M4-01)

Ordering comes from an integrity-bound append-only chain, never a timestamp.
Full schema: _Schemas §5_.

1. Each attestation carries `sequence` (1-based contiguous per `taskVersionId` +
   `runId`), `previousHash`, `attemptId`, `taskVersionId`, `candidateCommit` +
   `candidateTree`, `kind`, `result`, `producerHash`, `payloadHash`,
   `manifestHash`.
2. `createdAt` is **audit-only** — not in `attestationHash`, never sorted on
   (fixes H4-04).
3. A **sealed `attestation-lineage-head`** records `sequence` + `headHash` +
   `latestByKind`. On read, the derived chain must match the seal exactly
   (mirrors the ledger's sealed head).
4. **"Latest authoritative result for a kind" = walk the chain, take the last
   entry of that kind.** A later `REQUEST_CHANGES` cannot be reordered behind an
   earlier `APPROVE` because there is no `createdAt` to rewrite and the chain
   position is fixed by `previousHash`.
5. Duplicate `sequence`, gap, broken `previousHash`, head/tail disagreement, a
   review entry whose `nonce` was already consumed, or an entry not sealed by the
   right principal ⇒ **lineage QUARANTINED, fail closed**.
6. The lineage append runs **under the same lease** as the ledger for that
   task version, in Zone A. Two concurrent appends cannot pick the same
   `sequence`.
7. **JSON hygiene for every entry** (fixes M4-01): `Assert-NoDuplicateJsonKeys`
   pre-parse; closed schema with explicit `type` on every `const`; a singleton
   array is not a scalar; no float coercion; canonical serialisation for the
   hash.

The attestation lineage and the ledger are two hash-chained logs in Zone A. They
could be unified into one event log; kept separate here for clarity (the ledger
is task-lifecycle state, the lineage is gate results). Both are sealed, both
quarantine on any inconsistency.

---

## 9. LEASE / RECOVERY MODEL (fixes H4-05; H-08 minimum)

Full schema: _Schemas §7_.

1. **Quarantine is a state in a sealed append-only log**, not a file's existence.
   `Test-LeaseQuarantined` = "the latest `lease-authority-event` for this
   namespace/key is `quarantine` with no later `recovered`." Deleting or renaming
   any file does not change this (fixes H4-05 "deletable/renameable marker").
2. **Recovery requires a capability**, issued only by Zone A as a sealed
   `recovery-capability-issued` event, bound to `namespace` + `key` +
   `boundQuarantineHash` (the hash of the exact quarantined record bytes) +
   single-use `nonce` + `expiresAt`. An arbitrary ≥8-char string is not a
   token (fixes H4-05 "any reusable string").
3. **`Repair-QuarantinedLease` accepts a `recovered` event only if**: the
   capability's `capabilityId` + `nonce` match an unconsumed issued capability,
   `boundQuarantineHash` equals the current quarantined-record hash, not expired,
   and — under the serialising lease — no residual record has a live owner, and
   (for `integration`) `origin` shows no half-published state.
4. **Serialised.** Recovery for a namespace/key runs under the `ledger` (or
   `integration`) lease. Eight concurrent repairs ⇒ at most one `recovered`
   event, because the nonce is consumed in the first sealed append and the rest
   fail the "unconsumed" check (fixes H4-05 "5 of 8 concurrent repairs
   succeeded").
5. **Atomic transition.** The quarantine→recovered transition is a single sealed
   append + a CAS on the lease-authority-head. The owner scan, audit write, and
   residual cleanup happen _after_ the sealed `recovered` event and are
   idempotent (re-running cleanup is safe). No "release handle then Remove-Item"
   race (fixes H4-05 "delete-CAS releases handle before Remove-Item" —
   the deletion is now non-authoritative bookkeeping).
6. **Crash mid-recovery**: the sealed log determines state. If
   `recovery-capability-issued` is the last event, the capability is still
   valid (nonce unconsumed) and recovery can be retried. If `recovered` is the
   last event, recovery is done regardless of whether cleanup finished.
7. Normal `acquire` can **never** recover uncertainty — it only ever transitions
   `<no event | released>` → `acquire`. A `quarantine` latest-state blocks every
   acquire (fixes H4-05 "manual marker deletion enabled acquire").

---

## 10. REMOTE TRUTH MODEL (fixes H4-06, M4-04)

`origin` is the external authority for **publication**. Integration is a state
machine; the terminal state is derived **only** from what `origin` actually
shows.

```
 CANDIDATE_READY ──▶ VERIFIED ──▶ REVIEWED ──▶ INTEGRATION_PREPARED
                                                     │
                                          merge candidate into target (local)
                                                     │
                                              PUSH_ATTEMPTED
                                                     │
                     ┌───────────────────────────────┼───────────────────────────┐
              push clearly OK                push clearly rejected         push outcome unknown
                     │                              │                     (network drop, timeout,
              REMOTE_RECONCILING            REMOTE_RECONCILING              ambiguous git exit)
                     │                              │                            │
              fetch origin, compare          fetch origin, compare        REMOTE_RECONCILING
              expected merge SHA/tree         expected merge SHA/tree             │
                     │                              │                     fetch origin, compare
        ┌────────────┼────────────┐      ┌──────────┴─────────┐          ┌────────┴────────┐
   matches      does not match   fetch  matches         does not        matches   unknown after
        │        │               fails     │             match            │       N retries
   PUBLISHED  AMBIGUOUS_REMOTE  AMBIGUOUS  PUBLISHED  NOT_PUBLISHED_    PUBLISHED  AMBIGUOUS_REMOTE
                                _REMOTE               CONFIRMED
```

Rules:

1. **Never record "push failed" while the remote outcome is unknown.** A non-zero
   git exit, a timeout, or a dropped connection goes to `REMOTE_RECONCILING`, not
   `PUSH_FAILED`.
2. **`REMOTE_RECONCILING`**: `git fetch origin`, then compare the observed
   `origin/<target>` commit and tree against the `expectedMergeCommit` and
   `candidateTree`. Record `observedRemoteCommit` / `observedRemoteTree` in the
   sealed `integration-evidence` (Schemas §9) **before** deciding.
3. Terminal states:
   - `PUBLISHED` — `origin/<target>` contains `expectedMergeCommit` and its tree
     equals `candidateTree`.
   - `NOT_PUBLISHED_CONFIRMED` — `origin/<target>` is unchanged at
     `baseTargetCommit` (or moved to something that is provably not our merge)
     **and** a fetch succeeded. Safe to retry from a fresh candidate.
   - `AMBIGUOUS_REMOTE` — fetch failed, or `origin` shows a state we can't
     classify (e.g. our tree but not our commit). **Human required.** No retry,
     no "not published" claim.
4. **Ledger-write failure after a push** (M4-04): `_fail` must **not** suppress a
   failed `Add-LedgerEvent`. If the sealed ledger append fails, the process
   raises, and **recovery reconstructs the truth from `origin` + the immutable
   `run-manifest`**: fetch `origin/<target>`, check whether it contains the
   run-manifest's `expectedMergeCommit`, and write the terminal state then. The
   run is never assumed terminal on an unpersisted status.
5. **No runtime fault seams** (H4-06). `$script:V2IntegrationTestFaults` and
   every `_fault '...'` call are **deleted from the runtime module.** Failure
   paths are exercised by injecting a **fake `git` transport** at the test
   composition root only (§14) — a fake `git` executable and a fake bare remote
   with `pre-receive` hooks. A production runtime binary contains no switch,
   no env var, and no script-scoped fault variable.
6. Every state transition is a sealed ledger event (Schemas §6). `AMBIGUOUS_REMOTE`
   and `REMOTE_RECONCILING` are first-class, not notes on `PUSH_FAILED`.

---

## 11. BUILD_VS_ADOPT

### 11.1 What "adopt" would have to cover

Our critical requirements, scored against a mature external harness:

| #   | Requirement                                                                          | Typical mature harness (CI-runner + durable-execution + human-gate class, e.g. Temporal/Conductor-style + GitHub-Environments-style gates + container runners) | Ours to keep?                                            |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | OS/process isolation of the LLM roles                                                | **Yes** — container runners are standard                                                                                                                       | adopt                                                    |
| 2   | Task exactly-once + durable ledger                                                   | **Yes** — durable-execution engines do this well                                                                                                               | adopt (engine)                                           |
| 3   | Immutable candidate = a specific git commit/tree, reviewer bound to exact blob SHAs  | **No** — no product models the reviewer's inputs as content-addressed git blobs bound into the review output                                                   | **keep (ours)**                                          |
| 4   | Reviewer freshness (no memory/MCP/plugins/hooks)                                     | Partial — clean container yes; "no Claude memory/MCP" is our concern                                                                                           | mostly adopt + our launch profile                        |
| 5   | Content-addressed attestations chained into a lineage, bound to git trees            | **No** — attestation frameworks (in-toto/SLSA) are close in spirit but not wired to our task/candidate/review model                                            | **keep (ours)**, possibly emit SLSA-style provenance too |
| 6   | Human gates as durable, spec-hash-bound decisions                                    | **Yes** — environment protection rules / manual approval steps                                                                                                 | adopt                                                    |
| 7   | Remote CAS / publication-truth reconciliation (§10)                                  | Partial — CD tools push; few reconcile "ambiguous remote" into an explicit state                                                                               | **keep (ours)** thin layer                               |
| 8   | Windows support                                                                      | Varies — Temporal/Conductor workers run on Windows; many agent orchestrators are Linux-first                                                                   | check per candidate                                      |
| 9   | Claude / Codex failover on provider-only classes                                     | **No** — this is our `classify.ps1` logic                                                                                                                      | **keep (ours)**                                          |
| 10  | Least privilege per role (push cred only in integrator, seal key only in supervisor) | Partial — secret scoping per job exists; the seal-key/principal split is our design                                                                            | adopt scoping + our key model                            |
| 11  | Crash resume                                                                         | **Yes** — the whole point of a durable-execution engine                                                                                                        | adopt (engine)                                           |

### 11.2 On Maestro (`tinhtran24/maestro`) specifically

Owner decision D2: the target is **`https://github.com/tinhtran24/maestro`**
(`MAESTRO_SPIKE_TARGET = tinhtran24/maestro`), and its trust role is
**`MAESTRO_TRUST_ROLE = UNTRUSTED_ORCHESTRATION_SUBSTRATE`**.

**Maestro is a candidate ONLY for** (the "substrate" layer):

- session orchestration
- worker lifecycle
- workspace management
- Claude / Codex adapters
- reviewer coordination
- CI / review feedback loops
- observability / cockpit

**Maestro is NEVER automatically trusted for** (the "trust core" layer —
`TRUST_CORE = CUSTOM_V2_1`):

- the seal key
- the push credential
- task authority (`task-authority-manifest`)
- attestation authority (the sealed lineage)
- the security ledger
- human-approval authority
- C-06 isolation (worktree isolation ≠ OS security isolation)

Anything Maestro produces is **input to Zone A / Zone D, revalidated and
re-sealed there** — never accepted as authority on Maestro's word. If Maestro's
own state store says a task is "approved" or "reviewed", that is a hint; the
sealed attestation lineage is the fact.

The spike (§13.0 D) evaluates `tinhtran24/maestro` against the concrete
requirement list and classifies each requirement as
`USE_MAESTRO` / `WRAP_MAESTRO` / `CUSTOM_TRUST_CORE` / `NOT_SUPPORTED` /
`UNSAFE_FOR_AUTHORITY`. The spike changes nothing in the Orcivo repo and runs no
roadmap task.

### 11.3 Recommendation

**`BUILD_VS_ADOPT_RECOMMENDATION = CONTINUE_CUSTOM`** for the trust core; the
substrate is decided per-requirement by the Wave 0 spike.

- Keep as ours (small, git-native, security-critical, ~1.5k lines):
  `task-authority-manifest`, `candidate-descriptor`, `review-request/envelope`,
  `attestation lineage`, `lease-authority log`, `remote-truth state machine`,
  `classify` (provider failover), the secret-scan-on-tree gate, the seal/push
  key model.
- Substrate (`WRAP_MAESTRO` where the spike proves it viable, `CUSTOM` otherwise):
  container runners for Zones B/C (Docker — decided), session/worker lifecycle,
  workspace management, provider adapters, reviewer coordination, cockpit.
- **The substrate never holds the seal key or the push credential**, never
  writes an authority artifact, and never gates a publish on its own say-so.
- Do not migrate, do not install into the repo, do not change the repo during
  the spike.

---

## 12. MIGRATION FROM CURRENT V2

V2 stays as `LEGACY_REJECTED_REFERENCE_ONLY` alongside V1. V2.1 is a new
namespace `.orchestration/v2_1/` and `scripts/orchestration/v2_1/`. No V2
artifact is migrated into V2.1 trust.

| V2 element                                     | V2.1 disposition                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contract.ps1` self-hashed contract            | replaced by `task-authority-manifest` (sealed, identity binds all fields)                                                                              |
| `ledger.ps1` hash-chained ledger + sealed head | kept as the design; add `authoritySeal` per event, add §10 states, `ledger-event/3`                                                                    |
| `attest.ps1` timestamp-ordered attestations    | replaced by the sealed hash-chained `attestation lineage`                                                                                              |
| `lease.ps1` file-marker quarantine             | replaced by the sealed `lease-authority log` + capability recovery                                                                                     |
| `review-envelope.ps1` fenced/schema parse      | kept as the parser; inputs become sealed `review-request` + content-addressed blobs; add duplicate-key rejection, explicit-typed schema, nonce lineage |
| `verification.ps1` declarative profiles        | kept as-is (it is already the strongest part); TESTER runs it against `candidateTree` materialisation                                                  |
| `integrate.ps1` + runtime fault seams          | fault seams **deleted**; §10 state machine; candidate merged by SHA; reconcile-before-terminal                                                         |
| `preflight.ps1` in-process fetch token         | `fetch-observation` minted+consumed in one sealed call (M4-02); index validated against a closed schema (M4-03)                                        |
| `lib-v2.ps1` canonical JSON / CAS / redaction  | kept; add `Assert-NoDuplicateJsonKeys`, integer-only number rule, seal verify/produce, `git cat-file` blob reader, encoding-matrix scanner             |
| `spine.ps1` (no `run` verb)                    | kept; V2.1 also has no real-task verb until §15 approvals                                                                                              |
| synthetic index / GSD parser (H-10)            | still deferred; V2.1 does not execute the real roadmap                                                                                                 |

Data migration: **none.** Any in-flight V2 run is abandoned (V2 never ran a real
task). V2's `.orchestration/v2/` runtime stays gitignored and untouched.

---

## 13. IMPLEMENTATION WAVES

Each wave ends with the full adversarial suite (V1 + V2 + every H4/M4 exploit as
a permanent regression) and **does not advance on suite counts alone**.

### 13.0 Wave 0 — disposable proofs (NO implementation; needs approvals #1/#2/#4/#5)

Wave 0 builds **nothing that stays**. It is a set of throwaway experiments whose
only output is a written proof report (`docs/agents/` or `.planning/reviews/`)
and a go/no-go on the boundary design. It creates no persistent container, no
seal key, no credential, and touches no Orcivo runtime, planning state, or
roadmap task. Everything is done in a scratch directory and torn down.

**Constraints (all of Wave 0).**

- No modification of Orcivo state (`.planning/**`, `.orchestration/**`, app code).
- No roadmap task execution. No P03 / T12 / T13. No persistent DB. No production.
- No real push credential. No real seal key (use a throwaway test key/secret,
  clearly labelled, destroyed at the end).
- No real provider spend beyond a minimal "does the CLI start and authenticate"
  check (approval #7 still gates real task-shaped model use).
- Disposable Git repos only, as in the existing V2 adversarial suite.

#### A. Docker IMPLEMENTER isolation — must prove

| Claim to prove                                        | How it is checked (disposable)                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| container **cannot read the authority root**          | attempt `cat` / `ls` of the authority repo path and `.orchestration/v2_1/**` from inside → must fail (path not present, not just permission)                                                                   |
| container **cannot read host `HOME` / `USERPROFILE`** | enumerate `/root`, `$HOME`, any bind mount → no host profile visible                                                                                                                                           |
| container **cannot read the seal key**                | throwaway seal key placed in the Zone A location on the host → not visible/readable from the container                                                                                                         |
| container **cannot read the push credential**         | throwaway credential placed in the Zone D store → not visible/readable from the container                                                                                                                      |
| container **cannot access `docker.sock`**             | `docker ps` / `curl --unix-socket /var/run/docker.sock` from inside → fail; socket not mounted                                                                                                                 |
| container **cannot write the target repo**            | attempt to write into any authority/target path → fail (not mounted, or mounted ro)                                                                                                                            |
| container **can work in a disposable clone**          | `git clone` (local, no-hardlinks) into container-writable scratch, edit files, commit on `orch/<runId>` → succeeds; the clone's `origin` is a local read-only path, `git push` reaches nothing                 |
| flags actually applied                                | inspect the running container: `--rm`, `--network none` (or allowlist), `--cap-drop ALL`, `--security-opt no-new-privileges`, no `--privileged`, `--read-only` where required, mount list == the §0 D1 minimum |

#### B. Docker REVIEWER isolation — must prove

| Claim to prove                        | How it is checked                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **fresh profile every run**           | `CLAUDE_CONFIG_DIR` / `HOME` / `APPDATA`-equivalent point at an empty tmp tree created per review; no inherited `settings.json`, no `CLAUDE.md` discovery                |
| **candidate is read-only**            | the candidate materialisation is mounted `:ro`; write attempts fail                                                                                                      |
| **no implementer workspace**          | the implementer's clone / scratch is not mounted and not reachable                                                                                                       |
| **no memory / MCP / plugins / hooks** | launched with an explicit minimal config; `ai-memory` and every MCP server absent; no hooks fire; verify via the CLI's own "loaded servers / plugins" output being empty |
| **no authority**                      | authority root and seal key not present/readable                                                                                                                         |
| **no push**                           | no credential present; `git push` reaches nothing; network denied                                                                                                        |
| **output path only**                  | the only writable mount is a per-review output dir that receives exactly one `review-envelope/2`                                                                         |

#### C. CLI feasibility inside the boundary — must prove

| Claim                                                  | Check                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code runs inside the container**              | `claude` starts, authenticates, completes a trivial prompt, emits structured output                                                                                                               |
| **Codex runs inside the container**                    | `codex` (Linux build) starts, authenticates, completes a trivial prompt; note that on the host Codex has no native `.exe` — inside Linux this is moot                                             |
| **minimal auth without copying the whole user config** | identify the smallest credential/token file each CLI needs; mount only that (ideally a dedicated throwaway account/token for the spike), not the full `~/.claude` / `~/.codex`                    |
| **no publication Git credential enters the container** | confirmed by A/B; the container's git can only reach a local read-only path                                                                                                                       |
| **failure recorded if a CLI cannot run cleanly**       | if Claude or Codex cannot run acceptably in the container, that is a documented result → triggers the `WINDOWS_DEDICATED_ACCOUNTS = FALLBACK_ONLY` path for that role, still adversarially proven |

#### D. Maestro spike — `tinhtran24/maestro`

Evaluate the checked-out (not installed into Orcivo, not run against Orcivo)
`tinhtran24/maestro` against each requirement and classify it:

`USE_MAESTRO` (adopt as-is) · `WRAP_MAESTRO` (use behind our adapter, output
revalidated) · `CUSTOM_TRUST_CORE` (ours, Maestro not involved) · `NOT_SUPPORTED`
(Maestro can't do it) · `UNSAFE_FOR_AUTHORITY` (Maestro could appear to do it but
must never be trusted for it).

| Requirement                                         | Expected classification (to confirm in the spike)                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Windows support                                     | ? — verify it runs on Win11 + PS 5.1 / WSL2 / Docker                                              |
| Claude adapter                                      | likely `USE_MAESTRO` or `WRAP_MAESTRO`                                                            |
| Codex adapter                                       | likely `USE_MAESTRO` or `WRAP_MAESTRO`                                                            |
| reviewer lifecycle                                  | likely `WRAP_MAESTRO` (coordination yes; the sealed review-request/envelope stays ours)           |
| isolated workspace                                  | `WRAP_MAESTRO` at best — **worktree isolation ≠ OS isolation**; the container boundary stays ours |
| persistent session state                            | `USE_MAESTRO` for convenience state; `UNSAFE_FOR_AUTHORITY` as a source of truth                  |
| crash recovery                                      | `WRAP_MAESTRO` for run resumption; authority recovery is the sealed logs (`CUSTOM_TRUST_CORE`)    |
| human gates                                         | `UNSAFE_FOR_AUTHORITY` — the durable, spec-hash-bound, sealed gate record is ours                 |
| provider failover                                   | `CUSTOM_TRUST_CORE` — `classify.ps1` control-channel-only logic                                   |
| parallelism                                         | `USE_MAESTRO` / `WRAP_MAESTRO`                                                                    |
| observability / cockpit                             | `USE_MAESTRO`                                                                                     |
| task authority / attestation / ledger / seal / push | `UNSAFE_FOR_AUTHORITY` — never Maestro                                                            |

Spike rules: **no Orcivo state change, no roadmap task, no install into the
repo, no repo change.** Output is a classification table + a
`WRAP` vs `CUSTOM` boundary drawing.

#### Wave 0 exit criteria

1. Every claim in A and B is **proven** on this machine, and an adversarial
   attempt to break each one (from inside the container, and from a concurrent
   host process) **fails**.
2. C shows both CLIs usable in the boundary, or a documented, adversarially
   proven fallback per role.
3. D produces the classification table; no requirement lands on `USE_MAESTRO`
   for anything in the "never trusted" list.
4. A written proof report exists. Nothing persistent was created. The throwaway
   key/credential are destroyed.
5. **Independent review of the Wave 0 report** before Wave 1 starts.

### 13.1 Wave 1 — authority manifest + closed schemas + JSON hygiene

- `Assert-NoDuplicateJsonKeys`, integer-only numbers, explicit-typed closed
  schemas for every artifact (Schemas §0), canonical serialisation v2.
- `authoritySeal` produce/verify against CNG.
- `task-authority-manifest` with the expanded `taskVersionId`; supervisor
  freezes + seals; executor gets only a projection.
- Regressions: H4-01 coherent-rewrite matrix, M4-01 dup-keys/singleton-array,
  M4-03 contract/index closed-schema.

### 13.2 Wave 2 — candidate model + secret scan on the tree

- Disposable **clone** (not worktree) for the implementer.
- `candidate-descriptor`; all gates consume `candidateTree` materialisation.
- Encoding-matrix, binary-aware, LFS/symlink/mode-aware secret scanner on git
  blobs; fail-closed on unknown/unreadable; evidence binds the tree.
- Regressions: H4-03 committed-secret-hidden-by-dirty-worktree, UTF-16LE-no-BOM,
  binary blob, read/regex-error, LFS pointer.

### 13.3 Wave 3 — attestation lineage + review immutability

- Sealed hash-chained `attestation lineage` + head; walk-the-chain "latest".
- `review-request` (sealed) + `git cat-file` blob reader for the reviewer;
  reviewer launched with a fresh empty profile, no MCP/memory/plugins/hooks.
- Single-use nonce tracked in the lineage; launcher-captured provenance.
- Regressions: H4-04 `createdAt` reorder / future time / duplicate timestamp /
  negative-result; H4-02 post-request swap / replay / junction / huge payload.

### 13.4 Wave 4 — lease-authority log + capability recovery (H-08 minimum)

- Sealed append-only `lease-authority log`; quarantine = latest-state.
- Capability-based, serialised, atomic recovery.
- Crash-point matrix determinism.
- Regressions: H4-05 forged/replayed/cross-key token, 8 concurrent repairs,
  marker delete/rename, crash mid-recovery.

### 13.5 Wave 5 — remote-truth state machine

- Delete all runtime fault seams; fake-`git` transport at the test root.
- §10 states; reconcile-before-terminal; recovery from `origin` + `run-manifest`
  when a ledger write is lost; `_fail` never suppresses a ledger failure.
- Regressions: H4-06 seam-after-successful-push, M4-04 ledger-write-fails-after-
  push, ambiguous-push, genuine pre-receive reject, remote-moved-after-review.

### 13.6 Wave 6 — adversarial re-test + independent review

- Rerun V1, V2, every H4/M4 exploit, an independent encoding-aware secret scan.
- Request a fifth independent review. **Do not** self-declare PASS.

Real-task execution, canary, and the real GSD parser (H-10) remain **out of every
wave** until a separate approval (§15).

---

## 14. TEST / ADVERSARIAL PLAN

1. **No fault seams in runtime.** Failure injection is only via:
   - a **fake `git` executable** on `PATH` for the test process (records/forces
     push outcomes, ancestry, tree results);
   - a **fake bare remote** with `pre-receive` / `update` hooks that reject or
     mutate;
   - **dependency injection at the test composition root only** — the test file
     constructs the runtime with a fake transport object; the production
     composition root constructs it with the real one. No runtime module has a
     `$script:*Fault*` variable or an env-var check.
   - a **disposable process/container boundary** per role.
2. **Adversary harness.** A standing suite that, for each finding, runs the
   exact reproduction from the review against a disposable fixture and asserts
   the V2.1 outcome (reject / fail-closed / quarantine). Every H4-xx and M4-xx
   becomes a named permanent case.
3. **Principal-boundary tests.** From a Zone B context: assert `read seal key` →
   denied; `write authority tree` → denied; `write shared .git/objects` →
   N/A (separate clone); `emit a valid manifest` → impossible (no seal).
4. **Encoding-aware secret scan** as an independent tool (not
   `Test-ArtifactsClean`) over the disposable remote after each integration test,
   asserting zero synthetic-marker residue on `origin`.
5. **Concurrency.** 2/8-writer ledger, 8-concurrent lease acquire, 8-concurrent
   quarantine repair, concurrent integration — all under the real lease code, in
   child processes.
6. **Crash matrix.** Kill the process at each labelled crash point (after seal,
   after push, before ledger write, mid-recovery); assert the sealed logs +
   run-manifest determine exactly one next state.
7. **Windows-real.** All of the above on this machine (PS 5.1, Docker Desktop,
   real `git` 2.52), plus the Docker-runner path for Zones B/C.
8. **Suite counts are necessary, not sufficient.** A wave passes only when every
   new adversarial case passes _and_ an independent reviewer agrees.

---

## 15. HUMAN APPROVAL REQUIREMENTS

The following are **Nível C** (per `CLAUDE.md` / `docs/AUTONOMY_POLICY.md`) and
must be approved by the owner before the corresponding wave:

Owner decisions D1 and D2 (§0) resolve the **architectural** choices (principal
boundary mechanism, Maestro identity + trust role). The items below are the
**operational** approvals still required before the corresponding wave — they are
provisioning/admin/cost gates, not architecture questions.

| #   | Approval                                                                                                                                        | Why it is Nível C                             | Blocks                                                | Status                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| 1   | **Stand up the Docker principal boundary** as a spine dependency (per D1)                                                                       | stack / onboarding change                     | Wave 0, and the whole spine (§2a)                     | **direction approved (D1); execution pending** |
| 2   | **One-time admin actions** — Docker group membership already present; set DENY ACLs on the authority dir; (fallback only) create local accounts | admin / machine config                        | Wave 0                                                | pending                                        |
| 3   | **Vault the real Git push credential** in a store scoped to the integrator principal (separate from the seal key)                               | secrets handling                              | Wave 5 (real push path)                               | pending                                        |
| 4   | **Provision the `authoritySeal` key** (CNG, ideally TPM-backed), Zone A only, separate from #3                                                  | secrets / key management                      | Wave 1                                                | pending                                        |
| 5   | **Maestro spike** against `tinhtran24/maestro` (per D2)                                                                                         | new-dependency evaluation                     | Wave 0 §D                                             | **target approved (D2); spike pending**        |
| 6   | **Adopt any Maestro component** the spike classifies `USE_MAESTRO` / `WRAP_MAESTRO`                                                             | new dependency / cost                         | after Wave 0                                          | pending                                        |
| 7   | **Real Claude/Codex disposable smoke** (first real provider invocation by the spine)                                                            | cost + first real model spend                 | after Wave 6                                          | pending                                        |
| 8   | **Promote H-10** (real machine-readable GSD parser) and wire a real task index                                                                  | changes what the harness can act on           | before any real task                                  | pending                                        |
| 9   | **First real task / canary**                                                                                                                    | publication to `origin/main` from the harness | after all of the above + a passing independent review | pending                                        |
| 10  | **C-04 full** (externally authenticated human-approval identity chain)                                                                          | identity / authorization infrastructure       | before any gated real task                            | pending                                        |

Waves 1–4 require only #1, #2, #4 (deterministic local code + disposable
fixtures). Wave 0 requires #1, #2, #4, #5. Waves 5–6 and everything after need
the rest.

---

## Answers

```
CAN_CURRENT_V2_BE_SECURED_WITHOUT_C06 = NO
C06_MUST_MOVE_BEFORE_SPINE_PASS       = YES   (the principal-boundary minimum:
                                              seal key + push credential unreachable
                                              from the LLM zones — not the full
                                              network/filesystem executor sandbox)
H08_MINIMUM_MUST_MOVE_BEFORE_SPINE_PASS = YES (sealed append-only lease/quarantine/
                                              recovery log + single-use capability
                                              recovery + serialized recovery +
                                              crash-point determinism)

--- OWNER DECISIONS (APPROVED, §0) ---
PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS
WINDOWS_DEDICATED_ACCOUNTS  = FALLBACK_ONLY
MAESTRO_SPIKE_TARGET        = tinhtran24/maestro
TRUST_CORE                  = CUSTOM_V2_1
MAESTRO_TRUST_ROLE          = UNTRUSTED_ORCHESTRATION_SUBSTRATE

RECOMMENDED_TRUST_ARCHITECTURE =
  Three principal-isolated zones + one external authority.
  ZONE A (supervisor, deterministic, SOLE seal authority — does NOT hold/use the
  push credential): produces every authority artifact — task-authority-manifest
  (identity binds ALL authoritative fields, sealed), candidate-descriptor,
  review-request, hash-chained sealed attestation lineage, hash-chained sealed
  ledger, sealed append-only lease-authority log, fetch-observation, run-manifest.
  ZONE B (implementer/scout, LLM): DOCKER LINUX CONTAINER — disposable, independent
  CLONE only, no seal key, no push credential, no authority root, no docker.sock,
  no host HOME, no Git publish credential, network deny/allowlist, fs allowlist,
  --cap-drop ALL, no-new-privileges, not privileged.
  ZONE C (reviewer, LLM): DOCKER LINUX CONTAINER — fresh disposable profile, no
  seal, no push, no authority, no repo write, no MCP/memory/plugins/hooks, no
  IMPLEMENTER context; reads only content-addressed candidate blobs via
  git cat-file from a read-only mount.
  ZONE D (integrator, deterministic, SOLE push authority — never runs an LLM):
  consumes candidate + validated sealed lineage; publishes via the remote-truth
  state machine (CANDIDATE_READY→VERIFIED→REVIEWED→INTEGRATION_PREPARED→
  PUSH_ATTEMPTED→REMOTE_RECONCILING→{PUBLISHED | NOT_PUBLISHED_CONFIRMED |
  AMBIGUOUS_REMOTE}); never records a terminal state before reconciling against
  origin. Seal key and push credential are DIFFERENT secrets, stored SEPARATELY.
  EXTERNAL: origin (Git remote) is the sole authority for publication truth; its
  refs are the one fact the executor cannot rewrite. No runtime fault seams —
  failure injection only via a fake git transport at the test composition root.
  Docker is NOT assumed to satisfy C-06 — the container config is proven
  adversarially in Wave 0 before it is trusted.

BUILD_VS_ADOPT_RECOMMENDATION = CONTINUE_CUSTOM
  TRUST_CORE = CUSTOM_V2_1 (authority manifest, candidate model, attestation
  lineage, lease-authority log, remote-truth reconciliation, provider-class
  failover, seal/push key model — security-critical, no product models it).
  MAESTRO_TRUST_ROLE = UNTRUSTED_ORCHESTRATION_SUBSTRATE — candidate only for
  session orchestration / worker lifecycle / workspace mgmt / provider adapters /
  reviewer coordination / CI feedback loops / cockpit, and only where the Wave 0
  spike classifies it USE_MAESTRO or WRAP_MAESTRO. It never holds the seal key or
  the push credential and never gates a publish on its own state.

ARCHITECTURE_DECISIONS_RESOLVED = YES
  The two architectural blockers (principal-boundary mechanism; Maestro identity
  + trust role) are resolved by owner decisions D1 and D2. Remaining §15 items
  are operational provisioning/admin/cost gates, not architecture questions.

READY_FOR_INDEPENDENT_V2_1_ARCHITECTURE_REVIEW = YES
  This document + ORCHESTRATION-V2.1-AUTHORITY-SCHEMAS.md are ready for an
  independent Codex review of the V2.1 architecture, to be done BEFORE any
  implementation.

NOT DECLARED (unchanged): C-06 PASS · READY_FOR_CANARY · SECURITY_SPINE_REVIEW
  PASS · READY_TO_IMPLEMENT_V2_1 (deferred until after the independent
  architecture review).
```

Stopping here for the independent V2.1 architecture review. No runtime, tests,
config, or planning state changed.
