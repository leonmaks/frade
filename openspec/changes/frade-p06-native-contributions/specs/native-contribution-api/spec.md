# Spec Delta

## Purpose

Plugins need stable commands, schema-rendered views, settings and custom editor lifecycle using Frade contracts, not arbitrary UI injection.

## ADDED Requirements

### Requirement: Versioned disposable contributions

Commands/views/settings/editors SHALL use namespaced versioned Frade registrations, asynchronous validated DTOs, cancellation and idempotent disposables. Unsupported APIs SHALL return explicit compatibility diagnostics.

#### Scenario: Duplicate namespace

- **WHEN** a package registers another package's command ID
- **THEN** registration rejects without replacing the existing command

### Requirement: Shared accessible representation

Plugin contributions SHALL inherit semantic themes, density, component/focus/keyboard/overlay contracts. Arbitrary workbench DOM or CSS injection MUST be prohibited; shortcut conflicts SHALL be visible.

#### Scenario: Keyboard view

- **WHEN** a plugin tree or settings view is opened by command
- **THEN** it inherits current theme/density and exposes usable keyboard semantics

### Requirement: Dirty custom editor protection

Disable/update/uninstall SHALL protect dirty custom editor state with save/convert/cancel. Failed save or cancel MUST block destructive lifecycle transition and retain draft/identity/undo.

#### Scenario: Save fails on disable

- **WHEN** a dirty custom editor fails its required save
- **THEN** disable remains blocked and editor data are retained

### Requirement: Approved domain contributions only

Repository/Draw/AI contributions SHALL use approved brokered contracts and domain transactions/permissions. Unimplemented providers or unsupported domain operations MUST NOT be presented as integrated.

#### Scenario: Unsupported AI provider

- **WHEN** a contribution has no approved usable provider integration
- **THEN** UI reports its unsupported state without sending context or claiming completion
