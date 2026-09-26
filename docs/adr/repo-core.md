# Repo Core architecture decisions

Accepted for implementation 2026-09-24 under `frade-repo-core`; acceptance evidence is separate from this design decision record.

## ADR-001 — Source of Truth

Native files are authoritative; SQLite is disposable derived state. PostgreSQL owns authoritative state only for an actual PostgreSQL adapter. An index failure after source commit must not replay or undo a command. Alternative rejected: treating the cache as a second editable source, which creates conflicting ownership.

## ADR-002 — Stable Identity

Reuse repository-qualified metamodel references, with distinct object/relation namespaces and tuple-encoded keys. Revisions are opaque equality tokens. Paths, labels and ordering are provenance, never identity. External sources without keys require persisted identity mappings; generating IDs on load is forbidden.

## ADR-003 — Metamodel Ownership

Reuse `@frade/metamodel-domain` and `@frade/metamodel-compiler` through public exports. A repository profile selects the model and exact version/fingerprint. No company vocabulary is built into Core. Defaults are explicit on changed entities; read projection preserves omitted attributes. Incompatible configuration requires an explicit migration.

## ADR-004 — Change Boundary

Only application commands orchestrate domain mutations. Authorize, validate the complete prospective state, then guard revision/preconditions at persistence. Transaction scope is one repository. A required atomic batch is rejected where the adapter cannot provide it. No distributed transaction is inferred. Unknown post-dispatch outcomes require reconciliation, not automatic replay.

## ADR-005 — Diagram Independence

Draw remains repository-independent. A bridge owns bindings, snapshots and reconciliation, while diagrams own geometry and overrides. Visual deletion never deletes a domain object. Detached data remains renderable. Reconnect compares revisions without overwriting either domain data or visual overrides.

## ADR-006 — Explicit Capabilities

Capabilities are verified guarantees, including limitations of filesystem coordination, batching, preservation and event delivery. Adapters cannot claim production completeness from interface compilation or memory tests. Hosts/authentication are separate from domain contracts. Missing capabilities return typed errors.

## ADR-007 — No Silent Data Loss

Refuse incompatible schema, unsupported YAML transformations, unsafe paths and stale revisions. Preserve unknown fields/comments where supported, stage writes and detect incomplete recovery journals. Never discard user content automatically. Index and event failures after source commit are reported as auxiliary degradation, not false write failure. Error responses omit internal paths, stack traces and credentials.
