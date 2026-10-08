# Frade P01 — read-only diagnostic

CHANGE: frade-p01-theme-core, current UI worktree only.
IMPLEMENTED: no source changes in this continuation. Existing sole-bridge final ownership guard remains SHA53901d117d50c9efc5abf3d4590f8e1ba699a28a042641f9bccdb070e64e218a.
FILES CHANGED: only this temporary diagnostic directory; UI checkout and branch-local status not changed because writes are unavailable.
TESTS ADDED: none.
COMMANDS EXECUTED: read existing completed Playwright report; exact source/PNG hashes; unchanged original raster helper replay in read-only VM; exact324-pixel comparison; trace read; git branch/HEAD/status/diff.
TEST RESULTS: completed matrix48PASS/1FAIL, no skipped/flaky. Existing source/build unchanged. Recorded340raster proofs:339PASS/1NOT_MEASURED. All30expanded preservation scenarios retain exact before/after semantic/file/identity records.

## Remaining failure
P01-UPPER-017 expanded real viewport text and media raster light comfortable. Sample restored-insertFreehand-hover. Existing assertion at apps/desktop/tests/e2e/ui-contract-theme.spec.ts:4110 expects PASS; got NOT_MEASURED / NONUNIFORM_OBSERVED_BACKDROP.

Observed: JSON records hover=true, opacity1, targetRGB232,235,240, glyph coordinates717,229. Saved PNG hashes match their original records. All324glyph pixels exactly equal restored default, restored focus and wide default crops; each differs from the wide hover crop. Actual transparent mask holes all have RGB245,246,248. Diagnostic replay with the saved default atlas yields its original default contrast4.797672908386502, but this does NOT satisfy hover coverage and does NOT change FAIL. No coordinate tolerance, alternate baseline or expected-value substitution was used.

Trace shows ordered hover -> observation -> iframe bounds -> screenshot -> mouse down. No intervening scripted mouse move is recorded. The trace alone does not prove why the visual state differed. Do not assign production, timing or external input root cause without reproduction.

## Next authorized work after restoring owning-worktree write access
1. Preserve this receipt in a new dated owning evidence directory, verifying all source hashes; update branch-local status from RUNNING to48PASS/1FAIL.
2. Reproduce exact failing case with diagnostic before/after screenshot hover/focus/window/pointer/paint observations, keeping original source/callbacks/assertions/tolerances intact. Use permitted new fixture tails only and preserve exact reversal.
3. Classify proven cause; if production or scope changes are needed, reconcile artifacts and obtain fresh stage-assigned independent PRE before implementation. No speculative production patch or evidence rebaseline.
4. Targeted and applicable full regression -> current FUI12/bindings/controls/BDD111 -> full check:all -> verify -> independent POST. Human visual acceptance remains NOT_APPROVED; P01 remains5/10; P02-P07 not started.

KNOWN BLOCKERS: current mandatory runtime FAIL; UI worktree outside writable roots and approval escalation disabled. The existing tracked status still says matrix RUNNING and is stale; this report does not replace that file. No new commit/push performed. Prior checkpoint a894702a was verified remotely earlier in the session, not reverified during this read-only continuation.
READY_FOR_VERIFY: NO

This temporary report is prepared diagnostic material only. Historical raw failures and screenshots remain unchanged in the owning UI worktree.
