# Приёмка KA Workbench — 25 сентября 2026

Статус: **PASS, 59/59 задач пилота выполнены**. Финальная версия проверена полным циклом, включая актуализацию host session scope. Целевой пользовательский путь реализован: открыть существующий KA, найти объект, редактировать карточку, сохранить исходный YAML и увидеть результат после перезапуска.

## Фичи и статус

| Фича                                        | Статус      | Подтверждение                                                                                                |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Открытие KA без конвертации                 | Реализовано | 22 файла данных, 138 объектов, 19 типов; открытие карточки каждого типа через UI                             |
| Метамодель v2025 и исторические tech_params | Реализовано | registry definitions/references, композиция ограничений, schema/docs labels, fingerprint                     |
| Дерево и поиск                              | Реализовано | все 138 объектов, две проекции, клавиатура, parent/cycle/orphan, стабильные ключи                            |
| Карточки и типизированные поля              | Реализовано | scalar/number/enum/boolean/date, nested/list/reference; missing/null/empty/zero/false                        |
| Сохранение исходного YAML                   | Реализовано | реальный UI → preload → Utility → Core → adapter; перечитывание диска; preservation assertions               |
| Несколько репозиториев                      | Реализовано | два KA с одинаковыми ID и native; Ctrl+S пишет активную карточку; Save All: 2 успеха и 1 конфликт            |
| Workspace                                   | Реализовано | Add/Remove/Cancel, rename/reorder, Save/Open/Save As и перенос относительных путей                           |
| Именованные наборы метаописания             | Реализовано | Browse/input, preview/activate/cancel, перенос папки, incompatible/missing candidate, rollback settings      |
| Независимость моделей A/B                   | Реализовано | изменённая модель A, прежняя модель B и сохранённый черновик B; команды host сохраняют актуальную generation |
| Черновики, вкладки и группы                 | Реализовано | preview/pin, общий draft, реальное перетаскивание между группами, Save/Discard/Cancel                        |
| Внешние изменения и восстановление          | Реализовано | clean refresh, base/local/disk review, model reload, Utility crash, reconciliation без replay                |
| Оболочка и Draw                             | Реализовано | Dark Modern/Codicons, панели и shortcuts, persistence; утверждённые Draw snapshots совместимы                |

## Выполненные проверки

- `pnpm check:all`: **PASS, exit code 0**. Включает lint/typecheck всех 20 пакетов, **874 теста пакетов**, отдельный BDD-этап, **19 контрактов границ**, сборку и четыре boundary-check script, **214 браузерных тестов Draw** и **7 Electron-сценариев**.
- `openspec validate frade-ka-workbench-pilot --strict`: PASS.
- `pnpm install --frozen-lockfile`: PASS, pnpm 12.6.0 / Node 24.18.0, Windows.
- `node scripts/check-ka-traceability.mjs`: PASS, **32 requirements / 48 scenarios**, без пропусков и дубликатов. [Реестр](scenarios.json) связывает каждый сценарий с выполненными тестами с assertions. Структурная трассировка дополнена реальным выполнением этих наборов.
- Среди тестов: sberea adapter 48, native adapter 44, Repository Core application 216, runtime-node 15, metadata domain 139, compiler 131, config 3. Native-v1 и native-v2 проверены также через настоящий Electron IPC.

Полный вывод финального прогона: [check-all.txt](evidence/check-all.txt). Начальные прогоны выявили чрезмерную конкуренцию файловых/Git-процессов на Windows; test-пакеты теперь запускаются максимум по два одновременно, интеграционные ожидания имеют явные разумные лимиты. Проверки и assertions не отключались.

## Данные и сохранность

[Manifest](evidence/workbench/roundtrip/manifest.json) фиксирует 47 исходных файлов: 22 data YAML и 25 файлов метаописания/документации. [Preservation](evidence/workbench/roundtrip/preservation.json) подтверждает изменение ровно одного файла в тестовой копии — `KA/v2023/application/endpoints.yaml`; остальные 46 файлов сохраняют SHA-256. После UI-прогона все 47 оригинальных файлов сверены с исходным manifest и не изменились.

Тесты открывают копии через настоящие элементы интерфейса. Подмена используется только для результата системного выбора папки, чтобы не автоматизировать Windows Explorer; чтение, редактирование, Save и повторное открытие выполняются через UI. Они не заменяются прямыми IPC-вызовами.

Отдельный сценарий сохраняет текст, число, вложенное поле и ссылку системы; Save All сохраняет два объекта одного файла A последовательно и оставляет конфликт B без перезаписи. Проверены перенос схемы, разные модели одинаковых ID, отклонение несовместимого набора, исправление недоступной папки и перезапуск.

## Визуальные свидетельства

Эталон и допуски: [VSCode parity matrix](vscode-parity.md). Измеряются content sizes 1280×850, 1600×900 и 850×650, размеры основных панелей, нахождение панелей внутри viewport, resize sidebar до 370 px и восстановление. Исправлены влияния глобальных Draw-стилей на высоту main и отступы sidebar. Снимки просмотрены; baseline standalone Draw не обновлялся.

- [Workbench 1280×850](evidence/workbench/editing/workbench-1280x850.png), [1600×900](evidence/workbench/editing/workbench-1600x900.png), [850×650](evidence/workbench/editing/workbench-850x650.png).
- [Конфликт](evidence/workbench/editing/conflict.png), [несколько корней](evidence/workbench/multi-root/multi-root.png), [независимые модели](evidence/workbench/metadata/metadata-independent.png).
- [Дерево всех типов](evidence/workbench/roundtrip/ka-explorer.png), [dirty-карточка](evidence/workbench/roundtrip/ka-card-dirty.png), [подтверждённое сохранение](evidence/workbench/roundtrip/ka-card-saved.png).

## Границы пилота

Редактируются существующие объекты. Одна атомарная запись охватывает один исходный файл; Save All явно показывает независимые результаты. Неизвестные разделы и данные с aliases/tags остаются доступны для чтения, но не предоставляют неподдерживаемую мутацию. При неопределённом исходе запись автоматически не повторяется. Несохранённые черновики живут в памяти окна; настройки, размеры, дерево и вкладки сохраняются между запусками.

Workbench воспроизводит применимые элементы и жесты выбранного VSCode-эталона; Git/debug/extensions/accounts/AI и текстовый редактор VSCode не входят в этот пилот. Пилот не закрывает и не архивирует отдельный незавершённый `frade-repo-core`.

Руководства: [пользователь](README.md), [клиент и транспорт](client.md), [метамодель](metamodel.md), [адаптер](adapter.md).

## Открытие исходного KA

После приёмки исходный KA открыт через тот же интерфейс; карточка «Маркетплейс» доступна для редактирования. Приложение оставлено запущенным. [Снимок](evidence/workbench/original-ka-open.png) и [запись открытия](evidence/workbench/original-ka-open.json) фиксируют путь и повторную сверку всех 47 исходных файлов: открытие не изменило их содержимое.
