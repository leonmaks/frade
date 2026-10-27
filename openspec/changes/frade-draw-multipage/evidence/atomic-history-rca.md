# Atomic history replay RCA

Actual selected matrix47 run03:12:29Z:44 PASS,3 native FUI005 FAIL in light/dark/HC.
The failure line3609 is the original immediate geometry poll AFTER Undo, not the
earlier parked-state check. No original FUI source/assertion changed. Initial parked
hypothesis was rejected by a deterministic real standalone park and desktop return/
object-edit/theme-commit probe; DOM identity, authored model and undo are retained.

Exact copied FUI diagnostic39 preserves all original assertions and records domain
serialization before/after Undo: authored node remains, position170/140 returns140/120,
no alert; final node exists. At the poll's first call replacement DOM is temporarily
missing. Root cause STATE_TRANSITION / ABSTRACTION_BOUNDARY: semantic history replays
through the validated loader which resets views using default asynchronous X6 render.
The command emits completion before target views exist, unlike native in-place undo.

Options: redesign semantic replay as an in-place graph reconciler (forecast1–3h and
new adapter/property/routing-state proof); weaken/catch/wait in original FUI (forbidden);
globally disable asynchronous X6 rendering (broader performance change); retain the
approved validated loader but make ONLY history replay atomic (selected, ~15lines plus
meaningful tests). Public graph.options.async is temporarily false around replay and
restored in finally. No domain algorithm, router/edge conversion/documentRestore flag,
native theme participant or default graph configuration changes. Source preservation
before/after theme remains separate from legitimate cell recreation during history.

RED40 deterministically proves undo returns without its target view. Initial repair41
passes that DOM assertion but fails a separate fixture equality: raw X6 addNode has
different defaults from production nodeToCell. Classified TEST; use the actual existing
nodeToCell creation path, retain every exact snapshot/view assertion. GREEN42 passes.
Extended regression also injects an asserted replay failure: snapshot/history and
normal scheduling must survive and a subsequent Undo must complete correctly.

Temporary exact-copy diagnostic code is retained byte-for-byte as .txt evidence;
its original frozen source/sha/ranges are in fui-diagnostic-origin.json. Retiring the
duplicate runnable copy removes no original regression/assertion. Permanent new
parking and atomic-history regressions plus original47-case matrix remain required.
Current fresh234-case Draw/12-case desktop/50-case matrix and root bindings still need
execution after this repair; earlier PASS evidence stays historical.
