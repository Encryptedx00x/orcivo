# Orchestration attestations — V2 (C-03)

Every gate in the V2 pipeline produces a **content-addressed attestation** that is
bound to the exact repository content it covers. The integrator re-verifies all
bindings immediately before touching the target branch; any drift = stale =
refused. There is no "most recent PASS by timestamp" path.

## Task version identity

```
taskVersionId = sha256_canonical({
  taskId, planningHead, specHash, acceptanceHash, v:"orcivo.taskversion/1"
})
```

`specHash` / `acceptanceHash` are SHA-256 of the frozen spec and acceptance text.
Change any input → new `taskVersionId` → new ledger, new contract, new
attestations. A `PUBLISHED` version is terminal.

## Binding set

Each attestation (`kind` ∈ `check | review | approval | integration`) records:

| Binding                      | Source                                     |
| ---------------------------- | ------------------------------------------ |
| `taskVersionId`              | identity above                             |
| `baseSHA`                    | run base commit                            |
| `headSHA`                    | the executor's immutable commit            |
| `treeHash`                   | `git rev-parse <headSHA>^{tree}`           |
| `diffHash`                   | `sha256(git diff base..head)`              |
| `specHash`, `acceptanceHash` | frozen contract                            |
| `configHash`                 | `sha256(.orchestration/v2/config.v2.json)` |
| `verificationProfileHash`    | `sha256(profile name)`                     |
| `contractHash`               | canonical hash of the frozen contract      |

## Integrity hash

`attestationHash = sha256_canonical({ kind, taskVersionId, runId, result, bindings })`

Only the security-relevant immutable fields are covered (all round-trip through
JSON unambiguously). `payload` / `producer` metadata (reviewer model, effort,
tool policy, prompt template version — M-05) are recorded but advisory.

## Freshness check (`Test-AttestationFresh`)

1. Recompute the full binding set against the worktree **now**.
2. Compare every binding to what the attestation claims.
3. Recompute `attestationHash` and compare (tamper check).
4. Any mismatch → `fresh = $false` with a `drift` list naming the field.

## Integrator gate (`Assert-IntegrationAttestations`)

Before merging, for each required kind (`check`, `review`):

- there is an attestation for **this run**,
- with a positive result (`PASS` / `APPROVE`),
- that is **fresh** against the exact commit about to be integrated.

Then, and only then: fetch + remote CAS, merge the validated commit (no
`git add -A`), post-integration check, push, verify remote ancestry, and finally
append the `PUBLISHED` ledger event.

## Proven by the adversarial suite

- attestation goes stale when the worktree tree changes after the check
- attestation goes stale when `config.v2.json` changes
- a commit amended after review → integration refused (stale / branch moved)
- `origin/main` advanced under the run → integration blocked, ledger not `PUBLISHED`
