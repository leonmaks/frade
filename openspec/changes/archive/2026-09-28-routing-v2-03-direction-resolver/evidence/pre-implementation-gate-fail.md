CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: PRE_IMPLEMENTATION
GATE_STATUS: FAIL

Проверено фактическое состояние репозитория, включая все untracked planning files. Файлы репозитория, CURRENT_CHANGE.md и tasks.md не изменялись. Commit и implementation не выполнялись.

BLOCKERS:

Approval checkpoint не привязан к сохранённому PRE PASS.
В verifyFrozenGate (/E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:540) проверяются ACTIVE_CHANGE, PHASE: PLANNING и исходный BASE_COMMIT, но отсутствует проверка PRE PASS внутри утверждаемого checkpoint и связанного review evidence. Проверка live-поля PRE_IMPLEMENTATION_GATE этого не заменяет.

Подтверждение:
встроенный R03 freeze self-test (/E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:2025) создаёт checkpoint без PRE PASS и считает его approved;

дополнительный in-memory probe исполнил неизменённые функции gate с моделируемыми Git/FS snapshots: checkpoint содержал PRE_IMPLEMENTATION_GATE: PENDING, live state — PASS; результат: verifyFrozenGate → true, scopeFindings → [].

Дополнительно не проверяется допустимость diff от R02 closing commit до выбранного planning checkpoint. Поэтому запрещённое изменение, включённое в новый baseline, может исчезнуть из последующего scope diff.

Необходимо: связать approval с сохранённым review/checkpoint, проверять происхождение и planning-only состав checkpoint; добавить отрицательные executable fixtures для PENDING/отсутствующего approval и переноса baseline, скрывающего запрещённые изменения.

План property tests опирается на отсутствующую зависимость.
/E:/dev/codex/frade/openspec/changes/routing-v2-03-direction-resolver/design.md:78 утверждает: fast-check already installed; /E:/dev/codex/frade/openspec/changes/routing-v2-03-direction-resolver/design.md:7 исключает необходимость новой зависимости.

Фактически разрешение fast-check через createRequire от packages/draw/package.json возвращает MODULE_NOT_FOUND. Поиск в manifests и lockfiles не обнаружил зависимости. Существующие R01 properties используют собственный DeterministicGenerator.

Установка зависимости потребует изменений за пределами разрешённых R03 trees. Необходимо в PLANNING согласовать инструмент, необходимые dependency/config paths и tasks. Это противоречие плана фактическому репозиторию, а не ограничение sandbox.

Заявленная проверка WORKTREE modes отсутствует.
verifyFrozenFile (/E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:563) сравнивает modes approved tree, HEAD и INDEX, но для WORKTREE проверяет только isFile() и текст. Executable mode рабочего файла не сравнивается.

In-memory probe с approved/HEAD/INDEX 100644 и WORKTREE regular file 100755 был принят. Это проверка логики функции с моделируемыми snapshots; реальный chmod не выполнялся.

Необходимо: реализовать заявленный контракт modes с явной платформенной политикой и отрицательным self-test. Требование содержится в /E:/dev/codex/frade/openspec/changes/routing-v2-03-direction-resolver/design.md:86 и gate prompt.

Mutation testing DirectionResolver не отражён в planning tasks.
Master spec §74 (/E:/dev/codex/frade/docs/routing-v2/drawio-routing-master-spec.md:2290) прямо предусматривает mutation testing для DirectionResolver с target mutation score >= 90%. В активных design/tasks нет соответствующего инструмента, задачи, команды или явного решения об этапе выполнения.

Необходимо: согласовать это требование с планом проверки до implementation. Обычные unit/property tests сами по себе его не закрывают.

SPEC_ALIGNMENT:

Proposal/spec/design/tasks описывают одну capability: выбор направлений без построения маршрута. Для требований delta присутствует traceability к тестовым, implementation и verification tasks.

Повторное использование R01 geometry и R02 boolean masks соответствует фактическим API. Существенных противоречий в рассмотренных формулах quadrant/gaps не найдено. Полное согласование планирования блокируют замечания выше.

SCOPE_ALIGNMENT:

HEAD и planning baseline совпадают: 2b6619627e3e744007b06251a05dad86e7bce634.
Фаза — PLANNING, PRE — PENDING, implementation — NOT_STARTED.
Обнаружены ровно 10 изменённых/untracked paths: два tracked process-control файла и восемь untracked planning/control файлов.
Staged diff пуст.
Каталоги R03 production и tests отсутствуют.
Изменений R01/R02 source/tests, main specs, архивов и vendor reference не обнаружено.

Текущий фактический scope соблюдён. Будущий dependency scope для fast-check не согласован.

ARCHITECTURE_ALIGNMENT:

План сохраняет направление зависимостей:

direction → terminal/perimeter → geometry → model

DirectionResolver не получает ответственность за jetty, route patterns, perimeter projection, renderer, persistence или R04+.

Проверены фактические Rect/Point с invariant space brands, NoInfer, geometry validation, rectangle relations, portConstraint, effectivePortConstraint, fixed/floating APIs. Расширение предыдущих слоёв для заявленной direction capability не требуется.

Блокеры относятся к process-control enforcement и полноте planning.

TEST_COVERAGE_ALIGNMENT:

План требует:

4 × 15 × 15 = 900 случаев с независимыми expected pairs и membership assertions;

отдельные fixtures для осей, overlap, containment, разных размеров, fixed endpoints, углов, singleton masks, zero extents и EPSILON boundaries;

strict tsc negative fixtures для mixed/widened spaces;

шесть properties по минимум 5000 accepted cases, seed 0xFAD003, отдельный учёт attempted/accepted/rejected и replay;

неизменённые R01/R02 regressions.

Это содержательный тестовый контракт. Его исполнение пока блокируют отсутствующий fast-check и пробел mutation-testing плана.

R03 unit/property/compiler suites не запускались: это будущие implementation tasks.

NUMERICAL_CONTRACT_ALIGNMENT:

Проверены и согласованы:

draw.io quadrant numbering, включая оси и совпадение центров;
zero bands abs(value) <= EPSILON, нормализация в положительный ноль;
различие signed directional gaps и неотрицательной separation;
overlap для touching и положительного gap до EPSILON включительно;
допустимость zero extents без perimeter projection и деления на размеры;
finite input/derived-result validation, отсутствие quantization;
target direction как outward side;
singleton precedence, фильтрация fixed candidate, вертикальный приоритет углов;
R02 precedence: connection mask → binding mask → ALL.

Области translation/reflection заданы через входную геометрию, а не результат resolver. Исключённые ties/cancellation сохраняются как прямые fixtures. Безусловные IEEE-754 translation и source/target exchange свойства не обещаются.

REFERENCE_ALIGNMENT:

SHA256 pinned mxEdgeStyle.js совпал:

8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d

Для reviewer-проверки фрагмент исходного OrthConnector извлечён и исполнен в памяти без V2 imports. Все 900 базовых mask-пар дали допустимые одиночные направления; расхождений с буквальным массивным разбором preference rules не найдено.

Проверенные примеры:

 Случай                                          Reference      Правила R03
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━  ━━━━━━━━━━━━━
 Target справа                                   EAST/WEST      EAST/WEST
──────────────────────────────────────────────  ─────────────  ─────────────
 Target справа-снизу                             EAST/NORTH     EAST/NORTH
──────────────────────────────────────────────  ─────────────  ─────────────
 Обмен ролей предыдущего случая                  WEST/SOUTH     WEST/SOUTH
──────────────────────────────────────────────  ─────────────  ─────────────
 Совпадающие bounds                              NORTH/SOUTH    NORTH/SOUTH
──────────────────────────────────────────────  ─────────────  ─────────────
 WEST fixed source запрещён маской NORTH/EAST    WEST/NORTH     EAST/NORTH
──────────────────────────────────────────────  ─────────────  ─────────────
 Fixed source на 0.5 от WEST edge                WEST/NORTH     EAST/NORTH

Последние два различия соответствуют заявленным adaptations: mask membership и EPSILON вместо one-pixel matching.

Дополнительно выполнены 30 600 сравнений отражений reviewer-модели без fixed points на ограниченном целочисленном наборе: расхождений нет. Это проверка планируемых правил, не evidence готовой реализации или выполнения шести properties.

MACHINE_GATE_INTEGRITY: FAIL

Подтверждены работающие части:

независимый union BASELINE_TO_HEAD, STAGED, UNSTAGED, UNTRACKED;
NUL-delimited parsing;
rename old/new и copy destination;
cancellation и deletion/recreation fixtures;
positive controls, filenames с пробелами и Unicode;
независимые source snapshots HEAD/INDEX/WORKTREE;
проверки reverse/later/framework/legacy dependencies, cycles, symlinks и unmerged snapshots;
R03 scope и запрет product writes в PLANNING.

Но успешный результат установленного gate не покрывает блокеры approval/baseline и WORKTREE mode.

Фактически выполненные обязательные команды:

 Команда                                                        Результат
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 git status --short --branch                                    Проверен; только перечисленный planning/control scope
─────────────────────────────────────────────────────────────  ───────────────────────────────────────────────────────────────
 git diff --check                                               Exit 0; только предупреждения LF/CRLF
─────────────────────────────────────────────────────────────  ───────────────────────────────────────────────────────────────
 openspec validate routing-v2-03-direction-resolver --strict    Exit 0, valid
─────────────────────────────────────────────────────────────  ───────────────────────────────────────────────────────────────
 node scripts/routing-v2-architecture-gate.mjs --self-test      Exit 0, 425 assertions
─────────────────────────────────────────────────────────────  ───────────────────────────────────────────────────────────────
 pnpm run routing:v2:arch-gate                                  Exit 0; 10 changed paths, 56 source/test files, три snapshots

LEGACY_ISOLATION:

Legacy boundary и vendor reference остаются неизменёнными. План не вводит legacy fallback, framework dependencies или package-root export. R02 closing state и сохранённое POST evidence проверены; предыдущий change закрыт и архивирован.

NON_BLOCKING_RECOMMENDATIONS:

Явно закрепить fixture, что singleton selection не означает преждевременный fixed lock при построении preference rows. Такая альтернативная трактовка дала 72 расхождения в reviewer-проверке 900 случаев.

Дополнить NUL parsing self-tests Git paths с TAB/LF там, где платформа допускает создание таких fixtures.

Sandbox не помешал обязательным проверкам; расширение прав не выполнялось. Self-tests работали только со своими временными Git fixtures. Итоговый status репозитория совпадает с исходным.

READY_FOR_IMPLEMENTATION: NO

До нового независимого PRE review требуется устранить planning/process-control blockers. Implementation baseline этим отчётом не утверждён.
