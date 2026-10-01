# Frade UI style guide v1.0 — implementation package

Визуальное направление: личная архитектурная мастерская; workbench VS Code, выразительная графитовая Dark и равноправная Light, контрастный режим, точная геометрия и осмысленный feedback.

## Состав

| Файл | Назначение |
|---|---|
| Frade-UI-Style-Guide.md | Анализ выбора, обязательные UI/UX правила, эмоциональное направление, компоненты, темы и gates |
| Themes-and-Plugins-Spec.md | Hot themes + расширения как VS Code по пользовательской модели; native API Frade; P01–P07 |
| AGENTS-UI.fragment.md | Секция для включения в существующий AGENTS, без перезаписи текущих правил |
| CODEX-Implementation-Prompt.md | Запуск аудита, OpenSpec и последовательной реализации |
| QA-Checklist.md | UI compliance report template |
| ui-contracts.feature | BDD-контракты; требуется адаптация и step definitions |
| tokens.json / tokens.css | Встроенные light/dark/high-contrast палитры и density |
| generate-tokens.py / check-tokens.py | Генерация, drift check, проверка заданных пар контраста |
| theme.schema.json | Native JSON theme schema v1 |
| Frade-Light.theme.json / Frade-Dark.theme.json | Примеры theme data для макета и будущего resolver |
| frade-workshop-themes.frade-extension | ZIP fixture декларативного theme package с двумя темами; ожидает будущий installer |
| token-validation.json / package-validation.json | Реальные результаты проверок пакета |
| preview-validation.json | Ограничения проверки интерактивного макета |

## Внедрение

1. Распаковать в `E:\dev\codex\frade\_input\frade-ui-style-guide-v1\`.
2. Передать Codex содержимое `CODEX-Implementation-Prompt.md` в контексте существующего репозитория.
3. Дождаться read-only audit и approved OpenSpec PRE gate; затем выполнять последовательные этапы.
4. Канонические документы после внедрения должны лежать в `docs/ui`, а токены/компоненты — в фактическом shared UI-layer. `_input` не является постоянным источником правил.

Локальные проверки пакета: `python generate-tokens.py`; `python check-tokens.py --report`. Python 3, только стандартная библиотека. Сохраняйте generated CSS в согласованном pipeline. Color literals внутри валидируемых theme packages разрешены; запрет относится к feature-компонентам.

## Проверено и ограничения

Проверено: совпадение палитр по role IDs, generated CSS drift, 102 пары контраста в трёх темах; отрицательные проверки плохого контраста и ручного изменения generated CSS; структура ZIP sample и наличие двух декларативных палитр. Проверки не являются аудитом WCAG готового приложения.

Исходники Frade в этой сессии недоступны. UI-компоненты, plugin runtime, install service, registry/marketplace и CI enforcement в приложении не реализованы. Browser rendering макета заблокирован отсутствием исполняемого браузера и неудачной загрузкой; screenshots не включены и визуальный gate не объявлен PASS. Интерактивный образец в разговоре — демонстрация направления, не production-код.

Палитра и размеры — проектные решения Frade. Логотип не заменяется. Существующие approved scope, frozen files и последовательные gates сохраняются. Модель расширений похожа на VS Code, однако полной API-совместимости со всеми исполняемыми VS Code extensions нет; theme import задан отдельным контрактом.
