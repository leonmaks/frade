# Светлый редактор диаграмм — статус

Обновлено: 26 октября 2026 (MSK); evidence содержит фактические UTC timestamps.
Ветка: `codex/frade-light-diagram-editor`
Worktree: `E:/dev/codex/frade-worktrees/light-diagram-editor`
Change: `frade-light-diagram-editor`
Исходный commit: `4244e5668e50f74b9b536c2f0ffc44c56279e945`
Git common: `E:/dev/codex/frade/.git`
Guide: v1.0; workflow v1.1 / release `a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5`.

## Текущая фаза

BLOCKED_SCOPE_DECISION — LDE-REFUSAL-PHASE-INTENT-01. PRE06 завершился FAIL: intent-only draft блокирует same-request compensation phase rollback. Live fixture/production неизменны. Выполнен полный RCA phase graph и реальный service probe: 16 callback checks / 6 sequences PASS с exact original-service trace parity. Новый draft не принят и не применён. PRE01–06 raw FAIL сохранены. READY_FOR_VERIFY: NO.

Цель: общий светлый редактор Draw.io/Frade с авторскими цветами и исключением Windows forced colors. Внешний workbench сохраняет выбранную тему. PRE/POST: **gpt-6-sol / xhigh**; actual backend/effort в receipts NOT_CONFIRMED. Новые визуальные baselines ещё не приняты.

## Этапы

| Этап | Статус | Фактический результат / следующий шаг |
|---|---|---|
| Изоляция / read-only inventory | DONE | Baseline и 50 raw sources сохранены; benchmark checkout восстановлен точным baseline blob с отдельной provenance |
| Proposal / specs / design / BDD | DONE_PLANNING | 4 delta specs, 9 Gherkin definitions; новое точное решение принято |
| Strict / traceability / planning checkpoint | SYNTAX_PASS / BLOCKED_SCOPE | Fresh strict 1/1, но PRE06 correctness blocker и новое точное решение |
| Независимый PRE | FAIL01–06 | Нужен принятый forward-phase/request scope перед fresh PRE |
| Shared scope / native editor (2.1–2.3) | NOT_RUN | Meaningful RED, реализация и focused GREEN после PRE PASS |
| Draw.io / owned overlays / parity (3.1–3.4) | NOT_RUN | Bridge, owner isolation, source replay и BDD/compliance |
| Общие проверки / runtime (4.1) | NOT_RUN | Полная applicable matrix на финальном source |
| Визуальное принятие (4.2) | NOT_RUN | Новая галерея двух движков |
| Verify / независимый POST (4.3) | NOT_RUN | После всех required checks |
| Archive / Main integration / push | NOT_STARTED | Только после gates; новая remote-ветка не авторизована |

## Детализация текущего этапа

- [x] Изолировать feature от Main/P02/Routing; сохранить исходники и policy.
- [x] Описать scope, allowed paths, BDD, проверочную матрицу и стратегию.
- [x] Автоматически получить PRE01–05 и сохранить raw FAIL/receipts без переписывания.
- [x] Применить принятые planning drafts LDE-PRE-RECONCILIATION-01.
- [x] Устранить ENVIRONMENT mismatch benchmark: точный baseline blob, pin и assertions неизменны.
- [x] Реально выполнить неизменные origin/pin unit tests: 6/6 PASS.
- [x] Воспроизвести cancel defect однострочного draft; новый intent-bound callback probe: 9/9 PASS.
- [x] Получить точное решение LDE-REFUSAL-INTENT-01; применить только design.
- [x] Сохранить fresh strict/traceability; checkpoint фиксируется перед freeze.
- [x] Подготовить полный packet и выполнить PRE06; FAIL сохранён.
- [x] После второго неудачного draft выполнить полный RCA/service transition probe; новый exact draft готов.
- [ ] Получить решение LDE-REFUSAL-PHASE-INTENT-01, согласовать design и выполнить fresh PRE.
- [ ] После PASS выполнить meaningful RED и реализацию в разрешённых путях.

Tracked tasks: 1/13; 1.2 переоткрыта: syntax PASS не закрывает новый scope/correctness conflict. 1.3 PRE не завершена. Ни один product task не объявлен готовым.

## Проверки, ограничения и следующее действие

PASS: historical strict и Gherkin parsing (9 definitions); exact fixture reverse proof; 9/9 request-sequence probe; неизменные origin/pin tests 6/6. Probe НЕ является Electron/runtime PASS. Offline frozen install: 336 cache packages, 0 downloads, lockfile неизменен. PRE01–06 FAIL сохранены. NOT_RUN: новый UI typecheck/lint/BDD/runtime/a11y/screenshots/POST/verify. CI/branch protection: NOT_VERIFIED.

Стратегия перед следующим review: использовать проверенную transitive closure и byte proof; не повторять неизменные unit tests и большие regressions до реализации. Fresh PRE обязателен из-за scope/design delta; предыдущие dispatch занимали примерно 6–7 минут (измерено), следующий интервал — прогноз, не timeout. Проверить completeness и hashes до freeze; при новом scope/correctness finding остановить реализацию и пересмотреть стратегию, а не повторять известный FAIL.

Следующее действие: точное решение по phase/request fixture. До решения новый дорогой PRE не запускается. После принятия — только design, strict/checkpoint, автоматический cumulative PRE gpt-6-sol/xhigh; production только после PASS и RED.

Локальный review candidate: `2102b2a54cad7ec5ef333c01401698748221d95f`; текущее обновление будет отдельным commit. Push NOT_RUN — новая remote-ветка не авторизована. Main/P02/Routing не менялись. Правая панель: OPEN_REQUEST_QUEUED, видимость NOT_CONFIRMED.

## История (состояния на момент события)

Ниже сохранены прежние FAIL и решения в хронологическом порядке; текущий статус указан выше. Историческое PROPOSED_NOT_ACCEPTED не отменяет последующую запись принятия.

## Возобновление 26 октября 2026

Текущий checkpoint до PRE: `948cf36bf370f6cecd8e0a3ba0198b3a8c842279`. Пользователь разрешил PRE и реализацию после PASS. Обнаруженные 50 исходников совпадают с planning inventory. Стратегия сохранена: общий derived scope, короткий bounded RED/native/frame/portal probe, затем финальные обязательные прогоны; повтор полного historical volume не планируется. PRE запускается автоматически; до получения чистого PASS production не меняется. Во время freeze dashboard не изменяется.

## PRE 01 — фактический результат

FAIL: отсутствовали baseline color/reference/checkout controls и native schema/graph adapter. Receipt подтвердил candidateUnchanged/packetUnchanged и точную requested пару gpt-6-sol/xhigh; actual backend/effort NOT_CONFIRMED. Raw evidence сохранено в evidence/pre-01-received-20261026. Подготовка 94 файлов заняла примерно 86 секунд, весь dispatch 6 минут 14 секунд; это измеренные интервалы, не прогноз следующего review.

При аудите недостающих controls найден raw-byte запрет изменения Guide/Checklist/Themes Spec. План уточнён в пределах существующего docs/ui/diagram-editor-presentation.md: companion и deltas документируют принятую политику, все восемь защищённых файлов/оракул остаются неизменными. Product scope и модель/effort не меняются. Native page/image/gradient отсутствуют в схеме: это существующая UNSUPPORTED capability, не обещание новой функции. Следующий шаг — полный исправленный packet и fresh PRE 02, без production до PASS.

## PRE 02 и точный следующий шаг

PRE 02 gpt-6-sol/xhigh: FAIL, source/packet unchanged. Raw result SHA256 `6db97365a6d9a9284f01ce746a9a5d7152af39e95b8f5d186c633e4afa46c840`; evidence/pre-02-received-20261026. Requested model/effort подтверждены controls, actual backend/effort NOT_CONFIRMED. Полный dispatch — 7 минут 27 секунд (измерено).

Blockers: добавить read-only baseline ThemePicker.tsx/picker.test.tsx в следующий packet; исправить невозможный native page/image scenario; разрешить ровно два origin-control файла, без которых изменение уже разрешённого E2E visual ожидания нарушает обязательную source replay цепочку. Отдельно Temp-probe доказал active merged workbench spec FAIL >500 chars и PASS после удаления только новой дублирующей фразы.

[Точный scope и четыре drafts](../../openspec/changes/frade-light-diagram-editor/decisions/lde-pre-reconciliation-01/proposal.md), proposal SHA256 `daa3d62400f26e78f7cdf736385e39abf327cd7dee614ebcb73fa9f4733029a1`, manifest SHA256 `19f50fa30b53341932701d07fc22ce204e8da08d82504e03fc3124714144f5a8`. Статус PROPOSED_NOT_ACCEPTED. Draft change + четыре merged main specs strict PASS (5/5) в изолированной fixture. Активные design/spec drafts НЕ применены; source/control code НЕ менялся. Новый PRE не запускается до решения, чтобы не повторять дорогое review известного blocker.

Почему требуется человек: AGENTS §2 и текущий design §6 прямо запрещают два дополнительных control пути. Независимая модель не вправе расширить эту границу; автоматические reviews уже выполняются без ручной передачи. После принятия — применить ровно drafts, strict, fresh PRE gpt-6-sol/xhigh и только после PASS meaningful RED/implementation.

## Checkpoint ожидания решения

Локальный checkpoint: `fdbcfdcf596220b74765bbf4e5b53f253e71f550`. Полный diff от baseline ограничен этим change и dashboard; 50 baseline source hashes повторно совпали. Новая remote-ветка не публиковалась. Запрошено точное решение через UI; статусы FAIL не сняты. Правая панель повторно OPEN_REQUEST_QUEUED, видимость NOT_CONFIRMED. READY_FOR_VERIFY: NO.

## Точное решение принято

Пользователь утвердил LDE-PRE-RECONCILIATION-01 и четыре drafts с manifest `19f50fa30b53341932701d07fc22ce204e8da08d82504e03fc3124714144f5a8`. Проверены исходные hashes, применены только четыре planning drafts; acceptance.json сохранён. Два дополнительных origin-control пути теперь входят в разрешённый scope; код этих controls пока НЕ менялся. Исторические PRE 01/02 FAIL сохраняются. Текущий следующий шаг — fresh PRE 03 gpt-6-sol/xhigh с baseline picker и полным согласованным планом; до PASS production запрещён. Во время review status заморожен.

## PRE 03 — фактический результат и новое точное решение

FAIL, candidate/packet unchanged; model requested gpt-6-sol/xhigh, actual backend/effort NOT_CONFIRMED. Dispatch 05:05:32Z после 04:59:52Z (примерно 5 минут 40 секунд, измерено). Result SHA256 `ab78ed12bd98bc9e934d8cfdb1a95c6e5bd494e077c3846e137d4dfce5fe25ff`, raw evidence/pre-03-received-20261026. Прежние три PRE02 findings устранены.

Открыто: один существующий refusal-helper перехватывает prepare только при snapshot.kind dark, тогда как принятая локальная проекция должна посылать light. Текущий scope разрешает visual expectations, но не эту тестовую predicate-правку. Подготовлен [LDE-REFUSAL-FIXTURE-01](../../openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-fixture-01/proposal.md), SHA256 `7e913c69ddd51efbfe016ec82070d8b25fe22ac8e151ee5d42a5437a1c7056aa`, manifest `260587d9d3ee547c56a9d7127305c47dccf4df8a2b6ae61224caebaabc622ce6`. Статус PROPOSED_NOT_ACCEPTED. Одна строка guard dark -> light, остальные bytes/assertions/actions/deadlines сохранены; синтаксис draft PASS и точный reverse восстанавливает pre-LDE source SHA. Design draft не применён, live тест не изменён.

Второй finding — недостающие scripts/ka-fixtures.mjs, scripts/flow-fixtures.mjs и benchmark hardware JSON. Вместо ручного списка выполнен bounded AST import/file preflight: 204 существующих файла / 2,370,747 bytes, все named inputs включены. Три unresolved — создаваемые negative fixtures, две external declarations — недоступные review внешние корни, не копируются. Подробности packet-dependency-preflight.json и packet-preflight-notes.md. Это не PRE PASS и не runtime certification.

Следующее действие: получить точное решение по одной fixture predicate; затем применить только design draft, составить полный packet по closure и выполнить fresh PRE gpt-6-sol/xhigh. Саму fixture-правку и production — только после PRE PASS и meaningful RED. Новый дорогой PRE не запускается на заведомо запрещённой predicate. Глобальные настройки, Main/P02/Routing, source/controls и все 50 baseline hashes сохраняются. READY_FOR_VERIFY: NO.

## LDE-REFUSAL-FIXTURE-01 принято

Пользователь утвердил точную fixture-правку и design draft. Proposal/manifest hashes проверены; применён только design `67de08fd4f868da84041eeab2e291e0d93ede567a9c86be4f5b8fd43f5d1508c`. Live E2E source остаётся `3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9`; guard и production не меняются до PRE PASS/RED. Fresh PRE 04 gpt-6-sol/xhigh использует bounded transitive dependency packet; raw предыдущих FAIL сохранены. Во время dispatch status заморожен.

## PRE04 и точная environment-restoration

FAIL: benchmark source pin ожидал `1bcd2e...`, checkout имел `47badb...`. RCA ENVIRONMENT: baseline Git blob LF = exact existing pin `1bcd2e294f145a7e18629bca4113f3d9f0f510a3e5a00f047e05313070135781`; checkout CRLF, logical source equal. Восстановлен только точный Git blob baseline; Git diff по benchmark EMPTY, pin/assertions/workload/timeouts/budget НЕ менялись. Raw before/canonical/provenance сохранены в evidence/benchmark-checkout-restoration-20261026; старый inventory/FAIL не переписаны. Другие источники не нормализуются.

PRE04 raw result `6b15430cf929305e1c529eed730f080af40d2ade57fcd2a183c61f70a2f0639e`, source/packet unchanged, requested gpt-6-sol/xhigh, actual backend/effort NOT_CONFIRMED. Следующий PRE05 проверит те же контракты с exact canonical benchmark bytes; production и live refusal guard ещё не менялись.

## PRE05 readiness

Exact canonical benchmark bytes восстановлены без Git source diff и без изменения pin. Оригинальные origin/pin tests реально выполнены: 6/6 PASS (Vitest 1.43s). Offline frozen install: 336 cache packages, 0 downloads, 7.1s; lockfile/production unchanged. Исходный raw inventory сохранён: 49 raw sources совпадают, один benchmark восстановлен byte-for-byte из Git baseline с явной provenance и portable base64 before/after. Следующий fresh PRE05 получает эту доказательную цепочку; прежние FAIL сохраняются. Во время review status frozen.

## PRE05 — FAIL и проверенное intent-bound предложение

PRE05 status FAIL; packet/candidate unchanged. Raw result SHA256 `39b5ea73c8894a6e623f475a18ae2bb744d1a49e353e0dbb1eb38f1bd372b98a`. Reviewer подтвердил устранение PRE04 benchmark mismatch, но нашёл ошибку владельца в предложенной one-line fixture: она отказывает cancel, поскольку оба снимка editor Light. Исходный live fixture не менялся. RCA: STATE_TRANSITION / ABSTRACTION_BOUNDARY.

На полном исходном callback детерминированно воспроизведён cancel FAIL старого предложения и проверен новый request-bound draft: 9/9 checks PASS, включая повторный отказ того же intent и успешный cancel с новым requestId, rearm и disarm. Первый probe ERROR (отсутствовал mock performance.now) сохранён отдельно; actual Electron/runtime NOT_RUN. Все изменения draft точно обратимы к pre-LDE3535..., все assertions/actions/deadlines вне двух mapped edits byte-identical.

[Точный LDE-REFUSAL-INTENT-01](../../openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-intent-01/proposal.md), proposal SHA256 `5113e9c9e6ae259729c6dcea7b6fd03d7baa598a176db123c0377a7592162fde`, manifest `b75fb70e391ff79f8aca0ae4ba0991d4783ba0909931bb99ca69adc1608f2405`. PROPOSED_NOT_ACCEPTED; заменяет только ещё не реализованную one-line fixture policy. Ни design draft, ни live TS draft не применены. Нужен человек: AGENTS §6 и принятый точный scope разрешают лишь прежнюю одну строку, а новый initializer/request latch выходит за неё. После принятия — только design, fresh PRE gpt-6-sol/xhigh, meaningful RED/implementation после PASS. До решения не запускаем очередной review заведомо неверного плана. READY_FOR_VERIFY: NO.

## LDE-REFUSAL-INTENT-01 принято / PRE06 readiness

Пользователь утвердил точную замену и drafts. Proposal 5113e9c9… / manifest b75fb70e… проверены; active design fb4e8b43…; fixture3535fd97… неизменна. Fresh strict 1/1 PASS; exact hash records подтверждают повторное использование неизменных BDD/spec mapping без нового parsing/runtime PASS. Согласованный candidate включает действующее request-bound решение; новый PRE получает полную in-repository dependency closure и все принятые scope records. Пять прежних FAIL остаются. До завершения review dashboard заморожен.

## PRE06 FAIL / полный RCA phase graph

Clean completed receipt: requested gpt-6-sol/xhigh; actual backend/effort NOT_CONFIRMED. Candidate/packet unchanged; 234/234 packet hashes проверены. Result SHA256 576a593c8c813992bf503bfde9ea37bd8477631497a6d7ced15ab0069d454842; raw result/events/receipt в evidence/pre-06-received-20261026, provenance сохранена до интерпретации. Total dispatch 05:44:24Z–05:53:38Z = 9m14s (измерено).

PRE06 доказал новый blocker: same requestId используется и отказавшим forward prepare, и compensation prepare при предыдущем preview; прежний intent-only draft блокирует rollback и приводит к RECOVERY_BLOCKED. Продукт/live fixture НЕ менялись. Classification STATE_TRANSITION / ABSTRACTION_BOUNDARY / TEST; два неудачных draft больше не патчатся без полного state-graph анализа.

Выполнен сохранённый probe.cjs на настоящем неизменном service.ts/types.ts и полном извлечённом callback: 16 phase/operation/rearm checks + 6 service sequences PASS с exact trace/context/status parity исходного Dark поведения, исключая только projected kind. Предыдущий intent-only RECOVERY_BLOCKED воспроизведён. Corrected draft разрешает только forward phase prepare захватывать/отвергать target; join/rollback никогда не захватываются, same-target membership reprepare всё ещё REFUSED. Paint/host mocked — Electron/runtime/visual NOT_RUN. Начальный и расширенный probes сохранены отдельно.

[Точная замена LDE-REFUSAL-PHASE-INTENT-01](../../openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-phase-intent-01/proposal.md): proposal SHA256 1879913c2acdee076f7a136674004dfcdf288e26557776d0c8b19fa166d28d5c; manifest 27f36eb2ea197e4ff420309f6c852d98379ffc3ad91548027778891586aad764. PROPOSED_NOT_ACCEPTED. Полный live source остаётся3535fd97…, exact reverse proof PASS; original tests/assertions/actions/timeouts/REFUSED context и benchmark1bcd2e… сохраняются. До решения — BLOCKED_SCOPE_DECISION; без нового заведомо ошибочного review.
