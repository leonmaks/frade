# OpenSpec Verify: routing-v2-03-direction-resolver

VERIFICATION_STATUS: FAIL
CLASSIFICATION: TEST
READY_FOR_POST_GATE: NO
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE

This is formal OpenSpec verification on Sol high, not the independent POST
architecture review. Approved planning baseline remains
ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c.

## Summary scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 21/26 tasks after reopening 4.3; all 10 ADDED requirements have implementation mappings. Five tasks remain incomplete. |
| Correctness | Implementation matches reviewed product contracts; 9/10 requirements have complete required test evidence. All 26 scenarios mapped; the three scenarios under conditioned properties have incomplete evidence described below. |
| Coherence | Pure directory-local implementation follows design and repository patterns. Property generation does not fully respect the approved numerical test domain. |

No applicable verification check was skipped. Full suites were not rerun during
this review: the source/tests were unchanged since their latest executed checks.
Fresh verification audits are recorded below. No new independent approval is
claimed. Proposal, design, delta spec, frozen controls and earlier layers were
not modified.

## Required evidence gaps

### W1: generated fixed points exceed the approved domain

Spec `specs/routing-direction-resolver/spec.md:129` requires integer
origins/fixed points/deltas in [-100000,100000] and at least 5000 accepted cases
per core property. In
`packages/draw/tests/routing-v2/direction/property/core.property.test.ts:33`,
fixed points are bounds centers. An allowed origin plus half the extent can
exceed 100000. The `safe` predicate at line 64 checks fixed integrality and the
larger 1000000 edge/translation bound, but does not enforce the fixed-point
100000 bound.

The actual sample/safe functions and shared seededRandom/ integer functions
were extracted and transpiled read-only for a deterministic audit. The audit
uses a structural rectangle constructor for the finite generator inputs; no
production decision helper or property assertion was replaced. With seed
0xFAD003, raw=5000 / accepted=5000 / rejected=0, 28 accepted cases contain an
out-of-domain fixed coordinate. Only 4972 cases in that stream meet this
specified bound. First replay path: 94; source=(x=-64315,y=99906,width=1994,
height=1324), fixedSource=(-63318,100568). This is a generator/evidence defect,
not a reproduced DirectionResolver defect.

Full counterexample, counts and source-test SHA256 are retained in
`verification-property-domain-audit.json`. The six properties restart the same
seeded sample stream and the recorded property runs all reported zero rejected
cases. Their published quota therefore does not establish the required 5000
accepted cases in the approved domain.

Repair: constrain or reject out-of-domain fixed coordinates in the test-local
generator/predicate, without changing the spec, seed, EPSILON, extents,
assertions or production. Add direct generator-domain boundary evidence and
rerun all six properties until each has 5000 accepted cases within the specified
domain; account for rejected candidates separately.

### W2: reflected identical-bounds tie lacks a direct fixture

The scenario at spec line 141 explicitly requires direct tie/cancellation
evidence when identical bounds are reflected. `unit/preferences.test.ts:33`
checks NORTH/SOUTH and quadrant 2 for original identical bounds. The
cancellation fixture in `unit/relative.test.ts` covers the IEEE-754 example.
Neither directly checks reflected identical bounds. The generated reflection
properties exclude those ties through `safe` and their extra conditions.

Repair: add a direct deterministic fixture resolving both identical original
bounds and their horizontal/vertical reflected bounds. Pin the specified
NORTH/SOUTH tie result and quadrant 2, including the vertical reflection case
where universal cardinal-sign equivariance is deliberately not promised. Do
not expand the conditioned property domain to force an impossible symmetry.

Both warnings are required test-evidence gaps and block task 5.1 and the fresh
independent POST review under the Routing V2 workflow.

## Requirement implementation and scenario mapping

Paths below are relative to `packages/draw/src/routing/orthogonal/direction/`
for production and `packages/draw/tests/routing-v2/direction/` for tests.

| ADDED requirement | Implementation | Scenario evidence / result |
| --- | --- | --- |
| Space safe direction input and result | contracts.ts, resolve.ts:28, relative.ts:25 | Cardinal target semantics: unit/contracts.test.ts; mixed/widened spaces: types/space.type-test.ts through strict tsc. Covered. |
| Finite validated geometry without quantization | resolve.ts input copies, relative.ts finite calculations, preferences.ts:29 | Every numeric partition and derived overflow: unit/contracts.test.ts; degenerate bounds: contracts plus reference/direct fixtures. Covered. |
| Relative quadrant and separation evidence | relative.ts:25 | Four quadrants, axis/center ties and signed-gap EPSILON partitions: unit/relative.test.ts. Covered. |
| Complete constrained preference selection | preferences.ts:49, resolve.ts membership assertion | Singleton and filtered fixed side: unit/fixed.test.ts; all mask pairs: reference.test.ts and preferences.test.ts. Covered. |
| Fixed side evidence without relocating endpoints | preferences.ts:29, resolve.ts:8 | Cardinal/corner, interior and out-of-span fixtures: unit/fixed.test.ts; source, target and both; copied unchanged points. Covered. |
| Pinned preference branch order and explicit ties | preferences.ts:49 | Both axes, coincident bounds, horizontal/vertical arrangements: unit/preferences.test.ts; 900 independent pairs and reverse roles: unit/reference.test.ts. Covered. |
| Inspectable preference evidence and immutability | resolve.ts frozen copied graph, contracts readonly fields | Deep frozen input: unit/evidence.test.ts plus strict types; explanation ordering: preferences/fixed fixtures with complete ordered list. Covered. |
| Conditioned metamorphic and reproducible properties | property/core.property.test.ts and unchanged R02 harness | Safe translation/mirrors execute, but accepted-domain quota is invalid (W1). Direct cancellation/original tie exists; reflected tie fixture is missing (W2). Required evidence incomplete. |
| Direct exhaustive and reference verification | independent reference/generate.mjs plus V2 resolver | 900 per-case expected pairs and membership, 9 direct oracle cases; V2 fixed-side/span/EPSILON adaptations documented and tested in fixed/relative fixtures. Covered. |
| R03 isolation and frozen machine gate | inward imports and directory-local index; frozen installed gate | Planning product rejection, cancellation/dependency checks and frozen-approved-control checks covered by installed self-tests; installed gate audits all Git snapshots. Independent POST remains a later task. Covered for this verification stage. |

## Evidence integrity and command results

- Latest R03 unit/reference run: 8 files / 115 tests PASS, including 900
  individually asserted reference pairs and 9 direct reference cases.
- Latest six core property runs: each reported raw=5000 / accepted=5000 /
  rejected=0, seed 0xFAD003. Test assertions PASS, but W1 invalidates the stated
  domain quota; these results do not resolve this Verify failure.
- Latest isolated R03 compiler fixtures, full Draw typecheck and scoped lint:
  PASS. R01/R02 compiler and regression results remain recorded in historical
  implementation evidence; their trees are unchanged.
- Full mutation run: 85 candidates, 67 killed, 18 compiler-invalid, 0 survived,
  0 timeouts, denominator 67, score 100%. This remains valid mutation evidence;
  it does not prove property-generator compliance or missing scenario coverage.
- Fresh `verification-evidence-integrity.json`: saved mutation JSON equals the
  directly captured raw runner report; all per-mutant counts agree. The fixture
  vendor SHA256 equals the pinned source SHA256, with 900 matrix and 9 direct
  cases. No golden fixture was regenerated during Verify.
- No focused/skipped tests or forbidden ts-ignore/ts-nocheck directives were
  found. Negative strict-compiler assertions use ts-expect-error.
- Baseline-to-HEAD and staged path sets are empty; unstaged/untracked R03 source,
  tests and process evidence are included in scope checks. Inward production
  dependencies point to model, geometry, terminal and local direction files.
- Final VERIFICATION-phase process command outputs are retained in
  `verification-process-checks.txt`. Machine gate, strict validation and diff
  check may PASS while the semantic evidence warnings above remain blocking.

## Incomplete tasks — CRITICAL for archive readiness

Per openspec-verify-change, incomplete tracked tasks are CRITICAL for archive
readiness. These are checklist blockers, not five separate product defects.

1. **4.3**: reopened because the declared property-domain quota is not met; repair W1.
2. **5.1**: incomplete until W1/W2 are repaired and formal Verify reruns cleanly.
3. **5.2**: fresh independent POST PASS must follow clean Verify; do not run it yet.
4. **5.3**: implementation commit/checkpoint remains pending after required reviews.
5. **5.4**: archive, global strict validation and separate archive/CLOSED commits remain pending.

There are 2 required evidence warnings and 0 suggestions. No production
correctness defect was found in the checks that ran. Resolve the evidence gaps
before proceeding. Archive readiness: NO.

## Next checkpoint

Stop before editing the frozen production/test trees. Switch to Luna high for
an authorized test-only repair (generator domain and reflected-tie fixture),
then Sol high for re-verification. R03 production, R01/R02 dependencies, frozen
plans/control files and BASE_COMMIT remain unchanged. Only after clean Verify
may a fresh read-only Astra high task perform the independent POST gate.
