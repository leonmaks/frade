## 1. Project foundation and evidence baseline

- [x] 1.1 Inspect the installed X6 3.1.8 APIs and create a minimal documented spike for `boundary` attachment, Manhattan/rounded routing, and native `segments`; verify the spike in Chromium and record the A/B/C decision in design evidence.
- [x] 1.2 Initialize the Vite React TypeScript application, npm lockfile, Git ignore rules, scripts, and fixed runtime/test dependencies; verify `npm install`, typecheck, unit test command, and production build.
- [x] 1.3 Create the production graph factory, lifecycle-safe React editor shell, shared configuration, and disposal behavior; verify graph initialization/remount unit tests.
- [x] 1.4 Define versioned local document schema, parsing, serialization, download/upload adapters, and X6-to-document mapping; verify round-trip, malformed-input, and unsupported-version tests.

## 2. Baseline editing and test infrastructure

- [x] 2.1 Implement shape palette, canvas, selection, move, resize, deletion, viewport controls, grid, fit-to-content, and X6 History integration; verify editor unit and BDD lifecycle scenarios.
- [x] 2.2 Add executable Gherkin feature files, shared Vitest step runner, requirement-to-scenario mapping, deterministic fixtures, and a coverage guard; verify required scenarios execute without a second BDD framework.
- [x] 2.3 Implement local save/load and SVG/PNG export UI flows; verify persistence and export integration scenarios.

## 3. Connections, geometry, and floating attachment

- [x] 3.1 Implement floating/fixed terminal document types, rectangle contour resolver, normal calculation, deterministic side scoring/hysteresis, and fixed-port compatibility; verify ATTACH-001 through ATTACH-021 table-driven unit tests including metamorphic cases.
- [x] 3.2 Implement node-level connection creation, free-target preview, full-node highlight, cancellation, reconnect behavior, and floating commit semantics; verify connection BDD scenarios including no source-preview loop.
- [x] 3.3 Implement RouteSnapshot extraction, pure normalization, segment intersection helpers, and shared Manhattan validator; verify orthogonality, terminal direction, re-entry, loops, overlap, obstacle, NaN, and epsilon boundary tests.
- [x] 3.4 Integrate constrained Manhattan routing, rounded connector, terminal escapes, obstacle policy, deterministic fallback diagnostics, node-move/resize recalculation, and straight floating edge sliding; verify routing and attachment BDD scenarios.

## 4. Draw.io-style segment editing

- [x] 4.1 Implement the selected native-segments adapter or custom handle overlay based on the spike, centralized editing tokens, route extraction, eligibility rules, handle positions, visibility, hover feedback, and cursor behavior; verify SEG-001 through SEG-011 unit/BDD scenarios.
- [x] 4.2 Implement drag session state machine, graph-coordinate conversion, perpendicular projection, axis-only snapping, RAF coalescing, pointer capture, and live real-edge update; verify SEG-012 through SEG-021 plus RAF tests.
- [x] 4.3 Implement floating terminal-segment translation, straight-edge slide-to-detour behavior, protected fixed stubs, constraint propagation, candidate validation, and last-valid rollback; verify SEG-022 through SEG-038 and obstacle scenarios.
- [x] 4.4 Implement commit normalization, atomic X6 History batching, cancellation/disposal cleanup, canonical constraint persistence, and legacy manual-vertex compatibility; verify SEG-039 through SEG-052, repeated-edit, save/load, undo/redo, and leak tests.

## 5. Browser visual integration and documentation

- [x] 5.1 Add a test-only Vite visual harness reusing production graph code and typed `window.FRADE_VISUAL_TEST` API with bounded `waitForStable`; verify its operations in Chromium.
- [x] 5.2 Add deterministic Playwright fixtures and visual regressions for live segment drag, floating source/target drag, straight-edge slide, side transition, node move, resize, obstacle avoidance, and legacy vertices; verify geometry, attachments, SVG/style, and before/after-drop equivalence.
- [x] 5.3 Capture approved screenshot baselines and failure artifacts without updating baselines during ordinary test runs; verify the live-drag regression proves that no dashed substitute edge is rendered.
- [x] 5.4 Write README plus architecture, development, testing, routing, segment-editing, and document-format documentation; verify all documented commands and limitations match the working project.

## 6. Final verification

- [x] 6.1 Run the full unit, executable BDD, Playwright Chromium, typecheck, Vite build, deterministic-route, document-round-trip, and OpenSpec strict validation gates; record actual commands and results in evidence.
- [x] 6.2 Reconcile every completed task with requirement, BDD scenario, fixture, unit/integration test, Chromium evidence, and pass/fail status; verify no unsupported scenario is reported as passing.
