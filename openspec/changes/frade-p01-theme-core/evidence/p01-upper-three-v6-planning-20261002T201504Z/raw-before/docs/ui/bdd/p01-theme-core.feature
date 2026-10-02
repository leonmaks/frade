Feature: P01 pure theme resolution over the Frade UI contract v1.0
  This owner contract starts with executable pure-core behavior.
  Hot transactions, actual picker/Settings/adapters/media/screens/p95 remain pending P01 tasks.
  No scenario below proves runtime accessibility, installer or executable VS Code compatibility.

  @P01-RES-001 @FDS-009 @EXT-001
  Scenario: Offline Light Dark and HC are complete together
    Given only the immutable builtin theme registry
    When each kind is resolved without a network or installer
    Then all 31 semantic roles are complete and every named contrast pair passes

  @P01-RES-002 @FDS-009
  Scenario: Explicit Light keeps independent comfortable density under OS Dark
    Given explicit Light and comfortable density
    When the OS prefers Dark
    Then Light stays selected and canonical comfortable metrics remain independent

  @P01-RES-003 @EXT-004
  Scenario: Workspace overrides require opt-in and unknown roles stay diagnostic
    Given selected data plus global and ThemeId color overrides
    When workspace overrides are disabled then explicitly enabled
    Then the declared precedence applies and unknown roles are never injected

  @P01-RES-004 @A11Y-001 @A11Y-002
  Scenario: Low contrast repairs deterministically without mutating source data
    Given an external in-memory palette with invalid text contrast
    When it is resolved repeatedly
    Then repaired roles are diagnosed and every fixed pair passes without changing input

  @P01-RES-005 @A11Y-008
  Scenario: Forced system colors override an explicit palette without replacing HEX data
    Given explicit Light with a valid user color override
    When forced colors is active
    Then every presentation role uses the canonical system keyword while source HEX data stays intact

  # Controlled service tests use mocked host/barrier/participants, not Electron/filesystem/visible paint.

  @P01-TX-001 @controlled-service
  Scenario: joins hidden, waits for current applied-paint ACK, previews without persistence and cancels to published state
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When joins hidden, waits for current applied-paint ACK, previews without persistence and cancels to published state
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-002 @controlled-service
  Scenario: keeps curtain through apply ACK and durable publication; emits exactly one authoritative change
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When keeps curtain through apply ACK and durable publication; emits exactly one authoritative change
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-003 @controlled-service
  Scenario: refusal in %s restores all view/durable snapshots, dirty draft, selection and undo
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When refusal in %s restores all view/durable snapshots, dirty draft, selection and undo
    Then asserted view, durable ownership, barrier and authoritative events hold
    And every parameter row declared in the bound service test executes

  @P01-TX-004 @controlled-service
  Scenario: unknown response reconciles already-renamed settings before restoring/revealing; no false Saved
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When unknown response reconciles already-renamed settings before restoring/revealing; no false Saved
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-005 @controlled-service
  Scenario: unprovable %s retains recovery curtain and dirty editors with no success/reveal
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When unprovable %s retains recovery curtain and dirty editors with no success/reveal
    Then asserted view, durable ownership, barrier and authoritative events hold
    And every parameter row declared in the bound service test executes

  @P01-TX-006 @controlled-service
  Scenario: A B C supersession during preparation ignores late A, never writes B and publishes C only
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When A B C supersession during preparation ignores late A, never writes B and publishes C only
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-007 @controlled-service
  Scenario: C accepted during A rename reconciles A in the current ownership before any C write/ACK
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When C accepted during A rename reconciles A in the current ownership before any C write/ACK
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-008 @controlled-service
  Scenario: join during %s invalidates membership and safely reprepares once
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When join during %s invalidates membership and safely reprepares once
    Then asserted view, durable ownership, barrier and authoritative events hold
    And every parameter row declared in the bound service test executes

  @P01-TX-009 @controlled-service
  Scenario: ongoing membership churn is bounded and cancels instead of retrying indefinitely
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When ongoing membership churn is bounded and cancels instead of retrying indefinitely
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-010 @controlled-service
  Scenario: leave and generation replacement reject a removed participant ACK
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When leave and generation replacement reject a removed participant ACK
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-011 @controlled-service
  Scenario: paint barrier is mandatory before apply, and forged ACK cannot publish or reveal
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When paint barrier is mandatory before apply, and forged ACK cannot publish or reveal
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-012 @controlled-service
  Scenario: prepare deadline is 2s; a late handle is disposed and never applied
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When prepare deadline is 2s; a late handle is disposed and never applied
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-013 @controlled-service
  Scenario: commit paint deadline is 2s and host/readback deadlines are 5s; unknown host outcome remains safely covered
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When commit paint deadline is 2s and host/readback deadlines are 5s; unknown host outcome remains safely covered
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-014 @controlled-service
  Scenario: cancel during persistence reconciles first, then permits close/dirty-guard continuation
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When cancel during persistence reconciles first, then permits close/dirty-guard continuation
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-015 @controlled-service
  Scenario: curtain stays painted throughout %s membership compensation and reprepare
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When curtain stays painted throughout %s membership compensation and reprepare
    Then asserted view, durable ownership, barrier and authoritative events hold
    And every parameter row declared in the bound service test executes

  @P01-TX-016 @controlled-service
  Scenario: membership change during compensation rejects obsolete rollback ACK and retains covered recovery
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When membership change during compensation rejects obsolete rollback ACK and retains covered recovery
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-017 @controlled-service
  Scenario: membership change during reconciliation never reveals an incompletely acknowledged set
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When membership change during reconciliation never reveals an incompletely acknowledged set
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-018 @controlled-service
  Scenario: recovery action proves current durable state and all participant paints before revealing
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When recovery action proves current durable state and all participant paints before revealing
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-019 @controlled-service
  Scenario: service owns queued selections and snapshot revisions instead of retaining mutable caller references
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When service owns queued selections and snapshot revisions instead of retaining mutable caller references
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-020 @controlled-service
  Scenario: join during published preview applies the visible revision hidden and cancellation restores every member
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When join during published preview applies the visible revision hidden and cancellation restores every member
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-TX-021 @controlled-service
  Scenario: membership during cancellation is bounded and restores published selection before guard continuation
    Given controlled host and participants retain dirty drafts, selection, undo and document bytes
    When membership during cancellation is bounded and restores published selection before guard continuation
    Then asserted view, durable ownership, barrier and authoritative events hold

  @P01-UI-001 @component
  Scenario: picker arrows preview and Enter persists only the selected candidate while dirty editor identity survives
    Given simultaneous Light Dark HC and System choices and a dirty editor
    When arrows preview another theme and Enter confirms it
    Then preview writes nothing and confirmed readback publishes one saved selection
    And the editor draft identity and density are retained

  @P01-UI-002 @component
  Scenario: Escape and outside cancellation restore the current committed environment before dismissal
    Given an applied preview under the managed overlay host
    When the owner receives Escape or an outside click
    Then cancellation restores the committed theme without a persistence write
    And the connected opener regains focus only after cancellation succeeds

  @P01-UI-003 @component
  Scenario: distinct presentation Settings preview named modes and independent density through the same controller
    Given repository Settings remain a separate feature
    When presentation Settings selects theme and density
    Then the named choices preview without changing repository or document data
    And Apply persists their complete selection and the same live picker remains available

  @P01-UI-004 @component
  Scenario: failed persistence remains truthful and keeps the dialog available with dirty context intact
    Given a chosen preview and a host refusal or unknown readback
    When Enter requests durable commit
    Then no Saved message or dismissal occurs
    And the committed view is restored or explicit covered recovery remains available

  @P01-UI-005 @component
  Scenario: controller follows System and forced environment while preserving explicit live preview and current cancellation baseline
    Given a System durable selection with an explicit density and preview
    When environment changes to dark or forced colors
    Then a view-only transaction publishes the current environment without a settings write
    And cancellation restores the newly resolved durable selection

  @P01-UI-006 @component
  Scenario: environment supersedes an unpublished candidate without losing explicit choice or writing it
    Given an explicit preview or commit is still preparing while durable selection remains unchanged
    When OS preference changes before publication
    Then a view-only refresh retains the explicit candidate and density without persisting it
    And cancellation restores the durable selection in the current environment

  @P01-UI-007 @component
  Scenario: Workbench injects one theme controller with a stable managed host and distinct Settings command
    Given repository Settings and existing commands retain their domain behavior
    When presentation Settings opens the same picker over a live preview
    Then both belong to the stable Workbench overlay host and Escape restores the durable view
    And no repository or document write occurs

  @P01-UI-008 @component
  Scenario: Workbench contextual chord guards editable input and close restores presentation before the existing guard
    Given one contextual key owner and unchanged save close and dirty guard commands
    When Ctrl K Ctrl T is used outside editable input or the window requests close during preview
    Then the picker opens only in the permitted context
    And presentation cancellation completes before the existing close guard can approve

  @P01-RT-READONLY-001 @runtime-pending
  Scenario: already-open real manager retains readonly membership and draft under pending diagram write
    Given native and embedded FlowManager opened through actual bundle input
    When an actual diagram write is pending through a declared gate and original handler DTO
    Then membership is disabled and actual draft member and file bytes remain intact
    And six theme density states forced colors and three viewports meet actual focus and contrast

  @P01-RT-RESTORED-002 @runtime-pending
  Scenario: restored readonly workspace preserves editing protection without claiming unavailable inspection
    Given an actual restored readonly workspace and opened diagram
    When Save and actual editing input are attempted
    Then Save is disabled and document bytes remain unchanged
    And readonly inspection remains a forms Draw consumer followup with original failed evidence preserved

  @P01-RT-READINESS-003 @runtime-pending
  Scenario: original rename and iframe drag assertions run after actual readiness
    Given the original compatibility fixtures and exact original tolerances
    When rename waits for dialog dismissal and frame input waits for applied revision curtain fonts and paints
    Then all original assertions remain effective and targeted plus full regression must pass

  @P01-RT-BUNDLE-READINESS-004 @pending-runtime
  Scenario: Existing reloaded bundle waits for actual embedded readiness
    Given the accepted E2E-07 test-only scope and preserved original source and failures
    When actual geometry and hit target diagnose its unchanged gesture
    Then only real frame revision curtain fonts paint and DOM projection readiness may change
    And all original assertions tolerances and full regression gates remain mandatory

  @P01-RT-SAVEAS-005 @runtime-pending
  Scenario: original Save As assertions wait for actual atomically published workspace targets
    Given the accepted exact SaveAs delta and unchanged original writer DTO fixtures and assertions
    When the original Save As command dispatches before its target file exists
    Then actual workspace and alternate existence precedes unchanged JSON assertions without fake writes catches retries or sleeps
    And original root identity paths reopen Save All and dirty guards remain mandatory

  @P01-RT-BOTTOM-006 @runtime-pending
  Scenario: actual lower frame div chrome inherits canonical palette state targets and bounds
    Given the accepted exact lower frame matrix and poisoned semantic API regression fixtures
    When Light Dark HC and both densities with forced coarse reduced zoom and viewports exercise apply cancel rollback disposal
    Then actual lower strip controls match canonical roles and distinct active hover focus with conforming visible unclipped targets
    And XML authored paint model preferences undo selection identity and graph viewport remain unchanged

  @runtime-pending @P01-RT-LOWER-KEYBOARD-007
  Scenario: Existing lower controls have real bounded keyboard ownership
    Given the accepted private lower keyboard adapter scope and original vendor DOM handlers
    When the user enters and leaves lower focus and invokes an enabled action by keyboard
    Then focus is distinct from page selection and the original guarded action runs exactly once
    And theme projection and focus navigation preserve document viewport undo preferences and identities
    And teardown restores exactly the prior owned DOM semantics

  @P01-RT-LOWER-MENU-008 @runtime-pending @A11Y-005 @A11Y-007
  Scenario: Proven lower menu and submenu actions complete through original gestures
    Given an accepted connected lower opener and captured actual menu participant generation
    When keyboard navigation reaches an enabled original action or submenu
    Then actual named focus targets and original guarded gesture perform the action exactly once
    And hidden disabled and checkable states remain truthful with deliberate original action effects

  @P01-RT-LOWER-ISOLATION-009 @runtime-pending
  Scenario: Unowned or stale menus never acquire lower keyboard ownership
    Given unrelated canvas toolbar sidebar plugin popup or replaced menu ownership
    When a lower participant generation or actual submenu relationship is invalidated
    Then unrelated semantics styles handlers and actions remain unchanged and stale activation is blocked

  @P01-RT-LOWER-CANCEL-010 @runtime-pending
  Scenario: Owned menu cancellation exit and recreation preserve original state
    Given an actual owned lower popup with recorded prior attributes listeners and focus
    When Escape Tab mouse dismissal detach recreation or theme transaction occurs
    Then the original hide lifecycle restores exact owned values and connected focus without a trap
    And presentation navigation and cancellation retain XML model files paint undo selection preferences viewport and identities

  @P01-RT-LOWER-REFLOW-011 @runtime-pending
  Scenario: Proven lower menu chain fits current viewport without covered targets
    Given accepted bounded reflow and the retained actual six-case layout RED
    When original lower popup or submenu bounds overlap or exceed the actual resized text200 coarse media viewport
    Then measured bounded owned widths side and text wrapping retain visible accessible original actions and four pixel focus clearance
    And original labels canonical minima contrasts font size and presentation-only semantic state remain intact

  @P01-RT-LOWER-REFLOW-012 @runtime-pending
  Scenario: Feasible original placement and excluded popup DOM remain intact
    Given proven original panels whose anchor and side already fit and unrelated stale or detached panels
    When bounded layout reconciliation measures current owned DOM
    Then feasible original placement remains and excluded panels receive no mutation or vendor fitting semantic call

  @P01-RT-LOWER-REFLOW-013 @runtime-pending
  Scenario: Owned reflow restores exact state on every lifecycle boundary
    Given recorded original inline values priorities and style attribute presence with a proven cancellation lease
    When prepare stale activation cancel detach recreation disposal or relevant viewport text media generation occurs
    Then bounded compare before write reconciliation restores owned state without loops stale mutation or losing cancellation
    And impossible accommodation reports a concrete blocker without hidden targets new exceptions or weakened assertions

  @P01-RT-LOWER-REFUSAL-014 @runtime-pending
  Scenario: Settled frame paint still reports impossible owned lower placement
    Given exact current painted frame ownership and a settled successful apply
    When a normal original lower menu cannot fit its contracted targets
    Then actual parent live diagnostic is visible and failed adaptation stops with exact cancellation restoration
    And settled transaction durable state graph model file undo selection preferences viewport and identities remain unchanged

  @P01-RT-LOWER-REFUSAL-015 @runtime-pending
  Scenario: Forged stale superseded duplicate and disposed lower diagnostics are rejected
    Given current painted owner and unchanged pending transaction response contracts
    When an invalid or duplicate lower REFUSED envelope arrives
    Then no false diagnostic reveal setting write or second transaction settlement occurs

  @P01-RT-LOWER-REFUSAL-016 @runtime-pending
  Scenario: Original feasible lower reopen recovers without automatic action
    Given a refused original lower chain whose owned projection is restored
    When viewport recovers and the user normally reopens the original menu
    Then actual bounds focus and original actions are usable with no observer churn or semantic mutation

  # Separate fullRuntimeBindings now pins the seven foundation FUI005–009 examples
  # to twelve actual Electron cases, full assertion source, AST callbacks and raw execution.
  # Foundation declarations and original pendingRuntime NOT_RUN remain historical/cumulative.
  # Passing integrity/runtime does not accept screenshots or close cumulative P01.

  @P01-RT-UPPER-GLYPH-017 @runtime-pending @FDS-003 @FDS-009 @A11Y-002
  Scenario: Three original upper glyphs prove canonical effective paint
    Given the exact accepted View Insert Freehand source identities and validated actual Electron calibration controls
    When presentation changes across required themes densities media and states
    Then the entire actual glyph raster matches a nonempty canonical compatible color set whose minimum effective contrast is at least three
    And original geometry opacity capability actions and semantic state remain intact
    And the actual enabled active opacity of 0.75 receives the same exact contrast proof

  @P01-RT-UPPER-GLYPH-018 @runtime-pending @A11Y-007
  Scenario: Upper glyph projection restores only owned current state
    Given recorded original glyph inline properties priorities and marker absence
    When preview rollback source replacement detach disposal or superseded asynchronous digest occurs
    Then exact ownership restores without overwriting current external vendor values or changing unrelated targets and no stale mutation occurs
    And normal handle release retains active paint while cancel reapplies the previous theme
    And new native digest failures reject a pending apply or rollback before PAINTED while post-paint adoption uses only verified exact bytes

  @P01-RT-UPPER-GLYPH-019 @runtime-pending
  Scenario: Missing affirmative glyph evidence cannot pass
    Given unchanged historical black-source RED and an unknown unsupported blank or contradictory actual glyph observation
    When complete-raster calibration cannot establish the required compatible effective-paint contrast bound
    Then no favorable pixel CSS-only value or absence of the old failure can produce PASS and closure remains blocked
