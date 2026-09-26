# Tasks

## 1. Specification and domain

- [x] 1.1 Complete pre-flight, proposal, design and all 42 BDD scenarios; validate artifacts before code.
- [x] 1.2 Write RED domain tests for canonical eligibility/direction, unique membership, reverse, clone and validation; implement GREEN and document invariants.
- [x] 1.3 Add validated metamodel flow capability for native and imported types; test configuration and adapter mapping.

## 2. Repo Core

- [x] 2.1 Implement indexed pair/full search with labels, text/filters/sort/pagination/event invalidation; verify query and 100000-flow tests and document API.
- [x] 2.2 Expose scoped flow query/read/create/update through existing API and auth/revision contracts; verify memory/native/YAML contracts.
- [x] 2.3 Extend KA single-source creation strategy safely; verify CST preservation, ID patterns, conflicts, read-only and recovery tests.

## 3. Diagram aggregates

- [x] 3.1 Persist validated refs in both formats with old empty-bundle defaults; roundtrip/invalid metadata tests.
- [x] 3.2 Add native membership/bulk commands, badge and entrypoints in both engines; verify atomic undo/redo and deletion independence.
- [x] 3.3 Guard native reconnection and remove incompatible refs atomically; verify confirm/cancel and undo/redo in both engines.

## 4. Flow Manager

- [x] 4.1 Add shared resizable dock, table, details, debounced search/filters/paging/bulk and accessible empty/error/broken/read-only states; component tests and docs.
- [x] 4.2 Add schema-driven create/edit/reverse/clone, endpoint confirmation, dirty protection, conflict and create-membership retry; component tests and docs.
- [x] 4.3 Wire Workbench events and both live editors through existing client and commands; executable BDD covers all 42 scenarios with traceability.

## 5. Integration and acceptance

- [x] 5.1 Verify eight real Electron journeys in both engines and visual inspection; retain evidence.
- [x] 5.2 Refactor and run existing format/lint/typecheck/unit/component/BDD/E2E/build/OpenSpec gates; publish final implementation report and limitations.

## 6. Review corrections

- [x] 6.1 Prevent stuck pointer gestures across Navigator/Draw.io boundaries; verify both directions and release/cancel cleanup.
- [x] 6.2 Replace on-edge counts with all included flow descriptions, status markers, wrapped names and four-character continuation indent in both engines; update all edges on repository changes.
- [x] 6.3 Run regressions, real Electron journeys and visual inspection; document corrections.

## 7. Label interaction corrections

- [x] 7.1 Apply AA background alpha in both engines without fading text.
- [x] 7.2 Enable free label dragging, persist geometry and preserve it during live updates and Undo/Redo.
- [x] 7.3 Verify geometry validation and real Electron dragging/save/reopen in both engines; update documentation.

## 8. Routing and Draw.io interaction parity

- [x] 8.1 Remove unrelated-object influence from every routing path including preview, legacy files, endpoint moves and segment dragging; verify regressions.
- [x] 8.2 Make live segment dragging follow the pointer continuously with perpendicular cursors and atomic Undo/Redo.
- [x] 8.3 Match pinned Draw.io circular handles, floating terminal rings and selection colors; use one shared tool lifecycle.
- [x] 8.4 Verify real browser and Electron gestures, inspect visuals and run gates; document the correction.
