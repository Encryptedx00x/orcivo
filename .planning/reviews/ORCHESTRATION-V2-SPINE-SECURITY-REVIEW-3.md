# Third Independent Security Review — Orchestration V2 Security Spine

Date: 2026-09-02

Baseline reviewed: `5ea6731eaf3d0bd9b9c0797abad874aad09afa23`
(`5ea6731 fix(orchestration): segunda remediacao da security spine v2`), branch
`main`, initially clean and synchronized with `origin/main`.

Scope: `scripts/orchestration/v2/**`, `.orchestration/v2/**`, the two prior
independent reviews, the second-remediation report, threat model, attestation
notes, runbook, and agent handoff. Only disposable repositories, fake agents,
and synthetic secrets were used. No real task, P03, T12, T13, persistent DB, or
real Claude/Codex invocation was started.

## VERDICT:

**REQUEST_CHANGES**

The second remediation materially improves the ledger, normal contract reads,
candidate integration, ordinary protected-path normalization, and several
fail-closed review cases. The official baselines are green: V1 **8/8** and V2
**86/86**.

Those totals are not sufficient. Independent attacks reproduced violations in
controls the remediation declares fixed:

- the real verification result still depends on an arbitrary `CheckBlock` that
  is absent from the frozen definition and `effectiveInvocationHash`;
- schema-invalid review JSON with object/null/string values where arrays are
  mandatory is accepted as `APPROVE`;
- predictable prompt fences can be closed from hostile spec/diff content;
- a malformed lease is only quarantined for one call; the immediately following
  acquisition obtains the same key;
- a wildcard protected-path grant authorizes `.planning/**`;
- repeated freeze returns an already-tampered contract without validating it;
- JSON-shaped password/token/DATABASE_URL material survives redaction and the
  final recursive scan reports `clean=true`;
- a forged `NO_REMOTE` observation plus a gate removed only from the derived
  index makes preflight return `ok=true` although the frozen contract still
  requires the gate.

These are independent of the honestly deferred C-05/C-06/H-08/H-09/H-10 and
real-provider smoke work. The deferred items remain blockers for canary/real
tasks, but they are not the sole basis of this verdict.

Even a future PASS of this isolated spine would **not** mean
`READY_FOR_CANARY`.

## RETEST_OF_PREVIOUS_EXPLOITS

| Area | Independent retest | Result |
|---|---|---|
| Ledger: 2 writers | Official and independent-current suite produced one serialized history | PASS |
| Ledger: 8 writers | Official and independent-current suite produced one serialized history, no duplicate seq | PASS |
| Ledger: truncation/rewrite/duplicate seq/stale sealed head | Each derived `QUARANTINED`; append/dispatch refused | PASS |
| Ledger: terminal resurrection | `PUBLISHED`, `QUARANTINED`, and `NO_CHANGE_ACCEPTED` remain terminal | PASS |
| Contract: ordinary repeated freeze | Stable task version/hash | PASS |
| Contract: mutate spec/acceptance/profile/contract field then `Get-Contract` | Rejected as tampered/stale | PASS |
| Contract: mutate existing contract, then repeat `Freeze-Contract` | Returned the tampered object; only a later `Get-Contract` rejected it | **FAIL** |
| Structured review: authoritative schema file loaded | Runtime loads configured schema | PASS |
| Structured review: extra root/nested fields | Rejected | PASS |
| Structured review: unrelated/missing criteria, wrong hashes, missing evidence | Non-approval | PASS |
| Structured review: huge payload, crash, multiple envelope, truncation | Non-approval | PASS |
| Structured review: timeout signal | `processOk=false` is non-approval at parser boundary; actual hard timeout remains H-09/C-05 deferred | PASS/PARTIAL |
| Structured review: JSON type fidelity | Schema-invalid object/null/string accepted in array fields and yielded `APPROVE` | **FAIL** |
| Structured review: hostile spec/diff | Fixed delimiters were closed twice by hostile input; the existing `spec-echo-attack` tests output parsing, not fence integrity | **FAIL** |
| Verification authority | Profile mutation stales the contract, but arbitrary caller `CheckBlock` changes the actual result without changing the invocation hash | **FAIL** |
| Attestation producer/payload mutation | Integrity hash breaks | PASS |
| Attestation old PASS + newer FAIL | Latest negative blocks | PASS |
| Attestation old APPROVE + newer REQUEST_CHANGES | Latest negative blocks | PASS |
| Attestation wrong kind/conflicting kind | Integration asks separately for `check` and `review` and requires the correct positive result | PASS |
| Integration: publication without push | No-remote path ends `INTEGRATION_FAILED`, never `PUBLISHED` | PASS |
| Integration: post-review target movement / remote race / stale candidate | Refused and required rebuild/re-review | PASS |
| Integration: ancestry/tree checks | Code checks ancestry and exact reviewed candidate tree before `PUBLISHED` | PASS |
| Integration: rejected push after CAS | Failure path exists, but the harness still lacks a deterministic after-CAS push-rejection reproduction | PARTIAL |
| Integration: no unreviewed tree | Candidate SHA, branch head, attestations, merge tree, and remote tree are cross-checked | PASS |
| Lease: live owner + stale heartbeat | Second acquisition refused | PASS |
| Lease: renewal/wrong leaseId/dead owner/8-process acquisition | Holder-only renewal/release and one initial winner observed | PASS |
| Lease: malformed record | First call refused, moved the record aside; second call immediately acquired the key | **FAIL** |
| Protected path canonical forms | `.planning`, `.PLANNING`, `./.planning`, `.\.planning`, `foo/../.planning`, `.orchestration`, and `scripts/orchestration` matched | PASS |
| Protected path empty scope / broad declared scope | Empty scope blocked; `unrestrictedScope` alone did not authorize protected paths | PASS |
| Protected path broad protected grant | `ProtectedPathGrants @('*')` at risk C authorized `.planning/PWN.md` | **FAIL** |
| Reparse/junction scope containment | Still folded into C-06, explicitly deferred | DEFERRED |
| Preflight absent requested version / empty or stale index / wrong planningHead | Refused | PASS |
| Preflight failed real fetch | Non-OK result refused | PASS |
| Preflight fake fetch observation | Forged `result=NO_REMOTE`, `performed=false`, `invocation=FORGED` was accepted | **FAIL** |
| Preflight gate artifact field mutation | Gate hash tamper rejected | PASS |
| Preflight gate authority pointer | Changing only derived index `gate` to `none` bypassed the frozen contract gate | **FAIL** |
| Env bypass | `ORCH_V1_REGRESSION_HARNESS=1` and `ORCH_V2_TESTING=1` unlocked no V1/V2 production verb | PASS |
| Secret persistence: existing crash/PEM corpus | Existing single-line marker and multiline PEM crash cases left no raw match | PASS |
| Secret persistence: JSON password/token/DATABASE_URL | Redactor retained the JSON password/token and final recursive scanner returned `clean=true`, zero hits | **FAIL** |
| Windows argv/executable | Hostile argv round-trip passed; native-only wrapper rejection passed | PASS |
| Windows root/reparse containment | Lexical/root checks exist; full executor/reviewer filesystem boundary remains C-06 deferred | PARTIAL |
| No-change | Evidence must match the exact frozen criteria set and contract hash; terminal `NO_CHANGE_ACCEPTED` observed | PASS |
| Reviewer provenance | Envelope self-report is not authoritative in the synthetic harness; producer metadata comes from launcher-side constants | PASS/PARTIAL |

## NEW_CRITICAL

None.

## NEW_HIGH

### H3-01 — The actual verification procedure is still outside attestation authority

**Location:** `scripts/orchestration/v2/tests/pipeline-harness.ps1:63`,
`:169`, `:226`; `scripts/orchestration/v2/verification.ps1:81-97`

**Category:** Tampering / elevation of privilege

`Invoke-SpineRun` still accepts an arbitrary `CheckBlock`, ANDs it into the
verification result, and passes it again as `PostIntegrationCheck`. The frozen
profile and `effectiveInvocationHash` cover only the built-in profile. They do
not cover the scriptblock, its source, executable, arguments, environment, or
result.

Independent reproduction used the same profile and same
`effectiveInvocationHash` (`sha256:bd7b...c999ea9`): one external block made the
effective result `True`; another made it `False`. This is the substance of the
previous NH-02 exploit, not a new optional test feature. A caller-controlled
procedure remains load-bearing while the attestation says only the declarative
profile ran.

**Exploitability:** local pipeline caller/test harness; becomes security
critical the moment a real adapter reuses this composition.

**Impact:** unexecuted or substituted checks can be represented by a fresh PASS.

### H3-02 — Recursive secret scanning misses JSON secrets and runs after publication

**Location:** `.orchestration/v2/config.v2.json:136-170`;
`scripts/orchestration/v2/lib-v2.ps1:445-459`, `:555-571`;
`scripts/orchestration/v2/tests/pipeline-harness.ps1:225-248`;
`scripts/orchestration/v2/integrate.ps1:151-180`

**Category:** Information disclosure

The final scanner uses the smaller `scanPatterns` list. Its generic
password/token patterns are absent, and its `DATABASE_URL` pattern expects the
colon/equal sign immediately after the name, so JSON quoting defeats it.
Independent synthetic JSON containing `password`, `token`, and a credentialed
`DATABASE_URL` was preserved by `Protect-Line`; `Test-ArtifactsClean` reported
`clean=true`, `hits=0`.

Separately, the only recursive `_scanAll` in the composed pipeline executes in
`finally` after `Invoke-Integration`. `PUBLISHED` and the remote push can
therefore happen before the scan is evaluated. Even a detected hit merely
changes the returned status to `SECRET_LEAK`; it cannot retract the push.

**Exploitability:** executor/reviewer/check output or an in-scope generated file.

**Impact:** synthetic corpus proves persistence; real use could publish a
credential before the gate notices it.

### H3-03 — Hostile spec/diff can escape the fixed reviewer fences

**Location:** `scripts/orchestration/v2/review-envelope.ps1:252-262`

**Category:** Spoofing / tampering (prompt injection)

The prompt uses fixed, predictable `UNTRUSTED_*` delimiters without escaping,
encoding, length-prefixing, or nonce binding. A spec containing
`UNTRUSTED_TASK_SPEC>>>` and a diff containing `UNTRUSTED_DIFF>>>` produced two
closing delimiters for each section, placing attacker text outside the first
claimed data fence.

The output schema cannot prove that a model actually reviewed the files: all
expected hashes and criterion IDs needed to manufacture a syntactically valid
`APPROVE` are included in the same prompt. The existing `spec-echo-attack`
fixture instructs the fake reviewer to reject; it does not test a reviewer
obeying the escaped attacker instruction.

**Exploitability:** hostile task text or changed file content presented to a
future real reviewer.

**Impact:** valid-looking approval without independent review.

### H3-04 — Malformed lease quarantine is not sticky; the next caller acquires

**Location:** `scripts/orchestration/v2/lease.ps1:97-108`

**Category:** Tampering / denial of service / concurrency integrity

On malformed JSON, `New-Lease` moves the active record to a suffixed filename
and returns failure. That removes the authoritative key file. A second immediate
call sees the key as absent and wins `CreateNew`.

Observed: first call `ok=False, quarantined=True`; second call `ok=True` for the
same namespace/key. The versioned regression asserts only the first call and
therefore overstates the quarantine guarantee.

**Exploitability:** corruption, partial write, disk fault, or concurrent actor
that can malformed the record.

**Impact:** a key whose ownership can no longer be proved is reassigned instead
of remaining fail-closed, permitting simultaneous or unsafe continuation.

### H3-05 — A wildcard protected-path grant authorizes all authority paths

**Location:** `scripts/orchestration/v2/contract.ps1:109-115`, `:255-279`

**Category:** Elevation of privilege / tampering

Grant validation checks only that some grant is risk C. It does not require a
grant to name one exact configured protected prefix or forbid glob wildcards.
`ProtectedPathGrants @('*')` made a committed `.planning/PWN.md` change
`compliant=True` despite declared scope `work/`.

This differs from the passing broad-scope test: `unrestrictedScope` alone is
correctly prevented from reaching protected paths, but a broad explicit grant
collapses the entire protected-path boundary.

**Exploitability:** any contract-construction path that admits a broad/malformed
protected grant.

**Impact:** planning, orchestration policy, scripts, and acceptance authority can
all be changed inside a nominally frozen task.

## NEW_MEDIUM

### M3-01 — The “authoritative JSON Schema” validator accepts wrong JSON types

**Location:** `scripts/orchestration/v2/review-envelope.ps1:58-65`, `:95-99`

**Category:** Tampering / validation bypass

Whenever the schema expects an array, `_Validate` unconditionally wraps any
input as an array and returns before type checking. A raw envelope with:

- `criteria` as an object;
- `findings` as JSON `null`;
- `filesReviewed` as a string;

is invalid under the tracked Draft-07 schema but returned `APPROVE` in the
independent attack. Compatibility with PowerShell 5.1 single-item behavior must
not erase information available in the raw JSON syntax.

### M3-02 — Idempotent re-freeze trusts an existing stored hash before validating content

**Location:** `scripts/orchestration/v2/contract.ps1:144-155`

**Category:** Tampering

Normal `Get-Contract` correctly recomputes hashes. `Freeze-Contract`, however,
reads an existing object, compares only its stored `contractHash` with the newly
computed hash, and returns the existing object. After changing `specText` while
retaining stored hash fields, repeated freeze returned the mutated text. A later
explicit `Get-Contract` rejected it, but the freeze/read operation itself had
already exposed an invalid authoritative object to its caller.

### M3-03 — Preflight accepts forged `NO_REMOTE` observations and does not bind index gate to contract gate

**Location:** `scripts/orchestration/v2/preflight.ps1:63-78`, `:95-100`,
`:106-123`

**Category:** Spoofing / tampering

Preflight accepts `NO_REMOTE` as a successful fetch result and does not validate
`performed`, `remote`, `target`, `beforeSHA`, or `invocation`. It also validates
only `contract.planningHead` against the index; it never requires the selected
index entry's gate to equal the frozen `contract.gate`.

In a clean disposable repo, a forged observation
`{performed:false, invocation:"FORGED", result:"NO_REMOTE"}` plus changing only
the derived index gate from `g1` to `none` produced `Test-Preflight ok=True` with
no gate artifact. C-04's external identity chain is legitimately deferred, but
this bypass is earlier than external identity: the frozen requirement is never
asked for.

## NEW_LOW

### L3-01 — Heartbeat documentation/test naming overstates the implementation

**Location:** `scripts/orchestration/v2/lease.ps1:19-20`, `:180-200`;
`scripts/orchestration/v2/spine.ps1:54-55`

The header and `spine.ps1 explain` claim background heartbeats. The implemented
`Start-LeaseHeartbeat` only returns a small object and `Stop-LeaseHeartbeat` is a
no-op; renewal occurs only at explicit `Beat-Lease` checkpoints. Live-process
identity currently prevents stale-heartbeat theft, so this is not the cause of
H3-04, but the security claim should describe the actual control.

## ADVERSARIAL_TEST_RESULTS

### Official baselines reproduced

- `powershell -File scripts/orchestration/tests/run-tests.ps1`:
  **8 passed, 0 failed**.
- `powershell -File scripts/orchestration/v2/spine.ps1 selftest`:
  **86 passed, 0 failed**.

### Additional independent attacks

| Attack | Observed | Required | Assessment |
|---|---|---|---|
| Schema-invalid non-array fields | `APPROVE` | schema rejection | fail |
| Hostile spec/diff closes fixed fences | 2 closers in each section | untrusted content cannot close boundary | fail |
| Same profile with external true/false check | same effective hash, different effective result | actual procedure changes hash/authority | fail |
| Malformed lease, then second acquire | first refused; second acquired | persistent quarantine / human recovery | fail |
| Wildcard protected grant | `.planning/PWN.md` compliant | reject broad protected grant | fail |
| Tamper contract then repeat freeze | returned tampered object | re-freeze validates existing content | fail |
| Synthetic JSON password/token/DATABASE_URL | raw retained; scan `clean=true`, 0 hits | zero persistence | fail |
| Forged `NO_REMOTE` + remove index gate | preflight `ok=true` | fetch/gate authority fail closed | fail |

### Areas that held under attack

- ledger 2/8-writer serialization and sealed-head tamper detection;
- terminal resurrection prevention;
- ordinary contract tamper detection through `Get-Contract`;
- extra properties, wrong hashes, missing/unrelated criteria, huge output,
  reviewer crash, multiple envelopes, and truncation in covered review forms;
- attestation producer/payload integrity and later-negative semantics;
- mandatory remote confirmation before `PUBLISHED`;
- stale candidate, branch movement, remote movement, ancestry, and tree checks;
- canonical lexical protected-path variants, empty scope, and broad declared
  scope without a protected grant;
- wrong lease ID, live owner with stale heartbeat, dead owner, and initial
  8-process acquisition;
- absent task version, stale index, wrong planning head, and failed fetch result;
- both legacy environment-variable bypass attempts;
- exact-criteria no-change evidence;
- envelope self-reported reviewer metadata did not replace launcher-side
  synthetic metadata.

### Final recursive scan

The existing V2 scanner reported no synthetic marker/PEM residue for its
versioned crash corpus, and all disposable review-3 fixtures were removed. The
additional JSON-shaped corpus proves the scanner's definition of “clean” is
incomplete; therefore a clean result from the current function is not evidence
of zero secret persistence.

## DEFERRED_FINDINGS_VALIDATION

The following remain honestly deferred and are **not** treated as fixed:

- **C-04 partial** — external human-identity approval chain. The hash-bound gate
  artifact exists, but M3-03 shows the frozen gate pointer is not enforced.
- **C-05** — verified process-tree containment/termination on Windows.
- **C-06** — OS-enforced executor isolation and reparse/junction containment for
  executor scope.
- **H-02 full** — disposable reviewer profile, real read-only tool enforcement,
  no memory/MCP/hooks/session persistence. Fixed text fences do not supply this.
- **H-08** — full crash/resume protocol.
- **H-09 full** — hard timeout for every check/native stream, lineage budgets,
  and circuit breaker.
- **H-10** — real machine-readable GSD parser and validated dependency graph.
- **Real Claude/Codex disposable smoke** — not run and still required.

The documents correctly say these items block canary and real-task execution.
No real-task entrypoint exists. V1 real verbs remain structurally disabled, and
the tested environment variables do not unlock them.

This review does not reject the isolated spine merely because of those deferred
items. It rejects the current claim set because H3-01 through H3-05 and M3-01
through M3-03 break controls represented as remediated.

## REQUIRED_BEFORE_NEXT_STAGE

1. Remove `CheckBlock`/`PostIntegrationCheck` from the authoritative pipeline,
   or make the exact executable, script/content hash, argv, cwd, environment,
   timeout, ordered results, and producer part of the frozen verification
   definition and independently recompute them at integration.
2. Validate review JSON with a parser/validator that preserves raw JSON types;
   reject object/null/string substitutions for arrays. Add the reproduced
   non-array approval as a regression.
3. Replace predictable prompt fences with an injection-resistant transport
   (separate file handles/tool inputs or encoded/length-prefixed content with
   nonce-bound sections). Add hostile closing markers in acceptance, spec, and
   diff to regression tests; a fake reviewer must not be preprogrammed to ignore
   the attack.
4. Make malformed lease quarantine persistent for the namespace/key until an
   explicit, authenticated recovery action. Test first, second, simultaneous,
   and 8-process acquire attempts after corruption.
5. Restrict protected grants to exact canonical configured prefixes (or an
   explicit allowlisted grant schema). Reject `*`, `**`, root, empty, parent, and
   overlapping broad grants.
6. Make every existing-contract path call the full recompute-on-read validation
   before returning; add tamper-then-refreeze cases for spec, acceptance,
   verification definition, bindings, and contract contents.
7. Use one shared secret-pattern library for streaming and recursive scanning,
   covering quoted JSON/YAML, password, token, bearer, JWT, DATABASE_URL,
   credentialed URLs, PEM, multiline values, and alternate streams where
   supported. Run the scan before integration/push and make publication
   impossible until it passes.
8. Make fetch observations non-forgeable authority produced in-process: require
   `performed=true`, exact remote/target/before SHA, successful exit, fresh
   observed remote SHA, and no accepted `NO_REMOTE` dispatch path. Do not trust a
   writable timestamp JSON file as proof.
9. Require index task identity, gate, dependencies, spec hash, acceptance hash,
   and verification profile to equal the frozen contract/derived authority.
   Index gate `none` must not override contract gate `g1`.
10. Add deterministic integration regressions for after-CAS rejected push,
    ancestry failure, and tree mismatch; prove every failure records a durable
    ledger terminal/recovery state without claiming publication.
11. Correct heartbeat claims to match implementation or implement verified
    periodic renewal. Keep live-owner identity as the load-bearing rule.
12. After remediation, rerun V1, V2, every attack in this report, and a recursive
    independent secret scan. Then request a new independent security review.

`SECURITY_SPINE_REVIEW = FAIL`

`NEXT_REMEDIATION_STAGE_ALLOWED = NO`
