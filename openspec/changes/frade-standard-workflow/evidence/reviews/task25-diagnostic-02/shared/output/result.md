Two correctness blockers remain:

- **Error/incomplete items can still produce approval.** Read-only reproductions against [review.mjs:595](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T15-48-00-344Z-c84f8ea4-12c6-49b8-ac46-095bf6bbf199/prepared/packet/scripts/directions/review.mjs:595) accepted both an `item.completed` with `type: "error"` and a completed command still marked `in_progress` with null exit. Both returned PASS. The parser needs type-specific error and terminal-state validation. Existing tests miss these cases; the native old-source parser RED stops at its initial valid-FAIL assertion.

- **Failure handling releases the freeze before reception is established.** [review.mjs:1359](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T15-48-00-344Z-c84f8ea4-12c6-49b8-ac46-095bf6bbf199/prepared/packet/scripts/directions/review.mjs:1359) removes the marker whenever the owner snapshot remains unchanged, including child timeout or failed raw capture. There is no requirement for completed raw retention or confirmed termination of reviewer descendants. Preserve the freeze until both are established.

Verified **167/167 packet hashes**, all eight formatted transfer bindings, and retained RED evidence hashes. Read the complete relevant RED logs and actual [Windows results](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-03T15-48-00-344Z-c84f8ea4-12c6-49b8-ac46-095bf6bbf199/prepared/packet/openspec/changes/frade-standard-workflow/evidence/task25-repaired-owner/windows-full-directions.json): **131/131**, lint, formatting and strict **1/1, 16/16** passed. These checks do not cover the blockers above.

D03 semantically authorizes Astra/xhigh PRE. Independent release verification before import, isolated child Git settings, direction-wide freeze naming, Windows Node-entry validation, bounded link metadata capture, and separate raw versus CLI exits are present. Trusted admission remains distinct from the W01-only CLI.

Recovered Sol/high source remains candidate evidence; blocked generation, historical FAIL and stale `item_58` report digest grant no approval. No files were modified. Task2.6, task2.7, formal Verify, final POST and archive remain **NOT_RUN**; no cumulative closure is granted.

GATE_STATUS: FAIL