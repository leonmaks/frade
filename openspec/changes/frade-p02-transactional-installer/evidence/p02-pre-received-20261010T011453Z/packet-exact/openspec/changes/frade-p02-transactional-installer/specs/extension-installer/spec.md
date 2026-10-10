# Spec Delta

## Purpose

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## ADDED Requirements

### Requirement: Bounded declarative packages

Offline file install SHALL validate archive structure, identity, semver engines, known contributions and native role data within declared resource/path limits. It MUST NOT execute JS or write project files. SHA256 SHALL describe integrity, not publisher trust.

#### Scenario: Incompatible sample fixture

- **WHEN** the provided sample targeting Frade 1.x is installed in current 0.1 runtime
- **THEN** the installer rejects compatibility without modifying registrations or files outside staging


#### Scenario: Archive and schema boundary rejection

- **WHEN** a package exceeds a declared actual byte/count/depth/ratio limit or contains unsafe paths, links, corrupted ZIP metadata, invalid native schema or incompatible engines
- **THEN** installation rejects with a specific diagnostic, no code execution and no writes outside authorized staging, preserving committed registry and dirty work

### Requirement: Transactional lifecycle and recovery

Install/update/rollback SHALL preserve last committed registry/version on validation or commit failure and recover across crashes through durable journal phases. Update capability increases MUST require a grant before use. Only one version per ID SHALL be active.

#### Scenario: Crash at swap

- **WHEN** installation is interrupted at a journal phase
- **THEN** restart restores or completes the last valid committed registry without losing the previous package


#### Scenario: Post-swap rollback and retained version

- **WHEN** a coordinated presentation or durable commit fails after the registry pointer changes, or an explicit retained rollback lacks validated previous bytes
- **THEN** previous committed registry, package and presentation remain recoverable, missing rollback is reported honestly and no mixed generation is exposed

### Requirement: Fallback and safe removal

Disable/uninstall SHALL atomically fallback active theme/icons and preserve dirty work. Unsafe custom-editor closure MUST block removal with save/convert/cancel. Physical cleanup SHALL follow commit and handle release; locked files MUST NOT produce false deletion success.

#### Scenario: Invalid update

- **WHEN** v2 validation fails over installed v1
- **THEN** v1 theme and registrations remain usable and dirty work remains intact


#### Scenario: Unsafe editor and locked cleanup

- **WHEN** a dependent editor vetoes safe removal or physical package files remain locked after a logical lifecycle commit
- **THEN** unsafe removal is blocked with save/convert/cancel and no silent data loss, while cleanup after a successful logical commit is reported pending until actual files can be removed

### Requirement: Honest extensions view

Extensions view SHALL expose install-from-file, details, enabled state, updates, retained-version rollback, uninstall and diagnostics according to actual supported operations. Installing a theme package MUST NOT silently change active theme.

#### Scenario: Theme installation

- **WHEN** a valid theme-only archive commits
- **THEN** new choices are available but the active theme stays unchanged until user selection

#### Scenario: Actual offline lifecycle and restored context

- **WHEN** the user installs and explicitly selects a native theme, updates, disables, rolls back or uninstalls through the actual desktop Extensions view
- **THEN** truthful supported actions and diagnostics use the shared theme/density/keyboard contract, current registry and persisted presentation recover consistently on restart, and dirty editors, selections and domain data are preserved
