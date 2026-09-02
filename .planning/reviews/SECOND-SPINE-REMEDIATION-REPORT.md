# SECOND_SPINE_REMEDIATION — report

Date: 2026-09-02
Baseline HEAD: `5c55a916b2b0f4b4d3eaf3f3b491c702b1975ead` (`5c55a91`)
Trigger: `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md`
(`SECURITY_SPINE_REVIEW = FAIL`, `NEXT_REMEDIATION_STAGE_ALLOWED = NO`).

Scope: every violation the second independent review **reproduced** against a
control the first V2 spine claimed to address. Each reproduced exploit is now a
versioned regression test. 23/23 + 40/40 was explicitly *not* treated as
sufficient.

Not implemented (deferred, unchanged, **not** downgraded to PASS): C-05, C-06,
H-02 (full), H-08, H-09 (full), H-10. No real-task entrypoint exists. No
adaptive/model routing, skills parity, subagents, real GSD execution, P03,
T12/T13, persistent DB, or production wiring was touched.

---

## Per-finding verdicts

| Finding | Verdict | Regression test(s) |
|---|---|---|
| **C-01** ledger serialisation + integrity | **PASS** | `ledger-concurrency 2` / `8` (atomic ledger lease over select+validate+choose-seq+append+seal; no corruption, one serialized history); `ledger-tamper truncate` / `rewrite` / `dupseq` / `stalehead` (→ QUARANTINED, non-dispatchable, append refused); `ledger-resurrection published` / `quarantined`; `fsm-monotonic` (WAITING_HUMAN removed from dispatchable set) |
| **C-02** review = real JSON schema | **PASS** | `review-parse`: `extra-root-field`, `extra-nested-field`, `approve-unrelated-criterion`, `approve-wrong-spec`, `huge-finding`, `hostile-json`, `multi-envelope`, `truncated`, `invalid-json`, `bad-schema`, `crash` (reviewer exit≠0), `inject-prose-verdict`, `spec-echo-attack` — all fail closed. The authoritative `.orchestration/v2/schemas/review-envelope.schema.json` is loaded and enforced at runtime (recursive `additionalProperties:false`, size/count/length bounds); criteria ids must equal the frozen acceptance set; every bound hash exact |
| **C-03** content-addressed attestations | **PASS** | `attest-stale tree` / `config`; `attest-payload-mutation`; `attest-latest-authoritative`; `contract-tamper spec/acceptance/profile/contractField`; `integration-stale-after-review`. Binding collector recomputes contract hashes from real spec/acceptance/profile |
| **H-01** failure classification | **PASS** | `negative-corpus`; `pipeline-block app-429-crash` (app text with 429/quota, no control channel → FAILED, no failover) |
| **H-03** review substantiation | **PASS** | `review-parse approve-no-evidence` / `approve-crit-finding` / `approve-unreviewed` / `approve-wrong-hash` / `approve-wrong-spec` / `approve-unrelated-criterion` |
| **H-04** integration / remote CAS | **PASS** | `pipeline-e2e` (push confirmed + remote ancestry + tree proof); `integration-no-push-impossible` (no remote → INTEGRATION_FAILED, never PUBLISHED); `integration-remote-race`; `integration-post-review-target-movement` |
| **H-05** leases | **PASS** | `lease-live-owner-stale-heartbeat` (live holder + ancient heartbeat → second acquire REFUSED); `lease-malformed-quarantine`; `lease-heartbeat-renewal` (CAS, holder-only); `lease-cas-and-pidreuse`; 8-process race → exactly one |
| **H-06** contract freeze / protected paths | **PASS** | `canonical-dot-path` (`.planning` matched under `.PLANNING`, `./.planning`, `.\.planning\`, `foo/../.planning`); `protected-dot-broadscope` (unrestricted scope still POLICY_BLOCKs `.planning` as PROTECTED); `empty-scope-fail-closed`; `contract-compliance protected`; `pipeline-block protected` / `protected-dot-planning` / `protected-scripts` |
| **H-07** preflight | **PASS** | `preflight-gates`; `preflight-absent-version empty-index` / `missing-task` (unconditional reject); `preflight-fetch-forgery` |
| **H-11** secret persistence | **PASS** | `pipeline-secret-crash single` / `pem`. Streaming + multiline-buffered redaction; sanitize before every artifact write; recursive sweep on every pipeline exit path; over-long-line guard against redaction DoS |
| **H-12** executable / argv safety | **PASS** | `argquote-roundtrip`; `id-and-path-grammar` (`Resolve-Executable -NativeOnly` rejects a `.cmd` wrapper; reparse containment; root containment) |
| **M-01** scope conflict | **PASS** | `contract-compliance out-scope`; `empty-scope-fail-closed`; `pipeline-block out-of-scope` |
| **M-03** no-change contract | **PASS** | `pipeline-no-change-accepted` — `NO_CHANGE_ACCEPTED` terminal (monotonic), evidence bound to the exact frozen acceptance-criteria set + `contractHash`; `contract-compliance no-change` |
| **M-05** reviewer provenance | **PASS** | `pipeline-reviewer-provenance` — attestation `producer` is the launcher's captured runtime metadata; the envelope's self-report is advisory only |
| **NC-01** env bypass | **PASS** | `env-bypass-attempt` (`ORCH_V2_TESTING=1` + `ORCH_V1_REGRESSION_HARNESS=1` unlock nothing; `Assert-DisposableRoot` rejects the authority root and demands a fixture marker); `V1 supervisor run/loop/cleanup hard-disabled` (no override). `Invoke-SpineRun` moved to `tests/`; `spine.ps1` has no `run` verb |
| **NH-01** idempotent freeze | **PASS** | `contract-idempotent` — `frozenAt`/`frozenBy` moved to an unhashed `audit` block; re-freezing identical content returns the same object/hash |
| **NH-02** verification attestation | **PASS** | `verification-profile-mutation` — declarative profiles in `config.v2.json`; the frozen contract binds `verificationProfileHash` + `verificationDefinitionHash`; the check attestation carries `effectiveInvocationHash`; the task cannot supply commands/exe/args/cwd/env |
| **NM-01** attestation integrity | **PASS** | `attest-payload-mutation` (integrityHash covers producer + payload + findings); `attest-latest-authoritative pass-then-fail` / `approve-then-reqchanges` (a later negative result invalidates an earlier positive) |
| **NM-02** remote failures close the ledger | **PASS** | `integration-no-push-impossible` (→ `INTEGRATION_FAILED` durable event); `integration-remote-race` (→ `REMOTE_DIVERGED`); `_fail` appends a terminal ledger transition for every remote-CAS/ancestry/push failure |
| **NL-01** protected-path test overstated scope | **PASS** | replaced by `protected-dot-broadscope` (broad scope, still blocked as PROTECTED specifically), independent of ordinary scope rejection |

### PARTIAL

| Item | Verdict | Note |
|---|---|---|
| #8 push-rejection-after-CAS | **PARTIAL** | Code path present (`_fail … PUSH_FAILED` appends the ledger event). The TOCTOU window between the expected-SHA CAS and the push is not deterministically reproducible in the harness; the reachable divergence case (`REMOTE_DIVERGED`) is tested end to end. |
| #10 reparse-point containment for executor scope | **PARTIAL** | Protected-path matching is canonical-lexical (Windows case + separator + dot segments). `Resolve-Executable` does reparse containment when a root is given. Junction-inside-worktree scope enforcement is folded into C-06 (OS isolation), deferred. |
| #12 fetch freshness | **PASS (observation-bound)** | `Invoke-PreflightFetch` runs a real `git fetch` via a controlled primitive and records `{remote, target, beforeSHA, observedRemoteSHA, at, invocation, result}`. Preflight rejects a stale/failed/mismatched observation. A fully forged observation with `observedRemoteSHA == local` and a fresh timestamp would pass — the dispatcher contract is "call `Invoke-PreflightFetch` immediately before `Test-Preflight`". |
| #15 minimal prompt persistence | **PARTIAL** | Prompt / contract text is sanitised (redacted) before every write and swept on every exit path; a hash/manifest-only form is not yet used. No raw synthetic secret persists in any artifact root. |
| C-04 | **PARTIAL** | Gate is a durable hash-bound decision — `gateHash` recomputed on read over `{gateId, taskVersionId, specHash, decision, approvalIdentity, approvalTimestamp, nonce}`; `gate-tampering` covers every field. Full external-identity approval chain deferred. |
| H-02 | **PARTIAL** | Reviewer prompt fenced + read-only contract; ephemeral profile isolation deferred with C-06. |

### DEFERRED (not PASS)

C-05 (verified process-tree kill), C-06 (OS-enforced executor isolation), H-08
(full crash-resume protocol), H-09 (per-check hard timeouts / circuit breaker /
budgets — config carries limits; enforcement across every executable path is
incomplete), H-10 (machine-readable GSD parser). Real Claude/Codex disposable
smoke tests. No real task entrypoint.

---

## Counts

- **V1 regression suite** (`scripts/orchestration/tests/run-tests.ps1`): 8/8.
  The behavioural `run`/`loop`/`merge` cases were **removed** — that code path is
  permanently disabled. Kept: redaction, failure classification, scope conflict,
  index reconciliation, reconcile validation, dependency gating, crash-recovery
  reporting, status (inspection verbs only).
- **V2 adversarial suite** (`scripts/orchestration/v2/tests/run-spine-tests.ps1`,
  `spine.ps1 selftest`): 86/86. Throwaway git repos under `$env:TEMP`, bare
  origins, no model calls.
- **New adversarial cases this session:** ~50 (ledger concurrency ×2, ledger
  tamper ×4, ledger resurrection ×2, review fuzz ×11 new, contract tamper ×4 +
  idempotency + profile mutation, attestation payload/latest-result ×3, preflight
  absent-version ×2 + fetch forgery, gate tamper ×6, canonical dot-path,
  protected-dot-broadscope, empty-scope, lease live-owner + malformed + heartbeat,
  env-bypass ×2, secret-crash ×2, no-change-accepted, reviewer-provenance,
  no-push-impossible, post-review target movement).
- ledger concurrency: 2 and 8 writers, no corruption.
- review fuzz: 18 cases, all fail closed.
- contract tamper: 5 + verification-profile mutation.
- integration race: remote-advance + post-review target movement, both blocked,
  ledger closed to a terminal state.
- lease-live-owner: live holder + stale heartbeat → second acquire refused.
- protected-dot-path: `.planning` matched under 6 forms including
  `.\.planning\` and `foo/../.planning`.
- preflight absent-version: empty index and missing task both rejected.
- secret-crash: single-line + multiline PEM, zero raw synthetic secret anywhere.
- env-bypass: legacy vars unlock nothing; V1 real verbs hard-disabled.

---

## READY_FOR_THIRD_SECURITY_REVIEW = YES

`SECURITY_SPINE_REVIEW` is **not** declared PASS here — only an independent
reviewer can do that.
