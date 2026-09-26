# Design

## Context

See proposal.md for motivation and scope. Existing `metamodel-domain` exports `ObjectReference`, `RelationReference`, JSON values and pure validators. `validateSnapshot` accepts only validation fields and requires complete prospective state; passing architecture objects directly would fail its unknown-field checks. `validateAttributes` returns copied/defaulted attributes, whereas snapshot validation does not materialize them. `metamodel-compiler` exports immutable `CompiledModel`, defensive `analysis()` and `RepositoryModelBinding`. These packages are implemented but not wired to storage or the desktop UI.

The workspace already uses strict TypeScript 5.9.3, Vitest 3.2.7, fast-check 4.10.2, Cucumber parsing and source/manifest boundary tests. No Repository Core packages exist. Existing specifications impose workspace integration and inward dependency rules without requiring changes to their text.

## Goals / Non-Goals

**Goals:** Make adapter guarantees visible in types and enforce them at application boundaries; use real metamodel validation; provide deterministic core race tests and isolated real-filesystem integration tests; deliver the P0/P1 vertical slice and explicitly bounded P2 contracts from the current master prompt.

**Non-Goals:** Infer disk/SQL correctness from memory fixtures, invent an unknown external schema, introduce cloud dependencies, distributed transactions or automatic model migration. Domain references are repository-qualified. ChangeSets belong to one transaction domain; external resolution uses an explicit federation port, and unsupported foreign mutations are rejected. Authentication is supplied by each host; authorization remains mandatory in the application.

## Decisions

### 1. Three packages following the target architecture

| Package                | Allowed production workspace dependencies                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| repository-domain      | metamodel-domain, metamodel-compiler (binding type only)                  |
| repository-ports       | repository-domain                                                         |
| repository-application | repository-domain, repository-ports, metamodel-domain, metamodel-compiler |

Reuse public reference and model-binding types through aliases/re-exports; do not create competing identity schemas. Keep compiler binding imports type-only in repository-domain. All production and consumer typechecks use ES2022-only libraries. Tests may use Node and pinned test libraries. The existing source/manifest checker gains policies and negative fixtures for all three packages, including deep-import and dynamic-loading escapes.

Alternative: one combined package would obscure the port/application direction already required by the master prompt. Moving metamodel types to a new shared package would unnecessarily change verified APIs.

### 2. Portable DTOs and exact identity

Use the master-prompt `ArchitectureObject` and `ArchitectureRelation` fields. Revisions and snapshot revisions are branded opaque nonblank strings; compare for equality only. Object names must be nonblank but retain their original content. Identity keys encode tuples including resource kind, never concatenate arbitrary IDs with ambiguous separators. Stable identity is distinct from optional `ResourceProvenance` records containing entity kind/reference and adapter-owned opaque locator plus optional display label. Locators are data, not executable filesystem authority.

Safe descriptor-based unknown-input decoders copy plain JSON without invoking accessors. Reject symbols, undefined, invalid prototypes and unsafe keys at every depth; enforce depth 64 and 100,000 visited values using the metamodel traversal counting convention. Do not import its private decoder files. Snapshot aggregate decoding uses the same budget over the full envelope; excessive snapshots fail explicitly, not by pagination/truncation. Metamodel binding verifies version and fingerprint syntax with compatibility tests against compiler output.

A pure projection explicitly selects validation fields from entities. Read decoders never insert defaults. Domain semantic validation delegates to the full metamodel, preserving qualified entity diagnostics.

Alternative: accepting typed DTOs without runtime decoding trusts arbitrary adapter values and cannot safely distinguish malformed responses from domain failures.

### 3. Capability-shaped ports

`RepositoryAdapter.open` returns a repository session with identity, capabilities, object/relation readers and optional services. Reader contracts include point lookup and paging; a separate optional snapshot service returns all objects/relations with `complete: true`, one revision and model binding. The application never infers completeness from a page or reconstructs a snapshot from unpinned pages.

`QueryPort` supports declared entity-kind/type-ID/name-equality filters and bounded paging. No arbitrary query text, evaluation or implied full-text/graph capability is added. Opaque cursor scope is session + canonical query + snapshot revision. Page size defaults to 100, valid range 1..1000. Adapters own cursor validation and return `STALE_CURSOR` or `INVALID_CURSOR` for mismatches; conformance tests prove this obligation. The application validates page length, entry identities and snapshot revision and rejects malformed output.

`HistoryPort` returns paged records with opaque revisions; no revision ordering is inferred. `ChangePort` returns an unsubscribe function and sends committed changes or invalidations with increasing session sequence numbers. The application suppresses duplicate old events, turns gaps into invalidation, isolates listener exceptions and stops callbacks on close. It does not synthesize duplicate change-feed events from write acknowledgements.

Writer capability distinguishes `single-resource` from `atomic-batch`, guarded snapshot commits and reconciliation support. A nontransactional reader or writer remains representable; application commands require stronger guarantees to promise global validation. Type-discriminated capability/service combinations and runtime checks both enforce the contract.

Alternative: requiring every adapter to implement transactions, graph traversal and history would exclude legitimate read-only sources. Silently falling back to weaker writes would violate relation invariants.

### 4. Lifecycle and error boundary

Expose a structural cancellation token with `isCancellationRequested` and `subscribe(listener): unsubscribe`; no `AbortSignal`, timers or Electron types in the core. Hosts can bridge their own signals later. Handle already-cancelled tokens and cancellation during subscription registration without leaking listeners.

Application open/read calls race adapter completion against cancellation/session close using promises. Late open results are closed; late reads are discarded. Close marks the wrapper closed before awaiting adapter close, releases listeners and subscriptions, and calls adapter close once even when cleanup fails. Observe late promise rejections to avoid unhandled errors. No wall-clock timeout is claimed; adapters/hosts may supply cancellation on their own deadline.

Use discriminated results with stable error categories from the master prompt, including `PROFILE_INVALID`, `METAMODEL_INVALID`, `REPOSITORY_UNAVAILABLE`, `REPOSITORY_READ_ONLY`, `ENTITY_NOT_FOUND`, `REFERENCE_UNRESOLVED`, `VALIDATION_FAILED`, `ACCESS_DENIED`, `REVISION_CONFLICT`, `UNSUPPORTED_CAPABILITY`, `WRITE_FAILED`, `PARTIAL_FAILURE`, `RECOVERY_REQUIRED`, `INDEX_OUT_OF_SYNC`, `SCHEMA_INCOMPATIBLE`. Additional transport/lifecycle codes include `INVALID_INPUT`, `RESOURCE_LIMIT`, `CANCELLED`, `SESSION_CLOSED`, `INVALID_CURSOR`, `STALE_CURSOR`, `ADAPTER_CONTRACT`, `OUTCOME_UNKNOWN`, `OPERATION_ID_CONFLICT`. Earlier RE/RP/RC short error labels describe the equivalent category (NOT_FOUND/READ_ONLY/UNSUPPORTED/PERMISSION_DENIED/CONFLICT map to ENTITY_NOT_FOUND/REPOSITORY_READ_ONLY/UNSUPPORTED_CAPABILITY/ACCESS_DENIED/REVISION_CONFLICT). Diagnostics carry structured entity/path context; raw exceptions, stack traces and locators are not echoed. Post-dispatch ambiguous failures never assert rollback.

### 5. Mutation pipeline and consistency guard

Commands are immutable create/replace/delete object or relation operations, or an explicitly atomic batch. Creates supply no new revision and require absence. Replace/delete require `expectedRevision`. Replace supplies the whole mutable entity body; it cannot rename identity. Duplicate targets inside a batch are rejected to avoid implicit ordering. Batch size is 1..1000. The policy receives the whole copied command and active repository identity and must return explicit allow; absence/exception denies. It is a trusted injection point, not a new authentication system.

Pipeline: decode/copy command -> active/capability guards -> operation identity registration -> authorize -> obtain/decode complete snapshot -> verify model binding and target preconditions -> build prospective state -> materialize defaults for changed entities -> validate full final state -> check cancellation -> dispatch guarded commit -> validate acknowledgement.

Attribute-reference target lookup uses the final set of object identities/types, enabling a reference to another object created in the same batch. Project only validation fields before calling `validateSnapshot`. Untouched attributes are preserved. Apply all deletions explicitly; never synthesize cascading deletes. Invalid existing state is reported; a batch may repair it only if its final state fully validates. Projections are presentation-only and not involved in validation/permission decisions.

An omitted stored lifecycle state is compared as the configured initial state when validating a changed entity's default materialization. This comparison does not write defaults into untouched entities. Explicit invalid/null states remain subject to schema validation.

The writer receives `expectedSnapshotRevision` and entity preconditions. Their check and persistence must share a linearization point. The snapshot revision covers objects, relations and model binding, preventing write skew when other entities change after validation. Core cannot enforce this inside an external database: it is an adapter conformance obligation. A writer without that guard is rejected for these commands. No retry after conflict and no batch decomposition.

Success includes changed entities/deletion acknowledgements, operation ID and new snapshot revision. Every create/replace has an adapter-issued revision; replacements and snapshot revisions must differ from their predecessors. Validate exact target/result correspondence before returning success. A malformed acknowledgement after dispatch is uncertain, never proof of rollback.

Alternative: entity-only compare-and-swap misses concurrent cardinality changes to other relations. An application mutex cannot prevent external adapter writers and is not sufficient.

### 6. Operation identity and uncertain outcomes

Track up to 1024 distinct accepted operation IDs per application session; reject new IDs with `RESOURCE_LIMIT` at capacity rather than evicting accepted identities. Key by session/repository and exact operation ID. Compare canonical JSON command content including expected revisions with sorted record keys and preserved array order; cancellation tokens are not command payload. Retain defensive result copies. Identical concurrent submissions share one operation; a secondary caller's cancellation stops its own wait only. The initial submission owns the operation cancellation token. Before dispatch that cancellation gives definite no-write; after dispatch it gives unknown outcome until reconciliation. Never redispatch any retained operation ID automatically, including after denied/failed results; a deliberate new attempt needs a new ID.

An optional writer must declare its reconciliation/retention guarantee; guarded application writes require session-scoped operation lookup. Reconciliation outcomes are `committed`, `not-committed`, `pending`, `unknown`; only validated committed results become success. `not-committed` is an authoritative no-write result, not a replay instruction. On application close, pending dispatched writes become unknown and IDs are returned to callers before clearing local state. Reopening a session does not promise cross-session deduplication. The API/README must explicitly prohibit treating lost or expired operation records as permission to retry automatically; durable recovery belongs to storage/runtime stages.

Alternative: returning cancellation as rollback after dispatch loses committed data awareness. Persistent exactly-once semantics cannot be promised without a durable adapter journal.

### 7. Acceptance infrastructure

Place domain unit tests with repository-domain, contract type/shape tests with repository-ports, and end-to-end core BDD/conformance/property tests with repository-application. Copy planning `.feature` files into its test features during implementation. Reuse the compiler's awaited Cucumber-runner approach with assertion-bearing bindings and negative runner tests. The memory adapters live under tests only and expose deterministic deferred barriers, write counts and snapshots for independent assertions.

Use a read-only adapter, a single-resource guarded adapter, an atomic-batch guarded adapter and fault-injection variants. Assert actual final state, revisions and dispatch count, not just error strings. Add two organization metamodel fixtures to avoid hardcoded architecture vocabulary. Five fast-check properties use seed 20260924 and at least 200 runs each: qualified identity injectivity, copy isolation, failed-commit state preservation, valid final-state preservation and operation replay suppression.

## Risks / Trade-offs

- Full snapshots cost memory and limit repository size -> retain v1 envelope limits; the user-approved native v2 expansion below provides a separate pinned paged validation path in this change.
- Capability declarations can lie -> runtime shape checks and reusable conformance tests; do not claim these prove future production adapters.
- Snapshot guarding can reject unrelated concurrent changes -> conservative conflict behavior is intentional until safe finer-grained validation is specified.
- Cancellation cannot undo a committed write -> explicit unknown outcomes and reconciliation, with no automatic replay.
- Finite session operation tracking can fill -> document the 1024 limit and require explicit resolution before users choose a new session; no silent eviction or durable guarantee.

## Migration Plan

Add packages and tests without breaking existing public metamodel or Draw APIs. Update root BDD registration, boundary policies, lockfile and README. Record observed RED/GREEN and actual verification in change evidence and `docs/verification/repository-core.md`. Use only generated temporary repositories. No user data migration or deployment occurs. Revert only identified additions if rollback is required. The current user request authorizes archive after G0–G8 pass; an incomplete change must remain active.

## Expanded implementation decisions (2026-09-24)

The current master prompt expands the former memory-only scope. Requirements are consolidated in the existing three spec files rather than duplicating capabilities. `docs/architecture/repo-core-requirements.md` is normative alongside RE/RP/RC requirements. Seven decisions in `docs/adr/repo-core.md` cover source of truth, identity, metamodel ownership, change boundaries, diagram independence, capabilities and no silent data loss.

Native profile version 1 uses an explicit repository root, metamodel file and mapping. The adapter must discover records by stable explicit IDs, preserve source metadata through document-aware edits, validate containment including symlinks, hash source content for revisions and stage writes in the same directory. Unsupported mapping transformations are read-only. A recovery journal and exclusive cooperating-writer lock protect supported native writes. The capability does not imply exclusion of arbitrary noncooperating filesystem writers. Atomic multi-file batches are refused unless their recovery/visibility semantics are implemented and verified; core never decomposes a required atomic batch.

SQLite is derived and stores identity/type/attributes/reverse edges/source revisions. Source writes remain successful when index refresh fails; expose OUT_OF_SYNC and rebuild. Incremental updates run within an index transaction, with revision consistency checks. External changes revalidate, refresh derived data and emit invalidation/committed events after debounce. In-process events are best-effort and ordered per session, with resync through reads; no durable delivery is claimed.

Queries use a typed bounded DSL with equality, inequality, comparisons, membership, existence and AND/OR/NOT; missing differs from null. Deterministic ordering uses kind-qualified identity as final tie-breaker. Cursors bind to session/query/snapshot, page sizes 1–1000. Traversal uses visited identities, direction, depth and result limits; impossible/unbounded requests fail. Full validation snapshots are bounded separately and used for mutations, not as the ordinary query API. Filters and projections never weaken authorization or write validation.

Repository profiles contain authentication references only. A request context identifies caller, repository scope and permissions. Hosts own authentication, root configuration and deadlines. Transport messages contain operations/DTOs, never filesystem authority or SQL. Git is a separate explicit provider; ordinary commands never commit/push. Diagram bindings store cached entity snapshots/revisions and independent visual overrides; disconnect/reconnect cannot mutate repository entities. Model migrations are explicit reviewed transformations, with incompatible versions refused at open.

No local PostgreSQL migration/test infrastructure was found. Its initial contract and remote/federation/search ports must reject unsupported capabilities explicitly and be tested. A future real implementation must pass the shared adapter contract against its actual storage. Performance datasets are Small 1k/3k, Medium 100k/300k and Large 1m/3m, with observed timings/memory and machine description; exceeding resource limits is reported rather than declared a passing performance gate.

### Completion refinement: declarative repository policies

A version-one optional policy document is bound to the profile's metamodel and loaded from an explicit relative `policyPath`. It adds creation/deletion restrictions, readonly/computed attribute rules, lifecycle attribute selection and acyclic relation constraints without changing existing model wire formats. Unknown types/attributes, invalid computed defaults, unsupported expression operators and cycles between computed dependencies fail configuration validation. Computed expressions are a closed literal/copy-attribute grammar, never JavaScript. Changed entities materialize computed values deterministically; caller edits to readonly/computed fields are rejected. Policies are validated again at the native write boundary. CASCADE remains explicit and separately authorized; policy defaults never silently cascade.

Planned native configuration migration requires an explicit prepared preview bound to the complete source/configuration revision. Applying a preview requires configure permission and separate confirmation by its revision token, staging configuration and source together with a recovery journal. Neither preview nor this durable multi-file migration protocol is implemented yet; CORE-017 remains incomplete. Incompatible live configurations fail closed. This design paragraph is a target, not evidence of an available migration API.

## ADR-008 — Native v2 paged authoritative storage (approved expansion)

Native v1 stays byte-compatible and remains the preservation-aware YAML path. V2 is opt-in `adapterKind: native-v2`, with JSONL pages and a small version-two manifest. Canonical IDs never depend on page addresses. An entity hashes to one of 4096 buckets; each bucket is an immutable content-addressed page. The manifest records bucket/hash/count/byte-size and model binding. A page is bounded to 16 MiB / 8192 records; every entity still passes the depth-64/100000-value decoder. Manifest metadata has its own bounded shape and maximum 4096 entries, not a relaxed entity decoder. Unsupported oversized entities/buckets fail before publication.

The manifest plus referenced pages and model/profile/policy files are authoritative. SQLite is a disposable private catalog, not domain storage. A cold open hashes each page and streams decoded entities into SQLite, then performs complete semantic validation using existing attribute/endpoint validators with disk-backed type lookup, pair uniqueness and cardinality facts. Foreign references, unknown types and incomplete/corrupt pages prevent READY. Queries use indexed candidate selection followed by the existing portable predicate/order semantics; unsupported or excessive work fails explicitly. At most a bounded page/top-k result is retained in JavaScript, never the full graph. Cursors bind to session, query, entity kind and manifest revision. Point/adjacency queries must not scan the entire graph.

Application authorization/idempotency remain unchanged. A new optional paged validation port supplies a revision-bound command scope (explicitly incomplete, never disguised as a complete snapshot), target lookup and final-state validation. The application materializes/validates changed entities; a delta commit carries binding, source revision and exact changes. The adapter rechecks preconditions and critical validation inside its exclusive writer boundary. A validated baseline permits an object-only same-type update fast path: attributes/references/lifecycle/policies are revalidated, while unchanged graph identities/types/edges preserve global constraints. Structural changes receive full streaming final-state validation. Tests compare this with complete-snapshot validation on small graphs.

Publication writes/syncs new immutable pages first, records a recovery journal, rechecks the pinned source/configuration revision and atomically replaces the manifest. Only this manifest swap is the linearization point; arbitrary multi-file atomic writes are not claimed. Old pages and interrupted stages are retained; there is no automatic garbage collection. Cooperating processes use an exclusive lock. External in-place edits to content-addressed pages are corruption, not implicit domain updates. Open/reload validates hashes; callers can request resync. No exclusion of hostile/noncooperating OS writers or universal power-loss durability is claimed.

Explicit v1-to-v2 export writes a new empty destination and leaves v1 untouched. It must never silently discard YAML-only metadata/comments: conversion is a semantic export with an explicit preservation warning and is not a lossless source migration. Runtime routing selects the adapter from the validated host-owned profile, never renderer paths. Existing v1 sessions/tests remain unchanged. Small/Medium/Large v2 benchmarks measure source creation, cold open/indexing, point/filter/adjacency/traversal/update/index maintenance and memory; unsupported sizes and failed operations stay visible rather than satisfying release gates.
