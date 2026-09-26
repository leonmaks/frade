# Design

## Context

See proposal.md for motivation. The repository has five working packages: Draw, runtime-contracts, runtime-node, runtime-electron and desktop. There is no metamodel or repository domain package. TypeScript 5.9.3, Vitest 3.2.7, React 18 and Vite 6 are established. Root gates already run package scripts, boundary tests, Draw Chromium and real Electron E2E.

The master plan separates Metamodel Domain from Metamodel Compiler and Repository Core. This design provides pure semantic building blocks; it does not introduce a second compiler or speculative repository implementation.

## Goals / Non-Goals

Goals: a usable typed domain API, validated definitions/values, inheritance and relation constraints; testable failure semantics; no host dependencies.

Non-goals: parsing YAML text, loading imports, composing model packages/profiles/viewpoints, fingerprints/publication, permission enforcement, repository transactions, UI forms or IPC changes. Taxonomy/hierarchy authoring beyond the specified object inheritance and enum vocabulary belongs to later explicitly scoped capabilities; no claim of full configuration-platform completion is made here.

## Decisions

### Package and trust boundary

Add `packages/metamodel-domain` with definition, diagnostic, inheritance, attribute and relation modules and one public export. Production code uses only local modules and standard JavaScript; no production dependencies. Match existing package scripts/tool versions. Extend source and manifest boundary checks to reject UI, Node builtins, Electron, runtime and storage imports, including negative fixture tests.

Use readonly TypeScript discriminated unions plus pure runtime decoders accepting unknown structured data. A schema-only third-party library would not replace semantic checks; handwritten discriminant dispatch keeps the package dependency-free and explicit. Inputs must be JSON-shaped; reject functions, cyclic values, non-finite numbers, unsupported keys and prototype-polluting property names. Publish a maximum recursive depth of 64 and a 100,000 visited-value budget with deterministic limit diagnostics, not silent truncation.

### Identity and definition envelope

`ModelDefinition` preserves the master's schemaVersion, id, version, imports, objectTypes, relationTypes, profiles and viewpoints. Start schemaVersion at 1; validate SemVer 2.0.0 strings. Model/type/profile/viewpoint IDs use `namespace:local-name` (ASCII alphanumeric initial characters; dot, underscore and hyphen allowed within either part). Attribute and lifecycle keys are local stable identifiers, not labels.

Model imports identify an exact model ID/version in this domain contract; fetching/version selection is a compiler responsibility. Profiles declare allowed object/relation IDs. Viewpoints declare selected object/relation IDs and presentation metadata only. Neither contract provides an override channel for domain constraints. UI metadata is typed label/description/group/order data, not arbitrary HTML or code. Lifecycle declares unique states, an initial state and allowed transition pairs; validate declared endpoints. Lifecycle inheritance is unchanged unless a structurally identical declaration is repeated. State transition authorization by a user/session is outside this package.

Raw decoding validates declaration shape but does not pretend external imports are resolved. A separate semantic analysis operation receives a complete flattened set of definitions supplied by the future compiler and rejects unresolved type references. This preserves the compiler's load/resolve/merge/publish ownership.

### Inheritance primitives

Use an explicitly supplied complete object-type map; reject duplicate IDs and unknown parents before exposing analysis. Detect cycles without recursive stack dependence. Build lineage and inherited attributes in deterministic ID order. Single inheritance is deliberate MVP policy from the master plan.

Conservative override policy: inherited attribute domain semantics must be equal (kind, required, nullable, default and all nested constraints); only presentation labels/descriptions can change. Supporting arbitrary constraint narrowing now would require a subtype lattice for recursive schemas. Reject conflicting redeclarations rather than silently dropping inherited rules. A child type's abstract flag is its own explicit declaration (default false); inherited required attributes still apply.

The compiler will call these primitives after resolving imports; no I/O, model publication or fingerprints occur here.

### Value validation and defaults

Each attribute is an ID plus a recursive value schema, independent required/nullable flags and optional default. Value schemas cover all eleven kinds. Integer means safe integer; decimal means finite JavaScript number (not financial arbitrary precision). Date is strict YYYY-MM-DD with leap-year/calendar checks; datetime is RFC3339-style timestamp with seconds and explicit Z/offset, rejecting invalid dates and leap seconds. Strings/text use code-point length bounds; enum values are unique strings. Objects contain named field definitions and reject undeclared fields; lists contain item schemas and min/max item counts.

Validation does not coerce values. Default application returns copied data and diagnostics, never edits callers' input. Validate defaults through the same value machinery. Missing optional parent objects remain absent. Explicit null remains null when nullable and fails otherwise. Reference defaults receive structural validation with the schema and target resolution when applied with instance context.

Reference values are structural `{ repositoryId, objectId }` records. A caller-supplied read-only map resolves target types; missing information fails as unresolved. Future Repository Core can reuse this shape without introducing a dependency in the opposite direction.

### Relations and complete-state validation

Expose separate type-pair eligibility and complete prospective-snapshot validation. Snapshot DTOs contain repository-qualified object references, type IDs, attributes and independently identified relations; no storage paths, revisions or I/O are needed for these checks. These are validation inputs, not an implementation of repository aggregates.

Relation definitions contain source/target allowlists with an explicit includeSubtypes flag, direction, allowSelfReference, duplicate policy, attributes and source/target bounds. Null maximum means unbounded; minimum is a nonnegative integer. Defaults are min=0, max=null, directed, no self-reference and forbid-same-type-and-pair. An undirected relation must declare equal endpoint bounds; it matches either orientation and counts each incident relation once, even an allowed self-loop. Directed counts distinguish incoming and outgoing roles.

The caller supplies the final prospective snapshot: add/replace/remove work happens before validation, so updates cannot be accidentally double-counted. Validate duplicate relation IDs and dangling endpoints before counting valid relations. Minimum cardinality includes eligible objects with zero relations. Pair keys include repository IDs and relation type; undirected keys canonicalize endpoint order. Relations rejected structurally or by endpoint rules do not satisfy a minimum.

Eligibility never promises successful mutation; final validation is correct only for the complete state supplied. Repository Core later owns freshness, concurrency and transactions.

### Diagnostics and executable evidence

Results use success/data or diagnostics, with stable code, severity, entityId when known and structured path segments. Semantic paths are entity-relative so collection reordering does not change them; raw decode errors may use input indices. Sort semantic diagnostics by entityId, path and code, with deterministic tie-breaking. Return no partial usable analysis on definition failure.

Commit Gherkin under the package's tests/features/metamodel and execute parsed scenarios through real assertion-bearing steps in Vitest. Unknown or ambiguous steps and unexpanded outline rows fail the suite. Feature files in this change directory are planning inputs, not passing evidence.

Unit tests cover kind/bound matrices and negative cases; fast-check property tests cover purity, deterministic ordering, default-copy isolation, subtype transitivity and undirected orientation invariance. Pin the compatible fast-check version at implementation time, keeping it development-only. Record seeds/failing counterexamples. Each task uses RED → GREEN before refactoring.

## Risks / Trade-offs

- Overlap with compiler responsibilities → accept complete supplied definitions but never load, merge packages, publish or fingerprint.
- Incomplete repository context can hide constraints → separate eligibility/final APIs and document complete prospective-snapshot preconditions prominently.
- Conservative overrides limit model authoring → explicit diagnostics and documented MVP rule; no silent weakening.
- Recursive malicious input → bounded traversal, cycle detection and negative tests.
- New domain API could leak infrastructure dependencies → source, package-manifest and consumer contract gates.
- Broader metamodel platform remains incomplete → keep compiler, policy execution, taxonomy authoring, model migrations and UI tasks visible as later stages.

## Migration Plan

Add the package without importing it into Draw or desktop. Add fixtures demonstrating two configurable company vocabularies. Integrate BDD and boundary checks, run package tests and the complete existing root gate, then save evidence. There is no data migration or persisted format currently consumed by users. Rollback before adoption consists of removing the new package and its gate wiring; no repository data is touched.
