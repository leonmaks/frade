# Codex: внедрить Frade UI design contract

Работай в существующем Frade, desktop на Electron. Входной пакет: `_input/frade-ui-style-guide-v1/`. Цель: сделать guide обязательным для любого нового UI-change и внедрить единую визуальную основу без изменения утверждённых доменных контрактов.

Дополнительно прочитай `Themes-and-Plugins-Spec.md`. Пользователь требует подключаемые на лету темы и модель расширений как VS Code. Добавь последовательные P01–P07 changes: theme resolver/preview → transactional installer → VS Code theme import → icon registries → isolated browser host → native contribution APIs → registry/profiles/policy. Light и Dark должны появиться одновременно. Полная API-совместимость с исполняемыми VS Code extensions не заявляется. Пример `.frade-extension` — fixture будущего installer, не готовая интеграция.

## Шаг 1 — read-only audit

Прочитай все применимые AGENTS.md, package manifests, OpenSpec config, approved changes, shared UI/theme layers и брендовые спецификации. Не считай рекомендуемые пути пакета реальными. Найди текущие иконки, overlay host, shortcuts, density, theme, forms, tree, tabs и diagram rendering.

Составь inventory существующего и mapping правил FDS/A11Y к коду. Определи разрешённые пути. Сохрани исходный commit и реальные screenshots ключевых экранов, если приложение запускается. Объясни ошибки окружения отдельно от ошибок UI. Не приписывай реализации функции из макета.

## Шаг 2 — proposal / design / tasks / specs

Создай отдельный OpenSpec change по установленным командам реального проекта. В нём:
- Канонические пути guide, tokens, components, checks и evidence.
- Интеграция `AGENTS-UI.fragment.md` в существующий AGENTS без удаления правил.
- Theme resolver light/dark/HC/system, density compact/comfortable, persistent settings.
- Компонентный контракт и эмоциональная направленность «личная архитектурная мастерская».
- План постепенной миграции; текущие routing/Repo Core gates сохраняются.
- Автоматические checks: token generation drift, контраст пар, feature-level color literals с разрешёнными исключениями, accessibility и visual regression для выбранных экранов.
- BDD и meaningful TDD с адаптацией `ui-contracts.feature`.

Если старое утверждённое требование pixel-perfect VS Code конфликтует с новым guide, явно предложи обновление визуального контракта. Не объявляй новый guide автоматически принятым старым gate. Выполни PRE review/validation в установленном порядке.

## Шаг 3 — основа

После PRE PASS перенеси guide/checklist в docs, включи AGENTS fragment, адаптируй JSON generator к проектному pipeline, внедри токены и resolver в общий UI-layer. Не внедряй новую полную UI-библиотеку без анализа текущих primitives. Сохрани существующие brand assets; не выдумывай логотип.

Выполни проектные typecheck/lint/tests, token checks и applicable accessibility tests. До утверждения визуальной миграции не изменяй массово feature-компоненты. Представь POST evidence.

## Шаг 4 — последовательная миграция

Отдельные этапы: shell/basic controls → tree/tabs → forms/tables/LoV → Draw/flow manager → AI. Для каждого: утверждённый scope → PRE PASS → implementation → checks → POST PASS → verify/archive по проектным правилам. Не переходи к следующему этапу при незакрытом blocker.

Для Draw токены состояния интерфейса отделены от domain visualization и persisted semantics. Guide не разрешает менять routing algorithm, endpoints или инварианты. Для AI не обещай provider integration, которой нет: макет задаёт представление и контракт поведения.

## Шаг 5 — обязательность

Подключи UI compliance check в реально существующий CI. Если GitHub branch protection доступна и её изменение входит в authorized scope, настрой required checks; иначе подготовь точные инструкции владельцу и отметь `LOCAL_ONLY`/`NOT_CONFIGURED`. Не утверждай наличие merge protection без проверки.

Запусти контрольный отрицательный пример в изолированной временной fixture: недопустимый цвет / drift токенов должны приводить к FAIL. Удали fixture из production. Положительный пример должен проходить. Не меняй evidence задним числом.

## Отчёт

Покажи изменённые пути, guide version, applicable rules, проверки, screenshots затронутых экранов и оставшиеся несоответствия. PASS означает выполненные проверки; NOT_RUN/BLOCKED — реальные ограничения. Весь отчёт должен описывать окончательную реализацию и фактическое состояние, а не планируемые возможности.
