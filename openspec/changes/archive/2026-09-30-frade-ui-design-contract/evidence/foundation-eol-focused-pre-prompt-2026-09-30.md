# Focused independent PRE — FOUNDATION-EOL-01

Настройки review сохранены из предыдущего PRE: model gpt-6-astra, reasoning effort xhigh. Это выбранные настройки; укажи фактический backend/effort или NOT_CONFIRMED в отчёте. Не считай текст промпта доказательством запуска модели.

Работай READ-ONLY в C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade, branch codex/frade-ui-design-contract, HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09. Это UI workspace; E:/dev/codex/frade — другой checkout с независимым роутингом. Не меняй source, AGENTS, planning, production, outputs, Git config/index или старое evidence. При необходимости диагностик используй только проверенный OS-temp root с безопасным cleanup; не отправляй сообщения и не стартуй другие фичи.

Change: frade-ui-design-contract, schema spec-driven. Новый review относится только к user-accepted EOL scope delta. Старый foundation PRE-20260930T091121Z — PASS для прежнего scope; его report, FAIL-предшественник и история не изменялись. Текущий scope delta ещё НЕ имеет независимого PRE и NOT_IMPLEMENTED.

Сначала прочитай evidence/foundation-eol-focused-pre-manifest-2026-09-30.json относительно change. Проверь SHA256 каждого listed artifact, HEAD/branch и absenceConditions; несоответствия остановят review с FAIL. Manifest фиксирует актуальное planning и существующую foundation implementation, а не обещание её POST PASS.

Обязательные материалы:
- root/scoped AGENTS и openspec/config.yaml; package.json, packages/ui-workspace/package.json, .github/workflows/ci.yml;
- proposal.md, design.md, tasks.md, все три specs/*/spec.md, execution-context.json и bdd/traceability-plan.md;
- decisions/token-eol-acceptance-2026-09-30.md, docs/ui/decisions/token-eol-scope-proposal.md и token-eol.gitattributes.proposed;
- evidence/foundation-eol-planning-before-2026-09-30.json, foundation-eol-planning-acceptance-2026-09-30.json, foundation-eol-planning-coherence-2026-09-30.json, foundation-eol-reproduction-2026-09-30.json и foundation-eol-proposed-artifacts-2026-09-30.json;
- evidence/foundation-eol-planning-validation-2026-09-30.json, foundation-implementation-report-2026-09-30.md, foundation-final-status-2026-09-30.json и pre-repeat-received-PRE-20260930T091121Z.txt;
- docs/ui/decisions/provenance.json, existing traceability registry, scripts/ui/{tokens,colors,traceability,controls}.mjs и existing tests/ui-contract/*.test.mjs; canonical guide/schema/JSON, generated CSS/TS и frozen upstream CSS fixture.

Границы:
1. Единственный дополнительный root path — .gitattributes с восемью точными logical entries принятого draft (SHA256 7aebd327f1c5a08490abc5ded3a7198db42e5ac7b34b35a7ad2f5197a8dbd960). Никаких wildcard/девятого target, global Git config, изменений routing/domain/brand/input/vendor/старых baseline. Existing scripts/ui, tests/ui-contract и необходимые additive pnpm/CI изменения уже принадлежат foundation scope.
2. После твоего PRE PASS будут добавлены scripts/ui/checkout.mjs, tests/ui-contract/checkout.test.mjs, regression-first RED, production attributes и интеграция. Сейчас эти три production paths отсутствуют. Прочитай план и оцени его реализуемость; не требуй наличия будущей implementation как prerequisite для PRE и не выдавай её проверки за выполненные.
3. Guide v1.0, tokens1.0.0, CSS adoption revision1, palettes, роли и все102 contrast pairs не меняются. Единственный CSS source exception остаётся accepted automatic-Dark selector correction. Нормализация допустима лишь для parsing LF/CRLF строк .gitattributes; восемь защищённых файлов и token byte oracle сравниваются RAW, без нормализации.
4. Существующая foundation implementation frozen на время focused PRE. Проверяй current frozen production footprint по свежему manifest, восемь artifact hashes из pre-repair record, tracked hash anchors из прежнего scope report, сохранение evidence и отсутствие нового routing predecessor. Planning-before snapshot содержит прежние planning bytes, а не полный исторический production fingerprint. Старые 14/17 — исторический счётчик; новый 13/19 добавляет 3.6/3.7 и открывает4.3 для post-repair revalidation, не отменяя старый фактический PASS.

Проверь:
- Основание ENVIRONMENT: свежий OS-temp Git checkout при core.autocrlf=true дал физический CRLF drift и настоящий token CLI exit1. Четыре token rules дали exit0; ещё четыре accepted entries защищают byte-exact docs/schema. Все восемь исходных artifact hashes указаны. Отличай первую неудачную probe с уже существующими файлами от успешной fresh-checkout reproduction.
- Достаточность и точность восьми eol=lf правил на Windows и Git Linux при core.autocrlf=true. Учти, что .gitattributes сам может иметь CRLF и Git должен применять те же logical rules без девятого self-rule.
- Meaningful TDD: absent/missing/broadened configuration RED до production fix; no-attributes fresh checkout доказывает raw drift и exit1; approved config доказывает все8 original SHA256, ноль artifact CRLF и exit0/102 pairs. Existing CSS/TS drift и mutation negatives должны остаться строгими.
- Temp safety: verified absolute root, fixed copied paths, repository-local config, отсутствие операций с production Git index/config, identity checks до cleanup, cleanup errors сохраняются. Git unavailable или cleanup failure — FAIL/BLOCKED, а не skip.
- BDD plan и honest traceability: новые EOL сценарии пока только planning; после PRE их stable IDs/bindings должны привязаться к actual assertions, сохраняя current22 executed/future23. Не требуй ослабить checker или маскировать новые foundation cases как future.
- Coherence proposal/design/spec/tasks: новый root scope явно согласован, старый PASS не автоматически утверждает delta, задачи PRE→RED→implementation→target/full checks→verify→independent POST→archive. User acceptance не равна independent PASS.
- Existing CI checks сохранены; checkout check войдёт в ui:compliance и существующие Linux/Windows jobs. Полный post-repair pnpm check:all и exact CI commands обязательны; remote branch protection остаётся NOT_CONFIGURED/unverified. P01/migration/runtime недоступны для этого review.
- Input, old evidence и foundation production files не менялись planning repair. Допустимые planning edits перечислены в acceptance/before snapshot. Не переименовывай исторический FAIL в PASS и не требуй routing gate для независимого UI scope.

Можно выполнить openspec validate frade-ui-design-contract --strict и existing read-only token/literal/traceability checks; подтверждай их actual exits. Не переписывай outputs. Диагностика не должна удалять ранее сохранённые reports/screenshots. Не запускай full suites без необходимости: production не менялась; старые logs — сохранённая история, не новые результаты твоего review.

Выход review:
- уникальный review ID, UTC timestamp, actual model/effort или NOT_CONFIRMED, workspace/branch/HEAD и reviewed manifest SHA256;
- перечисление прочитанного и выполненных commands/results; отдельно BLOCKED/NOT_RUN, environment и correctness;
- blockers с точным requirement/path/reason; non-blocking observations отдельно;
- exactly one status line: GATE_STATUS: PASS либо GATE_STATUS: FAIL;
- READY_FOR_IMPLEMENTATION: YES только для точного EOL delta после PASS, иначе NO.
Не объявляй foundation POST PASS, READY_FOR_VERIFY или archive. Не исправляй найденное во время review. Верни report пользователю; executor не может сам себе выдать независимый PASS.
