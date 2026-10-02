# Proposal — P01 Theme Core

## Why

Frade currently renders a fixed Dark palette. Introduce a single hot theme service that ships Light and Dark together with HC/System and preserves the user's architectural workshop, dirty work and semantic diagram paint.

## What Changes

- Pure complete resolver, reserved offline builtin registry and immutable snapshots over unchanged foundation tokens v1.0.0 / guide v1.0.
- Transactional preview/commit/cancel with client-area paint barrier, participant acknowledgements, host-owned durable intent/CAS queue and bounded recovery.
- Separate validated presentation settings/IPC and prepaint bootstrap, without changing the health API or repository settings.
- Distinct presentation Settings, keyboard theme picker, contextual shortcuts, Workbench-owned overlay host and exact scoped current consumer color/density adoption.
- Explicit temporary geometry/native-chrome/feature-overlay exceptions accepted below; actual screenshot baselines still require human approval.

## Capabilities

### New Capabilities

- `theme-core`: offline runtime themes, deterministic resolution, atomic live preview, independent density, durable presentation settings, preserved domain state and measurable current-runtime coverage.

### Modified Capabilities

None. P01 operates within the foundation's accepted visual successor and exact human-approved temporary exceptions; it does not rewrite the pilot archive or foundation specifications.

## Impact

Accepted color closure: [P01-B02-COLOR-CLOSURE-01](decisions/p01-b02-color-closure-accepted-20260930T185351Z.json), draft SHA256 cd12aef78aa19f38028c357d3622d34768d83d9c52f8f530f1dea283fa95d802. This acceptance adds only the exact color properties/states in the design matrix; it does not waive contrast/runtime evidence or approve screenshots. The added consumers are metadata preview, flow-manager/table hover/focus/warnings, bundle hint and existing reconnect menu/alertdialog; their feature source, geometry, placement, handlers and semantic data remain unchanged.

The complete closed file/selector/property scope and all three exceptions are in design.md, which incorporates accepted revision 2 without revision 1 contradictions. The scope includes inherited colors of navigator/card/editor/inspector/flow-manager/menus/diagnostics, while their source/behavior is unchanged. Existing React/native primitives are reused; no dependency, lockfile, generated token, vendor or root CI change.

New shared runtime files, all inside packages/ui-workspace/src/design/theme/: types.ts, registry.ts, contrast.ts, resolver.ts, service.ts, rootParticipant.ts, nativeParticipant.ts, frameParticipant.ts, ThemePicker.tsx, theme-consumers.css, index.ts, shortcuts.ts, overlays.ts.

Existing integration files: packages/ui-workspace/src/Workbench.tsx (injected presentation controller, Settings, contextual key dispatch and managed Workbench overlays), FradeDiagramView.tsx (view-only graph participant registration/disposal), DiagramView.tsx (validated frame participant and lifecycle), packages/ui-workspace/package.json (exact theme/CSS exports and P01 BDD script; no new dependency), apps/desktop/src/renderer/main.tsx and index.html (bootstrap/import before App mount), apps/desktop/src/main/index.ts (presentation host, gated startup show and separate bridge injection; fixed native chrome remains unchanged), apps/desktop/src/preload/index.ts (separate narrow fradePresentation exposure), packages/runtime-contracts/src/index.ts (presentation export, no health protocol/API changes), scripts/check-runtime-boundaries.mjs (only exact permitted renderer theme/token/CSS subpaths). Existing feature CSS, Navigator/Inspector/FlowManager components, Draw implementation/routing/vendor/domain/repository files are excluded.

New host files: apps/desktop/src/renderer/presentation-bootstrap.ts; apps/desktop/src/main/presentation-settings.ts; apps/desktop/src/main/drawio-theme-bridge.ts; apps/desktop/src/preload/presentation-bridge.ts; packages/runtime-contracts/src/presentation.ts. Main may import the already-present ui-workspace dependency's pure token/theme data only; shared UI must not import runtime-contracts/Node/Electron or add reverse navigator/inspector edges. Renderer receives an injected portable persistence interface.

New tests: packages/ui-workspace/tests/ui-contract/{resolver.test.ts,service.test.ts,participants.test.ts,picker.test.tsx,p01.bdd.test.tsx,shortcuts.test.ts,overlays.test.tsx}; apps/desktop/tests/unit/{presentation-settings.test.ts,presentation-bridge.test.ts,drawio-theme.test.ts}; apps/desktop/tests/e2e/{ui-contract-theme.spec.ts,ui-contract-theme-performance.spec.ts}; packages/runtime-contracts/tests/presentation.test.ts; tests/contract/presentation-boundaries.test.mjs. Existing compatibility assertions/tolerances remain untouched; the original two stronger fixture preconditions, accepted E2E-07 third-fixture readiness/diagnostic delta and the explicitly accepted new P01 readonly evidence-path decision are specified below. Package runners already discover these new unit/E2E tests; ui-workspace test:bdd explicitly adds p01.bdd.test.tsx without dropping bundle-flows.

Docs/BDD/provenance: docs/ui/theme-core.md; docs/ui/bdd/p01-theme-core.feature; docs/ui/decisions/p01-theme-traceability.json; docs/ui/decisions/legacy-colors.json ONLY for the reviewed occurrence transition below; selected P01 proposal/design/tasks/specs and dated evidence/decisions. Foundation source/schema/generated CSS/TS, raw anchors/attributes, old BDD/bindings and historical decisions/reports are immutable. Root scripts/CI/dependency versions/lockfile are excluded. P01 tests run through existing root package tests, BDD, boundaries and check:all.

## Authority and checkpoints

User acceptance: [revision 2 acceptance](decisions/p01-scope-v2-accepted-20260930T180721Z.json), accepted draft SHA256 5372993a796683ae34d350fd53264cf50fa1a0fa6320289d696a7c133bbe4d4f. The proposed draft stays immutable historical evidence; this updated four-artifact plan is the effective accepted contract. Historical PRE reports remain FAIL; the latest revision 2 review resolved B01/B03/B04/B05 and retained B02 color closure. The user accepted the exact B02 addition and independent PRE-P01-B02-20260930T185730Z subsequently passed; its received raw report remains unchanged. Historical proposed drafts/reports are preserved, not rewritten. This acceptance is not a gate verdict or screenshot approval. Archived foundation is closed 21/21 with accepted cumulative POST and post-archive checks; see ../archive/2026-09-30-frade-ui-design-contract/evidence/foundation-closure-report-2026-09-30.md. Actual audit/build/runtime screenshots are in evidence/p01-audit-2026-09-30.md and p01-baseline-*. Runtime implementation is partial (5/10 tasks); pre-delta full root is PASS, required lower-frame token diagnostic is FAIL6/6, and verify/POST/archive remain NOT_RUN.

P01 depends only on the archived UI foundation and existing stable editor APIs. It does not depend on routing completion, gates, process state or uncommitted source. A routing consumer owns its later integration/revalidation. P02 installer, P03 import, P04 icons, P05 browser host, P06 contribution APIs, P07 registry/profiles/policy and later structural UI migrations remain separate checkpoints. Executable VS Code API compatibility is not claimed. The .frade-extension example remains a future installer fixture. Stop before P02.

## Accepted readonly evidence and compatibility readiness delta

User accepted P01-READONLY-STATE-01 (recommended evidence path) and P01-COMPAT-READINESS-01; authority: [dated acceptance](decisions/p01-readonly-readiness-accepted-20261001T055229Z.json). The two proposed drafts remain immutable historical records. This delta requires focused independent gpt-6-astra/xhigh read-only PRE PASS before test implementation; existing historical PRE PASS does not authorize this delta alone. Current task completion remains 5/10; pre-delta full root PASS and separate lower-frame FAIL6/6; human visual approval NOT_APPROVED and verify/POST/archive NOT_RUN.

B02 read-only FlowManager coverage uses the real already-open manager during an actual pending/unknown diagram write via an isolated declared transport gate that resumes the original handler and uses the original DTO. Exercise native and embedded consumers, all six theme/density combinations, actual forced colors and all three accepted viewports; assert visible panel, disabled membership, retained actual draft/member bytes, focus/contrast and unchanged persisted semantics. Diagram readonly and repository readonly are distinct: repository flow creation keeps real backend capabilities. Do not fabricate renderer props, model/XML, controller, vendor or feature handlers to create readonly. A restored read-only workspace separately requires disabled Save, blocked editing and actual unchanged file bytes; opening FlowManager in that workspace is not claimed. Preserve the old failed readonly-open source/assertions/results verbatim in dated raw evidence. This explicit specification decision replaces only that unavailable entry-path expectation; it waives no actual readonly visual or preservation obligations.

Consumer-owned follow-up UI-DRAW-READONLY-INSPECT-01: provide a readonly-safe bundle inspection entry point under the forms/Draw functional scope, with its own approved paths, permissions/keyboard/accessibility contract, regression-first tests, PRE/integration/POST. Status NOT_IMPLEMENTED / NOT_STARTED. This consumer consumes P01 tokens and owns its integration; P01 does not depend on its completion. No feature behavior/source expansion is authorized here; no next numbered change is started.

The original two existing compatibility test paths remain additionally allowed, with all existing assertions/workloads/fixtures/tolerances retained: apps/desktop/tests/e2e/workbench-multiroot.spec.ts adds actual rename-dialog-hidden readiness immediately after existing submit and before card/search; apps/desktop/tests/e2e/diagrams.spec.ts dragObject, only when iframe exists, waits for that same visible iframe, its exact current root presentation revision, hidden commit curtain, document.fonts.ready and two subsequent actual frame RAFs before geometry/pointer-down. No forced hidden state, graph/vendor/model API, invented DTO, ignored error, blind retry or write retry. Native segment tolerance 0.05 and all Undo/semantic assertions remain exact. Historical raw source hashes are in the accepted draft and acceptance record. Targeted old tests and a fresh full root regression remain required; failures remain blockers.


## Accepted P01-BUNDLE-FRAME-COMPAT-01

Authority: [dated acceptance](decisions/p01-bundle-frame-readiness-accepted-20261001T075310Z.json); accepted exact draft SHA256 c9861ffcc8234ab296afcba535ad66092f325f1981749a02b8900cda78b69d3a. The proposed draft and prior two FAIL/raw trace/original source remain immutable history. This adds only apps/desktop/tests/e2e/bundle-flows.spec.ts, E2E-07 embedded readiness/diagnostic preparation before its existing bundle-manager gesture. It does not widen any production, feature, domain, routing, vendor, dependency or CI path. Every original workload/fixture/assertion/tolerance remains exact, including native0.05 and removable Missing/Undo/Redo/save expectations. The original two compatibility readiness changes remain as accepted.

Before changing the third fixture, validate the coherent artifacts and obtain automatic independent gpt-6-astra/xhigh focused PRE PASS on a fresh technically bounded immutable packet. Record actual point/viewport/hit target and real screenshot around the existing failing assertion. Diagnose the missing manager without assuming a routing/domain defect; both current unchanged failures are preserved. Wait only on the same real visible iframe, exact root presentation revision, hidden commit curtain, existing enabled Save, loaded frame fonts and two actual frame RAF before geometry/input. If the actual bundle lies outside the canvas, scroll that DOM node into view and remeasure actual projection; never mutate graph/model/selection or force a hidden click. Readiness is a hypothesis pending proof. If it does not explain the failure, STOP at documented RCA; no production behavior repair is granted.

Preserve the actual manager-visible/removable-reference assertions and all subsequent original lifecycle actions. Run exact targeted compatibility checks and fresh full root check:all after repair. A targeted PASS cannot waive root FAIL. P01 remains5/10 until specified tasks are fully evidenced; human visual acceptance NOT_APPROVED and full verify/cumulative POST/archive NOT_RUN. Readonly inspection stays consumer-owned; no routing dependency is added. STOP before P02.

## Accepted SaveAs and lower frame chrome delta

Authority: [human acceptance](decisions/p01-saveas-bottom-accepted-20261001T105729Z.json). Accepted exact proposed SHA256: SaveAs b57e035fa8b104e62d9e14ecb952f0cadc2322d8e6040d10cef6660799a99dfa; bottom chrome e829e59637b43929f35acfaec85cd869ff61c6a0ddb7992037dbf65abd1129b7. Original proposed documents and all earlier evidence remain immutable history. Acceptance requires a fresh automatic independent focused gpt-6-astra/xhigh PRE before implementation; earlier PRE does not authorize these new deltas.

Current pre-delta baseline: pnpm check:all PASS (Draw215/desktop71, source538 unchanged) at evidence/p01-final-minimal-full-root-20261001T095545Z.json; separate actual lower-frame token diagnostic FAIL6/6 at evidence/p01-frame-chrome-observation-20261001T101428Z/result.json. Tasks remain5/10; human visual approval NOT_APPROVED; new-delta PRE and implementation NOT_RUN; full verify/cumulative POST/archive NOT_RUN.

P01-WORKSPACE-SAVEAS-READINESS-01 adds only existsSync from node:fs and one existence expectation at each of the original workspace/alternate Save As sites before unchanged JSON readFile polls in apps/desktop/tests/e2e/workbench-multiroot.spec.ts. All original actions/fixtures/assertions/tolerances remain exact; no product writer or DTO changes.

P01-FRAME-BOTTOM-CHROME-01 explicitly adds only the lower pinned-frame consumer targets/properties below to the existing private drawio-theme-bridge.ts, with RED/actual measurement coverage in the existing P01 unit and E2E files. It is distinct from the earlier E2E-07 no-production scope, which remains unchanged. No vendor/domain/routing/provider/dependency/CI/source scope expansion beyond this one bridge is permitted. Applicable FDS-003/004/008/009 and A11Y-001–005/007–009, forced/media/zoom/targets and exact semantic preservation remain mandatory; no fourth exception is added. STOP before P02.

## Accepted P01-FRAME-LOWER-KEYBOARD-01

Authority: [p01-frame-lower-keyboard-accepted-20261001T115657Z.json](decisions/p01-frame-lower-keyboard-accepted-20261001T115657Z.json); accepted exact proposal SHA256 458361c95f36f02a2f438082dd52befc825413b928266722c494b9580c9d0874. Historical CSS-only acceptance and both failed PRE reports remain immutable. No production repair before fresh focused PRE PASS.

Resolve repeat PRE SPEC_CONFLICT / ABSTRACTION_BOUNDARY by permitting the bounded lower-chrome interaction adapter in the existing private bridge, alongside canonical palette/geometry. Accessible names/roles/states, contextual F6 entry/return, lower focus navigation and exactly-once original DOM activation are in scope. No new exception, vendor/domain/routing source or API expansion. P01 remains5/10, current delta PRE/implementation NOT_RUN; visual/verify/cumulative POST/archive remain open.

## Accepted P01-LOWER-ORIGIN-POPUP-KEYBOARD-01

Authority: [dated human acceptance](decisions/p01-lower-origin-popup-keyboard-accepted-20261001T193045Z.json), exact proposal SHA256 8994a7e062dd9c5265492574ca0174b6aa9cf8957856e1d77bf32c3c65c8e33a. The original proposed header is superseded only by this separate acceptance; all prior raw FAIL and original baselines remain immutable. This changes only the specific lower-origin popup boundary; it is not general vendor keyboard/overlay authority or visual approval.

Adopt complete original lower menu/submenu keyboard action paths through the sole existing private bridge, with proven opener/menu/participant ownership, canonical palette/geometry and exact cancellation/teardown. Other menus/dialogs/plugins, vendor sources/callback replacement, semantic/routing/persistence APIs and dependencies stay excluded. P01 remains5/10; coherent plan/strict/fresh independent PRE → permanent unit/Electron RED → bounded implementation → targeted/full checks. Routing is not a prerequisite; STOP before P02.

## Accepted P01-LOWER-ORIGIN-POPUP-REFLOW-01

Authority: [dated human acceptance](decisions/p01-lower-origin-popup-reflow-accepted-20261002T014550Z.json), exact unchanged draft SHA256 6bdd2cfe1e48f1fb67122cdb35bceaba8e17bc333c4a01ce352b4bf2dfb58b17. The original PROPOSED header is superseded only by this separate acceptance; all prior raw FAIL remains immutable. Acceptance does not constitute PRE/POST or screenshot approval.

Only the sole private bridge gains bounded first-party DOM reflow of already proven lower-origin original menu/submenu panels. Keep original anchor/side whenever feasible; otherwise measured non-overlapping owned position/width/text wrap with exact teardown is permitted. Vendor callbacks/nodes/content/actions, routing/domain/persistence, other paths, three exceptions, target/contrast/font obligations and old tests remain unchanged. Current complete Electron matrix FAIL6/6 is preserved; fresh strict validation and automatic stage-assigned PRE precede new unit RED and production reflow. Current P01 stays5/10; full root, human visual/FUI, verification/cumulative POST/archive stay open. STOP before P02.


## Accepted P01-LOWER-REFLOW-REFUSAL-01

Authority: [p01-lower-reflow-refusal-accepted-20261002T074100Z.json](decisions/p01-lower-reflow-refusal-accepted-20261002T074100Z.json); exact unchanged draft SHA256 15ca9631c072adf7cb32ff8fcd4c73f5fdab5ccc3f647e125b0854c3d4262e01. The separate human acceptance supersedes its PROPOSED header only; raw POST2 FAIL a204eeb25ba1eabca5c44659ae05b52124a0cd35ef86480958bdfbecc668feb3 and all earlier evidence remain unchanged. Acceptance is not PRE/POST, visual approval or closure.

B05 adds only current-owner asynchronous lower refusal handling in packages/ui-workspace/src/design/theme/frameParticipant.ts and its existing themeError live region wiring in DiagramView.tsx, alongside bridge success/failure STOP/cancellation/restoration/retry. This is the sole exception to prior sole-bridge restrictions for B05; all other lower behavior remains bridge-only. Keep existing REFUSED envelope, transaction/barrier/health keys and settled outcomes unchanged; no generic vendor/domain error channel, graph reload, persisted or routing behavior. Permanent tests add only existing participants.test.ts to the prior bridge unit/E2E paths. Current6/10, prior POST FAIL and full FUI/human visual/cumulative closure remain open. Fresh coherent strict/PRE before RED/implementation; no P02.

## Accepted P01-UPPER-THREE-GLYPH-PAINT-01

Authority: [human acceptance](decisions/p01-upper-three-glyph-paint-accepted-20261002T190409Z.json); exact accepted proposal SHA256 4fa0062a9c8d717f0b540bd5f65568b2f934b009947954e4ee7931e01df6808e. Original proposal bytes, diagnostic PRE/results and RED remain immutable. This accepts only P01-UPPER-THREE-GLYPH-PAINT-01; fresh implementation PRE is required. P01 remains6/10 before code; task3.1 reopens on source/test implementation. No P02 or Routing dependency.

Correct the proven fixed-black upper toolbar glyphs View / Insert / Freehand through the existing private bridge, original trusted SVG masks and canonical text.primary/system mapping. Preserve exact original18px geometry, opacity, states, handlers and domain behavior. Only the three source identities and selector/property/lifecycle/test bounds in the accepted proposal and detailed design are authorized. Prior lower-only mask restrictions remain in force for every other target. Evidence19controlsPASS and12enabled upper-boundFAIL/114NOT_MEASURED is a diagnostic checkpoint, not product completion. Actual affirmative glyph proof, all original regressions, fresh root/verify/POST and human visual acceptance remain required; no new exception.

