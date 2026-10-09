# Spec Delta

Current acceptance precedence: P01-MINOR-DEFERRAL-01 at the end of this artifact governs only the three explicitly accepted deferred assertion failures. Earlier dated statuses and raw FAIL remain historical. All other scope/gates and original behavior targets remain mandatory.


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

Theme changes SHALL affect view presentation only. Persisted JSON/XML, authored page/background images/node/edge paint, route/endpoint semantics, model state, undo/redo, selection and editor/graph/iframe identity MUST remain unchanged. No theme transaction SHALL invoke persisted background/grid convenience APIs or trigger autosave/settings preference writes.

#### Scenario: Native and embedded documents retain authored paint
- **WHEN** a dirty native and pinned embedded diagram with nondefault authored paint previews, commits, cancels and redraws under forced colors
- **THEN** saved document bytes, settings storage, model/undo/selection/identities stay unchanged while only UI view projection follows the current theme

#### Scenario: Forged or stale frame acknowledgement
- **WHEN** a foreign source/origin or obsolete frame generation sends an acknowledgement
- **THEN** it is rejected and cannot permit publication or reveal a mixed revision

### Requirement: Presentation consumer isolation - Authenticated frame acknowledgements

Frame presentation acknowledgements MUST validate source, origin, session/generation, membership, transaction/revision and exact applied-paint phase.

#### Scenario: Forged or stale frame acknowledgement
- **WHEN** a foreign source/origin or obsolete frame generation sends an acknowledgement
- **THEN** it is rejected and cannot permit publication or reveal a mixed revision

### Requirement: Scoped durable presentation settings

Presentation settings SHALL use a fixed userData profile location, strict versioned bounded DTO and host-owned serialized intent/revision/CAS queue. Preview MUST perform no durable write. Unknown roles/fields, arbitrary paths, child frames and untrusted pages MUST be rejected. System is the default and density persists independently. Workspace overrides MUST require explicit opt-in and SHALL NOT install packages, read/write repository data or grant execution.

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

### Requirement: Scoped durable presentation settings - Validated first paint

Bootstrap SHALL resolve and apply validated settings before first normal UI paint; window visibility requires native readiness and matching presentation readiness.

#### Scenario: Commit and restart
- **WHEN** Light and comfortable density commit successfully and the desktop restarts under OS Dark
- **THEN** the first shown normal UI is Light/comfortable with the authoritative profile selection, preserving existing health API keys

#### Scenario: Malformed persisted settings
- **WHEN** startup reads invalid, stale or unreadable profile settings
- **THEN** validated offline fallback and truthful diagnostics are used before any normal view is shown, or an explicit safe recovery state remains closed

### Requirement: Observable transaction lifecycle

Every required ready web-content participant SHALL acknowledge the same revision after applied paint before reveal. A neutral system-color client-area curtain SHALL paint before participant writes and remain through any durable reconciliation/compensation. Cancellation and membership changes in every active phase SHALL invalidate stale handles/ACKs and reconcile both presentation and durable state.

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

### Requirement: Observable transaction lifecycle - Bounded membership and recovery

Joining consumers SHALL remain hidden until accepted current revision; churn has at most one safe reprepare. Unrecoverable rollback or unavailable required participant MUST block success and remain an accessible recovery state with dirty editors retained. Prepare/commit-or-rollback ACK deadlines are 2 seconds, host write/readback and reconciliation each 5 seconds, bootstrap handshake 5 seconds.

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

A distinct presentation Settings entry SHALL expose labelled Light/Dark/System, HC and independent density plus the same live picker without changing repository metadata Settings. Picker arrows preview, Enter commits, Esc/outside/owner dismissal cancel. A single contextual keyboard owner SHALL preserve existing workbench shortcuts, suppress theme chord during IME/text editing and bound Ctrl+K Ctrl+T context to one second.

#### Scenario: Picker from presentation Settings
- **WHEN** Settings opens the picker and arrows preview followed by Esc or outside dismissal
- **THEN** no durable selection is written, previous committed presentation returns and focus returns to the connected opener

#### Scenario: Keyboard contexts and dirty guard
- **WHEN** composition/editing, an expired chord, a topmost dialog or a dirty-save guard is active
- **THEN** exactly the permitted owner consumes keys, existing save/close/palette/Tab interactions remain valid, and late disposed registrations/frame messages cannot act

### Requirement: Presentation Settings and contextual keyboard overlays - Managed overlays and frame forwarding

Workbench-owned overlays SHALL use one stable managed host with topmost Escape/outside ownership, modal inert/trap/initial-return focus and dirty-save guard priority. Frame-focus presentation keys SHALL use separately validated forwarding; other save/close behavior remains unchanged.

#### Scenario: Keyboard contexts and dirty guard
- **WHEN** composition/editing, an expired chord, a topmost dialog or a dirty-save guard is active
- **THEN** exactly the permitted owner consumes keys, existing save/close/palette/Tab interactions remain valid, and late disposed registrations/frame messages cannot act

### Requirement: Explicit scoped consumer adoption and temporary exceptions

P01 SHALL adopt only the accepted selector/property scope in design.md, including changed inherited descendant colors. New controls/rows SHALL meet canonical compact/comfortable/coarse minima, focus and contrast.

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

### Requirement: Explicit scoped consumer adoption and temporary exceptions - Retained shell geometry

P01 MUST preserve these constraints: Exactly three user-accepted temporary exceptions apply: P01-GEOMETRY-LEGACY-01 retains titlebar35/status22/tabs35/breadcrumb26px and all existing descendants of those four bands including command25/status-button21 and their current coarse geometry until shell/basic-controls POST/archive;

#### Scenario: Six-theme-density current runtime coverage
- **WHEN** P01 adoption is verified on actual current screens with Light/Dark/HC and both densities, media, zoom and viewport evidence
- **THEN** each selected consumer follows the current revision and the report separately discloses exact retained geometry/native/placement limitations without claiming their compliance

### Requirement: Explicit scoped consumer adoption and temporary exceptions - Retained native chrome and portal placement

P01 MUST preserve these constraints: P01-NATIVE-CHROME-LEGACY-01 retains fixed native window background/overlay and OS decorations outside client-area atomicity until the same stage; P01-OVERLAY-LEGACY-01 retains existing feature-internal/diagram portal placements until their forms/Draw owners' POST/archive.

#### Scenario: Six-theme-density current runtime coverage
- **WHEN** P01 adoption is verified on actual current screens with Light/Dark/HC and both densities, media, zoom and viewport evidence
- **THEN** each selected consumer follows the current revision and the report separately discloses exact retained geometry/native/placement limitations without claiming their compliance

### Requirement: Explicit scoped consumer adoption and temporary exceptions - Exception limits and immutable assertions

No exception is an accessibility PASS or covers new components. All other selected Draw/iframe target obligations remain applicable. Historical compatibility assertions and tolerances MUST remain intact.

#### Scenario: Six-theme-density current runtime coverage
- **WHEN** P01 adoption is verified on actual current screens with Light/Dark/HC and both densities, media, zoom and viewport evidence
- **THEN** each selected consumer follows the current revision and the report separately discloses exact retained geometry/native/placement limitations without claiming their compliance

#### Scenario: Missing visual or performance proof
- **WHEN** actual screenshot approval, required state/security/a11y checks or measured request-to-authoritative p95 evidence is absent or fails
- **THEN** P01 cannot claim completion, POST PASS or archive; old screenshots/token pair PASS are not substitutes

#### Scenario: Closed inherited metadata and flow colors
- **WHEN** metadata check results, flow panel/loading/error/dirty/warnings, existing row hover/focus, bundle hint and reconnect menu/alertdialog are shown under Light/Dark/HC, both densities and actual forced colors
- **THEN** each accepted consumer pairs canonical foreground/background with applicable contrast and visible focus, while original actions, drafts, membership, undo and document semantics remain intact; retained feature overlay placements are disclosed independently, and absent reproducible runtime evidence blocks closure

### Requirement: Explicit scoped consumer adoption and temporary exceptions - Readonly evidence and visual acceptance

The accepted P01-READONLY-STATE-01 explicitly changes only the new P01 unavailable restored-workspace manager-opening expectation to actual already-open pending-write readonly coverage; original failed source/assertions/results MUST remain verbatim raw evidence. New actual per-surface visual baselines require explicit human approval.

#### Scenario: Missing visual or performance proof
- **WHEN** actual screenshot approval, required state/security/a11y checks or measured request-to-authoritative p95 evidence is absent or fails
- **THEN** P01 cannot claim completion, POST PASS or archive; old screenshots/token pair PASS are not substitutes

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

P01 SHALL restrict P01-BUNDLE-FRAME-COMPAT-01 to apps/desktop/tests/e2e/bundle-flows.spec.ts E2E-07 actual embedded readiness and diagnostic preparation, as accepted in design.md. It MUST preserve all original assertions, fixtures, actions and numerical tolerances, and MUST NOT alter production/feature/domain/routing/vendor/dependency/CI behavior.

#### Scenario: Real reloaded bundle gesture is diagnosed before readiness repair
- **WHEN** unchanged E2E-07 fails to open the actual manager after rewriting and reloading its temporary diagram fixture
- **THEN** original bytes/FAIL are retained and actual geometry, viewport, hit target and real screenshot establish the cause; only approved same-frame revision/curtain/Save/fonts/paint readiness and actual DOM scroll/reprojection may precede the unchanged gesture/assertions

#### Scenario: Targeted success does not waive remaining gates
- **WHEN** the repaired original lifecycle test passes its intact assertions
- **THEN** fresh full root check:all, remaining runtime/visual acceptance, verify and cumulative POST are still required; no routing prerequisite or next numbered change is started

### Requirement: Accepted third compatibility fixture readiness - PRE and failure gates

Independent focused PRE PASS MUST precede implementation. A wrong-layer or unexplained failure MUST stop repair; applicable full regression failures MUST block closure.

#### Scenario: Targeted success does not waive remaining gates
- **WHEN** the repaired original lifecycle test passes its intact assertions
- **THEN** fresh full root check:all, remaining runtime/visual acceptance, verify and cumulative POST are still required; no routing prerequisite or next numbered change is started

### Requirement: Accepted SaveAs published-file readiness

P01 SHALL restrict P01-WORKSPACE-SAVEAS-READINESS-01 to the exact node:fs existsSync import and workspace/alternate target-existence preconditions before the original readFile JSON expectations. It MUST preserve every original action, fixture, assertion and tolerance, the rename readiness and original atomic writer/DTO.

#### Scenario: Save As command completes before durable publication
- **WHEN** the original host Save As action has dispatched but its selected target is not yet published
- **THEN** the fixture waits for that actual target, then runs the unchanged roots/path/reopen/dirty/SaveAll JSON assertions; no fake file, catch/ignored rejection, retry or production writer change is permitted

### Requirement: Accepted SaveAs published-file readiness - Accepted authority and PRE

A fresh independent focused PRE PASS MUST precede implementation. Acceptance is recorded in decisions/p01-saveas-bottom-accepted-20261001T105729Z.json; the original proposal remains immutable.

#### Scenario: Save As command completes before durable publication
- **WHEN** the original host Save As action has dispatched but its selected target is not yet published
- **THEN** the fixture waits for that actual target, then runs the unchanged roots/path/reopen/dirty/SaveAll JSON assertions; no fake file, catch/ignored rejection, retry or production writer change is permitted

### Requirement: Complete owned lower frame chrome

P01 SHALL include the exact .geTabContainer/.geTabScroller and descendant .geTab/.geControlTab/.gePageTab/.geButton targets, active page, hover and focus in its private lower-frame projection and measured consumer coverage, as explicitly accepted in design.md and decisions/p01-saveas-bottom-accepted-20261001T105729Z.json. Background/foreground/border and state roles MUST come from canonical snapshot tokens with effective forced mapping.

#### Scenario: Lower page/status strip follows six theme and density states
- **WHEN** actual Light/Dark/HC and both densities are applied to the pinned frame
- **THEN** the visible lower strip and div controls follow their canonical roles, active/hover/focus stay distinct and target/bounds measurements preserve unchanged document/graph/editor/undo/preferences state

#### Scenario: Lower strip under media zoom and rollback
- **WHEN** forced/coarse/reduced media,200% text zoom, accepted1280/1600/850 viewports, preview/cancel/rollback/disposal are exercised
- **THEN** measured effective palette, control dimensions, visibility and focus remain conforming without forbidden semantic APIs or mixed revision, and source-bound actual evidence records any blocker without a new exception

#### Scenario: Repair does not waive closure gates
- **WHEN** these two exact deltas have focused PRE and targeted GREEN
- **THEN** fresh full root, complete runtime/a11y coverage, human visual acceptance, verification/cumulative POST/archive remain required; STOP before P02, no routing dependency is introduced

### Requirement: Complete owned lower frame chrome - Target geometry and semantic isolation

Targets SHALL meet compact28/comfortable36, width≥24 and actual coarse44×44 outside all three unchanged temporary exceptions. Lower strip/control layout MUST be actually visible, unclipped and not cover a click target. Only owned DOM/CSS chrome/container geometry correction is allowed; graph view scale/translate, model/XML/prefs/authored paint/undo/selection/identity MUST remain unchanged.

#### Scenario: Lower page/status strip follows six theme and density states
- **WHEN** actual Light/Dark/HC and both densities are applied to the pinned frame
- **THEN** the visible lower strip and div controls follow their canonical roles, active/hover/focus stay distinct and target/bounds measurements preserve unchanged document/graph/editor/undo/preferences state

#### Scenario: Lower strip under media zoom and rollback
- **WHEN** forced/coarse/reduced media,200% text zoom, accepted1280/1600/850 viewports, preview/cancel/rollback/disposal are exercised
- **THEN** measured effective palette, control dimensions, visibility and focus remain conforming without forbidden semantic APIs or mixed revision, and source-bound actual evidence records any blocker without a new exception

### Requirement: Complete owned lower frame chrome - Regression-first evidence

Meaningful regression RED MUST precede the sole bridge implementation repair; CSS-text snapshots alone are insufficient.

#### Scenario: Repair does not waive closure gates
- **WHEN** these two exact deltas have focused PRE and targeted GREEN
- **THEN** fresh full root, complete runtime/a11y coverage, human visual acceptance, verification/cumulative POST/archive remain required; STOP before P02, no routing dependency is introduced

## ADDED Requirements

### Requirement: Bounded lower frame keyboard accessibility

The private pinned-frame adapter SHALL expose accessible names, focusable button/group semantics and actual selected/disabled states for existing lower controls according to accepted P01-FRAME-LOWER-KEYBOARD-01. It SHALL provide contextual F6 entry/return, visual-order Tab/ShiftTab exit, focus-only Arrow/Home/End page navigation and exactly-once Enter/Space activation through unchanged original DOM handlers.

#### Scenario: Real lower focus entry and navigation
- **WHEN** an eligible user enters lower chrome through F6 and navigates its enabled targets
- **THEN** actual focus and canonical visible outline follow the named targets in visual order and permit return/exit without changing page selection, graph state, viewport or document data

#### Scenario: Original guarded lower action from keyboard
- **WHEN** an enabled existing lower action is activated by Enter or Space
- **THEN** its unchanged original DOM handler runs exactly once with its original capability and expected action semantics, while hidden/disabled targets are never forced and theme projection does not mutate semantic state

#### Scenario: Lower accessibility ownership teardown
- **WHEN** the private adapter is detached or vendor lower DOM is recreated
- **THEN** prior owned values and listeners are restored or correctly applied only to the new lower nodes, keeping graph/editor/frame identities, preferences and existing keyboard contracts intact

### Requirement: Bounded lower frame keyboard accessibility - Context guards and teardown

It SHALL preserve editing/IME/dialog guards and existing save/close/presentation chords. It SHALL restore owned attributes/listeners on disposal and handle recreated vendor DOM without replacing vendor nodes/callbacks.

#### Scenario: Lower accessibility ownership teardown
- **WHEN** the private adapter is detached or vendor lower DOM is recreated
- **THEN** prior owned values and listeners are restored or correctly applied only to the new lower nodes, keeping graph/editor/frame identities, preferences and existing keyboard contracts intact

### Requirement: Proven lower-origin popup keyboard ownership

P01 SHALL adapt only actual lower-opener popup/submenu DOM in the existing private bridge under the exact accepted P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 design contract. Ownership SHALL bind a connected eligible opener, captured original menu instance and current participant generation. It SHALL preserve original nodes/handlers/capabilities and all excluded menu/dialog/domain boundaries.

#### Scenario: Complete original menu and submenu action path
- **WHEN** an enabled existing lower page-menu or Pages control is opened by keyboard and its real action or submenu is selected
- **THEN** real named focus targets navigate by Arrow/Home/End and Enter/Space performs the corresponding unchanged original DOM gesture once with actual hidden/disabled/checkable state; deliberate action effects match original handlers and downstream dialogs remain keyboard-operable without outside-scope adaptation

#### Scenario: Unowned menus retain their original behavior
- **WHEN** canvas/toolbar/sidebar/plugin or unrelated popup instances are shown, or stale ownership loses its generation or actual row relationship
- **THEN** the lower adapter neither applies menu attributes/styles/listeners nor invokes their actions; invalidated lower ownership restores its exact previous values and never activates stale nodes

#### Scenario: Cancellation teardown and presentation preservation
- **WHEN** an owned popup is canceled by Escape, exited by Tab/ShiftTab, dismissed by mouse, detached/recreated or reconciled during a theme transaction
- **THEN** original hide lifecycle and connected focus return/exit preserve exact attributes/listeners and semantic XML/model/file/authored paint/undo/selection/preferences/viewport/identities for presentation/navigation/cancellation; canonical palette/target/focus/text/icon and bounds oracles remain required across all accepted media/theme/density/viewports without a new exception

### Requirement: Proven lower-origin popup keyboard ownership - Feasible placement and ownership failure

Original placement SHALL remain preferred when feasible; only accepted P01-LOWER-ORIGIN-POPUP-REFLOW-01 bounded owned DOM reflow may accommodate proven panels. Unknown, stale or ambiguous ownership MUST stop claimed accessibility success.

#### Scenario: Unowned menus retain their original behavior
- **WHEN** canvas/toolbar/sidebar/plugin or unrelated popup instances are shown, or stale ownership loses its generation or actual row relationship
- **THEN** the lower adapter neither applies menu attributes/styles/listeners nor invokes their actions; invalidated lower ownership restores its exact previous values and never activates stale nodes

#### Scenario: Cancellation teardown and presentation preservation
- **WHEN** an owned popup is canceled by Escape, exited by Tab/ShiftTab, dismissed by mouse, detached/recreated or reconciled during a theme transaction
- **THEN** original hide lifecycle and connected focus return/exit preserve exact attributes/listeners and semantic XML/model/file/authored paint/undo/selection/preferences/viewport/identities for presentation/navigation/cancellation; canonical palette/target/focus/text/icon and bounds oracles remain required across all accepted media/theme/density/viewports without a new exception

### Requirement: Bounded owned lower popup reflow

P01 SHALL restrict reflow to the exact accepted P01-LOWER-ORIGIN-POPUP-REFLOW-01 in design.md and its separate human acceptance. Proven connected current lower-origin panels SHALL retain original anchor/side when feasible; otherwise bounded first-party left/top/width/max-width and existing table/cell width/wrapping projection SHALL fit the actual iframe viewport with4px focus clearance and non-overlapping actionable targets.

#### Scenario: Original fitting overlaps or exceeds current viewport
- **WHEN** proven lower root/submenu geometry at850x650 or actual text200/coarse/media exceeds the iframe viewport or covers an actionable target
- **THEN** bounded measured owned reflow chooses feasible non-overlapping widths/side, preserves localized text and canonical target/focus/contrast obligations, and original keyboard/pointer actions remain accessible with presentation-only state preservation

#### Scenario: Feasible original placement and unowned panels
- **WHEN** original placement already satisfies measured bounds, or an unowned/detached/obsolete panel is present
- **THEN** the original feasible anchor/side remains and excluded panels receive no reflow mutation or vendor action/fit call

#### Scenario: Reflow restores exact ownership state
- **WHEN** cancellation, resize, theme generation, prepare/stale activation, detach/recreation or disposal invalidates the owned projection
- **THEN** bounded reconciliation and original cancellation restore exact prior inline properties/priorities/style presence without a mutation loop, semantic write or loss of the proven cancellation lease; any impossible accommodation remains a reported blocker

### Requirement: Bounded owned lower popup reflow - Text and mutation boundaries

Actual text at200% and canonical target minima MUST remain intact without truncation, hidden or forced clicks. Reconciliation SHALL be bounded and compare-before-write; it MUST NOT change vendor callbacks, invoke fitting or semantic APIs, replace/reparent nodes, alter actions/content or mutate other menus/domain/routing/persistence.

#### Scenario: Original fitting overlaps or exceeds current viewport
- **WHEN** proven lower root/submenu geometry at850x650 or actual text200/coarse/media exceeds the iframe viewport or covers an actionable target
- **THEN** bounded measured owned reflow chooses feasible non-overlapping widths/side, preserves localized text and canonical target/focus/contrast obligations, and original keyboard/pointer actions remain accessible with presentation-only state preservation

#### Scenario: Feasible original placement and unowned panels
- **WHEN** original placement already satisfies measured bounds, or an unowned/detached/obsolete panel is present
- **THEN** the original feasible anchor/side remains and excluded panels receive no reflow mutation or vendor action/fit call

### Requirement: Bounded owned lower popup reflow - Impossible bounds and restoration

Unachievable contracted bounds MUST produce a concrete blocker and STOP. Exact prior inline values/priorities/style-attribute presence SHALL restore on all ownership/lifecycle invalidations, including retained cancellation lease.

#### Scenario: Reflow restores exact ownership state
- **WHEN** cancellation, resize, theme generation, prepare/stale activation, detach/recreation or disposal invalidates the owned projection
- **THEN** bounded reconciliation and original cancellation restore exact prior inline properties/priorities/style presence without a mutation loop, semantic write or loss of the proven cancellation lease; any impossible accommodation remains a reported blocker

### Requirement: Observable owned lower refusal after completed paint

Under separately accepted P01-LOWER-REFLOW-REFUSAL-01, proven lower impossible-fit SHALL terminate successful adoption/focus, restore exact owned state, cancel only the original current lower menu and report a concrete transient diagnostic through the actual authenticated frame participant into the existing themeError live region. It SHALL reuse the exact bounded existing REFUSED envelope and current painted context/operation.

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

### Requirement: Observable owned lower refusal after completed paint - Transaction isolation and diagnostic exclusions

Pending transaction behavior and settled promises/barrier/durable state/health keys SHALL remain unchanged. Wrong/stale/superseded/disposed/forged/duplicate diagnostics SHALL be rejected. No generic vendor/domain error channel, frame reload/rejoin, semantic action, hidden-success target or new exception is permitted. Only the three production and three permanent test paths in the accepted design are authorized.

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

P01 SHALL apply the human-accepted P01-UPPER-THREE-GLYPH-PAINT-01 only in the existing private Draw.io bridge to the three original View/Insert/Freehand SVG identities, selector/property bounds and lifecycle described in design.md. It SHALL reuse their unchanged original alpha silhouettes with canonical text.primary/effective forced colors and original18px geometry, opacity, state, target, handlers and actions. All other upper targets/vendor/domain/routing/persistence remain excluded.

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

### Requirement: Exact three upper toolbar glyph paint ownership - Unknown composition blocks closure

Required unknown ownership or unsupported composition SHALL block claimed closure.

#### Scenario: Positive glyph proof cannot collapse to absence of prior failure
- **WHEN** the prior fixed-black upper-bound diagnostic no longer applies after projected paint
- **THEN** required GREEN still needs all declared same-Electron positive-negative controls and complete actual glyph raster reconstruction with minimum compatible effective-paint contrast at least3; empty ambiguous unsupported or CSS-only evidence is NOT_MEASURED and blocks closure

## ADDED Requirements

### Requirement: Exact accepted upper glyph applicability and FUI control revalidation

P01 SHALL honor the accepted control/state amendments recorded at openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-scope-acceptance-20261003T010923Z/acceptance.json. It SHALL preserve V6 minimum3:1 with canonical membership for every rendered enabled required original glyph, and distinguish original responsive absence and unavailable focus from numerical success.

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

### Requirement: Exact accepted upper glyph applicability and FUI control revalidation - Source-bound FUI control refresh

Only one fuiControlRun literal in the named BDD test support file MAY change after fresh PRE and actual12-case successful runtime on final full source. Historical evidence and original callbacks SHALL remain unchanged. The separate accepted P01-ARCHIVE-EVIDENCE-LOCATOR-01 permits only test-only evidence location resolution at the exact active or 2026-10-09 archive root, without changing logical IDs, raw bytes, assertions or negative controls.

#### Scenario: Fresh valid FUI controls follow the final assertion source
- **WHEN** all12original FUI cases actually pass on the final unchanged full Electron assertion source after fresh PRE
- **THEN** the new immutable control fixture and current registry bind that actual command/report/source/callback execution, the sole fuiControlRun literal points to it with all remaining bytes exact, and both positives and14negatives rerun against that valid baseline before claiming integrity

## ADDED Requirements

### Requirement: Exact upper-three keyboard and proven popup ownership

P01 SHALL implement only accepted P01-UPPER-THREE-KEYBOARD-OWNED-POPUPS-01 under openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-keyboard-planning-20261003T105545Z/acceptance.json, exact proposal SHA256 6087da74572ba6665cfbe1471edbc67d17cab0b5e94784e3a7e41c3ed3821e34. It SHALL preserve the accepted paint/transaction/domain contracts and implement the exact anchor, original gesture, popup ownership, restoration and exclusions in the effective design amendment.

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

### Requirement: Exact upper-three keyboard and proven popup ownership - Bounded successor and lower preservation

This is the explicit bounded successor to the previous paint-only keyboard restriction; unknown or unowned controls SHALL NOT gain adaptation. Existing lower contracts and original tests SHALL remain intact.

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


## ADDED Requirements

### Requirement: Accepted native resize fixture readiness preserves all invariants

P01 SHALL apply only the accepted native-resize readiness exception. Authority: openspec/changes/frade-p01-theme-core/evidence/p01-native-resize-planning-20261003T211000Z/acceptance.json; exact accepted P01-NATIVE-RESIZE-SETTLEMENT-FIXTURE-01 proposal SHA2565d1b7aee5541005b23b4d0d0e782a5a94d33176912c1a77967c9ee994cce0c57. Its separate acceptance supersedes only the historical PROPOSED header.

#### Scenario: Native transition completion precedes the protected observation
- **WHEN** either named fixture intentionally resizes the original frame and native shapes-panel transition completes after its initial resize event
- **THEN** bounded read-only readiness SHALL distinguish actual completed native state from an early stable interval before existing baseline or observation, preserve all original actions and assertions, and fail without forcing state when causality cannot be proven

#### Scenario: Frozen original tests and all failure evidence remain authoritative
- **WHEN** the accepted readiness delta passes coherent validation and fresh independent PRE before repair
- **THEN** exact reverse-delta proof SHALL restore original bytes and callbacks, other frozen assertions SHALL remain exact, and targeted six-state current FUI controls full regression verification and POST SHALL remain required without waiving B02 focus or cumulative visual blockers

### Requirement: Accepted native resize fixture readiness preserves all invariants - Exact frozen-callback exception

P01 MUST preserve these constraints: This narrow exception supersedes earlier blanket new-tails-only/frozen-callback restrictions only for readiness in the two named callbacks; original origin and every other restriction remain.

#### Scenario: Frozen original tests and all failure evidence remain authoritative
- **WHEN** the accepted readiness delta passes coherent validation and fresh independent PRE before repair
- **THEN** exact reverse-delta proof SHALL restore original bytes and callbacks, other frozen assertions SHALL remain exact, and targeted six-state current FUI controls full regression verification and POST SHALL remain required without waiving B02 focus or cumulative visual blockers

### Requirement: Accepted native resize fixture readiness preserves all invariants - Two named readiness insertion sites

P01 MUST preserve these constraints: Only apps/desktop/tests/e2e/ui-contract-theme.spec.ts may receive this repair: readiness before the existing intentional-resize baseline in P01-LOWER-matrix and before the observation interval in P01-REFLOW actual open chain reconciles resize and media without observer churn or semantic actions. A shared read-only helper may be appended to the new tail.

#### Scenario: Native transition completion precedes the protected observation
- **WHEN** either named fixture intentionally resizes the original frame and native shapes-panel transition completes after its initial resize event
- **THEN** bounded read-only readiness SHALL distinguish actual completed native state from an early stable interval before existing baseline or observation, preserve all original actions and assertions, and fail without forcing state when causality cannot be proven

### Requirement: Accepted native resize fixture readiness preserves all invariants - Immutable tests and prohibited shortcuts

P01 MUST preserve these constraints: No production, vendor, routing, domain, native-state forcing, animation disabling, expectation/action/tolerance changes, blind snapshots, arbitrary sleeps or swallowed errors. Every existing assertion remains exact. Preserve original186048-byte prefix and25callbacks as immutable origin; prove the exact permitted readiness-only delta reverses to all original bytes, while all other callbacks/bytes and original43044-byte/31callback unit origin stay exact.

#### Scenario: Frozen original tests and all failure evidence remain authoritative
- **WHEN** the accepted readiness delta passes coherent validation and fresh independent PRE before repair
- **THEN** exact reverse-delta proof SHALL restore original bytes and callbacks, other frozen assertions SHALL remain exact, and targeted six-state current FUI controls full regression verification and POST SHALL remain required without waiving B02 focus or cumulative visual blockers

## ADDED Requirements

### Requirement: Retained focus obeys existing live-anchor validity during pending prepare

P01 SHALL preserve the previously accepted exact focus contract during a pending prepare: prepare itself remains DOM-pure, and subsequent independent focus/capability/menu/modal changes SHALL invalidate an ineligible retained visual lease. Pending ownership SHALL NOT create or transfer a new decoration. This clarifies the existing accepted current-anchor and stale-work invariants without extending visual authority.

#### Scenario: Independent focus invalidation ends the retained lease
- **WHEN** pending prepare retains an otherwise valid decoration and its anchor loses focus or enabled state or an original menu or modal opens or focus moves to another anchor
- **THEN** only that stale private decoration is removed without native actions geometry or semantic changes and no pending task recreates it

#### Scenario: Valid pending prepare is pure and current apply can restore focus
- **WHEN** prepare retains the same eligible focused anchor and later current apply rollback or release occurs
- **THEN** pending validation makes no decorative writes while current presentation may restore its valid decoration under all previous ownership and contour limits

This is corrective planning within already accepted P01-UPPER-FOCUS-UNCLIPPED-PROJECTION-01 (proposal SHA25632ddae6f2896fe57bbdb506337fd70199d477f7ea7992e7739a5bae563d47f0b; acceptance evidence/p01-upper-focus-planning-20261003T161542Z/acceptance.json), not a new visual/scope exception. Its exact-current-focus, enabled-anchor, menu/modal exclusion and stale-work rules remain normative. The separately accepted native-resize exception authorizes only its two readiness callbacks and does not authorize this production repair. No guide/token/geometry/opacity/vendor/domain/routing/parent-IPC change; no P02 or task closure.

The open PRE concern is now deterministic: evidence/p01-pending-focus-red-20261003T224500Z preserves five FAIL; expanded evidence/p01-pending-focus-expanded-red-20261003T224900Z preserves seven FAIL. During a second pending prepare, early currentPresentation returns retain a ring after focus/window blur, disabled capability, a native menu/dialog or focus handoff. Prepare itself remains DOM-pure; retention is valid only while the same exact anchor remains eligible. No production fix has been applied.
Order: coherent artifacts/BDD and strict validation -> fresh automatic independent PRE under the unchanged exact P01 upper-three keyboard repair assignment in tasks.md -> regression-first sole-bridge repair -> all existing bridge units/static/build, current six-state V6/actions/keyboard/focus and native lower/reflow, final-source FUI12 before sole authorized control-literal/registry refresh, two positives/14 exact negative causes/BDD111, fresh full root -> OpenSpec verification -> independent POST. Source-bound earlier PASS does not validate later production. B02/full focus failures remain separately open until explained; human visuals NOT_APPROVED; cumulative/archive blocked. No new model decision or scope waiver.

## ADDED Requirements

### Requirement: Upper paint acknowledgement follows accepted projection ownership

The final upper-glyph paint ownership comparison SHALL cover only the exact positively verified accepted View Insert and Freehand projection sources. Unowned native toolbar resources SHALL remain unowned and SHALL NOT veto that projection solely by changing their own resource during paint. All existing bounded discovery verification failure and current-owner guards SHALL remain effective.

#### Scenario: Unowned native resource changes during paint
- **WHEN** the native Fullscreen or Format resource changes between paint frames while the positively verified projection set remains exactly unchanged
- **THEN** the three-glyph participant can acknowledge its own completed paint without adopting modifying or asserting coverage of those native resources

#### Scenario: An admitted source changes during paint
- **WHEN** the positively verified projection set membership node URL bytes or current owner changes before acknowledgement
- **THEN** the current operation retains the applicable refusal or stale-inert behavior and never turns an invalid projection into PAINTED


## Corrective upper paint acknowledgement boundary

This corrective plan remains within accepted P01-UPPER-THREE-GLYPH-PAINT-01 and its exact View/Insert/Freehand SVG identities. It proposes no fourth target, new visual property, token, geometry, handler, parent protocol, native/vendor/domain/routing change or timing exception. It does not reuse the pending-focus PRE as approval for this different repair. A fresh independent PRE must assess this interpretation; a material specification conflict stops for a human decision, never a reviewer-created authorization.

Evidence/p01-b02-transaction-diagnostic-20261004T011000Z preserves actual B02 REFUSED followed by rollback and wrong final theme. Evidence/p01-b02-glyph-diagnostic-20261004T011300Z/causal-audit.json records an additional actual failure: at frame width501, between the two paint frames the original unowned Fullscreen and Format SVG resources change; the positively owned visible View node/resource remains exact, with original Insert/Freehand hidden. The final apply guard currently compares every decoded eligible toolbar source, including these expressly unowned controls. Classification ABSTRACTION_BOUNDARY. Private beforePaint state was not instrumented; attribution combines passive actual snapshots with the inspected predicate, and must gain deterministic unit RED. Temporary diagnostic clones are removed with exact full-source restoration; all raw failures remain immutable.

Repair only apps/desktop/src/main/drawio-theme-bridge.ts: keep bounded full-selector discovery/digest verification and its existing failures intact, but compare the before/after-paint membership, node identity, exact original URL and bytes for only the positively verified accepted three-resource projection. Use the existing byte-exact positive cache; no new title/index/unknown-resource allowlist. An unowned resource change must not veto this three-glyph ownership ACK. A change, loss, replacement, newly admitted member or URL/bytes change in that positively owned set must still refuse the current pending operation, never emit PAINTED. Keep the256candidate/4096byte limits, three verification passes, existing deadlines, failed-native-digest behavior, pure prepare, synchronous no-new-digest path, all async owner/epoch/root/disposal checks, no post-PAINTED digest and no stale cache/ACK. Do not change native Fullscreen/Format behavior or project them.

After coherent strict validation and fresh stage-assigned PRE PASS, append meaningful RED only in the already-authorized unit/Electron tails: unrelated native resource transition during the two paint frames is ignored while adopted-target mutation remains rejected; exact original source/node/handler/geometry/persisted preservation, unknown non-adoption and existing bounded failure/teardown guards remain. Implement only after RED. Re-run all bridge units, actual original B02, six-state original glyph V6/actions/keyboard/focus/lower/reflow and new pending-focus coverage, final-source FUI12 before the already-authorized one-literal binding refresh, two positive/14 exact negative controls/BDD111, affected static/build/compliance/pinned-assets/boundaries and fresh full root. Then OpenSpec verify and independent POST. A focused PASS cannot close P01 tasks2.4/2.5/3.1/3.2, waive unavailable states or supply human visual approval.

Current pending-focus repair is separate PRE-approved work: bridge71PASS, actual six-state pending-focus6PASS/12invalidation observations, original actions/keyboard/popup/focus/lower/reflow31PASS, source/binary unchanged in each run. These do not waive B02, missing fresh V6/full root/POST or prior desktop116PASS/13FAIL. P01 remains5/10, human visuals NOT_APPROVED, P02–P07 NOT_STARTED; Routing independent. Reviewer model/effort remains the exact current tasks row: Stage P01 upper-three keyboard repair PRE gpt-6-astra/xhigh; POST gpt-6-astra/xhigh. This plan changes no model selection.

## PRE correction: retained projection ownership before PAINTED

The focused PRE saved at evidence/p01-upper-paint-boundary-pre-received-20261004T014400Z is FAIL (report SHA2564581d40936aeef7d9fbc528d23d4ba311f43e4bffca5a7b609c754f21711820d). It confirms that excluding unowned Fullscreen/Format from the comparison fits the accepted three-resource scope, but rejects cache-only validation. This section supersedes only the earlier incomplete description of that final check. Production glyph ACK repair remains NOT_IMPLEMENTED; a fresh PRE is required.

At the pre-paint boundary retain the exact positively verified source set AND its actual bridge-owned projection records. At final acknowledgement require unchanged admitted set, node, original URL/bytes and current epoch/request/root ownership, plus the same retained ownership record for each admitted node, exact private marker and every currently owned projected property/priority (and the ownership class/source proof). Merely rediscovering the same bytes in the positive cache is insufficient. upperCandidates may revoke a record and restore the original resource; that must not erase evidence of the lost lease or allow a same-node/same-URL/same-bytes false ACK. Missing or changed retained projection must refuse the current pending operation. Do not repair/repaint/re-adopt/retry or run a new digest to turn that failed attempt into success.

Keep all previously stated bounds, pending verification failures, positive-only cache, synchronous no-new-digest timing, original geometry/opacity/actions/persistence and stale-inert lifecycle guards. Unknown unowned resource changes are excluded only from the final owned-set comparison and never acquire projection authority. Existing discovery256/bytes4096/three-pass/deadline failures remain mandatory.

After fresh PRE PASS, meaningful appended RED must cover same-node/same-original-URL/same-bytes loss of projected background-image, private marker and another owned property/priority during paint, alongside admitted node/resource replacement and the unrelated-native-resource success case. Assert actual current matching REFUSED/no matching PAINTED, no repair/repaint/digest or native/semantic action, and intact original resource restoration/teardown. Exercise both apply and rollback where applicable. Superseded/released/disposed work remains inert. Existing tests are immutable; new cases must expose the old false acknowledgement instead of merely restating implementation. Then implement the smallest sole-bridge guard and run all previously required actual/regression/full/verify/POST steps.

Evidence precision correction: the first six-case pending-focus runtime record's queueMicrotask comparison did not establish that the original prepare handler had executed. Historical raw PASS records remain unchanged, but that specific actual-runtime purity claim is withdrawn. A new-tail-only fixture repair reads the original child DOM only after the parent observed actual original READY, correlates exact contexts and retains all original assertions/deadlines. Current actual six-state and final-source FUI/controls/static revalidation are required for that test delta. Unit prepare-purity evidence is distinct and remains unchanged.

## Accepted P01-MINOR-DEFERRAL-01 checkpoint exception

Authority: [p01-minor-deferral-20261009T040325Z.md](../../decisions/p01-minor-deferral-20261009T040325Z.md), decision SHA256 b308ce5e4f1a58005c0105ea3dc3bcbe2574a988003b80f49110adf86bc920b1; immutable acceptance record openspec/changes/frade-p01-theme-core/evidence/p01-minor-deferral-20261009T040325Z/acceptance.json. The direct user decision accepts exactly three existing assertion failures as minor open follow-up defects. This amendment supersedes earlier unconditional closure-blocking claims only for those exact failures, never their raw FAIL or expected behavior. No production/test/assertion/timeout/snapshot/CI modification. Tasks remain5/10 pending remaining evidence, fresh PRE, verification, cumulative POST and human visual acceptance.

- P01-DEFERRED-FOCUS-DARK-01: First View anchor remains inactive after original focus(), 10000ms.
- P01-DEFERRED-FOCUS-LIGHT-01: First View anchor remains inactive after baseline3PASS and wide viewport, 10000ms.
- P01-DEFERRED-LOWER-LEFT-01: Whole-style restoration false for the same DIV.mxPopupMenu: inline left expected65px/actual0px. Identity/menuGone/vendor classes pass. Later assertions in the failed execution NOT_REACHED.

All three are OPEN_ACCEPTED_DEFERRED with cause NOT_PROVEN and repair NOT_STARTED. No repair/diagnosis of them is required for P01 closure. The unused four-schedule unit diagnosis and rejected V2 evidence protocol are WITHDRAWN_NOT_RUN0/1; earlier PRE FAIL6/FAIL4 and controls remain unchanged and supply no approval. Every other requirement and applicable failure still blocks. NOT_REACHED assertions require actual separate evidence; no whole-case exemption or green-seeking rerun. Original root exit1 stays FAIL. Acceptance with disclosed exceptions can be assessed only through fresh PRE, remaining-requirement evidence/verify, independent cumulative POST and actual human visual acceptance. No P02 is started by this amendment. Repair follow-up stays UI-owned.

## ADDED Requirements

### Requirement: Explicit deferred P01 acceptance preserves raw outcomes

For P01 checkpoint acceptance only, the three exact assertion failures recorded by P01-MINOR-DEFERRAL-01 MAY remain unresolved as user-accepted minor open defects. Earlier no-waiver closure requirements SHALL be superseded only for those failures. Expected behavior, original tests and every raw exit or failure SHALL remain unchanged.

#### Scenario: Three accepted defects remain honest open limitations
- **WHEN** P01 completion is assessed under the direct user decision
- **THEN** the two specified View-focus assertions and the specified lower-popup inline-left restoration assertion remain OPEN_ACCEPTED_DEFERRED without repair or false PASS while all other required checks verification POST and human visual acceptance remain mandatory

### Requirement: Deferred acceptance cannot absorb unrelated missing evidence

The exception SHALL match only the recorded assertions and contexts. Different assertions, additional failures, changed contexts and missing non-deferred evidence SHALL block closure. NOT_REACHED assertions SHALL NOT be treated as PASS. Rejected unused diagnostic controls SHALL NOT authorize production or execution.

#### Scenario: New failure or unreachable assertion is not waived
- **WHEN** a different failure or an uncovered downstream assertion appears during remaining requirement verification
- **THEN** the owner retains FAIL or NOT_RUN and stops closure instead of applying a whole-test exemption or weakening any test
