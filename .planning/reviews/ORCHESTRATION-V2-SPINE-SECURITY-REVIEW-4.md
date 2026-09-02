# Fourth Independent Security Review — Orchestration V2 Security Spine

Date: 2026-09-02

Baseline reviewed: `55a77247ec53bd51526651be0efc7d98d785a6b7`
(`55a7724 fix(orchestration): terceira remediacao da security spine v2`), branch
`main`, initially clean and synchronized with `origin/main`.

Scope: the complete `scripts/orchestration/v2/**` and `.orchestration/v2/**`
trees, all requested review/remediation documents, the threat model,
attestation notes, runbook, and handoff. Tests used only disposable Git
repositories, fake agents, and synthetic secrets. No application code, real
task, P03, T12, T13, persistent database, production resource, or real
Claude/Codex invocation was touched.

## VERDICT:

**REQUEST_CHANGES**

The third remediation closes the literal `CheckBlock` verification exploit,
the ordinary raw-type substitutions previously exercised, fixed prompt fences,
the immediate malformed-lease reacquire, broad protected grants, incoherent
contract refreeze tampering, the covered textual secret corpus, and the narrow
persisted-fetch forgery. The official baselines reproduced as V1 **8/8** and V2
**108/108**.

Those totals are not sufficient. Independent attacks found six high-severity
failures in controls represented as authoritative:

- a contract can be coherently rewritten, re-hashed, and accepted under the
  same `taskVersionId`, including adding a protected-path grant and substituting
  the verification profile;
- review-data files can be replaced after their manifest is printed, and the
  real fake reviewer reads the replacement while the parser still returns
  `APPROVE`; the nonce is replayable and junction data directories are accepted;
- the pre-publish secret gate scans a mutable worktree rather than the immutable
  reviewed candidate; a synthetic secret in the candidate commit was pushed and
  ledgered `PUBLISHED` after a clean uncommitted worktree replacement hid it;
- attestation `createdAt` controls which result is authoritative but is absent
  from the integrity hash, allowing a later `REQUEST_CHANGES` to be reordered
  behind an earlier `APPROVE`;
- quarantine recovery accepts arbitrary reusable strings, is not serialized,
  and the quarantine itself is represented only by a deletable/renameable
  marker;
- runtime fault seams run after a real push and can report/ledger “not
  published” while `origin/main` already contains the merge.

These failures are independent of the honestly deferred C-05/C-06/H-08/H-09/
H-10 and real-provider smoke work. Some current claims also silently rely on
C-06 or H-08; those dependencies are called out as findings rather than used as
blanket reasons to reject the isolated spine.

Even a future PASS of this isolated spine would **not** mean
`READY_FOR_CANARY`.

## RETEST_OF_THIRD_REVIEW_EXPLOITS

| Third-review area | Fourth independent retest | Result |
|---|---|---|
| H3-01 verification procedure | No authoritative `CheckBlock`, `PostIntegrationCheck`, `Invoke-Expression`, or caller command remains. Executable, argv, cwd policy, environment policy, timeout, profile version, builtin, order, omission, duplication, and extra-step mutations all changed `effectiveInvocationHash`; integration recomputed it. | PASS (direct exploit) |
| H3-01 profile mutation after check | Incoherent config/profile mutation invalidated contract or attestation bindings. A coherent contract rewrite can nevertheless substitute profile under the same task version; see H4-01. | PASS direct / FAIL via new path |
| M3-01 ordinary type substitutions | Wrong types for hashes, verdict, criteria, findings, filesReviewed, evidence, reviewerMeta, locations, booleans, and integers were non-approval. | PASS |
| M3-01 raw JSON ambiguity | Singleton-array `schemaVersion` and duplicate keys other than `verdict` were accepted as `APPROVE`. | **FAIL** |
| M3-01 malformed/bounded input | Deep nesting, oversized arrays, BOM/trailing data, multiple envelopes, invalid NaN/Infinity-like JSON, and unescaped control bytes were non-approval. Escaped Unicode/control code points remained data and did not break bindings. | PASS |
| H3-03 prompt injection | Spec, acceptance, and diff bytes no longer enter the instruction prompt; old markers, fake envelopes, markdown/XML, multilingual directives, path-like strings, and reviewer directives remained out-of-band. | PASS |
| H3-03 exact reviewed bytes | Post-manifest replacement was read and approved; nonce replay and junction redirection also succeeded. | **FAIL** |
| H3-04 malformed lease | First through eighth normal acquire, including eight concurrent acquires, refused while a marker existed; malformed/partial marker failed closed. | PASS |
| H3-04 sticky/authenticated recovery | Deleting or renaming the marker enabled acquire. One arbitrary token recovered multiple keys/namespaces; five of eight concurrent repairs reported success. | **FAIL** |
| H3-05 protected-grant syntax | `*`, `**`, `.`, roots, drive/UNC roots, parent traversal, case variants, separator/trailing-dot-space variants, prefix overlaps, empty/whitespace, and sibling prefixes did not broaden a frozen grant. `unrestrictedScope` and risk C alone did not reach protected paths. | PASS |
| H3-05 grant authority | A coherently rewritten contract added `.planning/reviews/` under the same task version and authorized the protected change. | **FAIL** |
| M3-02 incoherent stored-contract tamper | Mutating each covered field while retaining stale hashes failed in `Freeze-Contract`, `Get-Contract`, preflight, verification, review, or integration consumers. | PASS |
| M3-02 coherent rewrite / closed-world contract | Recomputing the public self-hash made rewritten scope, grants, risk, gate, deps, profile, schema, bindings, and stored taskVersion acceptable. Unknown root fields and singleton-array coercions also survived. | **FAIL** |
| H3-02 covered textual secrets | JSON/YAML/env/header/Bearer/Cookie/JWT/sk-like/ghp-like/AWS-like/GCP-like/credentialed URL/PEM and long-line covered forms were redacted or blocked in the official corpus. | PASS for covered encodings |
| H3-02 exact candidate and encodings | A committed synthetic secret hidden by a dirty clean worktree was pushed; UTF-16LE without BOM also returned scanner `clean=true` while an independent byte decode found the marker. | **FAIL** |
| M3-03 persisted fetch artifact | Forged `last-fetch.json` alone and literal `NO_REMOTE` were not dispatch authority. | PASS |
| M3-03 in-memory fetch authority | Forging both script-scoped token and observation, or mutating the returned observation alias, passed without a Git fetch. A future timestamp was accepted. | **FAIL** |
| Contract ↔ index current overlap | Mismatched `planningHead`, `taskId`, gate, and dependencies were rejected. | PASS |
| Contract ↔ index closed-world authority | Invalid index schema, singleton-array task version, and contradictory spec/profile/scope/risk/grant fields were ignored. Those extra fields are not current index authority, but there is no schema boundary preventing future authority from being silently ignored. | **FAIL** |
| Later negative attestation | Untampered later `FAIL`/`REQUEST_CHANGES` blocked. Rewriting only its unhashed `createdAt` restored the earlier positive result as authoritative. | **FAIL** |

## NEW_CRITICAL

None.

## NEW_HIGH

### H4-01 — A self-hashed contract can retrofit protected authority under the same task version

**Location:** `scripts/orchestration/v2/contract.ps1:27-31`, `:76-93`,
`:123-126`, `:143-164`, `:191-231`, `:285-325`;
`scripts/orchestration/v2/ledger.ps1:62-75`;
`scripts/orchestration/v2/tests/pipeline-harness.ps1:139-190`, `:224-227`

**Category:** Tampering / elevation of privilege

`taskVersionId` binds only task ID, planning head, spec hash, and acceptance
hash. Scope, protected grants, risk, gate, dependencies, verification profile,
schema version, and extra bindings are only covered by a public, unkeyed
`contractHash` stored beside the object. Recomputing that hash is therefore a
valid-looking rewrite, not detected tampering.

Independent reproduction changed a risk-B contract with scope `work/` and no
grant into risk C with grant `.planning/reviews/`, recomputed its hash, and kept
the same `taskVersionId`. `Get-Contract` accepted it and
`Test-ContractCompliance` authorized `.planning/reviews/PWN.md`. Coherent
rewrites of the verification profile, gate, dependencies, scope, risk, schema,
bindings, and stored task-version representation were also accepted.

**Exploitability:** any same-user process able to write orchestration authority
artifacts. C-06 would reduce that access, but current claims explicitly rely on
the contract's own integrity checks and consumers; this is therefore not merely
a deferred-isolation issue.

**Impact:** an untrusted run can gain protected-path authority, weaken checks,
or change gate/dependency policy without a new task version or reconciliation.

**Required remediation:** bind every authority-bearing field into immutable
task/version authority independently anchored outside the mutable contract;
apply a closed schema before hashing; reject coherent replacement rather than
accepting a self-generated checksum.

### H4-02 — Review manifest, nonce, and data paths are advisory rather than enforced authority

**Location:** `scripts/orchestration/v2/review-envelope.ps1:223-260`,
`:263-289`; `scripts/orchestration/v2/tests/pipeline-harness.ps1:180-201`;
`scripts/orchestration/v2/tests/fake-agent-v2.ps1:136-156`;
`scripts/orchestration/v2/review-envelope.ps1:193-203`

**Category:** Spoofing / tampering / prompt injection transport

`Build-ReviewPrompt` writes three normal files, hashes them once, and prints
their paths, hashes, and a nonce. It does not make them read-only, retain stable
handles, return enforceable manifest authority, reject reparse points, or rehash
immediately before/after reviewer execution. Neither the review schema nor the
parser's expected bindings include the nonce or data-file hashes.

Independent reproduction replaced `spec.txt` after manifest creation. Its hash
changed, the suite's real fake reviewer read the replacement, and the resulting
envelope parsed as `APPROVE`. An old envelope remained `APPROVE` under a new
prompt with a different nonce. A junction supplied as `DataDir` wrote the data
files into the junction target. The diff file is additionally redacted before
writing while the envelope's `diffHash` represents the original candidate diff,
so the envelope does not prove which bytes the reviewer saw.

**Exploitability:** a same-user executor/reviewer or concurrent local process;
the payload itself can request local paths, but the structural issue is the
launcher accepting different bytes than those it hashed.

**Impact:** a valid approval can attest to one manifest while the reviewer saw
attacker-replaced data, or an old approval can be replayed across review calls.

**Required remediation:** launcher-enforce the manifest using no-follow,
stable-handle reads or immutable copied blobs; reject reparse targets; revalidate
before and after review; bind nonce plus exact file/blob hashes into the output
schema and review attestation.

### H4-03 — Pre-publication scanning does not scan the immutable reviewed candidate

**Location:** `scripts/orchestration/v2/integrate.ps1:131-164`;
`scripts/orchestration/v2/lib-v2.ps1:574-611`;
`scripts/orchestration/v2/verification.ps1:76-87`

**Category:** Information disclosure / stale authority / TOCTOU

Attestations and merge target are bound to `HeadSha`, but post-integration
verification and secret scanning read the mutable `WorktreeDir`. There is no
candidate-worktree cleanliness check. The merge then uses the committed
`HeadSha`/branch, not the bytes just scanned.

Independent reproduction committed a unique `ORCIVO_SYNTHETIC_SECRET_...`
marker in `work/artifact.md`, produced fresh
check/review attestations, and then replaced only the worktree file with clean
uncommitted content. Observed result:

`DIRTY_SECRET_COMMITTED=True WORKTREE_DIRTY=True STATUS=PUBLISHED PUSHED=True ORIGIN_MOVED=True PUBLISHED_SECRET=True`

The scan therefore happened before network publication but inspected the wrong
object. Separately, UTF-16LE without BOM produced
`UTF16_SCAN_CLEAN=True INDEPENDENT_DECODE_FINDS=True`. Read failures are also
silently skipped and per-pattern regex errors swallowed.

**Exploitability:** an executor/reviewer able to dirty its own worktree after
review, or a generated file using an unsupported encoding. No real credential
was used.

**Impact:** secrets in the exact reviewed Git tree can reach `origin/main` while
the gate reports clean and the ledger records `PUBLISHED`.

**Required remediation:** scan bytes materialized from the immutable candidate
tree (`HeadSha`) in a clean, no-reparse staging area; reject dirty/unreadable/
unsupported inputs; use encoding-aware and binary-aware detection; bind the
scanned tree/hash into the publication evidence.

### H4-04 — Unhashed `createdAt` lets an attacker choose the authoritative attestation result

**Location:** `scripts/orchestration/v2/attest.ps1:32-53`, `:92-105`,
`:122-149`, `:153-188`

**Category:** Tampering / repudiation / elevation of privilege

`Get-LatestAuthoritative` sorts by `createdAt`, but `_AttestationCore` omits
`createdAt` from `attestationHash`. Changing only that field does not make
`Test-AttestationFresh` stale.

Independent reproduction created `APPROVE`, then a later
`REQUEST_CHANGES`, rewrote only the negative result's timestamp to 2000, and
observed:

`ATTEST_TAMPER_FRESH=True LATEST=APPROVE GATE_OK=True`

**Exploitability:** any writer of attestation artifacts; no hash forgery is
needed.

**Impact:** a negative review/check can be hidden behind an older positive,
allowing integration with stale or explicitly rejected authority.

**Required remediation:** derive ordering from an append-only, integrity-bound
sequence/lineage rather than mutable wall-clock text; bind and validate every
ordering field and reject ambiguous/duplicate lineage states.

### H4-05 — Lease quarantine recovery is unauthenticated, replayable, and non-atomic

**Location:** `scripts/orchestration/v2/lease.ps1:53-76`, `:81-93`,
`:136-175`, `:235-277`; `scripts/orchestration/v2/lib-v2.ps1:398-405`

**Category:** Spoofing / tampering / concurrency integrity

Quarantine authority is the mere existence of a marker. Deleting or renaming it
makes normal acquire eligible. `Repair-QuarantinedLease` treats any string of at
least eight characters as an authenticated recovery token; it does not bind the
token to namespace, key, quarantine record/hash, issuer, or one-time use. Its
owner scan, audit write, residual deletion, and marker removal are not one CAS.
The delete-CAS helper releases its exclusive handle before `Remove-Item`.

The same arbitrary token recovered three different keys across two namespaces.
Eight concurrent repairs with one token produced five `ok=true` audited
recoveries. Manual marker deletion/rename enabled acquisition. A structurally
incomplete lease containing only `leaseId` and `holder` was treated as valid
rather than quarantined. Repair correctly refused a proven live residual owner,
and a corrupt marker remained fail-closed while it existed.

**Exploitability:** same-user local actor, concurrent recovery processes, crash,
or filesystem replacement.

**Impact:** ownership whose truth is uncertain can be reset or raced, allowing
overlapping orchestration/integration authority.

**Required remediation:** require an externally issued, single-use,
namespace/key/quarantine-hash-bound recovery capability; serialize recovery;
validate a closed lease/marker schema; make quarantine transition/recovery
atomic and durable outside a lone deletable marker; keep normal acquire unable
to recover uncertainty.

### H4-06 — Runtime test seams falsify remote publication truth after a real push

**Location:** `scripts/orchestration/v2/integrate.ps1:29-38`, `:178-205`,
`:217-230`; `scripts/orchestration/v2/tests/_probe.ps1:828-870`

**Category:** Tampering / repudiation / test-runtime boundary violation

The runtime module exposes mutable script-scoped `V2IntegrationTestFaults`.
Every seam is evaluated only after `git push` has already run. A dot-sourcing
caller can set it directly; the official probe does exactly that, contradicting
the runtime comment that it is unreachable through public runtime.

Independent runs of `afterCasPushReject`, `ancestryFail`, and `treeMismatch`
with a successful origin push returned/ledgered `PUSH_FAILED` or
`REMOTE_DIVERGED`, `pushed=false`, and `published=false`, while `origin/main`
had moved and contained the merge. A genuine pre-receive rejection behaved
correctly: origin stayed unchanged, failure was durable, and the reviewed branch
was preserved.

**Exploitability:** any same-process runtime caller; it is not environment- or
task-config-controlled, but it is still part of the public dot-sourced runtime.

**Impact:** durable local state can deny a network publication that actually
happened, causing unsafe retries, duplicate work, or publication without the
required ledger truth.

**Required remediation:** remove fault injection from runtime; substitute a
test-only transport before network mutation. After any ambiguous push outcome,
reconcile authoritative remote SHA/tree and record that truth before returning.

## NEW_MEDIUM

### M4-01 — Duplicate JSON keys and singleton-array constants can still become `APPROVE`

**Location:** `.orchestration/v2/schemas/review-envelope.schema.json:21`;
`scripts/orchestration/v2/review-envelope.ps1:58-71`, `:141-169`

**Category:** Tampering / parser differential

The schema declares a `const` for `schemaVersion` without `type: string`, and
the validator stringifies values. A singleton JSON array containing the expected
schema string returned `APPROVE`. Both JSON parsers use last-key-wins semantics;
only duplicate `verdict` is counted explicitly. Duplicate `taskVersion`,
`criteria`, nested `evidence`, and nested `reviewerMeta.provider` keys with an
invalid first value and valid last value all returned `APPROVE`.

Reject duplicate keys recursively before semantic parsing, add explicit types
to every constant, and ensure one raw parser/validator owns both schema and
semantic interpretation.

### M4-02 — In-process fetch “authority” is caller-mutable and aliasable

**Location:** `scripts/orchestration/v2/preflight.ps1:23-79`, `:104-105`

**Category:** Spoofing / stale authority

Both `LastPreflightFetch` and `PreflightAuthorityToken` are script-scoped values
visible to the dot-sourcing caller. Forging both with current repo/SHA/ticks made
`Test-FetchAuthority` return zero failures without executing `git fetch`.
Mutating the returned observation changed the same object retained as authority,
including converting a `NO_REMOTE` object into accepted `OK`. A timestamp 30
days in the future passed because only excessive positive age is rejected.

Integration's own fetch/CAS still detected ordinary later remote movement, so
this did not independently produce an incorrect push and is classified medium.
Preflight should perform and consume a fresh fetch inside one non-aliasing
operation, validate bounded past time, and not expose forgeable authority state
to its caller.

### M4-03 — Contract and index lack closed schemas and preserve unsafe PowerShell coercions

**Location:** `scripts/orchestration/v2/contract.ps1:27-31`, `:76-93`,
`:191-231`; `scripts/orchestration/v2/preflight.ps1:29-32`, `:107-140`

**Category:** Tampering / validation bypass

Contracts accepted an unknown root field, an invalid schema version after
self-rehash, `taskId` as a singleton array, and `declaredScope` as a string.
The index accepted an invalid schema version and singleton-array task version.
It also ignored contradictory spec/acceptance/profile/definition/scope/risk/
grant fields while checking only planning head, task ID, gate, and dependencies.

The extra index fields are not declared authority today, so their presence alone
did not enlarge scope. The absence of `additionalProperties:false` plus exact
raw types nevertheless creates an unsafe future authority boundary and combines
with H4-01. Validate both artifacts against versioned, closed schemas before any
cast, comparison, hash, or consumer read.

### M4-04 — Integration can return a terminal failure without durably recording it

**Location:** `scripts/orchestration/v2/integrate.ps1:217-230`

**Category:** Repudiation / unsafe failure state

`_fail` catches and suppresses any `Add-LedgerEvent` failure, then returns a
terminal-looking status. Permission failure, disk failure, lease/quarantine
failure, or corrupt ledger can therefore leave durable state at `INTEGRATING`
while the caller receives `PUSH_FAILED`, `REMOTE_DIVERGED`, or
`INTEGRATION_FAILED`. This is especially unsafe after an ambiguous push.

Failure recording must itself be fail-closed and reconciled against remote truth;
the caller must never treat an unpersisted terminal status as durable.

## NEW_LOW

None independent. Scanner read/regex error swallowing, future timestamp
handling, duplicate grants, and quarantine crash gaps are included in the
higher-severity findings above rather than split into cosmetic findings.

## ADVERSARIAL_TEST_RESULTS

### Official baselines reproduced

- `powershell -File scripts/orchestration/tests/run-tests.ps1`:
  **8 passed, 0 failed**.
- `powershell -File scripts/orchestration/v2/spine.ps1 selftest`:
  **108 passed, 0 failed**.

### Additional independent attacks

| Attack | Observed | Required | Assessment |
|---|---|---|---|
| Verification executable/argv/cwd/env/timeout/order/step substitutions | Every mutation changed the invocation hash; forged hash rejected | exact frozen procedure | pass |
| Coherent contract rehash adding protected grant/profile | same task version accepted; protected file compliant | new authority requires new reconciliation/version | **fail** |
| Duplicate review keys / singleton-array schema version | `APPROVE` | schema-invalid never approves | **fail** |
| Full wrong-type matrix | non-approval except singleton-array constant/coercion cases | raw type fidelity | partial |
| BOM, trailing data, multiple envelope, deep/large/invalid JSON | non-approval | fail closed | pass |
| Old markers/fake JSON/directives/XML/markdown/multilingual data | absent from instruction prompt | data never instruction | pass |
| Replace review data after manifest | replacement read; `APPROVE` | exact hash-bound bytes only | **fail** |
| Review nonce reuse | old envelope accepted under new nonce | one-review freshness | **fail** |
| Junction `DataDir` | files written through junction | confined no-reparse data root | **fail** |
| Quarantine marker present, malformed, eight acquires | all normal acquires refused | sticky normal acquire | pass |
| Forged/reused/cross-key recovery token | recovery succeeded | authenticated single-use bound recovery | **fail** |
| Eight concurrent repairs | five reported success | exactly one serialized recovery | **fail** |
| Protected-grant hostile path corpus | broad/traversal/sibling forms rejected | exact allowlist subtree | pass |
| Candidate synthetic secret hidden by dirty worktree | real push; `PUBLISHED`; remote contains secret | `SECRET_LEAK_BLOCKED`, zero push | **fail** |
| UTF-16LE no-BOM synthetic secret | scanner clean; independent decoder found it | encoding-safe scan or reject | **fail** |
| Forged persisted fetch only | rejected | audit file not authority | pass |
| Forge both in-memory observation and token | accepted without fetch | non-forgeable fetch evidence | **fail** |
| Remote moved after review/fetch | integration fetch/CAS or non-force push rejected | rebuild/re-review; never publish stale tree | pass |
| Later negative attestation timestamp rewrite | negative remained hash-fresh; earlier positive selected | immutable latest-result ordering | **fail** |

### Integration failure-path matrix

| Path | Result |
|---|---|
| Genuine after-CAS push rejection | PASS: `PUSH_FAILED`, origin unchanged, candidate preserved, no `PUBLISHED` |
| Ancestry verification failure | **FAIL as a regression:** current seam runs after successful push and falsifies remote truth |
| Remote tree mismatch | **FAIL as a regression:** current seam runs after successful push and falsifies remote truth |
| Remote advances after review | PASS: integration stops for rebuild/re-review |
| Remote advances after preflight fetch | PASS: integration performs its own fetch/CAS; a later race is rejected by non-force push |
| Candidate branch movement | PASS: exact branch head is compared with reviewed `HeadSha` |
| Ordinary stale attestation after candidate/config movement | PASS; timestamp-order tamper independently FAILS under H4-04 |
| Secret scan failure from covered runtime artifact | PASS: `SECRET_LEAK_BLOCKED`, zero push; exact committed-candidate and encoding attacks FAIL under H4-03 |
| Integration lease contention | PASS/limited: second integrator returns `BLOCKED`, ledger remains `APPROVED`, lease is durable contention evidence |
| Merge conflict while building candidate | Structural path aborts to `FAILED` before review; no independent deterministic concurrent-conflict regression exists |
| Failure ledger durability | **PARTIAL:** normal reproduced failures were durable, but `_fail` explicitly suppresses ledger-write failure |
| Retry after ordinary failed integration | Terminal ledger state prevents stale `PUBLISHED`; ambiguous real-push/seam truth remains unsafe |

The current ancestry/tree tests do not prove those network failure paths: they
prove only that a post-push boolean can force a local failure result. A valid
regression must create the remote condition before asserting zero publication,
or reconcile and accurately record the already-published remote state.

### Independent secret residue scan

All disposable fourth-review fixtures and the temporary probe were removed.
An independent search for the two unique synthetic values found no residue in
the authority repository. This cleanup result does not rehabilitate the runtime
scanner: the disposable remote demonstrably contained the committed secret
before fixture destruction.

## DEFERRED_FINDINGS_VALIDATION

The following remain honestly deferred and remain blockers for canary and real
tasks:

- **C-04 full** — externally authenticated human approval identity and durable
  authorization chain.
- **C-05** — verified Windows process-tree containment and termination.
- **C-06** — OS-enforced executor/reviewer isolation, filesystem boundary, and
  reparse/junction containment.
- **H-02 full** — genuinely fresh read-only reviewer profile without inherited
  implementer reasoning, memory, connected services, plugins, hooks, or rewrite
  layers.
- **H-08** — complete crash/resume protocol with immutable checkpoints and
  remote reconciliation.
- **H-09 full** — hard timeout, total budget, lineage retry/failover limit, and
  circuit breaker. Verification timeout is hash-bound but is not a complete
  enforced budget.
- **H-10** — real machine-readable GSD graph/parser and validated reconciliation.
- **Real Claude/Codex disposable smoke** — not run and still required.

This verdict is not based solely on those deferred items. However, current
claims silently depend on two of them: contract/review-data authority assumes
C-06 prevents same-user replacement, and lease/failure durability assumes H-08
closes multi-operation crash gaps. H4-01, H4-02, H4-05, and M4-04 therefore
record the present dependency rather than pretending those guarantees already
exist.

No real-task entrypoint was exercised. No C-05/C-06 implementation, adaptive
routing, model routing, skills work, P03, T12/T13, persistent DB, deployment, or
stage advancement occurred.

## REQUIRED_BEFORE_NEXT_STAGE

1. Make task/version identity and immutable external authority bind all contract
   fields that can affect execution, checks, scope, grants, risk, gates,
   dependencies, or consumers. Reject coherent self-rewrites and add the exact
   protected-grant/profile attacks as regressions.
2. Add closed, versioned, raw-type-preserving schemas for contract and index;
   reject unknown fields, duplicate keys, invalid schema versions, and
   singleton-array coercions before hashing or comparison.
3. Reject duplicate keys recursively in review envelopes and add explicit
   string typing for `schemaVersion`; rerun the complete type matrix.
4. Turn review-data manifest and nonce into launcher-enforced authority: stable
   no-follow reads, reparse rejection, before/after hash checks, and bindings in
   both envelope and attestation. Add swap, replay, junction, and huge hostile
   payload regressions.
5. Scan the exact immutable Git candidate tree, not mutable worktree bytes.
   Reject dirty/unreadable/unknown-encoding inputs and cover UTF-8/UTF-16,
   multiline, binary/generated source, and all requested synthetic formats.
6. Bind attestation result ordering to an immutable sequence/lineage. Add
   `createdAt` reorder, future time, duplicate timestamp, and negative-result
   regression cases.
7. Replace arbitrary recovery strings with authenticated, single-use,
   namespace/key/quarantine-bound recovery authority; serialize recovery and
   atomically preserve quarantine across corruption, crash, deletion, rename,
   and concurrent repair.
8. Remove integration fault switches from runtime. Build test-only network
   substitutes that fail before mutation, and reconcile remote truth after every
   ambiguous push result.
9. Make preflight fetch execution and validation one non-aliasing operation;
   reject future/stale/replayed/cross-repo/cross-run observations without
   caller-visible mutable authority.
10. Guarantee a durable, truthful state for every integration exit. Do not
    suppress failed ledger persistence; preserve reviewed candidate and bind any
    retry to freshly reconciled remote/candidate authority.
11. Add genuine deterministic regressions for merge conflict, after-CAS push
    reject, remote ancestry failure, remote tree mismatch, lease contention, and
    crash points. Prove remote SHA/tree and ledger agree, not merely that the
    return value is non-`PUBLISHED`.
12. After remediation, rerun V1, V2, every attack in this report, and an
    independent encoding-aware secret scan; then request another independent
    security review. Do not advance to real tasks or canary on suite counts
    alone.

SECURITY_SPINE_REVIEW = FAIL

NEXT_REMEDIATION_STAGE_ALLOWED = NO
