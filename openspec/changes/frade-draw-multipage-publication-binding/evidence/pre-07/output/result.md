GATE_STATUS: FAIL

The Default trace supports an embedded focus race: both inserts arrived, Delete reached `mxTypingShim`, and Undo restored CRM. The proposed `showTypingShim` guard is a plausible narrow fix. It still needs the planned unit RED/GREEN and real Default regression to prove that the queued refresh is the focus stealing path.

Two blockers prevent PRE approval:

1. The [proposal](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-27T18-12-42-112Z-99aaeb6f-d208-4b49-9b70-cb7734997fa5/prepared/packet/openspec/changes/frade-draw-multipage-publication-binding/proposal.md:13) still says there is no product or spec change, while the superseding [design](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-27T18-12-42-112Z-99aaeb6f-d208-4b49-9b70-cb7734997fa5/prepared/packet/openspec/changes/frade-draw-multipage-publication-binding/design.md:95) authorizes a runtime focus repair and adds an embedded focus spec. Reconcile the proposal and run strict validation again. The supplied validation record describes the earlier zero-delta plan.
2. The packet omits `repositoryDrop.ts` and the navigator MIME source used by [DiagramView](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-27T18-12-42-112Z-99aaeb6f-d208-4b49-9b70-cb7734997fa5/prepared/packet/packages/ui-workspace/src/DiagramView.tsx:615). Include them so the accepted-drop boundary can be reviewed. The implementation must check `readOnly` before focusing or sending; the current drop handler checks only `ready`.

PRE06 remains FAIL. Private desktop and schema 2 acceptance remain withdrawn. Fresh Default clean and working proofs, the unchanged 150 ms gate, root gates, POST, and publication are still pending. Backend: NOT_CONFIRMED.