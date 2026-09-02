# Orchestration attestations — V2 (C-03, NM-01, NH-02, H3-01)

Every gate in the V2 pipeline produces a **content-addressed attestation** bound
to the exact repository content it covers. The integrator re-verifies all
bindings immediately before touching the target branch; any drift = stale =
refused. There is no "most recent PASS by timestamp" path.

## Task version identity

```
taskVersionId = sha256_canonical({
  taskId, planningHead, specHash, acceptanceHash, v:"orcivo.taskversion/1"
})
```

Change any input → new `taskVersionId` → new ledger, new contract, new
attestations. `PUBLISHED`, `NO_CHANGE_ACCEPTED` and `QUARANTINED` are terminal.

## Contract freeze is deterministic (NH-01)

`contractHash` covers **content only** — `specText`, `acceptanceText`,
`specHash`, `acceptanceHash`, `configHash`, `verificationProfile`,
`verificationProfileHash`, `verificationDefinitionHash`, `declaredScope`,
`protectedPathGrants`, `dependencies`, `risk`, `gate`, `acceptanceCriteriaIds`,
`bindings`. A protected-path grant must be an exact member of
`config.contract.grantableProtectedPrefixes` (H3-05); `dependencies` and `gate`
are re-checked against the derived index at preflight (#9).
`frozenAt` / `frozenBy` live in a separate `audit` block and are **not** hashed,
so re-freezing the same logical contract returns the same object and hash.

`Get-Contract` never trusts stored hashes: on read it recomputes `specHash` from
`specText`, `acceptanceHash` from `acceptanceText`, `verificationProfileHash` and
`verificationDefinitionHash` from the real config profile, `configHash` from the
file, `acceptanceCriteriaIds` from the acceptance text, `taskVersionId` from the
recomputed spec/acceptance hashes, and `contractHash` from the canonical object.
Any mismatch throws — fail closed.

## Declarative verification (NH-02)

A task names a `verificationProfile` id (`A` / `B` / `C`). The profile — working
dir policy, environment policy, timeout, the ordered check list — is a fixed
object in `.orchestration/v2/config.v2.json`. The task cannot supply commands,
executables, arguments, cwd or env.

```
verificationProfileHash    = sha256(profileId)
verificationDefinitionHash = sha256_canonical(resolved profile object)
```

There is **no caller `ScriptBlock`** anywhere in the authoritative pipeline
(`-CheckBlock` / `-PostIntegrationCheck` are removed — H3-01). Each check run
records an `effectiveInvocationHash` = `sha256_canonical` of the **canonical,
result-independent invocation** (`Get-VerificationInvocation`): `profileId`,
`profileVersion`, `definitionHash`, the ordered step list (`ordinal`, `stepId`,
`kind`, `resolvedExecutable`, `argv`, `cwdPolicy`, `expectedExit`),
`workingDirPolicy`, `environmentPolicy`, `environmentAllowlistHash`,
`timeoutSec`. The check attestation's payload carries it, and
`Assert-IntegrationAttestations` **recomputes** it from the frozen contract's
profile and rejects the integration on any mismatch. A run that did not execute
exactly the frozen step list, in order, is marked non-authoritative
(`pass=$false` + an `invocation-integrity` failure). Changing the real procedure
after freeze → definition-hash drift → stale.

## Binding set

| Binding                                                 | Source                                                   |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `taskVersionId`                                         | identity above                                           |
| `baseSHA`                                               | the SHA the integration candidate was built on           |
| `headSHA`                                               | the immutable reviewed candidate commit                  |
| `treeHash`                                              | `git rev-parse <headSHA>^{tree}`                         |
| `diffHash`                                              | `sha256(git diff base..head)`                            |
| `specHash`, `acceptanceHash`                            | recomputed from the frozen contract text                 |
| `configHash`                                            | `sha256(.orchestration/v2/config.v2.json)`               |
| `verificationProfileHash`, `verificationDefinitionHash` | from the config profile                                  |
| `contractHash`                                          | recomputed canonical hash of the frozen contract content |

## Integrity hash (NM-01)

```
attestationHash = sha256_canonical({
  v, kind, taskVersionId, runId, result, createdAt, bindings,
  producerHash = sha256_canonical(producer),
  payloadHash  = sha256_canonical(payload)
})
```

`producer` (reviewer/check/integrator provenance) and `payload` (findings,
evidence, effective invocation) are **inside** the integrity envelope. They
cannot be mutated without breaking `attestationHash`.

## Freshness + latest-authoritative-result

`Test-AttestationFresh` recomputes the full binding set now, compares every
binding, and recomputes `attestationHash` (tamper check).

`Assert-IntegrationAttestations` requires, for each required kind
(`check`, `review`):

- the **latest** attestation bound to this run + this exact head, ordered by
  `createdAt`, has the correct positive result for its kind (`PASS` for check,
  `APPROVE` for review) — an earlier positive result is **not** sufficient;
- and it is **fresh** against the exact commit about to be integrated.

- for the `check` kind: the attestation's `effectiveInvocationHash` and
  `verificationDefinitionHash` equal the values recomputed from the frozen
  profile (H3-01).

Then, and only then: fetch + expected-remote-SHA CAS, post-integration
verification = the **declarative frozen profile** re-run on the candidate tree
(no scriptblock), a **recursive pre-publication secret scan** over the candidate
worktree + every runtime artifact root using the canonical
`redaction.secretPatterns` library (a hit → `SECRET_LEAK_BLOCKED`, no push —
H3-02), merge the reviewed candidate (no `git add -A`), push, remote ancestry +
tree proof, and finally the `PUBLISHED` ledger event.

## Proven by the adversarial suite

- attestation goes stale when the worktree tree changes after the check
- attestation goes stale when `config.v2.json` changes
- mutating `producer` / `payload` breaks `attestationHash`
- old `PASS` + later `FAIL` → integration refused
- old `APPROVE` + later `REQUEST_CHANGES` → integration refused
- tampered `specText` / `acceptanceText` / verification profile / contract field
  with the stored hash kept → `Get-Contract` throws
- verification profile content mutated after freeze → stale
- contract re-freeze is idempotent
