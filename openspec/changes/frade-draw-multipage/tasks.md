# Tasks

## 1. Research and PRE

- [x] 1.1 Inspect native document/editor/host boundaries and pinned/online Draw.io panel; retain source hashes, screenshot and DOM observations in research evidence.
- [x] 1.2 Record approved scope, UI/FDS/A11Y mapping, strategy, exact user-selected PRE/POST model/effort and shared policy adoption in planning artifacts.
- [ ] 1.3 Strictly validate OpenSpec, freeze a complete relevant packet, prove sandbox confinement and receive independent PRE PASS before production edits; preserve raw receipt/events/report and candidate hashes.

## 2. Document model and history

- [ ] 2.1 Add meaningful failing tests for v1/v2 compatibility, all-page validation, page identity/name/order, duplicate terminal remapping, sole-page deletion and immutable state; implement pure page operations and envelope codec; verify targeted tests GREEN with v1 regressions unchanged.
- [ ] 2.2 Add failing real-graph/session tests for native batch granularity, interleaved page/graph undo/redo, navigation, cancellation and invalid load rollback; implement session/lifecycle handle and verify chronological history plus existing segment/document tests GREEN.
- [ ] 2.3 Document version-2 schema, compatibility/migration and public editor lifecycle API in Draw README; verify examples against exported types and consumer typecheck.

## 3. Bottom strip and local lifecycle

- [ ] 3.1 Add failing interaction tests for insert/select/rename/duplicate/remove, drag/Move and overflow; implement native strip and dialogs/menus using source-derived shared generated asset; verify targeted interaction tests and generator/source closure.
- [ ] 3.2 Cover keyboard focus/roving/menus/dialogs, readonly, loading, invalid input, Escape cancellation, long Unicode labels and active-tab scrolling; verify meaningful keyboard/interaction tests with no dead commands.
- [ ] 3.3 Add standalone browser round-trip tests through actual file controls with distinct content on inactive pages, New/Open/Save As and failure preservation; wire full-session lifecycle and verify tests plus documented behavior.

## 4. Repository editor integration

- [ ] 4.1 Add failing host tests for complete-document snapshot/load/dirty, page navigation and flow/reference refresh; integrate session handle in FradeDiagramView without changing repository ownership/routing and verify tests GREEN.
- [ ] 4.2 Add desktop E2E native `.frade` multipage save/reopen/discard/readonly/park-return case; verify actual saved file includes every page and existing native diagram regressions pass.

## 5. Verification and checkpoint

- [ ] 5.1 Compare actual native strip with unmodified local bundled 31.5.2 at matching platform/font/viewport/labels/states; retain DOM metrics/screenshots, enumerate exceptions, verify light/dark/HC outer themes, both densities, coarse/forced-colors/text zoom/resize and report actual UI compliance statuses.
- [ ] 5.2 Run required affected package unit/BDD/typecheck/lint/build, relevant browser/desktop regressions, consumer/boundary and root UI closure checks on exact candidate; retain commands/results and resolve applicable failures before progression.
- [ ] 5.3 Run OpenSpec implementation verification, inspect git status/diff, dispatch independent POST with exact approved model/effort and receive PASS; record blockers/visual acceptance honestly, update tracked dashboard and commit authorized checkpoint.

## Workflow follow-up

- Obtain explicit visual acceptance for fresh reference/native comparison before closure/archive; do not approve new baselines automatically.
- Archive only after required verification and POST PASS and stop at this feature checkpoint. No next numbered change, automatic main merge or unapproved push.
