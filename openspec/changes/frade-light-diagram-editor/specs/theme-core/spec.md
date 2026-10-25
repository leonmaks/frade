# Theme Core delta

## MODIFIED Requirements

### Requirement: Atomic hot preview and commit

All required presentation participants SHALL apply one revision without restart, including the fixed light diagram-editor projection and system forced-colors exception. Preview MUST NOT persist. Cancellation or adapter/persistence failure SHALL restore the previous snapshot and settings without losing dirty editors, selections, undo or document bytes. Stale candidate results MUST NOT overwrite newer selection.

#### Scenario: Canvas preparation fails

- **WHEN** a required adapter refuses the preview or commit
- **THEN** all participants/settings remain at the previous theme and documents are unchanged

#### Scenario: Scoped light editor shares global transaction
- **WHEN** application theme preview, commit or rollback occurs with native and embedded editors
- **THEN** editor light/system presentation and external workbench presentation acknowledge the same authoritative revision under unchanged identity guards and deadlines

### Requirement: Presentation consumer isolation

Theme changes SHALL affect view presentation only. Persisted JSON/XML, authored page/background images/node/edge paint, route/endpoint semantics, model state, undo/redo, selection and editor/graph/iframe identity MUST remain unchanged. No theme transaction SHALL invoke persisted background/grid convenience APIs or trigger autosave/settings preference writes.

#### Scenario: Native and embedded documents retain authored paint
- **WHEN** a dirty native and pinned embedded diagram with nondefault authored paint previews, commits, cancels and redraws under forced colors
- **THEN** saved document bytes, settings storage, model/undo/selection/identities stay unchanged while only UI view projection follows its declared application or fixed-light editor scope, with forced colors retaining priority

#### Scenario: Forged or stale frame acknowledgement
- **WHEN** a foreign source/origin or obsolete frame generation sends an acknowledgement
- **THEN** it is rejected and cannot permit publication or reveal a mixed revision
