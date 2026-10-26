# Bundled reference themes delta

## MODIFIED Requirements

### Requirement: Immutable domain and default theme behavior

Reference selection SHALL preserve external density/fallbacks/System, forced colors, keyboard contracts, author paint/geometry, dirty documents, undo/selection, repository bytes, endpoints/routes and editor/frame identity. Editor-owned UI SHALL retain upstream Light/fixed geometry outside forced colors.

#### Scenario: Reference to built-in transition
- **WHEN** dirty native/embedded editors transition between reference and builtin/System
- **THEN** external theme/density recover, upstream editor appearance stays local and data/identity remain unchanged

## ADDED Requirements

### Requirement: Local editor fidelity boundary

Reference source/mapping SHALL remain original. Reports SHALL identify the deliberate upstream editor exception and supported native adaptation rather than claim whole-screen VSCode or universal Drawio pixel equivalence.

#### Scenario: Reference screenshot with editor popup
- **WHEN** reference workbench and owned editor popup are captured
- **THEN** editor/popup use upstream Light, shell uses reference and adaptation is disclosed
