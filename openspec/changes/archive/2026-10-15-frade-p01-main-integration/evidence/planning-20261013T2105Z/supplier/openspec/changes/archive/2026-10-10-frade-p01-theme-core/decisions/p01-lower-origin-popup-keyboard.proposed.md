# P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 — exact scope amendment proposed

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS / NOT_IMPLEMENTED. No authority to change production or approved four-artifact scope is granted by this draft.

## Established blocker and ownership

Independent gpt-6-astra/xhigh requested PRE at openspec/changes/frade-p01-theme-core/evidence/p01-lower-keyboard-pre-received-20261001T130510Z/result.md has one blocker B01: SPEC_CONFLICT / ABSTRACTION_BOUNDARY. All1396 input hashes,64 relocated artifacts and complete vendor ranges verified; candidate/packet unchanged. Previously accepted lower semantics authority is recognized. The remaining boundary is actual mxPopupMenu and submenus appended to document.body outside .geTabContainer. Existing rows have gesture handlers, no general keyboard navigation. Lower keyboard proposal line28 explicitly requires STOP and a responsible scope decision in this case. Legacy overlay placement does not waive A11Y-005/007. SaveAs has no newly found blocker; the combined gate remains FAIL.

Owner: P01 first-party presentation/accessibility bridge. This bounded adapter supplies complete keyboard access for the lower controls it adopts. No Routing V2 supplier/consumer dependency is introduced. General forms/Draw overlay migration remains its existing separate owner; menu position is retained under the existing exact placement exception.

## Exact additional production authority

Only apps/desktop/src/main/drawio-theme-bridge.ts. All earlier lower palette/geometry/semantics and SaveAs permissions remain exact. No additional production file, vendor source change, dependency, token, schema, CI or domain API.

Permit temporary accessibility ownership outside .geTabContainer ONLY for actual popup DOM opened by an enabled existing lower page-menu button or lower Pages control, and their original submenu DOM. Ownership requires all of:

1. The current accepted private frame participant is active, runtime root is owned, and lower opener is a real connected eligible node of this adapter.
2. An original lower-control click/gesture opens the actual vendor menu. Capture the existing UI menu instance/DOM after that original event; attach a private lower-origin marker linked to opener and current participant generation. Do not assume any .mxPopupMenu on body belongs to this adapter.
3. Descendant/submenu ownership is proven from that captured menu instance and its actual existing row/submenu relationships. Detached/closed or replaced ownership is invalidated. A root/generation/transaction change must not allow stale keyboard activation.
4. Other canvas/toolbar/sidebar menus, unrelated dialogs, plugin overlays and later-opened unowned popup instances are excluded. Ambiguous/unavailable ownership means no claimed keyboard PASS and STOP at a concrete finding.

Do not replace/reparent vendor nodes, monkeypatch menu constructors/prototypes/factory/action/hide callbacks, add a general vendor keyboard implementation, or call original action functions directly. Original mouse handlers and handler identity remain intact. Original visible menu bounds/placement/submenu fitting remain vendor-owned; no global popup relocation or host migration.

## Accessible projection and keyboard

- Own only required role/tabindex/ARIA/private marker attributes and private listeners on the proven menu/table/rows and submenu DOM. Preserve exact prior values, including absence. Assign one meaningful menu owner and one target per real actionable row; no duplicate interactive cell/row targets. Decorative icon/separator semantics stay truthful.
- Names derive from actual localized rendered menu text. Disabled, selected/checkable and submenu states must reflect actual vendor flags/DOM; no inferred enabled action, invented choice or inaccessible hidden item. Permit aria-checked only for actual checkable state, aria-disabled, aria-haspopup/expanded, aria-label, aria-hidden for decorative children and separator/menu/menuitem/group semantics as appropriate. Unknown capability is unavailable, never forcibly enabled.
- On a keyboard-opened lower menu, focus the first eligible original row. Use ArrowUp/Down and Home/End for focus only; ArrowRight enters the original submenu through its existing gesture path, ArrowLeft returns one level. Enter/Space executes the original corresponding DOM down/up or click path exactly once, preserving original capability checks. Account for actual pointer-event registration and event bubbling; do not blindly dispatch multiple alternatives. No direct graph/model/persistence/routing API or vendor action-function shortcut.
- The popup owner has key precedence only for its own navigation/activation/dismissal. Editing/IME/composition/dialog/save/close/presentation priorities remain intact. The lower F6/arrow handler is suspended while a popup is active; unowned popup keyboard remains untouched. Recognize actual idle canvas mxTypingShim separately from real text editing when entering lower chrome.
- Escape closes the owned submenu or root through the existing vendor UI hide lifecycle, then returns focus to a connected parent/opener. This explicitly permits calling the captured original UI hide callback for cancellation only; never replace it or use it to invoke semantic actions. Tab/ShiftTab dismisses the owned popup and allows exit/continued visual-order navigation without a new trap. Outside/original mouse dismissal returns/retains focus appropriately without interfering with the actual clicked target.
- If the original action refreshes lower DOM, restore focus to the corresponding connected replacement when proven; otherwise use current enabled lower target or remembered connected canvas. No focus on a detached/hidden/disabled node. Restore aria-expanded and all owned values/listeners on close, detach, disposal, failed ownership or recreation. Existing theme transaction barrier/recovery priority remains intact; reconcile the adapter against the authoritative active generation.

All new styles stay under html[data-frade-frame-runtime=1] plus the private lower-origin menu marker. No blanket .mxPopupMenu or tr selector. Complete text/icon/background/border/focus/state canonical roles, compact28/comfortable36,width24/coarse44 and visible unclipped target/focus bounds apply to these newly owned menu targets. Preserve existing geometry except owned target minimum/reflow accommodation needed for these obligations; preserve original placement, authored diagram paint, graph scale/translate and all domain state. If required accommodation cannot satisfy these constraints, STOP for a specific decision. No fourth exception, new icon asset/family, feature color literal or arbitrary theme CSS.

## Deliberate action vs presentation preservation

Theme/density/media/focus-only navigation/cancel/teardown must preserve original XML/model/file bytes, authored paint, selection/undo/preferences, viewport and editor/graph/frame identities. Deliberate original keyboard activation retains its original intended effects: page selection, add/duplicate/rename/remove/move or other original enabled menu action may intentionally change pages/dirty/undo according to the original handler. Tests compare those effects with the unchanged original pathway rather than requiring zero semantic change. Original downstream dialogs must remain keyboard-operable; no new authority to redesign/adapt unrelated dialog bodies. Any necessary outside scope is a reported blocker before production, not a deferred silent exception.

## Test paths, evidence and checkpoints

Permanent tests only existing apps/desktop/tests/unit/drawio-theme.test.ts and apps/desktop/tests/e2e/ui-contract-theme.spec.ts; unchanged accepted minimal existsSync/two-precondition WB fixture delta remains as before. Supporting P01 proposal/design/spec/tasks, docs/ui BDD/traceability/status and new dated evidence. No Workbench/DiagramView/FlowManager/Inspector/vendor/domain/routing/package/lockfile changes.

After human acceptance: save exact proposal SHA/raw before states; reconcile four artifacts and BDD/registry, strict validation and fresh independent automatic bounded gpt-6-astra/xhigh read-only PRE. Only after PASS: meaningful permanent unit/Electron RED BEFORE sole production bridge repair. Cover lower entry/focus-only navigation, page and Pages menu opening, submenu navigation, actual complete rename/duplicate/remove/move or enabled equivalent original workloads, Escape and Tab exit, hidden/disabled capability, exactly-once original effects, unowned menus untouched, original mouse behavior, stale ownership/transaction/teardown/recreated DOM and poisoned forbidden APIs. Test generated serialized bridge, not only direct module import.

Actual six Light/Dark/HC x compact/comfortable, forced/coarse/reduced,200% text and1280/1600/850 viewport oracles include lower plus owned popup control/text/icon paint/contrast/visibility/focus/clipping/occlusion. Preserve every earlier consumer/assertion/tolerance. Run targeted original compatibility and new GREEN, affected typecheck/lint/unit/BDD/compliance positive/negative controls, fresh full root check:all. Runtime evidence and failures remain immutable; no task is closed by acceptance/PRE alone. Human visual approval, complete P01 verify/cumulative POST/archive remain later checkpoints; STOP before P02. Commit/push each completed UI checkpoint per exact existing destination authorization.

## Proposed coherent four-artifact revisions after acceptance

- proposal.md: add bounded lower-origin popup interaction adoption and acceptance authority; keep P01 intent, original baseline and consumer-owned Routing independence.
- design.md: add exact owner/opener/menu/submenu/lifecycle/attribute/key/gesture/cancel/palette geometry contract above; narrowly amend the lower-only boundary for proven lower-origin popup DOM. No general popup scope.
- specs/theme-core/spec.md: add requirements/scenarios for complete original lower menu action path, unowned-menu isolation and cancellation/teardown with deliberate effects distinct from focus/presentation preservation.
- tasks.md and BDD/traceability: keep5/10; add pending RED/GREEN/action/menu/isolation/media checks within2.4/2.5/3.1, no waived old requirement or next numbered change.

This draft is concrete and reviewable. Required human decision is only the added menu/submenu ownership outside the previously accepted subtree. Automatic PRE/POST transport needs no repeat human relay.
