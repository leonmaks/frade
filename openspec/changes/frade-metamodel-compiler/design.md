# Design

## Context

See proposal.md for motivation. The existing metamodel-domain package exports decodeModel, analyzeModel and validateSnapshot. Its schemaVersion-1 ModelDefinition has exact-version imports, single inheritance, attribute definitions, profiles and viewpoints, but no extension syntax. decodeModel checks shape without loading imports; analyzeModel expects a complete flattened model and exposes caller-owned ReadonlyMaps. It rejects incompatible inherited attribute/lifecycle overrides. Snapshot validation checks defaults but does not materialize them in stored data.

The workspace uses TypeScript 5.9.3, Vitest 3.2.7, fast-check 4.10.2 and executable Gherkin through Cucumber 35.1.0. Root check:all already includes Draw browser and real Electron regressions. The domain BDD runner is synchronous; asynchronous compiler steps require an awaited runner, not reuse that silently drops promises. Existing architecture checks forbid domain dependencies and can be extended with a separate compiler allowlist.

## Goals / Non-Goals

Goals: composition with explicit provenance, deterministic identity, safe publication and reviewable upgrade consequences. Implement a library consumable by future Electron, server and CLI hosts without choosing any of them now.

Non-goals: YAML/file/network adapters, persistent caches, dependency ranges, arbitrary domain-constraint overrides, organization authorization, migration execution, UI or IPC wiring. Operation-level profile permissions and persisted repository version adoption remain Repository Core work; a type projection is not an authorization result.

## Decisions

### 1. Source envelope and injected ports

Expose a compiler-owned ModelSource envelope:

- sourceSchemaVersion: 1
- definition: existing ModelDefinition
- extensions?: readonly { targetKind: 'object' | 'relation'; targetId: string; attributes: readonly AttributeDefinition[] }[]

The root input is unknown structured envelope data or JSON text. ModelLoader.load({id, version}) asynchronously returns the same input forms for imports. A HashPort.sha256(canonicalText) returns lowercase 64-character hexadecimal SHA-256 of UTF-8 text; hosts supply this port. Tests use Node's actual crypto implementation with known vectors, including Unicode. Reject malformed hash outputs and wrap thrown port failures.

This avoids adding compiler fields to the already completed domain schema or coupling a pure library to Node/WebCrypto globals. A custom cryptographic implementation is rejected: hash correctness belongs to a standard host implementation, with a documented port conformance test. No hash identifies untrusted code or provides a signature/authenticity guarantee.

Validate envelope property descriptors and finite JSON shape before reading values; do not trigger accessors. Reuse public domain decode for definition/attribute semantics, including synthetic bounded definitions for extension attributes if needed, never deep-import private validators. Envelope/source/lock validators may have compiler-specific structural traversal but must not reimplement domain semantics.

Document default maximums: 1,000,000 UTF-16 code units per JSON text; nesting depth 64; 100,000 visited values per source; 1,024 packages including root; 8,192 import edges; 128 graph depth; 1,000,000 aggregate source values; 100,000 flattened-model visited values. Exceeding any limit fails, not truncates. Bound raw JSON size before parsing and validate parsed depth/value budgets. Use iterative graph traversal. No configurable larger limits in the initial API. Loader timeout/cancellation is a host responsibility; an unresolved load cannot publish but this library does not promise a wall-clock timeout.

### 2. Import graph, provenance and diagnostics

A compilation has its own exact-identity source cache; no cross-run cache hides same-version drift. Visit imports sorted by stable ID/version, deduplicate diamonds, reject cycles and multiple versions of the same ID. Validate identity returned by the loader against the request. Keep package provenance and import ancestry. Duplicate entity IDs across definitions fail, even if identical; enforce one namespace across object/relation/profile/viewpoint entities so lookups are unambiguous.

CompilerDiagnostic extends the information, not the domain DiagnosticCode union: code, severity:error, stage, modelId/modelVersion when known, path and optional entityId. Preserve wrapped domain codes. Compiler codes include INVALID_SOURCE, LOAD_FAILED, IMPORT_CYCLE, IMPORT_IDENTITY_MISMATCH, VERSION_CONFLICT, DEFINITION_COLLISION, EXTENSION_CONFLICT, INVALID_EXTENSION_TARGET, INVALID_PROJECTION, HASH_FAILED, LOCK_MISMATCH, SUPERSEDED and BINDING_MISMATCH; preserve RESOURCE_LIMIT and UNSUPPORTED_VERSION where appropriate.

Sort diagnostics by package identity, stage, entity ID, canonical path and code using code-unit comparison, never locale-sensitive comparison. Structural paths may carry source indices; semantic paths use stable IDs. Report actionable public messages, not arbitrary loader exception strings, stack traces or host paths. Failures return no candidate value. Do not claim complete diagnostics for graph branches that could not be loaded.

### 3. Extension merge and inheritance

The user's 2026-09-24 choice permits adding attributes to imported types, not just creating subtypes. The narrow extension DTO intentionally has no delete/replace/constraint fields. Object and relation attributes use the same domain definition contract.

First assemble and analyze the unextended import closure to resolve inheritance and detect invalid original packages. Extensions cannot repair broken base models. Each declaring package can target types owned by its transitive imports, not its own types or sibling-only packages; local types already declare their attributes directly.

Collect extension additions before mutation. Against original effective attributes reject own/inherited attribute reuse. Reject duplicate added IDs on the same target, including identical duplicates, and collisions between additions on ancestor/descendant targets. Merge disjoint additions in stable package/target/attribute order into copied raw definitions. Re-run analyzeModel on the merged set to propagate ancestor additions and detect collisions with existing descendant declarations. Existing descendant redeclarations remain subject to domain semantic equality rules; incompatible redeclarations fail.

This deliberately performs a final inheritance analysis after the master's Resolve inheritance -> Merge extensions stages. Editing only precomputed effective maps would miss descendant propagation and violate the requirement. Final analysis plus provenance remains the sole semantic authority. Relation policies and existing fields are copied unchanged. No first/last-import-wins semantics.

### 4. Profile and viewpoint compilation

Compile exact type-ID selections into sorted arrays and immutable lookup data. No implicit subtype expansion; [] means nothing. Project(profileId?, viewpointId?) intersects supplied selections; absence of both means the full model. Unknown selectors fail. Relation selection remains explicit even if endpoint types are hidden; UI visibility does not establish relation eligibility.

Viewpoint presentation entries must belong to that viewpoint's selected types. Override only typed UI fields (label, description, group, order) in projection presentation data; never edit the full effective definitions. Keep the complete analysis for repository validation so hidden types/required references/minimum cardinalities are not bypassed. Abstract types can be selected but remain non-instantiable under domain rules.

### 5. Canonical identity and lock format

Use a versioned canonical encoding with code-unit-sorted object keys and ID-sorted keyed declaration collections. Normalize optional empty extensions to []; domain booleans/cardinality policies use their documented defaults for compiled definitions. Sort imports, types, attributes, profiles, viewpoints, selection IDs, enum sets, reference target sets, lifecycle states/transitions and presentation entries. Preserve lineage order and arbitrary JsonValue array order in defaults; do not recursively sort every array. Preserve text exactly without Unicode normalization. JSON formatting and declaration ordering are irrelevant. Explicit UI order is content.

Compute each source content hash over its canonical envelope before extension composition, including import identities and declarations. Source hashes intentionally distinguish different explicit source declarations even when effective domain defaults happen to be equivalent. The model fingerprint hashes a canonical payload with fingerprintFormatVersion:1, root identity, sorted package IDs/versions/content hashes, effective types and all compiled profile/viewpoint definitions. Extension content is captured by source hashes and effective definitions. No timestamp, loader URI or insertion order enters the payload.

ModelLock DTO: lockSchemaVersion:1, fingerprintFormatVersion:1, root:{id,version}, packages:[{id,version,contentHash}], fingerprint. Include root in packages. Validate locks as unknown bounded data, reject unsupported fields/versions, duplicates and malformed hashes. Locked mode still loads sources and recomputes every hash: compare the exact graph, root and fingerprint. Unlocked compilation generates a fresh DTO but never writes files or edits a supplied lock. A lock verifies reproducibility, not publisher authenticity.

### 6. Candidate and atomic publisher API

compileModel(input, ports, options?) is asynchronous and returns an immutable candidate plus lock, or diagnostics. It has no publication side effects. createModelPublisher(ports) encapsulates the currently published candidate. Its compileAndPublish(input, options?) increments a generation before starting, compiles privately and swaps the complete state only on success if that generation is still current. Older completions return SUPERSEDED, including after a newer failed attempt. A failed newest request leaves the last successful snapshot intact. No subscription/callback/event delivery is required in this stage.

Deep-freeze JSON-shaped snapshot records/arrays; do not publish a mutable Map merely typed ReadonlyMap or Object.freeze(Map). Keep lookup maps private and expose query methods/read-only wrappers with no reachable mutators. Domain-analysis access returns defensive caller-owned copies if consumers need ModelAnalysis. All source, diagnostic, projection, lock and nested default data must be isolated; freeze/copy tests try actual runtime mutation. Avoid freezing caller-owned inputs.

### 7. Model impact and migration preview

compareModels(old, candidate) produces stable-ID added/removed/changed lists for object/relation/profile/viewpoint definitions and model/package metadata. Presentation-only changes are classified separately. Any validation-affecting type/attribute/relationship change requires review, including required fields with defaults; no unsupported type-lattice compatibility proof. Profile selection changes are projection changes, not proof of unchanged access permissions. Even an empty structural diff can report version/source identity changes.

previewMigration accepts old/candidate, optional complete ProspectiveSnapshot and a RepositoryModelBinding {modelId, modelVersion, fingerprint} when data is supplied. Binding must match old identity exactly. Missing data returns repositoryStatus:not-evaluated; with data, validate against the candidate through validateSnapshot and return valid/invalid plus diagnostics mapped to repository-qualified object/relation references (not ambiguous objectId alone). Failed old binding returns a diagnostic, not a preview compatibility claim.

The caller asserts the provided snapshot is complete; the compiler cannot prove repository completeness, revisions or freshness. Preserve existing objects/relations byte-for-byte, including absent default fields. Do not emit executable deletion/migration commands. Disk lock persistence, transactional adoption, repository revisions, conflict handling and user-approved transformations are later Repository Core/adapter responsibilities.

### 8. Verification and integration

Mirror established package scripts and ES2022-only consumer fixture; allow only @frade/metamodel-domain as production dependency. Extend source, manifest and dynamic-loading boundary negative tests without relaxing domain isolation. Pin existing compatible test versions and add compiler BDD to root test:bdd; Turbo handles package scripts through declared dependency order.

Planning Gherkin lives in this change. During implementation copy it into package tests/features and build an async assertion-bearing runner that awaits every step and expands every Examples row. Missing/ambiguous bindings, unknown children/arguments, rejected steps and unresolved placeholders fail. Share test helpers only if that does not couple production packages or import test modules with side effects.

Follow task-level RED -> GREEN -> refactor. Property tests use fixed seed 20260924 and at least 200 runs for reorder determinism, source purity, immutable result isolation, additive constraint preservation and publication ordering. Deferred-promise tests control loader completion without timing sleeps. Run full existing browser/Electron gates; no baselines should change.

## Risks / Trade-offs

- New required attributes can invalidate repository data -> explicit review classification and read-only data preview, never automatic adoption.
- Extensions can conflict indirectly through inheritance -> pre-merge collision checks and complete post-merge domain analysis.
- Hash port misuse -> documented UTF-8 SHA-256 contract, known-vector conformance and cross-host follow-up; malformed/failed results cannot publish.
- Large or hostile sources -> per-source/aggregate/graph budgets and explicit unsafe-value tests; no execution of source values.
- Readonly TypeScript is not runtime immutability -> private maps and mutation-attack tests.
- Projection visibility may be mistaken for authorization -> API/docs explicitly separate visibility, domain validation and later permissions.
- A permanently pending host loader keeps one request pending -> no partial publication, host-owned timeout; bounded computation is not a timeout guarantee.

## Migration Plan

Add the compiler without changing the domain schema or wiring production UI. Supply compiler envelope examples for at least two organizational vocabularies. Existing ModelDefinition callers continue unchanged; compiler callers wrap them with sourceSchemaVersion and definition.

Integrate gates and record measured evidence in docs/verification/metamodel-compiler.md only after implementation. No repository data or lock files are written. Rollback before adoption removes only the new package and gate wiring. Leave completed changes and Draw source checkout untouched; archive only on a separate authorized workflow after verification.
