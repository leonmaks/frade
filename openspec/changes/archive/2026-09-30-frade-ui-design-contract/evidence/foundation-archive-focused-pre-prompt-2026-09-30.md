# Независимый focused PRE — FOUNDATION-ARCHIVE-01

Настройки для новой независимой review-сессии: gpt-6-astra, reasoning effort xhigh. Не выдавай выбранные настройки за подтверждённый backend: укажи фактическую модель/effort лишь при наличии runtime evidence, иначе NOT_CONFIRMED. Executor не может сам выдать независимый PASS.

Работа только read-only. Не меняй production, planning, tests, Git config/index, fingerprints, старое evidence или screenshots; не запускай apply/archive/P01 и не делегируй implementation. Верни отчёт в чат; не записывай его в проверяемый worktree. Если требуется scratch для диагностики, сначала проверь OS-temp containment/identity, действуй только внутри этого root и сохрани фактические cleanup failures. Не создавай новые production files.

Workspace: C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade
Branch: codex/frade-ui-design-contract
HEAD: 98f387f96b51b0ad139e3507c376ff1c3e8dec09
Change/schema: frade-ui-design-contract / spec-driven
Не использовать E:/dev/codex/frade для review или writes: там независимый routing checkout.

Manifest: openspec/changes/frade-ui-design-contract/evidence/foundation-archive-focused-pre-manifest-2026-09-30.json
Он исключает только себя. Ожидаемый SHA256 указан в сообщении передачи. До review проверь его SHA256, все raw hashes/sizes, точный tracked + nonignored-untracked inventory (manifest добавлен отдельно), branch/HEAD/status и absenceConditions. Повтори проверку в конце. Не превращай несоответствие в allowlist или новое baseline.

## Предмет review

Пользователь напрямую подтвердил точный planning repair FOUNDATION-ARCHIVE-01. Scope source docs/ui/decisions/bdd-archive-scope-proposal.md остаётся неизменным историческим документом со старым PROPOSED_NOT_ACCEPTED статусом. Более поздний decisions/bdd-archive-acceptance-2026-09-30.md фиксирует прямое «Подтверждаю», raw hash и принятие. Frozen docs/ui/adoption.md и предыдущий report также сохраняют pre-acceptance текст; этот новый acceptance/context задаёт текущее решение.

Фактическая reproduction: прежний actual traceability CLI в OS-temp fixture даёт exit 0 при active change, затем exit 1/ENOENT после переноса только fixture change в archive. Production не перемещался; cleanup прошёл. Это известный defect, который новый план должен устранить; PRE оценивает scope/feasibility/regression strategy, не требует выдать старый дефект за исправленный.

Новый runtime contract path docs/ui/bdd/ui-contracts.feature; stable owner instructions docs/ui/decisions/branch-protection.md. Они пока отсутствуют. Actual production readers всё ещё используют active OpenSpec path. tests/ui-contract/archive.test.mjs отсутствует. Registry/active feature остаются 25 foundation bindings / 23 explicit future, без новых lifecycle assertions. Production repair НЕ РЕАЛИЗОВАН.

## Прочитать

1. Root AGENTS.md и применимые scoped AGENTS, manifests, openspec/config.yaml, текущий CI; scope/routing ownership по §18. Routing-specific nested AGENTS вне этого delta; root общие checks остаются применимы.
2. Все existing OpenSpec artifacts из status: proposal.md, design.md, tasks.md, все три specs/*/spec.md; execution-context.json и bdd/traceability-plan.md. Сверить их с accepted scope source/acceptance.
3. foundation-archive-planning-before-2026-09-30.json, foundation-archive-planning-acceptance-2026-09-30.json, foundation-archive-planning-validation-2026-09-30.json, validation/commands/apply-context и planning summary.
4. foundation-archive-path-reproduction-2026-09-30.json; foundation-eol-final-manifest-2026-09-30.json (SHA256 9181bc5c29671d22c79230e7a7fbb602752097d4fbff9dd7b376dc9f3e3810a7), EOL implementation/verification/final-status reports и предыдущие focused PRE/acceptance/evidence.
5. scripts/ui/{traceability,controls,checkout,tokens,colors}.mjs; существующие tests/ui-contract/*.test.mjs; current adapted BDD/registry, standalone 20-state cascade test, adoption/provenance and existing owner instructions.

## Проверить

- Сравнить before base64/raw SHA и actual planning diffs. Ровно шесть существующих planning-файлов обновлены; previous manifest 4913 entries, 4907 unchanged. Старое evidence, все production/assertion files, registry/active feature, package/CI/lockfile и raw eight artifacts неизменны. Проверить acceptance hash/text/scenarios: новый spec requirement скопирован из принятого source, только WHEN/THEN Markdown emphasis соответствует проектному формату. Остальные требования не ослаблены.
- Счётчик 17/19 → 16/21 объяснён: новые 3.8/3.9, повторное открытие 4.3; старые EOL PASS/FAIL сохранены. 3.8 ещё не done, так как focused archive PRE NOT_RUN. Никакого self-issued POST PASS или archive/P01.
- Closed implementation paths после PASS: docs/ui/bdd/ui-contracts.feature; scripts/ui/traceability.mjs; scripts/ui/controls.mjs; tests/ui-contract/archive.test.mjs; docs/ui/decisions/ui-contract-traceability.json; openspec/changes/frade-ui-design-contract/bdd/ui-contracts.feature; docs/ui/decisions/branch-protection.md; docs/ui/adoption.md. Остальные edits только существующие planning/evidence roots. Нет новой root path/CI/dependency/routing правки, девятого attribute rule или второй CSS/token exception.
- Sole canonical path независим от OpenSpec lifecycle; активный SDD artifact остаётся согласованным с каноническим контентом, original input/evidence не меняются. Нет directory search/fallback, который скрывает missing/malformed canonical BDD за исторической копией.
- Тестировать actual CLI И controls после archived fixture и при полном отсутствии active/archive artifacts. Fixture-base injection в controls должна сохранять trusted tool resolution/default production root, read-only fixture input и все семь прежних exit expectations. Missing/malformed canonical negatives при наличии valid historical copy должны также выявлять случайное чтение из настоящего production root. Не считать source-string assertion заменой actual CLI/control execution.
- Meaningful node:test RED до reader changes, all existing 48 cases/bindings/assertion hashes retained. FUI-029/030/031 пока только в planning text; нельзя добавить их в executed registry до actual assertions или спрятать как future. Missing и malformed требуют обеих реальных проверок. Existing matrix example closure/strict source hash/skip rules не ослабляются.
- Verified OS-temp roots, absolute subtree containment перед fixture move/removal, bigint dev/ino identity, no real archive as a test; tool/execution/cleanup errors не подавляются. Перенос owner instructions с provenance, durable links, no remote protection claim.
- Post-repair targeted/negative/full checks, existing EOL check and 20-state browser cascade, pnpm check:all с fresh owned Draw server, verify → independent POST → real project archive → actual post-archive ui:compliance/link checks → STOP. Сверить что project archive behavior/incomplete task handling не требует ложного completion checkbox. Нет скрытого routing predecessor.

Разрешённые текущие read-only checks: openspec validate frade-ui-design-contract --strict; node scripts/ui/tokens.mjs; node scripts/ui/colors.mjs; node scripts/ui/traceability.mjs; git --no-optional-locks diff --check; git diff --exit-code -- pnpm-lock.yaml; status/diff/cached inspection; inline raw hash/manifest/requirement equivalence checks. Они проверяют текущий frozen runtime, а не новый lifecycle GREEN. Новые RED/GREEN/full/post-archive tests — будущая implementation после PRE, поэтому NOT_RUN в этом review. Remote Actions/Linux/protection — честно unobserved/NOT_RUN/NOT_CONFIGURED by this task; не придумывай результаты.

## Вернуть

Review ID/UTC, reviewer identity, selected vs attested model/effort, workspace/branch/HEAD, fresh manifest SHA256 и matched count, actually executed commands/exits, applicability, environment errors отдельно, blockers с точными ссылками/lines, evidence preservation, NOT_RUN и nonblocking observations. Закончить ровно одним GATE_STATUS: PASS либо GATE_STATUS: FAIL и READY_FOR_IMPLEMENTATION: YES либо NO. PASS разрешает только accepted archive lifecycle delta, не подтверждает его ещё несуществующую implementation, существующую foundation POST, удалённую защиту или P01. Не переписывай старые FAIL/PASS.
