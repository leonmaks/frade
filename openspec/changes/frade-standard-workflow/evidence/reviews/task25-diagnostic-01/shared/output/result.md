Task2.5 has blocking gaps:

- **Unverified runner code executes before verification.** [review.mjs:933](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T11-44-00-944Z-d9fea91b-e112-4e8d-a5b8-5fd84684a709/prepared/packet/scripts/directions/review.mjs:933) imports `core.mjs`, then asks that module to verify its own bundle. Changed code can execute with owner permissions before rejection. Verify pinned bundle/file bytes independently before importing.

- **Incomplete/error streams can pass.** Read-only reproductions against [review.mjs:436](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T11-44-00-944Z-d9fea91b-e112-4e8d-a5b8-5fd84684a709/prepared/packet/scripts/directions/review.mjs:436) accepted an unfinished tool item, an `item.completed` error, and a final message preceding `turn.started`. Enforce item completion, error rejection and message ordering; existing negative tests miss these cases.

- **Reusable admission has inconsistent freeze keys.** [review.mjs:726](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T11-44-00-944Z-d9fea91b-e112-4e8d-a5b8-5fd84684a709/prepared/packet/scripts/directions/review.mjs:726) locks by change, while [status.mjs:552](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T11-44-00-944Z-d9fea91b-e112-4e8d-a5b8-5fd84684a709/prepared/packet/scripts/directions/status.mjs:552) checks direction ID. A validated manifest with different direction/change names therefore permits status writes during review. W01’s identical names conceal this defect.

- **Meaningful RED evidence is incomplete.** [task25-final-import.json:289](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T11-44-00-944Z-d9fea91b-e112-4e8d-a5b8-5fd84684a709/prepared/packet/openspec/changes/frade-standard-workflow/evidence/task25-final-import.json:289) references external RED logs by hash, but their contents are absent. Their failing assertions and implementation ordering cannot be independently assessed.

Verified **62/62 packet hashes**. Recorded Windows results show **124/124 tests**, strict validation **1/1 and 16/16**, lint and formatting successful. D03 semantically approves the exact Astra/xhigh PRE row; request metadata supplies no approval. Windows launch uses Node with fixed JavaScript-entry arguments. Historical FAIL/BLOCKED records remain historical.

This is only the task2.5 diagnostic. Task2.6, task2.7, formal Verify, final POST and archive remain **NOT_RUN**; no cumulative closure is granted. No files were modified.

GATE_STATUS: FAIL