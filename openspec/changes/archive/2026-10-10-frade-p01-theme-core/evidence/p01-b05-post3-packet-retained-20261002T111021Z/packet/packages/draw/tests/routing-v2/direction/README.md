# R03 direction tests

Run from the repository root:

```powershell
pnpm --filter @frade/draw exec vitest list --filesOnly --config tests/routing-v2/direction/vitest.config.ts
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/property
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/direction/types/tsconfig.json
node packages/draw/tests/routing-v2/direction/reference/generate.mjs
node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test
node packages/draw/tests/routing-v2/direction/mutation/run.mjs
```

The reference generator checks the pinned vendor SHA256 and exact extraction markers,
then evaluates only quadrant, fixed-side and preference determination in an isolated
VM. It supplies independent mxGraph direction constants and reverse-port mapping,
no V2 code, no fixed points, and no jetty buffers. It produces all four non-axis
quadrants crossed with 15 non-empty masks per endpoint and checks expected membership.
Nine direct reference cases additionally cover axis separation, touching, overlap,
containment, asymmetric sizes, role exchange, and degenerate bounds.
Regeneration is deterministic; vendor source and expected outputs are never rewritten
from DirectionResolver results.

Intentional V2/reference differences need separate direct fixtures: model EPSILON
matching versus mxGraph's one-pixel fixed-side tolerance; V2's disallowed fixed-side
mask filtering and span rule; and EPSILON zero-banding for overlap. The 900-case golden
matrix is the shared no-fixed-point domain only.

The mutation runner first requires passing direction unit/reference tests. It mutates
one applicable TypeScript AST operator at a time in an isolated temporary copy, and
Vitest redirects only the DirectionResolver entry import into that copy. The complete
candidate inventory and per-mutant results are retained in its JSON output. A missing
implementation or failed baseline suite blocks mutation execution. No mutation task is
marked complete by the harness self-test alone.
