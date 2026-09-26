# Proposal

## Why

Диаграммы должны быть документами конкретного репозитория: храниться рядом с данными, открываться в общем редакторе и ссылаться на разрешённые объекты. Текущий отдельный Draw использует X6/JSON и не обеспечивает совместимость с моделью документов Draw.io.

## What Changes

- Создать служебное дерево `_diagrams` первым дочерним узлом каждого корня, с обычными вложенными папками и произвольными допустимыми файловыми именами.
- Реализовать создание, открытие, переименование и сохранение файлов диаграмм через scoped backend API, с защитой от выхода за корень и конфликтов внешней записи.
- Открывать диаграммы в общих preview/pinned/dirty вкладках и группах вместе с карточками; поддержать Save, Save All, Discard, Cancel, quit и восстановление.
- Удалить отдельный Desktop-режим Draw и его Activity Bar icon. Standalone X6 Draw и его regression suite сохраняются как отдельный существующий продукт.
- Встроить локальную фиксированную сборку Draw.io для редактирования `.drawio`/XML без преобразования в ограниченную X6-модель; документировать и проверить реальные границы совместимости.
- Предоставить добавление на диаграмму объектов только своего репозитория и явно подключённых внешних каталогов. Внешние источники задаются отдельным описанием, имеют собственную identity и не превращаются в соседний repository root.
- Хранить ссылки Frade как дополнительную XML-метаинформацию; обычные фигуры и внешние Draw.io-файлы остаются обычными диаграммами.

## Capabilities

### New Capabilities

- `repository-diagram-files`: дерево, файлы, scoped persistence, revision guards, безопасность путей и восстановление.
- `repository-diagram-editors`: общие вкладки и lifecycle диаграмм, удаление отдельного Desktop-режима, изоляция объектов и внешние ссылки.
- `drawio-document-compatibility`: локальный редактор, native XML roundtrip, matrix совместимости и ограничения.

### Modified Capabilities

Нет изменений опубликованного standalone `reusable-draw-package`: его X6/JSON API и geometry guarantees сохраняются. Новая интеграция заменяет только отдельный Desktop-раздел Draw из завершённого KA-пилота; сам пилот и незавершённый Repository Core не архивируются этим change.

## Impact

Затрагиваются repository-api, runtime-node, ui-navigator, ui-workspace и desktop Main/Preload/Renderer, новые UI/editor и файловые сервисы, workspace-профили внешних источников, интеграционные тесты и документация. В поставку входит закреплённая локальная сборка Draw.io с attribution и hash; сетевой сервис Draw.io для открытия и сохранения не используется. Серверные/облачные возможности Draw.io и сторонние плагины не входят в обещание файловой совместимости.

### Confirmed format split

- `.drawio`: original embedded Draw.io and native XML.
- `.frade`: Frade Draw with repository references, typed host events, NRT caption updates and navigation to object cards. The existing version-1 JSON gains optional validated node references; geometry and standalone behaviour remain backward compatible.
- Both engines use the same navigator, tabs, file revision guards and save/discard lifecycle. Neither format is silently converted into the other.

### Navigator insertion refinement

Replace both duplicate repository object panels with mouse dragging from the ordinary navigator. Show connected external catalogs there as well; preserve scoped references, model coordinates, undo and read-only restrictions.

### System notation refinement

Add configurable repository-system notation under Settings → Отображение элементов in both native editors, with live attribute refresh and an opt-out for Draw.io manual styling.

### Empty integration bundles

New gesture-created connections between scoped repository systems become explicitly tagged empty bundles in both engines. Configure the default #404040, width 1, no-arrow notation under element appearance. Flow membership editing is deferred to the next requested step.
