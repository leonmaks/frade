# Checkpoint whitespace repair

Change: routing-v2-04-orthogonal-router.
Repair type: process-control presentation only.

The independent second-epoch PRE report supplied in attachment
`b82f08ca-d90b-4566-ac99-208dc9280c7e/Pasted text.txt` gave PASS. Its 38
fingerprints matched the live producer before checkpoint staging. The report,
schema-3 binding and exact received bytes are retained in the
`pre-implementation-runtime-revalidation-*` evidence files. The received JSON
stores the original bytes as base64, avoiding Git line-ending conversion.

Staging the prospective control-only checkpoint exposed a required failure:
`git diff --cached --check` reported trailing spaces on lines 3, 4 and 5 of
each of these previously untracked reports:

- pre-implementation-revalidation-fail-process-control-2026-09-29.md
- pre-implementation-revalidation-fail-runtime-invalid-2026-09-29.md

The earlier unstaged diff checks did not inspect those untracked files.
No commit or phase advancement occurred. All staging created by this workflow
was removed without changing worktree product files or prior index contents.

The repair removes exactly two trailing spaces from each of those six lines.
Report wording, findings and verdicts are unchanged. The exact original bytes,
sizes and SHA-256 values are retained in
`checkpoint-whitespace-repair-originals-2026-09-30.json`, with changed-line
numbers and the formatted hashes.

Executed checks after the formatting repair:

- All 66 retained product/test/tooling file bytes match the immutable entry.
- The reviewed fingerprint comparison changes exactly the two report entries;
  the other 36 values are unchanged.
- A real prospective checkpoint staging of 19 control paths passes
  `git diff --cached --check`. Its staging was removed afterward.

The saved PRE PASS remains actual historical review evidence for the preceding
bytes. Its schema-3 manifest is not approval for the two changed fingerprints.
Do not replace its hashes with current values or reuse it for a checkpoint.
Task 1.9 is reopened; the phase remains PLANNING, implementation remains paused,
archive and the next change remain prohibited. A new independent PRE is required
before saving a new binding and attempting the control-only checkpoint again.

The cumulative origin remains cf424e247490fdfae2c4efc9f7e7377b6d5b6e11.
HEAD remains 4ff5c4deea4f5f6804bb01f92f955813c617d765. No production,
R04 product tests, mutation harness, dependencies, gate code or fixtures were
modified by this formatting repair.

Fresh process checks after the repair also passed: strict validation of R04,
strict validation of all 15 OpenSpec items, unstaged/cached diff checks and the
installed architecture gate (738 union paths, 130 source/test files,
HEAD/INDEX/WORKTREE inspected). The machine PASS verifies planning isolation;
it does not replace renewed independent approval for the changed fingerprints.
