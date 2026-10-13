# P02-S2-CLEANUP-RECOVERY-REBIND-01 — exact proposed scope

Status: PROPOSED / NOT_ACCEPTED / NOT_IMPLEMENTED. Owning branch codex/frade-ui-design-contract, worktree C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade. Baseline add6975a4c8e0d7a168b3962aa99530dbc335b40. P02 3/9; full READY_FOR_VERIFY:NO.

## Proven problem

Existing native helper terminates on every REFUSED/UNKNOWN; WindowsFilesystemTransport invalidates its session and VerifiedFilesystem becomes CLOSED. A genuine externally held read lock produced REFUSED/WIN32_32 on identity-bound remove. The old InstallerJournal then cannot publish the reserved closing disposition.

Actual diagnostic: evidence/p02-check-s2b-cleanup-liveness-probe-20261013T180738216Z and static-clean fixture recheck evidence/p02-check-s2b-cleanup-liveness-static-green-20261013T181143766Z. A fresh generation fully rescanned the unchanged seven-record prefix and wrote exactly its eighth ROLLED_BACK disposition with the finite candidate hash pending while the lock was held; bytes were preserved. This is a component diagnostic, NOT implemented coordinator/Main/participant recovery.

Stronger diagnostic evidence/p02-check-s2b-cleanup-identity-proof-20261013T181300951Z is FAIL: strict child open cannot re-enumerate the archive while this real external lock remains. The earlier diagnostic PASS does not prove that stronger readback. Preserve both results. No exception is currently accepted.

## Exact delta 1: recovery-only replacement of an already closed backend

Replace ONLY the current S2 scheme section3 sentence "Never rotate/clear counters mid-transaction, weaken the native guard, or treat a session reset as recovery." with:

"Never perform planned creation-budget rotation or clear counters mid-transaction, weaken the native guard, or treat a session reset as recovery. The sole additional live recovery case is a positively identified native pre-effect REFUSED/WIN32_32 during an identity-bound, journal-authorized physical cleanup attempt, after its unique durable CLEANUP intent. The old verified context must already be CLOSED. Block admission and reveal; revoke affected runtime write callbacks. Await confirmed disposal/process exit and release of the old exclusive lease before one fresh-generation bind to the identical Main-authorized root. Never overlap owners. Complete a fresh checked journal scan, validate every final/pending transition and remaining original reservation, settle COMMITTED-only authority, and verify actual Main-owned presentation plus all required current/retained archives before any closing effect. Acquire fresh private Main recovery ownership where required; historical target fields never authorize a stale callback. Reuse the exact already journalled RecoveryPlan target and consumed revision; no allocation of14 for repeated13. Only the missing original closing disposition may then be published, with a truthful finite cleanupPending set, no new STAGING/reservation/phase/receipt/pointer or creation-budget reset claimed for the interrupted transaction. One rebind attempt per live refusal, no retry loop. Failed disposal, bind, verification or closing remains RECOVERY_BLOCKED with bytes/envelope retained. Other refusal codes, UNKNOWN/possible partial effects, unknown ownership and budget exhaustion are excluded from this live exception and remain blocked for existing full startup recovery."

This is an explicit exception to the earlier mid-transaction wording. It does not authorize healthy-session rotation, bypass factory proof or restart a native command blindly.

## Exact delta 2: non-deleting pending bookkeeping for the refused cleanup-only directory

For that same live refusal only, permit closing disposition to record a bounded potential cleanup hash from the already validated active plan without successful descendant readback while the external sharing conflict remains. It must:
- be outside the selected authority's current AND retained-previous hash sets;
- refer to a version directory established by the validated STAGING intent, with its ordinary identity captured under checked parent protection before cleanup;
- have the same exact directory identity/type under the newly bound checked versions parent; changed/missing/unsafe/unknown directory ownership blocks;
- retain the actual refusal status/code and unavailable descendant verification as runtime diagnostics; no assertion of checked child contents, package validity, physical deletion or ownership of uninspected children;
- preserve every byte and perform NO second deletion or child mutation in this replacement session. The pending hash describes an unresolved logical cleanup intent, not authorization to delete whatever is at a textual name.

All selected current/retained archives and actual settings remain subject to full existing checks; locks there block recovery rather than use this exception. Observed unknown names/types/reparse/hardlink/contradictory identities still block. After release, retry may remove only fully re-enumerated bounded ordinary owned inventory with actual identity checks; unknown/changed children are preserved and block deletion. Repeated retries/restarts append no journal records. This delta does not add a live recovery exception for an interrupted process with no captured directory identity; existing startup safety checks remain.

## Implementation boundary and gates

Use only already accepted P02 coordinator.ts/recovery.ts, existing Main-only presentation-settings purpose, existing journal/storage/factory ports and new P02 tests/evidence/status. No native helper/source/protocol/schema/operation/field or certificate weakening. No new persisted IDs or counters, journal kinds or phases, dependencies, renderer restore API, P01 algorithm/test edits, routing/domain/vendor/Draw/tokens/brand/shared policy/CI changes.

After exact acceptance: record acceptance and hashes; reconcile proposal/design/spec/tasks and a new dated S2 scheme; run strict validation and fresh automatic PRE gpt-6-sol/xhigh on the exact coherent delta. No implementing this exception before PRE PASS. Then meaningful coordinator RED/GREEN, real locked before/after-marker cases, actual Main/participant ownership, no overlapping lease, failed disposal/rebind, changed directory, current/previous protection, single closing receipt, original prefix/full bytes and revision13/next14 tests; existing full killed-process matrix and creation-budget stress remain required. Original diagnostic hypothesis FAIL stays immutable. New tests must explicitly retain its proof that strict locked child verification refuses, then prove full child identity/hash after lock release before cleanup; no blind expectation change, skip or weakening of original regressions. Verification precedes automatic POST, then checkpoint publication. Full P02 is not closed by a focused gate; STOP before P03.

## Strategy assessment

Selected strategy changes orchestration and pending bookkeeping, preserving the closed native boundary. Alternative continuing after REFUSED in the original helper needs new native security/runtime contracts and source/deploy regression work (forecast several sessions, higher risk), so is not selected. Closing before any actual cleanup attempt contradicts accepted ordering. Staying blocked until every external lock releases is safe but cannot supply the specified completed logical outcome with CLEANUP_PENDING. Repeated rebind/delete loops or trusting a hash-shaped name alone are unsafe and excluded.

Measured bounded probes: 3.2–3.8s successful journal-only diagnostic; expanded locked descendant readback FAIL. Actual independent reviews previously17–24min; next fresh PRE forecast20–30min, not a hard timeout. Coordinator implementation/full matrix cost remains uncertain, forecast S2b8–20 working hours after scope settlement; full P02 remaining24–56 working hours. Token/resource cost unmeasured; no success probability claim. First probe after PRE: one live lock/refusal/rebind closure with actual Main owner and one postmarker variant. Reassess before full matrix on failure, identity drift, extra record, unsafe ownership, doubled observed probe cost or incomplete review. Stop on current required FAIL, preserve evidence.
