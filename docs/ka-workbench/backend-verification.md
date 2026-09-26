# Backend verification, 2026-09-25

> Historical backend-stage checkpoint. The subsequent transport, UI and complete pilot results are recorded in [acceptance.md](acceptance.md). Counts and pending items below describe that earlier stage.

Confirmed in the backend stage:

| Area                                                                                                   | Executed evidence                                                                   |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Rooted loading, limits, duplicate imports, cycles, missing/malformed/unsafe inputs, junction escape    | `packages/adapter-sberea-yaml/tests/loading.test.ts` (10 tests)                     |
| Identity after rename/relocation, stale cursors, unknown sections                                      | `loading.test.ts`                                                                   |
| Repair policy and changed offending values, derived graph refresh, cycles and reference reorder        | `contracts.test.ts`; `packages/repository-domain/tests/repair.test.ts` (7 tests)    |
| Typed nested/list/reference edits, optional removal, no-op mtime, read-only Core, reopened disk values | `contracts.test.ts` (12 tests)                                                      |
| BOM/CRLF, comments, untouched fields, implicit nulls, neighbour records                                | `preserve.test.ts` (19 tests); `contracts.test.ts`                                  |
| Stale object/file/model, aliases/tags, staged concurrent change, rename failure, multi-file rejection  | `contracts.test.ts`                                                                 |
| Private baseline 22 data files / 138 objects / 19 types and unchanged files                            | `real-data.test.ts`; `write.test.ts`                                                |
| Process interruption, lost acknowledgement, external/model changes                                     | `recovery.test.ts`; `watch.test.ts`                                                 |
| Native v1/v2 and Core compatibility                                                                    | repository-domain 23 tests; repository-application 216 tests; adapter-yaml 44 tests |

All 48 sberea adapter tests passed. Adapter typecheck and lint passed. A concrete syntax bug was fixed: adding a value to an implicit null followed by a comment previously inserted the new token after the line ending; the separator suffix now follows the new token. Unchanged implicit null nodes remain byte-preserved.

These results confirm the backend tasks marked complete in `tasks.md`. They do not close transport, UI, VSCode parity, metadata switching or real-data UI acceptance. `frade-repo-core` remains unchanged and unarchived. No claim of completed pilot acceptance is made.

Additional composition checks in this continuation:

- Explicit native/sberea registry and extension contract: 7 runtime-node tests passed, including native-v2 dispatch.
- Repository API: 7 tests passed. The previously unhandled `presentation` operation now returns `UNSUPPORTED_CAPABILITY`; presentation transport itself remains pending in task 5.1.
- All 20 packages passed `pnpm typecheck`.
- All 19 boundary contracts and the four boundary-check scripts passed. New package export targets are checked for existence; leaf UI packages cannot depend on their workspace composer or backend packages.
- `pnpm install --frozen-lockfile` passed after updating workspace dependency entries with pnpm's supply-chain verification enabled.
- Strict OpenSpec validation passed. The task list now records 12/59 completed tasks; nine were confirmed in this continuation.

Full `pnpm build` passed for all 20 packages. The Utility build now keeps Node builtins external (`node:fs`, `node:crypto`, and others) instead of resolving them as browser stubs after backend composition imports were added.

The existing built-Desktop Electron suite passed all 3 tests: sandbox/isolation, Draw document lifecycle and actual backend crash/recovery/shutdown; native-v1 repository IPC; native-v2 repository IPC. These are regression checks, not the pending sberea card-editing UI acceptance.
