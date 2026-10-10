# Spec Delta

## Purpose

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## ADDED Requirements

### Requirement: Bounded declarative packages

Offline file install SHALL validate archive structure, identity, semver engines, known contributions and native role data within declared resource/path limits. It MUST NOT execute JS or write project files. SHA256 SHALL describe integrity, not publisher trust.

#### Scenario: Incompatible sample fixture

- **WHEN** the provided sample targeting Frade 1.x is installed in current 0.1 runtime
- **THEN** the installer rejects compatibility without modifying registrations or files outside staging

### Requirement: Transactional lifecycle and recovery

Install/update/rollback SHALL preserve last committed registry/version on validation or commit failure and recover across crashes through durable journal phases. Update capability increases MUST require a grant before use. Only one version per ID SHALL be active.

#### Scenario: Crash at swap

- **WHEN** installation is interrupted at a journal phase
- **THEN** restart restores or completes the last valid committed registry without losing the previous package

### Requirement: Fallback and safe removal

Disable/uninstall SHALL atomically fallback active theme/icons and preserve dirty work. Unsafe custom-editor closure MUST block removal with save/convert/cancel. Physical cleanup SHALL follow commit and handle release; locked files MUST NOT produce false deletion success.

#### Scenario: Invalid update

- **WHEN** v2 validation fails over installed v1
- **THEN** v1 theme and registrations remain usable and dirty work remains intact

### Requirement: Honest extensions view

Extensions view SHALL expose install-from-file, details, enabled state, updates, retained-version rollback, uninstall and diagnostics according to actual supported operations. Installing a theme package MUST NOT silently change active theme.

#### Scenario: Theme installation

- **WHEN** a valid theme-only archive commits
- **THEN** new choices are available but the active theme stays unchanged until user selection
