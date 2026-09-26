# Repo Core: implemented API

Status: bounded native vertical slice, not a completed release. See [verification](../verification/repository-core.md) for measured limits and incomplete requirements. Package entry points export TypeScript source for this monorepo; `build` emits declarations/JavaScript, but publishing distributable npm packages is not configured.

The opt-in [native v2 format](native-v2.md) adds immutable pages, a private SQLite catalog and guarded delta commands without requiring a complete graph DTO. Native v1 remains unchanged. See the active v2 evidence for new checks; the release gates remain incomplete.

## Packages and ownership

| Package                  | Responsibility                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `repository-domain`      | Safe DTO decoding, qualified identity, revisions, query semantics                   |
| `repository-ports`       | Adapter, profile, capabilities, authorization, index/versioning/extension contracts |
| `repository-application` | Sessions, validation, commands, graph traversal, events, index coordination         |
| `adapter-yaml`           | Native YAML/JSON files and explicitly mapped read-only discovery                    |
| `local-index`            | Rebuildable Node SQLite derived index                                               |
| `versioning-git`         | Optional explicit Git operations                                                    |
| `repository-api`         | Portable protocol plus authenticated Node HTTP host                                 |
| `repository-bridge`      | Entity snapshots and independent visual bindings                                    |

Existing `metamodel-domain` and `metamodel-compiler` are reused. Draw has no dependency on repository infrastructure.

## Open, authorize, read and mutate

Trusted hosts construct an adapter, `RequestContext` and an explicit `AuthorizationPolicy`, then call `openRepository(adapter, context, policy, token?)`. Missing policy denies all mutations even when the context includes `write`. Read access requires authenticated caller identity, repository scope and `read`. Never construct context from untrusted renderer/request permissions. `policyRef` is metadata; it does not load executable configuration.

Use `getObject`, `getRelation`, `queryObjects`, `queryRelations`, `getIncomingRelations`, `getOutgoingRelations`, `getNeighbors`, `getSubgraph`, `getDependencies`, `queryByAttribute`, `queryByType`, `queryByStatus`. Results are `{ok:true,value}` or `{ok:false,error}`. Attributes support JSON only; missing and `null` differ; empty values are retained and validated against the configured model. Unknown attributes follow metamodel validation, not implicit deletion.

All changes use `applyChanges({repositoryId, commands, expectedRevision?, idempotencyKey?, requireAtomic?})`. Update commands replace the complete mutable entity body and require `expectedRevision`; read-modify-write must preserve unrelated attributes. See the compiled [rename example](../../packages/repository-application/tests/consumer/index.ts). The six command names are `createObject`, `updateObject`, `deleteObject`, `createRelation`, `updateRelation`, `deleteRelation`.

`validate` checks a proposed ChangeSet without writing; `exportSnapshot` returns the complete bounded source snapshot. Changed entities receive configured defaults. Untouched entities do not. Deletion defaults to RESTRICT. Explicit CASCADE currently removes incident relations with `cascade` permission; it does not silently delete other objects. Remaining attribute references must still validate.

## Query and lifecycle limits

Page limit defaults to 100 and accepts 1–1000. Filters support `eq/ne/lt/lte/gt/gte/in/exists/and/or/not`, field paths, stable identity tie-breakers and projections. Cursors are bound to query, session and source revision. Changing the source invalidates continuation; restart the query explicitly. Graph depth/results have enforced finite limits; exceeding them returns RESOURCE_LIMIT, not silent truncation. Native v1 queries use an in-memory bounded catalog. Native v2 uses a private disk-backed catalog with indexed point/adjacency/type/status candidates and portable residual predicates; other filters use bounded scans and bounded result retention.

An opened session exposes READY or READ_ONLY. Failed reload gives DEGRADED and disables mutations. Closing rejects new work, cancels public waits, releases subscriptions/watchers/index, and drains native writes already dispatched. Native open failure returns a typed result, not a partially working session. OPENING/ERROR exist in the state contract but are not observable session objects returned by `openRepository`.

## Conflicts, retries and events

Revisions are opaque equality tokens. Entity identity includes repository and entity kind, never path or name. A ChangeSet belongs to one repository transaction domain. Stale revisions do not retry automatically.

At most 1024 distinct operation IDs are retained per application/native session. Same ID plus canonical payload shares/returns the same result; changed payload is rejected. Persistence across close/restart is NOT guaranteed. `OUTCOME_UNKNOWN` requires `reconcile(operationId)` and source inspection; never blindly replay after lost session state. Validation/access/unsupported/schema errors need corrected input/configuration. Conflict requires rereading and a reviewed new command. INDEX_OUT_OF_SYNC requires rebuilding the index, not repeating the source write. RECOVERY_REQUIRED requires preserving and inspecting the staged evidence.

Events are best-effort, process-local, ordered by session sequence, emitted after confirmed source writes. Gaps become `repository.reloaded`; subscribers request a full refresh. They are not a durable outbox. Subscription exceptions do not roll back writes. External watch notifications are debounced invalidations, not a complete semantic diff/history.

See [adapters](adapters.md), [metamodels](metamodels.md), [diagrams](diagrams.md), and [security/deployment](security.md).
