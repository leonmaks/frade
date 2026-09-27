# Routing V2 R01 geometry verification

The R01 suites are intentionally isolated from the package-wide jsdom setup. Run them from the
repository root:

```text
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/property
pnpm --filter @frade/draw exec tsc --project tests/routing-v2/geometry/types/tsconfig.json --noEmit
pnpm --filter @frade/draw exec tsc --noEmit
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
```

Generated properties use seed `0xFAD001`, execute at least 5000 accepted cases per core property,
and print executed/accepted/rejected counts. A failure includes `seed`, `path`, and the concrete
`counterexample`; replay the named property with that seed and path, then retain the counterexample
as a deterministic fixture before changing production code.

`routing/model` owns the canonical V2 `Point`, `Vector`, `Rect`, `Segment`, coordinate-space types,
`Direction`, and `Orientation`. Their fields are readonly. Tests construct these values directly;
legacy routing/document types and package-root exports are intentionally outside R01.

Structural normalization and scalar quantization are separate APIs. `normalizePointSequence` only
removes redundant points and preserves every surviving coordinate exactly. `quantizeCoordinate`
is explicit and uses the `0.1` grid with half ties away from zero.

View transforms have three separate concerns: a transform can be structurally valid, an individual
operation can produce finite output, and a particular point/transform pair can be EPSILON-conditioned.
Only conditioned pairs carry the strict model/view/model round-trip guarantee. Ill-conditioned pairs
remain valid for finite one-way affine execution.

Translation accepts geometry and displacement in the same coordinate space and preserves that
space in the result. Delta uses `Vector<NoInfer<Space>>` so the geometry determines the space;
the displacement cannot widen it through generic inference. Explicit transform APIs perform space
conversion. The compiler regression in `types/translation.type-test.ts` checks valid model/view/screen
translations, every mixed-space pair, generic callers, result-space preservation, and explicit
transform source/result types. Its negative cases use `@ts-expect-error`: an unexpectedly accepted
call causes TS2578. Both the isolated command above and the package tsc include this file;
Vitest transpilation alone does not establish this contract.

Spatial phantom brands are invariant (the space appears in both parameter and return positions
of a phantom function), with no added runtime fields. A ModelSpace value cannot be silently aliased
as a ModelSpace/ViewSpace union. The compiler fixture `types/same-space.type-test.ts` checks
approximate point equality, Manhattan distance, segment construction, all rectangle relation APIs,
and normalization sequences for mixed-space inputs and generic/alias widening. Same-space generic
callers in model/view/screen space remain valid. Untyped invalid-data fixtures explicitly declare
their intended space so their runtime rejection assertions remain meaningful.
