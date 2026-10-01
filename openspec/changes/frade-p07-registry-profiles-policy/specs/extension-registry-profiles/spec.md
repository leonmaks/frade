# Spec Delta

## Purpose

Corporate/offline package delivery, profile portability and policy need factual provenance and safe update consent rather than marketplace promises.

## ADDED Requirements

### Requirement: Offline and corporate registry

Builtin/installed packages SHALL remain usable without network. Local file and corporate provider operations SHALL obey source policy and broker origin restrictions; registry failure MUST NOT block editing.

#### Scenario: Offline environment

- **WHEN** public registry is unreachable during file install
- **THEN** offline installation works and builtin themes/editors remain available

### Requirement: Factual provenance and signatures

Package origin/hash and signature verification SHALL be reported separately from claimed publisher. Verified labels MUST require configured trust validation; unsigned packages MUST NOT claim it.

#### Scenario: Unsigned file

- **WHEN** an unsigned package is installed from disk
- **THEN** details accurately show local origin and unsigned status without Verified Publisher

### Requirement: Portable redacted profiles

Profile export SHALL include presentation settings, enabled package IDs/versions/hashes/sources and exclude secrets/private repository contents. Import SHALL resolve available bytes and report missing packages; untrusted workspace MUST NOT grant automatic execution.

#### Scenario: Missing package on import

- **WHEN** an exported profile names a package whose bytes cannot be resolved
- **THEN** import reports unresolved dependency with builtin fallback and no false installation

### Requirement: Policy controlled updates and rollback

New capabilities SHALL require consent before use, retaining old version until grant. Policy SHALL support forbidding executable packages. Rollback SHALL use retained verified previous bytes and report unavailability when absent.

#### Scenario: Capabilities denied

- **WHEN** v2 adds a capability denied by profile policy
- **THEN** v1 remains active with existing grants and no newly privileged execution
