# Main integration and visible native-editor verification

CHANGE: frade-draw-multipage, main integration, 27 October 2026.

IMPLEMENTED: main fast-forwarded from e54cf0c1e4e70ed833398c673ea3140b6f10469e to the independently reviewed feature checkpoint e823cf4496bd818d62ff5adcd3a67ca849ac3f7b. No new production or test/control modification in this integration. Existing five dirty tracked paths/deletion were preserved; pre-existing untracked files were not staged, discarded or imported into the feature worktree. Backup/patch and before/after records are under .worktrees/requests/main-draw-pages-integration-20261027. No push/archive.

FILES CHANGED: imported feature commit history; this integration's plan, raw command records, diagnostic evidence, delivery screenshot and branch status. User's unrelated edits remain unstaged. Historical feature dashboard copied to feature-branch-status-before-main.md. No historical origin, test assertion, manifest, bootstrap pin or visual baseline was repinned.

TESTS ADDED: none; reused existing complete desktop diagram/parking cases and performed a separate real visible application smoke check.

COMMANDS EXECUTED:

- git merge --ff-only codex/frade-draw-pages (verified exact base/target, no overlap with user changes).
- pnpm --filter @frade/desktop build, 07:56:19.472–07:56:53.991Z, exit0. Typecheck included. Ten actual output files and hashes recorded (do not confuse with supplier's nine-output record).
- pnpm exec playwright test tests/e2e/diagrams.spec.ts tests/e2e/drawing-pages-parking.spec.ts --workers=1 --reporter=json, desktop cwd. First restricted-user attempt failed before scenarios: Windows Electron launch exit2147483651. Preserved separately. Second ordinary-user run 07:58:36.592–08:00:20.905Z exit0: 12 expected, zero unexpected/skipped/flaky. No test change or retry-based PASS within that run.
- pnpm check, 08:00:33.026–08:02:30.410Z, exit1. Lint/typecheck completed; workspace direct319 PASS, historical LDE binding11 FAIL; subsequent && phases NOT_RUN. Raw stdout/stderr retained. Turbo's actual cache usage is in stdout; this is not a claim of a fresh execution of cached historical runtime tests.
- Existing Electron44.4.5 launched from main/apps/desktop with argument '.', ordinary Windows user, production URL frade://app/index.html, PID16664. Separate FRADE_USER_DATA profile under .worktrees/requests/main-draw-pages-integration-20261027/live-profile preserves the pre-existing blank dev-server session. Initial restricted-user launch produced no usable window; its log retained. No process forcibly terminated.

TEST RESULTS / UI COMPLIANCE:

| Applicable check | Result / actual evidence |
| --- | --- |
| Main merge and five dirty tracked paths | PASS, merge-preservation.json and final-preservation.json; exact byte hashes/deletion |
| Main desktop build/typecheck | PASS, build-2026-10-27T07-56-15-422Z/record.json and raw streams; main source set stable |
| Complete desktop diagrams/parking | PASS12, diagrams-2026-10-27T07-58-36-134Z; real multipage inactive content/save/discard/modal/readonly/restart cases included |
| Real visible native .frade footer | PASS, opened from repository _diagrams; application states identify Frade Draw and native page tabs, not iframe |
| Pointer add/rename/switch | PASS: inserted Страница-2 using footer plus; double-click rename to Архитектура; added New shape; switched to Страница-1 and saw Данные первой страницы |
| Save and close/reopen | PASS via existing editor Save button; v2 file contains both pages and distinct nodes; clean tab and Все изменения сохранены; closed editor and reopened from tree, then verified both pages' content. live-saved-document.json and delivery screenshot/accessibility |
| Page operations menu | PASS observed Duplicate, Move submenu, Remove, Rename; closed with Escape. No manual removal; automated suite covers readonly/persistence. This observation alone does not certify every menu command |
| Keyboard | Existing automated desktop keyboard/modal cases PASS. Manual injected Ctrl+S did not produce an observed save; button save proved persistence. No manual Ctrl+S PASS claim or inferred product root cause; input injection/focus/layout not isolated. No new keyboard implementation |
| Light/native accepted appearance | PASS smoke at1282x851, current delivery JPEG; same approved footer/accessibility exceptions. Prior human acceptance retained; no new exact full-raster comparison claim |
| Dark/HC/density/zoom/AT matrix | NOT_RUN in this integration; supplier's source-bound evidence remains separately retained. No new matrix PASS assigned to changed main inputs |
| Main combined general/current-source gate | FAIL / BLOCKED for closure, see below |
| New independent main PRE/POST and archive | NOT_RUN: unchanged imported feature retains supplier PRE/POST. New cumulative main POST cannot start with applicable check failure. No repaired production/control candidate, no gate/closure claimed |

KNOWN BLOCKERS: main pnpm check is not green. Read-only diagnostic identifies two historical LDE input mismatches: preserved pnpm-lock.yaml devDependency change and packages/draw/src/routing/perimeter/ellipse.ts mixed checkout line endings (132CRLF/133LF versus supplier133CRLF/133LF, canonical bytes identical). A third negative-publication test assumes DiagramView.tsx has a CRLF to replace; its current LF checkout makes the attempted mutation unchanged. These assertions were not weakened and files were not rewritten to hide the issue. See lde-input-diagnostic.json and ellipse-checkout-diagnostic.json.

Main source-set3f40dfaca287e6cbafffeeb04b75bef594dab6a6e98dceb18a535558252649ca has710 inputs versus supplier653. Canonical delta is exactly the two preserved dependency files plus57 pre-existing untracked routing source/test files; zero removed inputs, all other supplier semantic inputs identical. The current source-binding gate would also need explicit consumer-owned revalidation before a cumulative PASS. Its supplier manifest/pin stays unchanged. Source set stayed exact through build, successful desktop tests and general check. main-source-delta.json is diagnostic, not a replacement approval/baseline.

Environment: Windows, Node24.18.0, local Electron44.4.5. Build/test phase sources unchanged; no downloaded runtime. Screenshot live-frade-pages.jpg is the actual foreground production app after UI close/reopen; stored for delivery, not edited. Sample file remains at E:/dev/codex/frade/.worktrees/requests/main-draw-pages-integration-20261027/live-demo/KA/_diagrams/Проверка страниц.frade. App left open on Архитектура with both tabs visible. Old blank dev window left untouched after graceful close did not complete.

Requested main integration/build/launch/native panel smoke: COMPLETE. Combined engineering closure: BLOCKED; no next feature, archive or cumulative PASS. Next engineering action, separately from usable application: explicit bounded main consumer control compatibility/revalidation preserving the dirty/untracked work and immutable origins. Do not solve it by copying uncommitted routing files into the supplier or by broad exclusions/baseline movement.

READY_FOR_VERIFY: NO (full combined-main engineering gate); actual requested native UI operations above verified.
