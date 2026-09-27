# R03 formal OpenSpec Verify after structured failure repair

CHANGE: routing-v2-03-direction-resolver
REVIEW_TYPE: OPEN_SPEC_VERIFY
VERIFICATION_STATUS: PASS
DATE: 2026-09-28 (Europe/Moscow)
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
READY_FOR_POST_GATE: YES
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

This Sol high formal Verify follows the completed structured failure/domain-origin
repair and full inventory. It supersedes openspec-timeout-diagnostic-reverification.md
for progression. Earlier formal reports and independent POST failures are historical;
this is not independent POST approval.

## Summary scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 10 ADDED requirements, 26 scenarios mapped; task 5.1 completed, 23/26 tasks complete. |
| Correctness | Current implementation, scenario coverage and required mutation evidence verified; no unresolved product/evidence blocker found. |
| Coherence | Approved type, numerical, preference, ownership, reference and isolation contracts preserved. |

Proposal, delta, design, tasks, current implementation and tests were inspected.
Schema is spec-driven, with all planning artifacts present. No product-check
dimension relies solely on checkbox marks. Historical execution evidence is
identified explicitly below.

## Requirement and scenario coverage

Production paths below refer to packages/draw/src/routing/orthogonal/direction/;
test paths refer to packages/draw/tests/routing-v2/direction/.

| Requirement | Current implementation and scenario evidence inspected |
| --- | --- |
| Space safe direction input and result | contracts.ts, resolve.ts:27, relative.ts:25; outward endpoint/no-route fixture and strict types/space.type-test.ts readonly, mixed/widened and output-space negative cases. Fresh strict tsc passed. |
| Finite validated geometry without quantization | Input copying/validation and finite arithmetic in relative.ts and preferences.ts; contracts.test.ts numeric partitions, overflow, zero/negative extents and no perimeter projection; relative.test.ts sub-grid values. |
| Relative quadrant and separation evidence | relative.ts inclusive EPSILON band, pinned quadrant branches, raw signed/policy gaps and R01 separation; relative.test.ts four quadrants, axis/coincident ties, epsilon partitions and negative overlap. |
| Complete constrained preference selection | preferences.ts complete filtering, FINAL singleton override, fixed locks and fallback; resolve.ts membership invariant. fixed/reference tests cover early-singleton counterexample and all 900 expected mask pairs with membership assertions. |
| Fixed side evidence without relocating endpoints | preferences.ts:29 finite edge differences, expanded spans and vertical corner priority; copied points in resolve.ts. fixed.test.ts cardinal/corner, interior/out-of-span/ellipse, both endpoints, epsilon/degenerate and unchanged-point cases. |
| Pinned preference branch order and explicit ties | preferences.ts:49 paired rows and source-H/target-V priority; preferences/fixed/reference tests cover both axes, one axis, overlap, identical/reflected identical bounds and direct role exchange. |
| Inspectable preference evidence and immutability | Readonly contracts and copied/frozen result graph; evidence.test.ts deep-frozen inputs, ownership, aliases, history independence, ordering and selection evidence. |
| Conditioned metamorphic and reproducible properties | core.property.test.ts input-based generation/preconditions, fixed/reflected-origin bounds, six seeded quota-enforced properties, translation/reflection assertions and direct tie/cancellation fixtures. |
| Direct exhaustive and reference verification | Independent pinned generator/fixtures; reference.test.ts 900 per-case expectations plus nine direct cases; explicit V2 EPSILON/constrained-fixed adaptation fixtures. Vendor hash freshly verified. |
| R03 isolation and frozen machine gate | Directory-local API, inward model/geometry/terminal dependencies, no route/jetty/R04 responsibility. Fresh gate checks approved fingerprints and HEAD/INDEX/WORKTREE scope/dependencies. PRE evidence and future POST/commit/archive remain separate checkpoints. |

All 26 scenarios have appropriate runtime, compiler, property, reference or
executable process-control evidence. Prospective filenames in design traceability
sometimes differ from consolidated actual test filenames; the required behaviors
are present. No planning wording was changed to accommodate implementation.

## Fresh mutation verification

Schema 2 retains typed errors for individual tests, suites and modules, completion
reason, global errors, stdout/stderr and standard Vitest JSON. Timeout detection
does not parse duration. Unknown failures abort. The one supported generic Error
is the original resolver membership guard, bound to the actual runner-supplied
isolated source root and FIRST evidence/resolve.ts frame. This is not a blanket
exemption for generic Error or infrastructure failures.

Fresh read-only probes invoked the installed Vitest makeTimeoutError for both Test
and Hook at Number.MIN_VALUE, 1e-7, 0.5, 5, 1e21 and Number.MAX_VALUE. With console
output removed and standard failureMessages replaced by STACK_TRACE_ERROR,
all 12 typed diagnostics were timeout. These exercise producer formatting; the
extreme durations were not awaited as live tests.

The fresh matrix also covered unknown runtime errors, worker/SSR errors, global
unhandled errors, unexpected status/signal, schema 1, missing JSON, interrupted
runs, suite-only failures, EPERM/EACCES with timeout, unknown structured errors
with timeout, absent/wrong/later-frame domain origin, valid assertion/domain
kills, passing baseline and spawn timeout. All 32 expected outcomes matched.
The repaired self-test's real Vitest test/hook/suite-hook timeout and domain
controls were inspected and their passing baseline evidence checked; they were
not rerun during this frozen Verify.

Retained complete run: mutation-results-2026-09-27T20-51-08-572Z-27144.json.
Fresh audit confirmed exact AST inventory matching (85 candidates: 20 cardinal,
44 comparison, 19 logical, 2 negation), all 86 baseline/candidate hash links,
67/67 executable reclassifications and diagnostics for all 18 invalid candidates.
Counts: 67 killed, 18 compiler-invalid, zero survivors/timeouts; denominator 67,
score 100%, exceeding the unchanged required 90%. Baseline: 116 passing tests.

The 72 membership-guard errors across child records were included in the typed
evidence audit. Removing/falsifying origin binding aborts; these are known
semantic guard exceptions, not silently accepted unknown runtime failures.
All 29 R01–R03 production hashes match the before-repair snapshot.
Vendor SHA: 8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d.
Actual fresh outputs: openspec-final-mutation-verification-audit.json.

## Fresh commands and retained execution evidence

Executed in this Verify:

- openspec status --change routing-v2-03-direction-resolver --json
- openspec instructions apply --change routing-v2-03-direction-resolver --json
- pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/direction/types/tsconfig.json
- pnpm --filter @frade/draw typecheck
- openspec validate routing-v2-03-direction-resolver --strict
- pnpm run routing:v2:arch-gate
- git diff --check
- git rev-parse HEAD
- Read-only Node classifier/inventory/hash/vendor/production audit and source/test scan.

Strict compiler fixture, full Draw typecheck, validation and diff-check passed.
Installed VERIFICATION gate passed: 678 changed paths, 77 V2 source/test files,
HEAD/INDEX/WORKTREE snapshots checked. Suppression/focus scan found no prohibited
directives or focused/skipped tests.

The completed repair's retained runtime evidence remains applicable: unit/reference
116 PASS; property 2 PASS, all six properties seed 0xFAD003, raw 5106 / accepted
5000 / rejected 106; scoped ESLint PASS; full mutation run exit 0. R01/R02
regression execution is historical and their dependencies remain unchanged under
the frozen gate. Full Vitest/property/mutation suites, gate self-tests and lint
were not rerun during this Verify; no fresh execution is claimed. Coverage/design
checks were performed through current source/test inspection and retained
executable evidence rather than skipped.

The 25-file R03 source/test snapshot before Verify is recorded in
openspec-final-mutation-verification-frozen.json and checked again after review.
Only process evidence, CURRENT_CHANGE and task 5.1 completion are updated.

## Issues by priority and final assessment

CRITICAL before archive: tasks 5.2 (fresh independent Astra high POST), 5.3
(authorized final implementation commit) and 5.4 (archive/global checks/closure).
These are sequential lifecycle checkpoints, not missing implementation or
required verification-evidence defects. Do not complete them now.

WARNING: NONE.
SUGGESTION: NONE.
UNRESOLVED_IMPLEMENTATION_OR_VERIFICATION_BLOCKERS: NONE.

R03 is ready for fresh independent POST. POST_IMPLEMENTATION_GATE remains FAIL
pending an actual new independent result. ARCHIVE_ALLOWED and NEXT_CHANGE_ALLOWED
remain false. BASE_COMMIT is unchanged. Do not commit, archive or start R04.

Post-recording checks: strict validation and standalone strict R03 compiler
fixture passed again; installed VERIFICATION gate passed again with 681 changed
paths, 77 V2 source/test files and HEAD/INDEX/WORKTREE inspected. NUL-safe git
status inspection found 681 paths, all within active R03 implementation/process
scope, with no unexpected paths. The full 25-file frozen source/test snapshot
matched the pre-Verify snapshot byte-for-byte by SHA-256. Diff check passed
after process-state/task updates. OpenSpec progress is 23/26, three sequential
lifecycle tasks remaining. No production or test file changed during Verify.
