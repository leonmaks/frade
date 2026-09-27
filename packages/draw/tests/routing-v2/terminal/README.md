# Routing V2 R02 terminal/perimeter verification

The R02 suites are isolated from the package-wide jsdom setup and cover both approved R02 test
trees. Run them from the repository root:

```text
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/unit tests/routing-v2/perimeter/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/property tests/routing-v2/perimeter/property
pnpm --filter @frade/draw exec tsc --project tests/routing-v2/terminal/types/tsconfig.json --noEmit
```

The Vitest configuration uses the Node environment and discovers only `terminal/**/*.test.ts` and
`perimeter/**/*.test.ts`. The strict ES2022 compiler project deliberately excludes DOM libraries and
discovers `*.type-test.ts` fixtures in both trees. R01 package and test configurations remain
unchanged.

## Geometry and numerical evidence

Terminal/perimeter descriptors own semantic axis-aligned bounds. Edges, half-radii, centers,
normalized differences, and projected points are derived for each operation and are never persisted
as an additional source of truth. R02 accepts R01 zero-size rectangles as general values, but a
perimeter operation rejects either collapsed extent. A positive sub-`EPSILON` extent remains valid
when both edges, its half-radius, and its interior center are representable.

Numeric input and every required intermediate/result must be finite. Negative/collapsed extents,
overflowed edges/differences, collapsed represented centers, zero half-radii, and failed membership
postconditions reject with an operation and field name. Semantic tag/boolean errors use `TypeError`.
No invalid value falls back to a center or legacy algorithm, and no projection quantizes coordinates.

Generated properties use seed `0xFAD002`. Each declared core property executes at least 5000
accepted cases and reports its property name, seed, raw/accepted/rejected totals, replay path, and
concrete counterexample on failure. Generator exclusions are counted separately; they never replace
the deterministic invalid, degeneracy, epsilon-boundary, tie, or cancellation fixtures.

Rectangle `orthogonal=true` is only a geometric hint. Exterior points aligned with one exact bounds
band produce a perpendicular side projection. Points outside both bands fall back to the nearest
corner and no bend is invented; route-level perpendicularity depends on the future R03/R04 caller
supplying suitable adjacent geometry. R02 never selects a side or constructs route segments.

Ellipse projection uses normalized full-precision `Math.hypot` geometry. It deliberately does not
copy draw.io's `parseInt` direction truncation, quadratic coefficient path, or interior-point return.
Center ties choose EAST; inside non-center points extend to the analytical ellipse; orthogonal signs
are chosen relative to the center; outside both exact bands falls back to the radial formula.
