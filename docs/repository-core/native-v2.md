# Native v2: paged source repositories

Native v1 remains supported and is never automatically converted. `NativeAdapter` selects v2 only when a host-selected directory contains a validated `adapterKind: "native-v2"` profile. Neither HTTP requests nor the Desktop renderer select arbitrary filesystem paths. The existing typed application API remains the mutation boundary.

## Source and identity

The authoritative source consists of `profile.json`, the referenced model/policy, a version-2 manifest, and immutable JSONL pages under `pages/`. A manifest entry contains a bucket, SHA-256 hash, record count and byte count. The filename is the hash; loading verifies the content, declared size, entity identity and bucket. Object and relation namespaces remain distinct. Names and physical paths are not identities.

The first three hexadecimal digits of SHA-256 of the canonical qualified entity key select one of 4,096 buckets. A page holds at most 8,192 records / 16 MiB; manifests hold at most 4,096 distinct bucket entries and 5,000,000 total records. Path containment includes empty page directories and rejects symlinks. Per-entity JSON decoder limits remain unchanged. No whole-graph JSON DTO is required to open a repository.

Unknown source metadata/comments are not a feature of this explicit JSONL format (`preservation: none`). This is not a mapping for an undocumented external repository schema.

## Derived catalog and validation

Each session builds a private disposable SQLite catalog outside the source directory. It is never the sole location of committed changes. Cold open verifies every page, then validates attributes/references against the complete catalog and checks endpoints, inheritance, duplicate pairs and cardinalities using bounded iteration and disk-backed facts. Declarative cycle policies use disk-backed topological elimination. Creation/deletion, computed/readonly attributes and lifecycle transitions are rechecked on command candidates.

An optional `PagedValidationPort` returns a pinned **incomplete** command scope and target-type lookup. Application preparation still checks authorization, defaults, policies and entity preconditions. The adapter validates the complete prospective source state before publication; incomplete snapshots alone never certify writes. Structural changes require full streaming validation. Same-type object-only updates can reuse graph facts because they do not change identities, types or relations; changed attributes and lifecycle transitions are still validated.

## Queries and resource bounds

Point reads use canonical-key indexes; qualified incoming/outgoing queries use adjacency indexes. Portable predicates and sorting determine results even when SQL narrows candidate rows. Default paging uses a stable UTF-16-compatible ordering key. Explicit sorts retain only the requested top page plus one row, rather than the full graph. Cursors bind entity kind, session, query and source revision.

Pages contain at most 1,000 results. Fallback scans reject work beyond 5,000,000 records or 30 seconds and yield/check cancellation every 1,024 scanned candidates. Full snapshot export is additionally restricted to 1,000 entities and the existing aggregate DTO budget; use pages for larger repositories.

Profile JSON is bounded to 100,000 bytes; model, policy and manifest JSON to 1,000,000 bytes each. Creation checks these read-back budgets before publication. A command's JSON-serialized operation ID is bounded to 4,096 bytes so its recovery journal remains readable. Oversized operations return `RESOURCE_LIMIT` before acquiring a writer lock.

## Commit and recovery

An exclusive cooperating-writer lock protects revision rechecks. Candidate pages are written/synced under immutable names, and a new manifest is staged with a recovery journal. Replacement of the one manifest is the publication point. Untouched pages retain their hashes. Old/orphan pages are retained; garbage collection is not implemented.

The adapter advertises atomic batches at this manifest-publication boundary, not distributed transactions or hostile-writer exclusion. File synchronization/process-crash tests do not establish universal filesystem power-loss or directory-durability guarantees. An external writer that changes an immutable page in place violates the format; reopening/resync diagnoses hash mismatches.

`inspectPagedNativeRecovery(root)` returns a preview token, phase and writer-liveness observation. `recoverPagedNativeRepository(root, { expectedJournalHash, strategy })` requires an exact preview and a non-active writer. `keep-source` retains the current verified source; `finish-staged` verifies the staged manifest and all referenced pages before publication. Journal/lock/stage evidence is retained under `.frade-v2-recovered/`. Recovery never replays the domain command. Recovery-process interruption and orphan coordination locks still require operator inspection; do not delete them automatically.

Command events are session-scoped best effort and emitted only after source publication and successful catalog commit. Listener exceptions do not roll back source data. Watchers debounce manifest/config/page notifications, rebuild from verified source and emit refresh/degraded state. Close drains queued work and releases watchers/catalogs. There is no durable event outbox or durable idempotency store.

## Explicit adoption

`createPagedNativeRepository` accepts an empty host-owned destination and asynchronous object/relation iterables. It does not overwrite existing destinations. `exportNativeToPaged(source, destination, { acknowledgeSemanticOnly: true })` exports a bounded native-v1 snapshot, preserves semantic identities and configuration policies, and returns `SOURCE_FORMAT_NOT_PRESERVED`. Source YAML comments/anchors/unknown document metadata are not transferred. The source is unchanged; the destination must be independent, not a source ancestor/descendant. This is not an in-place migration or a general metamodel migration service.

## Verification status

Executable examples are in `packages/adapter-yaml/tests/native-v2*.test.ts`; streaming/query equivalence properties use seed `20260924`, 200 runs each, in `packages/repository-application/tests/paged-equivalence.property.test.ts`. `native-v2.feature` is checked by the repository traceability script. Representative measurements are produced separately by `pnpm --filter @frade/repository-application benchmark -- benchmarks/native-v2.bench.ts`; historical v1 measurements remain unchanged. See the active OpenSpec evidence for actual executed checks and outstanding gates, rather than treating this guide as release certification.
