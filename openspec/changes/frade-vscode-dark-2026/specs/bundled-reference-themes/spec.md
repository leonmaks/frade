# Bundled reference themes

## Purpose

Provide fully retained first-party upstream theme data with measured Frade compatibility and safe offline hot selection.

## ADDED Requirements

### Requirement: Complete pinned upstream source

The shipped VS Code Dark 2026 SHALL retain byte-identical 2026-dark.json and its recursive dark_modern/dark_plus/dark_vs dependencies from commit 36e19389b8a2e64498d0d4d860c346424bf90a3a, Microsoft MIT notice, URLs and SHA256 manifest. No upstream executable extension code SHALL run.

#### Scenario: Source drift or incomplete inheritance

- **WHEN** an original or generated artifact changes, an include is absent, unsafe or cyclic, or the source manifest mismatches
- **THEN** generation/compliance fails without silently rewriting sources or claiming a complete copy

### Requirement: Existing hot selection and durable identity

VS Code Dark 2026 SHALL be available offline by exact label and stable ID frade.reference/vscode-dark-2026 through the existing registry, picker, resolver and Main settings owner. Preview SHALL remain transient; commit and restart SHALL retain the ID. Default selection SHALL remain unchanged.

#### Scenario: Preview cancel and restart

- **WHEN** a user previews the reference, cancels, then commits it and restarts
- **THEN** cancel restores previous palette/preset/settings, while restart restores the committed ID before normal paint without losing documents or editor identity

### Requirement: Explicit color fidelity and accessibility

The projection SHALL map every existing Frade semantic role and inventory every upstream color/syntax entry as supported, inherited, composed, repaired, retained-only or unmapped. Alpha SHALL be resolved against its actual declared backdrop in sRGB. Existing contrast repair and forced-colors precedence MUST remain strict. Unsupported syntax SHALL be retained without invented integration.

#### Scenario: Transparent color or accessibility conflict

- **WHEN** a mapped upstream value is translucent or fails an applicable contrast constraint
- **THEN** deterministic backdrop composition or documented accessibility repair is used with exact original/effective values; fidelity is not falsely reported exact

### Requirement: Safe preset lifecycle

One first-party ID-derived preset SHALL apply under existing presentation transactions, without a competing resolver, external CSS execution, persisted preset state or arbitrary plugin styles. Leaving, canceling or failing reference activation SHALL restore prior view metrics and remove derived preset state.

#### Scenario: Failed apply or rapid switching

- **WHEN** activation fails, rollback occurs, or a newer selection supersedes the reference
- **THEN** no stale preset/colors remain and only the accepted revision becomes visible under unchanged deadlines and guards

### Requirement: Immutable domain and default theme behavior

Reference selection SHALL preserve independent density, Frade built-in fallbacks, OS/System response, forced colors, keyboard contracts, dirty documents, undo, selections, repository bytes, authored diagram paint and geometry, endpoints/routes and editor/iframe identity.

#### Scenario: Reference to built-in transition

- **WHEN** a dirty native and embedded diagram switches through reference, Light, Dark, HC and System in both densities
- **THEN** data/identities remain equal, authored paint is preserved and non-reference appearance/metrics recover exactly
