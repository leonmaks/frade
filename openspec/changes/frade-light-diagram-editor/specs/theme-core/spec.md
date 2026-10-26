# Theme Core delta

## MODIFIED Requirements

### Requirement: Atomic hot preview and commit

All required participants SHALL acknowledge one authoritative revision without restart, including upstream Light/system editor scopes. Preview MUST NOT persist. Cancel/refusal/persistence failure SHALL restore prior appearance/settings without losing dirty data/identity; stale candidates MUST NOT publish.

#### Scenario: Canvas preparation fails
- **WHEN** a required adapter refuses preview or commit
- **THEN** participants/settings retain prior state and documents remain unchanged

#### Scenario: Equal editor styles across revisions
- **WHEN** external theme/density changes while editor appearance is equal
- **THEN** original context/generation/membership/deadlines and painted ACK guards still govern publication

### Requirement: Presentation consumer isolation

Theme changes SHALL affect view only. Documents, author paint/backgrounds, routes/endpoints, model/undo/selection and editor/graph/frame identity MUST remain unchanged. Projection MUST NOT invoke persisted style/grid setters or autosave.

#### Scenario: Native and embedded documents retain authored paint
- **WHEN** native/embedded editors preview, commit, cancel and enter/leave forced colors
- **THEN** data/author values/identity remain unchanged while UI follows its declared workbench or upstream editor/system scope

#### Scenario: Forged or stale frame acknowledgement
- **WHEN** foreign source/origin or obsolete generation acknowledges
- **THEN** publication or mixed-revision reveal is refused
