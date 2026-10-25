# Workbench reference preset

## ADDED Requirements

### Requirement: Opt-in reference geometry and honest fidelity

Only the selected frade.reference/vscode-dark-2026 ID SHALL enable the first-party reference geometry preset for existing comparable shell and controls. Density preference MUST remain independent. The scoped preset MAY replace guide initial band/radius/spacing defaults with pinned VS Code measurements; mandatory keyboard, focus, pointer target, contrast, reflow and semantic preservation rules remain. No other theme SHALL acquire reference geometry.

#### Scenario: User switches theme or density

- **WHEN** reference preview/commit/cancel and density changes occur
- **THEN** scoped geometry follows the accepted reference revision, compact/comfortable remains independently selected, and leaving the reference restores original metrics without saved layout mutation

### Requirement: Measured reference comparison

Actual Frade runtime screenshots and computed styles/rectangles SHALL compare existing titlebar/activity/sidebar/tree/tabs/statusbar/controls/managed overlays with pinned upstream reference declarations under recorded Windows fonts, viewport, scale and density. Reports MUST distinguish exact, adapted, unavailable and not applicable; baselines require human visual acceptance.

#### Scenario: Incompatible geometry or missing reference

- **WHEN** upstream size conflicts with mandatory accessibility, a Frade component has no VS Code equivalent or the reference metric is unavailable
- **THEN** the accessible Frade size/behavior remains, a concrete deviation is recorded and no universal pixel-perfect or full-screen parity PASS is claimed
