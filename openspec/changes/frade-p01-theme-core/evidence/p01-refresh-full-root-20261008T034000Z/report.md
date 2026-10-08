# P01 — current1440p/60Hz full check

CHANGE: frade-p01-theme-core.

IMPLEMENTED: No production/test change in this diagnostic checkpoint. User-selected2560×1440/60Hz accepted diagnostic PASS145.7ms followed by one unchanged full check:all.

FILES CHANGED: dated evidence below, branch-local dashboard and execution-context only.

TESTS ADDED: None. Existing tests/assertions/timeouts/workload unchanged; no retries to conceal failures.

COMMANDS EXECUTED: pinned pnpm12.6.0 check:all; source/artifact integrity collector; legacy/foundation preservation audit. Root includes lint/typecheck/unit/BDD/build/boundaries/UI compliance, Draw and desktop E2E. Cache hits are disclosed in stdout.

TEST RESULTS: root FAIL exit1; Draw215PASS; desktop133PASS/2FAIL. Benchmark PASS, nearest-rank p95=126.4ms,100samples after20warmups; median111.55ms, one sample>150ms (criterion remains p95). All3479source hashes match; main binary and before/after display mode unchanged.4687fresh artifacts verified. Ordinary6/expanded6glyph matrices, original actions6, keyboard6, pendingfocus6PASS. Popup5/6 and bodyfocus5/6.

KNOWN BLOCKERS: View anchor remains inactive at first popup focus in Dark/Comfortable and after baseline→wide viewport in Light/Comfortable body focus. Native/document focus and DOM activeElement require distinct evidence; installed Playwright1.57.0 combines them. No proved RCA or repair; full verification/POST/archive remain blocked, human visual NOT_APPROVED. Historical hover/4K29Hz performance FAILs remain; isolated causal contribution of refresh versus resolution is NOT_PROVEN.

Guide1.0/tokens1.0.0. Applicable selected consumer FDS-003/004/008/009, A11Y-001–005/007–009; unchanged source/semantic preservation and exactly3accepted geometry/native/placement exceptions. Exceptions do not receive accessibility PASS. No Routing/API/domain/vendor/assets change, no installer/extensions/provider claim. Branch protection LOCAL_ONLY/NOT_CONFIGURED.

READY_FOR_VERIFY: NO

Actual failure screenshots:

- [P01-UPPER-028 dark comfortable](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-refresh-full-root-20261008T034000Z/desktop-artifacts/ui-contract-theme-P01-UPPE-d9b05-cus-raster-dark-comfortable/test-failed-1.png)
- [P01-UPPER-031 light comfortable](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-refresh-full-root-20261008T034000Z/desktop-artifacts/ui-contract-theme-P01-UPPE-d916d-and-modal-light-comfortable/test-failed-1.png)

RCA facts: [openspec/changes/frade-p01-theme-core/evidence/p01-refresh-focus-rca-20261008T051310Z/facts.json](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-refresh-focus-rca-20261008T051310Z/facts.json).
