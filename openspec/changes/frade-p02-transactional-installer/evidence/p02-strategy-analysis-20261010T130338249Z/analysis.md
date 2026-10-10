# P02: оценка стратегий перед объёмной реализацией

Дата UTC: 2026-10-10T13:03:38.249Z. Owner: codex/frade-ui-design-contract, C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade; common E:/dev/codex/frade/.git. Исходный checkpoint6f7efb1ebb9a14457d8b3b01441cfdbb7a5397e6; program origin98f387f96b51b0ad139e3507c376ff1c3e8dec09; P02 baseline0ecaf44938382bd8daa7d512887dda8a8ee9b372. Guide v1.0.

Основание — прямое указание пользователя перед дальнейшим runtime capability proof/Main интегрированием оценить варианты оптимизации и выбрать траекторию. Новый точный текст root AGENTS правила пока не обнаружен в доступных main/UI/Routing V2/common-workflow worktrees; вопрос об источнике отправлен. Чужие product/process файлы не переносились, AGENTS не заменён. Применение пользовательского указания не ждёт Routing gate. Точная policy adoption, её hash/commit и дополнительные требования будут сверены после получения источника.

Это анализ исполнения текущего approved scope. Он не изменяет proposal/design/spec, обязательные MUST, resource limits, reviewer model, frozen controls или task acceptance criteria. PRE по этой стратегии ещё NOT_RUN; результат анализа не равен разрешению непроработанного runtime bootstrap и не равен POST/verify/P02 closure.

## Фактическая исходная точка

- P02 tasks3/9,2.2IN_PROGRESS. Реализованы archive/schema validator59, portable protocol43, native89, deployment9, host transport26: всего226. Последние test и BDD каждый226PASS; type/lint/TSbuild/boundaries/UI compliance/strictPASS. Исторические FAIL неизменны.
- Factory/runtime capability proof/Main binding/dev initial/rebuild/start отсутствуют. Native query намеренно сообщает runtimeProof NOT_VERIFIED; установщик, журнал, transaction/recovery/IPC/Extensions UI не реализованы. Выполненные component checks не дают capability certificate.
- Цена текущих проверок из точных execution receipts: полный test63.993s, BDD66.819s; targeted host26 10.769s; type2.939s, lint5.297s, boundaries0.991s, UI compliance28.388s; последний desktop build61.384s. Это wall elapsed по timestamps, не profiler; параллельные времена нельзя складывать в календарный срок. Источник observations.json содержит raw hashes/commands/paths.
- Полный parallel-file run222:221PASS/1FAIL (старый handoff5s timeout). Sequential file execution дала222PASS затем226PASS при прежних assertions/timeouts. CPU/CLR contention согласуется с наблюдением, но единственная причина отдельно не профилировалась.
- Самый дорогой риск — позднее обнаружение несогласованной capability/bootstrap/Main/recovery границы. Несколько минут CI-команд — только часть стоимости; заранее исключаем новые циклы scope/algorithm repair.

## Критерии выбора

Сначала отсеиваем варианты, нарушающие утверждённые контракты. Между допустимыми выбираем минимум ожидаемого критического пути: implementation + диагностика + rework + необходимые checks/reviews. Приоритеты: сохранность old/current bytes и dirty work; отсутствие outside-root effects; реальный supported Windows/Electron proof; ранняя проверка архитектурных стыков; достаточное покрытие при минимуме повторов. Не оптимизируем число закрытых checkbox или скорость получения формального PASS. Численного глобального optimum без профиля и вероятностей дефектов не заявляем. Рассмотрены классы практических альтернатив, а не бесконечное множество возможных программ.

## Сравнение вариантов

| Вариант | Выгода | Стоимость/риск | Решение |
| --- | --- | --- | --- |
| A. Продолжать по отдельным primitives, полный test+BDD/build/review после каждого маленького изменения | Локальная обратная связь | Повторная широкая проверка и checkpoints, Main/transaction стык обнаруживается поздно | Не основная траектория; targeted RED/GREEN сохраняется |
| B. Сразу написать весь installer+UI и затем один большой gate | Меньше промежуточного оформления | Максимум поздних security/state/recovery дефектов; нарушает обязательные PRE/TDD при непроработанной границе | Отвергнут |
| C. Риск сначала, затем законченные функциональные срезы с ранним Main/Electron proof | Главные неопределённости разрешаются до большого объёма; каждый срез проверяет реальный стык | Требует точного bootstrap/lifecycle design и дисциплины checkpoint | Выбран |
| D. Параллельная реализация factory, journal, Main и UI разными writers в этом checkout | Потенциальное ускорение набора кода | Общие interfaces, index/manifests/контроли; гонки и поздняя несовместимость; concurrent writers запрещены | Отвергнут. Параллелим только независимые безопасные checks/reads |
| E. Node-only fs fallback или более слабая durability/confinement модель | Меньше native работы | Уже воспроизведён no-follow/directory-sync недостаток; нарушает accepted backend | Отвергнут, не новая архитектурная опция внутри P02 |
| F. Смена поставляемого backend на иной SDK/язык/процесс либо перенос installer на поздний этап | Может упростить часть кода | Выбрасывает verified native work, меняет scope/build/API или цель P02; новый decision/PRE, неизвестная стоимость | Не выбирать без новых доказательств и решения человека |
| G. Повторно использовать готовые tests/ports/P01 primitives и убрать лишние pipeline повторы | Малый риск и меньше затрат | Нельзя выдавать исторический PASS за проверку изменённого control/source | Включено в C с exact hashes/applicability |
| H. Кэш compiler fixtures/артефактов и tuning concurrency | Может уменьшить startup/Csc стоимость | Ошибка cache key скрывает drift; большие shared caches нарушают ownership; parallel-file уже давал FAIL | Вторичная опция после measurement, не условие старта Main |
| I. Снизить model/reasoning или заменить independent review машинными checks | Дешевле/быстрее reviewer | Противоречит P02 plan gpt-6-sol/xhigh и независимому read-only gate | Отвергнут без отдельного решения; текущая пара сохранена |

## Выбранная траектория C+G

Работа остаётся в одном P02; нижние срезы — внутренние checkpoints, не новые numbered changes и не обход P02 archive gate.

| Срез | Результат и exit criteria | Связь с существующими задачами |
| --- | --- | --- |
| S0. Закрыть критические решения до кода | Конкретная capability/bootstrap/ownership/disposal/deployment схема, mapping к approved scope; свежий applicable PRE PASS по exact Sol/xhigh. Если нужен новый write root/command/исключение — точное решение человека до production |2.2; prerequisites2.3 |
| S1. Runtime capability + настоящий Main | Одно Main-authorized root; verified shipped asset; actual bounded proof и fail-closed factory; bind/dispose; Main startup/shutdown, dev initial/rebuild/build/start. Capability VERIFIED только в доказанном поддержанном контексте; не обещать готовый installer |2.2; новый lifecycle proof |
| S2. Вертикальный install/recovery срез | Простая compatible Light+Dark fixture проходит реальный staging → validation → journal7phases/reserve8/8MiB → registry/presentation coordination → commit/cleanup. Контролируемые failure и реальные kill/reopen OLD/NEW показывают сохранность, no project writes |2.2+2.3; task не закрывается до полного объёма |
| S3. Полный lifecycle | Invalid update, enable/disable/remove/retained rollback, stale revisions/ACKs, dirty/veto participants, locked cleanup, capacity boundaries и ambiguous recovery на том же coordinator |2.3; consumer части2.4 |
| S4. Extensions UI на работающем клиенте | Actual install/details/actions/diagnostics и P01 fallback; original mounted dirty editors. UI states/media/keyboard + Light/Dark/HC×compact/comfortable/screenshots; отдельное human visual acceptance |2.4+UI часть3.1 |
| S5. Cumulative closure | Required package/root/general/P01/BDD/security/a11y/visual, OpenSpec verify, автоматический cumulative POST Sol/xhigh, archive/push; STOP beforeP03 |3.1–3.3 |

Минимальный ранний Main slice выявляет отсутствующий/неверно размещённый asset, несовместимый lease с P01 settings и shutdown leak до написания UI/journal. Он не выставляет verified capability по одному ACK, не обходит recovery-before-paint и не открывает installer API раньше proof. До journal Main подключает только доказанный backend lifecycle с честной недоступностью дальнейших операций.

## Неопределённости S0, которые надо закрыть первыми

1. Где и как создаётся owned runtime capability fixture в рамках единственного authorized userData/extensions root; чем bootstrap proof отличается от package/state effect, для которого обязателен durable intent. Нельзя молча добавить второй root, произвольную Node запись, новую protocol operation или независимый authoritative journal.
2. Что именно runtime доказывает: supported NTFS/root identities, exclusive writes, flush/publish/readback, handle release и confinement. Native89 source/artifact proof, live capability probe и Main/dev/start deployment — разные evidence; один cannot заменять другой. Query NOT_VERIFIED нельзя переименовать по одному положительному ответу.
3. Остановка helper/timeout/UNKNOWN во время proof, stale own fixture versus unknown object, bounded cleanup и fresh-session recovery. Никакого удаления по одному prefix или blind retry.
4. Main source/protocol/hash trust anchor и fixed ../extension-filesystem resolution; init/recovery-before-first-paint и window/quit/rebuild disposal; unsupported backend diagnostics не должны заявлять установленные choices без данных.
5. Как точно доказать реальное dev/start lifecycle без production debug API и без изменения frozen Electron/Vite/CI/P01 tests. Использовать новые approved tests и own Temp profile; security assertion не зависит от mock успешного capability.

Эти вопросы не объявлены уже обнаруженным SPEC_CONFLICT и не разрешены этим анализом. Они проверяются на существующем design в S0; несовместимость или расширение scope требует точного decision, а не локальной заплатки.

## План проверок без потери качества

- На воспроизведённый дефект: deterministic RED → RCA → production repair → targeted GREEN; прежние STOP/no-patch-loop действуют. Новый code slice также meaningful TDD, не только module-missing или mirror tests.
- В локальном цикле выбирать релевантные tests/fixtures явно runner selector, фиксировать selected coverage и NOT_RUN остального. Не test.only/skip, не снижение timeout/assertion/tolerance. Полный suite остаётся обязательным и нужен сразу при риске пересечения или новом regression.
- После согласованного функционального slice/изменения общей transport/root/lease/state-machine границы: required complete service test+BDD, affected type/lint/build/boundaries; полный desktop lifecycle при Main/build changes. Не откладывать обнаруженный applicable FAIL к S5.
- General/root/check:all и cumulative P01/UI/media/visual не исключаются; запуск на стабильном интегрированном candidate и раньше при затронутом общем контракте. В конце все required checks должны относиться к актуальному candidate/control hashes; historical results не маскируют drift.
- test и test:bdd сегодня запускают те же пять файлов. Локально не дублировать оба после каждой строки; на required checkpoint выполнить оба реальных commands и сохранить оба receipts. Alias не считать двумя прогонами.
- Параллелить независимые type/lint/read-only boundaries там, где нет общих output writers. Native build, copy, helper tests, desktop dev/rebuild и работа с одной output tree последовательны. FileParallelism=false сохраняется, пока измерение/контроль не обоснуют альтернативу.
- Compiler cache — только возможная будущая scoped оптимизация: exact source/compiler/args/platform key, own fixture lifetime, fresh process/root/session для каждой атаки, реальный build/drift negative. Не общий cache между worktrees и не утверждение ускорения без замера; freeze оригинальных controls сохраняется.
- Automatic PRE/POST: минимальный достаточный immutable packet current source/contracts/tests/evidence и required historical blockers/decisions. Не отправлять unchanged372PNG при infrastructure-only review вместо релевантных protocol/fs/Main files. Не урезать completeness, raw events или confinement ради скорости. Candidate/dashboard/index/HEAD frozen до receipt. Model/effort точно P02 PRE/POST gpt-6-sol/xhigh, actual backend/effort отдельно NOT_CONFIRMED.
- Checkpoint commit/push — после законченного согласованного среза либо честного blocker checkpoint. Не отдельный production commit на каждую диагностическую строку. Preserve dated raw FAIL/RCA; canonical status/evidence pointers обновляются после событий, без backdating.

## Условия пересмотра стратегии

Новый реальный security/state correctness defect, contract conflict, повторный deterministic FAIL после двух repairs, unsupported runtime, новый supplier API или необходимость нового root/command/SDK → STOP своего scope и RCA/decision/revalidation. Не ждать Routing completion: Routing не supplier P02. Низкая производительность без defect → измерение конкретного bottleneck; tuning concurrency/cache только после него. Reviewer findings не меняют контракт автоматически.

## Статус и прогноз

ANALYSIS: COMPLETE. STRATEGY: C+G SELECTED для исполнения в текущем authorized scope. EXACT_NEW_RULE_ADOPTION: NOT_LOCATED. S0 precise runtime/Main implementation PRE: NOT_RUN. Новых production изменений/тестовых PASS нет. Tasks3/9, capabilityNOT_VERIFIED, cumulative POST/verify/archiveNOT_RUN; READY_FOR_VERIFY:NO.

Календарный ETA и обещанный процент ускорения не установлены: ещё открыта bootstrap/lifecycle схема; времена commands не равны сроку engineering. После S0/PRE и первого actual Main/dev proof можно оценить остаток по закрытым рискам и measured check duration. Оптимизация применяется к порядку, повторениям и раннему выявлению integration defects, а не к сокращению acceptance criteria.
