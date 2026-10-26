# Diagram editor presentation

## Purpose

Use pinned Drawio Light as shared visual authority while preserving content, external workbench ownership and system access.

## Requirements

### Requirement: Stable upstream Light environment

Both editors SHALL use bundled pinned Drawio v31.5.2 Light presentation outside Windows forced colors, independently of external theme and density. Workbench SHALL retain its selected appearance/preferences.

#### Scenario: Application selection changes
- **WHEN** Light, Dark, System, High Contrast or reference is selected or OS preference changes
- **THEN** editor UI stays upstream Light and external themes continue to work without editor replacement or preference mutation

### Requirement: Source derived comparable controls

Comparable editor controls SHALL derive palette, typography, spacing, borders and states from verified upstream styles through one scoped adapter. Necessary layout/accessibility/system exceptions SHALL be enumerated. Unsupported counterparts MUST NOT be invented.

#### Scenario: Native controls share upstream values
- **WHEN** native and iframe buttons, fields, panels, menus and dialogs are compared
- **THEN** supported declared styles use the same upstream values and unavoidable integration differences are reported

#### Scenario: External density isolation
- **WHEN** workbench compact/comfortable changes
- **THEN** its preference/transaction metadata stay correct and editor retains fixed upstream geometry with required accessibility targets

### Requirement: Verified local source closure

Original upstream files/licenses SHALL stay unchanged. Generated adapter/data SHALL be deterministic, scoped and checked against pinned input/resource bytes. Unknown source/resource/output/scope drift MUST fail without broad exemptions.

#### Scenario: Adapter tampering
- **WHEN** source, resource or generated output changes or styles escape the editor
- **THEN** drift/isolation checks fail and historical baselines are not silently moved

### Requirement: Explicit appearance ownership

Portaled UI SHALL use its explicit live editor lease. Global/stale/foreign/closed/reassigned ownership MUST NOT acquire editor styles. Modal ordering and existing actions SHALL remain unchanged.

#### Scenario: Portal and two editor lifecycle
- **WHEN** an owned popup opens in the shared host and either editor is disposed
- **THEN** local style/focus/dismissal follows its valid owner and the other editor/global picker is unaffected

### Requirement: Grid and content isolation

Supported default workspace/grid appearance SHALL follow pinned upstream presentation while preserving semantic grid size/visibility/origin, snapping, transforms, authored backgrounds/images/cells, documents and export. Presentation MUST NOT materialize author defaults or replace engines.

#### Scenario: Default and authored backing
- **WHEN** default workspaces and supported color/image backing are shown through external theme changes
- **THEN** UI backing is source-derived, author paint/serialized bytes stay unchanged and unsupported native page/image/gradient fields are disclosed

#### Scenario: Grid navigation and undo
- **WHEN** grid visibility, pan/zoom, themes and undo/redo change
- **THEN** grid semantics, selection, identity and dirty behavior remain correct without theme-driven persisted writes

### Requirement: Supported author appearance preservation

Opaque/alpha/inherited and supported gradient/image paint SHALL retain author attributes/effective values. UI styles MUST exclude content thumbnails/swatches and authored SVG/cell paints. Comparisons SHALL disclose capability and raster limitations.

#### Scenario: Existing sample and content round trip
- **WHEN** supported content passes through preview, commit, cancel and editor switching
- **THEN** no tint/inversion/default materialization occurs and unsupported behavior is not reported as exact parity

### Requirement: Accessible system and interaction boundary

Forced colors SHALL take priority without changing author values/preferences. Required contrast, targets, names/states, keyboard/focus, readonly/modal return and applicable zoom/reflow SHALL remain valid through bounded accessibility/system exceptions to exact upstream visuals.

#### Scenario: Forced colors round trip
- **WHEN** forced-colors media enters/exits with dirty editors and owned UI
- **THEN** UI uses system colors while active and upstream Light afterward with unchanged documents/preferences

#### Scenario: Keyboard and constrained viewport
- **WHEN** reachable menus/dialogs are exercised by keyboard and representative zoom/resize/coarse conditions
- **THEN** actions/focus/dismissal/disabled state remain usable without cross-editor leakage

### Requirement: Bounded current integration evidence

Closure SHALL use verification.md representative matrix, unchanged applicable regressions and independent gates. Product-wide re-certification of unchanged upstream CSS across all external theme/density combinations SHALL NOT be required. History stays immutable and fresh visuals need explicit acceptance.

#### Scenario: Superseded visual obligation
- **WHEN** an old FDS palette/density expectation is replaced by upstream appearance
- **THEN** exact old/new expectation/source mapping is retained, unrelated assertions/timing stay exact and screenshots receive separate acceptance
