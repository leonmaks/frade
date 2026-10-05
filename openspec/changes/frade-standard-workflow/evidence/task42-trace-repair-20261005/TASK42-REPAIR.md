# W01 task 4.2 trace repair handoff

ROLE: approved W01 tooling-tests, gpt-6-sol/high. Actual backend/effort: NOT_CONFIRMED. Published source checkpoint: `661f872226425fac84606e201ac7677d7b0e504d`. Accepted design SHA-256: `501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a`.

CHANGE: FWE-004/FWE-014-S01 trace and completed-task consistency. The POST observation is unadmitted: the reviewer reported FAIL, while the wrapper was BLOCKED by a read-only temporary heredoc error. No formal gate verdict is claimed.

RCA: `STATE_TRANSITION` and `ABSTRACTION_BOUNDARY`, recorded before production edits in `RCA.json`. The first wrong predicate in `projectStatus` searched only for a present task record with a present unproven scenario. Missing records and empty/omitted scenario lists made it false. The domain contract also checked reciprocal links only from scenarios toward tasks. The responsible fixes are in `scripts/directions/status.mjs` and `scripts/directions/contracts.mjs`.

REGRESSION FIRST: `tests/directions/task42-trace-gap.test.mjs` was added without importing or changing existing tests. It covers missing, empty and omitted completed-task mappings against separately trusted in-memory raw run evidence for another task; a mapped positive control; dangling and nonreciprocal outgoing links; and explicitly justified human/future boundaries that remain pending. `TEST_READY.json` binds test, original source and read-only input hashes. Original sources remain in `TASK42-ORIGINALS/`.

RED: unchanged sources were `50e1efe38d9e906a6b0f577138baa9c107ef1f5349c8f6e2c5c85b59ab0ae367` (contracts) and `45a3ed3202892a428ab0447ce3ea65a93deb3707cdd5ac94be40f8f0cebd8d55` (status). On Linux Node v18.19.1, `node tests/directions/task42-trace-gap.test.mjs` exited 1: 7 expected failures, 1 mapped control pass, 0 skipped. Exact output and exit are in `TASK42-LINUX-RED-DIRECT.txt` and `.exit`; the `node --test` wrapper output/exit are also retained. `TASK42-LINUX-RED.json` binds these files.

NATIVE RELEASE: parent-created `NATIVE-RED.json` reports `NATIVE_RED_CONFIRMED`, Windows exit 1, 7 expected failures, 1 positive pass, no skips, and the exact unchanged source and test hashes. The marker SHA-256 is `7a3032d311ce64b0565fdd51ff49ff487650f776539eb997f9018189f234cb55`. Its parent raw-command record is referenced by path/hash inside the marker; this worker did not inspect that external record. The marker was validated against staged file hashes before either source edit.

IMPLEMENTED: trace validation now requires every trace task to have nonempty outgoing scenario IDs whose scenarios reciprocally name that task. Status now checks every completed checklist task for a present meaningful mapping and current trusted proof of executable scenarios. A valid explicit human/future boundary is pending, never accepted. Administrative completion counts remain independent of accepted requirement counts; archive readiness stays false. No trace records were synthesized.

GREEN on staged Linux/WSL2 Node v18.19.1:

| Command | Exit | Result | Raw output |
|---|---:|---|---|
| `node tests/directions/task42-trace-gap.test.mjs` | 0 | 8/8 pass | `TASK42-LINUX-GREEN.txt` |
| `node tests/directions/contracts.test.mjs` | 0 | 14/14 pass | `TASK42-CONTRACTS.txt` |
| `node tests/directions/status.test.mjs` | 0 | 19/19 pass | `TASK42-STATUS.txt` |
| `node tests/directions/budget-boundary.test.mjs` | 0 | 4/4 pass | `TASK42-BUDGET.txt` |
| `node tests/directions/repair.test.mjs` | 0 | 5/5 pass | `TASK42-REPAIR-REGRESSION.txt` |
| `node --check` on both modules and the new test | 0 | syntax valid | direct command result |

An unchanged-source status baseline also exited 0 with 19/19 passes; its raw output and exit are retained as `TASK42-BASELINE-STATUS.txt` and `.exit`.

SCOPE AUDIT: comparing staged `scripts/`, `tests/`, `docs/` and `openspec/` files against `../input` identified only the two authorized source changes and the new standalone test. Nine read-only input hashes in `TEST_READY.json` were checked unchanged. The staged copy has no Git metadata, so `git status`, Git owner behavior, native full suite and original owner checks are not established here. Parent native checks and fresh formal Verify/POST remain required. Historical formal Verify PASS is not current clearance; task 4.1 is reopened, task 4.2 remains blocked, and archive is inactive. Product writer dispatch remains `NOT_IMPLEMENTED`.

READY_FOR_VERIFY: YES, for the staged repair scope only. This is a handoff to parent verification, not a Verify/POST/Architecture Gate/archive PASS or task completion claim. Complete assistant stream and final report reception/binding remain the parent wrapper's responsibility; no external stream is represented as inspected here.
