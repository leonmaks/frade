# P01-BUNDLE-FRAME-COMPAT-01 — proposed exact scope extension

Status: PROPOSED, NOT_ACCEPTED. No implementation authorization and no independent PRE PASS for this delta.

Current full root result p01-accepted-delta-full-regression-repeat-20261001T072201Z.json is FAIL: Draw215PASS, desktop70PASS1FAIL. Unchanged exact bundle flow drawio reproduction p01-bundle-frame-unchanged-reproduction-20261001T073825Z.json fails at E2E-07 line440: actual bundle manager did not open after close/file fixture rewrite/reload/double click. The trace confirms actual click x965.5/y360; it contains no retained browser snapshot. It proves the missing-manager assertion, not a routing/domain defect or the exact geometry cause.

Original file apps/desktop/tests/e2e/bundle-flows.spec.ts: 30455 raw bytes, SHA256 ceeb27f0b3c6fc336652c6889439f84231627ae9b615ac8bef95ecb29e695bff. Save original raw bytes and both failed results before any repair. This file remains unchanged.

Decision requested: add only this third compatibility test path to the P01 closed test scope, solely for E2E-07 actual embedded editor readiness and diagnostic evidence. Keep every original workload, fixture, assertion, numerical tolerance (including native0.05), member/remove/save/Undo/Redo expectation and behavior unchanged. No skip/only, force-click, swallowed error, fixed-delay retry, geometry tolerance change, hidden element click, vendor/model write, production feature/domain/routing/vendor change or new UI library.

After user acceptance: coherently update proposal/design/spec/tasks and traceability; validate and obtain automatic independent gpt-6-astra/xhigh focused PRE before changing this fixture. Reproduce with actual geometry/viewport/hit target and a real screenshot before the failing assertion, preserving the assertion and original failure. Use the same approved actual-frame readiness contract: same visible iframe, exact root presentation revision, hidden commit barrier, existing enabled Save, loaded frame fonts and two actual frame RAF before geometry. If actual bundle is outside the canvas, scroll its actual DOM node into view and record the resulting projection before measuring; never mutate graph/model/selection to fake the state. Retain the manager-visible and removable Missing-reference assertions.

Readiness is a hypothesis pending diagnostic proof. If it does not explain the failure, STOP and report RCA classified at its actual layer; this decision grants no production behavior repair. A found domain/routing defect is owned by that dependent feature with its own scope and gates; it cannot become an invented P01 supplier dependency.

Then execute the exact old compatibility tests and fresh root check:all. Historical FAIL remains FAIL; a new targeted PASS alone does not close root. Human visual acceptance, full verify, cumulative P01 POST and archive still remain separate. STOP before P02.
