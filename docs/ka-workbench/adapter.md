# sberea YAML adapter

The `@frade/adapter-sberea-yaml` adapter opens existing entity dictionaries in place. It does not convert files to the native Frade format. Use `createSbereaYamlAdapter` with a host-authorized data folder, stable repository ID, and a `MetadataSet`. `defaultMetadataSet(metadataFolder)` selects the pilot v2025 schemas plus the explicit v2023 tech_params definition; other layouts can supply their own relative entries.

```ts
const adapter = createSbereaYamlAdapter({
  dataRoot: authorizedDataFolder,
  repositoryId: stableRepositoryId,
  metadataSet: defaultMetadataSet(authorizedMetadataFolder),
})
const result = await openRepository(
  adapter,
  {
    callerId: 'desktop-local-user',
    repositoryIds: [stableRepositoryId],
    permissions: ['read', 'write'],
  },
  { authorize: (context) => context.permissions.includes('write') },
)
```

Host paths must never come from an unrestricted renderer request. Desktop uses this composition in Utility; see [UI opening instructions](README.md) and [client contract](client.md).

## Reading and identity

Imports are resolved relative to their source file, with duplicate suppression, cycle detection, real-path containment and rejection of symbolic source components. Reads are bounded to 2 MB per file, 32 MB per data graph, 4096 files, depth 64 and 100,000 objects. An unsafe, malformed, incomplete or oversized graph fails explicitly. No writable partial snapshot is returned.

The adapter preserves source object IDs, qualifies references with the repository ID and maps external types reversibly to `sberea:<external-type>`. Display names and file locations do not determine identity. `inspect()` exposes a complete accounting manifest, source locators, semantic diagnostics and unmodelled sections (`sber` configuration separately from unknown collections). Its metadata is a backend interface; raw absolute locations must not be exposed through renderer transport.

Read all query pages until the cursor is absent. Cursors become stale after a source/model revision changes. Restart paging from the first page after a stale-cursor response. Model/source watchers retain coherent snapshots, report degradation for invalid external changes and recover when sources are fixed. Always close sessions to release subscriptions.

Reference edges are derived from attributes. Their IDs use owner, logical field path, target and duplicate occurrence, so file moves, renames and list reordering do not change edge identity. Parent cycles remain representable. Unresolved references stay present with diagnostics. Integrations remain first-class objects. Independent mutation of derived edges is unsupported.

## Validation and saving

The sberea model opts into the generic `SourceValidationPort` repair policy. Core compares complete baseline and prospective diagnostics for the pinned revision; code, entity, field path, offending value and rule evidence must match, including duplicate counts. An unchanged existing error can remain. Fixes are allowed; a new invalid value cannot borrow an old error code. Native models retain their existing strict validation. Structural validation failures never enter the repair baseline.

Use an `updateObject` command containing the complete attribute payload and expected object revision. If a configured name field changes, update `name` to its derived display value. Retain unknown attributes; omit only fields the user explicitly removed. Missing, null, empty text, false and zero are distinct. No-op commands do not rewrite the file or materialize defaults.

Edits patch YAML concrete syntax, preserving untouched fields, neighbours, comments, BOM and CRLF. Canonical references serialize back to their source IDs. Files containing aliases, anchors or custom tags remain readable but reject mutations. A save owns exactly one source file. Multi-file atomic requests are rejected before any replacement. Save All must compose independent commands and show each result.

The writer coordinates cooperating processes with an exclusive lock, stages a file, syncs recovery evidence, rechecks data/import/model hashes and atomically replaces one source. External edits and stale revisions reject the save. This does not claim universal power-loss safety or exclusion of noncooperating writers.

After uncertain completion, retain the operation ID and call reconciliation; never replay automatically. Recovery uses `inspectSbereaRecovery` followed by explicit `resolveSbereaRecovery` of unchanged before/after evidence. Conflicting evidence is rejected. Resolution archives journal, writer lock and available staged content without rewriting architecture data. Unknown outcomes and recovery evidence are not proof that a mutation failed.

## Verification

Run from the repository root:

```text
pnpm --filter @frade/adapter-sberea-yaml test
pnpm --filter @frade/adapter-sberea-yaml typecheck
pnpm --filter @frade/adapter-sberea-yaml lint
pnpm --filter @frade/repository-domain --filter @frade/repository-application --filter @frade/adapter-yaml test
```

`contracts.test.ts`, `loading.test.ts` and `preserve.test.ts` use distributable synthetic data. The real-data, write, watch and process-recovery tests use private temporary copies created by `scripts/ka-fixtures.mjs`; set `FRADE_KA_DATA_ROOT` and `FRADE_KA_META_ROOT` when the source folders differ. Their default source is the locally provided KA. Missing real data is a failure, not a skipped acceptance result. Source originals are not modified or published.

Backend evidence is complemented by real-data Electron card-editing tests, metadata-switching tests and the measured VSCode matrix. See the [acceptance report](acceptance.md).
