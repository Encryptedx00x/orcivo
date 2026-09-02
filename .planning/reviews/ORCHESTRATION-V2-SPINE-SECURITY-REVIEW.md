# Second Independent Security Review — Orchestration V2 Security Spine

Date: 2026-09-02

Scope: `scripts/orchestration/v2/**`, `.orchestration/v2/**`, documented V2 security claims, public orchestration entrypoints, and V1/V2 authority separation

Baseline reviewed: `e43a0075ca549dcf9a04f510c6a6b2b9a6e547cf` (`e43a007`)

## VERDICT

**REJECT**

The V2 security spine is not ready to serve as the security foundation for real-task execution. This conclusion does not reject the spine merely because C-04, C-05, C-06, H-02, H-08, H-09, and H-10 remain explicitly deferred. It follows from independently reproduced violations in controls that the implementation declares addressed: concurrent ledger mutation corrupts the ledger; structured review accepts schema-invalid and acceptance-incomplete approvals; attestations remain fresh after material contract/profile mutation; integration can publish without a push and can introduce unreviewed target content; a live lease can be broken; protected dot-directories are not matched correctly; preflight accepts a requested version absent from the index; and raw synthetic secrets persist on failure paths.

The implementation contains useful fail-closed components, particularly the task-version identity formula, normal terminal-state handling, application-output/provider-failure separation, and baseline V1/V2 namespace separation. Those components do not compensate for the broken end-to-end guarantees above.

Approval of this review would not mean `READY_FOR_CANARY`. This review does not grant approval.

## REVIEW METHOD AND BASELINE

The review inspected runtime code rather than treating documentation or test existence as proof. It exercised the checked-out Windows implementation, disposable repositories and bare origins, concurrent PowerShell processes, hostile structured-review envelopes, stale attestations, lease races, policy path cases, failure classification, and synthetic-secret persistence.

Initial repository confirmation:

- branch: `main`
- HEAD: `e43a0075ca549dcf9a04f510c6a6b2b9a6e547cf`
- last commit: `e43a007 chore(orchestration): espinha de seguranca v2; v1 vira referencia rejeitada`
- worktree: clean and synchronized with `origin/main`

Baseline regression results:

- V1 regression suite: **23/23 passed**
- V2 adversarial suite: **40/40 passed**

These suite totals were reproduced but are insufficient: additional adversarial cases below failed the claimed guarantees.

## ORIGINAL_FINDINGS

| Finding | Status | Independent assessment |
|---|---|---|
| C-01 — ledger/exactly-once | **PARTIALLY_FIXED** | `taskVersionId` correctly binds `taskId + planningHead + specHash + acceptanceHash` (`ledger.ps1:49`, `contract.ps1:50`). Normal repeated reconciliation and terminal-state tests pass. However, sequence selection and append are separate operations (`ledger.ps1:141`, `ledger.ps1:153`), so concurrent writers can choose the same sequence and leave the ledger corrupt. An eight-process attack reproduced `CORRUPT`. The sequence-only ledger has no hash chain or sealed tail, so tail truncation can remove a terminal event and expose an earlier dispatchable state without detection. The configured dispatchable set also includes `WAITING_HUMAN` (`config.v2.json:12`). |
| C-02 — structured review | **PARTIALLY_FIXED** | A single-envelope parser and several semantic checks exist, and malformed/truncated/multiple-envelope outputs generally fail closed. The runtime does not enforce the authoritative JSON Schema: its validator is a bespoke subset (`review-envelope.ps1:30`). Extra fields were accepted; arbitrary nonempty criterion IDs were accepted instead of the frozen acceptance set (`review-envelope.ps1:137`); a wrong `specHash` was accepted; and a 1.1-million-character finding was accepted. The parser therefore permits ambiguous or under-specified `APPROVE` results. |
| C-03 — content-addressed attestations | **PARTIALLY_FIXED** | Basic binding changes to HEAD/tree/diff/config are detected. The binding collector trusts stored contract hashes and does not recompute them from `specText`, `acceptanceText`, or the actual verification profile (`attest.ps1:33`). Independent mutation of those values left the attestation fresh. Attestation integrity explicitly excludes payload and producer (`attest.ps1:89`), and freshness accepts any positive `PASS` or `APPROVE` artifact rather than enforcing the required kind/result pair (`attest.ps1:145`). Most critically, integration may merge current target content after review (`integrate.ps1:86`) and publish the resulting unreviewed tree. |
| C-04 — human gates | **PARTIALLY_FIXED** | Correctly remains documented as partial. A stored gate checks status and spec hash, but not the integrity of its own `gateHash`, task-version identity, or nonce. A requested task version missing from the index bypasses gate/dependency evaluation (`preflight.ps1:91`). `WAITING_HUMAN` is dispatchable, so an index task without a real matching gate can be reconsidered. This deferred control must not be relied upon for a real-task guarantee. |
| C-05 — process-tree termination | **NOT_FIXED** | Correctly remains deferred. The runtime terminates only the direct child (`lib-v2.ps1:515`), with no Windows Job Object/process-tree containment. The streaming implementation reads output before the timeout wait, so a child retaining an open stream can also prevent timely timeout enforcement (`lib-v2.ps1:509`). |
| C-06 — executor isolation | **NOT_FIXED** | Correctly remains deferred. Execution is a local process in a worktree with inherited host capabilities; no sandbox boundary prevents access outside declared scope. It remains an absolute blocker for real-task execution. |
| H-01 — failure classification | **FIXED** | The tested classification surface separates structured control failures from application stdout/stderr. Negative corpus strings such as `429`, quota, billing, rate-limit, unavailable, authentication failure, and `PROVIDER_QUOTA` did not trigger provider failover; `UNKNOWN` did not fail over; and lineage policy limits cross-provider failover to one. This assessment is limited to the synthetic V2 adapter surface; a real provider adapter is not implemented. |
| H-02 — plan integrity | **PARTIALLY_FIXED** | Correctly remains documented as partial. Planning head/spec/acceptance participate in task identity, but no real roadmap parser/dependency graph exists and uncommitted planning/preflight guarantees are incomplete. No real-task claim may depend on this finding. |
| H-03 — review output validation | **PARTIALLY_FIXED** | Structured parsing is an improvement, but fail-closed approval is not achieved. The schema file declares `additionalProperties: false`, yet runtime validation never loads it. Reviewer process `exitCode` and `timedOut` are not checked before stdout is parsed (`pipeline.ps1:158`). Reviewer metadata is partly self-asserted, and expected acceptance criteria are not derived from the frozen contract. |
| H-04 — integration/remote CAS | **PARTIALLY_FIXED** | Remote movement, push rejection, branch movement, conflict, and occupied integration lease have protections in some paths. Nevertheless `Push` is optional (`integrate.ps1:35`) and `PUBLISHED` is appended unconditionally after the optional push block (`integrate.ps1:142`). A disposable-origin test reproduced `PUBLISHED` with no push and an unchanged remote. Advancing target after review also produced a different unreviewed integration tree and still published it. A post-push ancestry failure returns `PUSH_FAILED` without recording ledger failure. |
| H-05 — leases | **PARTIALLY_FIXED** | `FileMode.CreateNew` provided exactly one winner in initial two- and eight-process acquisition tests. Ownership after acquisition is unsafe: a live process is declared orphaned when its heartbeat ages past four stale intervals (`lease.ps1:47`), but pipeline/integration do not refresh heartbeats. A supported long-running operation can therefore lose its lease; this was reproduced. Heartbeat update and release use read-then-write/delete sequences without an atomic lease-ID CAS (`lease.ps1:106`, `lease.ps1:117`). |
| H-06 — contract freeze | **PARTIALLY_FIXED** | Contract creation uses `CreateNew`, but stored content is not revalidated on read. `_PathUnder` applies `.TrimStart('./')` to candidate paths (`contract.ps1:114`), stripping the leading dot from `.planning/**` and `.orchestration/**` while leaving protected prefixes unchanged. With unrestricted declared scope, an executor change under `.planning/**` was allowed. The freeze includes `frozenAt` in the hashed object (`contract.ps1:70`), making a repeated freeze of the same logical contract non-idempotent. |
| H-07 — preflight | **PARTIALLY_FIXED** | Several dirty/stale/planning checks exist, but the requested task-version check is conditional on finding that version in the index (`preflight.ps1:91`). An empty index was accepted for a requested version. `Register-Fetch` records a timestamp rather than performing or proving a fetch (`preflight.ps1:28`), so remote freshness is asserted rather than independently established. Direct testing switches also weaken the entrypoint boundary. |
| H-08 — crash/resume | **NOT_FIXED** | Correctly remains deferred. There is no complete replay/resume protocol for mid-state crashes. Concurrent corruption, stale live leases, and integration paths left in `INTEGRATING` make the gap security-relevant. |
| H-09 — budgets/circuit breaker | **PARTIALLY_FIXED** | Correctly remains documented as partial. Configuration contains limits, but arbitrary check scriptblocks have no enforced timeout and native streaming can block before `WaitForExit`. No complete lineage-wide budget/circuit-breaker enforcement exists. |
| H-10 — real GSD parser/dependency graph | **NOT_FIXED** | Correctly remains deferred. V2 uses a synthetic index and does not execute the real roadmap. This is a real-task blocker, not a reason by itself to reject the isolated primitives. |
| H-11 — secret handling | **PARTIALLY_FIXED** | Streaming redaction covers several single-line cases. Raw contract text is nevertheless written to contract and prompt artifacts before execution (`pipeline.ps1:92`, `pipeline.ps1:152`), and recursive scanning occurs only after integration (`pipeline.ps1:196`). Crash and early-return paths skip it; a synthetic secret persisted in two runtime artifacts after executor failure. Multiline PEM-shaped material also survived because streams are redacted line by line while the PEM pattern requires a multiline match (`lib-v2.ps1:343`). The artifact scanner covers fewer patterns than the redactor. |
| H-12 — Windows argument safety | **PARTIALLY_FIXED** | The real Windows argv corpus for spaces, quotes, metacharacters, Unicode, and malicious-looking IDs showed no shell injection; argument lists and `UseShellExecute = false` are used. The ID grammar rejects traversal/absolute-path forms. However, `Resolve-Executable` does not implement its documented rejection of script-wrapper extensions (`lib-v2.ps1:443`), path containment is lexical rather than junction-aware, and public integration parameters are not all canonicalized under an authoritative root. |
| M-01 — protected paths/scope | **PARTIALLY_FIXED** | Out-of-scope enforcement works for ordinary paths. Protected dot-path matching is broken by asymmetric normalization, and an empty declared scope means all files are considered in scope (`contract.ps1:170`). A review approval cannot override a generated `POLICY_BLOCK`, but the policy block itself is not reliably generated for protected dot-directories. |
| M-03 — empty-diff evidence | **PARTIALLY_FIXED** | Empty diff without evidence is blocked. Evidence is accepted when any entry has any criterion and nonempty reason (`contract.ps1:132`); it is not bound to the frozen acceptance criteria or contract hash. The pipeline then leaves the task at `APPROVED` rather than reaching a defined no-change terminal outcome (`pipeline.ps1:179`). |
| M-05 — reviewer metadata | **PARTIALLY_FIXED** | Metadata is required and stored, but model/effort/tool policy are taken from reviewer-controlled output (`pipeline.ps1:165`). Attestation producer metadata is excluded from integrity protection. It is therefore useful audit context, not an authoritative provenance guarantee. |

## NEW_CRITICAL

### NC-01 — Test-mode environment switches bypass execution-disable boundaries

**Severity:** Critical

**Evidence:** `scripts/orchestration/supervisor.ps1:51`; `scripts/orchestration/v2/lib-v2.ps1:40`; `scripts/orchestration/v2/pipeline.ps1:51`

The public V1 supervisor blocks real `run`, `loop`, and `cleanup` only when `ORCH_V1_REGRESSION_HARNESS` is not `1`. Setting that process environment variable restores the rejected V1 execution path. V2 similarly permits the real authority repository and synthetic gate construction when `ORCH_V2_TESTING=1`. These are user-controlled environment variables, not capabilities issued by an isolated test harness.

An actor or mistaken automation invocation able to set process environment can therefore bypass the documented “reference-only” V1 boundary and invoke real V1 task logic while C-05 and C-06 remain open. V2 currently has no `run` verb on `spine.ps1`, which reduces immediate reachability, but its exported script functions still trust the same unauthenticated switch. The real-task disablement must be structural and non-bypassable from normal entrypoints.

## NEW_HIGH

### NH-01 — Contract freeze is not idempotent

**Severity:** High

**Evidence:** `scripts/orchestration/v2/contract.ps1:70`, `scripts/orchestration/v2/contract.ps1:84`, `scripts/orchestration/v2/contract.ps1:88`

`frozenAt` is generated on every call and included in `contractHash`. If a contract already exists, the new hash is compared with the stored hash. Re-freezing the same task version at a later instant therefore produces a different hash and fails. Normal retry/reconciliation cannot safely converge on the already-frozen contract, creating a denial-of-service and crash-resume inconsistency at a security boundary.

### NH-02 — Verification execution is not bound to the verification attestation

**Severity:** High

**Evidence:** `scripts/orchestration/v2/pipeline.ps1:47`, `scripts/orchestration/v2/pipeline.ps1:136`; `scripts/orchestration/v2/attest.ps1:33`

The pipeline accepts an arbitrary `CheckBlock`, while the contract hashes only a verification-profile name. The executed block, executable, arguments, or authoritative profile contents are not content-addressed. A caller can change the actual verification procedure without staling the attestation. This is distinct from ordinary artifact staleness: the attested fact does not identify the check that produced it.

## NEW_MEDIUM

### NM-01 — Attestation integrity omits security-relevant provenance and result payload

**Severity:** Medium

**Evidence:** `scripts/orchestration/v2/attest.ps1:89`, `scripts/orchestration/v2/attest.ps1:145`

The attestation integrity calculation deliberately omits `producer` and `payload`. Those fields contain reviewer/check provenance and findings. They can be modified without invalidating `integrityHash`. Freshness also accepts either `PASS` or `APPROVE` for any requested kind, and succeeds if any positive artifact exists. A later negative result does not invalidate an earlier positive result. The ledger may preserve some event references, but the artifact API itself does not provide the stated content-addressed authority.

### NM-02 — Remote ancestry failure does not close the integration ledger state

**Severity:** Medium

**Evidence:** `scripts/orchestration/v2/integrate.ps1:133`

When push succeeds but subsequent remote ancestry proof fails, integration returns `PUSH_FAILED` without appending a failure transition. The ledger remains `INTEGRATING`, producing an ambiguous crash/resume state and allowing later code to reason from an incomplete terminal record.

## NEW_LOW

### NL-01 — Protected-path regression test proves scope rejection, not protected-path rejection

**Severity:** Low

**Evidence:** `scripts/orchestration/v2/tests/run-spine-tests.ps1` protected-path cases; `scripts/orchestration/v2/contract.ps1:114`

The existing test changes a protected file while the declared scope is `work/`. It passes because the file is out of scope before the faulty protected-prefix comparison matters. The test name overstates the exercised control and allowed the dot-prefix normalization defect to remain hidden.

## ADVERSARIAL_TEST_RESULTS

Temporary attack scripts and disposable repositories were removed after execution. No implementation file was modified.

| Attack | Observed result | Required result | Assessment |
|---|---|---|---|
| Review envelope with extra root/nested fields | `APPROVE` | schema rejection / human review | fail |
| Review omits real frozen criteria and supplies unrelated met criterion | `APPROVE` | `INCOMPLETE_REVIEW` | fail |
| Review uses wrong `specHash` | `APPROVE` | `INCOMPLETE_REVIEW` | fail |
| Review contains approximately 1.1M-character finding | `APPROVE` | bounded rejection | fail |
| Executor changes `.planning/**` with unrestricted scope | change allowed | `POLICY_BLOCK` | fail |
| Change contract spec/profile content while retaining stored hash fields | attestation fresh | stale | fail |
| Requested task version absent from reconciled index | preflight accepted | reject | fail |
| Integrate without `Push` | ledger `PUBLISHED`; remote unchanged | not published | fail |
| Move target after review | new integrated tree published | re-review required | fail |
| Let live owner heartbeat age and acquire from second process | second owner acquired and broke lease | second owner refused | fail |
| Executor crash after synthetic secret enters contract/prompt | raw value persisted in two runtime artifacts | zero persistence | fail |
| Multiline PEM-shaped stream value | raw value persisted | redacted | fail |
| Eight concurrent ledger appends | ledger became `CORRUPT` | one serialized history | fail |
| Two/eight concurrent initial lease acquisitions | exactly one initial owner | exactly one owner | pass |
| Application output contains provider-looking strings | no cross-provider failover | no failover | pass |
| Unknown failure classification | no cross-provider failover | no failover | pass |
| Normal terminal-state reconciliation | no `PUBLISHED`/`QUARANTINED` resurrection | no resurrection | pass |
| Head/tree/diff/config binding mutations | stale attestation | stale | pass |
| Remote target moves before validated integration path | blocked in covered baseline case | blocked | pass |
| Push rejection | not published | not published | pass |
| Malformed, truncated, or multiple review envelopes | non-approval in covered baseline cases | fail closed | pass |
| Windows argv metacharacter corpus | no command injection | no injection | pass |
| Default V1 entrypoints without test switch | disabled | disabled | pass |
| V2 public `run` verb | unavailable | unavailable | pass |

### Structured-review fuzz coverage

The corpus included spec text containing `VERDICT: APPROVE`, false JSON in diff/spec material, two envelopes, leading/trailing text, Markdown fences, nested fence-like content, valid JSON with invalid schema, extra fields, missing criteria, `APPROVE` with critical findings, incomplete changed-file coverage, missing evidence, truncation, Unicode/control characters, extremely long findings, and reviewer payloads quoting hostile content.

The parser correctly rejected several syntactically ambiguous cases, but accepted the semantic/schema bypasses listed above. Therefore it is not fail closed.

### Integration and staleness coverage

Disposable local repositories and bare origins exercised target movement, push rejection, remote-ahead behavior, merge conflict paths, stale attestations, integration lease contention, validated-branch movement, ancestry checks, and no-push invocation. The invariant “`PUBLISHED` only after confirmed push plus proved remote ancestry” is false because push is optional. The invariant “integrator creates no unreviewed content” is false because it may merge current target after review.

No `git add -A`, implicit implementation commit, timestamp-based latest-artifact lookup, or V1-artifact fallback was found in the reviewed V2 integration path. This does not mitigate the post-review merge and optional-push defects.

### Secret-handling coverage

Only synthetic secrets were used. The corpus covered stdout, stderr, JSON-like values, bearer-like values, database URL shape, token/password key shapes, `sk`-like values, JWT-like values, multiline PEM-like values, executor failure, and timeout/error paths. Single-line stream redaction worked for covered forms. Raw contract/prompt persistence, early-return scan bypass, incomplete scan patterns, and multiline redaction failure violate the no-persistence requirement.

## DEFERRED_FINDINGS_VALIDATION

The threat model, attestation notes, handoff, and runbook do not falsely mark C-04, C-05, C-06, H-02, H-08, H-09, or H-10 as completely resolved. They describe them as partial, deferred, or outside the synthetic spine.

That documentation is accurate but not sufficient for safe execution:

- C-05 and C-06 remain absolute blockers for real-task execution.
- H-10 confirms that V2 still does not execute a real roadmap; its current index and agents are synthetic.
- H-08 means crash recovery cannot repair all intermediate states, including `INTEGRATING` and corrupted concurrent append histories.
- H-09 is silently implicated by native streaming and arbitrary check execution: configured timeouts do not bound every executable path.
- C-04/H-02 are silently implicated by preflight accepting an absent requested task version and by the unauthenticated testing switches.

Thus the deferred findings are not the direct basis for rejection, but parts of the current V2 paths do rely on missing guarantees more than the top-level `SECURITY_SPINE_V2 = PASS` statement suggests.

## V1/V2 SEPARATION

V2 uses its own directory roots, ledger, contracts, attestations, leases, and synthetic index. No path was found that treats a V1 PASS/review/check artifact or V1 runtime state as V2 authority. No default V2 entrypoint silently falls back to V1, and V2 does not yet execute the real roadmap.

V1 is disabled by default, but it is not effectively and structurally blocked: `ORCH_V1_REGRESSION_HARNESS=1` restores direct real V1 commands. A conventionally named environment switch is not an adequate security boundary. The corresponding V2 testing switch also bypasses real-repository protection. This violates the requested entrypoint guarantee while the real-execution blockers remain open.

## REQUIRED_BEFORE_NEXT_REMEDIATION_STAGE

1. Serialize ledger transition selection and append under an atomic ledger/task lock; add cryptographic event chaining or an equivalent sealed-head mechanism; prove tail truncation, rewrite, and concurrent writers fail closed.
2. Make contract creation deterministic and idempotent. Recompute and verify all stored content hashes on read, including spec, acceptance, verification profile, and contract.
3. Enforce the authoritative review JSON Schema at runtime with no extra fields, exact expected acceptance criteria, exact hashes/full SHAs, size limits, and mandatory successful reviewer process completion.
4. Bind the actual verification executable/profile/arguments/result to the verification attestation. Protect producer and payload integrity and require the correct attestation kind/result with authoritative latest-result semantics.
5. Require push for any publication path. Bind review to the exact integrated commit/tree, forbid post-review content creation, and record a terminal failure for every remote-CAS/ancestry failure.
6. Keep live leases live with heartbeats and implement atomic lease-ID compare-and-release/update/break semantics. Quarantine corrupt lease records instead of treating them as orphaned.
7. Correct canonical protected-path comparison on Windows, including case/separator behavior and reparse-point containment. Make empty scope fail closed and test protected paths independently of scope rejection.
8. Make preflight reject any requested version absent from the reconciled index, perform/prove remote fetch freshness, and cryptographically validate gate identity and content.
9. Remove runtime environment-variable bypasses from real entrypoints. Test helpers must be structurally isolated from production-capable scripts and unable to target the authority repository.
10. Redact or avoid sensitive contract/prompt persistence before every write, scan every V2 runtime/artifact root on all exits, cover multiline patterns, and prevent publication before the scan passes.
11. Enforce process-tree termination, executor isolation, crash-resume, complete budgets/circuit breakers, and real GSD parsing before any real-task entrypoint is introduced.
12. Add regression tests for every reproduced case in this report. Passing the current 23/23 and 40/40 suites must not be used as a substitute for those proofs.

SECURITY_SPINE_REVIEW = FAIL

NEXT_REMEDIATION_STAGE_ALLOWED = NO
