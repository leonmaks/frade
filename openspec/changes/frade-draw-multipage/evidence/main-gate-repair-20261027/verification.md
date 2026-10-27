# Verification of main repair — draft pending final checks

Owner main, original f76a590ae1c32f3db5bd6594e1ef5fc962217fc2; cumulative feature origin e54cf0c1. Scope: unchanged11 LDE assertions restored by exact17-origin replay, full current main source/execution revalidation, requested native branding removal and permanent generated-inventory checkout boundary repair. PRE02/PRE03 receipts PASS and exact reviewed plans retained; PRE01 FAIL remains immutable.

This report uses the openspec-verify-change workflow. Current CLI status/apply/strict records will be captured after actual final general check. No correctness/closure PASS is inferred from pending commands. Final POST/checkpoint task necessarily remains pending at the pre-POST verification checkpoint; archive is not requested.

| Dimension | Current evidence |
| --- | --- |
| Completeness | Original23 implementation tasks retained; M1/M2/M3/E1 done. M4/E2 await final current proof/general check; M5 awaits independent POST/checkpoint |
| Correctness |19 requirements/25 scenarios mapped below; previous named case inventory retained, final current execution/general checks pending |
| Coherence | Same pure document/session/host boundaries and approved source-derived controls; exact bounded root-lock/EOL adoption; no routing/vendor/domain algorithm change |

Requirement/scenario mapping (all ADDED requirements remain applicable; no REMOVED/RENAMED requirements):

| Requirement and scenario coverage | Current implementation / actual relevant checks |
| --- | --- |
| Pure semantic facade/import boundary | diagramContent.ts @frade/draw/document, existing exact facade grant and private/deeper/escape/dependency negatives; unchanged source |
| Multipage compatibility/legacy round trips | drawing.ts codec and complete session/host; Draw237/runtime21/workspace327 and actual native desktop round trips |
| Legacy/transient boundaries/unchanged legacy and invalid inactive page | existing v1 API and atomic all-page parser, unchanged validation and malformed fixture assertions |
| Page operations/independent duplicate | pure page insertion/duplicate with explicit identity remapping; existing unit/session/browser cases retained |
| Rename/remove/cancel and sole removal | unchanged session transitions and native dialog; existing histories/sole-page/cancel cases retained |
| Navigation/order/reorder by Move | stable session graph, page-specific payload/viewport, existing drag and keyboard Move regressions |
| Page list/sort/clear | existing native menu and stable locale sorting; unchanged original tests; new branding scenario alternates inactive targets per reference submenu semantics |
| Standalone extraction/independent page popup | existing pageTransfer and v2 extraction, actual popup independence/cleanup/embed absence cases retained |
| Unified history/interleaving/navigation | existing committed graph/page history, documentRestore and native failure reporter; original chronological and error-feedback assertions retained |
| Pinned presentation/comparable default | same generated CSS/assets/geometry assertions; only requested trailing attribution anchor/CSS removed; rendered absence plus add/rename/overflow at1280/480/320 |
| Reference evidence/rendered comparison | unmodified pinned31.5.2, actual computed geometry/menu/Rename and screenshots from current browser role; no tolerance or baseline regeneration |
| Overflow/menus/inactive context | existing menu targeting/ordering, scroll/chevrons/label truncation; user-requested trailing icon/link exception documented in spec/design |
| Theme ownership/external themes+density | unchanged managed appearance ownership; full approved47 presentation+3 performance cases required on final source, source-derived Light under outer themes |
| Accessible lifecycle/keyboard editing | retained roving focus/arrows/Enter/Space/ShiftF10/menus/dialogs and Move alternative; removal eliminates external branding focus stop |
| Accessibility/readonly/navigation | existing readonly guard and overflow, coarse44/text200/320px/forced-system checks; no missing focus/target assertion removed |
| Host lifecycle/save+discard | full-document FradeDiagramView/load/flush/baseline and native desktop inactive pages/discard/readonly/restart/parking; unchanged implementation |
| Cumulative control adoption/exact origins | original14 origin/adopted rows unchanged, exact lock+ellipse+DiagramView snapshots3 added; source-only LF/raw forms validated before historical replay; root-lock scope+origin/manifest/sibling/mixed tamper regressions23 PASS |
| Fresh execution binding/current implementation, main preservation, no branding, Git checkout | current helper binds full source set including new exact nested attribute; all7 fresh roles/build required, original user5+849 raw bytes protected; actual branding browser+main UI; real Git true/false and strict unchanged generator PASS |
| Legacy coordinate adoption/color boundaries | original inventory124/context/reason and19-span adoption unchanged; required root color/negative controls retained |

Test integrity: light-diagram-editor.bdd.test.tsx and its11 assertions are byte-identical to the initial main baseline. No skip/only, assertion removal, geometry tolerance change, thrown-error suppression, vendor modification or new dependency. Existing role inventories were retained exactly;8 new origin cases and1 new rendered case were added to the original877, producing886 current role cases. Three new real-Git/closure tests extend the existing six Node-current tests (nine targeted PASS). Two original failed root runs and the resource-contention failed workspace record remain available.

RCA: current-page submenu in the new scenario was a test-sequence assumption; corrected to alternate inactive pages and strengthened menu-close assertion. Isolated same-source workspace327 passed with unchanged timeout after one concurrent import case reached5020ms; no product patch for that event. The later generator failure was exact raw CRLF checkout drift, repaired at the one-file Git boundary with real checkout regressions; no permissive generator comparison. All17 historic entries retain their original/adopted fields. No correctness findings remain inferred from those explained failures; final gate/POST still pending.

UI/user limits: default appearance and AA exceptions were previously accepted; branding removal is explicitly requested in the exact quoted human instruction. No new human screenshot acceptance, manual AT or cross-OS certification is claimed. Do not archive or advance another feature automatically. Final scorecard and actual command/receipt references will be recorded after required checks.

## Final actual checkpoint,27 October2026

Completeness:27/30 tasks complete,19 ADDED requirements/25 scenarios mapped. M4, E2, M5 remain CRITICAL incomplete process tasks; complete final performance/current publication/general check, then cumulative POST/checkpoint before archive. Correctness: page/host/origin/checkout interactions covered; performance requirement NOT satisfied, no cumulative correctness PASS. Coherence: approved minimal paths/17 historical origins retained, pure boundaries and test integrity preserved. No optional schema/design checks skipped; manual AT and cross-OS remain NOT_RUN limits.

Final actual targeted ordinary-Windows command: vitest run light-diagram-editor.bdd.test.tsx drawing-pages-origin.test.ts --reporter=json:34 PASS including all11 unchanged historical cases and23 origin cases. Node --test drawing-pages-current.test.mjs:9 PASS; exact drawio-editor-style --check exit0. Initial restricted sandbox repeats failed on forbidden symlink/temporary Git config operations; preserved as environment failures, then rerun unchanged in authorised ordinary Windows context.

Final current-source roles:237+21+327+239+12+47=883 PASS; performance2 PASS/1 FAIL. Original20 warmups/100 requests and150ms threshold unchanged. Final post-RCA confirmation p95167ms; earlier172.3/170.5 failures retained. Current source711/hash140a19af... unchanged through all checks and actual user5+849 preservation audits. Prior710-source complete886 PASS remains prior evidence only; final711-input proof not published. Root general rerun and cumulative POST NOT_RUN/BLOCKED by mandatory required-test prerequisite, no false gate PASS.

Live production app restored, saved native2-page .frade actual manual page switch and no branding icon/link confirmed; final-live-pages.jpg/accessibility/launch retained. UI compliance report main-gate-repair-20261027/ui-compliance-report.md records scopes/limits.

Assessment: three incomplete task issues and one unresolved performance-gate failure prevent closure/archive. READY_FOR_VERIFY: NO. Do not archive/advance.
