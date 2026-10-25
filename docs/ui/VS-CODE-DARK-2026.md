# VS Code Dark 2026 — реализация и compliance

CHANGE: frade-vscode-dark-2026, branch codex/vscode-dark-2026, baseline90710ac; Guide1.0. Состояние на 2026-10-25T19:27:31.084Z: независимый технический POST PASS; Main delivery/визуальное принятие/архивирование ещё не завершены.

IMPLEMENTED: полная закреплённая theme closure2026-dark → dark_modern → dark_plus → dark_vs и MIT notice; label VS Code Dark 2026, ID frade.reference/vscode-dark-2026. Отдельная application registry сохраняет core3 и injected-picker4; Main/controller используют одинаковый resolver. ID-derived цвета/геометрия применяются транзакционно с preview/cancel/commit/restart/rollback, снимаются для других ID/forced colors. Density независима. Нет P02/importer или обещания executable VS Code extensions.

Источник: [Microsoft pinned theme](https://github.com/microsoft/vscode/blob/36e19389b8a2e64498d0d4d860c346424bf90a3a/extensions/theme-defaults/themes/2026-dark.json), commit36e19389b8a2e64498d0d4d860c346424bf90a3a. Raw2026-dark SHA256 d102252dee12fb56400fa4c4c573435d866a234ec7678fbc525483a5c1b05acf. Все4JSONC+LICENSE сохранены побайтово.325effective color keys:47mapped/composed,278retained;118syntax/4semantic rules сохранены без заявления об их отображении.31semantic roles,39component slots,34contrast pairs;3foreground A11Y adaptations сохраняют source backgrounds. Точные mapping/hashes/deviations — planning manifest и reference-coverage-20261025.json.

FILES CHANGED: packages/ui-workspace/src/design/reference/vscode-dark-2026/**; theme/{registry.ts,index.ts,rootParticipant.ts,theme-consumers.css}; apps/desktop/src/main/presentation-settings.ts; scripts/ui/{vscode-dark-2026.mjs,colors.mjs}; package.json; новые UI/Node/Electron tests; шесть точных legacy-selector02 drafts, включая два новых origin controls; docs/report/status и текущий OpenSpec change. Dependencies/lockfile, vendor, routing/domain, brand assets, service/ACK/deadlines и persisted schema не изменены.

TESTS ADDED:8reference UI cases плюс6origin positive/negative/AST controls;7Node source/drift/negative/checkout tests;8Electron reference cases. Meaningful RED до production и отдельный SOURCE_HASH RED перед accepted origin repair сохранены. Synthetic fixture9objects; исходный138object benchmark проверен отдельно оригинальными тестами, не объявлен эквивалентным synthetic fixture.

|COMMANDS EXECUTED / check|TEST RESULTS / evidence|
|---|---|
|openspec validate frade-vscode-dark-2026 --strict|PASS; final-small-checks-20261025|
|Automatic independent PRE3, focused exact02 PRE2|PASS, полные receipts; старые FAIL сохранены|
|pnpm --filter @frade/ui-workspace test|260/260PASS; coverage-static-20261025|
|pnpm --filter @frade/desktop test|128/128PASS; desktop-unit-bound-20261025,225inputs before=after|
|pnpm --filter @frade/ui-workspace test:bdd|132/132PASS; selector-green-20261025T180649487Z|
|Affected UI/desktop typecheck/lint/build|PASS; check-uiStatic-20261025T182253634Z, check-desktopStatic-20261025T182305989Z, final-small-checks-20261025; desktop build token-corrected-runtime-20261025|
|pnpm ui:compliance; pnpm check:boundaries; general contract tests|PASS; source7/7, check-compliance-20261025T182527100Z, final-small-checks-20261025|
|New reference discovery / actual Electron|6/6PASS token-corrected-runtime-20261025 plus2/2PASS ref-extra2-20261025|
|Original current-source FUI12/startup/persistence/native/frame/parked/p95/B05|21/21PASS,0skip,0flaky; legacy-live-replay-20261025T180820299Z|
|p95,100samples after20warmups,60Hz|Reference86.3ms; original116.7ms;150ms budget PASS|
|OpenSpec technical requirement verification|8/8 mapped; technical-verify-20261025; later-phase completeness explicitly pending|
|Automatic cumulative technical POST gpt-6-sol/xhigh|PASS; cumulative-post4-received-20261025, result SHA256 313490e4afd0c61f838013b43f71ee4a37f51d20b13932a79ba682d6668ede54; actual backend NOT_CONFIRMED|
|Human visual / Main delivery / archive / new-ref push|NOT_APPROVED / NOT_RUN / NOT_READY / NOT_AUTHORIZED|

Принятый exact02 repair изменяет только7ambiguous option selectors и строгие historical-source controls. Исторические отчёты/receipts/hashes не переписаны: перед их чтением accepted current source проверяется и точно обращается к исходному hash. Свежие21Electron tests отдельно доказывают текущую реализацию. Assertions/timeouts/tolerances сохранены; zero-selected и старые FAIL не засчитаны как PASS.

Applicable rules: FDS001–010/014/015/017/018; A11Y001–010 по применимости. Workbench/brand/context сохранены, общий resolver/tokens без новой библиотеки/icon family. Реальные keyboard/focus/Escape/rollback, title/sidebar/status/picker contrast,28/36density, coarse44, forced colors/reduced motion,200%text/narrow resize, dirty native+frame/history/selection/identity/files и существующие repository form/error проверены. Это выбранные поверхности и состояния; полный AA/LoV/unimplemented views не заявляются. Все modes/both densities покрыты переходами, оригинальные semantics остаются неизменными.

Геометрия: source titlebar35/activity48/radius4/padding4×8, где есть counterpart; canonical28/36/coarse44/status≥24 имеют приоритет A11Y. Точный upstream default tab-height NOT_CONFIRMED: прежние35px сохранены. Frade logo/icons/layout и Draw vendor chrome сохранены. Белый authored diagram canvas/объектные цвета остаются domain data. Полное pixel-perfect соответствие всего приложения не заявляется.

Visual candidate:19actual PNG, [галерея](../../openspec/changes/frade-vscode-dark-2026/evidence/final-visual-gallery-20261025/INDEX.md), manifest1f2aa40b9b15a8f213f9f1e20e4b543ea252147e4b2b39cb5c33e40eb496e2b5; human acceptance NOT_APPROVED. Старые screenshots/FAIL и полный отчёт до текущей корректировки сохранены отдельными immutable evidence.

Окружение: Windows/Node24.18.0/pnpm12.6.0/Electron44.4.5;2560×1440@60Hz; viewport1280×850/narrow850×650; i9-9880H/Intel UHD630+GTX1650. Electron dist используется process-locally из Main; global config не менялся. Checkout autocrlf породил vendor/historical-byte failures; восстановлены только точные Git/origin bytes, без новых ожидаемых hashes. Git-onlyM1716 proof исторический. Сырые external-business-fixture media исключены из review/commit; synthetic screenshots включены.

KNOWN BLOCKERS: обязательное визуальное принятие и Main consumer delivery/checks/archive ещё впереди. Прежний POST FAIL из-за недостающего desktop execution закрыт128/128source-bound evidence; прежний rawPASS с4network errors остался BLOCKED. Строгие review guards не ослаблены. Merge protection/CI run не заявляются. READY_FOR_VERIFY: NO (весь change ещё не завершён); supplier technical verify выполнен; READY_FOR_ARCHIVE: NO.
