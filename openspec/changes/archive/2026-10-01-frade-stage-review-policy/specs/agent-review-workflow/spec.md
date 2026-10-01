# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic independent review
Frade agents SHALL obtain PRE and POST from a fresh independent read-only invocation using the model and reasoning effort assigned by the approved owning branch's plan for that stage and review role. Dispatch and reception SHALL be automatic without human prompt relay. No repository-wide model/effort default or silent substitution SHALL override the plan. Human scope/contract/visual decisions and stricter applicable gates SHALL remain required.

#### Scenario: Review an approved feature scope
- **WHEN** an approved coherent scope is ready for PRE or verified implementation is ready for POST
- **THEN** its owner dispatches and receives the independent review automatically and preserves actual requested and attested model metadata separately

#### Scenario: Follow different stage assignments
- **WHEN** two stages assign different reviewer models or reasoning efforts
- **THEN** each review uses its own stage and PRE/POST assignment and records exact plan provenance with its request and receipt

#### Scenario: Missing or ambiguous assignment
- **WHEN** the owner cannot establish an approved exact stage assignment or the required model/runtime is unavailable
- **THEN** review progression is BLOCKED for the actual missing decision or environment limitation without choosing a default or fallback

### Requirement: Shared worktree service
A reviewed shared service SHALL discover its current registered Frade worktree and use shared confinement/transport while honoring each approved owning stage model/effort without per-branch account configuration. An unrelated repository SHALL be rejected. Feature sources, process state and historical baseline ownership SHALL remain separate.

#### Scenario: Concurrent independent branches
- **WHEN** UI and Routing owners request reviews from their own worktrees
- **THEN** separate immutable runs bind each owning branch and source without transferring foreign product data or acquiring a foreign completion prerequisite

