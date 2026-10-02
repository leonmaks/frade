# P01-FRAME-LOWER-KEYBOARD-01 — proposed exact scope amendment

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. This document grants no implementation permission. It supplements the accepted P01-FRAME-BOTTOM-CHROME-01 only after a new human decision; both earlier accepted proposals and failed reviews remain immutable.

## Established blocker

Repeat independent PRE: evidence/p01-saveas-bottom-repeat-pre-received-20261001T114414Z/result.md, GATE_STATUS FAIL, SPEC_CONFLICT / ABSTRACTION_BOUNDARY. Input completeness is now resolved: full pinned vendor JS and complete constructors/layout are supplied. The accepted CSS-only scope requires actual distinguishable focus while forbidding DOM-semantic changes.

Actual evidence/p01-lower-focus-observation-20261001T112450Z/result.json: six Light/Dark/HC × density cases, 60 lower DOM nodes, all tabIndex=-1, no direct focus obtained. XML/file/scale/translate/undo/selection/preferences unchanged in the attributes-only workload. Earlier actual30 Tab inputs from canvas stayed in mxTypingShim and selected authored; that diagnostic FAIL and TEST RCA are retained. It is not a theme implementation regression. CSS :focus-visible cannot itself make these controls focusable.

## Exact decision proposed

Allow a lower-chrome accessibility interaction adapter, owned by P01, inside the existing serialized unprivileged apps/desktop/src/main/drawio-theme-bridge.ts. Add this explicit permission to the previous DOM/CSS scope: owned focusability, accessible names/roles/states, and keyboard navigation/activation for existing lower controls. No new exception or claim of current A11Y PASS. Routing is not a prerequisite. The later Draw consumer owns adoption/integration of these UI artifacts in its branch; no routing work is transferred here.

### Allowed nodes and semantics

All ownership stays beneath html[data-frade-frame-runtime="1"] and .geTabContainer. No general vendor keyboard rewrite, replacement/reparenting of nodes, or modification of vendor action callbacks.

- Existing .geControlTab: one named button focus target; its nested decorative .geButton is not a duplicate focus target. Mirror actual hidden/disabled capability, never invent enabled state.
- Existing .gePageTab: preserve page DOM/identity and existing class selection. Expose separate, named page-selection and page-menu targets on the existing text span and menu .geButton, under a group; avoid nested interactive roles. aria-pressed/current mirrors actual selected page; focus alone never selects a page. The page-menu target announces its menu purpose.
- Existing lower group/scroller: owned accessible grouping/names. Reuse original localized title/resources where available; give currently unnamed scroll controls explicit localized names. No new icon asset/family.
- Allowed owned attributes: tabindex, role, aria-label, aria-pressed/current, aria-haspopup/expanded, aria-disabled, aria-hidden for decorative child icons, and private ownership markers. Do not overwrite unrelated attributes. Exact preexisting values are restored on detach/disposal; dynamic vendor DOM recreation receives the same bounded projection.

### Keyboard contract

- Within the active pinned frame, F6 / Shift+F6 provides entry/return between the canvas and lower controls. It is contextual, suspended during text editing/IME/composition, active dialogs/popups or unavailable presentation ownership. Existing save/close/presentation chords retain priority and behavior.
- Tab / Shift+Tab follows the real visual order, skips actual hidden/disabled targets, and permits exit; no new focus trap. ArrowLeft/Right and Home/End within page choices move focus only. Escape in lower navigation returns to the remembered connected canvas focus target without changing selection or intercepting an existing dialog/popup cancellation.
- Enter / Space activates the corresponding existing action exactly once using its existing DOM click/gesture path. Keep original handlers/guards/DTOs intact; never invoke graph/model/routing/persistence APIs directly as an accessibility shortcut. Do not force a hidden/disabled target or fabricate a command result. If a required lower-origin popup action cannot be operated through the existing keyboard/DOM path within this bounded scope, STOP and propose its responsible scope separately before implementation; do not declare it PASS or add a silent exemption.

### Presentation and semantic boundary

All previous canonical colors/state/geometry requirements remain: six theme/density cases, actual forced/coarse/reduced, compact28/comfortable36/width24/coarse44, three viewports and 200% text, no clipping/occlusion. Add the actual lower focus targets to measurement and text-zoom classification without deleting previous consumers/assertions. Verify actual icon paint as well as computed text color; reuse existing icon sources/canonical tokens, with no vendor asset edits.

Theme apply/rollback/media/density/focus navigation must preserve document/model/XML/authored paint, selection/undo, preferences, scale/translate and editor/graph/iframe identities. Keyboard activation is a deliberate user action: test its intended original behavior against existing handler semantics, independently from theme-preservation oracles. The previous Tab diagnostic must not be misrepresented as a theme mutation. No routing algorithm, endpoints, waypoints, persisted schema, permission model, provider/installer or native decoration change.

## Paths and gates

Only production path: apps/desktop/src/main/drawio-theme-bridge.ts. Permanent tests: existing apps/desktop/tests/unit/drawio-theme.test.ts and apps/desktop/tests/e2e/ui-contract-theme.spec.ts. Existing accepted SaveAs import/two-precondition delta is unchanged. P01 proposal/design/spec/tasks, docs/ui BDD/traceability/status and dated evidence are the supporting paths. No Workbench/FlowManager/Inspector/vendor/domain/routing source, dependency, lockfile, token/schema/asset or CI extension.

After human acceptance: preserve exact proposal hash/source baselines; reconcile four artifacts and BDD/traceability; strict validation and fresh automatic independent gpt-6-astra/xhigh read-only PRE. Then permanent meaningful unit/Electron RED before production, actual GREEN for focus entry/exit, focus vs selection, exactly-once original activation/disabled guards, lifecycle/recreated DOM, media/geometry/icon contrast and preservation; targeted original regressions and fresh full check:all/compliance/negative controls. Required failures stop progression. Full-FUI closure, visual approval, verify, cumulative POST and archive remain open; STOP before P02.

User confirmation is requested only for this new interaction authority. Standing automatic review authorization is unchanged and requires no per-review human relay.
