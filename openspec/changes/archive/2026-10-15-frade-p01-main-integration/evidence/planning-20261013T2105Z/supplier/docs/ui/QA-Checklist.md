# UI compliance checklist

Используется для любого UI-change. Галочка означает реальную проверку. Неотмеченный пункт не превращается в PASS. N/A требует причины.

Change / commit / guide version / environment / viewport / DPR / fonts / date:

| Проверка | Статус: PASS / FAIL / BLOCKED / NOT_RUN / N/A | Evidence / причина |
|---|---|---|
| Approved scope и PRE gate | | |
| Applicable FDS/A11Y IDs | | |
| Canonical tokens, без цветовых литералов в features | | |
| Generated CSS соответствует JSON | | |
| Контраст затронутых text/control/focus/status состояний | | |
| Shared components / единая семья иконок | | |
| Light + dark + HC + forced-colors | | |
| Compact + comfortable + coarse pointer | | |
| Hover / focus / selected / disabled / read-only | | |
| Loading / error / empty / no-results / offline при применимости | | |
| Keyboard-only основной сценарий и отмена | | |
| Screen-reader names/states/announcements | | |
| Focus entry, trap, return, no clipping | | |
| Targets ≥24; coarse ≥44; исключения конкретизированы | | |
| Resize / text zoom / reflow / localization | | |
| Reduced-motion; feedback соответствует реальному результату | | |
| Dirty/selection/draft сохранены при переходах | | |
| Repository bound / standalone semantics сохранены | | |
| Visual baseline проверен, не перезаписан автоматически | | |
| Required project checks / interaction tests | | |
| POST gate / evidence integrity | | |
| CI/required checks реально включены либо LOCAL_ONLY | | |

Итог: PASS / FAIL / BLOCKED. Наличие обязательного NOT_RUN запрещает общий PASS. Укажите owner/reviewer из реального проекта и список remaining issues.

Visual review: визуальная иерархия очевидна; активный редактор является центром; выделение предметно; текст ровно расположен; название/путь не теряются; экран приятно воспринимается при длительной работе; декоративные эффекты не мешают точной геометрии.
