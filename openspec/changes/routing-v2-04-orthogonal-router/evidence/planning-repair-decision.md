# R04 ordinary-direction planning repair

CHANGE: routing-v2-04-orthogonal-router

REPAIR_TYPE: PLANNING_CONTRACT

PHASE: PLANNING

READY_FOR_PRE_IMPLEMENTATION_REVALIDATION: YES

READY_FOR_IMPLEMENTATION: NO

Current status is the B2 follow-up at the end of this file. Earlier sections
retain the original task 1.5 decision and its then-unimplemented task 1.6 handoff;
their historical machine FAIL is not the current installed-gate result.

## Authority and retained state

On 2026-09-28 the user confirmed the proposed return to PLANNING to define
ordinary construction with hard terminal directions. This author is revising
planning, not issuing independent approval. CURRENT was changed to PLANNING
before frozen planning files were edited. Original BASE_COMMIT and approved SHA
remain cf424e247490fdfae2c4efc9f7e7377b6d5b6e11. The old PRE report and schema-1
manifest remain unchanged, explicitly historical/superseded for revised wording.

The repair-entry snapshot and read-only checker confirm all 58 existing R04
product/test/dependency files byte-for-byte, plus their independent HEAD/INDEX
entry sets (two entries each). Earlier-layer/vendor/gate source diffs are empty.
No production, tests, dependency metadata, gate script, commit, archive or R05
work was performed in this planning turn. The original required regression stays
red; none of its assertions, accepted conditioning or geometry expectations changed.

## Revised construction decision

Raw table decoding/execution remains intact. A finite ordinary table plan receives
an explicit terminal geometry certificate. Compatible plans retain their exact
table strategy even if another route could be shorter. Finite incompatibility
selects ordinary ORIENTED_CHANNEL with protected stubs and a precisely bounded
alternating-axis template set. Fatal input/numeric/executor/perimeter errors and
failed eligible/final validation never switch strategy. No try/catch detour.

The new design distinguishes this ordinary adaptation from the unchanged strict
too-short d<J branch and its two perimeter traversals. There is no new fallback
reason/trigger, no R03 mask exception and no R05/legacy dependency. Every eligible
channel candidate is validated and ranked by exact cost/bends/cardinal sequence
and a stable channel-index key. Ordinary adapted terminal runs meet their positive
construction buffers; native-compatible table semantics are preserved.

The accepted mixed fixed/anchor counterexample receives exact route
[(338,-71166),(733,-71166),(733,-70958),(-15,-70958),(-15,-70862)], length 1447,
with source EAST and target NORTH. Normalization cannot invent these bends;
construction owns them. R02 owns provisional and final floating projection,
and final terminal resolution still uses one shared selected snapshot.

Updated proposal, delta, design, tasks, traceability, master section 23a/BDD-006a,
playbook and PRE prompt agree on this policy. Master BDD-006 and the strict
too-short trigger remain unchanged. Existing strict-parity fixture expectations
and input-domain predicates cannot be narrowed or relabelled; a previously strict
case selecting channels is a blocker. Runtime properties keep their quotas and
accepted input conditioning. Task 2.8 requires tests before production task 3.6.

## Executed planning checks

```powershell
node openspec/changes/routing-v2-04-orthogonal-router/evidence/ordinary-channel-planning-probe.mjs
node openspec/changes/routing-v2-04-orthogonal-router/evidence/check-planning-repair-entry.mjs
openspec validate routing-v2-04-orthogonal-router --strict
pnpm run routing:v2:arch-gate
git diff --check
git diff --stat
```

- Independent finite-template planning probe: PASS, 576 cases, 16 direction pairs,
  96 coincident cases, 8640 eligible candidates; largest attempted set 224 <=242.
  Includes near-equal stubs. The original case's unique fewest-bend minimum-length
  template agrees with the proposed exact route. Complete output is retained in
  ordinary-channel-planning-probe.json.
- Probe limitations: no R04 production calls, full runtime numeric/floating proof,
  property quota, mutation score or independent PRE claim. The symbolic completeness
  witnesses and future independent tests cover what this finite experiment cannot.
- Repair-entry checker: PASS, 58 WORKTREE files and both Git-layer sets unchanged.
- OpenSpec strict: PASS. Diff whitespace check: PASS (existing LF/CRLF notices only).
- Installed gate: FAIL, exit 1; 120 changed paths and 123 V2 source/test files
  inspected across HEAD/INDEX/WORKTREE. Its initial-PLANNING profile requires the
  R03 baseline, NOT_STARTED and no product/test/metadata delta. Our intentionally
  preserved R04 baseline, paused implementation and retained files fail those
  checks. The first attempt also exposed unsupported PRE enum SUPERSEDED; CURRENT
  was corrected to existing enum PENDING, with a separate historical-status field,
  before the full installed-gate result above. No gate code was weakened.

## Remaining process-control prerequisite and model handoff

Task 1.5 is complete; progress is 12/30 including historical completed tasks.
Task 1.6 is required before PRE. The full exact specification is
planning-repair-process-protocol.md. Implement only gate/process controls and
their regression fixtures in the gate script; production/tests/dependencies stay
frozen. Pin the immutable entry snapshot, independently verify every Git-layer
file set/content/mode, retain all discovery and earlier-layer checks, and test
stale approvals and cancellation attacks. Then run full self-tests and installed
gate. Do not start PRE while those controls are absent or failing.

The protocol explicitly separates cumulative product origin O (BASE_COMMIT stays
cf424e...) from a later renewed approval checkpoint P. Both original and revised
approval bindings/ancestry must be proven; P cannot hide committed/untracked work.
No commit or baseline change is performed now. Fresh independent PRE is task 1.7
after machine controls PASS, and the approved checkpoint is task 1.8 thereafter.

Following workflow-models.md, switch to Sol high for the bounded process-control
implementation/test step 1.6. Return to fresh read-only Astra xhigh for independent
PRE, and Astra high/xhigh for later R04 production repair. No new numbered change.

## B1 follow-up — 2026-09-28, Astra high planning repair

The fresh independent PRE report is preserved byte-for-byte in
pre-implementation-revalidation-fail-b1.md, SHA-256
5b1eb2b2e407cdf8f083aafadad240edbeed03d85e1efc0d8dc2e465e067aa50.
Its verdict is FAIL; machine-gate integrity passed. The saved reproduction in
b1-certificate-minimum-reproduction.json remains unchanged. User continuation on
Astra high authorizes this planning repair, not production/test edits or approval.

Root cause: SPEC_CONFLICT. The proposed certificate proved attachments, orthogonal
rays and selected masks but omitted the already-required jetty minima. A finite
table route could therefore be certified with source length 1 versus minimum 10.
Final validation alone cannot construct the valid route required for that accepted
input; the strategy decision must recognize the finite geometric incompatibility.

The proposal, design section 3a, delta, master section 23a and new BDD-006b,
playbook, tasks, traceability and PRE prompt now require:

- Both resolved minima checked after provisional R02 projection and endpoint-pinning
  canonicalization, with checked finite Manhattan length L > EPSILON and the
  existing L + EPSILON >= own minimum predicate. Source and target are independent.
- Finite deficits recorded by role, segment, actual length and expected minimum;
  they select ordinary ORIENTED_CHANNEL. Invalid numeric inputs/operations remain
  fatal. Strict d<J, masks, R02/R03 ownership and fallback policy are unchanged.
- Resolved zero/sub-EPSILON minima remain distinct from positive construction
  buffers. Certified native geometry is retained; adapted channels meet buffers.
- Final independent validation of BOTH minima on every branch. No validator catch,
  branch retry, final rejection substitute or input-domain narrowing.
- Task 2.8's regression-first B1, source-only/target-only/both deficits, asymmetric/
  auto, comparison boundaries, zero/sub-EPSILON, post-projection/canonicalization
  and numeric-error fixtures, all-branch property assertions and mutation controls.
  Task 2.8 remains unchecked. Existing fixtures, quotas and tolerances are unchanged.

B1 is already outside the existing strict-parity input predicates: its fixed
source lies off the selected EAST side and its target is an anchor. No fixture
is relabelled. Raw table [2114,2561] and [(0,0),(1,0),(1,30)] stay as failure evidence.
For js=jt=10, source bounds (0,0,100,100), P=(0,0), Q=(1,30), protected stubs are
A=(110,0), B=(1,20); frame is [-10,-10,120,110]. The eligible connector
[A,(110,20),B] gives full route [(0,0),(110,0),(110,20),(1,20),(1,30)], cost 249,
terminal runs 110 and 10. This is a checked planning feasibility witness; actual
selection must still enumerate and rank all eligible candidates.

### Fresh checks for this planning revision

- Read-only repair-entry checker: PASS, all 58 WORKTREE files and exact HEAD/INDEX
  sets (two entries each) unchanged. Snapshot SHA remains
  1a306ca7ec1df199e41351e750fd74942cf8c2c98aa1f00de899eb320d1e3a71.
- Existing independent template probe executed from an in-memory data module:
  PASS, 576 cases / 16 direction pairs / 96 coincident cases / 8640 eligible
  candidates / maximum 224 attempts. Added in-memory B1 witness assertions passed:
  22 eligible candidates, 224 attempts, witness present, both outward directions,
  terminal lengths 110/10, distance sqrt(901)>20 and minimum complete cost 249.
  The probe file and its historical JSON were not edited. No production calls,
  floating-domain proof, runtime quota or complete canonical tie proof is claimed.
- `node packages/draw/tests/routing-v2/orthogonal/reference/generate.mjs --check`:
  PASS, 77 ordinary cases (64 matrix), four input-classified adaptations.
- `node packages/draw/tests/routing-v2/orthogonal/reference/generate-instructions.mjs --check`:
  PASS, seven independent instruction controls. No fixtures regenerated.
- `openspec validate routing-v2-04-orthogonal-router --strict`: PASS.
- `pnpm run routing:v2:arch-gate`: PASS, 127 changed paths, 123 V2 source/test files,
  independent HEAD/INDEX/WORKTREE checks. This is machine evidence, not PRE approval.
- `git diff --check`: PASS. Status/diff inspected; pre-existing gate, dependency,
  production and test changes were retained without modification in this turn.
- Before/after SHA-256 inventory outside the ten edited planning/process documents:
  4745 files, identical aggregate
  b9b73fbc7951d597abaa9ad3a28f436cd4b0152865021944ed9ed0eb6fb00922.
  Aggregate input is JSON of sorted [path, raw-file-SHA256] pairs from Git's cached
  and non-ignored untracked file union, excluding only those ten documents.

No runtime/property/mutation suite or gate self-test was repeated: code, tests and
gate are unchanged. Task 1.6's 225 focused / 989 full passing self-test assertions
remain historical execution evidence in process-control-repair-validation.md.
No new PASS report, approval manifest, checkpoint, commit or archive was created.
Task count remains 13/30; task 1.7 requires fresh independent read-only Astra xhigh
PRE using the updated prompt. CURRENT stays PLANNING, paused, latest independent
PRE verdict FAIL; READY_FOR_PRE_IMPLEMENTATION means review readiness only.
BASE_COMMIT and cumulative origin remain cf424e247490fdfae2c4efc9f7e7377b6d5b6e11.

## B2 follow-up — user-approved parity-contract revision

After the next independent PRE accepted B1 but found B2, the user explicitly
confirmed the concrete two-part reference contract proposed in b2-parity-conflict.md.
This author applied that decision to planning only. The original broad parity
promise was unsound: selected fixed sides and d>js+jt do not prove that native
final corner removal preserves directions or terminal minima. B2 is a SPEC_CONFLICT,
not a new numerical tolerance issue or permission for an implementation patch loop.

The proposal, delta, design section 6, master section 23a/BDD-006c, R04 playbook,
tasks/traceability and PRE prompt now share the following explicit contract:

- Keep the exact existing comparison input predicate and property accepted domain.
  The historical name strictParityInput no longer means unconditional native validity.
- Independently check pinned native geometry before V2 executes and freeze that
  verdict. Expected context and checks import no R04 production certificate,
  validator, normalizer or router. Preserve raw/canonical native points and errors.
- NATIVE_CERTIFIED requires REFERENCE_PATTERN and full existing semantic parity.
  NATIVE_INVARIANT_DIVERGENCE requires a proven finite native geometric violation,
  retained defect evidence and valid V2 channels satisfying every hard invariant.
  Oracle/numeric/unknown errors abort. V2 output/exception never selects a class.
- Keep all 77 saved strict fixtures byte-for-byte and independently certified;
  none may be relabelled. Keep direct raw executor checks in both classes. All
  admitted inputs remain counted, with strict/divergence/failure results separate.
- Task 2.8 adds B2 and independent checker integrity/order/error/accounting controls
  before production repair. No new task was checked off; 13/30 remain complete.
  Existing reference README/harness wording is intentionally frozen until renewed
  PRE/checkpoint authorizes its R04-local test update. No predicate semantics,
  native expectations, generator quotas, seeds or tolerances may change.

The earlier B1 sections retain their historical no-reclassification promise;
the explicit user decision above supersedes only the unconditional domain-wide
parity claim. Existing strict fixtures and native-certified obligations are still
protected. BDD-006's strict fallback and BDD-006a/006b's hard constraints remain.

The B2 FAIL is preserved exactly, SHA-256
b3e3fbb75dc6ef1cb901b34001286abda425dff76bfd9633a3f368694903ca3c.
It is truncated after 24 of 31 fingerprint entries; all 24 matched before the
prior process update. No missing fingerprints or approval were fabricated. The
next independent review must provide a new complete fingerprint block. B1 and all
earlier approval/report bytes, repair-entry snapshot and fixture bundle are frozen.

### Fresh B2 planning diagnostics

Read-only Node execution imported unchanged generateBundle/strictParityInput and
evaluateReference/structuralNormalize. An in-memory independent geometry audit
checked all 77 replayed native fixtures for finite coordinates, canonicality,
positive orthogonality, fixed equality/rectangle perimeter membership, both input
singleton outward directions and independently resolved minima. All 77 passed.
This is a finite planning check, not the new permanent checker or its hostile tests.

For B2 the same audit retained domain admission and found exactly target direction
EAST versus NORTH and length 9 versus minimum 10. Observed, plain and native-order
oracle modes agreed on [(20,10),(30,10),(30,30),(21,30)]. Pattern and quadrant
matched [513,2308,2561,1090,514,2568,2308] / 2; sqrt(401)>20. Thus 78 native inputs
were accounted for: 77 unchanged valid fixtures and one proved finite divergence.
No V2 invocation, permanent classifier implementation or runtime suite is claimed.

The unchanged planning-template probe was evaluated from an in-memory data module:
576 cases / 16 direction pairs / 96 coincident cases / 8640 eligible candidates /
maximum 224 attempts passed. Supplemental B2 assertions confirmed 22 eligible
candidates in 224 attempts and the witness
[(20,10),(30,10),(30,20),(21,20),(21,30)], minimum complete cost 39 and terminal
runs 10/10. No production, floating-domain proof, property quota or full canonical
tie proof is claimed. The probe source and historical JSON remain unchanged.

Executed reference commands:

```powershell
node packages/draw/tests/routing-v2/orthogonal/reference/generate.mjs --check
node packages/draw/tests/routing-v2/orthogonal/reference/generate-instructions.mjs --check
node openspec/changes/routing-v2-04-orthogonal-router/evidence/check-planning-repair-entry.mjs
```

Results: reference replay PASS (77 ordinary / 64 matrix / four old adaptations),
instruction replay PASS (seven controls), immutable entry PASS (58 WORKTREE files,
two HEAD and two INDEX entries). Final process checks are recorded below.

### Final B2 process checks and boundary

- `openspec validate routing-v2-04-orthogonal-router --strict`: PASS.
- `pnpm run routing:v2:arch-gate`: PASS, 129 changed paths, 123 V2 source/test files;
  HEAD, INDEX and WORKTREE inspected independently. This is not independent PRE.
- `git diff --check`: PASS; status/diff inspected. Existing implementation/test,
  dependency and gate diffs predate this repair and were preserved.
- Before/after inventory outside the eleven edited planning/process documents:
  4746 files, identical SHA-256 aggregate
  1c7c490700d1051463a936b0d0bb9a2c55b73d67d52442f5e16129ac9574848d.
  Method is sorted [path, raw-file-SHA256] JSON from the Git cached/non-ignored
  untracked union, excluding only CURRENT, master, playbook, proposal, design,
  delta, tasks, traceability, PRE prompt, this decision history and b2-parity-conflict.md.
- Production, test/reference files, gate, dependencies, old reports, approval
  manifests and snapshot files were not edited. Runtime/property/mutation suites
  and full gate self-tests were not repeated; unchanged historical evidence remains
  identified as such, without claiming it implements the new contract.

READY_FOR_PRE_IMPLEMENTATION_REVALIDATION: YES. Task 1.7 remains open and needs
a fresh independent read-only Astra xhigh review with complete fingerprints.
CURRENT remains PLANNING with implementation paused, latest actual PRE FAIL,
archive/next false, original BASE_COMMIT and APPROVED_PLANNING_COMMIT unchanged.
No approval manifest, checkpoint, commit, archive or next change was created.
