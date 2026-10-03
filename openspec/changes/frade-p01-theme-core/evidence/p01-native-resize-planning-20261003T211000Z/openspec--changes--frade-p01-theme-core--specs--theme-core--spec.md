# Spec Delta

Current scope precedence: the effective accepted P01-UPPER-THREE-KEYBOARD-OWNED-POPUPS-01 amendment at the end of this artifact governs only its exact delta. Earlier dated execution statuses remain historical; current P01 is5/10, new keyboard PRE/implementation NOT_RUN. Authority openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-keyboard-planning-20261003T105545Z/acceptance.json.


## Purpose

The desktop currently ships a fixed VS Code Dark Modern palette. A single runtime service must ship Light and Dark together, support HC/System and preview safely without closing or mutating editors.

## ADDED Requirements

### Requirement: Builtin themes and independent density

The first runtime release SHALL provide offline Light, Dark and HC together, default System, explicit theme priority and independent compact/comfortable persistent density; forced-colors MUST remain system-controlled.

#### Scenario: Explicit Light and OS Dark

- **WHEN** the OS changes to Dark after explicit Light selection
- **THEN** Light remains selected and density/settings are preserved

### Requirement: Deterministic complete resolution

Resolution SHALL preserve immutable source data, fill every registered role, apply declared override precedence and validate named contrast pairs. External low-contrast roles SHALL repair deterministically with diagnostics, bounded ten passes and builtin fallback on nonconvergence.

#### Scenario: Low contrast theme

- **WHEN** an external palette violates a named pair
- **THEN** resolution returns a valid repaired or full builtin snapshot and identifies repaired roles

### Requirement: Atomic hot preview and commit

All required presentation participants SHALL apply one revision without restart. Preview MUST NOT persist. Cancellation or adapter/persistence failure SHALL restore the previous snapshot and settings without losing dirty editors, selections, undo or document bytes. Stale candidate results MUST NOT overwrite newer selection.

#### Scenario: Canvas preparation fails

- **WHEN** a required adapter refuses the preview or commit
- **THEN** all participants/settings remain at the previous theme and documents are unchanged

### Requirement: Measurable UI coverage

P01 SHALL verify Light/Dark/HC × both densities, keyboard picker, forced-colors/coarse/reduced-motion and state preservation on actual runtime screens. A p95 hot-apply budget of 150 ms SHALL be measured on identified hardware/workspace after package load; missing measurements MUST NOT be reported as PASS.

#### Scenario: Rapid A B C selection

- **WHEN** older theme preparation completes after C
- **THEN** C remains committed with no partial participant revision or late setting write

### Requirement: Presentation consumer isolation

Theme changes SHALL affect view presentation only. Persisted JSON/XML, authored page/background images/node/edge paint, route/endpoint semantics, model state, undo/redo, selection and editor/graph/iframe identity MUST remain unchanged. No theme transaction SHALL invoke persisted background/grid convenience APIs or trigger autosave/settings preference writes. Frame presentation acknowledgements MUST validate source, origin, session/generation, membership, transaction/revision and exact applied-paint phase.

#### Scenario: Native and embedded documents retain authored paint
- **WHEN** a dirty native and pinned embedded diagram with nondefault authored paint previews, commits, cancels and redraws under forced colors
- **THEN** saved document bytes, settings storage, model/undo/selection/identities stay unchanged while only UI view projection follows the current theme

#### Scenario: Forged or stale frame acknowledgement
- **WHEN** a foreign source/origin or obsolete frame generation sends an acknowledgement
- **THEN** it is rejected and cannot permit publication or reveal a mixed revision

### Requirement: Scoped durable presentation settings

Presentation settings SHALL use a fixed userData profile location, strict versioned bounded DTO and host-owned serialized intent/revision/CAS queue. Preview MUST perform no durable write. Unknown roles/fields, arbitrary paths, child frames and untrusted pages MUST be rejected. System is the default and density persists independently. Workspace overrides MUST require explicit opt-in and SHALL NOT install packages, read/write repository data or grant execution. Bootstrap SHALL resolve and apply validated settings before first normal UI paint; window visibility requires native readiness and matching presentation readiness.

#### Scenario: Commit and restart
- **WHEN** Light and comfortable density commit successfully and the desktop restarts under OS Dark
- **THEN** the first shown normal UI is Light/comfortable with the authoritative profile selection, preserving existing health API keys

#### Scenario: Malformed persisted settings
- **WHEN** startup reads invalid, stale or unreadable profile settings
- **THEN** validated offline fallback and truthful diagnostics are used before any normal view is shown, or an explicit safe recovery state remains closed

#### Scenario: Unauthorized persistence request
- **WHEN** a child frame, forged revision, foreign window, unknown field or oversized payload attempts a settings change
- **THEN** the host denies it without filesystem or repository mutation

#### Scenario: Persistence failure or unknown outcome
- **WHEN** a write refuses or its rename/response outcome is unknown
- **THEN** authoritative readback and serialized compensation restore last published durable state when provable; otherwise explicit recovery blocks success and mixed-state reveal

### Requirement: Observable transaction lifecycle

Every required ready web-content participant SHALL acknowledge the same revision after applied paint before reveal. A neutral system-color client-area curtain SHALL paint before participant writes and remain through any durable reconciliation/compensation. Cancellation and membership changes in every active phase SHALL invalidate stale handles/ACKs and reconcile both presentation and durable state. Joining consumers SHALL remain hidden until accepted current revision; churn has at most one safe reprepare. Unrecoverable rollback or unavailable required participant MUST block success and remain an accessible recovery state with dirty editors retained. Prepare/commit-or-rollback ACK deadlines are 2 seconds, host write/readback and reconciliation each 5 seconds, bootstrap handshake 5 seconds.

#### Scenario: C arrives during A durable rename
- **WHEN** C is accepted while A rename is already in flight
- **THEN** the host serializes readback and owned compensation/current C commit, never publishes stale A, and no A write occurs after C durable commit or acknowledgement

#### Scenario: Membership changes after preparation or during persistence
- **WHEN** an editor joins, leaves or navigates in any active phase
- **THEN** membership/generation invalidates the transaction, the curtain stays, durable state is reconciled and compensation precedes bounded reprepare or explicit canceled/recovery outcome

#### Scenario: Required participant refuses rollback
- **WHEN** a committed participant cannot restore the previous snapshot or misses applied-paint deadline
- **THEN** no success is emitted and recovery retains the safe curtain and dirty documents rather than exposing mixed state

#### Scenario: Window close during preview
- **WHEN** the user closes the window with active preview and dirty work
- **THEN** the intent queue and previous committed presentation/settings are reconciled before the existing unsaved-work guard resumes

### Requirement: Presentation Settings and contextual keyboard overlays

A distinct presentation Settings entry SHALL expose labelled Light/Dark/System, HC and independent density plus the same live picker without changing repository metadata Settings. Picker arrows preview, Enter commits, Esc/outside/owner dismissal cancel. A single contextual keyboard owner SHALL preserve existing workbench shortcuts, suppress theme chord during IME/text editing and bound Ctrl+K Ctrl+T context to one second. Workbench-owned overlays SHALL use one stable managed host with topmost Escape/outside ownership, modal inert/trap/initial-return focus and dirty-save guard priority. Frame-focus presentation keys SHALL use separately validated forwarding; other save/close behavior remains unchanged.

#### Scenario: Picker from presentation Settings
- **WHEN** Settings opens the picker and arrows preview followed by Esc or outside dismissal
- **THEN** no durable selection is written, previous committed presentation returns and focus returns to the connected opener

#### Scenario: Keyboard contexts and dirty guard
- **WHEN** composition/editing, an expired chord, a topmost dialog or a dirty-save guard is active
- **THEN** exactly the permitted owner consumes keys, existing save/close/palette/Tab interactions remain valid, and late disposed registrations/frame messages cannot act

### Requirement: Explicit scoped consumer adoption and temporary exceptions

P01 SHALL adopt only the accepted selector/property scope in design.md, including changed inherited descendant colors. New controls/rows SHALL meet canonical compact/comfortable/coarse minima, focus and contrast. Exactly three user-accepted temporary exceptions apply: P01-GEOMETRY-LEGACY-01 retains titlebar35/status22/tabs35/breadcrumb26px and all existing descendants of those four bands including command25/status-button21 and their current coarse geometry until shell/basic-controls POST/archive; P01-NATIVE-CHROME-LEGACY-01 retains fixed native window background/overlay and OS decorations outside client-area atomicity until the same stage; P01-OVERLAY-LEGACY-01 retains existing feature-internal/diagram portal placements until their forms/Draw owners' POST/archive. No exception is an accessibility PASS or covers new components. All other selected Draw/iframe target obligations remain applicable. Historical compatibility assertions and tolerances MUST remain intact. The accepted P01-READONLY-STATE-01 explicitly changes only the new P01 unavailable restored-workspace manager-opening expectation to actual already-open pending-write readonly coverage; original failed source/assertions/results MUST remain verbatim raw evidence. New actual per-surface visual baselines require explicit human approval.

#### Scenario: Six-theme-density current runtime coverage
- **WHEN** P01 adoption is verified on actual current screens with Light/Dark/HC and both densities, media, zoom and viewport evidence
- **THEN** each selected consumer follows the current revision and the report separately discloses exact retained geometry/native/placement limitations without claiming their compliance

#### Scenario: Exact two-occurrence legacy transition
- **WHEN** reviewed FradeDiagramView insertion shifts either accepted original #FFFFFFAA [3195,3205) or #404040 [3283,3291) occurrence
- **THEN** value/context/order/hash/classification/reason/owner remain uniquely proven against saved raw source/inventory, or actual accepted semantic replacement deletes that occurrence; the other 122 entries stay identical and future moved/new literals still fail the unchanged checker

#### Scenario: Missing visual or performance proof
- **WHEN** actual screenshot approval, required state/security/a11y checks or measured request-to-authoritative p95 evidence is absent or fails
- **THEN** P01 cannot claim completion, POST PASS or archive; old screenshots/token pair PASS are not substitutes

#### Scenario: Closed inherited metadata and flow colors
- **WHEN** metadata check results, flow panel/loading/error/dirty/warnings, existing row hover/focus, bundle hint and reconnect menu/alertdialog are shown under Light/Dark/HC, both densities and actual forced colors
- **THEN** each accepted consumer pairs canonical foreground/background with applicable contrast and visible focus, while original actions, drafts, membership, undo and document semantics remain intact; retained feature overlay placements are disclosed independently, and absent reproducible runtime evidence blocks closure

### Requirement: Accepted readonly state and fixture readiness

P01 SHALL preserve the exact accepted readonly evidence and original two compatibility readiness preconditions defined in design.md, with the separately accepted E2E-07 and SaveAs additions specified below. The follow-up UI-DRAW-READONLY-INSPECT-01 SHALL belong to the forms/Draw consumer; it MUST NOT become a P01 supplier prerequisite. Historical FAIL and all remaining required checks MUST remain visible.

#### Scenario: Actual already-open manager becomes diagram readonly
- **WHEN** a real diagram write is pending or unknown through a declared isolated gate and original handler/DTO with FlowManager already open
- **THEN** native and embedded panels remain visible with disabled membership, retained draft/member bytes, actual contrast/focus across six theme/density states, forced colors and three viewports; repository creation permissions retain actual backend capabilities and domain/model/file semantics remain unchanged

#### Scenario: Restored readonly workspace preserves editing protection
- **WHEN** an actual readonly workspace is restored and a diagram is opened
- **THEN** Save is disabled, editing is blocked and actual persisted bytes are unchanged; unavailable readonly manager inspection remains a separate consumer-owned functional follow-up with preserved original failed evidence

#### Scenario: Existing inputs wait for actual presentation readiness
- **WHEN** existing root rename or iframe drag tests exercise their original behavior
- **THEN** root rename waits for the real dialog dismissal and iframe drag waits for exact applied revision, hidden curtain, loaded fonts and two frame paints before input, preserving every original assertion and tolerance; required targeted and full root regression failures still block P01

### Requirement: Accepted third compatibility fixture readiness

P01 SHALL restrict P01-BUNDLE-FRAME-COMPAT-01 to apps/desktop/tests/e2e/bundle-flows.spec.ts E2E-07 actual embedded readiness and diagnostic preparation, as accepted in design.md. It MUST preserve all original assertions, fixtures, actions and numerical tolerances, and MUST NOT alter production/feature/domain/routing/vendor/dependency/CI behavior. Independent focused PRE PASS MUST precede implementation. A wrong-layer or unexplained failure MUST stop repair; applicable full regression failures MUST block closure.

#### Scenario: Real reloaded bundle gesture is diagnosed before readiness repair
- **WHEN** unchanged E2E-07 fails to open the actual manager after rewriting and reloading its temporary diagram fixture
- **THEN** original bytes/FAIL are retained and actual geometry, viewport, hit target and real screenshot establish the cause; only approved same-frame revision/curtain/Save/fonts/paint readiness and actual DOM scroll/reprojection may precede the unchanged gesture/assertions

#### Scenario: Targeted success does not waive remaining gates
- **WHEN** the repaired original lifecycle test passes its intact assertions
- **THEN** fresh full root check:all, remaining runtime/visual acceptance, verify and cumulative POST are still required; no routing prerequisite or next numbered change is started

### Requirement: Accepted SaveAs published-file readiness

P01 SHALL restrict P01-WORKSPACE-SAVEAS-READINESS-01 to the exact node:fs existsSync import and workspace/alternate target-existence preconditions before the original readFile JSON expectations. It MUST preserve every original action, fixture, assertion and tolerance, the rename readiness and original atomic writer/DTO. A fresh independent focused PRE PASS MUST precede implementation. Acceptance is recorded in decisions/p01-saveas-bottom-accepted-20261001T105729Z.json; the original proposal remains immutable.

#### Scenario: Save As command completes before durable publication
- **WHEN** the original host Save As action has dispatched but its selected target is not yet published
- **THEN** the fixture waits for that actual target, then runs the unchanged roots/path/reopen/dirty/SaveAll JSON assertions; no fake file, catch/ignored rejection, retry or production writer change is permitted

### Requirement: Complete owned lower frame chrome

P01 SHALL include the exact .geTabContainer/.geTabScroller and descendant .geTab/.geControlTab/.gePageTab/.geButton targets, active page, hover and focus in its private lower-frame projection and measured consumer coverage, as explicitly accepted in design.md and decisions/p01-saveas-bottom-accepted-20261001T105729Z.json. Background/foreground/border and state roles MUST come from canonical snapshot tokens with effective forced mapping. Targets SHALL meet compact28/comfortable36, width≥24 and actual coarse44×44 outside all three unchanged temporary exceptions. Lower strip/control layout MUST be actually visible, unclipped and not cover a click target. Only owned DOM/CSS chrome/container geometry correction is allowed; graph view scale/translate, model/XML/prefs/authored paint/undo/selection/identity MUST remain unchanged. Meaningful regression RED MUST precede the sole bridge implementation repair; CSS-text snapshots alone are insufficient.

#### Scenario: Lower page/status strip follows six theme and density states
- **WHEN** actual Light/Dark/HC and both densities are applied to the pinned frame
- **THEN** the visible lower strip and div controls follow their canonical roles, active/hover/focus stay distinct and target/bounds measurements preserve unchanged document/graph/editor/undo/preferences state

#### Scenario: Lower strip under media zoom and rollback
- **WHEN** forced/coarse/reduced media,200% text zoom, accepted1280/1600/850 viewports, preview/cancel/rollback/disposal are exercised
- **THEN** measured effective palette, control dimensions, visibility and focus remain conforming without forbidden semantic APIs or mixed revision, and source-bound actual evidence records any blocker without a new exception

#### Scenario: Repair does not waive closure gates
- **WHEN** these two exact deltas have focused PRE and targeted GREEN
- **THEN** fresh full root, complete runtime/a11y coverage, human visual acceptance, verification/cumulative POST/archive remain required; STOP before P02, no routing dependency is introduced

## ADDED Requirements

### Requirement: Bounded lower frame keyboard accessibility
The private pinned-frame adapter SHALL expose accessible names, focusable button/group semantics and actual selected/disabled states for existing lower controls according to accepted P01-FRAME-LOWER-KEYBOARD-01. It SHALL provide contextual F6 entry/return, visual-order Tab/ShiftTab exit, focus-only Arrow/Home/End page navigation and exactly-once Enter/Space activation through unchanged original DOM handlers. It SHALL preserve editing/IME/dialog guards and existing save/close/presentation chords. It SHALL restore owned attributes/listeners on disposal and handle recreated vendor DOM without replacing vendor nodes/callbacks.

#### Scenario: Real lower focus entry and navigation
- **WHEN** an eligible user enters lower chrome through F6 and navigates its enabled targets
- **THEN** actual focus and canonical visible outline follow the named targets in visual order and permit return/exit without changing page selection, graph state, viewport or document data

#### Scenario: Original guarded lower action from keyboard
- **WHEN** an enabled existing lower action is activated by Enter or Space
- **THEN** its unchanged original DOM handler runs exactly once with its original capability and expected action semantics, while hidden/disabled targets are never forced and theme projection does not mutate semantic state

#### Scenario: Lower accessibility ownership teardown
- **WHEN** the private adapter is detached or vendor lower DOM is recreated
- **THEN** prior owned values and listeners are restored or correctly applied only to the new lower nodes, keeping graph/editor/frame identities, preferences and existing keyboard contracts intact

### Requirement: Proven lower-origin popup keyboard ownership
P01 SHALL adapt only actual lower-opener popup/submenu DOM in the existing private bridge under the exact accepted P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 design contract. Ownership SHALL bind a connected eligible opener, captured original menu instance and current participant generation. It SHALL preserve original nodes/handlers/capabilities and all excluded menu/dialog/domain boundaries. Original placement SHALL remain preferred when feasible; only accepted P01-LOWER-ORIGIN-POPUP-REFLOW-01 bounded owned DOM reflow may accommodate proven panels. Unknown, stale or ambiguous ownership MUST stop claimed accessibility success.

#### Scenario: Complete original menu and submenu action path
- **WHEN** an enabled existing lower page-menu or Pages control is opened by keyboard and its real action or submenu is selected
- **THEN** real named focus targets navigate by Arrow/Home/End and Enter/Space performs the corresponding unchanged original DOM gesture once with actual hidden/disabled/checkable state; deliberate action effects match original handlers and downstream dialogs remain keyboard-operable without outside-scope adaptation

#### Scenario: Unowned menus retain their original behavior
- **WHEN** canvas/toolbar/sidebar/plugin or unrelated popup instances are shown, or stale ownership loses its generation or actual row relationship
- **THEN** the lower adapter neither applies menu attributes/styles/listeners nor invokes their actions; invalidated lower ownership restores its exact previous values and never activates stale nodes

#### Scenario: Cancellation teardown and presentation preservation
- **WHEN** an owned popup is canceled by Escape, exited by Tab/ShiftTab, dismissed by mouse, detached/recreated or reconciled during a theme transaction
- **THEN** original hide lifecycle and connected focus return/exit preserve exact attributes/listeners and semantic XML/model/file/authored paint/undo/selection/preferences/viewport/identities for presentation/navigation/cancellation; canonical palette/target/focus/text/icon and bounds oracles remain required across all accepted media/theme/density/viewports without a new exception

### Requirement: Bounded owned lower popup reflow

P01 SHALL restrict reflow to the exact accepted P01-LOWER-ORIGIN-POPUP-REFLOW-01 in design.md and its separate human acceptance. Proven connected current lower-origin panels SHALL retain original anchor/side when feasible; otherwise bounded first-party left/top/width/max-width and existing table/cell width/wrapping projection SHALL fit the actual iframe viewport with4px focus clearance and non-overlapping actionable targets. Actual text at200% and canonical target minima MUST remain intact without truncation, hidden or forced clicks. Reconciliation SHALL be bounded and compare-before-write; it MUST NOT change vendor callbacks, invoke fitting or semantic APIs, replace/reparent nodes, alter actions/content or mutate other menus/domain/routing/persistence. Unachievable contracted bounds MUST produce a concrete blocker and STOP. Exact prior inline values/priorities/style-attribute presence SHALL restore on all ownership/lifecycle invalidations, including retained cancellation lease.

#### Scenario: Original fitting overlaps or exceeds current viewport
- **WHEN** proven lower root/submenu geometry at850x650 or actual text200/coarse/media exceeds the iframe viewport or covers an actionable target
- **THEN** bounded measured owned reflow chooses feasible non-overlapping widths/side, preserves localized text and canonical target/focus/contrast obligations, and original keyboard/pointer actions remain accessible with presentation-only state preservation

#### Scenario: Feasible original placement and unowned panels
- **WHEN** original placement already satisfies measured bounds, or an unowned/detached/obsolete panel is present
- **THEN** the original feasible anchor/side remains and excluded panels receive no reflow mutation or vendor action/fit call

#### Scenario: Reflow restores exact ownership state
- **WHEN** cancellation, resize, theme generation, prepare/stale activation, detach/recreation or disposal invalidates the owned projection
- **THEN** bounded reconciliation and original cancellation restore exact prior inline properties/priorities/style presence without a mutation loop, semantic write or loss of the proven cancellation lease; any impossible accommodation remains a reported blocker


### Requirement: Observable owned lower refusal after completed paint

Under separately accepted P01-LOWER-REFLOW-REFUSAL-01, proven lower impossible-fit SHALL terminate successful adoption/focus, restore exact owned state, cancel only the original current lower menu and report a concrete transient diagnostic through the actual authenticated frame participant into the existing themeError live region. It SHALL reuse the exact bounded existing REFUSED envelope and current painted context/operation. Pending transaction behavior and settled promises/barrier/durable state/health keys SHALL remain unchanged. Wrong/stale/superseded/disposed/forged/duplicate diagnostics SHALL be rejected. No generic vendor/domain error channel, frame reload/rejoin, semantic action, hidden-success target or new exception is permitted. Only the three production and three permanent test paths in the accepted design are authorized.

#### Scenario: Impossible lower chain after settled apply
- **WHEN** matching apply has already completed PAINTED and an original owned lower chain cannot fit
- **THEN** the actual parent live diagnostic is visible, successful adaptation/focus stops, exact owned styles/attributes restore and original lower cancellation preserves model/file/undo/selection/preferences/viewport/identities without re-settling or compensating the completed transaction

#### Scenario: Feasible original reopen after refusal
- **WHEN** the original opener is used normally after feasible viewport/media recovery
- **THEN** a fresh proven lower chain reconciles within canonical bounds and original actions remain usable without auto-reopen, false geometric recovery claim or repeated observer/RAF failure loop

#### Scenario: Current ownership rejects late forged refusal
- **WHEN** a lower diagnostic has wrong source/origin/id/generation/context/operation, invalid message bounds, superseded or disposed ownership, or is duplicate
- **THEN** it produces no diagnostic, reveal, settings write or semantic change; pending READY/PAINTED/REFUSED handling and exactly-once settlement retain their prior contracts

#### Scenario: B05 gates preserve incomplete P01
- **WHEN** the accepted B05 plan is strict-valid and fresh independent PRE passes
- **THEN** permanent meaningful bridge-to-parent RED precedes implementation and actual targeted/full/matrix checks, verification and automatic POST must pass before this repair closes; human visuals/full FUI/cumulative/archive remain open and no P02 begins

## ADDED Requirements

### Requirement: Exact three upper toolbar glyph paint ownership

P01 SHALL apply the human-accepted P01-UPPER-THREE-GLYPH-PAINT-01 only in the existing private Draw.io bridge to the three original View/Insert/Freehand SVG identities, selector/property bounds and lifecycle described in design.md. It SHALL reuse their unchanged original alpha silhouettes with canonical text.primary/effective forced colors and original18px geometry, opacity, state, target, handlers and actions. All other upper targets/vendor/domain/routing/persistence remain excluded. Required unknown ownership or unsupported composition SHALL block claimed closure.

#### Scenario: Proven original upper glyph follows active presentation
- **WHEN** one of the three connected original controls receives accepted presentation preview apply rollback or forced-color mapping
- **THEN** its entire actual glyph raster proves canonical effective foreground and required3:1 contrast through the independently validated design protocol while original resource geometry opacity capability actions and semantic state remain intact

#### Scenario: Changed excluded or late ownership receives no stale paint
- **WHEN** source bytes change or an unowned target appears or ownership is superseded disposed detached or replaced
- **THEN** only eligible exact current original resources may be adopted and exact prior owned properties and absence restore without overwriting new external vendor edits or mutating stale nodes

#### Scenario: Positive glyph proof cannot collapse to absence of prior failure
- **WHEN** the prior fixed-black upper-bound diagnostic no longer applies after projected paint
- **THEN** required GREEN still needs all declared same-Electron positive-negative controls and complete actual glyph raster reconstruction with minimum compatible effective-paint contrast at least3; empty ambiguous unsupported or CSS-only evidence is NOT_MEASURED and blocks closure

#### Scenario: Upper glyph delta observes original gates and scope
- **WHEN** the human-accepted coherent delta passes strict validation and fresh independent PRE
- **THEN** meaningful permanent RED precedes sole-bridge implementation and fresh targeted full-root runtime verify POST and visual acceptance remain required; old source callbacks evidence declarations and Routing independence are preserved with no P02 progression


#### Scenario: Original active opacity remains measurable
- **WHEN** an enabled original upper control is actually pressed and the pinned vendor opacity is0.75
- **THEN** the unchanged opacity is covered by exact same-Electron calibration and full-raster proof with minimum3:1; no opacity override or unsupported-state PASS is allowed

#### Scenario: Handle release retains the painted glyph lease
- **WHEN** normal successful publication releases its prepared handle or preview cancel rolls back to a previous accepted theme
- **THEN** release retains the active projection and rollback paints the previous projection while only detach disposal or ownership loss restores original unprojected properties; pending superseded work cannot publish late

#### Scenario: Glyph digest failure occurs only inside a pending paint operation
- **WHEN** a new source needs native digest verification during current apply or rollback
- **THEN** all such work completes before PAINTED and current failure rejects the existing pending parent operation via REFUSED with no new late diagnostic; after PAINTED passive adoption uses only byte-exact positively verified cache entries without calling crypto and unknown bytes stay unowned

#### Scenario: Actual target and underlying backgrounds are distinct
- **WHEN** original hover or pressed upper chrome composites opaque target background T over a different opaque underlying background P through retained scalar q
- **THEN** the separate independently reviewed V6 protocol calibrates those exact two layers and verifies every actual glyph pixel and every compatible effective foreground against independently observed effective target background B; V5's equal-background guard remains unchanged and no CSS-only or substituted-background PASS is permitted

#### Scenario: V6 reference completion precedes application inference
- **WHEN** paired-background V6 is proposed after the saved real composition blocker
- **THEN** fresh strict/PRE and all declared actual and synthetic controls pass before permanent RED or repair; reference-only results do not close required application contrast visual acceptance cumulative verification POST archive or P02


## ADDED Requirements

### Requirement: Exact accepted upper glyph applicability and FUI control revalidation

P01 SHALL honor the accepted control/state amendments recorded at openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-scope-acceptance-20261003T010923Z/acceptance.json. It SHALL preserve V6 minimum3:1 with canonical membership for every rendered enabled required original glyph, and distinguish original responsive absence and unavailable focus from numerical success. Only one fuiControlRun literal in the named BDD test support file MAY change after fresh PRE and actual12-case successful runtime on final full source. Historical evidence and original callbacks SHALL remain unchanged.

#### Scenario: Original narrow controls are absent and recover without replacement
- **WHEN** original Insert and Freehand are hidden by their existing responsive layout at850x650
- **THEN** evidence explicitly records NOT_RENDERED_ORIGINAL_RESPONSIVE, same original identities and source, display:none, zero bounds and unowned restoration, then proves those same nodes/handlers/URLs regain canonical projection and measured V6 paint when widened; no hidden contrast PASS or forced visibility is permitted

#### Scenario: Original unavailable focus remains a P01 blocker
- **WHEN** an exact original upper anchor does not accept focus with its unchanged attributes
- **THEN** the focused paint evidence records BLOCKED_ORIGINAL_FOCUS_UNAVAILABLE and keeps the separate UI-owned keyboard substage and cumulative2.4/2.5/3.2/archive blocked; paint-focused POST cannot waive accessibility or approve screenshots

#### Scenario: Fresh valid FUI controls follow the final assertion source
- **WHEN** all12original FUI cases actually pass on the final unchanged full Electron assertion source after fresh PRE
- **THEN** the new immutable control fixture and current registry bind that actual command/report/source/callback execution, the sole fuiControlRun literal points to it with all remaining bytes exact, and both positives and14negatives rerun against that valid baseline before claiming integrity

#### Scenario: Applicability is not a general unknown-state waiver
- **WHEN** disabled behavior lacks an original trigger or a visible composition is unknown
- **THEN** evidence remains NOT_RUN or BLOCKED/NOT_MEASURED respectively with no guessed PASS, relaxed numerical guard, production expansion or cumulative closure


## ADDED Requirements

### Requirement: Exact upper-three keyboard and proven popup ownership

P01 SHALL implement only accepted P01-UPPER-THREE-KEYBOARD-OWNED-POPUPS-01 under openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-keyboard-planning-20261003T105545Z/acceptance.json, exact proposal SHA256 6087da74572ba6665cfbe1471edbc67d17cab0b5e94784e3a7e41c3ed3821e34. It SHALL preserve the accepted paint/transaction/domain contracts and implement the exact anchor, original gesture, popup ownership, restoration and exclusions in the effective design amendment. This is the explicit bounded successor to the previous paint-only keyboard restriction; unknown or unowned controls SHALL NOT gain adaptation. Existing lower contracts and original tests SHALL remain intact.

#### Scenario: Exact enabled anchors expose truthful keyboard operation
- **WHEN** a connected verified View Insert or Freehand control is eligible under current presentation and original capability
- **THEN** it has its original accessible name truthful state and visible focus and Enter Space or menu ArrowDown invokes exactly one original registered DOM gesture while natural Tab and lower contextual chords remain intact

#### Scenario: Original menu transition proves both opener and instance
- **WHEN** a real pointer or keyboard action creates an original View or Insert menu
- **THEN** adaptation requires matching currentMenuElt opener currentMenu instance connected original panel and current frame generation; another toolbar canvas lower plugin or dialog instance stays unowned

#### Scenario: Deepest submenu and root cancellation preserve data
- **WHEN** keyboard navigates an actually owned original submenu or Escape is pressed after pointer or keyboard opening
- **THEN** only the captured current original submenu or root hide lifecycle runs and focus returns to its current parent row or opener with exact document files preferences undo selection viewport identities and original callbacks preserved; Tab exits through normal traversal

#### Scenario: Ownership expiry restores only still-owned values
- **WHEN** source menu opener or generation changes or prepare apply rollback release refusal detach disposal occurs
- **THEN** stale actions and writes stop, prepare stays pure, release retains current successful projection and exact owned values restore without overwriting subsequent vendor edits or causing observer churn

#### Scenario: Original Freehand action retains its separate window boundary
- **WHEN** the exact Freehand anchor is activated through its original DOM gesture
- **THEN** actual selected state follows original behavior with deliberate first-action effects explicitly recorded; its window internals remain excluded and subsequent presentation navigation preserves semantic state without a fake accessibility PASS

#### Scenario: Accepted keyboard scope does not waive cumulative gates
- **WHEN** the coherent plan passes strict validation and fresh stage-assigned independent PRE
- **THEN** meaningful RED precedes sole-bridge repair and required real six-state focus action preservation current-FUI full checks verification and independent POST follow; unavailable states new sizing reflow or composition defects and human visual acceptance remain open blockers without another exception or P02 progression


## ADDED Requirements

### Requirement: Exact unclipped focus decoration preserves original toolbar

P01 SHALL apply accepted P01-UPPER-FOCUS-UNCLIPPED-PROJECTION-01 under openspec/changes/frade-p01-theme-core/evidence/p01-upper-focus-planning-20261003T161542Z/acceptance.json, exact proposal SHA25632ddae6f2896fe57bbdb506337fd70199d477f7ea7992e7739a5bae563d47f0b. Effective design bounds SHALL remain normative; prior exclusions and gates remain intact.

#### Scenario: Focus escapes clipping without changing original layout
- **WHEN** a current verified enabled original View Insert or Freehand anchor has visible keyboard focus
- **THEN** exactly one inert pointer-transparent bridge-created frame-body decoration shows canonical2px positive-offset2px focus with at most1px canonical backing around its stroke and at most5px extent while original target opacity geometry toolbar layout callbacks and document state remain exact

#### Scenario: Visual ownership cannot cross menus modal or expired context
- **WHEN** focus menu modal source capability frame ownership scroll resize media text or lifecycle changes
- **THEN** exact current proof governs bounded reprojection or removal and the decoration cannot cover another required control escape the iframe cross a modal or be recreated by stale queued work; prepare stays pure release retains rollback restores and disposal removes owned presentation

#### Scenario: Complete real contour evidence retains historical blockers
- **WHEN** accepted extension passes coherent-plan validation and fresh independent PRE
- **THEN** permanent RED precedes production and actual complete contour contrast visibility six-state preservation current glyph FUI full checks verification and POST remain required; straight-band samples CSS declarations acceptance and historic PASS cannot close unknown composition human visuals or cumulative P01
