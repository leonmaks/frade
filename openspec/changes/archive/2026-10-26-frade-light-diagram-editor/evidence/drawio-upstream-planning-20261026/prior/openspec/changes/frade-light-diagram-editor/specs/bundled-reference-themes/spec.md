# Bundled reference themes delta

## MODIFIED Requirements

### Requirement: Immutable domain and default theme behavior

Reference selection SHALL preserve independent density, Frade built-in fallbacks, OS/System response, forced colors, keyboard contracts, dirty documents, undo, selections, repository bytes, authored diagram paint and geometry, endpoints/routes and editor/iframe identity.

#### Scenario: Reference to built-in transition

- **WHEN** a dirty native and embedded diagram switches through reference, Light, Dark, HC and System in both densities
- **THEN** data/identities remain equal, authored paint is preserved and external non-reference appearance/metrics recover exactly while diagram-owned UI retains the shared fixed light scope unless forced colors is active

## ADDED Requirements

### Requirement: Local editor fidelity boundary

The reference theme SHALL retain its original source and mapping data while diagram-owned presentation uses the common light-editor contract outside forced colors. Fidelity reports MUST distinguish external reference appearance from this deliberate local adaptation.

#### Scenario: Reference screenshot includes editor palettes
- **WHEN** a reference-themed workbench is captured with an open diagram and editor-owned menu
- **THEN** the editor and its menu remain light, the surrounding shell uses the reference and the adaptation is reported without a whole-screen exact-fidelity claim
