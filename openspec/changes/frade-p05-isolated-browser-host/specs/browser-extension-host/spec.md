# Spec Delta

## Purpose

Executable native Frade browser plugins need isolation and explicit capabilities; a separate process alone is not sufficient.

## ADDED Requirements

### Requirement: Isolated execution

Browser plugin code SHALL run in an isolated Worker within a sandboxed dedicated host, without workbench DOM, generic privileged API or direct network. Main SHALL validate IPC sender/frame/origin and versioned DTOs.

#### Scenario: Plugin requests Node or workbench DOM

- **WHEN** a package attempts privileged access
- **THEN** access is unavailable and the workbench remains functional

### Requirement: Capabilities and scoped broker

Every privileged request SHALL be bound to package generation, grant revision, workspace trust and allowlisted capability/resource. Secrets SHALL be opaque handles rather than plaintext. Denied writes MUST leave repository unchanged.

#### Scenario: Denied write

- **WHEN** a plugin lacking repository.proposeWrite requests mutation
- **THEN** broker denies with attributed diagnostic and zero repository writer calls

### Requirement: Lifecycle and recovery

Activation SHALL time out after 5 seconds. Crash/deactivate SHALL clean registrations/subscriptions and preserve recoverable editor state. Stale callbacks MUST be ignored; retry MUST NOT create an infinite restart loop.

#### Scenario: Old callback

- **WHEN** v1 callback arrives after v2 generation activates
- **THEN** the callback cannot mutate current registrations or state

### Requirement: Browser contract parity

Web and Electron browser hosts SHALL expose equivalent versioned broker capabilities and cancellation behavior without implying native binary or vscode module compatibility.

#### Scenario: Unsupported runtime API

- **WHEN** a plugin declares incompatible Frade API or native dependency
- **THEN** activation is rejected with compatibility diagnostics before execution
