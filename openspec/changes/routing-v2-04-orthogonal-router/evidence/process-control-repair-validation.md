# R04 task 1.6 — process-control repair validation

The first-epoch record below is historical. Current second-epoch execution
evidence is recorded in the final section; the 225/989 results do not certify
the runtime-invalid repair profile.

Date: 2026-09-28. Change: routing-v2-04-orthogonal-router.
Repair type: PROCESS_CONTROL_ONLY. Authoring/test step: Sol high.

## Authority and isolation

Original approved checkpoint and cumulative product origin O remain
cf424e247490fdfae2c4efc9f7e7377b6d5b6e11. No commit, archive, baseline rewrite,
independent PRE decision or R05 work is part of this task.

The gate now has an exact ORDINARY_DIRECTION_CONSTRUCTION repair profile:

- Pin O and the exact repair-entry snapshot path/raw hash before interpretation.
- Compare HEAD and INDEX file sets, objects, stages and modes with their own
  recorded entry layers, plus the complete raw-byte WORKTREE set, including ignored
  additions. Retained untracked files are allowed only unchanged and unstaged.
- Reject cancellations, missing files, new names, copied destinations, mode changes,
  symlinks/junctions, unmerged stages and replacement manifests.
- Retain initial-planning prohibitions, four-source NUL-safe discovery, independent
  source/dependency inspections and the exact package/lock content exception.
- Preserve original schema-1 approval at O. Require separate schema-2 fresh PRE,
  complete revised artifact fingerprints and immutable snapshot binding for P.
- Require control-only linear history O..P, even for reverted product edits. Freeze
  controls/report/manifest at P while discovery continues from cumulative origin O.

The immutable fixture bundle pins the 58 entry files for future isolated Git tests;
it does not authorize live product edits. evidence/.gitattributes preserves its
bytes and those of the original entry manifest. Metadata fingerprints refer to O
blobs; retained worktree metadata is separately checked against the entry snapshot.

## Executed checks

```powershell
node scripts/routing-v2-architecture-gate.mjs --self-test-r04-repair
node scripts/routing-v2-architecture-gate.mjs --self-test
node scripts/routing-v2-architecture-gate.mjs --review-fingerprint
node --check scripts/routing-v2-architecture-gate.mjs
pnpm exec eslint scripts/routing-v2-architecture-gate.mjs
pnpm exec prettier --check scripts/routing-v2-architecture-gate.mjs
pnpm run routing:v2:arch-gate
openspec validate routing-v2-04-orthogonal-router --strict
openspec instructions apply --change routing-v2-04-orthogonal-router --json
node openspec/changes/routing-v2-04-orthogonal-router/evidence/check-planning-repair-entry.mjs
git diff --check
git status --short
git rev-parse HEAD
```

Focused repair self-tests: PASS, 225 assertions.
Full self-tests: PASS, 989 assertions, including all 225 named repair controls.
Syntax, scoped ESLint and formatting: PASS.
Final installed planning gate: PASS, 125 changed paths and 123 V2 source/test files;
HEAD, INDEX and WORKTREE source inspections executed.
Strict OpenSpec validation: PASS.
Repair-entry checker: PASS, 58 WORKTREE files, 2 HEAD and 2 INDEX entries.
Snapshot raw SHA-256:
1a306ca7ec1df199e41351e750fd74942cf8c2c98aa1f00de899eb320d1e3a71.
Diff whitespace check: PASS; existing LF/CRLF conversion notices are not failures.
HEAD remains O. No production, R04 tests or dependency metadata were changed.
The final process-state has PLANNING, PRE PENDING, IMPLEMENTATION_PAUSED=true,
readiness for independent PRE=true, archive/next=false. The review-fingerprint
command emits the full revised 31-path set; no replacement review was written.

## Resolved test/control-development failures

Earlier focused attempts stopped without a PASS. The assertions were retained:

1. TEST fixture cleanup: Git chmod refreshed a dirty metadata blob; restoring
   the executable bit alone left the wrong index object. Explicitly restore the
   original staged metadata after the mode attack.
2. TEST fixture line endings: raw CRLF copies into a core.autocrlf=false fixture
   created non-control changes in a positive P checkpoint. Canonicalize planning
   text only; keep immutable entry bytes untouched and add a history assertion.
3. PROCESS_CONTROL I/O: the immutable bundle exceeds Node's default 1 MiB Git
   output buffer. `git show` raised ENOBUFS during approval verification. Use a
   bounded 16 MiB buffer in repair approval/frozen reads and fixture reads. Add
   explicit positive assertions for serialized proof, entry tree and each frozen
   file so a failed checkpoint cannot hide its underlying exception.

A first ordinary Prettier write returned EPERM; the same single-file formatting
command succeeded with sandbox escalation. No numerical or scope requirement,
assertion, old gate control or retained product test was weakened.

## Remaining checkpoint

Task 1.6 is complete; progress is 13/30, including historical completed tasks. Task 1.7
requires a fresh independent read-only Astra xhigh PRE revalidation using
pre-implementation-gate-prompt.md. No real schema-2 approval/report was fabricated.
The original ordinary-route regression remains red, awaiting the separately
approved BDD/production repair; this report does not certify R04 correctness.

## Task completion report

CHANGE: routing-v2-04-orthogonal-router
IMPLEMENTED: Task 1.6 exact repair isolation and schema-2 approval/checkpoint controls.
FILES_CHANGED (this task only):

- scripts/routing-v2-architecture-gate.mjs
- docs/routing-v2/CURRENT_CHANGE.md
- openspec/changes/routing-v2-04-orthogonal-router/tasks.md (only checkbox 1.6)
- openspec/changes/routing-v2-04-orthogonal-router/evidence/gate-profile.md
- openspec/changes/routing-v2-04-orthogonal-router/evidence/planning-repair-process-protocol.md
- openspec/changes/routing-v2-04-orthogonal-router/evidence/planning-repair-fixture-files.json
- openspec/changes/routing-v2-04-orthogonal-router/evidence/.gitattributes
- openspec/changes/routing-v2-04-orthogonal-router/evidence/process-control-repair-validation.md

TESTS_ADDED: Named adversarial repair controls in the gate script, with immutable
fixtures; no R04 product test edit.
COMMANDS_EXECUTED: Listed above.
TEST_RESULTS: Focused 225 PASS; full 989 PASS; installed gate, strict validation,
snapshot equality, syntax, scoped lint, formatting and diff check PASS.
KNOWN_BLOCKERS: Fresh independent PRE and its control-only checkpoint remain
required before product repair. No task 1.6 control blocker remains.
READY_FOR_VERIFY: NO
READY_FOR_PRE_IMPLEMENTATION_REVALIDATION: YES
PRODUCTION_FILES_MODIFIED: NONE
R04_TEST_FILES_MODIFIED: NONE
DEPENDENCY_FILES_MODIFIED: NONE
PRE_IMPLEMENTATION_GATE: PENDING
ARCHIVE_ALLOWED: false
NEXT_CHANGE_ALLOWED: false

## Second epoch — fresh process-control validation (2026-09-29–30)

Authority: the user authorized repair of the mutation-runtime-invalid gate
profile and its regression controls. This section records executor evidence,
not an independent PRE decision. Production, R04 tests/mutation harness and
package metadata were not edited by this process-control repair.

The common `--self-test` now executes the second-epoch regressions and prints
each suite's count. Runtime fixtures use the separately pinned
`runtime-invalid-repair-fixture-files.json` bundle instead of live product,
planning files or the live HEAD. Its 104 files include all 66 retained
product/test/tooling files, plus immutable planning/control fixture inputs.
The executed gate stays outside the fixture; its explicit synthetic script
stub avoids a circular script/bundle hash. Synthetic approvals are confined
to disposable repositories.

Bundle raw SHA-256:
801dfe1c85e00d39affe4d38ed4c4effd122aef2aa8ec426ce78157512d0b5a8.
The loader checks the complete path set, canonical encoding, entry hash,
retained bytes/sizes and frozen-control hashes. Installed checks cover bundle
and entry manifest in HEAD/INDEX/WORKTREE; cancellation controls exercise both.
Schema-3 report/approval paths and all required fields are documented in
gate-profile.md and the current PRE prompt. Schema-1/schema-2 history stays
unchanged. The current fingerprint set contains 38 artifacts.

Fresh executed commands and current results:

- `node scripts/routing-v2-architecture-gate.mjs --self-test-r04-runtime-repair`:
  PASS, 46 assertions.
- `node scripts/routing-v2-architecture-gate.mjs --self-test-r04`: PASS,
  313 assertions.
- `node scripts/routing-v2-architecture-gate.mjs --self-test-r04-repair`:
  PASS, 271 assertions (225 first epoch + 46 second epoch).
- `node scripts/routing-v2-architecture-gate.mjs --self-test`: PASS,
  1035 assertions. Its output separately reported R03 approval 26, original R04
  313, first repair 225 and second repair 46 assertions before the overall PASS.
- Future-checkout portability control: PASS. A separate temporary repository
  used the immutable bundle, a new control-only commit and a later committed
  product change. Its CURRENT and product WORKTREE were also changed. Running
  the focused runtime CLI from that checkout still returned all 46 assertions
  PASS; fixture construction required neither its live HEAD nor product bytes.
- `pnpm run routing:v2:arch-gate`: PASS, 732 paths and 130 V2 source/test files;
  HEAD, INDEX and WORKTREE inspected.
- `node --check scripts/routing-v2-architecture-gate.mjs`: PASS.
- `pnpm exec eslint scripts/routing-v2-architecture-gate.mjs`: PASS.
- `pnpm exec prettier --check scripts/routing-v2-architecture-gate.mjs`: PASS.
- `openspec validate --all --strict`: PASS, 15/15.
- `git diff --check` and `git diff --cached --check`: PASS.

The earlier common-suite process was interrupted and its final result was not
recoverable; it is not PASS evidence. A loader-development run rejected control
paths under the product-only path validator; the replacement retains an exact
bundle path set and explicit safe relative-path checks. Shell creation of the
single evidence bundle initially returned EPERM; the authorized scoped generation
succeeded with sandbox escalation. No required assertion was removed or weakened.
The portability checkout inherited global core.fsmonitor=true and printed Git
daemon-termination diagnostics. Every Git operation completed with exit 0 and
the focused CLI returned exit 0 with its assertions passing. Global Git settings
were not changed; all disposable roots were checked and removed after execution.

Fresh independent Astra xhigh PRE and a separate control-only checkpoint remain
required. PRE_IMPLEMENTATION_GATE stays FAIL; implementation is paused, archive
and R05 remain disallowed. This evidence does not certify R04 product correctness.
