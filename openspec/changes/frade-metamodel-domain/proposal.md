# Proposal

## Why

Draw and the isolated Electron runtime now work, but Frade has no configurable domain vocabulary or reusable model validation. The next master-plan stage must define the domain rules before the compiler and repository services depend on them.

## What Changes

- Add a host-neutral `@frade/metamodel-domain` package with versioned, namespaced ModelDefinition contracts, object/relation definitions and structured diagnostics.
- Define all eleven attribute kinds, defaults, required/nullability rules, recursive lists/objects and reference target rules; validate values without coercion or executing configuration code.
- Implement pure single-inheritance analysis, abstract-type checks and conservative conflicting-override detection over an explicitly supplied complete definition set.
- Define relation direction, endpoint matching, self-reference, duplicate and cardinality rules. Separate type-pair eligibility from validation against a caller-supplied current object/relation snapshot.
- Include declarative lifecycle/UI metadata and model import/profile/viewpoint contracts, while keeping package loading, profile/viewpoint compilation and publication in the next compiler change.
- Add RED→GREEN unit/property tests, executable Gherkin scenarios, architecture checks and verification evidence.

## Capabilities

### New Capabilities

- `metamodel-definitions`: Stable identities, versioned definition contracts, inheritance and structured diagnostics in a platform-independent package.
- `metamodel-attributes`: Typed attribute schemas, pure defaults and recursive value validation.
- `metamodel-relations`: Inheritance-aware relation eligibility and snapshot-based integrity constraints.

### Modified Capabilities

None. Existing Draw and runtime behavior stays unchanged.

## Impact

Adds `packages/metamodel-domain` and its tests/fixtures. Extends root BDD and architecture gates using the existing TypeScript 5.9/Vitest 3 toolchain. Property-test tooling is development-only and pinned during implementation. No new IPC operation, UI, storage adapter or runtime dependency is introduced.

This stage does not load YAML, fetch imports, compile organization/profile/viewpoint overlays, calculate fingerprints/lockfiles, publish model snapshots, enforce concurrent repository writes, implement permission evaluation or migrate data. Those remain the compiler, repository and dynamic-UI phases explicitly sequenced in the master plan.
