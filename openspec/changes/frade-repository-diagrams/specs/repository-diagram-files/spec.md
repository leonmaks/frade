## ADDED Requirements

### Requirement: Repository diagram directory

The system SHALL expose `_diagrams` as the first service folder beneath each repository root in the ordinary navigator, supporting nested folders and arbitrary valid filesystem names.

#### Scenario: Navigate and create documents

- **WHEN** a user creates a nested folder and a diagram under `_diagrams`
- **THEN** the real directory and file appear in the ordinary repository tree and can be reopened and renamed.

### Requirement: Scoped durable persistence

The system MUST confine diagram operations to the owning repository, honour read-only mode, use revision checks and atomically save documents without changing unrelated files.

#### Scenario: External edit conflict

- **WHEN** the file changes on disk after a draft was loaded
- **THEN** saving reports a conflict and retains the draft without overwriting the external content.

#### Scenario: Unsafe path

- **WHEN** a request includes traversal, an absolute path or a symlink outside the diagram directory
- **THEN** the operation fails without reading or writing the target.
