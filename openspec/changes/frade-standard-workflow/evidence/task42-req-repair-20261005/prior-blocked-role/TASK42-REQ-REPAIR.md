# W01 task 4.2 requirement reciprocity repair

Status: **BLOCKED / TEST-SPEC_CONFLICT**. `READY_FOR_VERIFY: NO`. This is staged scope only; no task completion, formal Verify, new POST, Architecture Gate, archive, publication, or foreign adoption occurred.

## Provenance and root cause

The approved tooling-tests pair is `gpt-6-sol/high`; actual backend and effort are `NOT_CONFIRMED`. The accepted design SHA256 is `501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a`. The published diagnostic head is `bb980612e519fabcfbdb76a76a432dcf074c1689`, implementation checkpoint `a71a7bedc41beac16ce1c374509281b4e9feca79`, and original baseline `98f387f96b51b0ad139e3507c376ff1c3e8dec09`. The prior capacity abort supplies no execution result.

RCA classification: **INVARIANT / ABSTRACTION_BOUNDARY**. Contract validation checked each requirement's outgoing scenario list and whether a scenario named an existing requirement, but missed the reverse membership check. Status then counted acceptance from that incomplete outgoing list. The correction validates both directions and counts a requirement from its own complete reciprocal graph and trusted current executable proof. Human and future scenarios remain pending; an unrelated invalid requirement does not erase an independently valid accepted count. Archive readiness remains false throughout.

## Regression-first evidence and scoped change

The standalone 13-case test was added before production edits. Linux Node `v18.19.1` unchanged-source direct RED ran 13 cases: 6 failed, 7 passed, 0 skipped, exit 1. The `node --test` invocation also failed with a Node 18 file-level aggregate result; both raw outputs and exits are retained. Parent `NATIVE-RED.json` (SHA256 `71b9fadeb836aecf4cc330c50301e4409a4fee6f9a16f6ef63ffbcedd039ee48`) confirms actual Windows RED: 13 tests, 6 expected failures, 7 passing controls, 0 skipped, exit 1, with the unchanged original source and test SHA256 bound. Production edits began after that marker.

Only `scripts/directions/contracts.mjs` and `scripts/directions/status.mjs` changed. The first adds missing scenario-to-requirement reciprocity diagnostics. The second uses per-requirement complete membership, valid reciprocal task/assertion links, and trusted run proof for acceptance. Original production bytes remain in `TASK42-ORIGINALS`. The prior eight task mapping tests, historical D04 source/assertions, helpers, fixtures, specs, decisions, plans, package, CI, guard, loader, common release, and publication code were not edited. No trace ledger or evidence was fabricated.

## Actual checks and blocker

On final staged Linux code, direct Node test runs report: new targeted **13/13**, contracts **14/14**, status **19/19**, budget **4/4**, repair **5/5**. The prior task gap suite reports **6/8**. Its empty and omitted outgoing task mapping cases still expect accepted requirements to be zero when a completed task has no scenario, even though a separate requirement retains complete reciprocal mapping and trusted proof. Per-requirement acceptance counts that independent requirement as one. This is a **TEST/SPEC_CONFLICT** with the new explicit independent-count requirement. Both old failures and all old assertions are retained; no test was weakened or relabelled. The malformed null-row failure introduced by the first implementation pass was corrected and the contracts suite now passes.

`node --check` passed for the two production files and new test. Prettier is unavailable in the staged workspace. Root loader returned `BLOCKED/PUBLIC_COMMON` because this seeded workspace has no Git metadata; original-owner access is denied. The binding audit found **148/148** available read-only/staged bindings unchanged outside the two authorized production edits. Linux checks do not constitute native Windows full-suite verification; the parent owns that run. Historical formal Verify at a71 is no longer current after the admitted POST blocker, and current POST remains FAIL. Task 4.1 remains reopened at 14/18 administrative tasks; gate FAIL and archive inactive remain in force.

Writer dispatch remains `NOT_IMPLEMENTED`; foreign adoption remains `NOT_STARTED`.
