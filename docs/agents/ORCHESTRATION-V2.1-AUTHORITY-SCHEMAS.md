# Orchestration V2.1 — authority artifact schemas (proposal)

Status: **ARCHITECTURE PROPOSAL — NOT IMPLEMENTED.** Companion to
`ORCHESTRATION-V2.1-TRUST-ARCHITECTURE.md`. Nothing here is wired into runtime.
No schema below exists in `.orchestration/` yet.

This file fixes the _shape_ of every authority-bearing artifact in V2.1 so the
main document can stay readable. Each schema is **closed** and **versioned**.

## Owner decisions in force (see main doc §0)

```
PRINCIPAL_BOUNDARY_DECISION = DOCKER_LINUX_CONTAINERS   (Zones B, C)
WINDOWS_DEDICATED_ACCOUNTS  = FALLBACK_ONLY
MAESTRO_SPIKE_TARGET        = tinhtran24/maestro
TRUST_CORE                  = CUSTOM_V2_1               (every schema below is ours)
MAESTRO_TRUST_ROLE          = UNTRUSTED_ORCHESTRATION_SUBSTRATE
```

- **No artifact in this file may be produced, sealed, or vouched for by Maestro
  or any substrate.** Substrate output is untrusted input that Zone A / Zone D
  revalidate and re-seal.
- The **seal key** (`authoritySeal`, §1) is held by the SUPERVISOR principal
  only. The **push credential** is held by the INTEGRATOR principal only. They
  are **different secrets in different stores**; neither principal holds the
  other's.
- A Docker container (Zone B / Zone C) can hold **none** of: a seal key, a push
  credential, an authority artifact file (write), the primary `.git`, or
  `docker.sock`.

## 0. Global rules for every authority artifact

1. `additionalProperties: false` at **every** object level, recursively.
2. Every property has an explicit `type`. A `const` also carries its `type`
   (`{"type":"string","const":"..."}`) — never a bare `const` (M4-01).
3. **Duplicate keys are rejected before parsing.** A raw-token pre-scan
   (`Assert-NoDuplicateJsonKeys`) walks the byte stream and fails closed on any
   repeated key at any depth. `ConvertFrom-Json` / `JavaScriptSerializer`
   last-key-wins is never relied on (M4-01, review-4 §M4-01).
4. **No JSON numbers except integers.** Integers serialise as minimal decimal
   (`-?[0-9]+`). No floats, no `NaN`/`Infinity`, no exponent form. Any quantity
   that is not a small counter is a string.
5. **Canonical serialisation** (`canonical/2`): UTF-8 no BOM; object keys sorted
   by ordinal code point; no insignificant whitespace; strings escaped per
   RFC 8259 with `\uXXXX` for every code point < 0x20; arrays keep source order.
   The hash of an artifact is `sha256` of its canonical form.
6. **`schemaVersion` must match exactly** (string compare). A singleton array
   `["orcivo...."]` is not a match (M4-01, M4-03).
7. Every hash field is `^sha256:[0-9a-f]{64}$`. Every git object id is
   `^[0-9a-f]{40}$` (full, never abbreviated).
8. Artifacts are only trusted when produced/sealed by the **SUPERVISOR or
   INTEGRATOR principal** (see main doc §2, §10). A same-user IMPLEMENTER /
   REVIEWER process cannot write a valid one because it cannot produce the
   principal seal (`authoritySeal`), not merely because a hash would mismatch.

## 1. `authoritySeal` — the primitive that replaces "self-hash"

Every authority artifact embeds:

```
authoritySeal: {
  type: "object", additionalProperties: false,
  required: [ "v", "principal", "keyId", "sealedOverHash", "algo", "value", "sealedAt" ],
  properties: {
    v:              { type: "string", const: "orcivo.orchestration.v2_1.authority-seal/1" },
    principal:      { type: "string", enum: [ "supervisor", "integrator" ] },
    keyId:          { type: "string", pattern: "^k-[0-9a-f]{16}$" },
    algo:           { type: "string", enum: [ "hmac-sha256-cng", "ed25519" ] },
    sealedOverHash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },  # canonical hash of the artifact MINUS authoritySeal
    value:          { type: "string", pattern: "^[0-9a-f]{64,128}$" },
    sealedAt:       { type: "string", format: "date-time" }               # audit only, NOT in sealedOverHash
  }
}
```

- The seal **key never enters the IMPLEMENTER or REVIEWER trust zone**. Per owner
  decision D1 (Zone A host-side, Zones B/C in Docker containers), it lives in a
  **Windows CNG key store, non-exportable, ACL'd to the SUPERVISOR principal**,
  and no container mounts it (TPM-backed CNG preferred — non-exportable even to
  admin). Fallback (`WINDOWS_DEDICATED_ACCOUNTS`): a key file readable only by a
  dedicated supervisor OS account. See main doc §2 / §5 option B.
- Verification recomputes the canonical hash of the artifact with `authoritySeal`
  removed, then verifies `value`. A rewrite by a principal without the key fails
  here — this is the root of trust the executor **cannot recompute** (main doc Q7).
- If the deployment cannot yet hold a key outside the executor's reach, **no
  authority artifact can be sealed and the spine cannot pass** (main doc verdict).

## 2. Task authority manifest — `task-authority-manifest/1`

Replaces the self-hashed contract as the root of task authority (fixes H4-01).

```
{
  schemaVersion: "orcivo.orchestration.v2_1.task-authority-manifest/1",
  manifestId:    "^m-[0-9a-f]{32}$",
  taskVersionId: "^[0-9a-f]{64}$",          # see identity formula below
  taskId:        "<safe-id>",
  planningHead:  "^[0-9a-f]{40}$",
  spec:          { hash: "sha256:..", bytesRef: "<blob-sha>" },
  acceptance:    { hash: "sha256:..", criteriaIds: [ "<id>", ... ], bytesRef: "<blob-sha>" },
  risk:          { type: "string", enum: [ "A", "B", "C" ] },
  scope:         { declared: [ "<relpath-key>", ... ], mode: { enum: [ "list", "unrestricted" ] } },
  protectedGrants:[ { prefix: "<allowlisted-canonical-prefix>", grantedBy: "supervisor" }, ... ],
  gate:          { type: "string", enum: [ "none", "<gate-id>" ] },
  dependencies:  [ "^[0-9a-f]{64}$", ... ],
  verification:  { profileId: { enum:["A","B","C"] }, profileVersion: <int>,
                   definitionHash: "sha256:..", invocationHash: "sha256:.." },
  boundSchemas:  [ { name: "<artifact schema>", version: "<exact>", hash: "sha256:.." }, ... ],
  configHash:    "sha256:..",                # .orchestration/v2/config.v2.json at freeze
  createdAt:     "<date-time>",              # audit only
  authoritySeal: { ... }                     # supervisor
}
```

**`taskVersionId` identity (V2.1).** Every semantically authoritative field is in
the pre-image, so an executor cannot change one and re-hash without changing the
identity — and changing the identity breaks the ledger, index, gate and every
attestation binding at once:

```
taskVersionId = sha256_canonical({
  v: "orcivo.taskversion/2",
  taskId, planningHead,
  specHash, acceptanceHash, acceptanceCriteriaIds,
  risk, scopeDeclared, scopeMode,
  protectedGrants, gate, dependencies,
  verificationProfileId, verificationProfileVersion, verificationDefinitionHash,
  boundSchemas, configHash
})
```

The manifest is still not self-authenticating: identity binds the fields, and the
`authoritySeal` binds identity to a principal the executor is not. Both are
required — identity alone is forgeable (regenerate ledger+seal for the new id),
seal alone leaves fields outside identity mutable across ledgers.

## 3. Candidate descriptor — `candidate-descriptor/1`

One immutable candidate identity (fixes H4-03, review-4 §6).

```
{
  schemaVersion:  "orcivo.orchestration.v2_1.candidate-descriptor/1",
  candidateId:    "^c-[0-9a-f]{32}$",
  taskVersionId:  "^[0-9a-f]{64}$",
  runId:          "^run-[0-9a-f]{32}$",
  candidateCommit:"^[0-9a-f]{40}$",         # in the disposable clone AND fetched into authority by sha
  candidateTree:  "^[0-9a-f]{40}$",
  baseTargetCommit:"^[0-9a-f]{40}$",        # origin/<target> the candidate was built on
  parents:        [ "^[0-9a-f]{40}$", ... ],
  changedBlobs:   [ { path: "<relpath-key>", blob: "^[0-9a-f]{40}$", mode: "^[0-7]{6}$" }, ... ],
  materializationHash: "sha256:..",         # sha of `git archive candidateTree` (deterministic ordering)
  frozenAt:       "<date-time>",            # audit only
  authoritySeal:  { ... }                   # supervisor
}
```

Rule: after a candidate descriptor is sealed, **no gate operates on a worktree.**
Verification, secret scan and review all consume a read-only materialisation
provably derived from `candidateTree` (`git archive` / `git cat-file`, checked
against `materializationHash`). Any mutation ⇒ new `candidateId` ⇒ new
verification ⇒ new review.

## 4. Review request + envelope

### 4.1 `review-request/1` (supervisor → reviewer, sealed)

```
{
  schemaVersion:  "orcivo.orchestration.v2_1.review-request/1",
  reviewAttemptId:"^rv-[0-9a-f]{32}$",
  nonce:          "^[0-9a-f]{32}$",         # single-use, tracked in the lineage (fixes H4-02 replay)
  taskVersionId:  "^[0-9a-f]{64}$",
  manifestHash:   "sha256:..",
  candidateId:    "^c-[0-9a-f]{32}$",
  candidateCommit:"^[0-9a-f]{40}$",
  candidateTree:  "^[0-9a-f]{40}$",
  reviewedBlobs:  [ { path, blob: "^[0-9a-f]{40}$" }, ... ],   # exact content-addressed identities
  acceptanceSetHash: "sha256:..",
  diffBlob:       "^[0-9a-f]{40}$",         # the redacted diff as a committed blob, addressed by sha
  issuedAt:       "<date-time>",
  authoritySeal:  { ... }                   # supervisor
}
```

The reviewer reads blobs with `git cat-file blob <sha>` from a read-only
materialisation. There is no path-addressed file to swap (fixes H4-02 TOCTOU),
no junction to redirect, and the diff the reviewer sees is the addressed
`diffBlob` — the envelope's `diffHash` equals `sha(diffBlob content)` so the
envelope proves which bytes were seen.

### 4.2 `review-envelope/2` (reviewer → supervisor)

```
{
  schemaVersion:  { type:"string", const:"orcivo.orchestration.v2_1.review-envelope/2" },
  reviewAttemptId:{ type:"string", pattern:"^rv-[0-9a-f]{32}$" },
  nonce:          { type:"string", pattern:"^[0-9a-f]{32}$" },     # must equal the request nonce, once
  manifestHash:   { type:"string", pattern:"^sha256:[0-9a-f]{64}$" },
  candidateCommit:{ type:"string", pattern:"^[0-9a-f]{40}$" },
  candidateTree:  { type:"string", pattern:"^[0-9a-f]{40}$" },
  reviewedBlobHashes: { type:"array", items:{ type:"string", pattern:"^[0-9a-f]{40}$" } },
  acceptanceSetHash:{ type:"string", pattern:"^sha256:[0-9a-f]{64}$" },
  verdict:        { type:"string", enum:[ "APPROVE","REQUEST_CHANGES","HUMAN_REVIEW_REQUIRED","INCOMPLETE_REVIEW" ] },
  criteria:       { type:"array", maxItems:200, items:{ type:"object", additionalProperties:false,
                    required:["id","met","evidence"],
                    properties:{ id:{type:"string",pattern:"^[A-Za-z][A-Za-z0-9_-]{0,31}$"},
                                 met:{type:"boolean"}, evidence:{type:"string",maxLength:4000} } } },
  findings:       { type:"array", maxItems:200, items:{ type:"object", additionalProperties:false,
                    required:["severity","detail"],
                    properties:{ severity:{type:"string",enum:["info","low","medium","high","critical"]},
                                 file:{type:"string",maxLength:512}, line:{type:"integer"},
                                 detail:{type:"string",minLength:1,maxLength:4000} } } },
  filesReviewed:  { type:"array", maxItems:2000, items:{ type:"string", maxLength:512 } }
}
```

- Reviewer provenance (`provider`, `model`, `effort`, `toolPolicy`) is **not** in
  the envelope. It is captured by the launcher (principal-side) and recorded in
  the attestation `producer` block only (M-05, review-4 self-report concern).
- The supervisor rejects the envelope unless `nonce`, `manifestHash`,
  `candidateCommit`, `candidateTree`, `acceptanceSetHash` and the
  `reviewedBlobHashes` set **all** equal the sealed `review-request`, and the
  nonce has not been consumed by an earlier lineage entry.

## 5. Attestation lineage — `attestation/3` + `attestation-lineage-head/1`

Ordering is an append-only hash chain, never `createdAt` (fixes H4-04).

```
attestation/3 {
  schemaVersion:  "orcivo.orchestration.v2_1.attestation/3",
  sequence:       <int>,                    # 1-based, contiguous per (taskVersionId, runId)
  previousHash:   "sha256:..",              # genesis = sha256("orcivo.attest.genesis/3:" + taskVersionId + ":" + runId)
  attestationId:  "^atn-[0-9a-f]{32}$",
  attemptId:      "^att-[0-9a-f]{32}$",
  taskVersionId:  "^[0-9a-f]{64}$",
  runId:          "^run-[0-9a-f]{32}$",
  kind:           { enum: [ "check", "review", "secret-scan", "candidate", "integration" ] },
  result:         { enum: [ "PASS","FAIL","APPROVE","REQUEST_CHANGES","HUMAN_REVIEW_REQUIRED","INCOMPLETE_REVIEW","CLEAN","LEAK" ] },
  candidateCommit:"^[0-9a-f]{40}$",
  candidateTree:  "^[0-9a-f]{40}$",
  manifestHash:   "sha256:..",
  producerHash:   "sha256:..",              # sha of the sealed producer/provenance block
  payloadHash:    "sha256:..",              # sha of the kind-specific payload block
  bindings:       { ...the V2 binding set, all recomputed by the sealer... },
  createdAt:      "<date-time>",             # audit ONLY - not hashed, not ordered on
  attestationHash:"sha256:..",              # canonical hash over everything except createdAt + authoritySeal
  authoritySeal:  { ... }                    # supervisor (check/review/secret-scan) or integrator (integration)
}
```

```
attestation-lineage-head/1 {
  schemaVersion:  "orcivo.orchestration.v2_1.attestation-lineage-head/1",
  taskVersionId, runId,
  sequence:       <int>,
  headHash:       "sha256:..",              # == attestationHash of the last entry
  latestByKind:   { check: "<attestationId|null>", review: "...", "secret-scan": "...", candidate: "...", integration: "..." },
  sealedAt:       "<date-time>",             # audit only
  authoritySeal:  { ... }                    # supervisor
}
```

"Latest authoritative result for a kind" = walk the chain from genesis; take the
last entry of that kind. Duplicate `sequence`, gap, broken `previousHash`,
head/tail disagreement, or an entry whose `nonce` (for reviews) was already
consumed ⇒ **lineage QUARANTINED, fail closed** (like the ledger).

## 6. Ledger event — `ledger-event/3`

As V2 `ledger-event/2` (hash-chained, sealed head) plus:

- add states `CANDIDATE_READY`, `VERIFIED`, `REVIEWED`, `INTEGRATION_PREPARED`,
  `PUSH_ATTEMPTED`, `REMOTE_RECONCILING`, `PUBLISHED`,
  `NOT_PUBLISHED_CONFIRMED`, `AMBIGUOUS_REMOTE` (see main doc §10);
- every event carries `authoritySeal` (supervisor or integrator);
- `evidence` for publication events carries `expectedMergeCommit`,
  `observedRemoteCommit`, `observedRemoteTree`, `reconciliationSource`
  (`fetch` | `run-manifest-replay`).

## 7. Lease / quarantine / recovery — `lease-authority-event/1`

Append-only, sealed, replaces the deletable marker (fixes H4-05).

```
lease-authority-event/1 {
  schemaVersion: "orcivo.orchestration.v2_1.lease-authority-event/1",
  sequence:      <int>,
  previousHash:  "sha256:..",
  namespace:     { enum: [ "scheduler","taskversion","workspace","integration","ledger" ] },
  key:           "<safe-id | taskVersionId>",
  event:         { enum: [ "acquire","renew","release","quarantine","recovery-capability-issued","recovered" ] },
  leaseId:       "^lease-[0-9a-f]{32}$",
  holder:        { pid:<int>, host:"<name>", startTime:"<date-time>", principal:"<name>" },
  quarantineHash:"sha256:..",               # present for quarantine/recovery events; binds the quarantined record bytes
  capability:    {                          # present only on recovery-capability-issued / recovered
    capabilityId: "^cap-[0-9a-f]{32}$",
    nonce:        "^[0-9a-f]{32}$",          # single use
    boundNamespace, boundKey, boundQuarantineHash: "sha256:..",
    issuedBy:     "supervisor", expiresAt: "<date-time>"
  },
  eventHash:     "sha256:..",
  authoritySeal: { ... }                    # supervisor
}
```

- Quarantine state = "the sealed authority log's latest event for this
  namespace/key is `quarantine` with no later `recovered`". Not a file's
  existence. Deleting files does not change the log.
- `recovered` is accepted only if it carries a `capability` whose
  `capabilityId` + `nonce` match an earlier `recovery-capability-issued` event,
  the nonce is unconsumed, `boundQuarantineHash` equals the current quarantined
  record hash, and it is not expired. Recovery is serialised under the
  `integration`/`ledger` lease and reconciled against live-owner probes and (for
  `integration`) `origin`.

## 8. Fetch observation — `fetch-observation/1`

```
{
  schemaVersion:  "orcivo.orchestration.v2_1.fetch-observation/1",
  observationId:  "^fo-[0-9a-f]{32}$",
  nonce:          "^[0-9a-f]{32}$",
  repoDir:        "<abs-path>",
  remote:         "origin",
  target:         "<branch>",
  performed:      { type: "boolean" },       # must be true to be authority
  beforeLocalSha: "^[0-9a-f]{40}$",
  observedRemoteSha: "^[0-9a-f]{40}$",
  gitExitCode:    { type: "integer" },
  observedAtTicks:{ type: "integer" },
  observedAtIso:  "<date-time>",
  authoritySeal:  { ... }                     # supervisor - minted and consumed in ONE operation (fixes M4-02)
}
```

Preflight mints and consumes this inside a single non-aliasing call; it is never
left in a caller-visible mutable script variable. Bounded-past check:
`0 <= now - observedAtTicks <= requireFetchWithinSec` (rejects future time,
review-4 §M4-02).

## 9. Integration evidence — `integration-evidence/1`

```
{
  schemaVersion:  "orcivo.orchestration.v2_1.integration-evidence/1",
  runId, taskVersionId, candidateId,
  candidateCommit:"^[0-9a-f]{40}$",
  candidateTree:  "^[0-9a-f]{40}$",
  expectedMergeCommit: "^[0-9a-f]{40}$",
  pushAttemptedAt:"<date-time>",
  observedRemoteCommit: "^[0-9a-f]{40}$",
  observedRemoteTree:   "^[0-9a-f]{40}$",
  reconciliation: { source: { enum: [ "fetch","run-manifest-replay" ] }, attempts: <int>, agreed: { type:"boolean" } },
  terminalState:  { enum: [ "PUBLISHED","NOT_PUBLISHED_CONFIRMED","AMBIGUOUS_REMOTE" ] },
  authoritySeal:  { ... }                     # integrator
}
```

`terminalState` is derived only from `observedRemoteCommit`/`Tree` vs
`expectedMergeCommit`/`candidateTree`. "push failed" is never recorded while the
remote outcome is unknown (review-4 §10, §M4-04). If the ledger write of this
evidence fails, recovery re-derives it from `origin` + the immutable run
manifest.

## 10. Run manifest — `run-manifest/1` (immutable, sealed at dispatch)

```
{
  schemaVersion: "orcivo.orchestration.v2_1.run-manifest/1",
  runId, taskVersionId, manifestHash: "sha256:..",
  baseTargetCommit: "^[0-9a-f]{40}$",
  disposableCloneId: "<id>",
  implementerPrincipal: "<name>", reviewerPrincipal: "<name>",
  dispatchedAt: "<date-time>",
  authoritySeal: { ... }                       # supervisor
}
```

This is the anchor crash recovery replays against when a ledger write is lost
after a push (review-4 §10 last paragraph).
