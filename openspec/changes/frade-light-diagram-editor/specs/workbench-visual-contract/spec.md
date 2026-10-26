# Workbench visual contract delta

## MODIFIED Requirements

### Requirement: Opt-in reference geometry and honest fidelity

Only frade.reference/vscode-dark-2026 SHALL enable reference geometry on comparable external workbench controls. External density stays independent. Mandatory accessibility and semantic preservation remain. Editor-owned UI SHALL use pinned upstream Light with fixed geometry and declared accessibility/system adaptations.

#### Scenario: User switches theme or density
- **WHEN** preview, commit, cancel or density changes occur
- **THEN** external geometry follows its theme/density, editor geometry remains upstream and layout/documents stay unchanged

#### Scenario: Reference shell around upstream editor
- **WHEN** reference is selected with either engine
- **THEN** external workbench alone uses reference geometry while editor controls use the common pinned source with disclosed adaptations
