# Frade UI compliance: publication repair

Source commit 024096c518ae9ebc34a5e96e165d9d0485b01f51; verification at 2026-10-28T23:04:32.274Z. Windows Default/input desktop, Node24.18.0, pnpm12.6.0, stock Electron44.4.5; actual binary hashes/role environment in both source-bound profiles. Current CPU load retained; no private acceptance desktop. No page-strip geometry/style change after the user's accepted visual decision. Existing24px accessibility exceptions and Frade focus remain accepted; original archive and screenshots remain immutable.

| Check | State | Actual evidence / limitation |
| --- | --- | --- |
| FDS-003/004/005/007/008/009 shared components/tokens/workbench | PASS | Original pnpm check in clean and working,239 visual tests each; actual native page/editor presentation contracts |
| A11Y-003/005/007 keyboard/focus/pointer targets | PASS | Original native/page-strip/focus/keyboard tests and visual interaction suites; no focus/tolerance/target weakening |
| Light/dark/high-contrast; compact/comfortable | PASS | Original full50 presentation case inventory per profile; responsive theme-density states, native/frame surfaces and managed dialogs |
| Resize/text zoom/forced colors/reduced motion | PASS | Original native responsiveness/forced-colors and239 visual cases per profile |
| Loading/error/dirty/empty/persistence/recovery | PASS | Source-bound original native diagram/presentation cases plus strict ownership/fault/compensation regression coverage |
| Atomic paint/persistence responsiveness | PASS | Real current clean112.6ms and working116.2ms p95; unchanged150ms,20warmups+100samples, fullpaint/fsync/readback assertions |
| Native initial editor readiness | PASS | Exactrevision/hidden-cover additional fixture assertions; controlled held-paint RED/GREEN; all original current native callbacks PASS |
| User visual acceptance | PASS (prior accepted decision retained) | Original page strip/dialog geometry accepted with explicit24px exceptions; no new styles introduced by repair |
| Manual assistive technology | NOT_RUN | No new manual AT evidence claimed |
| Other operating systems | NOT_RUN | Current actual runs Windows only |
| Backend model/effort attestation | NOT_CONFIRMED | Requested gpt-6-sol/high; shared policy and PRE21 separate request from provider attestation |
| Independent cumulative POST / publication | PENDING | Next phase; this report is not approval |

Commands: node scripts/ui/drawing-pages-publication-run.mjs batch clean; batch working; pin; gate clean; gate working; original pnpm check executed by both gates; strict OpenSpec validate. Exact raw reports/manifests/gate selections in profiles/clean and profiles/working. Final-current-binding-verification.json binds results and actual p95 paths. Original failed runs and diagnostic limitations are retained separately; missing evidence is never PASS.
