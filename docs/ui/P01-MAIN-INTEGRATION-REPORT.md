# P01 в основном Frade: фактический результат

Обновлено 2026-10-14T05:31:11.060Z. Ветка main / E:/dev/codex/frade. Change frade-p01-main-integration.

**Приложение интегрировано и собрано локально. Формальное закрытие: BLOCKED на подготовке дополнительного main POST.**

- Внедрены готовые P01 Light/Dark/System/High Contrast, compact/comfortable, preview/apply/cancel и persistent settings. Main→preload→renderer/participants — существующая реализация завершённого supplierP01, без P02.
- Source191product/test/token paths сохраняют supplierbytes; точные2publicprocessdocs сохраняют mainrules/префикс. Всего193finalmanifestv4outputs проверены. Mainprocesscommit 9f6922e3f75a79e537d6bee2a511d9ee81c24c1e, ordinarymerge 748d18c179628b4eb02618624b3b2112befac98b; остальные854чужих пути сохранены.
- PRE2, accepted-scope focusedPRE и cumulative implementationPOST: PASS, полные immutable receipts. Reviewer requestgpt-6-sol/xhigh; actualbackend/effortNOT_CONFIRMED.
-9actualmaincommands PASS: offlinefrozeninstall, UI/desktoplint/typecheck/units, desktopbuild, UIcompliance. UI221/desktop128units, tokens102pairs,124exactlegacyexceptions,28foundationbindings/23futureNOT_EXECUTED. Lockfile неизменён.
- Actualmain39/39originalruntimecases PASS за2.4min;67PNG. Проверены4режима, обеdensity, Systemmedia, startup/restart, preview/apply/cancel, dirtyKA/parkedframe, authoredJSON/XML, editoridentity/selection/undo,20cascadecases иperformance. Mainp95 **120.9ms<=150**,20warmups/100samples. Source193/foreign854afterchecksPASS.
- SourcecandidateDraw215PASS и135distinctdesktopcases имеют currentPASSobservations;137attempts включают2rawFAIL. Старые full74/1/60 и continuation58/1/1не переименованы.

Guide1.0; FDS003/004/005/006/007/008/009/010/014/015 и A11Y001-009 только для фактически затронутых P01surfaces. Не заявлены полная visualmigration, общий accessibilitycertificate, installer/VSCodeexecutableextensions/AIproviderintegration. P02-P07 и широкая миграция PAUSED. Brandassets сохранены.

## Открытые ограничения

Три прежних P01дефекта плюс точныеconsumerD01capturetimeout/D02Workbenchdiagnostic/secondaryreporter остаются OPEN_ACCEPTED_DEFERRED. Их причины и long-workerstability NOT_PROVEN; новые/recurrentFAILstops. Старыйvisualset372PNG:302rawexact,52frameownedrectsexact,18metadata temporaryIDs; whole-image differences preserved, no masking/regeneration.

RequiredactualmainPOST сейчас **BLOCKED/PREPARE_BLOCKED**, модель не запускалась: snapshot helper realpathчитает намеренно удалённый tracked-документ. IsolatedRED также выявил изменение rawindexstatcache через gitstatus. Чужой документ не восстановлен, guards не ослаблены, sharedrelease не изменён. Exactrepairproposal: openspec/changes/frade-p01-main-integration/decisions/p01-main-snapshot-absence-readonly-01/proposal.md, SHAfd7b6a2938d11854440b20e41a15c70ecd90a14ae939cafa53d677929b302b59, PENDING_HUMAN_DECISION. Rawfailure: openspec/changes/frade-p01-main-integration/evidence/main-post-preparation-blocked-20261014T052230617Z.

GitHubCIexecution/crossplatform NOT_RUN; branchprotection UNVERIFIED/NOT_CONFIGURED, ownerinstructions в docs/ui/decisions/branch-protection.md. Новаяintegration/mainrefpublication NOT_AUTHORIZED/NOT_RUN. ArchiveNOT_RUN. Готово12/14tasks;4.2integrationreview и4.3finalarchiveclosure остаются открытыми.

## Evidence / использование

[Main screenshots](../../openspec/changes/frade-p01-main-integration/evidence/main-integration-verification-20261014T050817061Z/CURRENT-MAIN-SCREENSHOTS.md)
[Actualmain verification](../../openspec/changes/frade-p01-main-integration/evidence/main-integration-verification-20261014T050817061Z/REPORT.md)
[Main runtime](../../openspec/changes/frade-p01-main-integration/evidence/main-runtime-smoke-20261014T045921148Z/execution.json)
[Snapshot repair proposal](../../openspec/changes/frade-p01-main-integration/decisions/p01-main-snapshot-absence-readonly-01/proposal.md)

Приложение запускается штатно из E:/dev/codex/frade командой 'pnpm start:desktop'. Переключатель тем доступен через существующий theme-picker chord Ctrl+K,Ctrl+T и Presentation Settings. Это использует собранный main, не временный UI-worktree.

CHANGE:frade-p01-main-integration
IMPLEMENTED:готовыйP01вmain,безP02
FILES_CHANGED:193manifestoutputs+ownprocess/evidence/status;foreign854preserved
TESTS_ADDED:нетновыхUIassertions; исходныеtestsadoptedunchanged; snapshotRED вtempfixture,removed
COMMANDS_EXECUTED:root/currentcandidatechecks;9maincommands;original39mainruntime;OpenSpecstrict;automaticPRE/cumulativePOST;actualmainPOSTprepareBLOCKED
TEST_RESULTS:UI/mainfunctionalchecksPASS;actualmainPOSTBLOCKED;archive/publicationNOT_RUN
KNOWN_BLOCKERS:нуженexactsharedsnapshotcontrolscope для formalclosure
READY_FOR_VERIFY:NO — mainintegrationreview/archiveblocked, functionalmainalreadyverified

## New startup defect — 2026-10-14

The human reports the recovery curtain at DEV startup. Current status is OPEN, READY_FOR_VERIFY: NO; prior39casePASS remains scoped historical evidence. Two-pinned-frame restart reproduces exact reported message on built Main; direct-Vite DEV also fails required inactive-frame revision with a membership recovery message. Empty isolated DEV profile passes. Actual user profile/tabs UNKNOWN. Source193/foreign854 preserved. Diagnostic/setup failures and CLI default-profile caveat recorded in [RCA](../../openspec/changes/frade-p01-main-integration/evidence/startup-inactive-frame-20261014-02/RCA.md). Repair proposal openspec/changes/frade-p01-main-integration/decisions/p01-main-restored-frame-paint-01/proposal.md, SHA256 77e86453e7a106558e9615ebc2033d603df350db3646a936d57d03fc11042705, NOT_ACCEPTED/NOT_IMPLEMENTED. Fresh PRE/POST required before a repaired product claim.
