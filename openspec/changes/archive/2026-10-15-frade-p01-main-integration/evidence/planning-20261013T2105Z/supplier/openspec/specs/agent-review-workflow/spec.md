# agent-review-workflow Specification

## Purpose

Provides independent automatic Frade engineering reviews and visible branch-owned progress while preserving feature isolation and gate authority.

## Requirements

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

### Requirement: Fail-closed bounded review
Review commands SHALL read only the immutable packet and public runtime tools, with source/other-worktree/auth/config/write/network access denied. Only a clean complete result with exactly one verdict and unchanged source/packet/control hashes SHALL count; missing or failed proof SHALL block progression.

#### Scenario: Reject false review success
- **WHEN** a report says PASS but execution fails, stream truncates, two verdicts appear or source/packet drifts
- **THEN** the result is BLOCKED with preserved raw evidence and cannot authorize implementation/archive

### Requirement: Shared worktree service
A reviewed shared service SHALL discover its current registered Frade worktree and use shared confinement/transport while honoring each approved owning stage model/effort without per-branch account configuration. An unrelated repository SHALL be rejected. Feature sources, process state and historical baseline ownership SHALL remain separate.

#### Scenario: Concurrent independent branches
- **WHEN** UI and Routing owners request reviews from their own worktrees
- **THEN** separate immutable runs bind each owning branch and source without transferring foreign product data or acquiring a foreign completion prerequisite

### Requirement: Branch-owned progress
Every active engineering branch SHALL maintain its own tracked status file with actual tasks/phases/gates/checkpoints/blockers and update it on meaningful events. A frozen review SHALL defer dashboard writes until its result is received. Progress SHALL never substitute for authority or evidence.

#### Scenario: Review completes with a blocker
- **WHEN** an independent review completes FAIL
- **THEN** the owning status records that exact scope/result/blocker and next decision after unfreezing, with old dated evidence unchanged

### Requirement: Honest adoption
Shared policy installation SHALL preserve exact verified public files and existing rules. Active foreign checkout edits and baseline movement SHALL not be used for adoption. Existing stale agent instructions SHALL use an explicit owner handoff rather than a false claim of automatic reinstruction.

#### Scenario: Routing adopts common rules
- **WHEN** the Routing owner receives the shared-rule handoff
- **THEN** it loads the same installed policy/runner, preserves original frozen controls, reviews necessary adoption and resumes only after its own required gates pass
