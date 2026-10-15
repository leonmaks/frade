# review-snapshot-integrity Specification

## Purpose

Bind immutable read-only Frade review candidates, explicit tracked absence and trusted control publication to complete source and installation evidence.

## Requirements

### Requirement: Immutable candidate identity
Snapshots SHALL bind HEAD, branch, full status and actual raw index identity without modifying them. Unsupported index modes and staged changes SHALL fail closed.

#### Scenario: Stable dirty checkout
- **WHEN** a supported dirty checkout is captured twice without writes
- **THEN** digest is stable and raw index bytes and Git identity remain unchanged

#### Scenario: Identity or index drift
- **WHEN** index, HEAD, branch, status or staged state changes during capture or review
- **THEN** the result is rejected and cannot grant a gate

### Requirement: Explicit tracked absence
Only proven stage-zero regular tracked worktree deletions SHALL receive digest-bound negative records with exact path, mode and index blob. Absent entries SHALL never become live packet artifacts.

#### Scenario: Intentional tracked deletion
- **WHEN** Git proves an unstaged tracked deletion and safe filesystem lookup proves ENOENT
- **THEN** complete snapshot retains its negative record while the selected packet contains only live bytes

#### Scenario: Restoration or false absence
- **WHEN** an absent file returns, an untracked file disappears, a staged deletion occurs or absence lacks matching Git proof
- **THEN** digest changes or capture rejects; absence is not silently omitted

### Requirement: Fail closed live capture
All live tracked and nonignored untracked files SHALL retain exact raw hashes. Existing containment and symlink guards SHALL also cover ancestors of absent paths.

#### Scenario: Unsafe path or reparse ancestor
- **WHEN** a candidate path escapes its root or uses a symlink or junction ancestor
- **THEN** capture rejects without outside-root access

#### Scenario: Live byte or path drift
- **WHEN** live bytes, enumeration or declared packet paths change
- **THEN** candidate or packet verification rejects the drift

### Requirement: Trusted executor publication
Publication SHALL verify the complete successful POST against its pinned trusted executor release and exact generated instance, then verify every candidate release byte against that POST packet. Executor templates and candidate templates SHALL remain distinct.

#### Scenario: Reviewed control upgrade
- **WHEN** the trusted previous executor reviews changed candidate controls with a complete immutable PASS
- **THEN** publication validates both provenance chains and publishes only exact reviewed candidate bytes

#### Scenario: Forged or incomplete provenance
- **WHEN** release, generated instance, owner, plan assignment, verdict, stream, packet or candidate proof is missing or altered
- **THEN** publication fails without updating the installed pointer

### Requirement: Immutable release installation
A new content-addressed release SHALL preserve prior releases and policy semantics, verify installed bytes and replace only the expected pointer. Each consumer SHALL revalidate adoption using its own approved stage.

#### Scenario: Concurrent pointer change
- **WHEN** the expected previous pointer changes before installation
- **THEN** installation stops rather than overwriting another publication

#### Scenario: Main consumer closure
- **WHEN** Main adopts exact reviewed controls with UI and foreign bytes preserved
- **THEN** its own fresh independent POST must pass before archive; supplier PASS alone cannot close it
