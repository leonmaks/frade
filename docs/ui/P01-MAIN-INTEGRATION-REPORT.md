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

# Accepted startup repair final result — 2026-10-14T19:34:08.736Z

CHANGE: frade-p01-main-integration; accepted P01-MAIN-RESTORED-FRAME-PAINT-01 + P01-MAIN-RESTORED-JOIN-CHURN-01.
IMPLEMENTED: real owninggroup bounds for never-visible retainedDraw.io, reversible inertparkedframepaintlease under existingcover, boundedone register-join reprepare on verifiedunrelatedmembershipchurn withunchangedACK/2000msguards. RootcausefixesUIpresentation/state-transition only; no routing/domain/provider/installer/vendor/dependency/tokenchange.
FILES CHANGED:
- packages/ui-workspace/src/DiagramView.tsx — SHA256 608cd00ad7ef284e9495e11406c595b26fd201236803fc0f856c01f3585578af
- packages/ui-workspace/src/Workbench.tsx — SHA256 82af3ce7fab3c63119d0c3165073c012f4656bd938fac9706e113fff0a163fb4
- packages/ui-workspace/src/design/theme/service.ts — SHA256 ec8b1e4b203abcd409bdfea089c83148f0d8d9e4048d63e5f493046d841896e7
- packages/ui-workspace/src/design/theme/parkedFrameSurface.ts — SHA256 2de8fb185ebd4b7679f1d3cb63eebd024a9cbeaf4df98b34d07a9585e8c651fb
- packages/ui-workspace/tests/ui-contract/parked-frame-surface.test.ts — SHA256 1a2eb1f13719c19e101663d198fb61259c0d2a74a5f47353a1c73ee5abd95167
- packages/ui-workspace/tests/ui-contract/restored-frame-membership.test.ts — SHA256 2fdece3c15002a0ff29c08dde217446dbe8d9ce678569b1a0e70e6bf401a341f
- apps/desktop/tests/e2e/p01-main-startup-restoration.spec.ts — SHA256 a91b4685c93a551466ad827bcbe8a7a3bc5983ec7a2781dcd876bd35b7418b1f

TESTS ADDED:15privategeometry/restoration cases,10deterministicjoin cases,32realbuilt/DEV Light/Dark/HC/System×compact/comfortable×activeDiagram/KA restoration cases. No oldtests/assertions/timeouts/thresholds weakened. OriginalmeaningfulRED and temporaryfixture/setup failures preserved.
COMMANDS EXECUTED:see openspec/changes/frade-p01-main-integration/evidence/startup-reviewed-repair-delivery-20261014T192716522Z/after-checks.json, checks/*/execution.json, runtime/execution.json; pnpmUI/desktopunit/type/lint/build, UIcomplianceincludingnegativecolor/drift/EOLcontrols, boundaries; actualPlaywright9cases and prep32matrix; automaticindependentPRE/POST via reviewedsharedread-onlyharness.
TEST RESULTS: Main8commandsPASS;246UI/128desktopunit;9/9MainruntimePASS, Mainp95124.1ms at60Hz; prep32/32matrixPASS, source7/190/foreign854PASS; combinedrepairPOSTGATE_STATUS:PASS. Guide1.0, applicableFDS003/004/006/008/009+A11Y001–003; actualkeyboard/focus/durable/XML/editoridentity/undo/preview/cancel/commit verified; fullnew145livecases/fullruntimea11ycertification/crossplatformCI NOT_RUN, branchprotectionUNVERIFIED_NOT_CONFIGURED, no newvisualbaselineapproval. 12actualMainPNGs: openspec/changes/frade-p01-main-integration/evidence/startup-reviewed-repair-delivery-20261014T192716522Z/SCREENSHOTS.md.
KNOWN BLOCKERS: separateactualMaincumulativePOST/archive snapshothelperabsence/indexreadonly defect remainsBLOCKED/unaccepted; prior30HzperformanceFAIL remainshistorical and30Hzbudgetcompliance notclaimed; fiveacceptedP01/consumerdeferrals remainopen, causeswherepreviouslyNOT_PROVENstillNOT_PROVEN. Globalcredentials/settings/userprofileexcluded/notmodified. Actualreviewbackend/effortNOT_CONFIRMED, exactrequestedgpt-6-sol/xhighmetadata/planhash verified. RoadmapPAUSED; remotepushNOT_RUN_NOT_AUTHORIZED.
READY_FOR_VERIFY: YES for deliveredstartuprepair(scopeverification+POSTcomplete+Mainchecked); NO for wholechangearchive/actualMaincumulativePOST pendingcontrolscope.
