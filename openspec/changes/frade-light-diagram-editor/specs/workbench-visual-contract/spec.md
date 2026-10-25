# Workbench visual contract delta

## MODIFIED Requirements

### Requirement: Opt-in reference geometry and honest fidelity

Only the selected frade.reference/vscode-dark-2026 ID SHALL enable the first-party reference geometry preset for existing comparable external workbench shell and controls. Diagram-owned controls SHALL retain the shared light-editor geometry. Density preference MUST remain independent. The scoped preset MAY replace guide initial band/radius/spacing defaults with pinned VS Code measurements; mandatory keyboard, focus, pointer target, contrast, reflow and semantic preservation rules remain. No other theme SHALL acquire reference geometry.

#### Scenario: User switches theme or density

- **WHEN** reference preview/commit/cancel and density changes occur
- **THEN** scoped geometry follows the accepted reference revision, compact/comfortable remains independently selected, and leaving the reference restores original metrics without saved layout mutation

#### Scenario: Reference shell around a light editor
- **WHEN** the reference theme is selected with either diagram editor
- **THEN** reference geometry remains outside the editor-owned scope while comparable editor controls retain common Frade density and accessibility metrics
