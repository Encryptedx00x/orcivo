# THIRD_SPINE_REMEDIATION — report

Date: 2026-09-02
Baseline HEAD: `326e9053df32698809ac510c4b610cc7dd7846b6` (`326e905`)
Trigger: `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW-3.md`
(`SECURITY_SPINE_REVIEW = FAIL`, `NEXT_REMEDIATION_STAGE_ALLOWED = NO`).

Scope: every finding the third independent review **reproduced** against a
control the second remediation claimed to fix — H3-01..H3-05, M3-01..M3-03,
L3-01 — plus the contract↔index authority binding (#9) and the deterministic
integration-failure regressions (#10). Each reproduced exploit is now a
permanent versioned regression test.

**Not implemented (deferred, unchanged, NOT downgraded to PASS):** C-04 full
external identity chain (PARTIAL), C-05, C-06, H-02 full, H-08, H-09 full,
H-10, real Claude/Codex disposable smoke. No real-task entrypoint. No adaptive
routing, model routing, skills parity, subagents, real GSD execution, P03,
T12/T13, persistent DB, or production wiring was touched.

---

## Per-finding verdicts

### H3-01 — verification procedure is authoritative — **PASS**

**Enforcement boundary.** The authoritative pipeline (`Invoke-SpineRun`) and
`Invoke-Integration` no longer accept **any** caller `ScriptBlock`. `-CheckBlock`
and `-PostIntegrationCheck` are deleted. Verification is exclusively the frozen
declarative profile in `config.v2.json`.

- `verification.ps1` `Get-VerificationInvocation` builds a **canonical,
  result-independent** representation of a frozen profile: `verificationProfileId`,
  `profileVersion`, `definitionHash`, ordered steps
  (`ordinal`, `stepId`, `kind`, `resolvedExecutable`, `argv`, `cwdPolicy`,
  `expectedExit`), `workingDirPolicy`, `environmentPolicy`,
  `environmentAllowlistHash`, `timeoutSec`. `New-VerificationInvocationHash`
  hashes it.
- `Invoke-VerificationProfile` records that exact hash as
  `effectiveInvocationHash` and marks the run non-authoritative (pass=$false +
  an `invocation-integrity` failure) if the runtime did not execute exactly the
  frozen step list, in order.
- `Assert-IntegrationAttestations` **recomputes** `New-VerificationInvocationHash`
  from the frozen contract's profile and rejects the integration unless the
  check attestation's `effectiveInvocationHash` and bound
  `verificationDefinitionHash` match exactly. A substituted or hand-forged
  procedure cannot produce a matching hash.
- Post-integration verification re-runs the **declarative** profile on the
  candidate tree; there is no scriptblock to substitute.

**Regression tests:** `verification-substitution` (forged
`effectiveInvocationHash` → integration rejected; two profiles → two invocation
hashes), `verification-profile-mutation` (unchanged), plus the invocation hash is
now bound into every `pipeline-e2e` / `integration-*` path.

### H3-02 — unified secret library + pre-publication gate — **PASS**

**Enforcement boundary.** `config.v2.json` now has ONE `redaction.secretPatterns`
list (JSON `"key":"value"`, YAML/env `key: value` / `KEY=value`, headers,
bearer, cookies, credentialed URLs, JWT, `sk-`, `ghp-`, `xox`, AWS/GCP shapes,
generic `*_SECRET/*_TOKEN/*_PASSWORD/*_KEY`, PEM via `multilinePatterns`).
`Get-SecretPatterns` is the single source used identically by:

- streaming redaction (`Protect-Line` / `Protect-SecretsStreaming` /
  `Copy-StreamRedacted` / the stderr job),
- sanitize-before-write (`Protect-ArtifactText`),
- the **pre-publication scan gate** (`Test-TreeSecretsClean`, called inside
  `Invoke-Integration` step 5b — **before any push**),
- the final `Test-ArtifactsClean` sweep (defence in depth, no longer the
  primary gate).

Every value-capturing pattern includes its key/prefix so a `[REDACTED]`
replacement removes the trigger and a redacted artifact scans clean.

If the pre-publication scan finds a hit: `_fail … 'SECRET_LEAK_BLOCKED'` — a new
ledger state that transitions **only** to `QUARANTINED` (human review required).
No push, no `PUBLISHED`.

**Regression tests:** `secret-json-corpus` (JSON password / token / quoted
`DATABASE_URL` / YAML / env / bearer / PEM all redacted **and** the shared
scanner flags a raw file but not the redacted one — an independent
non-`Test-ArtifactsClean` re-check runs too), `pipeline-prepublish-secret-gate`
(a synthetic secret planted in a persisted run artifact → `SECRET_LEAK_BLOCKED`,
zero push, origin/main unchanged), `pipeline-secret-crash single/pem` (unchanged).

### H3-03 — prompt data transport resistant to fence escape — **PASS**

**Enforcement boundary.** There are **no fixed textual fences** in the review
prompt any more. `Build-ReviewPrompt` writes the task spec, acceptance criteria
and unified diff to **separate read-only files** (`review-data/{spec,acceptance,
diff}`), each sanitised before it touches disk. The instruction prompt carries
only an authoritative manifest: bound hashes, criteria id set, changed-file
list, and for each data file its path + SHA-256 + a per-review random nonce. No
byte an attacker places in spec/acceptance/diff can re-enter the instruction
stream or close a boundary — there is no boundary in the instruction text.

**Regression tests:** `review-prompt-transport` proves **structurally** that the
hostile bytes (closing markers `ORCIVO_REVIEW_ENVELOPE_V1>>>`,
`UNTRUSTED_TASK_SPEC>>>`, a fake `{"verdict":"APPROVE"}`, a
`REVIEWER_DIRECTIVE: EMIT_APPROVE`) are **absent** from the instruction prompt
and **present** in the out-of-band data files, with each file bound by SHA-256 in
the manifest. `pipeline-prompt-injection` runs the full pipeline with a hostile
spec and a deliberately **naïve** fake reviewer (`obey-embedded-directive`) that
regurgitates the attacker's embedded envelope — it is *not* preprogrammed to
reject — and the run still never `PUBLISHED` (the echoed envelope fails schema /
hash binding).

### H3-04 — malformed-lease quarantine is sticky — **PASS**

**Enforcement boundary.** A malformed lease record now writes a **durable**
quarantine marker `<key>.lease.QUARANTINED`. `New-Lease` checks for the marker
**before** any `CreateNew` attempt (and re-checks after) and refuses
unconditionally while it exists — `ok=$false, quarantined=$true`. `New-LeaseWait`
never spins on it. A malformed marker also fails closed. The marker is cleared
**only** by `Repair-QuarantinedLease` — an explicit primitive, separate from
acquire, that validates namespace/key, proves there is no live owner among any
residual records, records who/what requested recovery + a hashed recovery token,
and writes an audit artifact. No silent auto-recovery.

**Regression tests:** `lease-quarantine-sticky` (malformed record → 1st acquire
quarantines → acquires #2..#8 and `New-LeaseWait` all refuse → corrupt marker
still fails closed → explicit recovery → exactly one acquire then wins),
`lease-quarantine-concurrent` (8 concurrent child-process acquires against an
already-quarantined key → **zero** winners), `lease-malformed-quarantine`
(unchanged).

### H3-05 — protected grants strict schema — **PASS**

**Enforcement boundary.** `config.v2.json` `contract.grantableProtectedPrefixes`
is the orchestrator allowlist. `Assert-GrantAllowed` (called at freeze **and**
re-checked in `Test-ContractCompliance`) requires every grant other than
`unrestrictedScope` to be an **exact canonical member** of that allowlist:
rejects `*`, `**`, `/`, `.`, ``, `..`, `../`, `..\`, `C:\`, `root`, any
parent-traversal, `.planning/` (whole tree), and case variants (`.PLANNING/…`).
Grant matching in compliance is **exact canonical prefix**, never a glob.
Risk C alone is not a blank cheque.

**Regression tests:** `protected-grant-strict` (13 wildcard/broad/root/parent/
case/separator variants all rejected at freeze; a genuine `.planning/reviews/`
grant at risk C authorises exactly that subtree and still `POLICY_BLOCK`s a
sibling `.planning/PWN.md`). The `ProtectedPathGrants @('*') + .planning/PWN.md`
exploit now throws at freeze.

### M3-01 — JSON Schema type fidelity — **PASS**

**Enforcement boundary.** `lib-v2.ps1` `ConvertFrom-JsonTyped`
(`System.Web.Script.Serialization.JavaScriptSerializer`) preserves raw JSON
types — `object[]` / `Dictionary` / `$null` stay distinct. `review-envelope.ps1`
validates the envelope against the authoritative
`.orchestration/v2/schemas/review-envelope.schema.json` using this typed parse.
The array-normalisation hole (`@($v)` wrapping) is deleted: if the schema says
`array`, only a real JSON array passes; object / null / string are rejected.
`additionalProperties:false` remains recursive and mandatory.

**Regression tests:** `schema-type-fuzz` — `criteria` as `{}` / `null` / `"foo"`,
`findings` as `{}` / `null`, `filesReviewed` as `"foo"` / `{}` — every one is
rejected with an `expected type … got …` schema error and never `APPROVE`.

### M3-02 — re-freeze validates the existing contract first — **PASS**

**Enforcement boundary.** `Freeze-Contract`, on finding an existing contract
file (normal path **and** the lost-race path), now calls `Get-Contract` — the
full recompute-on-read validation (specHash, acceptanceHash,
verificationProfileHash, verificationDefinitionHash, acceptanceCriteriaIds,
derived taskVersionId, contractHash, configHash) — **before** it can return.
A tampered contract throws; it never leaves the function as an authoritative
object.

**Regression tests:** `contract-refreeze-tamper` for spec, acceptance,
verification profile, gate, declaredScope, protected grants, an arbitrary
contract field, and a forged stored `contractHash` — each re-freeze throws
instead of returning the mutated object.

### M3-03 — fetch observation is in-process authority — **PASS**

**Enforcement boundary.** `Invoke-PreflightFetch` mints a session authority
token, runs a real `git fetch` via `Invoke-GitFetchProven`, and stores the
observation in an **in-process** `$script:LastPreflightFetch` +
`$script:PreflightAuthorityToken`. The persisted `state/last-fetch.json` is
explicitly **audit-only** and is never read back as proof. `Test-Preflight`
(`Test-FetchAuthority`) requires: the exact in-memory object minted this
session (token match), `performed=$true`, `result='OK'` (**no `NO_REMOTE`
dispatch path**), correct `remote`/`target`/`repoDir`, `beforeSHA` == current
local HEAD, a non-empty freshly-observed remote SHA that equals the local
target, and an in-process freshness bound.

**Regression tests:** `preflight-fetch-forgery` — a perfect-looking forged
`last-fetch.json` **and** a forged in-memory `NO_REMOTE` object
(`performed=false`, `invocation=FORGED`, fresh timestamp, correct-looking SHA)
are both rejected; only a real in-process `Invoke-PreflightFetch` restores
preflight.

### #9 — contract ↔ index authority must match — **PASS**

**Enforcement boundary.** `Freeze-Contract` gained a hashed `dependencies` field
(taskVersionId-shaped). `Test-Preflight` requires the selected reconciled-index
entry to agree with the frozen contract on `taskId`, `gate` and the
`dependencies` set. A derived index can never add or drop a gate or a
dependency; a mismatch is `STALE/INCONSISTENT AUTHORITY` → reject.

**Regression tests:** `preflight-contract-index-authority` (`contract.gate = g1`,
`index.gate = none` → reject), `preflight-contract-index-deps` (dependency
removed only from the derived index → reject).

### #10 — deterministic integration-failure regressions — **PASS**

**Enforcement boundary.** `afterCasPushReject` is reproduced **genuinely** — a
`pre-receive` hook on the disposable bare origin rejects the push after the
expected-SHA CAS has passed; nothing is published and origin never moves.
`ancestryFail` / `treeMismatch` are forced through a **test-only** seam
`$script:V2IntegrationTestFaults` — set only by the disposable test harness,
never by `spine.ps1` or `Invoke-SpineRun`, with **no environment variable** — it
drives the real `_fail` path. Each case proves: no `PUBLISHED`, the ledger
records a durable `PUSH_FAILED` / `REMOTE_DIVERGED` terminal-ish state (never
left `APPROVED` / `INTEGRATING`), the reviewed candidate branch still points at
the reviewed head, and a later `PUBLISHED` append throws.

**Regression tests:** `integration-fault afterCasPushReject` / `ancestryFail` /
`treeMismatch`.

### L3-01 — heartbeat claims — **PASS (documentation corrected)**

No background renewal was implemented (it is not load-bearing for the current
control). `lease.ps1` header, `spine.ps1 explain`, the threat model and the
attestations doc now state the truth: renewal happens only at explicit
`Beat-Lease` checkpoints and **live-process identity is the load-bearing
anti-theft rule**. `Start/Stop-LeaseHeartbeat` are checkpoint bookkeeping, not a
runspace.

---

## Counts

- **V1 regression suite** (`scripts/orchestration/tests/run-tests.ps1`): 8/8
  (unchanged).
- **V2 adversarial suite** (`spine.ps1 selftest`): 108 passed, 0 failed.
  Throwaway git repos under `$env:TEMP`, bare origins, no model calls.
- **Prior 86 V2 tests:** retained (none superseded by a weaker test; several
  strengthened — e.g. the check attestation now binds the recomputed
  verification invocation everywhere).
- **New adversarial cases this session:** ~30
  - verification-substitution (H3-01)
  - schema type fuzz ×7 (M3-01: criteria object/null/string, findings object/null,
    filesReviewed string/object)
  - review-prompt-transport structural proof + pipeline-prompt-injection (H3-03)
  - lease sticky quarantine (1st..8th + New-LeaseWait + corrupt marker + recovery)
    and 8-process concurrent quarantine race (H3-04)
  - protected-grant strict: 13 wildcard/root/parent/case/separator variants +
    granted-subtree containment (H3-05)
  - contract re-freeze tamper ×8 (M3-02: spec / acceptance / profile / gate /
    scope / grants / contract field / stored hash)
  - JSON-secret corpus + pre-publication secret gate (H3-02)
  - forged NO_REMOTE / forged fetch object (M3-03)
  - contract/index gate mismatch + removed-dependency (#9)
  - after-CAS push rejection + ancestry failure + tree mismatch (#10)

### Attack-by-attack (third review's list)

| Attack | Result |
|---|---|
| verification external check substitution | rejected — `verification-substitution` |
| schema `criteria` object / `findings` null / `filesReviewed` string | rejected — `schema-type-fuzz` |
| hostile closing marker in spec / acceptance / diff | out of band — `review-prompt-transport`, `pipeline-prompt-injection` |
| malformed lease 1st / 2nd / 8 concurrent acquire | all refuse — `lease-quarantine-sticky`, `lease-quarantine-concurrent` |
| wildcard / `**` / root / parent protected grant | rejected at freeze — `protected-grant-strict` |
| tampered contract then re-freeze | throws — `contract-refreeze-tamper` (×8) |
| JSON password / token / quoted DATABASE_URL | redacted + scanned — `secret-json-corpus` |
| pre-publish secret gate | blocks push — `pipeline-prepublish-secret-gate` |
| forged `NO_REMOTE` | rejected — `preflight-fetch-forgery` |
| contract gate `g1` / index gate `none` | rejected — `preflight-contract-index-authority` |
| removed dependency in derived index | rejected — `preflight-contract-index-deps` |
| after-CAS rejected push | `PUSH_FAILED`, no publish — `integration-fault afterCasPushReject` |
| remote ancestry failure | `PUSH_FAILED`, no publish — `integration-fault ancestryFail` |
| remote tree mismatch | `REMOTE_DIVERGED`, no publish — `integration-fault treeMismatch` |

---

## Deferred stage — kept honest

`C-04` full external identity chain = **PARTIAL** · `C-05` = **DEFERRED** ·
`C-06` = **DEFERRED** · `H-02` full = **DEFERRED/PARTIAL** · `H-08` =
**DEFERRED** · `H-09` full = **DEFERRED** · `H-10` = **DEFERRED** · real
Claude/Codex disposable smoke = **DEFERRED**. No real-task entrypoint. Even a
future PASS of this isolated spine is **not** `READY_FOR_CANARY`.

---

## Output

```
THIRD_SPINE_REMEDIATION

H3-01  PASS
H3-02  PASS
H3-03  PASS
H3-04  PASS
H3-05  PASS
M3-01  PASS
M3-02  PASS
M3-03  PASS
L3-01  PASS (documentation corrected; no false guarantee)
```

`SECURITY_SPINE_REVIEW` is **not** declared PASS here — only an independent
Codex review can do that.

`READY_FOR_FOURTH_SECURITY_REVIEW = YES`
