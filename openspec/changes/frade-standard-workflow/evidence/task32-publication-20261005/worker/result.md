CHANGE: Repaired W01 publication content scanning at the first incorrect decision. It now permits benign JavaScript declarations and the current W01 control source while blocking the tested literal credentials, private-key blocks, and prohibited filenames.

FILES CHANGED: [publication.mjs](/mnt/e/dev/codex/frade-worker-staging/w01-task-3-publication-resume-retry1-20261005/work/scripts/directions/publication.mjs) and [publication.test.mjs](/mnt/e/dev/codex/frade-worker-staging/w01-task-3-publication-resume-retry1-20261005/work/tests/directions/publication.test.mjs). The exact hashes, RCA, and RED/GREEN bindings are in [TASK-3-PUBLICATION.json](/mnt/e/dev/codex/frade-worker-staging/w01-task-3-publication-resume-retry1-20261005/work/TASK-3-PUBLICATION.json).

TEST RESULTS: Native Windows Node 24 public checkpoint suite passed **27/27** against the final file hashes. Local syntax checks passed.

KNOWN BLOCKERS: Owner full regression, lint, formatting, and the actual authorized checkpoint remain pending. No commit, push, Verify, or POST was performed. READY_FOR_VERIFY: NO.