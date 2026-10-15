# P01-MAIN-CURRENT-RUNTIME-EVIDENCE-01

Status: PROPOSED, NOT_ACCEPTED, NOT_APPLIED. Prepared 2026-10-14T00:28:53.915Z.

## Exact observed result

The original full desktop command remains FAIL:74PASS/1screenshot timeout/60NOT_RUN. The continuation remains FAIL:58PASS/1Workbench assertion failure/1NOT_RUN plus a secondary reporter error outside any case. Neither command is relabeled PASS. Complete original logs, traces, screenshots and hashes are retained.

- First exact failure: ui-contract-theme.spec.ts, P01-UPPER-017 expanded real viewport text and media raster light compact; page.screenshot30000ms timeout after fonts loaded. One unchanged focused probe passed in5.1min. Root cause NOT_PROVEN, not established as environment or repaired UI.
- Second exact failure: workbench-paths.spec.ts:36 expected metadata-path diagnostic, received REPOSITORY_UNAVAILABLE after35.5min of theme cases; cause NOT_PROVEN. One unchanged fresh-process two-file probe passed both this case and the last previously unreached Workbench case in20.3sec. No product/fixture/assertion/tolerance/timeout changes. Secondary reporter error remains disclosed with the same failed command.

Exact case inventory has135distinct original cases, now all135have current PASS observations:74+1+58+2. Total137attempts include2FAILs; no original case remains unreached. Cases use fresh Electron app/profile/fixture; subset coverage-equivalence strategy and budget were recorded before execution. Long-worker stability is NOT_PROVEN. Test source SHA256 7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43.

Current immutable source/case/evidence mapping: openspec/changes/frade-p01-main-integration/evidence/current-verification-20261014T002208138Z/desktop-case-coverage.json and requirement-current-evidence-mapping.json. Initial two failed commands remain openspec/changes/frade-p01-main-integration/evidence/runtime-desktopE2e-20261013T220910013Z and openspec/changes/frade-p01-main-integration/evidence/runtime-remainingDesktopCases-20261013T231907391Z; passing diagnostic probes remain openspec/changes/frade-p01-main-integration/evidence/runtime-expandedGlyphLightCompactProbe-20261013T230910312Z and openspec/changes/frade-p01-main-integration/evidence/runtime-workbenchPathsProbe-20261014T000506173Z.

## Requested exact decision

Accept only these two non-reproduced execution failures as explicit deferred consumer delivery risks P01-MAIN-D01(capture timeout) and P01-MAIN-D02(Workbench diagnostic/failed-command reporter limitation). Permit the complete unchanged135-case split execution evidence, existing successful root/static/unit/BDD/boundary/build/Draw/compliance checks and current source hashes to meet the runtime execution prerequisite for this P01-only main integration. This does not declare original commands PASS, prove root cause, repair the risks, transfer the old3defect waiver, or claim long-worker stability.

Reconcile this exact decision in proposal/design/tasks before fresh independent PRE gpt-6-sol/xhigh; revalidate mapping and require cumulative POST on the final exact source. Human acceptance does not supply independent POST. Any new or recurrent required failure after this accepted evidence set, missing case, changed source/assertion/timeout, main smoke failure, or independent correctness blocker still stops progression and requires its own resolution; no blanket retry or waiver. Keep both current risks and the3historical P01defects visible in final delivery/status. No production repair, new runtime scope, routing work or remote publication is authorized.

## Strategy comparison

- Repair without reproduced root cause: rejected; violates regression-first/exact transfer and risks unrelated Workbench changes.
- Repeat whole135cases: forecast80–100minutes based on measured46.7+36.8min, many already proved cases; passing again would not establish either cause.
- Add unlimited focused retries: rejected; green-seeking repetition without new evidence. Bounded probes have already completed.
- Defer exact two risks with complete case-level evidence and independent final review: selected proposal, forecast20–30min focused review plus final POST; judgment, harness hard timeout separate. No success probability is claimed.
- Investigate further with instrumentation/new fixture: feasible if user declines risk; scope/PRE/meaningfulRED needed before any code change; duration unknown, bounded RCA planning first.

Decision needed because AGENTS§3 and this stage design forbid silently accepting a new required FAIL. Existing3P01minor deferrals do not cover these contexts. Main remains NOT_INTEGRATED and P02–P07 remain PAUSED.
