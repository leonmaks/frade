**Совмещённый план имеет один новый блокер PRE: клавиатурный путь обрывается в меню нижней панели.** Новое человеческое разрешение на lower keyboard adapter учтено; прежний запрет accessibility DOM semantics больше не является основанием отказа.

Проверены AGENTS, guide v1.0/themes spec, четыре OpenSpec-артефакта, BDD, traceability, execution-context/status, bridge, тесты и закреплённый vendor. Необходимых входов для данного вывода достаточно.

Целостность пакета подтверждена:

- Все **1 396 файлов** совпали с манифестом по размеру и SHA256; неучтённых файлов нет.
- Все **64 перенесённых артефакта** совпали с provenance.
- Полные vendor-функции совпали с исходником по UTF-16-диапазонам; JS/CSS соответствуют также vendor manifest.
- Обе записи принятия связывают разрешение с точными тремя SHA256: SaveAs `b57e035f…99dfa`, palette `e829e596…129b7`, keyboard `458361c9…0874`.
- Bridge и три затрагиваемых тестовых файла совпадают с сохранёнными raw-before. Baseline `98f387f…` отделён от текущего HEAD `c2fa3ba…`; публикация checkpoint не означает завершения P01.

**Блокер B01 — SPEC_CONFLICT / ABSTRACTION_BOUNDARY; следствие для A11Y-005/007 и interaction-тестов.**

[Исходные обработчики нижних меню](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/lower-keyboard-pre-20261001T124847Z-prepared/packet/apps/desktop/vendor/drawio/js/app.min.js:16156) создают `mxPopupMenu`: общее меню страниц и меню выбранной страницы с duplicate/remove/rename/move.

[Реализация mxPopupMenu](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/lower-keyboard-pre-20261001T124847Z-prepared/packet/apps/desktop/vendor/drawio/js/app.min.js:342) создаёт строки `tr`, привязывает gesture-обработчики и выполняет callback после согласованных down/up. Меню и подменю добавляются в `document.body`, **вне `.geTabContainer`**. Эти строки не получают focusability и клавиатурную навигацию/активацию. Существующие мосты этого не компенсируют; найденная обработка стрелок в поиске Sidebar относится к отдельному search-input.

Следовательно, Enter/Space на нижней кнопке сможет открыть меню, но не обеспечит выполнение его действий клавиатурой. Синтетический жест по пункту потребовал бы нового владельца клавиатурной навигации за пределами разрешённого subtree.

Это прямо активирует условие STOP в [принятом keyboard-предложении, строка 28](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/lower-keyboard-pre-20261001T124847Z-prepared/packet/openspec/changes/frade-p01-theme-core/decisions/p01-frame-lower-keyboard.proposed.md:28). Исключение для legacy overlay placement не освобождает от доступности этих действий.

Минимальный ответственный scope для согласования: временное владение **только меню и подменю, открытыми разрешёнными нижними контролами**, в том же bridge. Нужны точная привязка к opener, semantics/capability, навигация, оригинальная gesture-активация, отмена/возврат фокуса и teardown. Общая переработка vendor menus, замена callbacks и прямые domain API для этого не требуются. Такой scope необходимо согласовать и повторно проверить **до production-реализации**.

**SaveAs: новых блокеров нет.** В свежем fixture оба target новые; [atomicJson](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/lower-keyboard-pre-20261001T124847Z-prepared/packet/apps/desktop/src/main/workbench.ts:27) выполняет write → sync → close → rename. Поэтому два `existsSync`-предусловия подходят для чтения опубликованного полного файла. Исходные JSON assertions, действия, DTO, writer и tolerances сохраняются.

Неблокирующие рекомендации и обязательные последующие проверки:

- RED должен проходить полный путь «открыть нижнее меню → выбрать пункт/подменю → выполнить или отменить», а не проверять только появление popup.
- Проверить F6 из фактического idle `mxTypingShim`, отдельно от настоящего редактирования/IME; blanket-запрет всех textarea может закрыть вход с canvas.
- Проверить exactly-once, реальные hidden/disabled состояния, focus-only navigation, выход Tab, восстановление атрибутов и пересоздание DOM.
- Расширить consumer/control/text-zoom измерения; проверить реальные icon paint, контраст, clipping/occlusion, шесть theme/density сочетаний, coarse44, forced/reduced, 200% и три viewport.
- Сохранить poisoned API fixtures и отдельно проверять неизменность семантики при presentation/navigation и ожидаемые оригинальные эффекты deliberate activation.

Сохранённый runner показывает root PASS **Draw215/desktop71**, benchmark **118,5 мс**, planning strict/BDD/compliance PASS и исправленный formatting-only diff PASS. Это доказательства до новой реализации. Palette FAIL6/6 и focus0/60 — предмет ремонта; прежний 30-Tab FAIL/RCA сохранён и не считается успешной навигацией.

Рецензент выполнял только чтение, статический анализ и проверку хешей; сборки/тесты — **NOT_RUN**. Три исключения сохранены, четвёртого нет; routing не становится prerequisite. P01 остаётся **5/10**, permanent RED/production delta — **NOT_RUN**, visual baseline — **NOT_APPROVED**, verify/cumulative POST/archive — **NOT_RUN**. После устранения B01 нужны повторный PRE, RED до production, targeted GREEN и свежий full root/compliance. P02 не начинается.

GATE_STATUS: FAIL