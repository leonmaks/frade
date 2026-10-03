CHANGE: W01 task 2.5 production review wrapper repair.

IMPLEMENTED: Bound termination proof to the trusted shared-run root, exact record and packet paths, and one UUID-scoped WSL probe. The freeze stays in place for incomplete receipts, live or unavailable probes, and source or packet drift. Release v1.1 was untouched.

FILES CHANGED: [review.mjs](/mnt/e/dev/codex/frade-worker-staging/w01-task-2.5-calibration3-attempt2-20261003/work/scripts/directions/review.mjs), [review-terminal.test.mjs](/mnt/e/dev/codex/frade-worker-staging/w01-task-2.5-calibration3-attempt2-20261003/work/tests/directions/review-terminal.test.mjs), and [task-2.5-review.md](/mnt/e/dev/codex/frade-worker-staging/w01-task-2.5-calibration3-attempt2-20261003/work/docs/engineering/templates/task-2.5-review.md). Raw commands, exits, and output are in [TASK-2.5-CALIBRATION-RESULT.json](/mnt/e/dev/codex/frade-worker-staging/w01-task-2.5-calibration3-attempt2-20261003/work/TASK-2.5-CALIBRATION-RESULT.json).

TEST RESULTS: Focused terminal tests passed 15/15; syntax checks passed. The review module passed 21/22 in isolated Linux. Its copied shared-core Git discovery test returned `UNRELATED_REPOSITORY`.

KNOWN BLOCKERS: Native Windows verification and actual reviewer termination evidence remain pending with the parent. This is a candidate, not approval or backend confirmation.

READY_FOR_VERIFY: NO.