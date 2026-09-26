# Tasks

## 1. Baseline пилота и границы пакетов

- [x] 1.1 Подготовить изолируемый fixture-loader для KA, схем и docs с настраиваемым исходным путём; записать manifest файлов/хешей и подтвердить baseline 22 файла, 138 записей, 19 типов, не изменяя оригиналы (KA-001, WB-005).
- [x] 1.2 Зафиксировать точный commit/release VSCode, Windows/theme/font/zoom, эталонные снимки и матрицу элементов/жестов с измеренными размерами и допусками; проверить, что каждый пункт WB-001–004 имеет источник и способ сравнения.
- [x] 1.3 Создать пакеты adapter-sberea-yaml, metamodel-config, ui-navigator, ui-inspector, ui-workspace с публичными exports и зависимостями по design.md; добавить положительные/отрицательные boundary-проверки, выполнить frozen install, typecheck и проверки архитектурных границ.
- [x] 1.4 Оформить проверяемую привязку всех сценариев шести спецификаций к будущим тестам и инструкции запуска пилота в docs/ka-workbench; проверить уникальность requirement/scenario ID и отсутствие пропущенных сценариев в реестре.

## 2. Импорт метамодели и правила проверки

- [x] 2.1 Реализовать loader-port и registry entities/$defs/$rels в metamodel-config с явно выбранным v2025 и legacy tech_params; проверить циклы/отсутствующие определения и детерминированную сборку всех 19 типов (KM-001, KM-002).
- [x] 2.2 Реализовать обратимое соответствие внешних типов внутренним namespace:Type, атрибутов-ссылок и источников имени; проверить round-trip исходных type/ID/reference значений и отсутствие изменения идентичности при переименовании (KA-002, KM-001).
- [x] 2.3 Добавить необходимые общие контракты и проверку композиции allOf/anyOf/oneOf/if/then, pattern и additional attributes в metamodel-domain/compiler; проверить каждый используемый конструктивный случай и отрицательные fixtures без изменения поведения существующих моделей (KM-002, KM-003).
- [x] 2.4 Построить effective field metadata с группами, русскими подписями и help из schema/docs по заданному приоритету; проверить вложенные поля, обязательность, безопасное отображение текста, конфликтующие описания и неизвестные поля (KM-001–003).
- [x] 2.5 Привязать результат компиляции к версии/отпечатку всех входных определений; проверить изменение fingerprint при смене схемы и отсутствие материализации defaults при чтении (KM-004, KA-003).
- [x] 2.6 Документировать формат профиля, правила импорта, источник tech_params и ограничения диалекта; проверить примеры через публичные API и выполнить тесты/consumer-typecheck пакетов метамодели.

- [x] 2.7 Реализовать именованные наборы метаописания с folderPath/relative entries и host-проверяемым выбором пути; проверить внешнюю папку, относительные пути от workspace, перенос одинакового содержимого с неизменным fingerprint и отсутствие записи в YAML; документировать профиль sberea (KM-005, SB-001).
- [x] 2.8 Реализовать staging/preview/activation выбранного набора с проверкой совместимости, новой model generation и согласованным сохранением настроек; проверить невалидный candidate, отмену, dirty/in-flight/outcome-unknown, ошибку записи настроек и независимость соседнего репозитория (KM-006).

## 3. Чтение KA и граф репозитория

- [x] 3.1 Реализовать профиль sberea и обход imports в adapter-sberea-yaml с containment, visiting/visited и ресурсными пределами; проверить повторные imports, циклы, отсутствующие файлы, malformed YAML, symlink escape и отсутствие скрытого усечения (KA-001).
- [x] 3.2 Реализовать чтение словарей сущностей, сохранение provenance, стабильную repository identity и отчёт всех разделов, включая sber и неизвестные коллекции; проверить полноту baseline и дубликаты ID (KA-001, KA-002).
- [x] 3.3 Проецировать ссылочные атрибуты и parent в канонические связи, сохраняя integrations отдельными объектами; проверить adjacency, циклы, неразрешённые внешние ссылки и согласованное обновление объекта/производных связей (KA-002, NAV-001).
- [x] 3.4 Подключить sberea adapter к RepositorySession через реестр adapterKind с point/query/paging/metadata/diagnostics; проверить прохождение 138 объектов через страницы по 100, устаревшие курсоры и явные capabilities, включая ограничения derived relation writes (KA-001, DS-002).
- [x] 3.5 Расширить adapter conformance и документацию примерами открытия KA; прогнать read-only contracts на реальных временных YAML и подтвердить неизменность хешей файлов после открытия/закрытия.

- [x] 3.6 Реализовать регистрацию adapterKind sberea отдельно от native и возможность инъекции другой YAML-фабрики; проверить одновременный dispatch двух форматов, неизвестный kind и отсутствие выбора адаптера по одному расширению; документировать extension contract (SB-001).

## 4. Валидация изменений и запись в исходный YAML

- [x] 4.1 Ввести generic opt-in repair policy в публичных контрактах и repository-application: сравнивать полные baseline/prospective diagnostics с offending values на одной ревизии; проверить допустимую правку описания, исправление ошибки, новую ошибку и недопустимое переиспользование кода старой ошибки, сохранив строгие native-проверки (KA-005).
- [x] 4.2 Реализовать attribute diff и изменение исходного YAML-узла с обратным преобразованием ссылок; проверить scalar/nested/list edits, удаление optional значения, null/empty/zero/false, неизвестные поля, соседние записи, комментарии, CRLF/BOM и no-op без записи (KA-003, KM-003).
- [x] 4.3 Реализовать guarded single-file commit с lock/stage/hash guards/recovery journal и подтверждёнными ревизиями; проверить stale object/file/model, ошибку rename, неподдерживаемые aliases/tags и multi-file atomic request без частичной записи (KA-004).
- [x] 4.4 Реализовать reconciliation и восстановление после прерывания; проверить завершение отдельного writer-процесса до/после замены файла, сохранность recovery evidence и отсутствие повторной мутации при потерянном подтверждении (KA-004, INS-003).
- [x] 4.5 Добавить watchers и согласованное перечитывание data/model/import sources; проверить внешнее изменение, временную порчу и исправление YAML, закрытие session и освобождение ресурсов (KM-004, DS-003).
- [x] 4.6 Обновить руководство адаптера и scoped BDD/contracts для KA; выполнить тесты записи на временной копии, сравнить хеши нетронутых файлов и подтвердить отсутствие регрессий native v1/v2.

## 5. Backend-сессия и транспорт Desktop

- [x] 5.1 Расширить repository-api/runtime-contracts версиями metadata/diagnostics/source-tree/events и ограничениями payload; проверить runtime-decoding запросов и ответов, pagination, generation/revision attribution и malformed/oversized input (DS-002).
- [x] 5.2 Перенести adapter/model/session/index composition из Main в runtime-node/Utility; сохранить выбор разрешённых корней в Main и проверить реальные IPC native v1/v2 и KA, а также запрет renderer path/permission injection (DS-001).
- [x] 5.3 Реализовать backend request lifecycle с timeout/cancel/close и repository/session/model generation guards; проверить удаление и повторное открытие корня во время чтения, late replies, падение Utility и отсутствие auto-replay записи (DS-002, DS-003).
- [x] 5.4 Передавать события changes/model/reload/health через проверяемый preload API; проверить порядок, gap-resync, unsubscribe и отсутствие callback после закрытия (DS-003).
- [x] 5.5 Документировать публичный desktop client, разрешённые корни и семантику неизвестного исхода; проверить примеры через consumer-typecheck и реальные Electron transport tests.

- [x] 5.6 Реализовать реестр независимых сессий по repositoryId и настройки метаописания через ограниченные host-команды; проверить A/B с одинаковыми objectId, cross-root injection, сбой загрузки одного корня, удаление одного корня, shared-folder watchers и model-generation isolation; обновить описание транспортного контракта (DS-004, KM-005–006).

## 6. Оболочка рабочего пространства по VSCode

- [x] 6.1 Реализовать общие theme tokens, типографику, Codicons и интерактивные состояния в ui-workspace по зафиксированному эталону; сохранить upstream attribution и проверить базовые компоненты визуальными/geometry-тестами (WB-001).
- [x] 6.2 Реализовать title/command area, Activity Bar, sidebar, editor area, diagnostics panel и status bar с разделителями; проверить drag-resize, минимальные размеры, скрытие/показ и узкое окно на согласованных размерах (WB-002).
- [x] 6.3 Реализовать versioned layout persistence с восстановлением при изменении экрана; проверить перезапуск, повреждённое локальное состояние и сохранение доступности контролов (WB-002).
- [x] 6.4 Реализовать preview/pinned/dirty tabs, перестановку и группы редакторов через общий registry; проверить single/double click, pin-on-edit, закрытие, drag-between-groups и общий черновик одного объекта (WB-003).
- [x] 6.5 Реализовать command registry, меню, tooltips, Ctrl+S/Save All/Ctrl+W/Ctrl+Tab/Ctrl+B/Escape и focus restoration; проверить keyboard-only и pointer interactions, включая фокус в поле формы (WB-004).
- [x] 6.6 Описать API интеграции workspace и матрицу текущего соответствия VSCode; выполнить component/browser tests группы и сохранить диагностические снимки для расхождений, не обновляя standalone Draw baseline.

- [x] 6.7 Реализовать versioned .frade-workspace и команды Add/Remove Repository, Open/Save Workspace As, labels/order; проверить сохранение всех root profiles, перебазирование относительных путей при Save As, дубликат физического корня, unavailable root и dirty Remove/Cancel без удаления данных; дополнить VSCode parity matrix и руководство workspace (WB-006–007).

## 7. Навигатор архитектуры

- [x] 7.1 Реализовать чистые tree projections по разделам/типам/parent и исходным файлам в ui-navigator; проверить все 138 объектов, orphan/cycle buckets, перекрёстные ссылки и отсутствие бесконечного разворачивания (NAV-001).
- [x] 7.2 Реализовать tree/treeitem UI с раскрытием, выделением, фокусом, стрелками, Home/End/Enter, поиском и reveal; проверить жесты по VSCode-матрице и различие открытия папки/объекта (NAV-002).
- [x] 7.3 Подключить paging, выбор объекта и сохранение expansion/projection/selection по стабильным ключам; проверить reload, переименование, удаление выбранного объекта и устаревший курсор (NAV-003).
- [x] 7.4 Документировать projection/client API и правила идентичности узлов; выполнить unit/browser/visual tests навигатора и подтвердить отсутствие Node/backend dependencies.

- [x] 7.5 Реализовать multi-root навигатор с независимыми expansion/status/settings, context actions и поиском с контекстом корня; проверить оба дерева, одинаковые имена/ID, ошибки метаописания только одного корня, reveal и сохранение порядка после перезапуска; обновить browser/visual tests и документацию (NAV-004).

## 8. Карточки и редактирование атрибутов

- [x] 8.1 Реализовать metadata-driven поля в ui-inspector: scalar/text/number/enum/boolean/date, nested objects и списки; проверить исходные типы значений, необязательные поля и дополнительные атрибуты без ручного YAML/JSON-редактирования (INS-001, KM-003).
- [x] 8.2 Реализовать reference picker с фильтрацией целевых типов, поиском/страницами и переходом к объекту; проверить существующие, отсутствующие и запрещённые цели, сохраняя исходные unresolved значения (INS-001, KM-002).
- [x] 8.3 Подключить draft registry и адресную/условную валидацию; проверить переключение A/B/A, общие drafts в editor groups, dirty tracking, invalid numeric input и изменение метамодели (INS-002, KM-004).
- [x] 8.4 Реализовать сохранение с revision/idempotency, no-op, read-only и outcome-unknown состояниями; проверить повторное нажатие Save, ошибки backend, потерю подтверждения, reconciliation и сохранение всех untouched attributes (INS-003).
- [x] 8.5 Реализовать Save/Discard/Cancel при закрытии вкладки, удалении корня, переключении метаописания, замене workspace и quit, а также base/local/disk conflict review; проверить Cancel, неудачный Save и отсутствие скрытой перезаписи (INS-004).
- [x] 8.6 Документировать правила карточек, defaults и save outcomes; выполнить component/browser tests и визуальную матрицу вложенных полей, ссылок и ошибок.

- [x] 8.7 Добавить UI настройки папки метаописания с вводом пути, Browse, именованными наборами и переключением с preview/Save/Discard/Cancel; проверить разные модели для одинаковых objectId A/B, целевой repositoryId команды Save, отсутствие model bleed и сохранение соседних черновиков; документировать настройки карточек (INS-005, KM-005–006, WB-007).

## 9. Сквозная композиция Desktop

- [x] 9.1 Подключить workspace/navigator/inspector к реальному desktop client и открытию KA через host dialogs; проверить полный путь UI -> Utility -> Core -> adapter на отдельной копии данных, сохранив доступ к Draw (DS-001, WB-005).
- [x] 9.2 Синхронизировать дерево, вкладки, карточки и панель диагностик после Save/external reload/model reload; проверить clean refresh, dirty conflicts, удаление объекта и сохранность expanded state (NAV-003, DS-003).
- [x] 9.3 Реализовать Save All с независимыми репозиториями/исходными файлами и последовательными ревизиями общего файла; проверить смешанные success/conflict/error результаты без ложной общей атомарности (KA-004, INS-003).
- [x] 9.4 Выполнить Electron UI acceptance для загрузки всех типов, раскрытия дерева, открытия карточек, scalar/nested/list/reference edits, сохранения и повторного запуска; подтвердить дисковые значения и исходные хеши нетронутых файлов (WB-005).
- [x] 9.5 Дополнить инструкции пользователя открытием оригинала через UI, сохранением, конфликтами и восстановлением; проверить команды/действия на собранном Desktop и записать фактические результаты со ссылками на тесты.

- [x] 9.6 Выполнить реальный Electron UI сценарий с двумя sberea-копиями и native-корнем: Add, смена порядка, Save/Open Workspace, редактирование одинаковых objectId, Ctrl+S при выделении другого корня, Save All и Remove/Cancel; подтвердить сохранение только в нужные файлы (SB-001, NAV-004, INS-005, WB-006–007, DS-004).
- [x] 9.7 Выполнить UI сценарий переноса папки метаописания и переключения именованных наборов только для A: успешный набор, несовместимый набор, missing path, dirty Cancel и restart; проверить прежнюю модель после отказа, независимость B и неизменность исходных YAML; записать evidence в приёмку (KM-005–006).

## 10. Итоговая приёмка пилота

- [x] 10.1 Выполнить полную VSCode parity matrix для окон 1280x850, 1600x900 и узкого layout, включая resized/expanded/dirty/error states; устранить расхождения сверх зафиксированных допусков и приложить сравнения (WB-001–004, WB-006–007).
- [x] 10.2 Выполнить openspec validate frade-ka-workbench-pilot --strict, frozen installation и pnpm check:all с подключёнными новыми наборами; подтвердить unchanged Draw baselines, native v1/v2 compatibility и отсутствие архитектурных нарушений.
- [x] 10.3 Проверить трассировку каждого сценария к выполненным assertion-bearing тестам, manifest полноты и preservation evidence на копии KA; записать итоговый acceptance report с фактическими ограничениями. Не отмечать пилот завершённым при пропущенном real-data UI прогоне и не закрывать незавершённый frade-repo-core.
