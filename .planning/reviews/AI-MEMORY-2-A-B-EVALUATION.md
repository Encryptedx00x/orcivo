---
type: evaluation
title: AI-Memory 2.0 — controlled A/B evaluation for the Orcivo autopilot
date: 2026-09-04
threat_model: LOCAL_TRUSTED_HOST
baseline_commit: d52bc5814aed8d2a62a088819c9eb8490af3eb64
status: complete — pending owner decision on RECOMMENDATION
scope: NOT product development. No P03-T10. No production. No real Orcivo feature task touched.
---

# AI-Memory 2.0 — controlled A/B evaluation

## 0. What this is

The owner asked whether upgrading the local `ai-memory` service to 2.0 and wiring
it into the autonomous Claude/Codex dispatcher **measurably improves** cross-provider
continuity before it becomes part of normal operation.

Memory is treated as **auxiliary** throughout. It is never authority for task
state, owner approvals, acceptance criteria, security gates, candidate identity,
review verdict, integration truth, or Git publication truth. Those remain in
Git / `.planning` / the harness ledger. Everything below was built so that with
memory **off** the dispatcher is byte-identical to `d52bc58`.

## 1. Current state (measured)

| Item | Value |
|---|---|
| ai-memory **installed / live** | **1.38.0** — Docker `akitaonrails/ai-memory:latest` (local image built 2026‑08‑30), container `ai-memory` up ~12 h |
| Deployment | single container, `serve --transport http --bind 0.0.0.0:49374 --enable-web`, published `127.0.0.1:49374` only |
| Data dir / volume | `/data` in container ← Docker volume `ai-memory-data` (~15 MB) |
| Embedding provider | **disabled** (no `AI_MEMORY_LLM_PROVIDER`, no embedding provider) — FTS5 + entity + graph only |
| LLM provider | disabled → `memory_consolidate` off, PreCompact falls back to rule-based, lint rule-based |
| Store contents | 23 pages (24 all-versions), 24 sessions, 3.3–3.5 k observations, FTS fully indexed |
| Orcivo project | `workspace=default` / `project=orcivo` → 7 pages (8 all), 11 sessions, ~3.3 k observations |
| Claude integration | `~/.claude.json` → MCP server `ai-memory`, `type:http`, `url http://127.0.0.1:49374/mcp` (no auth token in config); SessionStart hook auto-fetches handoff/briefing |
| Codex integration | none wired (no `ai-memory install-hooks` / MCP entry for Codex found) |
| MCP surface | 18 `memory_*` tools incl. `memory_query`, `memory_write_page`, `memory_handoff_begin/accept`, `memory_briefing`, `memory_recent`, `memory_status` |
| Dispatcher adapter seam | `scripts/orchestration/v2/memory-adapter.ps1` — 4 hooks (`memoryBootstrap/Checkpoint/Finalize/Handoff`) wired into `dispatcher.ps1`; `config.memoryAdapter.enabled=false`, **no adapter implementation existed** |
| Health | live instance healthy the whole evaluation |

No auth tokens were printed at any point.

## 2. Is 2.0 actually released?

**`AI_MEMORY_2_RELEASE_STATUS = STABLE_RELEASE_AVAILABLE`.**

`akitaonrails/ai-memory` — verified against Docker Hub tags and the GitHub release/tag list:

| Tag | Published | Notes |
|---|---|---|
| `2.0.0` | 2026‑09‑02 | first 2.0 |
| `2.0.1` | 2026‑09‑02 | web UI reorg; daily lint consolidated per project |
| `2.0.2` | 2026‑09‑03 | **`latest`**, not a pre-release. Fixes: OKF migration no longer aborts on `.serve.lock`; libgit2 crash-loop fix; OpenCode Go headers |

2.0 is a real published stable line, not docs-only and not a pre-release. The
**live install (1.38.0) is 4 minor versions + a major behind** — the local
`:latest` image simply predates the 2.0 push and was never re-pulled.

## 3. Isolated 2.0.2 evaluation instance + migration

Nothing was upgraded in place. The live 1.38.0 instance and its volume were left
running and untouched for the entire evaluation.

**Backups (rollback proof):**

1. `ai-memory backup` on the live 1.38.0 instance → `live-backup-20260904-083135.tar.gz`
   (1.87 MiB, sha256 `c6b466f0…`) — consistent snapshot, kept on host at
   `C:/Users/Encryptedx/orcivo-ai-memory-eval/`.
2. Raw `tar` of the live volume → `ai-memory-data-live-20260904-083135.tgz`
   (3.74 MiB, sha256 `4a92136d…`).
3. Live volume `ai-memory-data` itself is never written by the eval instance
   (separate volume `ai-memory-eval-data`).

**Eval instance:** `akitaonrails/ai-memory:2.0.2` (digest
`sha256:14eef51d…`), fresh volume `ai-memory-eval-data` restored from backup #1
via `ai-memory restore --force`, served on `127.0.0.1:49375` (`--enable-web`),
no Orcivo credentials, no auth token, isolated.

**`MIGRATION_COPY = PASS`:**

- The 2.0 store schema migration applied cleanly: 58 versioned SQL migrations +
  the wiki `2026_09_01T18_00_okf_v0.2_conformance` migration.
- The OKF migration is **backup-gated**: before touching anything it wrote and
  **verified** `/data/backups/ai-memory-backup-okf-v0.2-20260904-113429.tar.gz`
  (1.9 MiB, 257 entries) and left a git checkpoint `44a1c9a87ab5` ("upgrade
  baseline: existing wiki tree before recovery checkpoints"). The homepage shows
  a restore notice until that archive is deleted.
- **All 7 original Orcivo pages preserved** — identical paths, titles and IDs
  (`notes/agent-orchestration-setup.md`, `notes/03.1-discovery-2026-09-01.md`,
  `_lint/2026-09-03.md`, `_lint/2026-09-04.md`, 3× `sessions/*`).
- Store-wide 23 → 23 latest pages preserved; **+3 structural pages per project**
  added by OKF v0.2 (`index.md` "Bundle index" + monthly `log-2026-08.md` /
  `log-2026-09.md`). Orcivo project 7 → 10 pages. This is **new scaffolding, not
  data loss or corruption** — sessions unchanged (11), observations unchanged,
  FTS 24/24, contamination audit clean.
- All useful memories retrievable after migration (verified by `memory_query`
  parity against the live instance, see §7).

**`ROLLBACK_PROOF = PASS`:** the live 1.38.0 instance was never modified;
reverting = "keep using `:49374`". If 2.0 had been adopted and needed reverting:
`docker rm -f` the 2.0 container, `docker run` 1.38.0 against a volume restored
from backup #1 (or the OKF pre-migration archive). Documented procedure +
verified artifacts on hand.

## 4. Local embeddings (2.0 feature)

`LOCAL_EMBEDDINGS = PASS` (evaluated, works; **marginal value at Orcivo's scale**).

- On first 2.0 start the server fetches `all-MiniLM-L6-v2` (384-dim) in the
  background, ~87 MB, one time, into `/data/models`. Download itself ≈ 7 s on
  this host; hybrid search activates on the **next** restart.
- After restart: model load + startup embedding backfill = **5.2 s** for 47
  pages across 12 scopes, 0 failures.
- **RAM:** live 1.38.0 ≈ 61 MiB RSS; 2.0.2 with the local embedder resident ≈
  115–121 MiB RSS. **+~55 MiB**, stable, CPU idle at rest.
- **Disk:** +~88 MB model + ~2 MB OKF pre-migration archive. Eval `/data` grew
  15 MB → ~102 MB.
- **Retrieval quality:** with hybrid on, `memory_query` reports
  `streams_active = [fts, entity, vector, graph]` vs `[fts, entity, graph]` on
  1.38. On a deliberately keyword-free semantic query the top hits were
  **identical** to FTS-only; hybrid added one extra lower-ranked hit. At 7–10
  content pages the vector stream has almost nothing to disambiguate.
  **Conclusion: local embeddings are cheap and safe but do not measurably
  improve task context until the store is much larger (hundreds of pages).**
- No paid embedding provider was added or evaluated.

## 5. What was built (adapter seam — orchestration only)

All new/changed files are orchestration or docs. With `memoryAdapter.enabled=false`
(the committed default) every path below is inert and the dispatcher is identical
to `d52bc58`.

| File | Change |
|---|---|
| `scripts/orchestration/v2/memory-eval-adapter.ps1` | **new** — reference adapter. `memoryBootstrap`/`memoryHandoff` → bounded `memory_query`, writes `dispatcher/memory-context.json` (≤ `maxMemories` pages / ≤ `maxInjectChars`). `memoryFinalize`/`memoryHandoff` → one concise structured `memory_write_page` (whitelisted fields only). `memoryCheckpoint` → no-op (lifecycle hooks already capture bounded observations). Every failure path: stderr warning, `exit 0`. |
| `scripts/orchestration/v2/memory-adapter.ps1` | adapter script now resolved against **`Get-AuthorityRoot`**, not the task workspace/fixture — a task can never swap the adapter. |
| `scripts/orchestration/v2/dispatcher.ps1` | `Get-DispatcherMemoryContext` (returns `''` unless `memoryAdapter.enabled` **and** a bounded context artifact exists); `New-ImplementerPrompt` gains `-MemoryContext`, appended as an explicitly-labelled **"untrusted auxiliary background — NOT authority"** block, implementer prompt only. Observability counters `memoryRetrievedCount` / `memoryInjectedChars` / `memoryUsed` on dispatch state. Reviewers still get **no** memory. |
| `.orchestration/v2/config.v2.json` | `memoryAdapter` block documented + bounded knobs added (`baseUrl`, `project`, `workspace`, `maxMemories=5`, `maxInjectChars=2000`, `relevanceFloor=0`, `timeoutSec=6`). **`enabled` stays `false`.** |
| `scripts/orchestration/v2/tests/memory/run-memory-eval.ps1` | **new** — deterministic adversarial suite (no model calls). |
| `scripts/orchestration/v2/tests/memory/run-memory-ab.ps1` | **new** — the real cross-provider A/B (disposable fixtures, real Claude+Codex). |

Regression: `run-dispatcher-tests.ps1` 16/20 PASS + 4 SKIP (unchanged), `v2.1.ps1
selftest` 8/8 — no regression from the dispatcher edit.

## 6. Deterministic adversarial suite

`run-memory-eval.ps1` against the 2.0.2 eval instance — **6/6 PASS**:

| ID | Check | Result |
|---|---|---|
| M-01 | stale decision superseded by a newer write on the same path | PASS — `memory_query` returns the current value; upsert keeps one page |
| M-02 | irrelevant memory from another task must not dominate a focused query | PASS — on-topic decision ranks above the unrelated note |
| M-03 | memory from another project must not leak | PASS — a page in `ai-memory-eval-other` never appears in a `project=`-scoped query |
| M-05 | ai-memory unreachable → dispatcher continues | PASS — adapter script `exit 0`, hook returns `ok=true`, no context artifact, dispatch proceeds |
| M-06 | corrupted / non-JSON-RPC response → fail soft | PASS — adapter `exit 0` on HTML/404, not a task failure |
| M-07 | duplicate memory → no duplicate effect | PASS — same path written twice → exactly one page |

Covered by the real A/B (§9):

- **M-09 / M-10** (provider switch Claude→Codex and Codex→Claude — relevant memory
  recovered) — **PASS both directions.** The fresh implementer retrieved the
  prior decision and applied/cited it.
- **M-04** (agent-written memory cannot override acceptance) — **PASS in the
  wild.** The injected block is explicitly labelled non-authority and separate
  from the frozen contract; the memory-blind reviewer refused to certify the
  memory-sourced value against AC3 → the task did not publish on memory's say-so.

Structural / covered elsewhere:

- **M-08** (resolved review finding not treated as open) — the adapter writes
  `tier: episodic` completion/handoff pages; `memory_query` recency + the M8
  forget-sweep age these out; no "open findings" channel exists in the adapter.
- **M-11** (context rollover) — unchanged: continuation checkpoints keep their
  closed whitelist (no hidden reasoning); memory is re-queried on the fresh
  invocation, never carried in the checkpoint.
- **M-12** (dispatcher restart) — `memory-context.json` is on disk and bounded;
  a fresh process re-reads it and the next `memoryBootstrap` re-queries. Memory
  stays auxiliary across restart.

## 7. Project identity / isolation (§10)

`PROJECT_ISOLATION = PASS (with a caveat)`.

- `memory_query`/`memory_write_page` correctly isolate by `workspace`+`project`
  (M-03). The adapter **always passes `project` explicitly** from config, so
  every dispatcher-driven read/write is pinned to one logical project regardless
  of the agent's working directory (agents run in `%TEMP%\orcivo-dispatcher\<runId>`
  clones).
- **Caveat — ambient fragmentation:** ai-memory derives project identity from the
  working-directory basename. The live store already contains **12 sibling
  projects** — `orcivo` (10 pages) plus `Desktop`, `Encryptedx`, `claudetest`,
  `ct_1788318815`, `scratch`, and `POC-A-*`×3 / `POC-C-*`×2 / `POC-D-*` (7 pages
  each) — created by Claude sessions run from parent dirs, temp dirs, and the
  `.orchestration/worktrees/POC-*` git worktrees. 2.0's `audit-contamination`
  reports "no structural contamination" because each session *did* land in the
  project matching its cwd — this basename fragmentation is not something it
  flags. **The dispatcher path is safe (explicit pin); a broader "normal
  operation" rollout needs every Orcivo worktree to pin `project=orcivo`** (via
  `.ai-memory` config or `AI_MEMORY_PROJECT`) or the knowledge keeps splitting.

## 8. Secret / privacy (§11)

`SECRET_EXCLUSION = PASS`.

Synthetic secret corpus pushed through the adapter payload path
(`ConvertTo-MemorySafePayload` + `Protect-ArtifactText`): an
`ORCIVO_SYNTHETIC_SECRET_…` token, a fake `AKIA…` key, `password=hunter2`, a
`postgres://u:p@host/db` URL, and a `Bearer eyJ…` JWT, placed in `title`,
`acceptance`, a nested `env` map, and `candidateConstraints.token`.

Result: `env` key dropped whole; `candidateConstraints` emptied; `acceptance` →
`[REDACTED]`; `title` → `deploy with [REDACTED]`. **All five secret forms absent
from the sanitized payload.** The adapter also only ever writes whitelisted
manifest fields (`taskId`, `title`, `type`, `acceptance`) through the same
sanitizer, and it never writes transcripts, env, or reasoning. With the committed
`enabled=false` the write path is not even reached.

## 9. A/B — one representative cross-provider task

**Design.** A prior architectural decision ("every HTTP client uses a `30000` ms
request timeout; do not introduce other values") is recorded into ai-memory,
*attributed to provider X*. A **fresh** provider Y is then dispatched to
implement a new HTTP client (`lib/client.js`) and told only to "use the project's
established standard timeout". Identical task, acceptance, and fixture repo in
both arms.

- **Arm A** — `memoryAdapter.enabled=false`. Y has no way to know the standard.
- **Arm B** — `enabled=true`, bounded retrieval from the 2.0.2 eval instance.

Both handoff directions: **Claude→Codex** (decision by Claude, recovered by
Codex) and **Codex→Claude**. Real Claude + Codex CLI calls through the real
dispatcher (`pilot.ps1 run-once`), disposable fixtures, opposite-provider review,
real integrator push to a bare remote.

### Results

Raw: `.orchestration/v2/logs/memory-ab-result.json` + the four disposable
candidate trees. The prior standard is **`30000` ms**.

| Arm | Implementer | Memory | Value it chose | Recall | Contradiction | Impl attempts | Provenance | Terminal state |
|---|---|---|---|---|---|---|---|---|
| Claude→Codex **A** | Codex | **off** | **`5_000`** | ✗ | ✓ (5000 ≠ 30000) | 3, then `BLOCK` | — | `BLOCK` — "5,000 ms is unsupported… another unsupported guess" |
| Claude→Codex **B** | Codex | **on** (272 ch, 1 page) | **`30_000`** | ✓ | ✗ | **1** — "no correction necessary" | from injected memory block | `WAITING_HUMAN` |
| Codex→Claude **A** | Claude | **off** | `30000` (coincidence) | ✗ — "no existing constant found; **used 30000 as the standard value**" | ✗ (lucky) | 1 | — (declared a guess) | `WAITING_HUMAN` |
| Codex→Claude **B** | Claude | **on** (271 ch, 1 page) | **`30000`** | ✓ | ✗ | 1 | **cites `decisions/http-client-timeout.md`** in code comment + decision log | `WAITING_HUMAN` |

**What the A/B shows:**

- **DECISION_RECALL — memory ON is measurably better both directions.** With
  memory, both providers used the exact prior value *and* attributed it (Codex
  applied it with zero correction cycles; Claude wrote
  `// Project standard HTTP request timeout: 30000 ms (see decisions/http-client-timeout.md)`).
  Without memory, Codex picked `5000` (wrong) and Claude picked `30000` only as
  an explicit unsupported guess.
- **REWORK — lower with memory.** Claude→Codex without memory took 3 implementer
  attempts and still `BLOCK`ed; with memory it was one clean attempt.
- **CONTRADICTIONS — 1 without memory (Codex `5000`), 0 with memory.**
- **HANDOFF_PROMPT_SIZE / CONTEXT_USAGE — negligible.** 271–272 injected
  characters, one page, well under the 2000-char bound.
- **IRRELEVANT / STALE memory — none observed**, but the eval store had only one
  relevant page for this query, so this is **low-confidence** — the real risk
  (noise at a few hundred pages) was not exercised.
- **No arm PUBLISHED — and that is correct, not a memory failure.** AC3 ("matches
  the established standard") is unverifiable from the diff alone, and the reviewer
  is **deliberately memory-blind**. It refused to certify a value it could not
  independently confirm ("cannot be confirmed against the established standard…
  need evidence that 30000 ms is the project standard rather than an arbitrary
  choice"). This is **M-04 holding in the wild**: memory helped the implementer,
  the acceptance gate was *not* fooled by it, authority stayed with the harness.
  **Architectural takeaway:** a decision that must be *enforced downstream* has to
  be materialised in the repo (a constant, a doc, a schema) — memory alone makes
  it *recalled*, not *checkable*.

`CLAUDE_TO_CODEX_MEMORY_HANDOFF = PASS` · `CODEX_TO_CLAUDE_MEMORY_HANDOFF = PASS`
(handoff = the fresh implementer recovering the earlier decision; verified in
both directions).

Harness note: `memory-ab-result.json`'s `decisionRecall` field reads `false`
everywhere because it inspects the *published* file and nothing published; the
recall evidence above is from the candidate trees and the agents' own decision
logs.

## 10. Answers (owner brief §16)

```
AI_MEMORY_CURRENT_VERSION           = 1.38.0
AI_MEMORY_2_RELEASE_STATUS          = STABLE_RELEASE_AVAILABLE   (2.0.2, 2026-09-03, latest)
AI_MEMORY_2_TESTED                  = YES   (isolated 2.0.2 instance on :49375, copied data)
MIGRATION_COPY                      = PASS
ROLLBACK_PROOF                      = PASS
LOCAL_EMBEDDINGS                    = PASS  (works; marginal retrieval gain at current store size)
CLAUDE_TO_CODEX_MEMORY_HANDOFF      = PASS  (Codex recovered the exact prior decision from memory; without it, wrong value + BLOCK)
CODEX_TO_CLAUDE_MEMORY_HANDOFF      = PASS  (Claude recovered and cited the decision; without it, unattributed guess)
CONTEXT_ROLLOVER_MEMORY             = PASS  (structural — checkpoint whitelist unchanged, memory re-queried fresh)
RESTART_MEMORY                      = PASS  (structural — bounded on-disk artifact, re-query on next bootstrap)
MEMORY_OFFLINE_FAILSOFT             = PASS  (M-05/M-06; dispatcher continues)
PROJECT_ISOLATION                   = PASS  (with ambient-fragmentation caveat, §7)
SECRET_EXCLUSION                    = PASS
A_B_RESULT                          = BETTER  (recall/rework/contradictions all improve at negligible cost; not STRONGLY_BETTER — one task, and end-to-end completion is still gated by the memory-blind reviewer)
RESOURCE_IMPACT                     = +~55 MiB RSS, +~90 MB disk (one-time model), +5 s first restart; negligible steady-state CPU. Adapter adds one bounded HTTP round-trip per task start / handoff (timeoutSec=6, fail-soft).
RECOMMENDATION                      = KEEP_OPTIONAL_DISABLED  (seam proven + A/B positive; enable after a multi-task trial and worktree project-pinning; adopting 2.0.x in place is a separate owner call)
AUTOPILOT_AUTHORITY_INDEPENDENT_OF_MEMORY = PASS  (enabled=false ⇒ byte-identical to d52bc58; M-05/M-06 + reviewer-no-memory + M-04-in-the-wild all hold)
```

## 11. Recommendation — `KEEP_OPTIONAL_DISABLED`

The adapter seam works, is fail-soft, keeps memory strictly auxiliary, and the
A/B is a **positive** signal: with memory a fresh provider recovered a prior
cross-provider decision exactly and with less rework; without it, one provider
picked a contradictory value and blocked. `AI_MEMORY_ADAPTER_SEAM = PASS`.

It is **not** recommended to flip `memoryAdapter.enabled` on for real Orcivo
tasks yet, because:

1. **One task, one decision, one relevant page.** The failure modes that matter
   at scale — irrelevant retrieval, stale/superseded decisions winning, noise
   crowding the prompt — were only tested synthetically (M-01/M-02), not against
   a realistic corpus. Enabling on this evidence would be "integrating because it
   is new".
2. **Ambient project fragmentation (§7).** The live `orcivo` project is missing
   ~25 pages siloed in `POC-*` / `Desktop` / `Encryptedx` sub-projects created by
   worktree/parent-dir sessions. Until every Orcivo checkout pins
   `project=orcivo`, "turn on memory" means "turn on a partial, fragmented view".
3. **The reviewer stays memory-blind by design**, so a memory-only decision is
   recalled but not enforceable — value lands only if it's also in the repo. Real
   Orcivo tasks would need their acceptance criteria written to not depend on
   unverifiable "established standards".
4. **Adopting 2.0.x in place is a separate decision** (store migration on the
   live volume, healthcheck env, re-pull) — the adapter works identically against
   the current 1.38.0, so the flag and the upgrade are independent choices.

**Path to `ENABLE`:** (a) pin `project=orcivo` in every Orcivo worktree
(`.ai-memory` config or `AI_MEMORY_PROJECT`); (b) run the A/B harness over 5–10
varied tasks with a populated store and confirm irrelevant/stale retrieval stays
low; (c) owner decides on 2.0.x adoption; (d) then flip the one-line flag below.

`AI_MEMORY_ADAPTER_SEAM = PASS`, `memory.enabled = false` — kept, documented here.

## 12. If enabled — exact change (owner approval required)

Do **not** enable for real Orcivo tasks automatically. The single change that
turns it on, for owner approval:

```diff
  "memoryAdapter": {
-   "enabled": false,
+   "enabled": true,
    "script": "scripts/orchestration/v2/memory-eval-adapter.ps1",
-   "baseUrl": "http://127.0.0.1:49374",
+   "baseUrl": "http://127.0.0.1:49374",   // 1.38.0 live, or a 2.0.x instance once adopted
    "project": "orcivo",
    "workspace": "default",
    "maxMemories": 5,
    "maxInjectChars": 2000,
    "relevanceFloor": 0,
    "timeoutSec": 6
  }
```

Bounded-retrieval policy already enforced by the adapter + `Get-DispatcherMemoryContext`:
max 5 memories, max 2000 injected chars, project+workspace scoped, newest-write-wins
(upsert on path), implementer prompt only, never the reviewer, fail-soft.
Observability: `memoryRetrievedCount`, `memoryInjectedChars`, `memoryUsed` on
dispatch state; adapter stderr on every fallback.

Adopting 2.0.x itself (independent of the adapter flag) is a separate owner call:
it needs a re-pull of `:2.0.2`, an in-place store migration (backup-gated, proven
on the copy), and `AI_MEMORY_SERVER_URL` set for the container healthcheck when
not on the default port (the eval instance shows `unhealthy` purely from that
port mismatch — the server itself served every request).

## 13. Cleanup

Per owner decision the eval instance is **torn down** after this report:
`C:/Users/Encryptedx/orcivo-ai-memory-eval/teardown.sh` removes the
`ai-memory-eval` container, the `ai-memory-eval-data` + `ai-memory-backup`
volumes, and the pulled `:2.0.2` image. Host backup tarballs are kept. Live
1.38.0 (`:49374`) is untouched.
