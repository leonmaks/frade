# P01-FRAME-BOTTOM-CHROME-01 — proposed exact presentation repair

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. This document does not authorize production implementation or approve a visual baseline.

## Actual reproduced defect

openspec/changes/frade-p01-theme-core/evidence/p01-frame-chrome-observation-20261001T101428Z/result.json contains six actual Electron/embedded DOM cases: Light/Dark/HC × compact/comfortable. All six FAIL the explicit canonical panel role check. The visible bottom page/status strip is div.geTabContainer.geTabItem; its background remains rgb(241,243,244) and foreground rgb(63,63,63), including Dark and HC. Expected current frame roles differ: Light panel rgb(245,246,248), Dark panel rgb(32,35,41), HC panel rgb(0,0,0). All six real screenshots and actual document-byte preservation results are saved. Root/frame revisions and actual rows are recorded. This is an implementation/measurement coverage defect, not an environment or routing dependency.

Static RCA: the private stylesheet covers geFooterContainer but the pinned vendor creates geTabContainer; the existing readUiConsumers query omits div.geTab/geControlTab/gePageTab. Existing current measurements pass only their selected subset. The current full root check:all is separately PASS: Draw215 + desktop71, exit0, source538 unchanged. Neither that PASS nor the subset matrix establishes bottom-strip conformity. No current source has been changed for this diagnosis.

## Decision requested

Permit a focused presentation-only bottom-chrome repair within P01 tasks2.4/2.5/3.1, through exactly the existing apps/desktop/src/main/drawio-theme-bridge.ts. Explicitly add the missing lower chrome consumer row to the closed design matrix; no blanket iframe/feature exemption or new visual system.

| Exact owned DOM target beneath html[data-frade-frame-runtime="1"] | Permitted properties / role |
| --- | --- |
| .geTabContainer, .geTabScroller | UI surface/background, text and border only: surface.panel, text.primary, border.subtle |
| .geTabContainer .geTab, .geControlTab, .gePageTab, .geButton | UI palette and border, canonical control target minima from current density; no feature action/DOM semantics changes |
| Existing active page class .gePageTab.geActivePage | selection.bg / selection.fg / selection.indicator; keep existing page selection and identity |
| Existing lower chrome hover and focus-visible | surface.hover / text.primary; focus.ring, canonical outline width/offset |

Required minimums are the already accepted P01 control contract: compact28, comfortable36, width≥24; actual coarse width/height≥44. The lower strip container must accommodate its controls without clipping or covering a click target. If a layout inset correction is necessary, only owned DOM/CSS chrome/container projection may change; measure actual bounds and preserve existing graph viewport/identity/model/undo/file/prefs. No graph/vendor semantic method is permitted to recompute routes or mutate a document. If the needed correction leaves this bounded DOM scope or fails preservation, STOP and propose the responsible scope separately. Do not invent a new frame-target exception.

Reuse the unchanged runtime snapshot tokens and forced system keywords; no new color literals, token/schema generation, palette family or native decoration behavior. No imports/dependencies/lockfile/CI/build scripts/vendor assets are modified. No provider/installer/P02 work. No routing algorithms/endpoints/waypoints/domain/model paint/persisted data changes.

## Regression-first implementation/checkpoints after acceptance

1. Preserve source/test/planning raw bytes and diagnostic RED; coherently add this row/requirement/BDD/traceability/task checkpoints to proposal/design/spec/tasks. Existing accepted readonly and three compatibility deltas remain exact; historical evidence stays unchanged.
2. Strict validate → fresh technically bounded immutable review packet → automatic independent gpt-6-astra/xhigh focused PRE. No production repair before PASS. Standing packet authorization is unchanged; auth/secrets/global settings/other repositories remain excluded.
3. Add permanent meaningful failing coverage in existing apps/desktop/tests/e2e/ui-contract-theme.spec.ts: include the actual lower div controls in selected consumer measurements; assert canonical token colors, selected vs focus state, density/coarse minima, actual visible/unclipped bounds and unchanged XML/authored paint/undo/selection/identity/preferences. Preserve every original assertion/action/fixture/tolerance. New unit cases in existing apps/desktop/tests/unit/drawio-theme.test.ts verify private projection apply/rollback/disposal and poisoned semantic APIs with representative lower DOM. Save actual RED before implementation; do not merely snapshot CSS text.
4. Implement only the bounded private presentation bridge correction. Run targeted native/frame/state/security tests and actual six combinations, forced/coarse/reduced/200% and selected1280/1600/850 viewport coverage. Preserve actual state bytes; inaccessible or unavailable proof is BLOCKED, not PASS.
5. Fresh full root check:all + BDD/typecheck/lint/compliance/negative controls; save new screenshots/raw logs/source integrity. Perform final coverage verification and later cumulative POST through the established workflow. Human visual baseline acceptance remains a separate decision after fixed evidence; archive only after every applicable PASS. STOP before P02.

Allowed test repair files: the two existing P01 test files above; P01 docs/BDD/traceability and planning/evidence paths only. No source permission is added for Workbench/FlowManager/Inspector/vendor/domain/routing. Save As remains a separate exact proposal, not hidden inside this delta. This proposed text grants no change to current Save As tests or original E2E-07 assertions.
