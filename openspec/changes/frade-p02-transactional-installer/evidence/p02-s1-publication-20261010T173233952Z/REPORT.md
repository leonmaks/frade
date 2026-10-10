# P02 S1 current implementation report

2026-10-10T17:32:33.952Z; guide1.0; branch codex/frade-ui-design-contract; worktree C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade; common E:/dev/codex/frade/.git. Original program98f387f96b51b0ad139e3507c376ff1c3e8dec09/P02baseline0ecaf44938382bd8daa7d512887dda8a8ee9b372. Product checkpoint ada1179256258fdc8f9f82784f3a053e40ce04b2 published and actual remote SHA verified; publication metadata commit is supplementary, no gate advancement.

CHANGE: frade-p02-transactional-installer; overall3/9,2.2unchecked.
IMPLEMENTED: expectedIdentity/emptyOnly closed native guards, finite volatile filesystem factory with checked creation identity and bounded lifetime, Main-owned fixed root initialization/cleanup, actual confirmed-close repair. No enabled transactional installer, extension activation, renderer privileged bridge, journal or recovery coordinator yet.
FILES CHANGED:

- apps/desktop/package.json
- apps/desktop/src/main/index.ts
- packages/extension-service/native/windows-filesystem.cs
- packages/extension-service/scripts/build-windows-filesystem.mjs
- packages/extension-service/src/filesystem/types.ts
- packages/extension-service/src/filesystem/windows-protocol.ts
- packages/extension-service/src/filesystem/windows.ts
- packages/extension-service/src/index.ts
- packages/extension-service/tests/filesystem.protocol.test.ts
- pnpm-lock.yaml
- apps/desktop/src/main/extension-installer.ts
- apps/desktop/tests/e2e/ui-contract-extension.spec.ts
- apps/desktop/tests/unit/p02-extension-host.test.ts
- packages/extension-service/src/filesystem/factory.ts
- packages/extension-service/tests/filesystem.cleanup.test.ts
- packages/extension-service/tests/filesystem.factory.test.ts

TESTS ADDED: cleanup8/native factory16/closed protocol appended16/Main13/runtime3 canonical cases. Main actual production callback RED3FAIL10PASS→13PASS; original historical test source/assertions retained.
COMMANDS EXECUTED (current source-bound batch, source632 before/after unchanged):

- quit-fixed-desktop-typecheck: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop typecheck → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-desktop-typecheck-20261010T171346669Z/execution.json)
- quit-fixed-desktop-lint: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop lint → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-desktop-lint-20261010T171357251Z/execution.json)
- quit-fixed-desktop-unit: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop test → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-desktop-unit-20261010T171425358Z/execution.json)
- quit-fixed-desktop-build: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop build → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-desktop-build-20261010T171449010Z/execution.json)
- quit-fixed-runtime-coexistence: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop exec playwright test tests/e2e/ui-contract-extension.spec.ts tests/e2e/ui-contract-theme.spec.ts --grep P02 S1|P01 real staged filesystem obstruction|P01 real frame chord|P01 actual required frame refusal → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/execution.json)
- dev-isolated-cache-cold: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop exec playwright test --config C:/Users/NVISEN/AppData/Local/Temp/frade-p02-cold-dev-06Yjd7/playwright.config.ts --grep actual named dev → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-dev-isolated-cache-cold-20261010T170527349Z/execution.json)
- dev-isolated-cache-warm: E:/Program Files/nodejs/node.exe C:/Users/NVISEN/AppData/Local/node/corepack/v1/pnpm/12.6.0/bin/pnpm.mjs --filter @frade/desktop exec playwright test --config C:/Users/NVISEN/AppData/Local/Temp/frade-p02-cold-dev-06Yjd7/playwright.config.ts --grep actual named dev → PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-check-dev-isolated-cache-warm-20261010T170714835Z/execution.json)

TEST RESULTS: currentdesktopunit141PASS/canonicalruntime6PASS/typecheck/lint/buildPASS. Servicefull266PASS/BDD266PASS historical records retained; new source-bound rerun deferred until final scope settled. Cold27.8s/warm15.4s diagnostic PASS, HTTP last-response4423/1741ms are not readiness proof. Prior strict/boundaries/UIcompliancePASS at unchanged controls retained; complete root/P01/a11y/visual/cumulativeverify/POST/archive NOT_DONE.
KNOWN BLOCKERS: authentic independent POST FAIL openspec/changes/frade-p02-transactional-installer/evidence/p02-s1-post-received-20261010T165324969Z; Mainclose finding repaired, freshPOST NOT_RUN; genuine historical dev5s timeout causeNOT_PROVEN, not waived. Old execution records unchanged; new632source-bound records and exact original raw logs are now tracked. Query/buildNOT_VERIFIED/powerlossNOT_PROVEN. Applicable contracts: approved P02 filesystem/host ownership/durability/security and preserved presentation/domain behavior, AGENTS2/3/5/6/11/16/18/19/20/21 plus adopted strategy rule. No new UI rendering/colors/icons/theme/density controls; FDS/A11Y and visual migration acceptance unchanged. Routing independent, no routing controls modified. MergeprotectionLOCAL_ONLY/NOT_CONFIGURED.
READY_FOR_VERIFY: NO

## Actual runtime screenshots

Diagnostic captures only; not new approved UI baselines.

- [p02-dev.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-extension-P02--83026-backend-across-Main-rebuild/p02-dev.png)
- [p02-start.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-extension-P02--9e35c-med-start-hook-owns-backend/p02-start.png)
- [p02-main.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-extension-P02--ad85c-s-actual-helper-on-shutdown/p02-main.png)
- [current-frame-refusal.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-theme-P01-actu-76aac-ror-without-document-writes/current-frame-refusal.png)
- [real-staging-refusal.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-theme-P01-real-2c66f-es-before-retry-and-restart/real-staging-refusal.png)
- [restart-light-comfortable-os-dark.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-theme-P01-real-2c66f-es-before-retry-and-restart/restart-light-comfortable-os-dark.png)
- [dirty-ka-close-canceled.png](C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p02-transactional-installer/evidence/p02-check-quit-fixed-runtime-coexistence-20261010T171525011Z/playwright-raw/ui-contract-theme-P01-real-d41e9-ty-KA-and-durable-ownership/dirty-ka-close-canceled.png)

Next: exact proposed P02-DEV-PRESENTATION-TIMING-DIAGNOSTICS-01 acceptance, coherent plan/strict/automaticPRE gpt-6-sol/xhigh before diagnostics. ProposalSHAff75e18bad97b8c9e10da44c6404ec2a0e3539c34ef36a03b9c2a9b3355f283a; NOT_APPROVED. Full S2 remains open.
