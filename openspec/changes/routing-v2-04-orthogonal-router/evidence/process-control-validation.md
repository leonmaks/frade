# R04 task 1.2 process-control evidence

CHANGE: routing-v2-04-orthogonal-router
REPAIR_TYPE: PROCESS_CONTROL
PHASE: PLANNING
BASE_COMMIT: 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4
PRE_IMPLEMENTATION_GATE: NOT_RUN
IMPLEMENTATION_STATUS: NOT_STARTED
READY_FOR_PRE_IMPLEMENTATION_REVIEW: YES
READY_FOR_IMPLEMENTATION: NO

## Implemented

The exact R04 profile enforces declared production/test/control roots, model-layer
dependency direction including separate direction/router roles, prior-layer
quarantine, and the narrow post-approval package exception. Unimplemented profiles
fail closed. Existing four-source NUL-safe discovery remains intact.

Approval binds 20 reviewed files to the saved independent report and manifest.
The approved checkpoint must descend linearly through control-only commits from
R03 closure. Task wording, contract/scope text, frozen controls, report and manifest
are checked independently across live Git layers; only explicit lifecycle fields
and task checkbox states are normalized. No real approval report was fabricated.
See gate-profile.md for the reviewer/report/checkpoint protocol.

Metadata comparison covers every pnpm 12 YAML document, duplicate/ambiguous
mappings, alias sharing, exact dependency version, unrelated package fields,
other importers/package graph, consistent package/lock pairs, and snapshot modes.

## Regression-first and diagnostic record

1. Before adding the profile, `node scripts/routing-v2-architecture-gate.mjs
   --self-test-r04` exited 1 at `R04 planning rejects premature router`:
   generic handling incorrectly admitted a product file during PLANNING.
2. A positive approval fixture exposed a missing root-lockfile scope parse case;
   a direct regression now verifies package.json and pnpm-lock.yaml are both parsed.
3. The positive checkpoint fixture then failed correctly because copying CRLF
   workspace files with autocrlf=false invented forbidden edits to root/scoped
   AGENTS and legacy-boundary. In-memory diagnostics listed those exact paths.
   Classification: TEST. Fixture writes now reproduce LF Git blobs; the forbidden
   checkpoint-history rule was retained unchanged.
4. Baseline metadata controls exposed the real multi-document pnpm 12 format.
   Parsing now retains all documents and requires exactly one Draw importer owner.
5. A direct adversarial YAML-alias probe returned accepted=true (required=false):
   removing the allowed key from an aliased object also removed it from another
   importer during comparison. Classification: ALGORITHM in process-control code.
   A permanent regression was added; detached comparison now rejects that case.
6. Initial R04-only controls passed 304 assertions. After adding the alias,
   multi-document, symlink-ancestor, committed-metadata and profile-document
   controls, the complete final self-test passed 764 assertions, retaining the
   previous R01-R03 controls. The 304 count is historical, not the final suite size.

## Executed validation

```text
node scripts/routing-v2-architecture-gate.mjs --self-test
PROCESS_GATE_SELF_TESTS: PASS (764 assertions)

pnpm run routing:v2:arch-gate
GIT_SOURCE_SNAPSHOTS_CHECKED: HEAD INDEX WORKTREE
ACTIVE_CHANGE: routing-v2-04-orthogonal-router
PHASE: PLANNING
V2_SOURCE_TEST_FILES_CHECKED: 77
GATE_STATUS: PASS

openspec validate routing-v2-04-orthogonal-router --strict
Change 'routing-v2-04-orthogonal-router' is valid

pnpm exec eslint scripts/routing-v2-architecture-gate.mjs
exit 0

pnpm exec prettier scripts/routing-v2-architecture-gate.mjs --check
All matched files use Prettier code style!

git diff --check
exit 0
```

The full self-test used disposable real Git repositories; no original repository
commit/index changes were performed. It exercised staged/worktree and committed
cancellation, deletion/recreation, each path source, rename old/new, copy
destination, allowed-path controls, non-ASCII/spaced paths, NUL parser control for
tab/newline names, staged/committed forbidden imports, symlink modes/ancestors,
approval tampering, frozen content/modes and package exceptions. Filesystem
tab/newline-name relocation is covered where supported by the existing cross-platform
suite; Windows controls do not claim NTFS supports such filenames.

Formatting initially hit a local filesystem EPERM. The same single-file formatter
completed with authorized elevated filesystem access, followed by passing format
and lint checks. This was an environment write restriction, not a test bypass.

SHA-256 checks against archived R03 snapshots passed: 25 frozen source/test files
and 29 R01-R03 production files unchanged. Product code, product tests, package
metadata, vendor, AGENTS and legacy-boundary were not edited. Runtime routing,
property and mutation suites were not needed for this process-control-only change
and are not reported as fresh execution.

## Next checkpoint

Task 1.2 is complete; 2/24 tasks are now complete. A fresh independent PRE on
Astra xhigh must inspect these controls and all R04 planning artifacts using
pre-implementation-gate-prompt.md. No approved planning commit, BDD/TDD,
production implementation, archive or R05 progression occurred.
