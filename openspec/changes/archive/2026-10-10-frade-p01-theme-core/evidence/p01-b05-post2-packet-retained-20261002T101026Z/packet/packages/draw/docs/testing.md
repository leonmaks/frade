# Testing

Unit tests cover pure geometry and document behavior. The Playwright suite uses the production graph and `window.FRADE_VISUAL_TEST`, and asserts the real SVG path separately from the logical route. The X6 spike is at `tests/spike/x6-segments.spec.ts`; production SVG smoke coverage is at `tests/spike/production-visual.spec.ts`.

Run `pnpm test:e2e` from the monorepo root to compare approved screenshots. It never writes baselines. Use `pnpm test:visual:update` only after reviewing route validation and SVG results; this is the explicit baseline-update operation.

The [floating segment matrix](segment-test-matrix.md) describes 160 browser scenarios
across reflections, axis swaps, both edge directions and aligned figures.
Run `pnpm --filter @frade/draw test:visual:matrix` for this matrix alone. Playwright retains failure
traces and screenshots; the original regression scenarios remain in the full suite.

Generated browser artifacts are written below `packages/draw/test-results/` and `packages/draw/playwright-report/`; both are ignored by Git. CI uploads them on failure. Approved images live under `packages/draw/tests/spike/production-visual.spec.ts-snapshots/` and `packages/draw/tests/visual-baselines/` and must change only through the explicit update command followed by review.
