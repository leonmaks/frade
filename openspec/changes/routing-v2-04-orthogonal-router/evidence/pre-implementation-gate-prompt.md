# Independent R04 PRE revalidation prompt — second repair epoch

This is PRE_IMPLEMENTATION_REVALIDATION after the second process-control repair.
The first ordinary-direction repair and its schema-2 approval at da22452d are
historical. The current R04 production, tests and tooling are retained at the
separate runtime-invalid-repair-entry-proposed-2026-09-29.json snapshot (HEAD
4ff5c4d); they are frozen during this review. The current approval must use the
schema-3 protocol and new report/approval paths in gate-profile.md. Do not run
this review before the second-epoch self-tests and installed gate pass.

This renewed review follows B1 and B2 in their preserved FAIL reports.
Task 1.6 and its 225 focused / 989 full assertions are historical first-epoch
evidence, not evidence that the second-epoch controls executed.
Read both preserved FAILs, b1-certificate-minimum-reproduction.json,
b2-parity-conflict.md and the B1/B2 follow-ups in planning-repair-decision.md.
The user explicitly approved B2's two-part reference contract: keep the unchanged
input domain and all 77 strict fixtures, classify independently from native evidence
before V2, and require either strict parity or explicit finite native divergence
with valid V2 channels. This decision changes the former blanket parity promise;
it is not a reviewer PASS. The supplied B2 report is truncated inside its fingerprint
JSON (24 of 31 entries); preserve it exactly and do not fill missing reviewed hashes.
This new review must provide a complete fresh fingerprint block. Old results do not approve the
revised contract. Preserve the FAIL unchanged and bind any new approval to fresh
fingerprints; do not reuse its fingerprint set.

Use a fresh read-only context with Astra xhigh. Review change
routing-v2-04-orthogonal-router; do not modify repository files. If the exact R04
gate profile, passing executable controls or approval-binding format is absent,
report FAIL rather than interpreting a generic machine PASS as readiness.

Read root/scoped AGENTS, CURRENT_CHANGE, master, playbook, legacy boundary,
workflow-models, this change's proposal/spec/design/tasks/traceability, fallback
decision, evidence/gate-profile.md, original reference probe and saved planning evidence. Compare all
initial planning provenance to R03 closure 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4
and the repair diff to cf424e247490fdfae2c4efc9f7e7377b6d5b6e11. Verify complete
per-layer retained-file equality and the original baseline, not just net Git diff.
Do not approve current product correctness in this planning review. The retained
implementation and test bytes are entry evidence, not permission to resume work.

Verify specifically:

- The certificate measures BOTH resolved minima after provisional R02 projection
  and endpoint-pinning canonicalization, using checked L > EPSILON and
  L + EPSILON >= the role's resolved minimum. Distinguish resolved zero/sub-EPSILON
  minima from positive construction buffers. Finite deficits must be explicit
  incompatibility, selecting ordinary channels; numeric errors still abort.
  Reproduce B1: fixed source (0,0), bounds (0,0,100,100), perimeter=false, EAST-only,
  target anchor (1,30), all directions, jetty 10/10. Native [2114,2561] gives
  [(0,0),(1,0),(1,30)], source run 1 < 10 with distance sqrt(901)>20. Require valid
  channel construction, not final rejection or too-short fallback. Audit the
  feasibility witness and planned source/target/both, EPSILON, auto/asymmetric,
  zero/sub-EPSILON and post-projection regression controls. Final independent
  validation must check both resolved minima on all three strategies. Confirm
  unchanged strict-parity fixtures/predicates and property generators/quotas;
  do not demand that frozen pre-repair production already implement this plan.

- Independently assess the ordinary terminal certificate and <=5-segment oriented
  channel design: precise finite incompatibility versus fatal errors, all 16 pairs,
  coincident/near-equal stubs, completeness witnesses, <=242 attempts, eligibility
  before validation, no invalid-candidate disposal, exact deterministic costs/ties,
  R02 perimeter authority/shared final snapshot, representability and jetty buffers.
- Original EAST/NORTH regression remains accepted and unchanged. Reproduce the
  independent native executor diagnostic and inspect the planning-only channel
  probe. Neither a passing probe nor a caught exception proves product correctness.
  Hard constraints stay mandatory; strict d<J fallback remains iff and separate.
- Audit the explicit B2 parity decision against design section 6. The old
  strictParityInput function remains the unchanged comparison input selector;
  it no longer guarantees native validity. Reproduce B2 inside that domain:
  rectangles (0,0,20,20)/(11,30,20,20), fixed (20,10)/(21,30), EAST/NORTH, minima
  10/10; native [(20,10),(30,10),(30,30),(21,30)] violates target NORTH and minimum
  10. Verify ordinary channel feasibility with distance sqrt(401)>20. Do not
  resolve B2 by narrowing the predicate, dropping the input or changing native data.
- Require the planned reference checker to derive its expectations independently
  of R04 production and freeze its verdict BEFORE V2 runs. Inspect every native
  attachment/orthogonality/direction/minimum check, both roles, numeric/error aborts,
  instrumentation consistency, ordering/immutable-verdict controls and accounting.
  Certified-native cases require REFERENCE_PATTERN/full parity; proven finite
  native failures require valid channels and preserved native violation evidence.
  Wrong V2 output/strategy/certificate or exceptions must fail in either class,
  never cause recategorization. Direct raw executor comparisons remain mandatory.
- All 77 saved strict fixtures must remain byte-identical, independently certified
  strict obligations; any failure stops investigation, never relabels a fixture.
  Keep every admitted comparison input, separate strict/divergence/failure counts,
  and unchanged property conditioning/quotas. Review counterexamples beyond B2.
  Frozen reference README/harness still describe the old contract; task 2.8 must
  update them only after renewed PRE/checkpoint. Their immutability during planning
  is intentional, not a claim that the new checker already exists.
- Inspect repair isolation and approval controls from planning-repair-process-protocol.md:
  immutable entry hash and exact HEAD/INDEX/WORKTREE sets, hidden cancellations,
  ignored additions, historical-approval rejection, new fingerprint binding and
  cumulative origin O distinct from revised control checkpoint P. No generic
  exemption for files already in the workspace is acceptable.
- Inspect the second-epoch immutable fixture bundle, its raw hash and all 66
  retained product/test/tooling bytes. Execute or inspect the common `--self-test`
  as well as the focused runtime mode. The common mode must actually call the
  second-epoch regressions. Run the isolated fixtures after a synthetic approved
  checkpoint to prove they do not depend on the live HEAD or WORKTREE. Verify
  staged/worktree cancellation for both the entry manifest and fixture bundle.
- Verify original schema-1 and first-repair schema-2 approvals at their historical
  commits. The new schema-3 approval must bind this entry, previous checkpoint,
  full current fingerprint, exact report hash and separate control-only checkpoint.

- Hard source/target constraints have no fallback exception. R02 fixed/mask
  ownership and R03 direction authority remain unchanged.
- Master section 25, BDD-006 and R04 artifacts agree on strict Euclidean trigger,
  equality behavior, exterior bounds/clearance, both candidate validation, full
  circuit for equal exits, canonical cost/tie ranking and numeric failures.
- Fixed points remain exact, terminal directions are nonzero and each final
  jetty meets its own minimum. Cover all 16 direction pairs, coincident exits,
  asymmetric/auto/zero minima and representability limits.
- Reference's direct NORTH/NORTH counterexample remains unchanged and separate
  from the proposed adapted route. Ordinary comparison admission is input-defined;
  its strict/divergence obligation is independently fixed from native evidence
  before V2. Tests retain >=64 topology fixtures and all 77 saved strict cases;
  no failed result is filtered or relabelled based on V2 behavior.
- Ordinary flags/limit decoding, final approach, shared floating snapshot,
  endpoint-aware normalization and diagnostic validation are precise and do not
  quietly compensate for earlier-layer errors.
- All delta requirements/scenarios map to meaningful tests before production.
  Core/fallback properties each require 10000 accepted at 0xFAD004; translation
  has conditioning and no output-based rejection.
- Mutation score >=90% uses complete inventory, compiler diagnostics and auditable
  child results. Unknown/infrastructure evidence outranks every outcome, including
  timeout text and spawn ETIMEDOUT. R03 runner/tests remain read-only.
- Production is restricted to router/normalization/validation, tests to R04
  orthogonal root; R01-R03, legacy/vendor, exports and R05+ remain read-only.
  Only the declared direct fast-check devDependency/Draw lock importer exception
  exists; no R05, legacy or framework routing dependency is introduced.
- Inspect and execute exact gate self-tests where writable temporary fixtures
  are permitted; otherwise distinguish retained from executed evidence. Verify
  four independently unioned NUL-safe path sources, cancellation,
  deletion/recreation, rename old+new, copy destination, unusual filenames,
  positive controls, independent Git layers, mode/symlink safety, exact metadata
  checks and frozen-approval fingerprint binding. Machine PASS alone is insufficient.
- Validate dependency direction and fingerprint inputs: contract wording,
  fallback decision, this prompt, master/playbook, gate, workflow, AGENTS and
  scopes. Normalized checkboxes/process-state must not conceal contract changes.
  Record the concrete fingerprint set required by the exact profile for checkpoint.
  Run `node scripts/routing-v2-architecture-gate.mjs --review-fingerprint` and
  embed its exact canonical JSON once between REVIEWED_ARTIFACTS_JSON_BEGIN and
  REVIEWED_ARTIFACTS_JSON_END lines in the report. Follow gate-profile.md for the
  saved report/manifest protocol. Do not merely copy an earlier fingerprint list.

Use the second-epoch schema-3 paths in gate-profile.md:
`evidence/pre-implementation-runtime-revalidation-pass.md` and
`evidence/pre-implementation-runtime-revalidation-review.json`. Keep the
schema-1 and schema-2 historical reports/manifests byte-for-byte. The calling
workflow records a real independent PASS; the reviewer must not fabricate one.

Run strict OpenSpec validation and read-only diff/status checks; distinguish
fresh execution from inspected evidence and future planned tests. No implementation,
commit, archive or R05 work is part of this review.

Return CHANGE, GATE_TYPE: PRE_IMPLEMENTATION_REVALIDATION, exactly one GATE_STATUS: PASS|FAIL,
BLOCKERS with file/line evidence, SPEC_ALIGNMENT, SCOPE_ALIGNMENT,
ARCHITECTURE_ALIGNMENT, TEST_COVERAGE_ALIGNMENT, NUMERICAL_CONTRACT_ALIGNMENT,
REFERENCE_PARITY_PLAN, MACHINE_GATE_INTEGRITY, MACHINE_ARCHITECTURE_GATE, LEGACY_ISOLATION,
R04_R05_BOUNDARY and READY_FOR_IMPLEMENTATION: YES|NO. On PASS use BLOCKERS: NONE
and MACHINE_GATE_INTEGRITY: PASS and MACHINE_ARCHITECTURE_GATE: PASS as single
unambiguous field lines. Every correctness or
architecture blocker means FAIL. Save the independent report through the calling
workflow after review; the reviewer must not mutate the repository to certify it.
