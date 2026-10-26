# Design

## Context

See proposal.md for motivation. Baseline is Main `4244e5668e50f74b9b536c2f0ffc44c56279e945`; this branch contains no uncommitted P02/Routing code. Root AGENTS sections 18-22 and Guide v1.0 apply. No nested AGENTS exists in the affected UI/desktop paths; routing-scoped rules are outside this presentation change.

Observed boundaries:
- `nativeParticipant.ts` projects snapshot diagram.canvas/grid through existing X6 view managers. It does not own cells or persistence.
- `frameParticipant.ts` authenticates phase/owner and waits for painted ACK; `drawio-theme-bridge.ts` applies frame CSS plus a private SVG dot grid. The bridge currently derives color-scheme from the application snapshot.
- `DiagramView.tsx` and `FradeDiagramView.tsx` portal their content into retained editor containers. Both have breadcrumbs/actions, reference controls, flow manager, readonly/error states and local reconnect UI.
- `rootParticipant.ts` validates the complete 31-role DTO, projects system colors and applies the ID-derived reference preset. The application snapshot must not be mutated to make one editor light.
- `overlays.ts` supplies stable host, modal priority, inert/focus/Escape handling; it has no diagram appearance-owner field today.
- `DiagramEditor.tsx` contains the native toolbar, existing grid visibility and a standalone name prompt fallback. Its embedded desktop path hides the standalone toolbar/name-prompt fallback. Its routing/selection handlers are not appearance repair points.

Inventory and exact raw hashes are recorded in evidence/planning/inventory.json. Prior archived visual PASS, 372 P01 images and 19 reference images remain historical, not baselines for this change.

## Goals / Non-Goals

**Goals:** one shared editor light projection; complete editor-owned surface coverage; faithful supported authored paint; same comparable control metrics; truthful forced-colors behavior; no flash on bootstrap/restore; unchanged atomic transaction and accessibility guarantees.

**Non-Goals:** changing application defaults/selection, adding a light-editor setting, a second resolver/UI library/icon family, rewriting vendor files, synchronizing diagram formats or feature sets, changing author styling/persistence/export, snap/routing/endpoints, P02-P07 or a general UI migration. OS-owned titlebars, file/color chooser windows and browser-native prompts are outside application-rendered styling; any reachable native prompt must be identified as system UI, not falsely counted as a themed application dialog.

## Decisions

### 1. One derived scope after the existing resolver

Add `packages/ui-workspace/src/design/theme/editorPresentation.ts` as a pure view projection from a validated ResolvedTheme. Use the canonical built-in Light palette, independent density and the original transaction revision. Ignore application theme/user color overrides only within this explicitly fixed editor scope. Do not select/persist another theme or mutate registry/input. For ordinary HC selection with forced colors inactive, the editor is still light, as explicitly accepted by the user. Forced colors is the sole palette exception and retains the existing final system mapping.

The derived snapshot may identify the built-in Light palette locally; the authoritative application ID/kind/settings stay in the existing controller. Service contexts, session/generation/membership, transaction IDs, revision, READY/PAINTED guards, cancellation, one bounded membership reprepare and 2s/5s deadlines remain exact. Never spoof a global ID or send a light palette with a dark DTO kind to bypass validation.

Project only at editor participant boundaries. Give each complete diagram editor container an owned light root. Compose its root work with the existing native/frame presentation participant under the same registration/paint barrier where possible; do not create an asynchronously updated CSS subscription that misses preview or reveals before ACK. Parent editor chrome and iframe/native canvas must both be prepared before reveal. Global overlays and the recovery curtain keep existing application/system ownership.

### 2. Canonical roles and geometry

Reuse canonical Light surface/text/action/border/status/focus roles and existing density values: compact controls/rows 28px, comfortable 36px, coarse targets 44px, focus stroke 2px, common control radius 4px. Normal text >=4.5:1 and meaningful control/state graphics >=3:1 are tested against actual backdrops. Palette/style samples are content paint, not control foreground.

Keep canonical tokens.json and generated token artifacts byte-identical in this stage: their adoption oracle allows only the historic single-selector exception. Instead add versioned `packages/ui-workspace/tokens/diagram-editor-presentation.json` as a narrowly scoped role profile referencing canonical Light roles, with only neutral canvas #F9FAFC and decorative grid #CDD3DC declared there. This is role data, not feature-level literals or another resolver. Validate its allowed keys, HEX values and provenance in the existing UI test/compliance chain; include an isolated negative profile and palette/scope-leak regression. Global theme definitions and all three built-in role sets stay unchanged.

Match visible dots across engines at scale 1 using the existing Draw.io radius 0.6 (1.2px diameter), same configured semantic grid phase and color. Preserve the current semantic grid size (normally 10), visibility preference, snap and view transforms. Do not implement the research suggestion of a new 20px/adaptive grid algorithm here. Explicit page backgrounds/images remain above the neutral workspace and remain export-owned content.

The VS Code preset remains applicable only to external workbench controls. Editor roots/owned overlays reset reference-only color/metric variables explicitly through the scoped shared style; no broad `all:unset`, filter/inversion or new arbitrary CSS execution.

### 3. Explicit appearance ownership

Use an editor-instance ownership lease for each retained editor root and its application-rendered overlays, with exact teardown/reassignment. Scope by owning editor, never by global screen coordinates or every dialog/menu in the document. Keep the existing single managed overlay host and keyboard/modal ordering. A portaled editor dialog/menu can remain positioned by its existing host while receiving the editor's shared light role scope. Disposal and editor switch remove only owned attributes/styles and cannot restyle another editor or the global theme picker.

Inside the pinned Draw.io iframe, owned chrome includes menubar, toolbar, sidebar/library palette, format panel, footer/page tabs, native Draw.io popup/submenu/dialog and tooltip roots. Broad text/control rules must exclude author color swatches, SVG thumbnails and style preview content. Preserve existing positively owned icon resources/handlers and current keyboard/focus leases; unknown glyphs are not silently recolored by hash allowlisting. Track popup/tooltip creation within the verified iframe and restore only bridge-owned presentation. Native X6 SVG cell attributes remain outside UI CSS selectors.

### 4. Author paint and supported parity

No calls to graph/model style mutation, setBackgroundColor, page setters, adaptive color toggles that write a document, import/export normalization or repository appearance mutation from a theme transaction. Compare before/after JSON/XML bytes plus dirty state, undo, selections, cells, editor/iframe identities and authored backgrounds. UI focus/selection handles remain overlays distinct from authored stroke/fill.

Use actual supported `elementAppearance.ts`/Draw.io appearance adapters as read-only witnesses. The native document schema has no page-background/image or gradient fields; those witnesses are Draw.io-only, and no unsupported native feature is invented. For shared opaque fill/stroke/text, compare source values, computed SVG/canvas paint and palette data. For opacity and gradients, compare composited samples over the same declared backing color; identical HEX alone is insufficient. Images retain source/opacity. Inherited/default styles are tested for stable effective appearance without materializing new persisted attributes. A feature absent in either engine is reported UNSUPPORTED/NOT_APPLICABLE with evidence; no invented feature or universal pixel-perfect claim.

### 5. Formal conflict resolution

User authority is recorded in decisions/accepted-scope.md. The deltas explicitly modify theme-core atomic/isolation scenarios, workbench reference-geometry scope and bundled-reference fidelity boundaries. During implementation publish an approved-scope companion at docs/ui/diagram-editor-presentation.md, explicitly documenting the exception to Guide 5.1 and Themes-and-Plugins Spec section 6: ordinary app light/dark/HC still ship together, but these two diagram editors use the shared Light scope, with Windows forced colors final. Interpret FDS-003/008 as reuse of one shared scoped system, not independent engine palettes. Do not edit historical archives or declare the old gate automatically accepting the new appearance.

Main specs are synced only at the established verify/archive point. The eight FOUNDATION-EOL-01 protected files, including Guide, QA Checklist and Themes Spec, remain raw-byte identical. The companion and normative deltas carry the accepted local exception; do not change checkout pins/oracle. decisions/documentation-companion.md supersedes only physical insertion instructions in the retained earlier documentation-amendment.md draft. Brand assets and upstream theme source/MIT closure stay exact.

### 6. Authorized implementation paths

Only after apply authorization and independent PRE PASS:

- New shared files: `packages/ui-workspace/src/design/theme/editorPresentation.ts`, `editorPresentation.css`, `editorPresentationParticipant.ts`; profile `packages/ui-workspace/tokens/diagram-editor-presentation.json`.
- Existing integration: `packages/ui-workspace/src/design/theme/{nativeParticipant,frameParticipant,rootParticipant,overlays}.ts`, `theme-consumers.css`, `packages/ui-workspace/src/{DiagramView,FradeDiagramView,FlowManager,DiagramReferences,Workbench}.tsx`. Changes are limited to presentation roots, owned overlays and composition; action/domain handlers remain exact.
- Frame integration: `apps/desktop/src/main/drawio-theme-bridge.ts`. No other Main/preload/security/persistence protocol file is permitted.
- Existing `packages/draw/src/editor/DiagramEditor.tsx` and `packages/draw/src/style.css` ONLY for scoped presentation attributes/classes and toolbar color/metrics, as confirmed by inventory; no imports/changes of routing, graph construction, cell serialization or action handlers.
- New tests: `packages/ui-workspace/tests/ui-contract/light-diagram-editor.test.tsx`, `light-diagram-editor.bdd.test.tsx`, `apps/desktop/tests/unit/light-diagram-editor.test.ts`, `apps/desktop/tests/e2e/ui-contract-light-diagram-editor.spec.ts`, `tests/ui-contract/light-diagram-editor.test.mjs`; test-owned fixtures under matching light-diagram-editor subdirectories.
- Existing affected regression files: `packages/ui-workspace/tests/ui-contract/{participants.test.ts,overlays.test.tsx,vscode-dark-2026.test.ts}`, `apps/desktop/tests/unit/drawio-theme.test.ts`, `apps/desktop/tests/e2e/{ui-contract-theme.spec.ts,ui-contract-vscode-dark-2026.spec.ts}`. Preserve behavior assertions/timings. Only exact visual expectations contradicted by the accepted light-editor policy can change, with immutable before-source and per-assertion old/new mapping. No skips, blanket test exemption or snapshot regeneration.
- Add only `packages/ui-workspace/tests/ui-contract/vscode-dark-2026-origin.ts` and `packages/ui-workspace/tests/ui-contract/vscode-dark-2026-origin.test.ts` for the exact historical replay adaptation described in decisions/lde-pre-reconciliation-01/proposal.md. The control MUST verify a hard-coded final current-source SHA, reverse only enumerated accepted editor-visual expectations into the exact pre-LDE live SHA `3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9`, then perform the unchanged historical selector reversal to original SHA `7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43`. Unknown bytes/assertions, count/order mismatch and tampering MUST fail. No normalization, automatic hash acceptance, broad source/AST allowlist or behavior/timing change. Preserve full pre-LDE source and per-assertion transformation evidence; new exact final-source literal/pin is established only from the reviewed final artifact and independently verified in POST.
- `docs/ui/decisions/p01-theme-traceability.json` may refresh only source bindings proven affected by an approved change; retain original binding/source/evidence and fail on unknown deltas. `tests/ui-contract/vscode-dark-2026.test.mjs` may change only an exact source expectation for the accepted editor exception, with the same proof. No weakening of scripts/ui controls or original performance pins/tests.
- Existing root `package.json` ONLY to include the new standalone Node compliance test in the current `test:ui-contract` command if wildcard discovery is insufficient; `packages/ui-workspace/package.json` ONLY to add the new BDD file to `test:bdd`; no dependency/lockfile/export changes.
- Documentation: new `docs/ui/diagram-editor-presentation.md`, this change directory and `docs/ui/LIGHT-DIAGRAM-EDITOR-STATUS.md`. Existing Guide/QA/Theme docs are read-only inputs protected by the raw-byte oracle. Main spec changes only by explicit delta sync at closure.

Every other path is frozen to baseline for this change. Unexpected necessary hooks/control repairs require plan reconciliation before PRE; material expansion requires a user decision. No wildcard vendor, routing/domain, dependency, `.gitattributes`, canonical token generation or review-runner modifications are allowed.

### 7. Strategy before expensive work

Objective: meet all declared light/author/system/ownership requirements with real dual-engine evidence and independent gates, minimizing repeated large suites. The numbers below are forecasts and judgment, not measured durations or success probabilities.

| Alternative | Time and resources | Risk/dependency | Decision |
|---|---|---|---|
| Global hard-coded CSS / force app Light | 1-3h, low initial tokens/CPU | Breaks workbench theme, portals, paint fidelity and override validation | Rejected: cannot satisfy acceptance |
| Patch each engine independently | 8-16h initial, medium review tokens | Duplicate palettes and drift; ambiguous portal owner | Rejected: competing contracts |
| Shared derived projection plus existing participants | 12-24h implementation/evidence forecast, medium review tokens, bounded Electron runs | Large existing bridge; historical source controls; actual UI coverage unknown | Selected: smallest correct shared boundary |
| Replace both editor toolkits | Multiple days/weeks, high tokens/build/visual cost | New behavior, vendor and domain integration | Out of scope |
| Reuse all historical screenshots/test PASS | Negligible immediate cost | Wrong visual policy/input; no current proof | Rejected |
| Incremental checks plus final required closure | Targeted RED/GREEN first; one final root/general/runtime pass | Requires exact hashes and coverage accounting | Selected verification strategy |
| Parallel independent source writers | Uncertain speedup, higher merge/control cost | Shared adapters/bridge; concurrent checkout writers forbidden | Not selected; independent review remains mandatory |

Initial apply probe is bounded to 45 minutes: one native root, one Draw.io popup and one portaled owner witness under Dark with forced colors off/on, using new tests and existing APIs. This is not a blanket PASS. If a third production attempt addresses the same deterministic failure, classify/root-cause first per AGENTS. Reassess immediately if unsupported API, author paint mutation, missing app-owned dialog coverage or a mandated check invalidates this approach. Preserve every failed/interrupted run. Do not launch an equivalent full run after a source-neutral documentation correction; demonstrate exact input/coverage reuse instead.

### 8. Verification and independent reviews

Stage light-diagram-editor PRE reviewer: gpt-6-sol; reasoning effort: xhigh.
Stage light-diagram-editor POST reviewer: gpt-6-sol; reasoning effort: xhigh.

These exact assignments are user-approved for both phases. Record this design raw SHA256/excerpt in each request. Use the shared Git-common v1.1 release `a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5`; copy exact public policy into evidence/planning/shared-policy.md, never credentials/global config. Runner status AVAILABLE is only discovery, not sandbox/model attestation or PRE PASS. Each real dispatch still needs canary, minimal packet, empty index, frozen candidate, complete clean event stream and one unambiguous GATE_STATUS. Actual backend/effort is NOT_CONFIRMED unless separately attested. Never change a dashboard during freeze.

Readiness order: coherent/validated plan -> automatic PRE PASS -> meaningful BDD/RED -> production -> GREEN/current regression -> OpenSpec verify -> automatic POST PASS -> visual acceptance and archive only when all required closure conditions hold. Human visual acceptance may occur before POST but cannot replace it. Scope changes invalidate affected PRE evidence. Prompts in reviews/ are prepared instructions, not review results.

Use verification.md and bdd/light-diagram-editor.feature for the exact coverage/commands. No full build, Electron suite or independent review is claimed run in this planning-only request.

## Risks / Trade-offs

- Unowned popup receives global Dark -> explicit owner lease and real popup creation tests in both engines; no global dialog selector.
- Global reference CSS specificity leaks into light controls -> scope computed-style comparisons and leaving/reference-cancel regressions.
- UI inheritance recolors style previews/SVG thumbnails -> content-paint selector exclusions and opaque/alpha/gradient fixtures.
- Authored paper hides the neutral canvas -> retain author paper, distinguish workspace/paper in screenshots rather than overwrite data.
- Existing bridge fingerprints forbid a legitimate new source -> retain originals, exact assertion/source-delta mapping, fail unknown drift; no broad exemption.
- Native OS picker cannot inherit app CSS -> record the reachable system-owned surface and preserve its OS/accessibility behavior; do not claim app styling.
- Pixel raster differs across engines -> inspect computed supported values and equal-backdrop samples; disclose font/AA/unsupported differences.
- Ordinary HC now uses Light inside editor -> explicitly accepted behavior; still meet AA and keep final Windows forced-colors priority.

## Migration Plan

After a new apply request, finish source/control applicability mapping and fresh PRE. Implement the pure profile/owned root first, then native and frame consumers, then portal lifecycle and real parity fixtures. Use small commits within this change without closing intermediate gates as the whole feature. Verify final source once with the required command matrix and save screenshots plus original raw FAIL. Obtain visual acceptance for this new set, perform independent POST, sync/archive only this change, then stop. A separate integration checkpoint can transfer exact reviewed commits into Main; preserve foreign Main files. Push only to a user-authorized destination/ref.

Rollback means reverting this feature's reviewed presentation commits through the same safe integration process; never discard user documents, global preferences or other branches. No persisted schema migration is needed.
