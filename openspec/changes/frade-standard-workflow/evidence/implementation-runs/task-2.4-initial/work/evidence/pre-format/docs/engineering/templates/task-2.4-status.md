# Direction status contract (task 2.4)

`node scripts/directions/cli.mjs status <absolute-manifest>` returns a JSON preview. Add `--write` to refresh the manifest's owned `statusPath`. A write returns `WRITTEN` and `panelState: QUEUED`; only the Codex UI controller can record a visible panel receipt. The CLI checks the installed control, actual registered owner/branch/common, immutable bootstrap origin, tracked manifest, baseline ancestry and scope before writing. An uninstalled W01 manifest is not an active owner.

The projection uses the same eight Russian primary headings as the approved status template. `parseStatus` requires exactly one of each in order. `parseTasks` counts only checklist entries with stable numeric IDs and rejects duplicate or malformed entries. Administrative task counts never establish product acceptance. Requirements count as accepted only when all linked executable scenarios have current positive, negative and boundary assertion runs verified through a trusted evidence boundary. Human and future scenarios remain pending. The boundary must read the raw artifact bytes from the registered owner, hash them, check complete execution and assertion IDs, and bind source/config/environment to the current snapshot. `createArtifactReader` supplies confined, reparse-safe raw bytes. A `PASS` string, `verified: true`, or a path/hash declared in JSON is insufficient.

The CLI deliberately supplies no evidence boundary. It reports unsupported proof as `NOT_VERIFIED` and leaves readiness blocked. An integration controller can call `projectStatus({ manifest, tasksText, trace, snapshot, checks, boundary, updatedAt })` with an independently trusted `createEvidenceBoundary({ verify })`. `verify` receives `(kind, ref, expected)` and must validate raw run/check artifacts and current bindings. A `check` ref uses the same complete/full/PASS/artifact/bindings shape as a `run` ref. Approved numeric limits must be supplied by a future verified contract source; arbitrary check fields do not change the limit or earn a quality score. PRE, Verify, POST, publication and human visual decisions remain separate gates.

The status source input SHA256 binds the manifest, checklist text, trace records, snapshot and checks. A preview identifies a previous projection with different source input as `STALE_PROJECTION`. A refresh keeps an existing historical tail byte for byte after `<!-- LEGACY HISTORY: historical only -->`; an older dashboard without the current headings is moved verbatim below that boundary. Historical FAIL remains historical and visible.

The freeze marker is `<canonical Git common>/frade-workflow/freeze/<direction-id>.json`. A present regular marker defers dashboard writes; a link or malformed location blocks. The later review wrapper owns marker creation/removal and receipt handling. This status CLI neither opens the Codex panel nor changes the index/HEAD, creates a commit, pushes, reviews, or approves a gate. Checkpoint and remote SHA fields require later publication receipt integration; they show `NOT_VERIFIED` until then.

For a registered, tracked owner after bootstrap checkpoint:

```sh
node scripts/directions/cli.mjs status /absolute/owner/docs/engineering/directions/example-direction/direction.json
node scripts/directions/cli.mjs status /absolute/owner/docs/engineering/directions/example-direction/direction.json --write
```
