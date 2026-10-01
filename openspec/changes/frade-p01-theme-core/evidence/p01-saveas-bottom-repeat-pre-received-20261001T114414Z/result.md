**Повторный PRE выявил один блокер: принятый CSS-only план не может выполнить обязательный focus/keyboard-контракт нижних контролов.**

Проверены только SaveAs readiness и lower pinned-frame chrome. Внутри пакета согласованы ветка `codex/frade-ui-design-contract`, baseline `98f387f96b51b0ad139e3507c376ff1c3e8dec09` и оба точных SHA принятия. Все 1377 файлов совпали с манифестом; 64 перенесённых артефакта — с provenance. Проверены четыре OpenSpec-артефакта, AGENTS, guide/themes spec, BDD/traceability, bridge, тесты, pinned CSS/JS и сохранённые runtime-доказательства. Полные vendor-функции совпали с исходником по указанным UTF-16-диапазонам. Предыдущий недостаток необходимых входов устранён.

**Блокер — SPEC_CONFLICT / ABSTRACTION_BOUNDARY, с последствием для тестов.**

- [design.md:190](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/saveas-bottom-repeat-pre-20261001T113202Z-prepared/packet/openspec/changes/frade-p01-theme-core/design.md:190) запрещает изменение действий/DOM-семантики, одновременно требуя различимого фокуса. A11Y-003/005/007 в [стайл-гайде](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/saveas-bottom-repeat-pre-20261001T113202Z-prepared/packet/docs/ui/Frade-UI-Style-Guide.md:292) остаются обязательными.
- [Полные конструкторы](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/saveas-bottom-repeat-pre-20261001T113202Z-prepared/packet/openspec/changes/frade-p01-theme-core/evidence/p01-lower-vendor-full-functions-20261001T111912Z.json:44) создают div с click/gesture-обработчиками без focus-семантики. [Фактическое наблюдение](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/saveas-bottom-repeat-pre-20261001T113202Z-prepared/packet/openspec/changes/frade-p01-theme-core/evidence/p01-lower-focus-observation-20261001T112450Z/result.json) подтверждает: у всех 60 узлов DOM-свойство `tabIndex=-1`, атрибут `tabindex` отсутствует, прямой фокус не получен, включая видимые контролы.
- `:focus-visible` этого не исправляет. Добавление focusability, клавиатурной активации и соответствующей семантики выходит за принятое разрешение. Проверка CSS вместо реального focus-пути ослабила бы обязательный oracle.

Минимально необходимо отдельное принятое scope-решение на клавиатурную семантику **именно этих нижних контролов**: владелец interaction-адаптера, разрешённые пути, навигация/активация, доступные имена и lifecycle. Затем — согласование OpenSpec/BDD и новый PRE. Текущее принятие не разрешает такую реализацию или четвёртое исключение.

Attributes-only workload сохраняет XML/file/view/undo/selection/preferences, но sequential navigation в нём **NOT_RUN**. Ранние 30 Tab остались в `mxTypingShim` и изменили selection; сохранённый диагностический FAIL корректен и не является регрессией ремонта темы.

**SaveAs: блокеров не обнаружено.** В свежих fixture оба пути новые; [atomicJson](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/saveas-bottom-repeat-pre-20261001T113202Z-prepared/packet/apps/desktop/src/main/workbench.ts:27) выполняет write → sync → close → rename. Поэтому `existsSync` здесь — корректное предусловие чтения полного файла. Исходные actions, roots/order/identity, relative paths, reopen, SaveAll, dirty Remove/Cancel и JSON-assertions сохраняются. ENOENT и успешный неизменённый повтор представлены отдельно.

Неблокирующие рекомендации для последующего RED:

- Расширить `readUiConsumers`, классификацию `control` и text-zoom coverage; исключить успешный результат при пропавших потребителях.
- Измерять реальные fg/bg/border, иконки, active/hover/focus, compact28/comfortable36/width24/coarse44, clipping/occlusion и 200% text на трёх viewport.
- Сохранить приватный prefix и `.geTabContainer` перед каждым control-selector. Проверить rollback/disposal, пересоздание vendor DOM и media transitions; любой inset — только owned DOM/CSS с сохранением scale/translate и всех семантических инвариантов.

Сохранённый root-прогон подтверждает exit0, Draw215/desktop71 и source538 unchanged; свежие strict/BDD/compliance/diff успешны. Они не удостоверяют всех UI consumers. Исходный chrome FAIL6/6 — предмет ремонта, отдельным PRE-блокером его не считаю.

Рецензент ничего не изменял; сборки/тесты — **NOT_RUN**. Три исключения и consumer-owned readonly inspection сохранены; routing не является prerequisite. Tasks — 5/10; delta implementation — NOT_RUN; visualApproval — NOT_APPROVED; full verification/cumulative POST/archive — NOT_RUN. После разрешения конфликта требуются PRE, постоянный unit/Electron RED до ремонта, targeted GREEN и свежий полный regression. P02 не начинается.

GATE_STATUS: FAIL