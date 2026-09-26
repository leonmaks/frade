# Proposal

## Why

The completed metamodel domain validates supplied definitions but cannot assemble imported model packages into a reproducible published model. The next master-plan stage needs a host-independent compiler before Repository Core can consume organization models.

## What Changes

- Add `@frade/metamodel-compiler` with injected source loading and SHA-256 ports, structured diagnostics and deterministic composition.
- Resolve exact-version imports, inheritance and additive organization extensions. As confirmed by the user on 2026-09-24, imported types may gain attributes without deleting or weakening existing constraints.
- Preserve the existing domain ModelDefinition schema by using a compiler-owned source envelope for extensions.
- Compile profile and viewpoint type selections without changing domain validity rules.
- Produce content fingerprints and a verifiable model lock DTO; publish immutable snapshots atomically, including overlapping compilation protection.
- Provide read-only model impact and migration previews using caller-supplied repository state; never mutate or delete objects.
- Add executable BDD, unit/property/consumer/boundary tests and root verification integration.

## Capabilities

### New Capabilities

- `metamodel-compilation`: bounded source loading, exact imports, additive extensions, domain analysis and structured failure.
- `metamodel-projections`: profile/viewpoint selections and constraint-preserving presentation.
- `metamodel-publication`: canonical fingerprints, model locks, atomic snapshots and read-only upgrade previews.

### Modified Capabilities

None. Existing workspace and verification requirements are reused unchanged. Completed metamodel-domain contracts remain compatible; the compiler composes through their public API.

## Impact

New package and tests; root BDD script, workspace lockfile and architecture gates gain compiler coverage. Only metamodel-domain is a production package dependency. No source Draw repository edits, Draw/desktop UI changes, privileged I/O, YAML adapter, permission engine or repository write implementation.

The compiler owns lock DTOs and read-only previews, not lockfile disk persistence or migration execution. Repository Profile operation authorization and persisted repository model-version adoption remain explicit Repository Core follow-ups; this stage compiles existing type-selection contracts only.
