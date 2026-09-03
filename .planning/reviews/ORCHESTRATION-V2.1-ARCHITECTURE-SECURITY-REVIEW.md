# ORCHESTRATION V2.1 — INDEPENDENT ARCHITECTURE SECURITY REVIEW

**Review date:** 2026-09-03

**Review role:** independent architecture/security reviewer

**Baseline reviewed:** `450b4a6a43bb3391b27b2fe19fb9429b6ca6cc99` (`main`, initially clean)

**Primary design:** `docs/agents/ORCHESTRATION-V2.1-TRUST-ARCHITECTURE.md`

**Authority schemas:** `docs/agents/ORCHESTRATION-V2.1-AUTHORITY-SCHEMAS.md`

This is a design review, not an implementation review. No runtime, test,
configuration, persistent database, production resource, real task, P03, T12,
T13, container, seal key, Zone D/publication credential, or Maestro installation
was created, changed, or exercised. The only repository push authorized here is
the later normal delivery of this review document. Read-only CLI help inspection
was used only to avoid assuming nonexistent Claude Code or Codex flags. No
architectural conclusion in this report authorizes an operational action.

The four prior V2 spine reviews and the supervisor review were treated as the
adversarial requirements corpus. A control is credited only when the proposed
design makes the old exploit structurally impossible; prose that merely asks a
future implementation to behave correctly is not credited as a security
boundary.

## 1. VERDICT

```text
ARCHITECTURE_SECURITY_REVIEW = FAIL
C06_ARCHITECTURE = SOUND_WITH_REQUIRED_WAVE0_PROOFS
H08_MINIMUM_ARCHITECTURE = NEEDS_CHANGES
MAESTRO_ROLE = ACCEPT_WITH_CHANGES
BUILD_VS_ADOPT_RECOMMENDATION = CONTINUE_CUSTOM
READY_FOR_WAVE0 = NO
READY_TO_IMPLEMENT_V2_1 = NO
```

The intended trust split is directionally strong: Zone B and Zone C do not
receive seal or publication authority; Zone D alone publishes; `origin` wins
over local push belief; candidate identity is content-addressed; V1/V2 artifacts
are rejected; and Maestro is expressly untrusted for authority. Those choices
address the right structural causes.

The proposal nevertheless fails as written because four load-bearing properties
are false or undefined:

1. `TESTER` may run candidate-controlled build/test code as the authority
   principal, exposing the root of trust.
2. Zones A and D may share one Windows SID, so separate credential entries do
   not enforce separate capabilities.
3. the sealed run manifest used for post-push recovery does not contain the
   expected merge commit, candidate, remote, or target ref it claims recovery
   can reconstruct;
4. H-08 records `recovered` before completing the live-owner proof and can need
   a lease that quarantine itself prevents it from acquiring.

In addition, the proposed schemas are specifications by example rather than
complete closed JSON Schemas, task identity omits an already-declared authority
field, review provenance/coverage is not fully bound, the reviewer network
policy contradicts cloud CLI operation, and Docker daemon launch authority is
not modeled. These are architecture changes, not ordinary Wave 0 implementation
details.

`C06_ARCHITECTURE = SOUND_WITH_REQUIRED_WAVE0_PROOFS` means only that Docker
Desktop Linux containers can provide the intended B/C principal boundary on
Windows 11/WSL2 under an explicit threat model and a fixed, proven composition.
It does not mean C-06 passes today.

`MAESTRO_ROLE = ACCEPT_WITH_CHANGES` accepts only the proposed label and
enforced boundary “untrusted orchestration substrate.” It does not approve
installation, adoption, authority use, or even a pilot before the listed owner
approval and Wave 0 redesign.

## 2. ARCHITECTURE_SUMMARY

The proposed authority flow is:

```text
owner/policy -> Zone A seals task authority
                    |
                    v
              Zone B implements in a disposable independent clone
                    |
                    v
              Zone A freezes candidate commit/tree
                    |
          +---------+----------+
          |                    |
          v                    v
   untrusted verification   Zone C reviews exact immutable content
          |                    |
          +---------+----------+
                    v
              Zone A validates and seals evidence
                    |
                    v
              Zone D integrates and pushes
                    |
                    v
              origin is publication truth
```

The first diagram differs deliberately from the reviewed proposal: any process
that can execute candidate code is labeled untrusted. The proposal currently
places `TESTER` in the authority principal
(`ORCHESTRATION-V2.1-TRUST-ARCHITECTURE.md:349-375`) while also directing it to
run a profile against candidate materialization (`:581-590`). That edge must be
removed.

Trust sources that are acceptable in principle:

- a key/capability held outside all LLM and candidate-execution zones;
- a separately held publication capability;
- the authenticated Git remote for publication truth only;
- canonical bytes verified against a closed, version-pinned schema.

Items that are evidence but never roots of trust:

- a hash stored beside or inside the bytes that produced it;
- an LLM/provider/model self-report;
- a Maestro/SQLite/session state;
- a local branch, worktree, marker file, process exit, or `git push` exit code;
- timestamps used to infer which result is authoritative.

Mapping to the earlier structural causes:

| Earlier cause | V2.1 direction | Review result |
| --- | --- | --- |
| Self-generated contract/hash authority | External `authoritySeal` | Correct direction; signer purpose and principal separation incomplete |
| Mutable worktree and review TOCTOU | `candidateCommit` + `candidateTree`; Git object reads | Correct direction; materialization/path/submodule policies incomplete |
| Reviewer replay/self-report | Sealed request, attempt, nonce, lineage | Incomplete binding and no authenticated reviewer-output channel |
| Timestamp/latest ambiguity | Sequence + `previousHash` + sealed head | Correct ordering model; rollback and event/head crash protocol unresolved |
| Deletable quarantine marker/reusable token | Sealed append-only log + bound single-use capability | Correct shape; unsafe recovery ordering and locking remain |
| Local push result treated as publication | Remote reconciliation states | Correct principle; immutable recovery intent is missing |
| Fault switches in production | Test composition root only | Correct design direction; production selection closure still required |
| Same-principal executor trust | Docker Linux B/C boundary | Feasible only after fixed-launch and Wave 0 proof |

## 3. ROOT_OF_TRUST_REVIEW

### Intended separation

The normative statements at
`ORCHESTRATION-V2.1-TRUST-ARCHITECTURE.md:393-415` correctly say:

- IMPLEMENTER and REVIEWER receive neither an `authoritySeal` capability nor a
  push credential;
- Zone A seals but does not push;
- Zone D pushes but does not run an LLM;
- an integrator key, if one exists, is separate and restricted to integration
  evidence;
- Maestro never becomes authority (`:73-82`, `:804-857`).

Subject to the required changes below, compromise of B cannot mint authoritative
artifacts, compromise of C cannot publish, and compromise of Maestro cannot mint
authority. Hashes supplied by those zones remain untrusted inputs that A must
recompute over exact bytes.

### Circular-trust attack

The task-manifest model avoids the elementary cycle “B says these bytes are
valid because their self-produced hash matches” by requiring an external seal
(`ORCHESTRATION-V2.1-AUTHORITY-SCHEMAS.md:76-86,115-135`). However, later
artifacts reintroduce underspecified self-assertion:

- `producerHash`, `payloadHash`, and `bindings` in `attestation/3` do not define
  closed producer/payload schemas or content-addressed bytes (`:228-250`);
- `eventHash` has no defined preimage (`:287-305`);
- `attestationHash` says it hashes everything except `createdAt` and the seal,
  but does not exclude the `attestationHash` field itself (`:244-249`).

Zone A must recompute every referenced digest from supplied bytes validated by a
known schema; no artifact may authenticate a digest merely by asserting it.

### Root-of-trust violations

1. **Candidate execution in Zone A.** A deterministic launcher is not a
   deterministic workload. Package scripts, compiler plugins, test loaders,
   generated tools, and repository configuration are candidate-controlled
   executables. Running any of them as `TESTER=authority` lets a compromised B
   read/call the seal capability, write authority state, or reach D's credential.
   Byte-only validation may remain in A; executable verification may not.
2. **A/D capability collapse.** The document permits A and D to share the normal
   developer principal (`TRUST-ARCHITECTURE.md:250-262`). Under one SID, two CNG
   or Credential Manager entries are organizational separation, not access
   control. A can call D's credential and D can call A's key unless a separate
   identity or authenticated broker enforces the capability boundary.
3. **No seal purpose separation in the schema.** `authoritySeal` accepts
   `principal = supervisor | integrator`, a key id and an artifact-selected
   algorithm (`AUTHORITY-SCHEMAS.md:56-73`). The required signer is only a
   comment on each example. A generic verifier could therefore accept an
   integrator-key signature on a task manifest.

Required seal preimage:

```text
domain || namespace || artifactSchemaVersion || artifactPurpose ||
authorizedPrincipal || keyId || fixedAlgorithm || canonicalPayloadHash
```

An external, supervisor-owned registry must bind each `keyId` to principal,
algorithm, namespace, allowed artifact purposes, activation generation, and
revocation state. Artifact data must not select its own verification policy.

## 4. ZONE_BOUNDARY_REVIEW

### Zone A — supervisor authority

Zone A must be a minimal deterministic authority service, not a general-purpose
PowerShell session. The current document says “no LLM/task instructions,” but
does not yet close all executable inputs.

Required Zone A properties:

- distinct OS/service identity from D, or a broker whose access policy makes the
  two capabilities mutually unreachable;
- non-exportable key where feasible, key handle opened only for one bounded
  seal/verify operation, no serialization, stdout/stderr/environment exposure,
  crash dump, transcript, or long-lived global handle;
- fixed executable paths and sanitized `PATH`, `HOME`, `USERPROFILE`, `APPDATA`,
  `GIT_CONFIG_*`, `GIT_ASKPASS`, `SSH_AUTH_SOCK`, locale, proxy and temp
  variables; no inherited untrusted environment;
- no task-controlled executable, script, scriptblock, shell expansion, Git hook,
  filter, smudge/clean driver, credential helper, URL helper, or config include;
- all authority operations canonical, version-dispatched, bounded and
  deterministic;
- no Docker socket exposed to any LLM zone and no container specification
  derived from task/provider/Maestro strings.

The design has no principal that owns container creation: the role matrix says
Docker daemon control is `no` for every role (`TRUST-ARCHITECTURE.md:347-372`).
Yet somebody must create B/C. Define a minimal launch broker (preferred) or make
an explicit, narrow A subcomponent the launcher. Its policy must produce a
complete container spec from fixed templates and pinned image digests. Task data
may select only opaque IDs from a closed allowlist; it may never become a mount
source, target, image, Docker flag, argv fragment, environment name/value,
network, port, device, label selector, or shell string.

### Zone B — implementer

The proposed baseline at `TRUST-ARCHITECTURE.md:44-66,393-437` is necessary and
mostly correct: disposable Linux container, independent clone, no host `.git`,
authority root, seal, push credential, Docker API, host profile, privileged mode,
or excess capabilities.

The fixed policy must additionally close:

- `/proc/*/environ`, `/sys`, `/dev`, `/run`, `/mnt`, `/host_mnt`, `/mnt/wsl`,
  inherited process environment, temp directories, SSH agents, Git askpass and
  credential helpers;
- Unix sockets, Windows named pipes, Docker TCP endpoints, named/anonymous
  volumes, WSL integrations, shared drives, and sibling-container inspection;
- direct DNS, arbitrary egress, RFC1918, link-local/metadata, gateway,
  `localhost`, `host.docker.internal`, and `gateway.docker.internal`;
- bind-source traversal, source swaps, symlinks, hardlinks, junctions/reparse
  points, Windows case folding, Unicode normalization, reserved names, trailing
  dot/space, and parent traversal;
- credentialed clone URLs, `.git/config`, alternates, hooks, submodules,
  `.gitattributes` filters, global/system Git configuration and executable
  discovery.

The clone handshake is currently ambiguous: B cannot see the authority root,
but is told to clone a local authority path and retain it as a local origin
(`TRUST-ARCHITECTURE.md:419-431,913-920`). Define one mechanism, such as a
supervisor-produced, sanitized, read-only bundle/mirror addressed by SHA, then
remove the remote from the working clone. Never mount the primary `.git`.

### Zone C — reviewer

The target reviewer is correctly more restrictive than B: fresh container and
profile, no B workspace/reasoning/session, no MCP, memory, plugins, hooks, user
config, seal, push, authority, or repository write; candidate input is read-only
and content-addressed (`TRUST-ARCHITECTURE.md:439-454`).

Feasibility was checked without invoking either model:

- installed Claude Code `2.1.259` exposes `--bare`, `--restricted`,
  `--safe-mode`, `--strict-mcp-config`, `--no-session-persistence`, `--tools`
  and `--json-schema`; the [official CLI reference](https://code.claude.com/docs/en/cli-usage)
  documents minimal mode and structured output. These controls are promising,
  but their effective behavior, managed-setting inheritance, skill discovery,
  authentication and subprocess environment must be proven for the pinned
  build.
- installed Codex CLI `0.152.1` exposes `exec --ephemeral --ignore-user-config
  --ignore-rules --sandbox read-only --output-schema --json --strict-config`.
  Those flags do not by themselves prove absence of auth files, memories,
  plugins, AGENTS discovery, inherited environment, telemetry, or network paths.
  A fresh `CODEX_HOME`, explicit configuration and effective-config evidence are
  Wave 0 requirements.

The architecture's `network=deny` and “never needs network” statements
(`TRUST-ARCHITECTURE.md:367-391`) are incompatible with its requirement that
cloud CLIs authenticate and complete a prompt (`:934-942`). Docker has no
built-in domain-allowlist flag. The design needs a mandatory egress broker/proxy
or equivalent fixed network policy that allows only the provider path and blocks
direct DNS/IP/host/private destinations. OpenAI likewise describes managed Codex
operation as allowlisted, not open-ended, egress
([OpenAI](https://openai.com/index/running-codex-safely/)).

### Zone D — integrator

Zone D must remain deterministic, contain no LLM, consume only fully validated
sealed inputs, and be the sole holder/caller of the push capability. It needs:

- its own OS/service identity or mutually exclusive credential broker;
- fixed Git executable/config/protocol policy, no hooks/filters/helpers from
  candidate or user config, and an explicit single remote/ref policy;
- a sealed and durable integration intent before the first network side effect;
- no authority to seal task, review, lease, gate or supervisor lineage objects.

### C-05 compatibility

C-05 is not PASS. Windows Job Objects can contain host helper processes, but
killing `docker.exe` or the supervisor does not necessarily kill a container
owned by the daemon. The architecture is compatible with a safe design only if
it adds container IDs and immutable labels to authority, `restart=no`, explicit
stop/kill/wait/inspect/remove, mount/lease retention until `Running=false`, and
an independent orphan reaper/reconciler that terminates or quarantines labeled
orphans rather than restarting them. Timeout, cancellation, provider failover
and supervisor crash must leave no descendant/container able to write; daemon
ambiguity must quarantine. Job Objects remain useful for host shims, not as the
Docker containment proof.

## 5. AUTHORITY_SCHEMA_REVIEW

The global rules in `ORCHESTRATION-V2.1-AUTHORITY-SCHEMAS.md:31-54` are good
requirements: recursive `additionalProperties:false`, duplicate-key rejection
before parsing, canonical serialization, raw-type validation, exact version,
bounded collections and full hashes. They do not make the examples that follow
complete schemas.

| Artifact | Review |
| --- | --- |
| `authoritySeal/1` | Structurally shown, but lacks domain/purpose separation, signer const by artifact, external key policy and algorithm-conditioned signature length. `sealedAt` is required but not authenticated. |
| `task-authority-manifest/1` | Pseudo-shape, not a complete JSON Schema. Many nested objects lack formal `required`, properties, bounds and uniqueness. `configHash` names legacy `.orchestration/v2/config.v2.json` (`:109`). |
| `candidate-descriptor/1` | Commit/tree binding is useful; complete required/type/path/repository policy is absent. |
| `review-request/1` | Missing `runId`, full acceptance/spec bytes references, verification/scan evidence, config/schema/runtime policy and complete change manifest. |
| `review-envelope/2` | Most schema-like artifact, but no root `required`/`additionalProperties:false`; no `diffHash` despite prose requiring it (`:186-215`); weak path↔blob coverage relation. |
| `attestation/3` | `producer`, kind payload and `bindings` schemas are absent; kind/result combinations are unconstrained; hash preimage is circular/ambiguous. |
| `attestation-lineage-head/1` | Placeholder fields, no complete schema or rollback anchor. |
| `ledger-event/3` | Defined only as “As V2 ledger-event/2 plus” (`:270-280`), so legacy rejected authority is normative and no complete V2.1 schema exists. |
| `lease-authority-event/1` | Placeholder types/IDs, undefined conditions and hash preimage; referenced authority-head schema is absent. |
| `fetch-observation/1` | Directionally useful but needs full repository/ref identity, attempt/nonce and failure representation. |
| `integration-evidence/1` | Cannot represent an unobserved remote on fetch failure; omits repository/ref/base/refspec and precise ancestry relation. |
| `run-manifest/1` | Critically omits the integration data its recovery claim consumes. |
| gate record | Zone A is assigned authority to write it (`TRUST-ARCHITECTURE.md:366-389`), but no V2.1 schema exists. It must bind externally authenticated approver identity, decision, gate policy, task/manifest and applicable candidate/phase, nonce/sequence, revocation and seal purpose. |
| task/index authority | V2.1 dispatch/index authority is referenced by the architecture but lacks a complete V2.1-only closed schema and must never import the rejected V1/V2 index shape by compatibility fallback. |

### Task/version identity

The identity formula at `AUTHORITY-SCHEMAS.md:121-129` omits
`verification.invocationHash`, although that field exists at `:106-107`. It also
has no candidate constraints, repository identity, target ref, merge policy,
submodule/LFS policy, path/mode policy or publication constraint. Therefore an
authoritative field can already change while `taskVersionId` remains constant.

Closed schema v1 rejects unknown fields only if a complete validator exists; it
does not safely evolve identity. A future v2 schema could add an authoritative
field while retaining a manually enumerated identity preimage. Each schema
version must have a fail-closed registry entry binding schema hash, canonicalizer
version, identity-domain version and exact identity projection. Prefer hashing
the entire canonical `authorityPayload`, excluding only explicitly named
instance/audit/seal fields. An unknown schema, identity algorithm, canonicalizer,
field, duplicate key, number form, or conditional combination must reject before
any cast, comparison or hash.

### Cross-artifact consistency

Every artifact must carry or cryptographically reference the same
`taskVersionId`, `manifestHash`, `runId`, `candidateId`, `candidateCommit`,
`candidateTree`, schema/config policy set and relevant attempt/nonce. Validators
must recompute these values from authoritative bytes, not compare two
self-assertions. The current examples are inconsistent about `runId`,
`diffHash`, review evidence and integration target identity.

## 6. CANDIDATE_REVIEW

`candidateCommit + candidateTree` is an acceptable Git identity pair for the
candidate, and the rule that every post-freeze mutation creates a new candidate
and reruns all gates is correct (`TRUST-ARCHITECTURE.md:576-597`). Direct
`git ls-tree`/`git cat-file` access can make scan, reviewer and integration
consume the same immutable object bytes and closes the dirty-worktree TOCTOU.

It is not sufficient to promise that all consumers use a “materialization.”
The candidate schema calls the SHA-256 of `git archive candidateTree`
deterministic (`AUTHORITY-SCHEMAS.md:151-153`), but archive output can include
metadata and may honor `.gitattributes` transformations such as `export-ignore`
or `export-subst`; it is not automatically the complete unmodified blob set.
`git archive | tar -x` (`TRUST-ARCHITECTURE.md:588-590`) also recreates mode
`120000` as a live symlink. Review or verification tooling that follows it may
read token/output/host paths, even though the scanner safely examined only the
symlink target blob. For untrusted review input, either:

- serve bytes and metadata through a no-follow Git-object reader; or
- reject symlinks/submodules and materialize only regular files using
  descriptor-relative, handle-validated paths.

The candidate descriptor and policy must bind a complete ordered manifest of
`path, Git object id, SHA-256 content digest, type/mode, size` and reject:

- duplicate/case-fold/Unicode-normalization collisions;
- Windows reserved/trailing-dot-space paths and traversal;
- unsupported file modes and unexpected executable-bit changes;
- submodule mode `160000`, unless URL, commit and recursively verified content
  are independently bound and scanned;
- LFS pointers unless their real content is materialized, hashed and scanned;
- missing objects, replace/graft/alternates influence and filters;
- limits or omissions for binary, huge and generated content.

If archive remains an option, its format, ordering, ownership, timestamps,
attributes and extraction behavior must be completely normalized and bound.
Serving the ordered object manifest through `git cat-file` is the simpler trust
primitive.

Git commit/tree OIDs in the reviewed repository are 40-hex SHA-1 identities.
They are necessary for Git object selection, but authority should also bind the
SHA-256 object/content manifest rather than treating SHA-1 alone as the
long-term security digest.

## 7. REVIEWER_MODEL_REVIEW

A complete sealed review request must bind:

- `reviewAttemptId`, fresh nonce, `runId`, task authority/manifests;
- candidate descriptor, commit, tree and full path/blob/mode/size change set;
- exact spec and acceptance criteria bytes;
- check and secret-scan evidence, definitions and producer provenance;
- bound schemas, canonicalizer, config and review-policy/prompt hashes;
- pinned reviewer image, CLI, provider/model/effort and effective tool/network
  policy expected from the launcher;
- exact full-coverage policy, budgets and handling for deleted, huge, binary,
  generated, symlink, submodule and LFS entries;
- content-addressed diff bytes and its digest.

The current request (`AUTHORITY-SCHEMAS.md:166-190`) omits several of these.
The envelope drops the path↔blob relation into separate `reviewedBlobHashes` and
`filesReviewed` arrays, has no completeness/uniqueness constraint, and lacks the
`diffHash` its own prose says it carries (`:192-224`). Duplicate-content files,
mode-only changes, deletions, omitted large/binary files and partial coverage can
therefore be represented as a complete approval.

Replay protection also needs more than echoing a public nonce. Zone A must issue
the request, register the nonce/attempt atomically, launch the exact reviewer,
receive output through a direct bounded channel, validate it and consume the
nonce in the sealed lineage. If untrusted Maestro can read the request and
replace stdout, it can synthesize every echoed field plus `APPROVE`. Use either a
direct A↔C pipe that Maestro cannot mediate or an ephemeral response capability
delivered only to the reviewer instance by fixed launch policy. Bind the
launcher-observed container/image/process/config identity. The reviewer must
never self-authoritatively assert provider/model/provenance.

Zone A needs to produce and verify all review authority. Zone C produces only an
untrusted opinion envelope; structural validation, complete coverage, runtime
provenance, nonce consumption and final attestation are Zone A operations.

Attack outcomes required by the final design:

| Attack | Required outcome |
| --- | --- |
| Reuse old `APPROVE` | attempt/nonce already consumed → reject and quarantine replay evidence |
| Reviewer sees A, attests B | request/content/coverage hash mismatch → reject |
| Blob or candidate changes | new candidate and new request/nonce; all gates rerun |
| Duplicate output | one accepted response; subsequent responses reject |
| Fake provider/model claim | ignored; only launcher-observed provenance counts |
| Partial/huge/binary omission | `INCOMPLETE_REVIEW`, never `APPROVE` |

## 8. ATTESTATION_LINEAGE_REVIEW

Sequence plus `previousHash` is the correct basis for ordering. Walking the chain
from genesis and using the last entry of a kind prevents wall-clock “latest”
ambiguity and exposes reorder, gaps, duplicate sequences and broken links
(`AUTHORITY-SCHEMAS.md:226-269`). It must also reject duplicate attempt/result
semantics and enforce kind-specific result enums.

The current model is not deterministic at all crash points:

| Crash/attack | Current ambiguity | Required deterministic rule |
| --- | --- | --- |
| Event durable, head not replaced | valid extra tail versus head mismatch | WAL/transaction protocol says whether to finish head CAS or discard a demonstrably uncommitted tail |
| Head replaced, directory data not durable | head may name missing event after power loss | write/temp/fsync/atomic rename/directory fsync sequence and recovery proof |
| Positive then negative | prose says last-by-kind | make negative terminal/sticky where policy requires; never silently rehabilitate |
| Negative then positive | later positive may erase required remediation context | define allowed state transitions and predecessor evidence |
| Old valid prefix + old valid head restored | all seals still verify | monotonic non-rollback anchor, external transparency/checkpoint, or explicit fail-safe remote anchor |
| Zone D writes integration event, A owns head | no atomic handoff defined | single writer or sealed D evidence consumed into a new A event under one transaction protocol |
| Replay from another run/task/candidate | some nested bindings unspecified | explicit top-level task/run/candidate/request/attempt/nonce and domain separation |

A seal proves who authorized bytes; it does not prove the bytes are the newest.
Without a non-rollbackable/external checkpoint, an attacker able to restore
authority storage can truncate to a formerly valid head. If host-storage rollback
is intentionally out of scope, the threat model must state that explicitly and
the residual risk must not be described as cryptographic rollback prevention.

## 9. LEASE_RECOVERY_REVIEW

`H08_MINIMUM_ARCHITECTURE = NEEDS_CHANGES`.

The proposed minimum has the right components: an externally issued,
single-use, namespace/key/quarantine-hash/nonce-bound capability and
append-only sealed authority state. The latest sealed event, not a deletable
marker, correctly determines quarantine (`TRUST-ARCHITECTURE.md:681-716`;
`AUTHORITY-SCHEMAS.md:282-316`).

It is not yet safe:

1. `TRUST-ARCHITECTURE.md:694-698` requires proof that no residual record has a
   live owner before accepting recovery, but `:704-713` says append `recovered`
   first and scan/cleanup afterward. A crash in between authoritatively releases
   quarantine while the owner may still be alive.
2. Recovery is serialized under an `integration`/`ledger` lease, but normal
   acquire is forbidden while that same key is quarantined. This is circular or
   implies an undocumented bypass.
3. `pid`, host and start time do not defeat PID reuse, reboot, stale WSL/container
   identity, or a partitioned-but-live owner.
4. No fencing generation/token is required on every protected write. A former
   owner can resume after recovery and write with stale authority.
5. “sealed append + head CAS” is not a filesystem transaction; the event/head
   crash protocol and durability operations are unspecified.
6. `expiresAt` affects acceptance using a rollbackable wall clock, contrary to
   the no-time-authority rule.

Required protocol:

- use a separate recovery-mutex namespace that quarantine cannot block;
- bind capability to namespace, key, exact quarantine event/hash, owner
  generation, authority-head hash, issuer key/purpose, monotonic issuance
  sequence and single-use nonce; wall time may only add a fail-closed bound;
- identify the owner with OS handle/job/container ID plus host boot/session nonce;
- stop/fence the owner, prove it dead, re-read the same quarantine head, then
  atomically append `recovered`; never declare recovery before liveness proof;
- increment a fencing epoch and require it on every later lease-protected write;
- define two simultaneous recoveries, owner death during recovery, supervisor
  crash before/after each durability point, corrupt log/head and failed cleanup;
- quarantine on any ambiguity. Cleanup remains idempotent bookkeeping.

## 10. REMOTE_TRUTH_REVIEW

The state vocabulary and governing principle are sound:

```text
INTEGRATION_PREPARED -> PUSH_ATTEMPTED -> REMOTE_RECONCILING ->
  PUBLISHED | NOT_PUBLISHED_CONFIRMED | AMBIGUOUS_REMOTE
```

A connection drop, timeout, nonzero push result, successful result followed by a
crash, or ledger failure must always lead to a fresh authenticated remote
observation. Local belief never wins (`TRUST-ARCHITECTURE.md:724-779`).

The central reconstruction claim is false as specified. Recovery says it reads
`run-manifest.expectedMergeCommit` (`:766-771`), but `run-manifest/1` contains
only run/task/manifest/base/clone/principal/dispatch data
(`AUTHORITY-SCHEMAS.md:367-382`). It is sealed at dispatch, before a candidate or
merge exists. It has no candidate ID/commit/tree, expected merge, repository
identity, remote URL fingerprint, target ref, expected old ref, refspec,
integration attempt or nonce. If push succeeds and the process dies before
integration evidence/ledger persistence, remote plus that manifest cannot tell
which ref/commit the run attempted.

Before any push, D must durably seal/fsync an `integration-intent` containing:

- run/task/manifest/candidate identities and candidate tree;
- canonical repository identity and allowed remote/target ref;
- expected old remote OID (CAS/lease expectation);
- exact new commit/tree and refspec;
- integration/push attempt ID, nonce, policy and prerequisite lineage head;
- signer purpose and prior integration-intent/head hash.

Recovery starts only from that intent plus a fresh remote observation. A
`run-manifest-replay` may trigger reconciliation but is never a truth source;
`origin` is.

State semantics also need precision:

- if remote tip is the expected commit, or a permitted fast-forward descendant
  whose ancestry contains it, publication occurred; comparing the descendant's
  tip tree directly to the candidate tree would wrongly lose that fact;
- an unrelated remote advance is not automatically proof that this push never
  succeeded and was later rewritten;
- without enforced no-force/no-delete branch policy or an independent remote
  reflog/audit source, “briefly published then force-replaced” is irreducibly
  ambiguous;
- `integration-evidence/1` must represent fetch failure without inventing a
  40-hex observed commit/tree, and must bind repo/ref/base/refspec/fetch evidence
  and ancestry classification;
- retries from `AMBIGUOUS_REMOTE` are forbidden. `NOT_PUBLISHED_CONFIRMED` permits
  a new attempt only after proof under the sealed policy and remote CAS.

Therefore it is not always possible under the current schema to reconstruct
truth after crash from remote plus sealed immutable run authority. It can become
possible for the defined no-rewrite remote model after adding the pre-push
intent and branch-policy assumptions; otherwise the honest answer remains
`AMBIGUOUS_REMOTE`.

## 11. DOCKER_C06_REVIEW

```text
C06_ARCHITECTURE = SOUND_WITH_REQUIRED_WAVE0_PROOFS
```

Docker Desktop documents that Linux containers run in a special-purpose Linux VM
and cannot access host files beyond explicit shares; bind mounts retain their
host permissions ([Docker Windows permissions](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/)).
That is a technically plausible principal boundary for B/C. Docker also states
that WSL distributions share a kernel, the Windows host can read/write WSL files
through `\\wsl$`, and stricter deployments should consider Hyper-V or Enhanced
Container Isolation ([Docker WSL security](https://docs.docker.com/desktop/features/wsl/)).
ECI is not assumed to be available.

This classification keeps three concepts separate:

- a Git worktree is organizational isolation, not a security boundary;
- a correctly configured Linux container/VM can isolate the LLM principal from
  host secrets;
- Docker daemon authority can create privileged containers and host mounts and
  is therefore outside the LLM boundary and highly privileged.

The proposal must define the trusted fixed-spec launcher before Wave 0. Docker's
special host names reach the host, and Engine endpoints may exist as a Unix
socket, Windows named pipe or localhost TCP endpoint
([Docker Desktop FAQ](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/general/));
absence of only `/var/run/docker.sock` is insufficient.

Mandatory Wave 0 proofs, all on the target Windows 11 + Docker Desktop/WSL2
composition:

1. **Host/daemon baseline:** exact Windows, WSL, Docker Desktop/backend versions;
   Linux-container mode; WSL integrations/shared-drive inventory; ECI status;
   Docker TCP API disabled; threat-model exclusions recorded.
2. **Fixed launch:** pinned image digest and provenance; no candidate Dockerfile;
   structured API/template only; adversarial task/provider/Maestro values cannot
   change image, argv, mounts, environment, network, ports, user, devices or
   labels.
3. **Inspect before start:** use `docker create`, compare the complete inspected
   spec and resolved image digest against fixed policy, record the resulting
   container ID in authority, and only then `docker start`. Require
   `AutoRemove=true`, `restart=no`, non-root UID, `Privileged=false`,
   `CapDrop=ALL`, no cap add/devices/host PID/IPC/UTS, no-new-privileges,
   default/pinned seccomp, PID/CPU/memory limits, exact mounts, reviewer
   read-only root, only per-run tmpfs/scratch and no persistent volume.
4. **Host absence:** authority root, host home/profile, primary `.git`, seal,
   push credential and target repo are not mounted or reachable; this must hold
   under concurrent source-swap, traversal, symlink/hardlink/junction/reparse and
   Windows case/normalization attacks.
5. **Kernel-visible surfaces:** enumerate and attack `/proc`, other processes'
   environments, `/sys`, `/dev`, `/run`, `/mnt`, `/host_mnt`, `/mnt/wsl`, temp,
   shared memory and mounted pipes/sockets.
6. **Daemon denial:** no Unix socket, named pipe, `DOCKER_HOST`, TCP endpoint or
   sibling control; probes through localhost/gateway/host special names fail.
7. **Egress:** direct DNS, arbitrary IP/domain, host/private/link-local/metadata
   and redirect bypass fail; only the fixed provider broker path succeeds;
   provider output/error/log channels cannot disclose host or publication
   secrets because those secrets are absent.
8. **Environment/auth:** start from an explicit allowlist; no Git/SSH/askpass,
   cloud, proxy or host temp variables; no credential helper/agent; provider
   credential is dedicated, short-lived/revocable and brokered or otherwise
   accepted as compromised by that LLM zone. Publication auth never enters.
9. **Independent clone:** works without host `.git`, alternates, hardlinks,
   user/system Git config or credentialed URL; its remote cannot publish.
10. **Reviewer freshness:** two runs have different container/filesystem/profile
    identities; candidate is read-only; B workspace absent; effective CLI state
    proves no MCP, memory, plugins, hooks, user/project instructions, session or
    persistent cache; only one bounded output channel is writable.
    Both Claude Code and Codex must authenticate and complete a trivial
    structured run inside every applicable B/C boundary. Failure selects only a
    documented, separately approved and adversarially proven fallback—never host
    execution or relaxed mount/network policy.
11. **Exact candidate:** reviewer/verification/scan consume the same descriptor
    and object manifest; malicious symlink/submodule/config cannot redirect read
    or load code.
12. **Untrusted tester:** a candidate build/test script attempts authority, seal,
    push, Docker, host and target writes and fails; returned evidence binds the
    exact tree and is revalidated/sealed by A.
13. **Lifecycle/C-05:** timeout, cancel, provider failure/failover, supervisor
    crash, fork bomb and daemon interruption leave no writer; labeled orphan
    reconciliation works; uncertainty quarantines.
14. **Concurrent mount-source adversary:** a host fixture tries to swap mount
    sources, clone bundle, output and container identity during every check.
    Docker bind mounts are path-based, so pre-opening/final-handle validation
    alone does not pin what the daemon later mounts. The fixed launcher must use
    staging controlled by a distinct ACL-protected principal or a non-bind
    content transfer whose identity is reverified before start; otherwise the
    same-SID host attacker must be explicitly out of scope and the residual risk
    recorded. Path/CAS checks alone are not credited.

Kernel/container escape and compromise of the trusted Windows host/Docker
daemon remain explicit environmental assumptions. They do not make this design
automatically unsound against the stated B/C adversary, but a failed proof or an
uncontrolled daemon makes C-06 fail.

## 12. MAESTRO_REVIEW

The public project reviewed was `tinhtran24/maestro`, default branch `dev`, at
commit [`2c0e78075ee12938e0cf6308fde9dd1f1938722f`](https://github.com/tinhtran24/maestro/commit/2c0e78075ee12938e0cf6308fde9dd1f1938722f).
It was not installed or executed.

Maestro describes a long-running Go daemon, SQLite/CDC, Git worktrees,
tmux/conpty runtimes, agent/reviewer adapters, GitHub observation and an
Electron UI ([architecture](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/docs/architecture.md)).
Those are useful orchestration features, not authority controls.

| Capability | Classification | Security judgment |
| --- | --- | --- |
| worker lifecycle | `WRAP_MAESTRO` | Useful spawn/status/reaper hints; A's fixed launcher and containment own truth. |
| workspace management | `WRAP_MAESTRO` | Logical allocation only. Current Git worktrees share the repository/object store and do not support the C-06 boundary; project config can add symlinks/post-create behavior. V2.1 needs its own independent clone/materializer. |
| Claude adapter | `WRAP_MAESTRO` | Launch convenience only; current user config/auth behavior does not prove a clean container profile. |
| Codex adapter | `WRAP_MAESTRO` | Launch convenience only; current adapter uses bypass flags and aggregates user hooks, unacceptable as-is. |
| reviewer coordination | `WRAP_MAESTRO` | Advisory dispatch/status only; unsafe for authority as shipped. Current reviewer reuses mutable worker context and GitHub access; A must launch fresh C and own request/output authority. |
| provider failover | `CUSTOM_TRUST_CORE` | No adequate structured provider/transport-only authority was found. |
| persistent state | `USE_MAESTRO` | UX/convenience state only; SQLite/CDC is unsafe for authority and is not a sealed ledger. |
| crash resume | `WRAP_MAESTRO` | Session convenience only; authority recovery remains `CUSTOM_TRUST_CORE` because process/worktree recovery does not implement sealed deterministic replay. |
| human gates | `UNSAFE_FOR_AUTHORITY` | UI action is not an externally authenticated, spec/candidate-bound sealed gate. |
| parallelism | `USE_MAESTRO` | Useful parallel session lifecycle/visibility; not proof of an authoritative, bounded dependency scheduler. |
| observability | `USE_MAESTRO` | Advisory cockpit only; telemetry must be disabled and outputs never gate authority. |
| security isolation | `NOT_SUPPORTED` | Same-principal worktrees plus tmux/conpty are not C-06 and are unsafe if represented as authority isolation. |
| task authority | `UNSAFE_FOR_AUTHORITY` | No closed sealed task manifest. |
| attestations | `UNSAFE_FOR_AUTHORITY` | Ordinary reviewer/session rows are not nonce-bound sealed lineage. |
| ledger | `UNSAFE_FOR_AUTHORITY` | CDC/change log is product eventing, not authenticated security authority. |
| integration credentials | `UNSAFE_FOR_AUTHORITY` | GitHub token/helper/`gh` lookup and inherited daemon environment violate Zone D exclusivity. |

Representative source evidence:

- worktree/session architecture:
  [README](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/README.md#L23-L50);
- mutable worktree creation and project hooks:
  [workspace adapter](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/workspace/gitworktree/workspace.go#L68-L132)
  and [project symlink/post-create handling](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/session_manager/manager.go#L1831-L1914);
- Codex bypass and inherited-hook behavior:
  [launch adapter](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/agent/codex/codex.go#L321-L347)
  and [hooks adapter](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/agent/codex/hooks.go#L17-L28);
- reviewer reuses a session/worktree:
  [review launcher](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/review/launcher.go#L48-L65)
  and [prompt](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/review/prompt.go#L20-L55);
- inherited credentials:
  [environment and helper discovery](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/scm/github/auth.go#L44-L61),
  [credential-helper paths](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/scm/github/auth.go#L104-L140),
  [`gh` token lookup](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/scm/github/auth.go#L185-L257),
  and daemon-environment inheritance in
  [tmux](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/runtime/tmux/tmux.go#L55-L63) /
  [conpty](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/backend/internal/adapters/runtime/conpty/spawn_windows.go#L27-L49);
- telemetry/session recording behavior:
  [telemetry documentation](https://github.com/tinhtran24/maestro/blob/2c0e78075ee12938e0cf6308fde9dd1f1938722f/docs/telemetry.md#L1-L36).

`MAESTRO_TRUST_ROLE = UNTRUSTED_ORCHESTRATION_SUBSTRATE` is the only sensible
boundary, but the label needs enforceable consequences: Maestro runs under a
separate unprivileged principal/container with no ACL, mount, socket, broker or
capability path to A/D; holds no authority root/seal/push capability; cannot
select Docker mounts/argv/env/network; cannot mediate the authoritative reviewer
channel; and all of its outputs are hints revalidated from immutable evidence.
Pin and review the exact commit. Public documentation and implementation can
drift, so Wave 0 must test the code rather than grant trust to README/STATUS
claims.

If those restrictions remove most of Maestro's practical benefit, do not add it;
extra daemon, SQLite, Electron, worktree, GitHub and telemetry surfaces are a net
cost when the custom trust core and fixed container launcher remain mandatory.

## 13. BUILD_VS_ADOPT

```text
BUILD_VS_ADOPT_RECOMMENDATION = CONTINUE_CUSTOM
```

This is not a sunk-cost recommendation. No evaluated Maestro component supplies
task authority, seals, immutable candidate/review binding, H-08 recovery,
security ledger, publication truth or C-06. Wrapping it heavily would retain its
attack surface while duplicating the custom supervisor.

Continue the smallest custom trust core and fixed Docker launcher. Maestro may
be evaluated in a disposable spike only for lifecycle, adapter ergonomics,
parallelism and observability. Adopt an individual substrate capability only if
it reduces custom code after all outputs are treated as untrusted and it passes
Wave 0. Do not make the pilot a prerequisite for the trust core.

## 14. WAVE0_REVIEW

```text
READY_FOR_WAVE0 = NO
```

Wave 0 is appropriately intended to be disposable and to avoid all Orcivo
roadmap state, persistent DB, production, real task, real push credential and
real seal key (`TRUST-ARCHITECTURE.md:900-907`). Its present protocol cannot yet
prove the intended architecture because:

- the trusted launcher/container specification is undefined;
- reviewer network denial contradicts provider authentication/prompt execution;
- it proposes mounting the smallest credential file instead of defining a safe
  provider-auth boundary;
- it does not test the privileged `TESTER` flaw;
- it checks only the common Docker Unix socket, not named pipe/TCP/host/gateway
  paths;
- it does not cover malicious mounts/reparse points, `/proc`/environment,
  submodules/symlinks, C-05 container descendants or A/D SID separation;
- the reviewer-output origin and completeness channel are not tested.

Before Wave 0, change the design documents/schemas to resolve the Critical and
High items in §15 and turn the mandatory proof list in §11 into an explicit
adversarial protocol with expected evidence and failure criteria.

The revised Wave 0 must remain fully disposable:

- isolated temporary repos/directories/containers only;
- throwaway synthetic secrets/capabilities clearly labeled and destroyed;
- dedicated revocable provider auth with the minimum possible spend, only after
  the required owner approval;
- no real Orcivo task/spec/roadmap content or target repo write;
- Maestro checkout/spike outside Orcivo authority and state, telemetry off;
- no persistent/named volume, daemon state accepted as authority, or leftover
  profile/cache/session;
- written proof plus independent review before Wave 1.

Failure to demonstrate any mandatory property keeps C-06 unpassed and
`READY_TO_IMPLEMENT_V2_1 = NO`.

## 15. FINDINGS

Severity reflects the stated adversary: B/C and untrusted orchestration may be
fully compromised; trusted host/kernel/daemon compromise is outside scope unless
the design accidentally delegates them.

### CRITICAL

#### CR-01 — Candidate-controlled verification executes as seal authority

**Evidence:** `TRUST-ARCHITECTURE.md:349-375,581-590`.

**Exploit:** B commits a test/build hook that reads/calls host authority when the
trusted tester runs the verification profile.

**Impact:** forged task/review/ledger authority and possible publication access.

**Required change:** move every candidate executable into a separate untrusted
verification container with no seal/push/authority/Docker; A only validates and
seals bounded evidence.

#### CR-02 — Zone A and Zone D capabilities collapse under one host SID

**Evidence:** `TRUST-ARCHITECTURE.md:68-71,250-262,408-415`; the schema claims
neither principal holds the other's secret at `AUTHORITY-SCHEMAS.md:20-29`.

**Exploit:** compromise/injection in either same-user process invokes the other
user's CNG/Credential Manager capability.

**Impact:** a seal authority can publish or a push authority can forge task and
gate authority.

**Required change:** distinct OS/service identities or mutually exclusive,
caller-authenticated brokers; separate store entries are insufficient.

#### CR-03 — Post-push truth cannot be reconstructed from the sealed run manifest

**Evidence:** recovery consumes `expectedMergeCommit` at
`TRUST-ARCHITECTURE.md:766-771`; `run-manifest/1` omits it and all push intent at
`AUTHORITY-SCHEMAS.md:367-382`.

**Exploit:** push succeeds, D crashes before evidence/ledger append, disposable
clone disappears, and recovery cannot identify the attempted remote ref/commit.

**Impact:** unsafe retry, permanent ambiguity, or false publication state.

**Required change:** seal and durably commit a complete integration intent before
push; reconcile that intent only against fresh origin state.

#### CR-04 — H-08 can declare recovery while the original owner is alive

**Evidence:** liveness is required before acceptance at
`TRUST-ARCHITECTURE.md:694-698`, but `recovered` is appended before owner
scan/cleanup at `:704-713`; the proposed serialization can be blocked by the
quarantined lease itself (`:699-716`).

**Exploit:** crash immediately after the `recovered` append; a stale live owner
and a new owner can both write.

**Impact:** split-brain authority and corrupted ledger/integration state.

**Required change:** independent recovery mutex, kernel/container liveness proof
and fencing before the recovered CAS; every protected write verifies the new
epoch.

### HIGH

#### HI-01 — Authority schemas are incomplete examples, not enforceable closed schemas

`ledger-event/3` is inherited by prose from rejected V2; nested producer,
payload, bindings, IDs, paths, conditionals, bounds and head objects are missing.
The architecture also assigns authority to gate records without defining their
schema, and leaves V2.1 task/index authority incomplete. Independent
implementations can accept different bytes while claiming the same schema.
Publish complete machine-readable schemas and a fail-closed registry.

#### HI-02 — `taskVersionId` omits authoritative fields

`verification.invocationHash` is declared but absent from the identity formula
(`AUTHORITY-SCHEMAS.md:106-129`); candidate/repo/ref/merge policies are absent.
Hash the complete versioned authority payload and add all candidate constraints.

#### HI-03 — Seal validity is not separated by artifact purpose

The generic seal lets the artifact state principal/algorithm. Without an
external key-purpose registry and domain-separated preimage, an integrator key
can appear valid for a supervisor artifact.

#### HI-04 — Review authority omits inputs, path/blob/mode coverage and runtime policy

The request lacks verification/scan evidence and expected runtime provenance;
the envelope lacks the promised diff hash and can represent partial file
coverage. Bind a complete A-derived change manifest and request/envelope hashes.

#### HI-05 — Untrusted orchestration can substitute a structurally valid approval

All nonce/binding values are visible and the reviewer envelope has no
non-substitutable response channel. Maestro or another mediator can synthesize
`APPROVE`. A must own a direct pipe or ephemeral reviewer-only response
capability and bind observed process/image identity.

#### HI-06 — Reviewer/implementer network policy cannot run the selected cloud CLIs

`network=deny` conflicts with required authentication and inference. Define an
egress broker/allowlist that blocks direct DNS, IP, host, private and metadata
paths; prove it for pinned CLI versions.

#### HI-07 — Docker daemon/launcher authority and fixed-spec generation are absent

Every role says it lacks daemon control, yet containers must be created. Define
a minimal trusted launcher and prove task/provider/Maestro strings cannot affect
the spec.

#### HI-08 — Immutable bytes can become mutable/path-following materialization

`git archive | tar -x` can create live symlinks; submodules, path collisions,
file modes and filters are not closed. Use no-follow object serving or reject
unsupported entry types and bind a complete object manifest.

#### HI-09 — Secret-scanner encoding policy defeats its own UTF-16 guarantee

`TRUST-ARCHITECTURE.md:609-617` classifies NUL-containing blobs as binary before
running UTF-16 decoding; typical UTF-16 text therefore takes the raw-binary path
and may evade text patterns. Decode plausible UTF-8/16 independently of the
binary heuristic and add byte-encoded patterns. The corpus must explicitly cover
PEM, credentialed URLs and UTF-8/UTF-16LE/UTF-16BE both with and without BOM.
Archives are unspecified: use a sealed bounded recursive policy or reject
recognized archives. Every unknown, unreadable, huge, LFS or unsupported
encoding/path case must have an explicit sealed fail-closed result. Evidence
binds the exact candidate tree/object manifest, scanner-policy version and
pattern-library hash.

#### HI-10 — Lineage has rollback and event/head crash ambiguity

An old genuine chain prefix plus old genuine head still verifies. Separate event
and head writes lack a durable commit/recovery protocol, and D→A integration
lineage handoff is undefined. Add an anti-rollback anchor and exact WAL/fsync/CAS
state machine.

#### HI-11 — Remote evidence/state schema cannot express all required truth

It lacks repo/ref/base/refspec/ancestry identity and requires observed SHA fields
even when fetch fails. Descendant advance and force-rewrite histories are not
classified honestly. Add complete observation and branch-policy semantics.

#### HI-12 — Zone A/D execution environment can invoke untrusted Git/runtime behavior

Key lifetime/logging, inherited environment, fixed binary paths, Git
config/hooks/filters/helpers/protocols and temp policy are not closed. Treat all
candidate clones/config as hostile and launch deterministic operations from a
fully sanitized allowlist environment.

### MEDIUM

#### ME-01 — Provider credentials in LLM zones are treated too casually

Mounting a “smallest credential file” makes it readable to the compromised
principal unless tooling removes all read paths. Prefer a short-lived scoped
broker/session. At minimum classify the provider token as compromised by its
zone, make it dedicated/revocable/cost-bounded, and keep it independent from
publication.

#### ME-02 — C-05 process-tree containment is incomplete for daemon-owned containers

Job Objects contain host children, not necessarily Linux containers after the
client/supervisor dies. Add authoritative container lifecycle/recovery and prove
all stop/crash/failover cases. C-05 remains not passed.

#### ME-03 — Wall-clock and unauthenticated audit metadata can influence behavior

`sealedAt` is excluded from the sealed payload, while recovery `expiresAt`
controls acceptance. Sign consumed metadata and use sequence/epoch/nonce as
authority; wall time may only tighten rejection under a defined clock policy.

#### ME-04 — Production/test composition closure is stated but not supply-chain bound

`TRUST-ARCHITECTURE.md:1040-1051` correctly puts fake Git/fault injection at the
test composition root. Also require that production artifacts do not contain
fake providers/recovery bypasses, DI constructors are not task/environment
selectable, PATH cannot select a fake executable, and build/runtime hashes are
sealed. No ordinary environment variable may activate a test dependency.

#### ME-05 — Maestro adds material surface for limited benefit

Daemon, SQLite, Electron, GitHub auth, inherited environment, worktrees and
telemetry add maintenance/security burden while none replaces the trust core.
Adopt only independently proven substrate capabilities.

### LOW

#### LO-01 — Git SHA-1 object IDs are used as sole content identifiers in several bindings

Keep Git OIDs for object lookup, but bind SHA-256 content/object manifests in
authority to avoid making long-term trust depend solely on 40-hex SHA-1 IDs.

#### LO-02 — Namespace text inconsistently refers to V2 configuration

The V2.1 task schema binds `.orchestration/v2/config.v2.json`
(`AUTHORITY-SCHEMAS.md:109`). This conflicts with the new authority namespace and
could invite legacy fallback. Define a V2.1-only config/schema registry.

### OBSERVATION

#### OB-01 — Several proposed controls are structurally correct

No new finding was identified against these directions, provided the blockers
above are fixed: external keyed authority instead of self-hash; B/C without
seal/push/Docker; commit/tree freeze with Git-object scanning; sequence/hash
lineage instead of timestamp ordering; append-only quarantine state with a
single-use bound recovery capability; remote reconciliation and honest
`AMBIGUOUS_REMOTE`; production fault injection excluded; and V2.1 as a fresh
namespace.

#### OB-02 — Migration boundary is sound

`TRUST-ARCHITECTURE.md:861-882` correctly makes V1 a rejected reference, V2 a
rejected legacy spine and V2.1 a new `.orchestration/v2_1/` authority namespace.
No V1/V2 PASS, attestation, ledger, lease, gate, config or index may be promoted
or interpreted as V2.1 authority. Runtime dispatch must reject unknown/legacy
namespace and schema versions with no compatibility fallback.

## 16. REQUIRED_CHANGES

The following are design gates, ordered by dependency:

1. Split candidate-executing verification from Zone A; define an untrusted
   tester container and A-side evidence validation/sealing.
2. Enforce true A/D capability separation using different identities/brokers;
   specify key read/call lifetime, storage, logging and zeroization behavior.
3. Define the fixed-policy Docker launcher/daemon authority and sanitize all
   mount, path, argv, env, image, Git and network inputs.
4. Resolve cloud CLI networking/authentication with a provider-only broker or
   explicit enforceable egress policy; keep provider auth disposable and never
   conflate it with publication auth.
5. Publish complete machine-readable closed schemas for every artifact/head and
   nested payload, plus duplicate-key parser, canonicalizer/version registry,
   semantic conditions and bounds.
6. Derive task identity from the complete authoritative payload, including
   invocation and candidate/repository/ref/merge/schema/config constraints.
7. Add artifact-purpose-separated seals and an external key-purpose registry.
8. Expand candidate identity to an exact path/blob/SHA-256/mode/size manifest;
   define safe symlink, submodule, LFS, archive, binary, huge-file and
   cross-platform path policies.
9. Redesign review request/envelope/attestation to bind exact inputs, full
   coverage, evidence, runtime policy/provenance, diff and a non-substitutable
   response channel.
10. Define durable lineage/ledger/lease head transactions, crash recovery,
    cross-principal integration handoff and anti-rollback assumption/control.
11. Repair H-08 ordering, independent recovery serialization, liveness identity
    and fencing; remove wall-clock dependence as primary authority.
12. Add a sealed durable integration intent before push and precise remote
    observation/ancestry/no-force semantics.
13. Extend C-05 to daemon-owned container lifecycle and restart reconciliation.
14. Make production composition incapable of selecting fake Git, seal,
    recovery, fault or test dependencies through task/provider output, ordinary
    environment or PATH.
15. Rewrite Wave 0 proof protocol to cover §11, keep it disposable, and subject
    its evidence to a new independent review.

Until these changes are incorporated and independently re-reviewed:

```text
READY_FOR_WAVE0 = NO
READY_TO_IMPLEMENT_V2_1 = NO
```

Even a future architecture PASS would not imply `C-06 PASS`,
`SECURITY_SPINE_REVIEW PASS`, `READY_FOR_CANARY`, or authorization for a real
task.

## 17. HUMAN_APPROVAL_REQUIREMENTS

This report grants no operational authorization. Owner approval is required
before any of the following:

- administrator/UAC, OS, account, service, registry or machine configuration;
- Docker Desktop installation, backend/security/settings changes, daemon/API
  exposure changes, WSL integration, Hyper-V or Enhanced Container Isolation;
- any new dependency, image, binary, package or supply-chain intake;
- provider, Git, push or other credential provisioning, even throwaway paid/API
  authentication;
- seal-key/CNG/TPM provisioning, ACL changes or key destruction procedure;
- firewall, proxy, DNS, routing, VPN or network allow/deny rules;
- activating the dedicated Windows-account fallback;
- Maestro installation or pilot when installation/execution is required;
- production, persistent databases, named volumes, services, accounts,
  repositories, infrastructure or other persistent resources;
- any real Orcivo task, push, canary, P03, T12 or T13 execution.

Normal review-document commit and non-force push are delivery mechanics only;
they do not approve any item above.
