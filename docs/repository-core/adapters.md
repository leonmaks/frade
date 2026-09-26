# Adapter development and native format

Implement the public `RepositoryAdapter` / `RepositoryAdapterSession` contracts. Declare only tested capabilities. Reuse [shared conformance tests](../../packages/repository-application/tests/contracts/adapter.contract.ts) with isolated real storage: native YAML, native JSON and memory currently run the same five tests. Compiling an interface is not storage conformance.

Readers return independent values and typed failures; queries must follow the portable DSL or reject unsupported operators. Snapshot validation requires complete, revision-consistent state and exact compiled model binding. The application currently requires guarded atomic batch support for multi-entity changes; it does not decompose them into unsafe sequential writes. Writers must validate actual proposed data, compare the source snapshot guard inside their write boundary, issue new opaque revisions and acknowledge exact targets/content. Reconciliation describes committed/not-committed/pending/unknown without replay.

## Native format v1

`createNativeRepository(trustedRoot, {repositoryId, displayName, format:'yaml'|'json', model?})` exclusively creates `profile.json`, `metamodel.json` and `repository.yaml` or `repository.json`. It refuses existing files; do not use it to migrate user repositories. Creation is not a multi-file atomic transaction.

The profile carries `schemaVersion:1`, `adapterKind:'native'`, repository identity, metamodel path/version, `mapping:{sourceFile,format}`, accessMode, policyRef, indexing and versioning settings. The source document is `{formatVersion:1,repositoryId,objects:[],relations:[]}` with canonical DTO records. One source document is one atomic replacement domain, even when it contains several entities. This is NOT an arbitrary multi-file transactional adapter.

YAML edits use its document AST. Unknown record/root metadata and comments survive supported changes. Anchors, aliases and tagged constructs can be read where safe but make writes unsupported. JSON output preserves unknown values, not whitespace. Repository relocation changes mapping/root, not entity IDs. Unknown external schemas are never assumed to follow this format.

`inspectMappedRepository` accepts explicit files or bounded directories/patterns, path-based extraction, type mapping, references and an explicit identity map. It reports recognized records plus unsupported/missing/duplicate diagnostics. It is inspection-only and never advertises writes for partial mappings. Adapter-specific external schemas and credentials still require repository-owner information.

## Consistency and recovery

Native writes acquire `.frade-write.lock` exclusively, record `.frade-recovery.json`, sync a staged file in the source directory, recheck source/model/profile hashes and rename the stage over the source. Coordination protects participating writers only; an uncooperative process may race the last check and replacement. No power-loss/directory-fsync guarantee or distributed atomicity is claimed.

If replacement fails, original bytes and staged/journal evidence remain. Reopen refuses healthy access with RECOVERY_REQUIRED. `inspectNativeRecovery(trustedRoot)` returns STAGED/COMMITTED/CONFLICTED, writer liveness and a journal hash. A trusted host must separately authorize `recoverNativeRepository(root, {expectedJournalHash, strategy:'keep-source'|'finish-staged'})`. It refuses a live writer, stale preview or conflicting source, validates selected content, and preserves source/stage/journal/lock under `.frade-recovered/<id>` before releasing markers. There is no automatic command replay or preference for staged data. Actual child-process termination is tested before and after source replacement; injected rename failure remains separately tested. Power loss and a crash during recovery itself are not certified. A stranded recovery lock requires operator inspection, not blind deletion.

Native watchers monitor source/model/profile/policy directories and debounce reloads. Invalid external data makes the session DEGRADED and disables writing; repaired content can restore READY/READ_ONLY. Model changes emit metamodel.changed. Closing drains active writes/reloads and releases watchers. Delivery remains in-process best-effort, not a durable outbox.

Source document: maximum 16 MiB; model: 1,000,000 bytes; profile: 100,000 bytes; aggregate JSON traversal budget: 100,000 values and depth 64. These limits make Medium/Large datasets unsupported. Raising only the byte limit does not solve full-snapshot memory or validation cost.

## Index, Git and extensions

`SqliteIndex` uses Node 24 SQLite and is disposable derived data. Rebuild/transactional incremental update maintain source revision; corrupt databases are quarantined under a `.corrupt-*` filename. Index failure after a source commit produces INDEX_OUT_OF_SYNC without replaying the command. Desktop index files are kept under app userData, not authoritative source paths.

Git is a separate `GitVersioning` provider. Only explicit commit orchestration runs add/commit; no mutation pushes or commits. Status/history/conflict inspection work only when Git is available. Paths are argument-validated; shell interpolation and Git hooks are not used for explicit commits.

PostgreSQL/remote connection/factory contracts reject unconfigured storage with UNSUPPORTED_CAPABILITY. No PostgreSQL server, driver or migrations were introduced. Federation is an authorized in-process read registry, not a distributed transaction coordinator. `importSnapshot` performs bounded validated MERGE (no implicit deletion); `exportSnapshot` is bounded source export. Search is a port only. Implementing any new backend requires its own real-storage conformance tests.
