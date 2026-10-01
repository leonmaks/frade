# Независимый foundation POST — Frade UI Design Contract

Рекомендуемые настройки нового независимого reviewer-чата: gpt-6-astra, reasoning xhigh. Выбранные настройки не являются attestation фактического backend/effort. Если они не доступны для подтверждения, запиши actualBackend/actualEffort NOT_CONFIRMED.

Ты независимый архитектурный reviewer. Выполни read-only POST финального foundation candidate frade-ui-design-contract после принятого FOUNDATION-ARCHIVE-01 repair. Это cumulative foundation POST, а не только focused review восьми файлов. Исполнитель не выдавал собственный independent PASS.

Workspace: C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade
Branch: codex/frade-ui-design-contract
HEAD/base: 98f387f96b51b0ad139e3507c376ff1c3e8dec09
Guide 1.0; tokens 1.0.0; CSS adoption revision 1.
Final exact candidate manifest: openspec/changes/frade-ui-design-contract/evidence/foundation-post-manifest-2026-09-30.json (self excluded).

Не изменяй production, tests, specs, tasks, dependencies, baselines или historical evidence. Не делай commit/stage/archive, не начинай P01 и не пиши в E:/dev/codex/frade. Ответ reviewer сохрани в ответе нового чата; не добавляй файлы в проверяемый workspace. Если потребуется repair, выдай FAIL и конкретный scope; ремонт выполняется отдельной фазой. Read-only исходные проверки и реальные тесты в проверенных OS-temp fixtures допустимы; запрещено архивировать реальный change ради теста.

## Сначала authority и точный snapshot

1. Прочитай применимые AGENTS, конфигурацию OpenSpec, manifests/CI и реальный status/apply context через openspec status --change frade-ui-design-contract --json и openspec instructions apply --change frade-ui-design-contract --json. Используй concrete artifact paths. Прочитай proposal/design/tasks, все три delta specs, execution-context, принятые решения и полученные independent reviews. OpenSpec isComplete означает наличие planning artifacts, не выполненный POST/archive.
2. Проверяй raw SHA256 и размер КАЖДОГО artifact final manifest до и после review. Сверь exact tracked + non-ignored untracked inventory с manifest + единственным self-excluded manifest, HEAD/branch/status и пустой cached diff. Не используй устаревший manifest как текущий. Любой неожиданный drift — blocker. Исходный пакет с ведущим пробелом " _input/" неизменяемый.
3. Прочитай cumulative git diff и новые untracked implementation/docs/tests/evidence. Корневая .gitattributes — ровно восемь принятых logical rules; ninth/wildcard/global config недопустимы. Сверь raw восемь anchors, upstream CSS fixture и generator. Все feature/domain/routing/vendor/brand sources и прежние assertions/evidence должны остаться неизменными.
4. Authority цепочка: PRE-20260930T091121Z foundation repeat PASS; PRE-EOL-20260930T120821Z exact EOL PASS; PRE-ARCHIVE-20260930T134029Z focused archive PASS. Полученные reports, acceptance records и manifests неизменяемы. Старые FAIL не стали PASS задним числом. Archive PRE verified 4923/4923 raw artifacts; финальный implementation snapshot сохранил 4914/4923 и изменил только девять разрешённых implementation/planning файлов из того inventory плюс новые разрешённые файлы/evidence. Final manifest отражает финальный review status.

## Проверяемая окончательная реализация

Прочитай evidence/foundation-archive-implementation-report-2026-09-30.md, foundation-archive-verification-2026-09-30.md, foundation-archive-provenance-2026-09-30.json и foundation-archive-final-integrity-2026-09-30.json в этом change. Последний integrity snapshot снят до финального authored review-status metadata; current exact candidate задаёт final manifest. Не объявляй старые audit/proposal reports текущим статусом.

Проверь все 12 ADDED требований трёх spec deltas по implementations и применимому scope:

- Guide/checklist/themes specification канонически приняты с provenance; root AGENTS §19 добавлен без удаления старых правил. Независимое владение §18 и consumer-side dependencies не превращают R04 в UI predecessor. FDS/A11Y inventory и component/workshop контракты основаны на найденном коде, без выдуманного logo/library/provider.
- Полный WB-001 replacement явно принят, supersession ownership записан. Не изменён/не архивирован pilot и не выдуман main MODIFIED spec. Token PASS не утверждает миграцию или новый screenshot baseline. Domain/Draw/Repo behavior и historical parity сохранены.
- Node token pipeline детерминирован; одна разрешённая source-byte CSS замена :root:not([data-frade-theme]) → :root:where(:not([data-frade-theme])), никаких вторых отклонений. Все 31 роли Light/Dark/HC и 102 named contrast pairs, drift/malformed negatives. Browser подтверждает media + root/child across 20 states. Не считать это whole-app WCAG.
- Feature literals: 124 exact occurrence exceptions, никакого whole-file allowlist. Изолированные новые literal/drift/contrast негативы fail и positives pass. Существующие CI jobs/checks сохранены; ui-compliance и Windows checkout/cascade подключены. Package/CI/deps frozen относительно focused archive PRE.
- EOL: eight raw artifacts и oracle неизменны; actual owned-temp Git core.autocrlf=true checkout показывает физический CRLF/exit1 без attrs и raw-preserving exit0/102 с exact attrs; unavailable/cleanup errors fail. Никакого глобального Git config или нормализации проверяемых bytes.
- Archive lifecycle: docs/ui/bdd/ui-contracts.feature — ЕДИНСТВЕННЫЙ runtime path. scripts/ui/traceability.mjs и controls.mjs не ищут active/archive copies и не fallback. runControls resource base должен быть переданный fixture, а исполняемые scripts должны разрешаться из trusted actual repo, включая poison fixture scripts. Missing/malformed canonical при валидной исторической копии обязаны FAIL; production leakage запрещён.
- Фактические lifecycle tests: tests/ui-contract/archive.test.mjs. Архивирование только известного fixture subtree и отсутствие обеих lifecycle directories: actual traceability CLI exit0, actual controls exits [0,0,1,1,1,0,1]; missing/malformed strict failures; explicit base leakage negative; execution+cleanup causes preserved including AggregateError. OS-temp realpath/absolute containment/bigint dev+ino identity и cleanup проверены. Тесты не skip/only и не mock-only вместо actual CLI.
- RED5fail сохранён до production reader edits; GREEN5/5. Старые 48 feature cases и 48 registry entry objects (25 foundation +23future) плюс prior assertion-source hashes сохранены. Только FUI-029/030/031 добавлены после real assertions. Теперь 51 cases /28foundation +23future. Canonical и active adapted copies byte-identical; archive relocation не меняет policy.
- Durable owner instructions docs/ui/decisions/branch-protection.md byte-identical source copy; adoption links durable и существуют. Проверь, что post-archive обычный compliance не читает active change ни прямо, ни через source-hash fixtures. Historical evidence paths могут описывать прежний запуск; их нельзя переписывать.

## Команды/evidence и ограничения

Проверь существование, hashes, command/time/actual exit records и реальные logs:

- foundation-archive-red-2026-09-30.txt и red-record: actual exit1, все пять lifecycle tests fail до readers repair.
- foundation-archive-green-2026-09-30.txt: actual exit0,5/5.
- foundation-archive-preflight-2026-09-30.txt(.json): frozen install, lockfile diff, scoped eslint/Prettier, strict OpenSpec validate — exit0.
- foundation-archive-check-all-2026-09-30.txt(.json): fresh pnpm check:all с существующим FRADE_DRAW_E2E_PORT, lint/typecheck/unit/BDD/boundaries/build/UI compliance и retained browser/desktop regressions — exit0; node UI26/26, Draw215, desktop41 (21 Electron +20 isolated Chromium CSS). Package task logs могут использовать valid Turbo cache; actual root UI/browser suites выполнялись.
- foundation-archive-cascade-2026-09-30.txt(.json): точная standalone Playwright command,20/20; проверить сами all-role/media assertions, а не только summary.
- foundation-archive-final-validation-2026-09-30.txt: strict validation, diff --check, cached diff exit0.

Прочитай также исходные foundation и EOL RED/GREEN/full evidence и ownership transfers для cumulative scope. Targeted reruns допустимы, если review требует проверки; не стирай прежние logs/test screenshots, не обновляй snapshots. Сбои классифицируй ENVIRONMENT отдельно от UI/INTEGRATION, сохрани actual failure. Не считай ожидаемый negative FAIL провалом suite.

Пределы: remote Actions LOCAL_ONLY/unobserved; Linux execution NOT_RUN; branch protection NOT_CONFIGURED by task / server state unverified. Durable owner instructions не означают remote merge protection. Runtime resolver/preview/settings/density, actual theme integration, P02–P07, visual migrations и AI provider не реализованы foundation. Light/Dark/HC есть в data, но приложение ещё не импортирует generated tokens. Screen-reader/200% zoom/actual migrated visual matrices — future-stage NOT_RUN. Семь реальных baseline screenshots исторические и immutable; infrastructure repair не изменил feature UI. Старые DEP0190/Draw.io null404 warnings не отменяют passing assertions и не дают право opportunistic production fix.

Routing source/gate/frozen consumer process не входят в supplier UI scope. Не требуй R04 completion/PRE/repair как условия UI POST. Реальные routing semantics changes стали бы blocker/split dependency; сейчас их отсутствие проверяется manifest/boundaries, а не переименованием FAIL в NOT_APPLICABLE.

## Результат и checkpoint

Сообщи Review ID, UTC, выбранные и actual model/effort, final manifest SHA, initial/final raw count + inventory/git checks, concrete inspected requirements/scenarios и commands. Findings должны иметь точный путь/строку/контракт/классификацию и actionable scope. Отдельно перечисли фактические NOT_RUN/LOCAL_ONLY.

Task4.4 содержит этот независимый POST и пока [ ]; task4.5 — последующий реальный archive/post-archive check, тоже [ ]. Это ожидаемые открытые closure действия, не доказательство выполненного archive и не самостоятельный implementation defect. Executor verify отмечает их critical before archive-complete claim. POST оценивает readiness для следующего archive checkpoint; нельзя выдавать archive-complete или отметить future checks done. При implementation/architecture/applicable check blocker выдай FAIL. При PASS executor должен сначала сохранить received result и закрыть4.4, затем честно выполнить project archive и actual post-archive ui:compliance/durable-link checks; окончательная4.5 completion только после success, STOP перед P01. Archive warning из-за незавершённого archive-task обрабатывается по project/CLI rules, без ложного checkbox ради обхода.

В конце ровно один недвусмысленный статус:
GATE_STATUS: PASS
или
GATE_STATUS: FAIL

Также READY_FOR_ARCHIVE: YES | NO (readiness после recording POST, не claim already archived). Никаких production edits, archive или старта следующего change в этом review.

