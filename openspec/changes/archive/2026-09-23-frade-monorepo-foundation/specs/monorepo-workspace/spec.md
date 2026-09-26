# Spec Delta

## Purpose

Defines a reproducible workspace contract from which Frade applications and shared packages can be developed, verified, and released without hidden machine-specific state.

## ADDED Requirements

### Requirement: Reproducible workspace installation

The workspace SHALL declare one package-manager version and a committed lockfile. A clean checkout with the supported Node.js version MUST install with frozen dependency resolution and MUST NOT require npm-managed package state from the source Draw repository.

#### Scenario: Install a clean checkout

- **WHEN** a developer installs the workspace from a clean checkout using the declared package manager and frozen lockfile mode
- **THEN** all declared workspace projects and their compatible dependency versions are installed without modifying the lockfile

### Requirement: Root command contract

The workspace SHALL expose root commands for development, build, typecheck, lint, unit tests, browser tests, and the complete verification pipeline. A root verification command MUST return a non-zero exit code when any participating project fails its required check.

#### Scenario: Run complete verification

- **WHEN** a developer invokes the complete root verification command
- **THEN** lint, typecheck, automated tests, and production builds run for every applicable workspace project and the command reports their aggregate result

### Requirement: Dependency-aware task execution

Workspace tasks SHALL respect declared package dependencies and SHALL produce outputs in documented project-local directories. Cached execution MUST NOT treat an incomplete or failed prior task as successful.

#### Scenario: Build a dependent application

- **WHEN** an application build depends on a changed shared package
- **THEN** the shared package is built before the application and the application consumes the current package output

### Requirement: Strict shared TypeScript baseline

All TypeScript workspace projects SHALL inherit a strict shared compiler baseline while retaining only the environment-specific overrides they require. Production packages MUST NOT suppress type errors to complete a build.

#### Scenario: Detect an invalid package contract

- **WHEN** a workspace package violates an exported TypeScript contract
- **THEN** the package and root typecheck commands fail before a release artifact is accepted

### Requirement: Enforced architectural package boundaries

The workspace SHALL keep diagram-domain code independent of Electron, repository storage, Git, SQL, and filesystem implementations. Future runtime and adapter projects MUST depend on shared domain or port contracts rather than creating reverse dependencies from those contracts to hosts or infrastructure.

#### Scenario: Verify Draw dependency isolation

- **WHEN** workspace dependency rules are evaluated for the Draw package
- **THEN** no Electron, repository adapter, Git, SQL, or privileged filesystem dependency is reachable from Draw production code
