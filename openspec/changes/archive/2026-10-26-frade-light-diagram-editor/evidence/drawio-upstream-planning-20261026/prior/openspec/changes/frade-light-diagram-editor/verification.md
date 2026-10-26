# Verification and evidence contract

## Applicability and evidence ownership

Guide v1.0 applies: FDS-001/002/003/004/005/006/007/008/009/010/015/017/018 and A11Y-001..010. FDS-009 and Guide 5.1 global-theme wording receive only the explicitly accepted editor-local exception through the approved companion/new deltas; all eight raw-protected files and checkout controls stay unchanged, and forced colors remains final. FDS-016 installer UI is not changed. Preserve any A11Y-006/010 pre-existing limitations honestly: verify existing keyboard/alternative paths, do not invent missing operations or claim full certification.

Affected screens: native Frade Diagram and embedded Draw.io; editor-owned actions/breadcrumbs/messages, palette/sidebar, properties, page tabs, flow manager/reference/reconnect surfaces, menus/submenus, tooltips, color/style panels and application-rendered dialogs. External editor-group tabs and global Settings/picker are negative isolation witnesses. Distinguish an actual unavailable control from a broken reachable control. Verify blank, populated, dirty, saving/error and readonly states where implemented; loading/offline/no-results not implemented by a surface are NOT_APPLICABLE with proof, not fabricated.

Root/AGENTS/general build/boundary/UI gates apply. Routing differential/domain semantic gates are not predecessors because no routing/domain implementation or contract changes are allowed. If actual semantic drift appears, STOP and split the responsible routing-owned repair; do not waive preservation checks. P02 is neither a dependency nor a delivery target.

## Scenario mapping and meaningful RED

`bdd/light-diagram-editor.feature` is the stage source; append its runner to the existing package test:bdd command. Each named BDD ID must map to actual test titles/fixtures in an implementation evidence table before PRE closure. New tests live in design section 6 paths. Assertions exercise user-observable state, computed paint and preservation; do not merely assert CSS text or mirror a helper return object.

| BDD ID | Requirement and witness | Required initial RED |
|---|---|---|
| LDE-001 | Both editor scopes stay Light across all application selections/OS changes | Current native/frame Dark or reference editor chrome remains dark |
| LDE-002 | Shared metrics and independent density | Measured comparable controls disagree or inherit reference metrics |
| LDE-003 | Editor-owned portal vs global picker, two-editor disposal | Current missing owner projection leaks app palette |
| LDE-004 | Neutral grid/page and semantic preservation | Current Light dots differ; no semantic assertion is weakened |
| LDE-005 | Palette/content fidelity, opaque/alpha/gradient/image/inherited values | New fixture exposes any UI color inheritance or backdrop mismatch; if baseline already passes, keep it as preservation coverage, not invented RED |
| LDE-006 | Forced-colors round trip, authored/settings bytes unchanged | Scope implementation must be exercised against system mapping, never bypass it |
| LDE-007 | Same revision, refused ACK, rollback, restart/parked/join | Original strict failures must remain failures; no raised timeout |
| LDE-008 | Keyboard/focus/readonly/text zoom/reflow | Real reachable editor interactions, no synthetic focus-only PASS |
| LDE-009 | Disclosure of unsupported common appearance | Unimplemented gradient/font capability cannot be reported supported |

## Proportionate runtime matrix

- Deterministic unit/BDD: both engines x Light/Dark/System/HC/reference x compact/comfortable x forced-colors off/on; test System against OS Light/Dark and input immutability for every branch.
- Actual Electron: both engines under each explicit application choice and both densities, forced colors off (20 contexts). Exercise the System OS Dark transition in each engine/density (4 additional contexts). These are container screenshots and computed-style records, not a screenshot for every individual control state.
- Actual forced colors: both engines x both densities with app Dark and reference (8 contexts), plus real System OS transition. Verify unchanged media-state evidence/system keyword precedence. Use unit/BDD to cover remaining identical deterministic policy branches; do not claim every combination was captured in Electron.
- In representative Dark/reference contexts, open every distinct reachable editor-owned popup/dialog/panel class in both engines; exercise each class keyboard/focus/selected/disabled/readonly state across both densities. Combine surfaces in one recorded flow; pairwise coverage may avoid redundant theme screenshots only where exact same light-profile/input hashes prove independence. Unknown coverage is NOT_RUN, not equivalent by assertion.
- Resize/text zoom 200 percent/applicable 320 CSS-pixel controls, coarse 44px targets, reduced motion and accessibility names for both engine scopes. Preserve the diagram's legitimate 2D canvas reflow exception only for content.
- Author fixtures: Draw.io explicit white/colored page, image background and supported gradients/images; shared native/Draw.io opaque/alpha fills and strokes, text/font and inherited default styles. Native schema currently lacks authored page/image/gradient fields; report these as unsupported native capabilities, not missing new integrations. Compare only matched common attributes/backdrops; record unavailable/unsupported cases and render/AA differences honestly. Export is an observation with exact content/semantic oracle, never normalization.
- Existing startup/parked-frame restore, dirty/save/undo/selection/iframe identity and hot-apply p95 <=150ms tests stay required. Use the original identified hardware/workload/pins; no timeout/tolerance change. Reuse the final existing performance run instead of creating a duplicate benchmark. If hardware/refresh prevents the required check, BLOCKED_ENVIRONMENT with actual measurements.

## Commands after implementation

Run from this feature worktree after exact declared dependency bootstrap using unchanged pnpm-lock.yaml. Planning does not install/build/run runtime tests.

1. `openspec validate frade-light-diagram-editor --strict`.
2. `pnpm --filter @frade/ui-workspace exec vitest run tests/ui-contract/light-diagram-editor.test.tsx tests/ui-contract/light-diagram-editor.bdd.test.tsx tests/ui-contract/participants.test.ts tests/ui-contract/overlays.test.tsx tests/ui-contract/service.test.ts tests/ui-contract/vscode-dark-2026.test.ts`.
3. `pnpm --filter @frade/desktop exec vitest run tests/unit/drawio-theme.test.ts tests/unit/light-diagram-editor.test.ts`.
4. `pnpm check`: required final root lint/typecheck/unit/BDD/boundaries/build/UI compliance once after production freezes. Add the new BDD file to package test:bdd; the root Node test wildcard already discovers the new compliance test. Do not edit package scripts unnecessarily.
5. `pnpm --filter @frade/desktop test:e2e -- tests/e2e/ui-contract-light-diagram-editor.spec.ts tests/e2e/ui-contract-theme.spec.ts tests/e2e/ui-contract-vscode-dark-2026.spec.ts tests/e2e/ui-contract-theme-performance.spec.ts`. Check the package-runner argument contract before launch; no silent accidental full-suite duplication.
6. Retained desktop general behavior regressions applicable to edited view/action integration; use `pnpm test:desktop` if the affected-test map cannot prove narrower complete coverage. Existing `pnpm --filter @frade/draw test:visual` remains required when DiagramEditor/style.css changes. Equivalent already executed final-input cases may be reused with exact source/control hashes and coverage accounting; no blanket omission of general integration.
7. UI token drift/contrast, upstream reference drift, literal/traceability and isolated positive/negative controls are already in `pnpm check`; preserve their actual separate exits and do not repeat them unless inputs changed. Record any historical unrelated strict-spec warnings separately; this change strict must PASS.
8. OpenSpec verification is a requirement/scenario assessment (`openspec-verify-change` workflow), not an invented `openspec verify` CLI. Follow automatic independent POST only after actual required checks/verify.

## Immutable evidence

Save timestamped command argv/cwd/source/control hashes/stdout/stderr/exit, RED and GREEN, media/font/viewport/scale/hardware, screenshots, computed-role/metric observations, before/after documents and review receipts under this change evidence directory. Hash new snapshots, preserve historical raw artifacts, do not silently regenerate accepted PNGs. Mark each check PASS/FAIL/BLOCKED/NOT_RUN with precise applicability; no aggregate PASS with a required missing check. UI compliance report is stage-specific; CI/branch protection stays NOT_VERIFIED unless actually inspected, and no branch-protection changes are in scope.
