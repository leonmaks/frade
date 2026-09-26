# FRADE IMPLEMENTATION MASTER PROMPT v2

## Electron + Configurable Metamodel + Universal Architecture Repository

### ROLE

Ты — Principal Software Architect, Staff TypeScript Engineer и специалист по Electron, архитектурным репозиториям, metadata-driven systems, Hexagonal Architecture, SDD, BDD и TDD.

Твоя задача — создать Frade: Flexible Repository for Architecture Design & Execution.

Frade должен работать как конфигурируемая архитектурная IDE для локальных, серверных и федеративных репозиториев.

Исходная предпосылка: Frade Draw уже реализован как самостоятельный редактор диаграмм.

Не переписывай Frade Draw.

Интегрируй его в новое приложение с сохранением существующего поведения и тестов.

Используй Electron вместо Tauri.

Работай непосредственно с кодовой базой. Создавай файлы, конфигурации, тесты, исходный код и документацию.

Не ограничивайся архитектурным описанием.

---

# 1. NON-NEGOTIABLE REQUIREMENTS

## 1.1. Architecture

Используй:

- TypeScript strict.
- React.
- Existing Frade Draw / AntV X6.
- Electron.
- Node.js backend runtime.
- pnpm workspaces.
- Turborepo.
- OpenSpec.
- Gherkin BDD.
- Vitest and Playwright.

Сохраняй независимость доменного ядра от UI, Electron и физических источников данных.

Не создавай прямой зависимости Draw от YAML, PostgreSQL, Git или SQLite.

## 1.2. Configurable metamodel

Frade MUST поддерживать настраиваемую доменную модель.

Разные компании и репозитории могут использовать разные наборы:

- Object Types.
- Relation Types.
- Attribute Definitions.
- Constraints.
- Taxonomies.
- Hierarchies.
- Architecture Profiles.
- Viewpoints.
- Presentation Rules.
- Forms.
- Permission Policies.
- Lifecycle Definitions.

Типы Application, BusinessProcess, Database, Cluster и прочие должны определяться конфигурацией, а не жёстко заданным кодом.

## 1.3. Repository independence

Первый источник — дерево YAML-файлов.

В архитектуре должны быть предусмотрены:

- JSON.
- PostgreSQL.
- Remote API.
- Git.
- Object Database.
- Multiple Repositories.

YAML является первым адаптером, но не универсальным форматом доменной модели.

## 1.4. Separate architecture and presentation

ArchitectureObject существует независимо от диаграммы.

ArchitectureRelation существует независимо от визуальной линии.

ViewNode ссылается на ObjectRef.

ViewEdge может ссылаться на RelationRef.

Изменение геометрии не меняет архитектурный объект.

Удаление визуального представления не удаляет архитектурный объект.

## 1.5. Electron runtime

Используй:

- Electron Renderer.
- Electron Preload.
- Electron Main.
- Electron Utility Process.
- Typed IPC.

Renderer MUST NOT иметь прямого доступа к Node.js, filesystem, Git, SQL или privileged Electron APIs.

Всю запись и другие привилегированные операции выполняй в backend runtime.

## 1.6. Compatibility

Существующие тесты Frade Draw должны продолжать проходить.

Нельзя заменять готовый Draw новым демоприложением.

Нельзя ослаблять существующие требования к маршрутизации связей.

Нельзя удалять пользовательские файлы или незафиксированные изменения.

---

# 2. TARGET ARCHITECTURE

Реализуй следующие логические слои.

## Layer 1 — UI

- Repository Navigator.
- Architecture Palette.
- Frade Draw.
- Object Inspector.
- Relation Inspector.
- Views Manager.
- Search.
- Workspace Manager.

## Layer 2 — Application

- Commands.
- Queries.
- Transactions.
- Validation orchestration.
- View Projection.
- Undo/Redo coordination.
- Events.

## Layer 3 — Domain

- Metamodel Domain.
- Repository Domain.
- View Domain.
- Federation Domain.

## Layer 4 — Ports

- Repository Port.
- View Storage Port.
- Index Port.
- Git Port.
- Runtime Port.
- Configuration Port.

## Layer 5 — Adapters

- YAML Adapter.
- JSON Adapter.
- PostgreSQL Adapter.
- Remote Adapter.
- SQLite Index Adapter.
- Git Provider.

## Layer 6 — Runtime

Desktop: Electron + Node.js Utility Process.

Web: Fastify + Node.js.

Domain and Application packages MUST be reusable in both runtimes.

---

# 3. MONOREPO

Создай структуру:

```text
apps/
  desktop/
    src/
      main/
      preload/
      renderer/
      utility/
  web/
  server/
  cli/

packages/
  draw/

  metamodel-domain/
  metamodel-config/
  metamodel-compiler/

  repository-domain/
  repository-ports/
  repository-application/

  adapter-yaml/
  adapter-json/
  adapter-postgres/
  adapter-remote/

  view-domain/
  view-projection/
  draw-bridge/

  local-index/
  versioning-git/
  federation/

  runtime-contracts/
  runtime-node/
  runtime-electron/

  ui-navigator/
  ui-inspector/
  ui-workspace/
  shared/

fixtures/
tests/
docs/adr/
openspec/
scripts/
```

Создавай физические пакеты по мере необходимости.

Настрой:

- package exports;
- TypeScript strict;
- separate browser and Node typings;
- ESLint boundaries;
- no circular dependencies;
- Vitest;
- Playwright;
- Turborepo;
- pnpm lockfile;
- CI.

Запрети импорт внутренних файлов пакетов через относительные пути за пределами package boundary.

---

# 4. ELECTRON PROCESS ARCHITECTURE

## 4.1. Renderer

Renderer содержит UI и Frade Draw.

Разрешено:

- React state.
- View Model.
- Draw interaction.
- UI projections.
- Typed IPC client.

Запрещено:

- node:fs;
- node:child_process;
- direct SQL connections;
- arbitrary filesystem paths;
- privileged Electron APIs.

## 4.2. Preload

Preload публикует строго типизированный API через contextBridge.

Запрещено публиковать:

- ipcRenderer целиком;
- generic invoke(channel, args);
- require;
- process;
- arbitrary file read/write;
- arbitrary shell execution.

Preload реализует только разрешённые методы.

## 4.3. Main

Main отвечает за:

- BrowserWindow lifecycle.
- Native dialogs.
- IPC sender validation.
- Permission handling.
- Utility process lifecycle.
- Crash detection.
- Restart policy.
- Controlled application shutdown.
- App protocol.
- Packaging integration.

Main не должен выполнять длительную индексацию или массовый парсинг YAML на основном потоке.

## 4.4. Utility Process

Создай отдельный Node.js Utility Process для Repository Backend.

Размести в нём:

- Repository Application Services.
- Metamodel loading and compilation.
- YAML/JSON Adapters.
- Local Index.
- Git Provider.
- File Watcher.
- Repository command processing.

Обеспечь обработку:

- process crash;
- unexpected exit;
- request timeout;
- cancellation;
- in-flight operations;
- graceful shutdown;
- pending writes.

Если backend неожиданно завершился, UI не должен объявлять незавершённые операции успешными.

Повтор запуска backend не должен автоматически повторять неидемпотентную запись.

## 4.5. IPC

Используй типизированный RPC protocol.

Каждый запрос содержит:

```typescript
interface RpcRequest<T> {
  protocolVersion: number
  requestId: string
  operation: string
  payload: T
}
```

Каждый ответ содержит:

```typescript
type RpcResponse<T> =
  | {
      requestId: string
      ok: true
      data: T
    }
  | {
      requestId: string
      ok: false
      error: RpcError
    }
```

RpcError содержит stable code, message и допустимые diagnostic details.

Не передавай через IPC:

- экземпляры классов с методами;
- X6 Graph;
- функции;
- открытые файловые дескрипторы;
- объекты БД.

Все запросы и ответы валидируй на runtime boundaries.

Используй correlation IDs и structured logging.

Поддержи cancel для длительных read/query операций.

Не считай timeout доказательством того, что write operation не была выполнена.

Для таких случаев требуется повторное чтение статуса по operationId.

## 4.6. Event streaming

Предусмотри типизированные события:

```text
repository.changed
repository.diagnostic
repository.index.progress
repository.connection.changed

metamodel.changed

view.changed

git.status.changed

backend.health.changed
```

События должны иметь последовательность либо revision cursor.

Renderer при потере событий должен уметь восстановить состояние повторным snapshot query.

Реализуй unsubscribe при закрытии окна или уничтожении компонента.

## 4.7. Multiple windows

Если в будущем появятся несколько окон, они должны использовать единый authoritative backend state.

Запрещено создавать независимые writable RepositorySession для одного источника без координации конкурентной записи.

Main управляет маршрутизацией IPC от нескольких окон.

---

# 5. ELECTRON SECURITY

Обязательно:

```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath
}
```

Дополнительно:

- restrictive Content Security Policy;
- no remote Node integration;
- secure local protocol;
- navigation allowlist;
- controlled external links;
- deny unnecessary window creation;
- session permission handling;
- IPC sender validation;
- schema validation;
- no arbitrary shell execution;
- path access restrictions;
- no untrusted plugin execution in privileged process.

Выбранная пользователем директория должна регистрироваться в backend как разрешённый workspace root.

Renderer обращается к нему через repositoryId, а не через произвольный абсолютный путь.

При операциях с файлами защищайся от:

- path traversal;
- symlink escape;
- TOCTOU;
- oversized files;
- YAML alias bombs;
- malformed content.

Не устанавливай пользовательские плагины как произвольный Node.js-код в Utility Process.

Для будущего plugin runtime запланируй отдельную изоляцию и permission model.

---

# 6. CONFIGURABLE METAMODEL

## 6.1. Configuration hierarchy

Поддержи:

```text
Frade Kernel
    ↓
Model Packages
    ↓
Organization Model
    ↓
Repository Profile
    ↓
Viewpoint
```

Frade Kernel содержит только универсальные контракты.

Model Packages содержат переиспользуемые типы.

Organization Model расширяет пакеты.

Repository Profile ограничивает доступные элементы и операции.

Viewpoint определяет визуальную проекцию.

Viewpoint MUST NOT ослаблять фундаментальные domain constraints.

## 6.2. Metamodel entities

Реализуй:

```typescript
interface ModelDefinition {
  schemaVersion: number
  id: string
  version: string
  imports: ModelImport[]
  objectTypes: ObjectTypeDefinition[]
  relationTypes: RelationTypeDefinition[]
  profiles: ProfileDefinition[]
  viewpoints: ViewpointDefinition[]
}
```

Используй стабильные IDs и namespacing.

Не используй display name как ключ типа.

## 6.3. Object Types

Поддержи:

- inheritance;
- abstract types;
- typed attributes;
- defaults;
- validations;
- lifecycle;
- UI metadata.

Для MVP поддержи single inheritance.

Обнаруживай циклы и конфликтующие переопределения.

## 6.4. Attributes

Типы:

- string;
- text;
- integer;
- decimal;
- boolean;
- date;
- datetime;
- enum;
- reference;
- list;
- structured object.

Используй discriminated unions.

Проверяй ограничения типа, обязательность, nullability, cardinality и допустимые target types.

Не используй eval и динамическую компиляцию кода из YAML.

## 6.5. Relations

Поддержи:

- source and target type rules;
- inheritance-aware matching;
- direction;
- cardinality;
- self-reference;
- duplicate policy;
- typed attributes.

Разделяй предварительную проверку пары типов и итоговую валидацию на актуальном состоянии репозитория.

## 6.6. Metamodel Compiler

Pipeline:

```text
Load
 -> Parse
 -> Resolve imports
 -> Resolve inheritance
 -> Merge extensions
 -> Validate
 -> Compile profiles
 -> Compile viewpoints
 -> Calculate fingerprint
 -> Publish snapshot
```

Компиляция должна быть детерминированной.

Ошибка компиляции не должна частично изменять опубликованную модель.

Реализуй structured diagnostics.

## 6.7. Model versioning

Поддержи:

- schemaVersion;
- semantic model version;
- repository model version;
- model lockfile;
- impact analysis;
- migration preview.

Запрещено автоматически удалять объекты после удаления их типа из модели.

---

# 7. REPOSITORY DOMAIN

Реализуй:

```typescript
interface ObjectRef {
  repositoryId: string
  objectId: string
}

interface RelationRef {
  repositoryId: string
  relationId: string
}
```

```typescript
interface ArchitectureObject {
  ref: ObjectRef
  typeId: string
  name: string
  attributes: Record<string, JsonValue>
  revision: Revision
}
```

```typescript
interface ArchitectureRelation {
  ref: RelationRef
  typeId: string
  source: ObjectRef
  target: ObjectRef
  attributes: Record<string, JsonValue>
  revision: Revision
}
```

Revision — opaque token.

Физическое местоположение хранится отдельно в ResourceProvenance.

File rename не меняет ObjectRef.

Отношения должны поддерживать независимую идентичность и ревизию.

---

# 8. REPOSITORY PORTS

Реализуй:

- RepositoryAdapter;
- RepositorySession;
- ObjectReader;
- RelationReader;
- RepositoryWriter;
- QueryPort;
- ChangePort;
- HistoryPort.

Используй capability-based contracts.

Поддержи:

- read-only sources;
- paginated queries;
- cancellation;
- expectedRevision;
- explicit atomicity guarantees;
- typed errors;
- session lifecycle.

Не требуй от всех адаптеров поддержки транзакций и server-side graph traversal.

Не размещай Electron-specific types в Repository Ports.

---

# 9. YAML ADAPTER

Реализуй полноценный YAML Directory Adapter.

Manifest:

```yaml
schemaVersion: 1

repository:
  id: enterprise-architecture
  name: Enterprise Architecture

model:
  id: company-a.architecture
  version: 1.0.0

storage:
  type: yaml-directory

  paths:
    objects: architecture/objects
    relations: architecture/relations
    views: views
    metamodel: metamodel
```

Read pipeline:

```text
Scan
 -> Parse
 -> Validate
 -> Map
 -> Resolve IDs
 -> Resolve references
 -> Publish diagnostics
 -> Update index
```

Write pipeline:

```text
Receive mutation
 -> Check permission
 -> Check revision
 -> Validate
 -> Prepare
 -> Write temp
 -> Replace
 -> Publish new revision
 -> Update index
```

Поддержи native serialization.

Для стороннего YAML предусмотри preserve-mode как отдельное расширение.

Не перезаписывай комментарии и пользовательское форматирование в режиме preserve, если точечное безопасное изменение не реализовано.

Ошибки записи не должны приводить к потере исходного файла.

Для multi-file operations добавь журнал восстановления либо явную компенсационную модель.

File watcher должен обнаруживать внешние изменения и отличать их от собственных записей.

---

# 10. VIEW DOMAIN

View Model должна быть независима от X6.

Реализуй:

- ArchitectureView;
- ViewNode;
- ViewEdge;
- ViewGroup;
- ViewAnnotation;
- ViewSettings.

ViewNode имеет собственный ID и optional ObjectRef.

ViewEdge имеет собственный ID и optional RelationRef.

Поддержи:

- geometry;
- routing;
- labels;
- styles;
- grouping;
- z-order;
- view settings.

Не сохраняй полную копию архитектурного объекта внутри ViewNode.

Не уничтожай ViewNode при отсутствии referenced object.

---

# 11. DRAW BRIDGE

Интегрируй View Model с существующим Frade Draw.

Draw Bridge отвечает за:

- resolving ObjectRef;
- creating Draw cells;
- applying Viewpoint presentation;
- dispatching Draw intents;
- updating View Model;
- dispatching semantic commands;
- applying repository events.

Отдели:

```text
Draw Geometry Command
```

от:

```text
Repository Semantic Command
```

Move/resize/route change изменяют View.

Create/update/delete architecture object изменяют Repository.

Создание архитектурной связи требует валидации.

При ошибке сохранения не оставляй ложный RelationRef.

Не изменяй существующее поведение маршрутизации, автоматических handles и перпендикулярного подключения к контуру.

---

# 12. DYNAMIC UI

Реализуй metadata-driven:

- Navigator.
- Inspector.
- Architecture Palette.
- Relation Picker.
- Viewpoint Selector.

Navigator не должен считать физический file tree единственной иерархией.

Inspector должен строиться по effective object type.

Architecture Palette создаёт новый архитектурный объект и его представление.

Graphic Palette создаёт только визуальный элемент.

Drag из Navigator создаёт только новое представление существующего объекта.

Read-only permissions должны отражаться в UI, но проверяться повторно в backend.

---

# 13. LOCAL INDEX

Используй SQLite как rebuildable projection.

Таблицы:

```text
resources
objects
relations
references
object_fts
index_state
```

Поддержи:

- incremental indexing;
- rebuild;
- source revision tracking;
- graph traversal;
- full-text search;
- reverse references.

Индекс не является источником истины для YAML-репозитория.

При несовпадении ревизий индекс должен считаться stale.

Индексация выполняется в Utility Process, не в Renderer и не на основном потоке Electron Main.

---

# 14. GIT PROVIDER

Реализуй независимо от YAML Adapter.

Поддержи:

- status;
- diff;
- commit;
- fetch;
- pull;
- push;
- conflict diagnostics.

Git operations выполняются через controlled process adapter.

Не формируй shell-команду путём конкатенации пользовательского ввода.

Используй argument arrays и разрешённые executable paths.

Не выполняй Git commit или push автоматически после изменения диаграммы.

Git conflict не должен разрешаться скрытым перезаписыванием.

---

# 15. FEDERATION

Поддержи архитектурные контракты:

- Repository Registry.
- Global ObjectRef.
- Cross-repository resolution.
- Model Mapping.
- Federated Query.
- Relationship Ownership.

Объекты из разных репозиториев не считаются эквивалентными только по совпадению имени.

Mapping должен быть явным.

Не предполагай общей ACID-транзакции между независимыми источниками.

Полную федерацию реализуй после готовности YAML vertical slice.

---

# 16. DESKTOP / WEB REUSE

Domain и Application пакеты общие.

Electron и Fastify предоставляют разные transport adapters.

Нельзя импортировать Electron в:

- repository-domain;
- metamodel-domain;
- repository-application;
- adapter-yaml;
- view-domain.

Node.js infrastructure может переиспользоваться в desktop backend и server.

Browser-only код не должен импортировать Node.js packages.

Настрой автоматическую проверку этих границ.

---

# 17. SDD — OPENSPEC

Создай changes:

```text
frade-monorepo-foundation
frade-electron-runtime
frade-metamodel-domain
frade-metamodel-compiler
frade-repo-core
frade-repository-yaml
frade-view-domain
frade-draw-bridge
frade-dynamic-ui
frade-local-index
frade-git-provider
frade-federation-contract
frade-web-runtime
```

Для каждого change:

1. Proposal.
2. Design.
3. Normative specifications.
4. BDD scenarios.
5. TDD plan.
6. Tasks.
7. Verification evidence.
8. Archive.

Каждое MUST-требование должно иметь тестируемое acceptance criterion.

Все изменения process architecture фиксируй в ADR.

---

# 18. BDD

Используй Gherkin и исполняемые step definitions.

Обязательные feature groups:

```text
electron/
  renderer-isolation.feature
  ipc-validation.feature
  backend-lifecycle.feature
  crash-recovery.feature
  window-lifecycle.feature
  repository-permissions.feature

metamodel/
  loading.feature
  inheritance.feature
  validation.feature
  profiles.feature
  versioning.feature

repository/
  yaml-reading.feature
  yaml-writing.feature
  concurrency.feature
  integrity.feature

draw/
  object-placement.feature
  relation-creation.feature
  route-editing.feature
  view-persistence.feature

index/
  indexing.feature
  rebuild.feature

git/
  synchronization.feature

federation/
  cross-repository-references.feature
```

Все critical scenarios автоматизируй.

Не считай feature-файлы исполненными, если они не связаны с тестовым runner.

---

# 19. TDD

Используй:

- Vitest.
- fast-check.
- Playwright.
- Contract Test Suites.
- Integration fixtures.
- Electron E2E tests.

Для каждого требования:

```text
Write failing test
 -> Implement
 -> Pass test
 -> Refactor
 -> Run regression suite
```

Обязательно тестируй реальные filesystem и SQLite operations.

Не доказывай работу YAML Adapter моками.

Electron IPC проверяй как минимум на двух уровнях:

- unit tests с fake transport;
- интеграционные/E2E tests с реальным Electron runtime.

Для проверки packaging запускай smoke tests из собранного приложения.

---

# 20. ELECTRON-SPECIFIC ACCEPTANCE CRITERIA

ELECTRON-001:
Renderer не имеет Node.js integration.

ELECTRON-002:
Context isolation включён.

ELECTRON-003:
Renderer sandbox включён.

ELECTRON-004:
Preload публикует только allowlisted typed API.

ELECTRON-005:
IPC sender валидируется.

ELECTRON-006:
IPC payload валидируется runtime schema.

ELECTRON-007:
Произвольная файловая операция через IPC невозможна.

ELECTRON-008:
Длительная индексация не блокирует Electron Main.

ELECTRON-009:
При crash Utility Process UI получает health event.

ELECTRON-010:
Неуспешный или неопределённый write не объявляется успешным.

ELECTRON-011:
После restart backend восстанавливается repository session.

ELECTRON-012:
Повторное открытие окна не создаёт конфликтующие независимые writable sessions.

ELECTRON-013:
Packaged app открывает YAML-репозиторий.

ELECTRON-014:
Packaged app сохраняет View.

ELECTRON-015:
Packaged app создаёт и открывает локальный индекс.

ELECTRON-016:
Packaged app выполняет разрешённые Git operations.

ELECTRON-017:
Native modules проходят packaging и загрузку.

ELECTRON-018:
В production отсутствует небезопасная development CSP.

ELECTRON-019:
Недоверенные URL не открываются во внутреннем привилегированном окне.

ELECTRON-020:
Repository data не хранится в ASAR.

---

# 21. DEFINITION OF DONE

Change завершён только если:

- OpenSpec validation passed.
- BDD critical scenarios passed.
- Unit tests passed.
- Contract tests passed.
- Integration tests passed.
- Typecheck passed.
- Lint passed.
- Build passed.
- Relevant Electron tests passed.
- Existing Frade Draw tests passed.
- No architecture boundary violations.
- No silent data loss.
- Evidence committed.
- Documentation updated.

Не объявляй успешно выполненными непроверенные операции.

Не архивируй change при отсутствии обязательных evidence.

---

# 22. IMPLEMENTATION ORDER

Phase 0 — Audit.

Phase 1 — Monorepo.

Phase 2 — Electron runtime foundation.

Phase 3 — Metamodel Domain.

Phase 4 — Metamodel Compiler.

Phase 5 — Repository Domain and Ports.

Phase 6 — YAML read-only vertical slice.

Phase 7 — View Domain and Draw Bridge.

Phase 8 — YAML write commands.

Phase 9 — Dynamic UI.

Phase 10 — Local Index.

Phase 11 — Git.

Phase 12 — Federation contracts.

Phase 13 — Web backend.

Phase 14 — Packaging, security and hardening.

Не создавай один гигантский коммит.

Проверяй результаты после каждой фазы.

---

# 23. FIRST EXECUTION

Начни с аудита текущего проекта.

1. Изучи git status.
2. Изучи структуру Frade Draw.
3. Изучи существующие API.
4. Изучи тесты и зафиксируй baseline.
5. Создай ADR для миграции в monorepo.
6. Создай OpenSpec change `frade-monorepo-foundation`.
7. Реализуй monorepo foundation.
8. Создай OpenSpec change `frade-electron-runtime`.
9. Реализуй Electron Main, Preload, Renderer и Utility Process.
10. Реализуй typed IPC с минимальным health-check.
11. Выполни тесты.
12. Продолжи последовательно следующие phases.

В конце каждой фазы отчитайся:

- Что реализовано.
- Какие файлы изменены.
- Какие тесты выполнены.
- Какие тесты не прошли.
- Какие риски остались.
- Какой следующий change.

Цель — полностью работающее приложение Frade с конфигурируемым архитектурным репозиторием, а не демонстрационная оболочка.
