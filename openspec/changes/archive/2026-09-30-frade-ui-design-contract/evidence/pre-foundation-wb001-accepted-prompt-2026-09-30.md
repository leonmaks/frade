# Независимый PRE — Frade UI Design Contract foundation

Модель: GPT-6 Astra (`gpt-6-astra`). Reasoning effort: `xhigh`.
Открой отдельный review-чат и выполни review сам. Не продолжай реализацию из чата исполнителя.
Выбор модели — рекомендация для этого review, не отдельное требование репозитория.

Рабочая директория — строго:
`C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade`

Ветка: `codex/frade-ui-design-contract`.
Ожидаемый исходный HEAD/base: `98f387f96b51b0ad139e3507c376ff1c3e8dec09`.
Active change: `frade-ui-design-contract`.
Фаза: независимый PRE foundation. P01–P07 и визуальная миграция рассматриваются только для проверки границ и согласованности roadmap.

Авторизация пользователя:

- Фича UI Contract независима от роутинга. Зависимости и интеграционные задачи принадлежат потребителю.
- Пользователь явно подтвердил: «Подтверждаю proposed full replacement text for WB-001. Подготовь промпт для независимого PRE и укажи модель».
- Полный replacement text принят; это не PRE PASS, не принятие новых screenshots и не разрешение массовой feature-миграции.

1. Установи контекст и review identity

- Перед любыми командами проверь cwd, git branch, HEAD и status, включая untracked файлы. Git HEAD не содержит незакоммиченные planning artifacts: обязательно сверяй SHA256 по текущему review manifest.
- Не используй смешанный checkout `E:/dev/codex/frade` как implementation/review baseline UI. Там сохраняется чужая незакоммиченная работа. Для проверки ссылок на routing handoff допустимо только чтение.
- Прочитай root AGENTS полностью, включая §18, и найди применимые nested AGENTS. Прочитай `docs/engineering/parallel-feature-workflow.md` и `openspec/config.yaml`.
- Если фактическая ветка/base/review hashes отличаются, опиши различия. Смена содержимого reviewed artifacts требует нового manifest/review, а не переноса старого PASS.

2. Прочитай исходники planning и evidence
   Все пути ниже относительно указанного workspace:

- `openspec/changes/frade-ui-design-contract/{proposal.md,design.md,tasks.md,roadmap.md,execution-context.json}` — прочитай каждый реальный файл, не используй Bash brace expansion в PowerShell.
- Все три `specs/*/spec.md` этого change.
- `decisions/visual-contract.md`, `decisions/wb001-acceptance-2026-09-30.md`, `decisions/AGENTS-UI.proposed.md`, `decisions/branch-protection.md`.
- `bdd/ui-contracts.feature`, `bdd/traceability-plan.md`.
- `evidence/wb001-pre-review-manifest-2026-09-30.json`, `evidence/wb001-preparation-checks-2026-09-30.json`.
- `evidence/audit.md`, `evidence/parallel-process-report-2026-09-30.md`, isolation/transfer/check logs и baseline screenshots, на которые они ссылаются.
- Реальный input directory имеет ведущий пробел: ` _input/frade-ui-style-guide-v1/`. Прочитай guide, QA checklist, AGENTS fragment, Themes-and-Plugins-Spec, tokens/schema/generator/checker и supplied feature; сохрани distinction между source-package checks и runtime implementation.
- Существующие manifests, CI, shared UI primitives/styles/brand/icon assets и утверждённые публичные Repo/Draw/desktop contracts в объёме, необходимом для scope review.
- Исходный WB-001 в `openspec/changes/frade-ka-workbench-pilot/specs/repository-workbench/spec.md` и `docs/ka-workbench/vscode-parity.md`.
- P01–P07 proposal/design/spec/tasks в объёме проверки последовательности, единственного runtime resolver и отсутствия скрытого внедрения зависимых этапов.

Старые evidence/pre-review.md, REPORT.md, pre-ui-independent-process-2026-09-30.md, process report и snapshots — исторические результаты на момент создания. Не редактируй их и не принимай старый NOT ACCEPTED за текущий статус после явного принятия. Прежний routing gate FAIL не является UI blocker. Текущий acceptance record и manifest фиксируют новую review-ревизию.

3. Проверь foundation scope и архитектуру

- Рассмотри paths в design.md как кандидаты: в отчёте перечисли точный разрешённый набор paths/операций для foundation и запрещённые границы.
- Foundation: канонические docs/checklist/specification с provenance; additive UI AGENTS; component contracts/inventory; JSON tokens и deterministic Node generator → CSS/TS registry; drift/contrast/color literals/BDD traceability checks; реальный pnpm/CI.
- P01 владеет единственным runtime registry/resolver/preview/settings/atomic adapters. Foundation не внедряет другой selector/service и не меняет массово feature UI. Light/Dark/HC/System и compact/comfortable принадлежат P01; Light и Dark появляются вместе.
- Проверь текущий package graph, native primitives и отсутствие циклов. Navigator/Inspector не должны приобретать обратную зависимость от ui-workspace. Полная новая UI-библиотека и выдуманный logo не входят в scope.
- Tokens состояния UI отделены от domain visualization/persisted semantics. Routing algorithm/endpoints/invariants, persistence, Repo Core gates, vendor/reference assets, routing controls и чужая работа исключены.
- Root AGENTS §18 действует: UI не ждёт R04, routing repair, routing PRE или frozen consumer adoption. Если найдено реальное потребление новой API/behavior, опиши directed dependency и её consumer-owned задачи. Не объявляй общую ancestry/файл/fingerprint product dependency.
- Проверь WB-001 accepted full text без изменения его содержания; неархивированный pilot ownership и explicit supersession record, порядок его потребления при sync/archive. Если механизм некорректен — сформулируй собственный UI blocker. Не правь pilot/main specs во время review.
- Принятие текста не одобряет новый visual baseline. Untouched surfaces сохраняют прежний контракт; WB-002–WB-007, Draw/domain behavior сохраняются.

4. Проверь BDD/TDD и enforcement plan

- RED перед реализацией: role closure, malformed/nonfinite input, contrast threshold boundaries, generator equivalence/CSS+TS drift; 102 named contrast pairs для Light/Dark/HC.
- Feature-level HEX/rgb/hsl/named/inline colors: запрещённый fixture падает; разрешённые theme/generated/domain/brand boundaries проходят; legacy exceptions точные occurrence/hash/reason/stage, без whole-file blanket exemptions.
- BDD traceability: стабильные scenario/example IDs и meaningful assertions; missing/unknown/duplicate mappings и недостающие assertions падают. Будущие AI/LoV/Draw сценарии не считаются выполненными и не скрываются через skip.
- Negative literal/drift/contrast и positive controls выполняются в изолированных проверенных temp roots; cleanup удаляет только fixture; evidence остаётся неизменяемым.
- CI интегрируется в существующие jobs/scripts без ослабления project checks. Remote required-check/branch protection status остаётся NOT_CONFIGURED/unverified до фактической проверки.
- Для foundation укажи обязательные commands/coverage; для P01 и migration — отдельные будущие a11y/keyboard/visual matrix/screenshots. Token contrast не доказывает WCAG всего приложения.
- Полная исполняемая VS Code API compatibility исключена. .frade-extension — будущая P02 fixture; исходный sample не переписывается под текущую app version. AI provider integration не заявлена.

5. Выполни необходимые PRE проверки

- Из правильного workspace исполни `openspec status --change frade-ui-design-contract --json` и `openspec validate frade-ui-design-contract --strict`.
- Проверь baseline/worktree/import isolation, сохранность approved/historical contracts и manifest SHA256. Изучи реальные baseline logs; дополнительные безопасные проверки запускай по выявленной необходимости.
- Не требуй реализованных foundation/P01 tests как уже выполненных: PRE оценивает готовность scope/spec/test plan до реализации. При этом недоступная обязательная PRE проверка или фактический applicable failure исключает PASS.
- Отдельно классифицируй ENVIRONMENT, SPEC_CONFLICT, correctness/architecture blockers и nonblocking замечания. Не объявляй широкое check:all выполненным на основании 83 baseline tests.

6. Ограничения и отчёт

- Никаких production/planning/task checkbox/input/vendor/baseline правок, package/lock updates, git stage/commit/reset/clean, archive, запусков apply или следующего этапа.
- Разрешено только чтение/безопасные проверки и создание НОВОГО review report + command/hash evidence в foundation evidence с уникальным timestamp. Не перезаписывай прежние отчёты или manifest. Если evidence directory недоступна, верни полный отчёт в чате и честно укажи ограничение.
- В отчёте: reviewer/model/effort, UTC time, workspace/branch/HEAD, список реально прочитанных artifacts с SHA256, reviewed scope, commands/exit results, FDS/A11Y coverage, WB-001 ownership, dependencies, findings с severity/file/line, required checks before POST и remaining blockers.
- Выдай ровно один итоговый GATE_STATUS: PASS либо GATE_STATUS: FAIL, затем READY_FOR_IMPLEMENTATION: YES либо NO и конкретный approved foundation scope.
- PASS возможен только без correctness/architecture/spec blockers и с выполненными обязательными PRE проверками. Требуемые NOT_RUN/BLOCKED не переименовываются в PASS.
- Заверши review. Не начинай implementation, P01, migration, verify или archive.
