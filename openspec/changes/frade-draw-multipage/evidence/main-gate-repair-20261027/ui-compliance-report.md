# UI compliance — main repair checkpoint

Commit baseline f76a590a, pending owned checkpoint; final source711/hash140a19af... Windows10.0.26300/Node24.18/Electron44.4.5, i9-9880H16 logical/32GiB. Earlier supplier UI report and accepted AA exceptions retained; only requested native branding exception added.

| Check | Status | Actual evidence / limits |
| --- | --- | --- |
| FDS001–005/007/009–010 shared palette/components/workbench | PASS for affected UI | Original semantic source-derived light appearance, no new colors/icon family/resolver; full239 browser cases |
| Geometry/reference parity/menu/dialog | PASS with authorised exceptions | Current rendered-eol metric assertions and paired images; footer zero differing pixels, source screenshot one4-pixel glyph delta outside footer retained separately; no loosened tolerance/baseline |
| Light/dark/HC outer themes, compact/comfortable | PASS functional/presentation |47 source-bound presentation cases PASS; native editor remains source-derived Light; rendered theme/forced color/target cases retained |
| Keyboard/focus/pointer/coarse/text zoom/resize | PASS automated scope | Roving pages/menu/dialog/Move/escape/labels;320/480/1280 branding+commands case, coarse44/text200/forced colors original assertions retained |
| Native loading/error/dirty/empty/readonly/persistence | PASS automated scope | Draw237/workspace327/desktop12/browser239, actual saved2-page reopen and manual switch; author graph/style semantics unchanged |
| Removed native jgraph/drawio branding | PASS | No anchor/focus target; new browser negative RED/GREEN, final native accessibility/screenshot |
| Required hot-commit performance | FAIL | Actual final-source172.3/170.5/167ms>150; no thresholds/workloads changed. Other2 approved performance cases PASS; failed group cannot be a PASS |
| General UI closure/current binding | BLOCKED | Final source publication/root compliance wait on complete required performance evidence; prior manifest not current proof |
| Manual assistive technology / cross-OS | NOT_RUN | No NVDA/JAWS/cross-OS certification claimed |
| Plugin executable compatibility | NOT_APPLICABLE | No plugin contribution |
| Cumulative POST | BLOCKED / NOT_RUN | PRE02/PRE03 PASS; mandatory tests-before-POST rule |

Human request explicitly removes branding; previous appearance acceptance/AA deltas preserved. No automatic visual baseline approval. App left open in actual native editor, old blank dev session untouched. Overall UI engineering closure BLOCKED, READY_FOR_VERIFY:NO.
