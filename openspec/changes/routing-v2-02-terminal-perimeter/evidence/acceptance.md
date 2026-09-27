STATUS: CURRENT_VERIFICATION_EVIDENCE
BASE_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c

Rechecked against the actual approved delta, implementation, compiler fixtures and fresh rerun logs.

# R02 requirement/scenario evidence map

| Delta requirement | Executable evidence |
| --- | --- |
| Semantic terminal binding vocabulary | `terminal/unit/contracts.test.ts`: default floating; fixed/anchor identity; normalized endpoints; shared rectangle/ellipse bounds; empty identity, invalid fraction/boolean/kind/mismatched-bounds rejection; frozen inputs |
| Cardinal port constraint data | `terminal/unit/contracts.test.ts`: every one of 15 masks, ALL default, constraint-over-binding precedence, empty/malformed masks |
| Coordinate space preserving public boundaries | `terminal/types/contracts.type-test.ts`, `fixed.type-test.ts`, `floating.type-test.ts`; `perimeter/types/rectangle.type-test.ts`, `ellipse.type-test.ts`: model/view/screen positives, all mixed pairs, union widening, generic callers, readonly/result types, explicit R01 transform |
| Pure perimeter input and numerical validity | `perimeter/unit/validation.test.ts`, `rectangle.test.ts`, `ellipse.test.ts`, and `terminal/unit/floating.test.ts`: non-finite partitions, overflow/collapsed representation, exact tolerance membership, invalid hint/kind, 5.04 precision, finite postconditions |
| Rectangle radial perimeter | `perimeter/unit/rectangle.test.ts`: four cardinal approaches, four exact corner ties, arbitrary diagonal, inside/boundary, center and EPSILON threshold |
| Rectangle orthogonal geometric hint | `perimeter/unit/rectangle.test.ts`: horizontal/vertical exterior bands, outside-both corner, inside horizontal priority, exact inclusive bands, center precedence |
| Ellipse radial perimeter | `perimeter/unit/ellipse.test.ts`: four cardinal approaches, diagonal equation, inside/boundary, center, sub-unit parseInt regression |
| Ellipse orthogonal geometric hint | `perimeter/unit/ellipse.test.ts`: both horizontal signs, both vertical signs, radial fallback, inside sign, exact band endpoints, center precedence |
| Explicit degenerate perimeter rejection | `perimeter/unit/validation.test.ts`, `rectangle.test.ts`, `ellipse.test.ts`, `terminal/unit/fixed.test.ts`: each zero extent, both zero, negative, half-radius/center collapse, sub-EPSILON positive geometry, zero-size non-projected/anchor success |
| Fixed terminal resolution before routing | `terminal/unit/fixed.test.ts`, `terminal/property/fixed.property.test.ts`, `terminal/types/fixed.type-test.ts`: anchor, affine, projected rectangle/ellipse, floating-null, missing geometry, target independence, immutability |
| Floating adjacency and source target symmetry | `terminal/unit/floating.test.ts`, `terminal/property/floating.property.test.ts`, `terminal/types/floating.type-test.ts`: first/last adjacency, fixed/center reference snapshots, call-order independence, reversal, center coincidence, invalid contracts |
| Determinism immutability and semantic authority | `contracts.test.ts`, both shape property suites, `fixed.property.test.ts`, `floating.property.test.ts`: repeated unrelated calls, deep-frozen values, no framework/display inputs, fresh result values |
| Conditioned reproducible property evidence | `perimeter/support/generated.ts`, `generated-support.test.ts`, four property files: seed `0xFAD002`, 5000 accepted cases per declared property, raw/accepted/rejected reports, replay/counterexample format, safe-domain predicate, deterministic `0/1e-8 + 1e9` cancellation limitation |
| R02 ownership dependency and gate boundary | `terminal/unit/architecture.test.ts`; frozen `node scripts/routing-v2-architecture-gate.mjs --self-test`; installed `pnpm run routing:v2:arch-gate`; baseline status/diff evidence |

All deterministic invalid, epsilon, tie, degeneracy, and cancellation scenarios are independent unit
fixtures and are not replaced by filtered generated cases.

## Post-repair direct evidence

Ellipse radial cardinal exactness is now covered by four strict fractional-axis tests (EAST/WEST/NORTH/SOUTH) in ellipse.test.ts, all failing before the fix and passing after it.
Floating compiler fixtures now cover all 6 directed mixed-space intermediate pairs and all 6 opposite-reference pairs. Actual strict tsc passes; in-memory guard-erasure compiler mutations fail as expected for both arguments.
Prior failed findings remain in verification-before-cardinal-repair.md and the previous post-implementation-gate.md; they are historical pre-repair snapshots, not current approval.
