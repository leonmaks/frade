# Engineering progress and publication

## Purpose

Defines a consistent human-readable status, source-bound quality evidence and safe authorized checkpoint publication across all Frade directions.

## ADDED Requirements

### Requirement: FWE-013 Uniform status projection

Every engineering direction SHALL have one tracked status with the same eight primary sections: decision/next action; identity/scope; roadmap; active tasks/steps; checks/gates/quality; models/execution; dependencies/decisions/blockers; Git/publication/evidence. It MUST retain legacy history separately.

#### Scenario: FWE-013-S01 Find the next action consistently

- **WHEN** a participant opens any direction dashboard
- **THEN** the first section states stage/phase/health, next permitted action and required human decision or NONE

#### Scenario: FWE-013-S02 Avoid rewriting legacy history

- **WHEN** an owner adopts the common status format
- **THEN** existing dated history is retained with a clear historical boundary rather than relabelled current

### Requirement: FWE-014 Truthful source-bound metrics

Status SHALL distinguish phase, health, applicability and publication. Progress counts MUST derive from identified tasks/requirements and evidence; quality metrics need approved limits, source/config/environment bindings and actual runs. Missing measurements MUST NOT become PASS.

#### Scenario: FWE-014-S01 Reject unchecked acceptance

- **WHEN** a task is checked complete without its required passing evidence
- **THEN** dashboard/control validation reports the inconsistency and readiness remains false

#### Scenario: FWE-014-S02 Keep checks separate

- **WHEN** task count is 100% while Verify, POST or human visual acceptance is missing
- **THEN** stage closure remains blocked and percentages are not presented as a quality score

#### Scenario: FWE-014-S03 Report unavailable measurements

- **WHEN** a required product metric has not been measured or its environment is unavailable
- **THEN** it remains NOT_MEASURED/NOT_RUN/BLOCKED with next action, not invented PASS

### Requirement: FWE-015 Event-driven status freshness

Owners SHALL refresh status after resume/scope/decision/task/blocker/check/review/Verify/archive/publication events, excluding frozen review intervals. The displayed projection MUST identify source snapshot/update time and distinguish queued panel opening from confirmed visibility.

#### Scenario: FWE-015-S01 Defer during freeze

- **WHEN** a review completes a check while candidate is frozen
- **THEN** the event is retained outside candidate and dashboard updates only after unfreeze

#### Scenario: FWE-015-S02 Avoid stale status claims

- **WHEN** source/checkpoint changed since the dashboard projection
- **THEN** the view flags its stale source binding until regenerated

### Requirement: FWE-016 Durable checkpoint cadence

All directions SHALL commit and push coherent completed tested tasks and planning/gate/stage/blocker checkpoints with new evidence, within previously authorized destinations. Incomplete or failing checkpoints MUST declare non-ready status and MUST NOT satisfy closure.

#### Scenario: FWE-016-S01 Publish a completed task

- **WHEN** a coherent task and its mandatory checks complete outside freeze
- **THEN** the owner explicitly stages allowed paths, commits status/evidence and publishes to the approved feature ref

#### Scenario: FWE-016-S02 Publish blocker evidence honestly

- **WHEN** a required failure is reproduced and a new diagnostic checkpoint is saved
- **THEN** commit/push records FAIL/BLOCKED and preserves original evidence without advancing stage

#### Scenario: FWE-016-S03 Avoid empty publication loops

- **WHEN** a remote verification receipt is generated after a source checkpoint
- **THEN** it references that preceding SHA and enters the next natural checkpoint without recursive empty commits

### Requirement: FWE-017 Authorized verified publication

Push SHALL use only the exact authorized remote/ref and local checkpoint SHA, without force or unrelated ref updates. A fresh remote-SHA check MUST confirm publication; divergent/unavailable/mismatched destination MUST be BLOCKED.

#### Scenario: FWE-017-S01 Reject unauthorized target

- **WHEN** a checkpoint is sent to main, another branch or a remote outside saved human authorization
- **THEN** publication is rejected before changing the remote

#### Scenario: FWE-017-S02 Handle divergent remote

- **WHEN** remote history would require force or remote SHA differs after push
- **THEN** local work is retained and publication is BLOCKED for reconciliation

#### Scenario: FWE-017-S03 Confirm actual publication

- **WHEN** push succeeds and fresh remote query equals the source checkpoint SHA
- **THEN** status records verified remote SHA and PUBLISHED for that checkpoint only

### Requirement: FWE-018 Minimal human decision boundary and onboarding

The process SHALL give newcomers one entry guide and consistent commands/status, automatically handle routine preparation/dispatch/receipt/report/publication, and request human decisions only for material scope/spec/visual/destination/authorization or unresolved environment choices.

#### Scenario: FWE-018-S01 Start from the guide

- **WHEN** a newcomer requests a feature or direction
- **THEN** the guide explains objective input, inherited controls, standard lifecycle, status fields and decision responsibilities without requiring manual prompt relay

#### Scenario: FWE-018-S02 Respect the human boundary

- **WHEN** review findings imply a new product scope or visual baseline
- **THEN** the owner prepares concrete evidence/options and waits for the required human decision rather than treating reviewer findings as approval
