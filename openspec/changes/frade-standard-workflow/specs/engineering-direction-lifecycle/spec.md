# Engineering direction lifecycle

## Purpose

Defines uniform auditable direction ownership, intake, research, requirement traceability and sequential delivery while preserving existing Frade domain contracts and evidence.

## ADDED Requirements

### Requirement: FWE-001 Direction ownership

Each direction SHALL identify its stable goal/ID, owning branch/worktree, original baseline, current change, allowed paths, dependencies and adopted policy version/hash. Ownership MUST be verified from actual Git registration before writes.

#### Scenario: FWE-001-S01 Reject a foreign checkout

- **WHEN** creation or progression is requested from a checkout outside the canonical Frade Git common directory
- **THEN** the command reports BLOCKED without writing to that checkout

#### Scenario: FWE-001-S02 Preserve isolated owners

- **WHEN** an independent direction starts from an explicitly selected committed baseline
- **THEN** only its registered workspace is writable and foreign uncommitted product files are not transferred

### Requirement: FWE-002 Uniform intake and research

Every direction SHALL follow intake, evidence-based research and requirements before stage planning, using one artifact structure. Unknown product decisions MUST remain explicit; bounded research MUST continue when it does not depend on the unanswered decision.

#### Scenario: FWE-002-S01 Open a direction

- **WHEN** a user requests a new direction by name and goal
- **THEN** the owner records goal/users/outcomes/constraints/exclusions, Git baseline, publication authorization, research sources, alternatives, risks and unresolved decisions

#### Scenario: FWE-002-S02 Reject premature planning acceptance

- **WHEN** a required user/acceptance/compatibility or numerical limit is unresolved
- **THEN** dependent implementation remains BLOCKED rather than guessing a requirement

### Requirement: FWE-003 Safe repeatable bootstrap

Bootstrap SHALL preview the exact branch/worktree/files/baseline/destination, then create an isolated direction with common inherited rules and status. An identical retry MUST recover its original result; collisions or unsafe paths MUST fail without overwriting work.

#### Scenario: FWE-003-S01 Recover a partial creation

- **WHEN** bootstrap is repeated after a partial failure with the identical request identity
- **THEN** it returns the retained result or safe remaining actions without duplicate direction or destructive cleanup

#### Scenario: FWE-003-S02 Reject collisions and escapes

- **WHEN** a branch or target has a different owner/request or its canonical path crosses the approved workspace boundary through a link or traversal
- **THEN** creation fails and pre-existing data is unchanged

### Requirement: FWE-004 Requirements and executable traceability

Every requirement SHALL have stable ID, observable acceptance scenarios, approved constraints and links to tasks and actual executable evidence or an explicit human/future boundary. Critical invariants MUST include meaningful failure and boundary controls.

#### Scenario: FWE-004-S01 Detect missing traceability

- **WHEN** a required acceptance scenario has no meaningful assertion/evidence or approved boundary
- **THEN** checks fail and closure is prohibited

#### Scenario: FWE-004-S02 Keep numeric budgets independent

- **WHEN** performance or geometric tolerance is measured outside its approved budget
- **THEN** the failure remains FAIL and cannot be repaired by silently changing the budget

### Requirement: FWE-005 Sequential stage barriers

Every stage SHALL use coherent planning/strict validation, independent PRE, meaningful RED, implementation, required GREEN, OpenSpec Verify, independent POST and archive/closure. Stronger owner barriers MUST remain. Evidence-only diagnostics MUST explicitly preserve their bounded authority.

#### Scenario: FWE-005-S01 Block implementation before PRE

- **WHEN** an implementation attempt occurs without applicable current PRE PASS and required owner checkpoint
- **THEN** the transition is rejected

#### Scenario: FWE-005-S02 Block POST before Verify

- **WHEN** POST admission is requested before complete applicable GREEN and actual Verify
- **THEN** the transition is rejected

#### Scenario: FWE-005-S03 Keep focused review bounded

- **WHEN** a diagnostic or focused delta receives PASS
- **THEN** unreviewed cumulative scope, visual approval and stage archive remain unapproved

### Requirement: FWE-006 STOP and root cause integrity

Required failures, regressions, invariant/parity errors or specification conflicts SHALL stop the owner. Two unsuccessful fixes of one deterministic defect MUST require classified RCA before another production edit; tests/thresholds/fixtures MUST NOT be weakened to obtain PASS.

#### Scenario: FWE-006-S01 Stop a patch loop

- **WHEN** two attempted fixes fail to resolve the same reproducible defect
- **THEN** the next production change is blocked until responsible layer and root cause are documented

#### Scenario: FWE-006-S02 Preserve historical failures

- **WHEN** a new check succeeds after an earlier failure
- **THEN** the new dated evidence is added and the old raw FAIL remains unchanged

### Requirement: FWE-007 Applicable contract preservation

Each stage SHALL declare general and subsystem-specific checks by affected contract before execution. Routing, UI, repository, metamodel, runtime and adapter invariants remain mandatory where applicable. Unavailable required checks MUST block closure.

#### Scenario: FWE-007-S01 Reject false not-applicable

- **WHEN** a failing affected routing-semantic check is relabelled cosmetic or N/A without a scope/spec decision
- **THEN** applicability validation fails

#### Scenario: FWE-007-S02 Verify process-only scope

- **WHEN** a direction changes only engineering controls/documents
- **THEN** it runs actual control checks and proves product-tree preservation without claiming unexecuted product tests passed

### Requirement: FWE-008 Owner-controlled adoption and integration

Existing directions SHALL adopt reviewed shared controls in their own approved process with exact provenance and preserved origin/history. Integration SHALL revalidate the actual merged candidate and conflicts before authorized target publication.

#### Scenario: FWE-008-S01 Supplier closes independently

- **WHEN** shared workflow supplier passes its own checks/Verify/POST
- **THEN** a consumer's separate adoption failure does not invalidate supplier approval or grant consumer readiness

#### Scenario: FWE-008-S02 Reject inherited merge approval

- **WHEN** a merged tree differs from the feature's approved candidate
- **THEN** required integration checks/review bind to the new tree before merge permission

#### Scenario: FWE-008-S03 Preserve old closure states

- **WHEN** an old change has completed tasks but no verified POST/archive
- **THEN** migration records pending closure rather than inventing CLOSED
