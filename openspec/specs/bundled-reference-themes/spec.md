# bundled-reference-themes Specification

## Purpose

Provide fully retained first-party upstream theme data with measured Frade compatibility and safe offline hot selection.

## Requirements

### Requirement: Complete pinned upstream source

The shipped VS Code Dark 2026 SHALL retain byte-identical 2026-dark.json and its recursive dark_modern/dark_plus/dark_vs dependencies from commit 36e19389b8a2e64498d0d4d860c346424bf90a3a, Microsoft MIT notice, URLs and SHA256 manifest. No upstream executable extension code SHALL run.

#### Scenario: Source drift or incomplete inheritance

- **WHEN** an original or generated artifact changes, an include is absent, unsafe or cyclic, or the source manifest mismatches
- **THEN** generation/compliance fails without silently rewriting sources or claiming a complete copy

### Requirement: Existing hot selection and durable identity

VS Code Dark 2026 SHALL be available offline by exact label and stable ID frade.reference/vscode-dark-2026 through the existing registry, picker, resolver and Main settings owner. Preview SHALL remain transient; commit and restart SHALL retain the ID. Default selection SHALL remain unchanged. The core createThemeRegistry() exact-three contract and explicitly injected picker options MUST remain unchanged; only the application factory adds the bundled reference.

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

Reference selection SHALL preserve external density/fallbacks/System, forced colors, keyboard contracts, author paint/geometry, dirty documents, undo/selection, repository bytes, endpoints/routes and editor/frame identity. Editor-owned UI SHALL retain upstream Light/fixed geometry outside forced colors.

#### Scenario: Reference to built-in transition
- **WHEN** dirty native/embedded editors transition between reference and builtin/System
- **THEN** external theme/density recover, upstream editor appearance stays local and data/identity remain unchanged

### Requirement: Historical selector compatibility preserves evidence
The implementation SHALL select built-in themes unambiguously and preserve exact historical evidence through the accepted pinned current/origin source proof.

#### Scenario: Built-in and reference dark choices coexist
- **GIVEN** both dark choices are available
- **WHEN** historical regression coverage selects built-in Dark
- **THEN** the exact built-in choice is selected and all original behavioral assertions remain enforced

#### Scenario: Unexpected source changes fail historical replay
- **GIVEN** the accepted current and original source hashes
- **WHEN** an assertion or unapproved source byte changes
- **THEN** the origin control fails and no historical execution is relabeled as current evidence

#### Scenario: Complete option inventory rejects ambiguous replay
- **GIVEN** both complete original regression files
- **WHEN** their theme option locators are analyzed
- **THEN** no generic Dark or constructed regex option selector remains and the live performance source matches its accepted pin

### Requirement: Local editor fidelity boundary

Reference source/mapping SHALL remain original. Reports SHALL identify the deliberate upstream editor exception and supported native adaptation rather than claim whole-screen VSCode or universal Drawio pixel equivalence.

#### Scenario: Reference screenshot with editor popup
- **WHEN** reference workbench and owned editor popup are captured
- **THEN** editor/popup use upstream Light, shell uses reference and adaptation is disclosed

