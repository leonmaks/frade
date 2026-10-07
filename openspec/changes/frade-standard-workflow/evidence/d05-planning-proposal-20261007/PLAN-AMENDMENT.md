# W01 — исправленный полный проект поправки D05

Статус: **PROPOSED_NOT_APPROVED**. Это планирование, не gate, не approval и не реализация. Инструменты, команды и записи не выполнялись. Основание — предоставленные inline источники и сообщённая пользователем host-проверка хешей; собственной проверки файлов или хешей здесь не заявляется.

Запрошенная роль подготовки: `planning-architecture = gpt-6-astra/high`. Actual backend/effort: **NOT_CONFIRMED**. Запрошенное назначение не является независимым подтверждением backend.

## 1. Текущее состояние и сохраняемое evidence

Активное изменение: `frade-standard-workflow`, W01. Original/cumulative baseline: `98f387f96b51b0ad139e3507c376ff1c3e8dec09`. Рассмотренный checkpoint: `62b9e0fbfd55f8b2e99f8ea210786fc6c9f01fd0`; implementation checkpoint: `eadd32026c0f71a82ce3981ae3e6cdd16f924e26`.

POST от 7 октября 2026 года завершился **FAIL**; SHA256 отчёта: `5654822b2e5fd221fe83834b6236316d540528298cc5d5fe6f752d574e215bc9`. Task 4.2 остаётся незавершённой. Воспроизведено принятие `verifyRawReview()` иначе полного PASS при inspection exits 1 и 2. Это дефект приёмки, а не доказанный end-to-end обход дополнительных проверок общего runner.

Исторический formal Verify receipt `RECEIVED_VALID_PASS` противоречит сохранённым inspection failures. Сам receipt, первоначальная checked task 4.1 и raw streams сохраняются в immutable history; current clean Verify admission **не установлен**. После принятия D05 текущая task 4.1 открывается заново для полного свежего Verify. До принятия D05 это только предлагаемая правка. Ограничения чистоты и полноты текущего POST также сохраняются; последующие успешные команды не очищают старый run.

Исторические сведения о 277 артефактах, 72 source bindings, 29 check hashes, 35/35 локальных тестах и supplied native 221/221 относятся к прежнему кандидату. Они не покрывают D05. Для W02 известна воспроизводимость digest/metrics, но не exact rendered bytes; пробелы W03 остаются явными. D03, D04, прежние PRE/Verify/POST, RED и их исходные bytes/hashes не переписываются. Отсутствующее inline содержимое D04 не реконструируется.

## 2. Одно материальное решение D05

Предлагается одно approval точного хешированного пакета:

> Принять bounded amendment активного W01: regression-first исправление review/Verify reception и полный repository control plane для автоматического intake/bootstrap, подготовки owner plan, exact-role dispatch, confined execution либо staging/adoption, checks, независимых packet-confined PRE/POST, formal Verify, verified checkpoints и автоматического status/evidence ingestion. Initial target — уже допущенный Windows host broker с существующими explicit writable roots и pinned Codex 0.159.3 в WSL Ubuntu-22.04_E; OpenSpec — isolated exact 1.14.0; shared reviewer v1.1 неизменен. Принять новую hash-bound role-authority revision D05 с сохранением пяти W01 pairs, ограниченный broker/runtime/lease/transport contract и явные grants двум disposable E2E fixtures. До реализации обязательны task 1.6 и fresh PRE 1.7; после реализации — 3.3, 3.4, новый clean Verify 4.1 и fresh cumulative POST 4.2. Existing commit/push approval сохраняется. Решение не разрешает next numbered stage, main merge, foreign-owner adoption, новые OS privileges, service installation или global configuration expansion.

Пакет включает ровно следующие существующие файлы:

1. `openspec/changes/frade-standard-workflow/proposal.md`
2. `openspec/changes/frade-standard-workflow/design.md`
3. `openspec/changes/frade-standard-workflow/tasks.md`
4. `openspec/changes/frade-standard-workflow/specs/engineering-direction-lifecycle/spec.md`
5. `openspec/changes/frade-standard-workflow/specs/engineering-role-dispatch/spec.md`
6. `openspec/changes/frade-standard-workflow/specs/engineering-progress-publication/spec.md`
7. `openspec/changes/frade-standard-workflow/feedback-register.md`
8. `docs/engineering/standard-workflow.md`
9. `docs/engineering/newcomer-guide.md`
10. `docs/engineering/directions/frade-standard-workflow/direction.json`
11. `docs/engineering/directions/frade-standard-workflow/AGENTS.md`

Host материализует reviewable candidate только в уже разрешённом staging, вычисляет raw SHA256 всех одиннадцати файлов и digest канонического manifest пакета. Approver record находится отдельно от хешируемого пакета и связывает его digest, точный новый design hash, authority revision, fixture grants и policy constants. Будущие хеши здесь не вымышляются. Изменение утверждённых содержательных bytes требует соответствующей новой привязки/revalidation; обычные task runs и вычисление capabilities по принятому контракту не требуют повторных человеческих approvals.

Подготовка candidate не расширяет production planning allowlist. D05 отдельно включает adoption перечисленных собственных planning/docs файлов; implementation scope остаётся bounded W01. Произвольные новые файлы или implementation edits этим ответом не предлагаются.

## 3. Scope и сохраняемые полномочия

Будущая реализация ограничена `scripts/directions/**`, `tests/directions/**`, собственными W01 control/docs в `docs/engineering/**`, `openspec/changes/frade-standard-workflow/**` и необходимыми точными entries `package.json`, `.github/workflows/ci.yml`, additive root `AGENTS.md`. Общий docs glob не разрешает чужую direction metadata. Product packages/apps, dependency versions/lockfile, vendor, Routing/UI/Repo Core, foreign worktrees, unrelated changes и account/global settings исключены.

Common reviewer v1.1 потребляется неизменно: release `a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0`, policy SHA256 `6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb`. Repository controller и его executor/transport adapters не являются новой версией общего reviewer.

Existing publication approval продолжает действовать: `git@github.com:leonmaks/frade.git` → `refs/heads/codex/frade-standard-workflow`. Повторное разрешение routine commit/push не требуется. Tasks 4.3/4.4 сохраняют существующую bounded closure authorization и остаются неактивными до всех обязательных current gates и требуемых решений. Closure destinations — только три engineering specs из design 1a и собственный датированный архив W01. D05 не добавляет безусловного нового permission demand для уже разрешённой closure и не активирует её заранее.

## 4. Конкретный host и control-plane contract

### 4.1 Initial target и автоматический запуск

Один repository control plane имеет проектируемые операции `submit`, `resume`, `inspect-status`, `cancel`. На submit/resume уже допущенный Windows host broker автоматически запускает либо присоединяет существующий on-demand controller, идентифицируемый canonical Git common и control revision. Установка постоянной OS service не требуется. Пользователь не создаёт отдельную сессию, profile/config или executor launch для каждого направления.

Initial executor adapter использует существующий pinned Codex **0.159.3**, WSL distribution **Ubuntu-22.04_E**, существующий confined launcher и explicit writable roots. Для данной подготовки supplied writable root — `/mnt/e/dev/codex/frade-worker-staging/w01-automation-plan-revision-20261007/work`; это staging, не registered owner. Production W01 owner — `E:/dev/codex/frade-worktrees/frade-standard-workflow`, common — `E:/dev/codex/frade/.git`. Их доступность broker устанавливается из существующего host grant и фактической registration, а не выводится из прав текущего worker.

Windows/WSL mapping проверяется по canonical filesystem/Git identity; строковая замена `E:` на `/mnt/e` недостаточна. Broad drive mounts, WSL interop или Windows executables не должны давать worker escape к host. Если существующий launcher не обеспечивает требуемое ограничение, зависимый запуск **BLOCKED** с конкретным failed probe. Elevation, смена distro, установка service, изменение global config и отмена canaries не являются fallback. Дополнительная инфраструктурная потребность сообщается только при реально установленной необходимости.

### 4.2 Capability derivation и preflight receipts

Owner capability вычисляется как пересечение **verified registration + approved phase/task scope + existing host grant**, дополнительно суженное root/nested rules, runtime confinement, lease и freeze. Manifest/request не выдаёт capability, не расширяет filesystem grant и не переносит W01 exception другому owner.

Preflight receipt должен содержать: host identity; canonical common/worktree/branch и Windows/WSL mapping; baseline/current HEAD/index/source hashes; existing grant identity/digest и effective read/write roots; policy/control/authority revisions; absolute trusted launcher/runtime identity, Codex version 0.159.3, distro identity и actual executable hashes; isolated OpenSpec 1.14.0 path/version/hash; permission-profile digest; selected role source/excerpt и approved/requested/invoked pair; canary commands/exits/target hashes; lease/freeze/run IDs; result и concrete limitation. Значения снимаются автоматически, не заполняются пользователем вручную. Expected runtime hashes берутся из уже доверенного pinned inventory; несовпадение или отсутствие проверяемой runtime identity блокирует запуск.

На admission и при изменении runtime/profile выполняются positive allowed read/write и negative synthetic probes original/common/foreign/secrets/settings/network, link/reparse/path escape, Windows/WSL alias/interop escape. Используются безопасные synthetic denied targets, не реальные secrets. Post-hoc diff audit дополняет техническое enforcement, но не заменяет его.

### 4.3 Execution, staging и broker

Worker получает readonly selected baseline/inputs/toolchain и task-specific writable scope. Initial безопасный путь — отдельный staging namespace в existing writable grant, без доступа к original checkout, common Git internals, foreign owners, secrets/auth/global settings, broker credentials и произвольной сети. Model transport остаётся у trusted launcher/provider boundary; worker commands не получают общий network capability. Direct owner writes допустимы только при доказанном path enforcement и отзыве process capability; иначе остаётся staging.

Staging result связывает baseline/input/output hashes, explicit changed paths, modes и evidence. Owning broker повторно проверяет current bytes, owner registration, approved scope, lease/freeze/gates, rejects links, executable escape и unexpected paths. Конфликт с dirty owner bytes блокирует adoption без перезаписи. Readonly toolchain и outputs/caches используют отдельные разрешённые mounts/namespaces.

Typed broker принимает ограниченные intents bootstrap/adopt/checkpoint/publish, а не произвольные shell/argv команды. Credentials и remote transport остаются на host. Common/index/ref operations сериализуются lock по canonical common; owner mutations также требуют owner lease. Broker явно stages allowed paths, проверяет sensitive/unexpected changes, отключает непредусмотренные hooks/filters/config через process-local настройки, не меняя global config. Push — exact SHA на exact authorized ref, без force; PUBLISHED только после fresh matching remote SHA. Crash после push до receipt разрешается query фактического outcome, без лишнего commit или слепого повторного push.

### 4.4 Lease, freeze, recovery

На canonical worktree действует не более одного writer. Lease связывает owner/common/run/task/role, source/authority/runtime/permissions digests, epoch/fencing token, heartbeat и expiry. Proposed validated constants: heartbeat 10 секунд, expiry 60 секунд; heartbeat > 0, expiry ≥ 3 × heartbeat. Expiry не разрешает следующего writer, пока host не остановил или не доказал отсутствие старого process tree и не отозвал capability. Невозможность доказать остановку означает BLOCKED.

Freeze запрещает source/index/HEAD/status/adoption/publication writes; events/receipts сохраняются вне candidate. Expiry не снимает freeze. Каждый run имеет собственные temp/log namespace и process group. Cancel сохраняет evidence, отзывает capability и останавливает children. Resume сверяет durable journal, live processes, runtime/source/authority, lease/freeze, pending adoption и Git/remote outcome; incomplete run не становится PASS. Исчезновение launcher прежнего planning runner — наблюдение с неустановленной RCA, требующее reproduction/fault injection, а не готовый диагноз.

## 5. Exact roles, provenance и переход D03 → D05

Пять W01 pairs неизменны:

| Роль | Model | Effort |
|---|---|---|
| planning-architecture | gpt-6-astra | high |
| tooling-tests | gpt-6-sol | high |
| formal-Verify | gpt-6-astra | high |
| independent-PRE | gpt-6-astra | xhigh |
| independent-POST | gpt-6-astra | xhigh |

Approved/requested/invoked пары должны совпадать. Missing/ambiguous assignment, explicit unavailable/unsupported model/effort, substitution, несовместимый runtime/profile или failed launch блокируют dependent execution. Universal defaults, silent fallback и автоматическая замена модели запрещены. Deterministic orchestration/publication не получают отдельную вымышленную LLM-роль.

Actual backend/effort записываются отдельно: при отсутствии независимого подтверждения — **NOT_CONFIRMED**. Это допустимо по существующему FWE-012-S01 при точном approved/requested/invoked pair, trusted pinned runtime, complete receipts и отсутствии substitution/explicit rejection. Отсутствие backend attestation само по себе не блокирует W01 или D05 fixtures. Оно блокирует только owner, чей собственный approved plan явно требует более строгой actual attestation. Полученное свидетельство несовпадения actual pair требует BLOCKED; его нельзя скрыть за NOT_CONFIRMED.

Existing `checkedHistoricalW01()` читает design из current owner и ожидает фиксированный D03 hash. После amendment эти bytes изменятся, поэтому нельзя просто применить edits и считать прежний production CLI admitted. `roles.mjs` поддерживает trusted bindings/reader/approval verifier, но это само по себе не доказывает поддержку D05 существующим host/review adapter.

Task 1.6 должна подготовить chain: immutable D03 design из approved commit `61c7b6d9b0cde8fe06b714c74bfa6ac04009a1ab`, raw hash `501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a`; неизменный D03 decision hash `98511f4a32f358b668809fa2e910d090b56617b5c05da1f332ac3517d2ff3239`; новый D05 packet/design hash и отдельный approver record. D05 approval одновременно принимает новую authority revision и неизменную матрицу, без второго отдельного model approval.

Fresh PRE 1.7 использует фактически поддержанный admitted host adapter: immutable D03 role source остаётся источником exact pair, D05 decision/packet задаёт новый planning scope. Adapter receipt обязан доказать раздельное binding и freeze candidate. Если установленный adapter не может представить обе привязки без изменения guards, 1.7 остаётся **BLOCKED_AUTHORITY_TRANSITION**; task 2.11 нельзя начать раньше PRE ради обхода этого условия. Никакой поддержки здесь заранее не заявляется. После PRE задача 2.11 реализует в repository controls явное разделение historical-origin verification и current D05 authority. Исторические hash constants сохраняются; новые current bindings принимаются только из проверенного D05 record. Обычное обновление task progress не должно молча подменять immutable role source.

Для двух fixtures D05 явно разрешает test profile с этими пятью exact pairs и исключительно disposable resources/local bare remotes. Это named grant для task 3.3, не global default. Future direction intent автоматически порождает draft roles/checks/rights из versioned repository policy, affected contracts и owner scope. Затем dispatch использует собственный approved stage plan; человек не должен вручную сочинять назначения или передавать текст между workers. Если policy не разрешает однозначное назначение, controller готовит конкретный вариант в составе материального owner planning decision, а не выбирает fallback.

## 6. Reception и bounded transport

Required inspection nonzero exit, missing completion, failed/truncated stream, timeout, final-event/report mismatch или source drift исключают clean PASS. Expected failing child допустим внутри заранее объявленного harness, который проверяет ожидаемый child result и сам завершается успешно. Нельзя задним числом переименовать провалившуюся inspection-команду в negative control. Новый успешный run не удаляет старый FAIL.

Transport repository adapter передаёт immutable request через короткий safe absolute regular-file locator либо exact framed stdin. В argv остаются короткий locator и digest; full JSON, shell interpolation и evidence shortening исключены. Envelope связывает version/run/owner/phase/authority/runtime, request byte length/SHA256 и packet manifest digest.

Предлагаемые конфигурируемые policy constants: request payload 16 MiB; metadata envelope 64 KiB; packet aggregate 64 MiB и максимум 4096 files; locator максимум 4096 UTF-8 bytes и одновременно более строгий native platform limit; raw output 256 MiB/run; transport inactivity timeout 300 секунд. Inactivity timeout относится к доставке/stream heartbeat, а не задаёт универсальный deadline review. Это предложенные эксплуатационные пределы, не результаты измерений. Policy version/hash, positive safe-integer validation, согласованность сумм/счётчиков, доступность storage и native limit проверяются до dispatch. Каждая граница проверяется на limit−1/limit/limit+1, file count и timeout — в своих единицах; invalid/zero/negative/overflow конфигурации отклоняются. Изменение за утверждённые пределы требует policy revalidation, а не подгонки под тест.

Reject traversal, symlink/reparse/alias escape, TOCTOU, duplicate/unknown framing, short/extra stdin, hash drift и failed streams. Стабильность bytes обеспечивается безопасным открытием/чтением и hash-bound immutable spool, а не одной предварительной проверкой имени. При превышении output limit retained partial stream получает явную incomplete/overflow запись и не принимается как complete evidence; original request/packet не изменяются.

Исторический workaround сохранил 273+4=277 файлов/7,389,082 bytes, но использовал 28,741 символ вместо исходных 33,270 при ENAMETOOLONG. Task 2.12 использует исходный полный запрос и packet без сокращения/пересборки их байтов, проверяет manifest hashes и добавляет отдельные boundary fixtures. Число символов не заменяет byte length. Если исходные bytes недоступны, этот regression остаётся NOT_RUN/BLOCKED, а не реконструируется из указанных чисел. Shared v1.1 не меняется.

## 7. Automatic ingestion и точные status metrics

Versioned adapters автоматически читают registered owner/task/spec/source snapshots, реальные check process results, human decision records, Verify/PRE/POST raw receipts и broker receipts. Event содержит owner/stage/task/run, source digest, producer/version, immutable event ID, sequence и causation ID. Replay дедуплицируется; out-of-order events буферизуются до устранения gap, конфликтующий повтор блокирует affected projection. Ручной PASS JSON не является источником принятия.

Requirements total — число уникальных requirements в current approved spec set; accepted — только requirements, все required scenarios которых имеют meaningful assertions и current applicable source-bound passing evidence и необходимые решения/gates. Task total/checked выводятся из `parseTasks` по decimal IDs; отдельно считаются evidence-complete tasks, поэтому checked count не означает readiness. Scenario coverage — distinct executed required scenarios / total required scenarios; negative controls — distinct executed required negatives / declared required negatives. Required checks показывают отдельно PASS/FAIL/BLOCKED/NOT_RUN, N/A имеет contract reason. Для каждой группы remaining = total − complete, без двойного счёта retries. Blocker age вычисляется из первого unresolved event и явного projection timestamp; failed fix attempts — из связанных run events. Performance/security/visual metrics публикуются только с own approved budgets и actual evidence; quality score не вводится.

Сохраняются ровно восемь разделов: Decision/Next Action; Identity/Scope; Stage Roadmap; Active Tasks/Steps; Checks/Gates/Quality; Models/Execution; Dependencies/Decisions/Blockers; Git/Publication/Evidence. Snapshot digest покрывает все inputs, включая explicit timestamp; renderer version и exact rendered bytes проверяются повторным render. Refresh автоматически происходит на start/resume, scope/decision, task/blocker/check batch, PRE/Verify/POST, adoption/publication/closure. Во freeze events сохраняются внешне, tracked render выполняется после проверенного unfreeze. Missing adapter/source или stale binding не увеличивают executed/accepted metrics. Видимость панели остаётся UNKNOWN/QUEUED до подтверждения.

## 8. Две реальные независимые E2E fixtures

D05 test grant ограничивается двумя disposable directions внутри подтверждённых existing host roots, с разными IDs, branches/worktrees, baselines, intents, path scopes, journals и local bare remotes. Никакого production push или foreign-owner activation. W01 test profile наследуется только по явному D05 grant; fixture plans связывают его с собственными stage IDs и exact source rows без изменения W01 model pairs.

Fixture A проверяет новый natural-language intent → automatic draft roles/checks/rights → bootstrap → source-bound planning approval по ограниченному D05 test grant → PRE → meaningful RED → confined implementation небольшого test-only поведения → applicable checks → actual formal Verify → actual independent POST → checkpoint/local-remote SHA/status → STOP. Approval envelope заранее ограничивает deterministic fixture objective, scope и pairs; controller не придумывает человеческую подпись.

Fixture B начинает со stale registered disposable owner. Она проверяет inventory и exact old/new-hash adoption в пределах D05 test grant, затем полный lifecycle. Инъекции охватывают controller/worker crash, cancel, stale lease, freeze, crash-after-push и unresolved material decision. Для waiting test harness предоставляет заранее D05-разрешённый test-only decision event после доказанного запрета dependent transition; это не выдаётся за живое approval другого owner. Resume не дублирует writes/commits/push и сохраняет failures. Оба fixtures выполняются через один автоматически запускаемый/присоединяемый service API без ручных executor sessions.

Нужны реальные exact-model invocations, реальные Git/worktrees/remotes и runtime confinement/review boundaries. Mocks полезны для unit controls, но не заменяют 3.3. Actual backend может честно оставаться NOT_CONFIRMED по FWE-012; unavailable/unsupported requested pair, substitution, неполные receipts или failed confinement блокируют fixture acceptance.

## 9. Задачи и traceability

Все 18 исторических task IDs сохраняются. Добавляются десять decimal IDs в существующие группы, всего 28 current tasks. Task 4.1 переоткрывается только при принятии D05 с сохранением прежнего checked snapshot и receipt в immutable history. Task 4.2 остаётся существующим fresh cumulative POST; 4.3/4.4 — поздние barriers.

Порядок: **1.6 → 1.7 → 2.8 → 2.9 → 2.10 → 2.11 → 2.12 → 2.13 → 3.3 → 3.4 → 4.1 → 4.2**, затем проверка существующих условий 4.3/4.4 и STOP. Автоматический следующий numbered change запрещён.

| Task | Роль | Результат |
|---|---|---|
| 1.6 | planning-architecture, gpt-6-astra/high | Coherent packet, applicability, supported-adapter preflight, hashes и одно D05 approval |
| 1.7 | independent-PRE, gpt-6-astra/xhigh | Fresh packet-confined PRE, полные receipts, verified planning checkpoint |
| 2.8 | tooling-tests, gpt-6-sol/high | Reception RED exits 1/2, failed streams, contradiction; RCA |
| 2.9 | tooling-tests, gpt-6-sol/high | Reception repair, targeted/full control GREEN, history reconciliation |
| 2.10 | tooling-tests, gpt-6-sol/high | Automation RED: host/roles/confinement/lease/recovery/transition |
| 2.11 | tooling-tests, gpt-6-sol/high | On-demand service, admission, authority transition, staging/adoption, leases/recovery |
| 2.12 | tooling-tests, gpt-6-sol/high | Transport RED/implementation/boundary GREEN |
| 2.13 | tooling-tests, gpt-6-sol/high | Automatic ingestion и typed serialized broker RED/implementation/GREEN |
| 3.3 | tooling-tests; fixture roles по явному D05 profile | Два actual independent E2E |
| 3.4 | tooling-tests, gpt-6-sol/high | Full applicable cumulative checks и implementation checkpoint |
| 4.1 | formal-Verify, gpt-6-astra/high | Новый clean formal Verify всего amended candidate |
| 4.2 | independent-POST, gpt-6-astra/xhigh | Fresh cumulative POST от original baseline |

Каждая implementation unit: RED → RCA для дефекта → implementation → targeted GREEN → applicable regression → checkpoint. После двух неуспешных fixes одного deterministic defect — STOP PATCHING и classified RCA. Publication failure блокирует переход, которому нужен verified checkpoint; diagnostic checkpoint остаётся non-ready.

Нормативная mapping всех новых scenarios:

| Requirement/scenarios | Tasks |
|---|---|
| FWE-011-S04–S07 | 2.8, 2.9, 3.4, 4.1, 4.2 |
| FWE-019-S01–S02 | 1.6, 2.10, 2.11, 3.3 |
| FWE-019-S03 | 2.10, 2.11, 3.3 |
| FWE-019-S04 | 1.6, 1.7, 3.4, 4.1, 4.2; существующие 4.3/4.4 |
| FWE-019-S05 | 2.10, 2.11, 3.3 |
| FWE-020-S01–S06 | 1.6, 2.10, 2.11, 3.3 |
| FWE-021-S01–S03 | 2.10, 2.11, 3.3 |
| FWE-022-S01–S02, S04–S05 | 1.6, 2.10, 2.11, 3.3 |
| FWE-022-S03 | 1.6, 1.7, 2.10, 2.11 |
| FWE-023-S01–S05 | 2.12, 3.3, 3.4 |
| FWE-024-S01–S05 | 2.13, 3.3, 3.4 |
| FWE-025-S01–S04 | 2.13, 3.3, 3.4 |

Существующие FWE-001–018 и их scenarios сохраняют исходную task mapping; 3.4/4.1/4.2 проверяют весь cumulative scope. Сейчас это planning links. Assertion IDs и actual run evidence должны появиться при разрешённой реализации и исполнении, не вымышляться в draft. IDs FWE-019–025 и добавленные scenario IDs не пересекаются с inline sources; actual candidate collision/parser audit обязателен в 1.6.

## 10. Приёмка и проверки

Acceptance требует фактических adapter/preflight receipts для Windows-host/WSL boundary, positive/negative canaries, exact approved/requested/invoked pair, complete streams, двух E2E, source-bound metrics/render, broker recovery и всех прежних обязательных controls. Отсутствующая backend attestation не является универсальным blocker.

OpenSpec — isolated exact 1.14.0, strict change/all-spec validation; global 1.14.1 не заменяет его и не изменяется. Нужны full direction unit/BDD/integration/actual temporary-Git/adversarial tests, schema/content/link/traceability/render/hash checks, applicable root lint/type/build/boundary checks и product/frozen/lockfile/vendor preservation. Windows-host/WSL enforcement проверяется на заявленной связке, не выводится из Linux-only unit tests. Historical cached 20/20 применимы только при доказанном source/toolchain/config match. `check:all`, native rerun, remote CI и branch protection остаются NOT_RUN/NOT_CONFIGURED, пока не исполнены/наблюдены; unavailable required check блокирует closure.

Task 4.1 проверяет полный amended scope и исправленную reception. Task 4.2 использует fresh independent v1.1 run и cumulative diff от `98f387f96b51b0ad139e3507c376ff1c3e8dec09`; старый или focused POST D05 не сертифицирует. Все candidate/packet/request/plan/control/toolchain/authority bindings и freeze receipts обязательны. Новый FAIL требует scoped repair и необходимых повторных checks/Verify/POST, не расширяет scope автоматически.

## 11. Оценки

Это диапазоны инженерного времени, не обещания срока или PASS:

| Работа | Tasks | Оценка |
|---|---|---|
| Подготовка, validation, D05 и fresh PRE | 1.6–1.7 | 8–20 ч |
| Небольшой reception repair с RED/RCA | 2.8–2.9 | 6–12 ч |
| Service/admission/confinement/lease/recovery | 2.10–2.11 | 20–40 ч |
| Полный bounded transport | 2.12 | 6–12 ч |
| Automatic ingestion и broker | 2.13 | 12–24 ч |
| Два actual E2E | 3.3 | 10–20 ч |
| Cumulative checks | 3.4 | 4–8 ч |
| Fresh Verify и POST | 4.1–4.2 | 8–16 ч |

Собственно automation workload 2.10–2.13 + 3.3: **48–96 ч**. Reception repair отдельно: **6–12 ч**. Общая сумма: **8–20 + 6–12 + 48–96 + 4–8 + 8–16 = 74–152 ч**, то есть 9,25–19 восьмичасовых рабочих дней. Ожидание человека/provider, установленные environment blockers, повторные repair cycles и поздние 4.3/4.4 сюда не включены. Feasibility непроверенного authority transition или confinement не гарантируется.

## 12. Human boundary

Открыто одно материальное решение: принять или отклонить точный D05 package, включающий authority revision, неизменную model matrix, два fixture grants, bounded host/broker/runtime contract и policy constants. Уже действующие model/host/remote permissions повторно не запрашиваются. Controller автоматически готовит роли, проверки, права, evidence и последующие routine launches. Новое человеческое решение возникает только при фактическом материальном изменении scope/spec/permission/destination/visual acceptance, а не для каждого task или session.

Real owner adoption выполняется позже по owner checkpoints с verified registration, approved scope, existing host grant и точными old/new hashes. Успех supplier/fixtures не означает миграцию Routing/UI/Repo Core. Требуемые текущие gates и решения продолжают ограничивать 4.3/4.4 в рамках существующего closure authorization. Main merge, foreign adoption, OS privilege expansion и следующий numbered change этим draft не разрешаются.
