# Frade Themes & Extensions — SDD / BDD / TDD v1.0

Дата: 30.09.2026. Расширяет Frade UI Style Guide v1.0. Требование пользователя: подключаемые темы на лету и расширения с пользовательской моделью как у VS Code.

Статус: нормативная спецификация для реализации в существующем Frade; демонстрационные theme packages подготовлены. Runtime, installer, extension host и marketplace в приложении ещё не реализованы этой сессией. Desktop — Electron, web использует совместимое browser API.

## 1. Контракт «как VS Code»

Заимствуется модель: Extensions view → package manifest → contribution points → регистрация → выбор/активация → настройки → отключение/обновление/удаление. Theme picker предварительно показывает тему; Enter сохраняет, Esc возвращает предыдущую. Темы и icon packs не требуют выполнения стороннего JavaScript. Исполняемые расширения активируются через события и возвращают disposable registrations.

Это новый API Frade. Совпадение UX не создаёт совместимость с модулем `vscode`, его API, языковыми расширениями, native binaries или Microsoft Marketplace. Совместимость VS Code themes — явный import adapter с mapping и отчётом. Общая binary/API совместимость с расширениями VS Code не входит в v1: для неё необходим отдельный compatibility layer с подтверждённым coverage. Не рекламировать «все плагины VS Code работают».

Тема меняет presentation, а не workbench structure, density, business rules, endpoints, routing algorithms и persisted diagram semantics. Расширения используют общий UI contract Frade. Ни manifest, ни тема не разрешают произвольный CSS в основном renderer.

## 2. Обязательные возможности

| ID | Требование |
|---|---|
| EXT-001 | Встроенные Frade Light / Frade Dark / Frade High Contrast доступны offline и не удаляются. |
| EXT-002 | Тему можно установить и применить без перезапуска приложения и без закрытия редакторов. |
| EXT-003 | Любой change темы атомарен для shell, portals, Draw, AI, editors и открытых диалогов. |
| EXT-004 | Preview отменяется Esc и не записывает постоянную настройку; Enter подтверждает. |
| EXT-005 | Extensions view поддерживает install from file, enable/disable, update, rollback, uninstall, details и diagnostics. |
| EXT-006 | Color themes, file icons и product icons — независимые contributions и настройки. |
| EXT-007 | Ошибка темы/расширения сохраняет dirty editors, AI drafts, selections и domain data. |
| EXT-008 | Исполняемый plugin не исполняется в main/workbench renderer. API и capabilities версионированы. |
| EXT-009 | Импорт VS Code theme package декларативен; `main`, scripts и activationEvents из VSIX не запускаются. |
| EXT-010 | Установка, обновление и откат транзакционны; незавершённая запись восстанавливается после crash. |
| EXT-011 | Поддерживаются offline file install и корпоративный registry без публичного интернета. |
| EXT-012 | Диагностика сообщает реальный уровень совместимости и ошибки contribution/API. |

## 3. UX расширений

Activity bar получает общий раздел «Расширения», команда Ctrl+Shift+X через shortcut registry. Sidebar: search, установленные, доступные обновления, фильтры category/themes/icons/adapters/editors. Main editor — details выбранного пакета: имя, publisher, версия, происхождение, описание, contributions, permissions, compatibility, changelog, disable/update/uninstall/rollback. Error state принадлежит пакету, не всему интерфейсу.

Команды:
- `Preferences: Color Theme` / «Настройки: Цветовая тема» — chord Ctrl+K Ctrl+T.
- «Настройки: Иконки файлов», «Настройки: Иконки интерфейса».
- «Расширения: Установить из файла…», «Проверить обновления», «Отключить», «Удалить», «Откатить версию».
- «Разработчик: Диагностика расширений», «Открыть логи расширения».

Theme picker группирует light/dark/high contrast, показывает publisher, active indicator и совместимость. Стрелки дают live preview; Enter commit; Esc/cancel/outside dismissal rollback. При закрытии окна без commit постоянный выбор не меняется. Installer после установки theme package предлагает выбрать его тему, но не активирует её неожиданно. При удалении активного пакета показать replacement theme; после подтверждения использовать built-in того же kind и убрать выбранный ID. Uninstall не удаляет пользовательские диаграммы или проектные файлы.

Profile имеет свой theme/icon settings и enabled-extension set. По умолчанию настройка уровня user/profile; workspace override MAY быть включён пользователем. Тема из непроверенного workspace не устанавливает пакет и не разрешает исполнение автоматически. Поддержать system mode с preferredLightTheme, preferredDarkTheme и preferredHighContrastTheme. Обе built-in light/dark поставляются на первом этапе.

## 4. Модель данных

```ts
type ExtensionId = `${string}.${string}`; // publisher.name; stable identity
type ThemeKind = 'light' | 'dark' | 'high-contrast';
type PackageKind = 'declarative' | 'browser';
type ThemeId = `${ExtensionId}/${string}`;
interface ExtensionRecord {
  id: ExtensionId;
  version: string; // semver
  packageHash: string; // SHA-256 of exact archive bytes
  source: { kind: 'file' | 'registry' | 'builtin'; uri?: string };
  enabled: boolean;
  kind: PackageKind;
  installState: 'staging' | 'installed' | 'updating' | 'failed';
  runtimeState: 'inactive' | 'activating' | 'active' | 'deactivating' | 'failed';
  grantRevision: number;
}
interface ThemeDescriptor {
  id: ThemeId; label: string; kind: ThemeKind;
  colors: Partial<Record<string, string>>;
  syntax?: object; // adapter-specific, validated independently
}
interface ResolvedTheme {
  id: ThemeId; kind: ThemeKind; revision: number;
  colors: Readonly<Record<string, string>>;
  compatibility: { recognized: string[]; ignored: string[]; repaired: string[] };
}
```

IDs не зависят от displayName, пути установки и версии. При обновлении неизменный ThemeId сохраняет пользовательский выбор. Разные версии одного ExtensionId не активируются одновременно в одном profile. Все callbacks и handles привязаны к extensionId + generation; callback старого поколения после update игнорируется с диагностикой.

## 5. Package manifest и тема

Native package — ZIP с расширением `.frade-extension`; корень содержит `package.json`, assets и declaration files. Native schema не равна VS Code package.json. Built-in sample `frade-workshop-themes.frade-extension` содержит обе темы и не требует кода.

```json
{
  "publisher": "frade",
  "name": "workshop-themes",
  "displayName": "Frade Workshop Themes",
  "version": "1.0.0",
  "engines": { "frade": ">=1.0.0 <2.0.0", "fradeApi": "^1.0.0" },
  "kind": "declarative",
  "capabilities": [],
  "contributes": {
    "themes": [
      { "id": "workshop-light", "label": "Frade Light", "kind": "light", "path": "themes/light.json" },
      { "id": "workshop-dark", "label": "Frade Dark", "kind": "dark", "path": "themes/dark.json" }
    ]
  }
}
```

Engine ranges в примере — проектный API baseline; после аудита согласовать с реальным versioning Frade. Semver проверяется настоящим range parser, не строковым сравнением. Publisher field — заявленное авторство, не криптографическая идентичность. Hash фиксирует целостность байтов, не доказывает доверие к издателю.

Theme JSON: `{ "kind": "dark", "colors": { "surface.base": "#181A1F" } }`. Разрешены только известные color role IDs и HEX `#RRGGBB` в native v1. Дополнительные неизвестные роли сохраняются в import diagnostics, но не инжектируются. Fonts, spacing, opacity, arbitrary CSS, URLs и JS в native color theme не разрешены. File icon SVG проходит sanitization; scripts/events/external links/foreignObject запрещены. Product icon glyph packs требуют отдельного валидатора и лицензионных метаданных.

## 6. Theme resolver и hot apply

Порядок разрешения для каждой роли:
1. Built-in полная палитра соответствующего kind.
2. Установленная enabled theme.
3. User глобальные color overrides.
4. User override для конкретного ThemeId.
5. Разрешённые workspace overrides, если пользователь включил их.

Preview выбирает candidate theme ID, затем применяет соответствующие overlays. Density, layout и editor lifecycle не участвуют в theme resolution. Forced-colors имеет финальный системный mapping поверх всего и не выключается пользовательским theme file.

`resolve` — чистая функция; строит полный immutable snapshot, валидирует типы и контраст, возвращает issues. У built-in темы все MUST-пары проходят. Внешняя тема с нарушением получает совместимый repaired snapshot: проблемные пары возвращаются к built-in fg/bg своей роли и kind; алгоритм повторяется до отсутствия нарушений. Fixed pair order + максимум 10 проходов; при отсутствии сходимости применяется полная built-in палитра и статус `FALLBACK`, исходные данные не перезаписываются. Итоговый отчёт содержит repaired roles. Недопустимую структуру пакета installer отклоняет целиком.

Registry разрешает stable ThemeId; ThemeService собирает snapshot; renderer transaction меняет root variables и theme metadata до paint; portals используют тот же root context; X6/SVG/canvas получают snapshot revision через renderer adapter и redraw в той же визуальной транзакции. Нельзя обновить только оболочку и оставить старый canvas. Если адаптер не готов, commit ждёт prepare-all; на отказ rollback previous snapshot. Запись setting происходит только после успешного commit всех участников.

События: `onWillChangeTheme({previous,candidate,revision})`, `onDidChangeTheme({snapshot})`, `onThemeChangeFailed({reason,revision})`. Обработчики не могут переписать domain data. Подписчик обязан обработать последнее поколение; быстрый выбор A→B→C коммитит C, late result A/B игнорируется. Browser fallback themes грузятся локально до first paint. Failed persistence возвращает предыдущий persistent выбор и понятную ошибку; preview не объявляется сохранённым.

Целевой performance contract: после загрузки пакета hot apply p95 ≤150 ms на согласованном benchmark workspace и hardware; результат измеряется. Package parsing выполняется вне interaction-critical renderer. Это проектный бюджет, не уже измеренный показатель. GPU effects не применяются ради theme transition.

## 7. Импорт тем VS Code

Поддержать `.json` / `.jsonc` theme и theme contributions из пользовательского `.vsix`. JSONC обрабатывается настоящим parser. ZIP разбирается без исполнения. `include` разрешён только внутри того же package root; traversal, циклы, ссылки наружу запрещены; include depth ≤16. Theme tokenColors сохраняются как данные и применяются только через выбранный editor adapter; без адаптера маркируются «Syntax highlighting не поддержан».

У VS Code больше цветовых ролей, чем у Frade v1. Следующий mapping — стартовый контракт адаптера, а не 100% визуальная эквивалентность:

| VS Code color role | Frade role |
|---|---|
| editor.background / foreground | surface.base / text.primary |
| sideBar.background | surface.panel |
| activityBar.background | surface.rail |
| foreground / descriptionForeground | text.primary / text.secondary |
| input.border | border.control |
| contrastBorder | border.control (только при наличии) |
| button.background / hoverBackground / foreground | action.primary / action.primaryHover / action.onPrimary |
| list.activeSelectionBackground / Foreground | selection.bg / selection.fg |
| list.hoverBackground | surface.hover |
| focusBorder | focus.ring |
| errorForeground | status.error |
| editorError.foreground / editorWarning.foreground / editorInfo.foreground | status.error / status.warning / status.info |

Где два source keys соответствуют одной роли, более специфичный key имеет приоритет: editor.foreground над foreground для editor token; глобальный text.primary использует foreground при наличии, иначе editor.foreground. Реализация MUST иметь явную таблицу key priority, не зависеть от порядка JSON. Разделение глобального и editor foreground MAY добавить отдельный токен в совместимом minor change до реализации.

`uiTheme`: vs→light, vs-dark→dark, hc-black→high-contrast. hc-light требует отдельного светлого HC base; до его реализации импорт возвращает `UNSUPPORTED_KIND`, не превращает его тихо в тёмный. Alpha HEX из VS Code должен композититься на определённой базовой поверхности по role registry; для неопределённого фона выдаётся unsupported role и используется fallback. Список неотображённых keys показывается в отчёте. Marketplace network integration проектируется отдельно; VSIX file import не требует обещать доступ к Microsoft registry или права перераспространения.

## 8. Extension lifecycle и транзакции

Install: `ABSENT → STAGING → VALIDATED → REGISTERED → INSTALLED`. Validation/commit failure → FAILED с очисткой staging; previous installed version сохраняется. Enable: `DISABLED → ENABLED → INACTIVE`; contribution регистрации доступны после enable, code активируется только по событию. Runtime: `INACTIVE → ACTIVATING → ACTIVE → DEACTIVATING → INACTIVE`; activation/crash → FAILED. Disable снимает registrations и завершает host; theme fallback — часть одной транзакции.

Update: скачать/скопировать в новый versioned dir → validate → compatibility/capability diff → prepare registrations → quiesce old host → swap registry pointer → activate new generation по необходимости → commit. Отказ до swap не меняет old; отказ после swap выполняет rollback snapshot/registrations, восстанавливает old generation. При добавлении capabilities требуется согласие перед их использованием; theme-only package не показывает бессмысленный permissions-dialog.

Uninstall: unregister → close/convert зависимые extension editors с защитой dirty data → fallback theme/icons → remove installed record → schedule package cleanup. Если extension editor нельзя безопасно сохранить/закрыть, uninstall BLOCKED с конкретным редактором; force removal не является кнопкой по умолчанию. Physical delete выполняется после commit и освобождения handles; Windows locks не оставляют ложный «удалено».

Install journal хранит transactionId, old/new registry snapshot и phase. После crash loader завершает чистку либо восстанавливает last committed state. Settings с отсутствующим ThemeId используют built-in и diagnostic; extension reinstall MAY восстановить preference, если это явный сохранённый wantedThemeId.

Archive limits v1: compressed ≤50 MiB, uncompressed ≤200 MiB, entries ≤10 000, expansion ratio ≤100, path depth ≤32. Это исходные engineering limits, изменяемые политикой в разрешённых пределах. Reject absolute paths, `..`, symlinks, case-insensitive duplicates, invalid Windows reserved names, embedded NUL и entries за пределами package root. Hash, validation и staged writes не изменяют workspace repository.

## 9. Native Frade plugin contributions

| Contribution | Контракт |
|---|---|
| themes | Данные цветовых ролей; нет code activation. |
| fileIconThemes / productIconThemes | Независимые icon registries, fallback на built-in, sanitization. |
| commands / menus / keybindings | Namespace extensionId; shared command service; понятные labels; конфликт shortcuts показывается. |
| viewsContainers / views | Activity bar/sidebar/panel; общий UI renderer Frade, tree/table data providers. |
| customEditors | Тип документа, lifecycle/dirty/save/undo, безопасное закрытие при disable. |
| configuration | Typed schema, default/scope, localization, миграция без потери настроек. |
| repositoryAdapters | Асинхронный Repository API через broker, versioning/cancellation, совместимость модели. |
| diagramTools | Команды над approved document model; транзакции и undo; не обходят routing contracts. |
| aiProviders | Broker secrets/network/context, cancellation/streaming; явный provider и формат результата. |
| colors | Namespaced color IDs с defaults для каждого kind и контрактом контраста. |

Для v1 arbitrary DOM/CSS injection в workbench запрещён. Custom UI получает schema-based компоненты общего Frade UI-layer. Если нужны webviews, это отдельный isolated contribution с CSP и message protocol; он не получает access к host DOM. Inspector, menus и notification templates остаются общими.

API surface: `commands.registerCommand`, `views.registerTreeProvider`, `editors.registerCustomEditor`, `configuration.get/update/onDidChange`, `themes.onDidChange`, `repository.read/proposeChange`, `diagrams.executeTransaction`, `ai.registerProvider`, `context.subscriptions`. Handlers async, DTO schema checked, requestId/cancellationToken/deadline, events revisioned. Returned `Disposable.dispose()` идемпотентен. Plugin deactivate MUST release subscriptions; host принудительно очищает leaks.

Activation events: onCommand, onView, onEditorType, onRepositoryAdapter, onAIProvider, onStartupFinished. Contribution registry доступен без code activation. Activation timeout v1 — 5 s; request timeout по API; failure не запускает бесконечный restart loop. После crash — explicit retry/disable и logs, editors сохраняют recoverable state.

## 10. Electron/web isolation

Theme data не требует extension host. Для browser plugins: dedicated sandboxed Electron renderer host, contextIsolation on, nodeIntegration off; plugin JS выполняется в Worker, получает schema-checked MessagePort API. Renderer session изолирована от workbench; navigation/window creation запрещены. CSP default-src none, script/worker sources только validated package protocol; direct network запрещена; web-версия применяет тот же worker/broker contract. Не экспортировать electron/Node/fs/process объект в preload.

Привилегированные операции остаются в main/service broker: scoped repository handles, разрешённые HTTP endpoints, keychain tokens, file picker, разрешённые writes. Capability list для browser runtime: repository.read, repository.proposeWrite, diagrams.edit, network.request (allowlisted origins), secrets.use (handles, не plaintext), notifications.show. Права не следуют из publisher string. Grants привязаны к identity/version policy и workspace trust. Для closed environment registry policy может запрещать исполняемые пакеты целиком.

Git/native DB adapters, которым нужны OS drivers, — trusted broker/service adapters, отдельно поставляемые и проверяемые. Не включать Node-runtime в общий browser plugin API ради одного adapter. Отдельный процесс сам по себе не является sandbox; если впоследствии вводится Node extension host, его доверительная модель проектируется отдельно. Проверка режима sandbox и IPC отправителей обязательна по Electron security guidance.

## 11. Каталог и корпоративная поставка

Frade registry имеет provider interface: list/search/details/download/checkUpdates. Источники: локальный каталог, корпоративный HTTPS registry, опционально публичный Frade registry. Package provenance и signature verification при наличии доверенных ключей — отдельные поля; unsigned file installs отображают настоящее происхождение. Нельзя имитировать Verified Publisher.

Online отсутствие/ошибка не блокируют built-in темы и установленные расширения. Offline install и export profile доступны без сетевых вызовов. Export profile содержит settings + extension IDs/versions/hashes/источники; не содержит secrets и private repo contents. Установка export требует резолва доступных пакетов, не обещает наличие пакета по одному ID.

Auto-update настраивается profile/policy. Пакеты с новыми capabilities остаются на старой версии до подтверждения. Version rollback использует сохранённую previous version; если её байтов нет, UI показывает невозможность, не обещает magic rollback.

## 12. Последовательность OpenSpec changes

| Этап | Результат | Обязательные проверки |
|---|---|---|
| P01 theme core | Registry, resolver, Light/Dark/HC/System, атомарная смена, preview | Unit/property resolver, state-preservation, theme visual matrix |
| P02 declarative installer | `.frade-extension`, schemas, journal, install/update/remove, theme packages | ZIP fixtures, failed transactions, crash recovery, missing IDs |
| P03 VS Code theme adapter | JSONC/VSIX theme-only import, mapping, diagnostics | known mappings, includes/cycles/path escape, unknown/syntax/alpha reports |
| P04 icon registries | File/product icons, fallback, profile settings | SVG validation, missing glyphs, scope disposal, light/dark/HC |
| P05 browser extension host | Worker/broker/DTO/capabilities/lifecycle | Isolation/IPC tests, denial, crash/timeout/disposal/generation |
| P06 native contribution APIs | Commands/views/settings/editors; domain adapters separately | Keyboard, theme inheritance, dirty save/disable, API version |
| P07 registry/profiles/policy | Corporate/offline/public providers, update/rollback/export | Offline, provenance, signatures, grants diff, policy enforcement |

После каждого: proposal/design/tasks/specs → PRE PASS → implementation → unit/BDD/integration/security/visual применимых частей → POST PASS → verify/archive. Не начинать P05 до готовности transactional P02. P06 domain contributions вводятся по отдельным контрактам Repo Core/Draw/AI. «По максимуму» задаёт полный roadmap; не отменяет последовательные gates.

## 13. BDD и TDD контракты

| Given | When | Then |
|---|---|---|
| Dirty diagram + AI draft | Подключён новый theme package | Выбор темы доступен; данные не изменены; restart не требуется |
| Active Light | Picker preview Dark → Esc | Все участники возвращаются к Light; setting не записана |
| Theme A loading | Выбраны B затем C | Committed C; late A/B не перезаписывают snapshot |
| Light + dark preferences | OS меняет mode | system переключает kind; explicit selection сохраняется |
| Active external theme | Пакет отключён/удалён | Атомарный fallback; dirty editors сохранены |
| Installed v1 | v2 invalid/capabilities denied | v1 и registrations остаются работоспособны |
| Theme includes escape path/cycle | Import | Reject/diagnostic; без исполнения и записи вне root |
| VSIX contains `main` | Theme-only import | Только data contributions; JS никогда не запущен |
| Low contrast external palette | Resolve | Совместимый repaired snapshot и отчёт изменённых ролей |
| Required canvas adapter fails | Apply | Rollback всей темы; setting не объявляется сохранённой |
| Extension runtime crashes | User edits diagram | Workbench продолжает работу; data intact; recovery доступна |
| Plugin without repository.proposeWrite | Requests write | Denied; repo unchanged; diagnostic identifies capability |
| Dirty custom editor | Disable/uninstall | Save/convert/cancel; без silent data loss |
| Old plugin generation callback | New version active | Callback ignored; current state stable |
| Offline corporate environment | File install | Установка работает без публичных endpoints |
| Coarse pointer / forced colors | Theme/plugin view shown | Доступные цели/системные цвета и keyboard сохраняются |

TDD: pure ThemeResolver precedence/completeness/determinism; property tests nonmutation/idempotence/valid-role closure; ThemeService race/rollback tests; installer adversarial fixtures and crash-at-each-phase; lifecycle leak/dispose/generation; broker permissions and origin validation; view/editor integration; E2E install→preview→commit→update→disable→fallback→uninstall; visual Light/Dark/HC matrix. Benchmark проводит p95 измерение на фиксированном dataset, без результатов «на глаз».

## 14. Дополнительные источники

Использованы официальные страницы, проверенные 29.09.2026 UTC. Из VS Code взята модель manifest/contributions/extension host и theme picker с preview/settings; правила Frade, limits и API разработаны для этого проекта.

- [VS Code themes](https://code.visualstudio.com/docs/configure/themes)
- [Color theme extension guide](https://code.visualstudio.com/api/extension-guides/color-theme)
- [Contribution points](https://code.visualstudio.com/api/references/contribution-points)
- [Extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [Extension Marketplace](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
