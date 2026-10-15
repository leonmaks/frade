# P01-UPPER-THREE-GLYPH-PAINT-01 — proposed exact scope

Status: PROPOSED, NOT_ACCEPTED. The user's decision is required before updating the active four-artifact implementation plan or production. This document adds only the boundary below to the existing P01 task2.4/2.5 scope; it does not close tasks or approve screenshots.

## Proven problem

Actual Electron44.4.5 diagnostic references:19PASS; same current543source files. Actual source-bound six-state Frade observations:12 enabled FAIL_CONTRAST_UPPER_BOUND,114NOT_MEASURED. Required3:1 cannot be met by these original black SVGs: HC upperBound1, Dark upperBound1.3338470153815378. Three controls in both compact/comfortable: View / Insert / Freehand. These are upper bounds, not measured minimum ratios. Mandatory assertion exited1. RCA and immutable raw evidence: openspec/changes/frade-p01-theme-core/evidence/p01-upper-glyph-defect-20261002T183231Z/rca.json; openspec/changes/frade-p01-theme-core/evidence/p01-cumulative-audit-20261002T142714Z/runtime-diagnostic/black-bound-v4/application-analysis.json and required-contrast-red.stderr.txt.

Root cause: apps/desktop/src/main/drawio-theme-bridge.ts currently assigns canonical background and CSS color to these controls, while their original fixed-black background-image SVGs retain black paint. The fix belongs to the owned UI projection. Routing/domain behavior is not implicated. Guide v1.0 rules FDS-003/004/007/008/009/010, A11Y-002/007/008 apply; no new exception.

## Closed production path and target ownership

Only apps/desktop/src/main/drawio-theme-bridge.ts. Reuse the existing private frame root and presentation lifecycle. Adopt only connected original background-image controls under html[data-frade-frame-runtime="1"] .geToolbarContainer .geToolbar a.geButton whose original SVG bytes match one of these exact pinned source identities and whose original glyph box is proven18px centered:

- Вид (Пробел+перетаскивание для панорамирования) — original SVG SHA256 0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a
- Вставить (Нажмите дважды, чтобы вставить текст) — original SVG SHA256 4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24
- Режим рисования (X) — original SVG SHA256 e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a

No title/index-only lookup, global .geButton rule, generic SVG recoloring or arbitrary resource adoption. Read actual original background URL/bytes and compare pinned identity; a changed, missing or unsupported resource stays unowned and prevents required closure. Existing runtime action/menu capability is observed for tests, never replaced. Gray Layout, null-resource edge menus, shapes/table/fullscreen/format and all other controls receive no new projection authority. Their still-open evidence cannot be claimed PASS through this decision.

## Exact DOM/CSS paint delta

For only the three owned controls, preserve and restore exact prior inline properties/attribute absence. Introduce a private marker data-frade-upper-glyph and --frade-upper-icon-image carrying that same original trusted SVG resource URL. Suppress only that control's original background-image; paint its unchanged original silhouette through an owned ::before alpha mask, centered in its original18x18px glyph box, with the existing canonical text.primary foreground and effective forced-colors mapping. This reuses existing assets and the existing mask technique already used in the lower strip; it does not add assets or an icon registry.

Allowed additional properties are only: target background-image, the private custom property, and target position:relative when needed for a previously static positioning context; pseudo content, position:absolute, width/height18px, left/top positioning within the existing box, mask-image/mask-size/mask-position/mask-repeat, background-color from the existing role, pointer-events:none and forced-color-adjust for the already-resolved system mapping. Scope every rule by private frame root + upper toolbar + own marker. Do not apply opacity/filter changes to the control or ancestors. Preserve original disabled/active state, original opacity, node/handler/callback identity, accessible name, focus, bounds, hit areas, menu positioning and gestures. No new keyboard or ARIA behavior. If those guarantees require other properties/files/behavior, STOP for a separate exact decision.

Lifecycle must cover preview/apply/cancel/rollback, resource/node replacement, disposal and reattachment without late mutation; restore the original image/property values and marker absence exactly. Reuse existing bridge observation/reconciliation scheduling only; no new persistence, vendor refresh, graph fit/theme APIs or canvas/model paint. No vendor/domain/routing/Repo Core/renderer-parent/IPC/dependency/token/schema/CI/native chrome edit.

## Required plan, regression and verification

After human acceptance preserve exact proposed bytes/hash and acceptance; reconcile existing proposal/design/tasks/specs, BDD and traceability, then strict validation and fresh automatic independent P01 PRE gpt-6-astra/xhigh. This diagnostic PRE does not authorize production repair. All original assertions, fixtures, tolerances and historical evidence remain unchanged.

Permanent test edits are append-only meaningful regressions in apps/desktop/tests/unit/drawio-theme.test.ts and apps/desktop/tests/e2e/ui-contract-theme.spec.ts. Docs/contract edits only existing P01 artifacts, docs/ui/theme-core.md, docs/ui/bdd/p01-theme-core.feature, docs/ui/decisions/p01-theme-traceability.json and branch status/context/evidence. RED before product repair must assert real visible glyph paint and canonical contrast, ownership isolation and exact lifecycle restoration, not merely absence of the old black-source FAIL.

Before GREEN the coherent plan must define and independently PRE-review an affirmative actual-source/mask/compositor proof for the projected glyph, with known positive/negative same-Electron controls. V4 is FAIL-only and cannot grant numerical PASS after recoloring; NOT_MEASURED or a computed CSS color alone does not pass. Do not loosen the old eroded-core oracle, threshold, screenshots or AA treatment. If a sound affirmative proof cannot be established, STOP; this acceptance does not waive that requirement.

Actual all-six Light/Dark/HC x compact/comfortable, original default/hover/focus/active/disabled where reproducible, forced-colors/coarse/reduced,1280x850/DPR1/fonts-ready plus1600/850/text200 coverage. Verify unchanged UI/graph/toolbar identities, XML/authored paint/preferences/files/selection/undo/viewport and original actions; unknown states remain BLOCKED. Preserve old PNG manifest; any changed baseline needs separate human visual acceptance. Targeted tests, package lint/typecheck/unit/BDD/security/compliance positive-negative controls, fresh full root check:all, OpenSpec verify and automatic independent POST are required after repair. Reopen task3.1 when source changes; no stale root PASS for new code.

This decision does not resolve remaining114 glyph measurements or grant cumulative P01 closure. Exactly three legacy exceptions remain; branch protection remains LOCAL_ONLY/NOT_CONFIGURED. No P02 or later migration starts. UI retains independent ownership from Routing V2.
