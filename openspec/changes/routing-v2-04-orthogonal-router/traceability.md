# R04 requirement traceability

All requirements refer to specs/routing-orthogonal-router/spec.md. Task numbers
refer to tasks.md. BDD/TDD tasks precede the corresponding production tasks;
4.1-4.4 provide full verification, not substitutes for direct regression cases.

| Requirement | Direct fixtures / evidence | Test tasks | Implementation/control tasks |
|---|---|---|---|
| Model space automatic routing boundary | tsc space/readonly negatives; same vs distinct cell identity | 2.1, 2.2 | 3.1, 3.5 |
| Finite input and derived arithmetic | malformed values, subtraction/sum/expansion/cost overflow, lost positive runs | 2.2, 2.3 | 3.1, 3.3, 3.4, 3.5 |
| Fixed resolution and direction authority | masks, fixed bypass, all selected pairs, reversed target convention | 2.2, 2.3 | 3.4, 3.5 |
| Jetty resolution and evidence | precedence, auto/marker, zero/sub-EPSILON, asymmetric minima; resolved minima distinct from buffers in certificate and final validation | 2.3, 2.8 | 3.1, 3.2, 3.3, 3.4, 3.6 |
| Decoded reference pattern behavior | 64 direction/quadrant cases, direct flags/limits/no-ops/final approach | 2.4 | 3.3 |
| Ordinary direction preserving construction | original EAST/NORTH and B1/BDD-006b short-source counterexamples; certificate source-only/target-only/both deficits, auto/asymmetric minima, EPSILON boundaries, zero/sub-EPSILON versus buffers, positive/negative/fatal controls; <=5-segment templates, 16 pairs, equal stubs, ties and shared floating handoff | 2.8, 2.6 | 1.5, 3.6, 3.5 |
| Floating attachment after intermediates | shared snapshot, mixed endpoints, rectangle/ellipse membership | 2.2, 2.4 | 3.5 |
| Strict too short branch selection | Euclidean below/equal/above; one floating endpoint; overflow | 2.2, 2.3 | 3.1, 3.5 |
| Local exterior fallback topology | NORTH/NORTH example, 16 pairs, both candidates, equal-exit full circuit, ties | 2.3, 2.6 | 3.4 |
| Fallback constraints and jetty minima have no exceptions | exact endpoints, selected directions/masks, independent final minima, numeric rejection | 2.3, 2.6 | 3.2, 3.4 |
| Endpoint preserving canonicalization | true duplicates/collinear runs, pinned endpoints, direct idempotence | 2.5, 2.6 | 3.2 |
| Actionable invariant validation | malformed independent paths, IDs/indices, actual perimeters/direction; both resolved minima after projection/canonicalization for ordinary and fallback, INV-007/008 actual/expected evidence | 2.5, 2.6, 2.8 | 3.2, 3.5 |
| Reference parity and adaptation evidence remain separate | unchanged comparison predicate; all 77 strict fixtures independently certified and preserved; B2/BDD-006c native target direction+minimum failure and valid V2 channels; independent checker controls, frozen pre-V2 verdict, V2 failures cannot reclassify; oracle/numeric/unknown aborts, full accounting and raw executor checks in both classes | 2.4 (historical), 2.8 | 1.1, 1.7, 3.3, 3.4, 3.6, 4.1 |
| Reproducible core property coverage | each 10000 accepted, seed/replay/accounting, conditioned translation, external zoom; all-branch both-minima assertions with unchanged accepted input domain | 2.6, 2.8 | 4.1 |
| Trustworthy mutation and regression evidence | fatal precedence compositions, authentic timeouts, full AST inventory/children, R01-R03 regressions | 2.7 | 4.2, 4.3 |
| R04 scope and approval boundary | exact profile hostile controls, fingerprints, Git-layer snapshots, independent PRE/POST | 1.2 | 1.3, 1.4, 4.4, 5.1, 5.2, 5.3, 5.4 |

Master BDD-006 maps to the strict trigger, local exterior topology, unconditional
fallback constraints and reference-adaptation rows above. Master INV-007/008
remain mandatory on ordinary and fallback routes. No implementation or review
PASS is implied by this table.

Master section 23a and BDD-006a/006b cover ordinary terminal direction and minimum
protection. BDD-006b and its four certificate scenarios map directly to task 2.8,
then tasks 3.2/3.6/3.5; task 4.2 covers the added certificate mutation operators.
BDD-006's
strict too-short trigger is unchanged. Repair process controls and renewed
approval/checkpoint are mandatory tasks 1.6-1.8. Historical completed tasks do
not imply approval or coverage of this revision; the original red regression
must pass before complete evidence/Verify can resume.

BDD-006c and the five new reference-contract scenarios map to 2.8, then 3.3/3.6
and full evidence in 4.1. The user-approved B2 decision preserves the input domain
and every old strict fixture while replacing its unconditional domain-wide parity
promise. New finite native invariant failures stay counted as explicit divergence;
V2 mismatches never select that class. Task 1.7 must independently review this
revision before tests or implementation resume. All task checkboxes retain their
historical status; no new execution coverage is implied by planning.
