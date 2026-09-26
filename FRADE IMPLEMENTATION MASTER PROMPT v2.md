Передаю тебе полную инструкцию, частично команды по созданию монорепо сделаны. Проверь всё внимательно и выполни полностью все инструкции, вклчая мастер-промпт.
Проект frade-draw находится в папке E:\dev\codex\frade-draw, в ней работающий граф. редактор диаграмм.
В приоритетном порядке рассматривай сценарии в проекте frade-draw - они отлажены визуально и работают хорошо.

# Frade — Implementation Package v2: Electron + Configurable Architecture Repository

Ниже — переработанный мастер-промпт для Codex и инструкции по развёртыванию monorepo Frade с учётом выбора Electron вместо Tauri 2.

В новой архитектуре Electron не просто заменяет desktop-оболочку. Он позволяет исполнять общий TypeScript/Node.js backend внутри desktop-приложения, повторно использовать Repository Core и адаптеры в Web Server, а также обеспечить единый Chromium runtime для Frade Draw на Windows, macOS и Linux.

Сохраняются все ранее согласованные требования: конфигурируемая метамодель для разных компаний и уровней архитектуры, YAML как первый репозиторий, независимый Frade Draw, универсальные Repository Adapters, локальная индексация, Git и перспективная федерация нескольких источников.

Ключевое изменение: системные операции, индексация и другие потенциально тяжёлые задачи выполняются в Electron Main / Utility Process через типизированный IPC. Rust и Tauri исключаются из базового технологического стека.

## 1. Целевая архитектура Electron-версии

### 1.1. Разделение процессов

Electron Renderer · sandboxed

## Frade UI

React · Frade Draw / AntV X6 · Navigator · Inspector · Viewpoints

Никакого прямого доступа к Node.js, SQL, Git и произвольным файлам

### Preload + Typed IPC

Строго ограниченный API команд, запросов, событий и отмены операций

Electron Main

## Desktop Host

Окна · диалоги · IPC validation · жизненный цикл · запуск workers

Node.js Utility Process

## Frade Backend Runtime

Repository Application

Metamodel Compiler

YAML / JSON Adapters

Local SQLite Index

Git Provider

View Storage

Local Filesystem · Git · SQLite · External Repositories

Electron поддерживает Node.js utility processes, которые подходят для вынесения фоновой обработки из main process. Важно не путать их с полной изоляцией недоверенного кода: плагины и внешние данные требуют отдельных мер безопасности.

![](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub

+1

### 1.2. Принцип повторного использования backend

```
                    @frade/repository-application
                                │
                         Repository Ports
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
       Electron Desktop                     Fastify Server
              │                                   │
       Node.js Utility                      Node.js Runtime
              │                                   │
              └─────────── Common TS ────────────┘
```

Electron Main не должен превращаться в монолитный Repository Service. Он управляет жизненным циклом и проверяет доступ. Доменная обработка исполняется в отдельном backend runtime, используемом также серверной версией.

## 2. Обновлённый технологический стек

|
Уровень

|

Технология

|
| --- | --- |
|

Monorepo

|

pnpm Workspaces + Turborepo

|
|

Язык

|

TypeScript strict

|
|

Desktop

|

Electron

|
|

Сборка desktop

|

electron-vite

|
|

Desktop packaging

|

electron-builder

|
|

UI

|

React + Vite

|
|

Draw

|

Существующий Frade Draw / AntV X6

|
|

Состояние UI

|

Zustand + Immer

|
|

Асинхронные запросы

|

TanStack Query

|
|

Валидация

|

Zod + JSON Schema / Ajv

|
|

YAML

|

`yaml`

|
|

SQL

|

Kysely

|
|

Локальный индекс

|

SQLite + FTS5

|
|

Git

|

Системный Git CLI через безопасный process adapter

|
|

Web backend

|

Fastify + Node.js

|
|

Тесты

|

Vitest + fast-check + Playwright

|
|

SDD

|

OpenSpec

|
|

BDD

|

Gherkin с исполняемыми step definitions

|

`electron-vite` обеспечивает сборку Electron main, preload и renderer. `electron-builder` поддерживает создание дистрибутивов, включая работу с native modules и структурой monorepo.

![](https://www.google.com/s2/favicons?domain=https://electron-vite.org&sz=32)

electron-vite

+2

Версии библиотек необходимо выбирать по совместимости, фиксировать в lockfile и проверять на CI. В первую очередь нужно сохранить совместимость с уже готовым Frade Draw.

# 3. Развёртывание monorepo Frade

Инструкции рассчитаны на Windows и PowerShell. Для macOS и Linux структура проекта остаётся той же, но команды установки инструментов и упаковки приложения будут отличаться.

## 3.1. Подготовка окружения

Убедитесь, что доступны Node.js LTS, Corepack, pnpm и Git:

PowerShell

```
node --version
npm --version
corepack --version
git --version
```

Включите pnpm:

PowerShell

```
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Для воспроизводимой сборки после проверки совместимости зафиксируйте конкретную версию pnpm в поле `packageManager` корневого `package.json`. Команду `latest` используйте только для первоначальной установки, а не в CI.

Rust, Cargo, WebView2 SDK и Tauri CLI для Frade больше не требуются.

## 3.2. Создание monorepo

Если `E:\dev\codex\frade` уже содержит проект, сначала проверьте `git status` и сохраните существующий код. Команды ниже предназначены для нового каталога.

PowerShell

```
New-Item -ItemType Directory -Force E:\dev\codex\frade

Set-Location E:\dev\codex\frade

git init

New-Item -ItemType Directory -Force `
  apps, `
  packages, `
  tests, `
  fixtures, `
  scripts, `
  docs, `
  openspec
```

Создайте файл `pnpm-workspace.yaml`:

YAML

```
packages:
  - "apps/*"
  - "packages/*"
  - "tools/*"
```

Установите инфраструктурные зависимости:

PowerShell

```
pnpm add -Dw `
  turbo `
  typescript `
  vitest `
  @vitest/coverage-v8 `
  fast-check `
  @playwright/test `
  eslint `
  prettier `
  @types/node
```

Добавьте инструменты desktop:

PowerShell

```
pnpm add -Dw electron electron-vite electron-builder
```

Для пакетов Electron потребуется фактическая структура приложения, которую Codex создаст при инициализации `apps/desktop`. Команды выше устанавливают инструменты, но сами по себе не создают готовое desktop-приложение.

## 3.3. Структура monorepo

```
frade/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   ├── preload/
│   │   │   ├── renderer/
│   │   │   └── utility/
│   │   │
│   │   ├── resources/
│   │   ├── electron.vite.config.ts
│   │   ├── electron-builder.yml
│   │   └── package.json
│   │
│   ├── web/
│   ├── server/
│   └── cli/
│
├── packages/
│   ├── draw/
│   │
│   ├── metamodel-domain/
│   ├── metamodel-config/
│   ├── metamodel-compiler/
│   │
│   ├── repository-domain/
│   ├── repository-ports/
│   ├── repository-application/
│   │
│   ├── adapter-yaml/
│   ├── adapter-json/
│   ├── adapter-postgres/
│   ├── adapter-remote/
│   │
│   ├── view-domain/
│   ├── view-projection/
│   ├── draw-bridge/
│   │
│   ├── local-index/
│   ├── versioning-git/
│   ├── federation/
│   │
│   ├── runtime-contracts/
│   ├── runtime-node/
│   ├── runtime-electron/
│   │
│   ├── ui-navigator/
│   ├── ui-inspector/
│   ├── ui-workspace/
│   └── shared/
│
├── fixtures/
│   ├── metamodels/
│   ├── repositories/
│   └── views/
│
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   └── packaging/
│
├── tools/
│   └── architecture-rules/
│
├── docs/
│   ├── adr/
│   └── architecture/
│
├── openspec/
├── scripts/
│
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── tsconfig.base.json
```

Не нужно создавать пустые пакеты под все будущие адаптеры немедленно. Физические каталоги добавляются по мере реализации, а целевая структура фиксируется в ADR.

### Особое правило для Electron

`runtime-node` реализует системные функции на Node.js, но не импортирует Electron.

`runtime-electron` реализует транспорт, управление utility processes и интеграцию с desktop host.

Благодаря этому `runtime-node`, Repository Application и адаптеры можно использовать в `apps/server`.

## 3.4. Конфигурация сборки

В корне настройте Turborepo:

JSON

```
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "out/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Корневые scripts:

JSON

```
{
  "name": "frade",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo dev",
    "dev:desktop": "pnpm --filter @frade/desktop dev",
    "dev:web": "pnpm --filter @frade/web dev",
    "dev:server": "pnpm --filter @frade/server dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "test": "turbo test",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "dist:desktop": "pnpm --filter @frade/desktop dist"
  }
}
```

Это фрагмент scripts, который нужно объединить с реальным `package.json` после установки зависимостей.

## 3.5. Первоначальная конфигурация Electron

Создайте `apps/desktop/package.json`:

JSON

```
{
  "name": "@frade/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "dist": "pnpm build && electron-builder"
  }
}
```

Codex должен установить runtime-зависимости приложения и дополнить скрипты для линтинга, проверки типов и тестирования.

Не предполагайте, что `electron-vite` автоматически соберёт отдельный utility process: для него необходимо явно настроить дополнительную сборку, совместимую с Node.js utility runtime и упаковкой Electron.

### Настройки BrowserWindow

Обязательная базовая конфигурация:

TypeScript

```
const window = new BrowserWindow({
  width: 1600,
  height: 1000,

  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: preloadPath,
  },
});
```

Это только минимальный фрагмент. Production-конфигурация должна также включать контроль навигации, новых окон, разрешений, Content Security Policy, IPC sender validation и безопасную загрузку ресурсов. Эти меры рекомендованы официальной документацией Electron.

![](https://www.google.com/s2/favicons?domain=https://www.electronjs.org&sz=32)

Electron

+1

### Размещение данных

Не храните пользовательские репозитории, SQLite index и изменяемые настройки внутри установленного приложения или ASAR.

```
Application installation
  └── Frade executable and bundled resources

Electron userData
  ├── workspaces/
  ├── indexes/
  ├── settings/
  └── logs/

User-selected directory
  └── Enterprise Architecture YAML Repository
```

Путь к индексу должен быть однозначно связан с идентичностью подключения и ревизией источника. Сам YAML-репозиторий остаётся в выбранной пользователем директории.

# 4. Мастер-промпт для Codex: SDD + BDD + TDD

Скопируйте следующий блок в Codex. Он рассчитан на существующий проект Frade Draw и новую monorepo-структуру. Codex должен сначала проанализировать реальную кодовую базу и только затем выполнять перенос и реализацию.

FRADE IMPLEMENTATION MASTER PROMPT v2

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

```
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

- node;

- node;

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

```
interface RpcRequest<T> {
  protocolVersion: number;
  requestId: string;
  operation: string;
  payload: T;
}
```

Каждый ответ содержит:

```
type RpcResponse<T> =
  | {
      requestId: string;
      ok: true;
      data: T;
    }
  | {
      requestId: string;
      ok: false;
      error: RpcError;
    };
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

```
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

```
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

```
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

```
interface ModelDefinition {
  schemaVersion: number;
  id: string;
  version: string;
  imports: ModelImport[];
  objectTypes: ObjectTypeDefinition[];
  relationTypes: RelationTypeDefinition[];
  profiles: ProfileDefinition[];
  viewpoints: ViewpointDefinition[];
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

```
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

```
interface ObjectRef {
  repositoryId: string;
  objectId: string;
}

interface RelationRef {
  repositoryId: string;
  relationId: string;
}

interface ArchitectureObject {
  ref: ObjectRef;
  typeId: string;
  name: string;
  attributes: Record<string, JsonValue>;
  revision: Revision;
}

interface ArchitectureRelation {
  ref: RelationRef;
  typeId: string;
  source: ObjectRef;
  target: ObjectRef;
  attributes: Record<string, JsonValue>;
  revision: Revision;
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

```
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

```
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

```
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

```
Draw Geometry Command
```

от:

```
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

```
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

```
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

```
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

```
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

# 5. Дополнительная спецификация Electron: IPC, процессы и транзакции

Эту часть рекомендую закрепить как отдельный OpenSpec change `frade-electron-runtime`. В обычном мастер-промпте такие детали легко теряются, хотя именно от них зависит надёжность desktop-приложения.

## 5.1. Типизированный Desktop API

Рекомендую разделить API по доменным областям и не предоставлять renderer универсальный доступ к Electron IPC.

TypeScript

```
interface FradeDesktopApi {
  runtime: {
    getHealth(): Promise<RuntimeHealth>;
  };

  repositories: {
    open(): Promise<RepositoryDescriptor | null>;

    close(
      repositoryId: string
    ): Promise<void>;

    getObject(
      ref: ObjectRef
    ): Promise<ArchitectureObject | null>;

    execute(
      command: RepositoryCommand
    ): Promise<MutationResult>;
  };

  views: {
    open(
      viewId: string
    ): Promise<ArchitectureView>;

    save(
      command: SaveViewCommand
    ): Promise<SaveViewResult>;
  };

  events: {
    subscribe(
      listener: (event: FradeEvent) => void
    ): () => void;
  };
}
```

В реальной реализации `open()` должен учитывать выбор директории через Main и создание RepositorySession в backend. UI не должен передавать произвольный путь для чтения или записи.

Также необходимо предусмотреть поддержку `AbortSignal` на уровне клиентской библиотеки с преобразованием отмены в IPC-сообщение. Сам объект `AbortSignal` через IPC передавать не нужно.

### Граница доверия

Renderer

Формирует запрос; не имеет системных разрешений.

Main

Проверяет sender, operation, payload, доступ к workspace.

Utility Process

Повторно проверяет доменные разрешения, ревизии и ограничения метамодели.

Вызов `repositories.execute` не должен означать автоматическое разрешение любой команды. Backend обязан проверять полномочия на конкретный объект и операцию.

## 5.2. Жизненный цикл backend

```
Electron App Ready
       ↓
Create Main Window
       ↓
Start Repository Utility Process
       ↓
Utility Handshake
       ↓
Protocol Version Check
       ↓
Runtime Ready
       ↓
Open Workspace
       ↓
Load Metamodel / Repository
       ↓
Serve UI Requests
```

Если utility process завершился аварийно, Electron Main должен:

1. Зафиксировать факт завершения и отменить ожидание неприменимых запросов.

2. Перевести backend health в состояние unavailable.

3. Ограничить действия UI, требующие backend.

4. Запустить восстановление согласно контролируемой restart policy.

5. Повторно открыть репозитории и восстановить индекс или его актуальность.

6. Разрешить неопределённые write-операции по журналу операций либо состоянию источника.

Нельзя автоматически повторять создание объекта или отношение после timeout: первая операция могла успеть завершиться.

Для мутаций используйте `operationId`, ожидаемую ревизию и механизм определения результата повторного обращения.

## 5.3. Управление сохранением

Разделите:

|
Операция

|

Где выполняется

|
| --- | --- |
|

Перемещение фигуры

|

Renderer / Draw

|
|

Обновление draft View

|

Renderer

|
|

Сохранение View в YAML

|

Utility Process

|
|

Изменение архитектурного объекта

|

Utility Process

|
|

Индексация

|

Utility Process

|
|

Git commit

|

Utility Process

|
|

Git push

|

Utility Process

|

Renderer может обеспечивать быстрый оптимистический UI, но после ошибки записи должен показывать несохранённое состояние, а не считать операцию завершённой.

# 6. BDD: специфические сценарии Electron

Ниже — дополнение к ранее подготовленным BDD-сценариям метамодели, репозитория и Frade Draw. Все те сценарии сохраняются без изменений по смыслу.

## `electron-security.feature`

gherkin

```
@electron @security @critical
Feature: Electron renderer isolation

  Scenario: Renderer cannot access Node.js
    Given Frade is running in production mode
    When a renderer window is opened
    Then Node.js integration is disabled
    And context isolation is enabled
    And renderer sandbox is enabled
    And the renderer has no direct filesystem API

  Scenario: Reject unauthorized IPC operation
    Given an opened Frade renderer
    When it requests an operation outside the IPC allowlist
    Then the operation is rejected
    And no privileged operation is executed

  Scenario: Reject malformed IPC payload
    Given the renderer sends a repository mutation
    And the payload violates its runtime schema
    When Main receives the request
    Then the request is rejected with "INVALID_IPC_PAYLOAD"
    And Utility Process does not execute the mutation

  Scenario: Reject unauthorized sender
    Given an untrusted window exists
    When it sends a repository write request
    Then the request is rejected with "UNAUTHORIZED_SENDER"

  Scenario: Prevent workspace path escape
    Given the user selected repository root "workspace-A"
    When a request resolves outside the allowed root
    Then the filesystem operation is rejected
```

## `electron-backend-lifecycle.feature`

gherkin

```
@electron @runtime @critical
Feature: Repository backend lifecycle

  Scenario: Backend starts successfully
    Given Electron Main has started
    When the Repository Utility Process is launched
    Then the process performs a protocol handshake
    And runtime health becomes "ready"

  Scenario: Detect backend crash
    Given an opened repository
    And backend health is "ready"
    When Utility Process terminates unexpectedly
    Then Main detects the termination
    And runtime health becomes "unavailable"
    And the renderer receives a health event

  Scenario: Recover repository after restart
    Given repository "R1" was open
    And the backend has crashed
    When backend recovery succeeds
    Then repository "R1" is reopened
    And its revision is checked
    And affected UI projections are refreshed

  Scenario: Unknown result of a write
    Given mutation "M1" was sent to the backend
    And the backend terminates before confirming the result
    When the application reconnects
    Then mutation "M1" is not blindly repeated
    And the application resolves its outcome
      using the operation journal or source revision
```

## `electron-indexing.feature`

gherkin

```
@electron @performance
Feature: Repository indexing

  Scenario: Indexing does not block the UI
    Given a large fixture repository is opened
    When indexing begins in Utility Process
    Then the renderer remains responsive
    And indexing progress events are delivered
    And the user can cancel the indexing request

  Scenario: Rebuild index after process crash
    Given indexing was interrupted
    When the backend restarts
    Then the index state is checked
    And incomplete index changes are rolled back
      or resumed consistently
```

## `electron-packaging.feature`

gherkin

```
@electron @packaging @critical
Feature: Packaged desktop application

  Scenario: Open repository from packaged application
    Given Frade is built as an installed desktop application
    When the user opens a valid YAML repository
    Then the Repository Utility Process starts
    And the repository loads successfully

  Scenario: Persist a view after restart
    Given the packaged application has an opened view
    When the user changes the diagram
    And saves the view
    And restarts Frade
    Then the view is restored
    And ObjectRef and RelationRef values remain unchanged
    And supported geometry is preserved

  Scenario: Load native SQLite dependency
    Given Frade is packaged for the target operating system
    When the backend initializes the local index
    Then the SQLite dependency loads successfully
    And a database can be created
```

# 7. TDD: проверки Electron runtime

|
ID

|

Проверка

|

Уровень

|
| --- | --- | --- |
|

ET-001

|

Runtime validation отклоняет неизвестную команду

|

Unit

|
|

ET-002

|

Sender validation отклоняет чужое окно

|

Integration

|
|

ET-003

|

Renderer не имеет доступа к Node.js

|

Electron E2E

|
|

ET-004

|

Preload не раскрывает generic invoke

|

Unit + E2E

|
|

ET-005

|

Корректный RPC запрос возвращает результат

|

Integration

|
|

ET-006

|

Неизвестный requestId не завершает чужой запрос

|

Property

|
|

ET-007

|

Timeout корректно освобождает ресурсы

|

Unit

|
|

ET-008

|

Отмена индексирования обрабатывается

|

Integration

|
|

ET-009

|

Crash utility process обнаруживается

|

Electron E2E

|
|

ET-010

|

После restart источник открывается заново

|

Integration

|
|

ET-011

|

Неопределённая мутация не повторяется вслепую

|

Integration

|
|

ET-012

|

Два окна не создают конфликтующие writable sessions

|

Electron E2E

|
|

ET-013

|

Собранное приложение загружает backend

|

Packaging

|
|

ET-014

|

Собранное приложение загружает SQLite

|

Packaging

|
|

ET-015

|

Сохранённый View переживает restart

|

E2E

|

Для IPC-компонента дополнительно используйте property-based tests, проверяющие соответствие `requestId`, обработку повторных ответов, отмену подписок и порядок событий.

Тесты должны работать на реальном utility process для интеграционного уровня. Fake transport допустим только для unit-тестов.

# 8. Сборка и выпуск Electron-приложения

Здесь необходимо учитывать, что обычная сборка React не эквивалентна готовому desktop-дистрибутиву.

## 8.1. Раздельная сборка процессов

Codex должен настроить выходные артефакты:

```
apps/desktop/
  out/
    main/
      index.js

    preload/
      index.js

    renderer/
      index.html
      assets/

    utility/
      repository-backend.cjs
```

Файл `repository-backend.cjs` здесь приведён как целевой пример. Формат может отличаться в зависимости от выбранного bundler и режима модулей, но он обязан корректно загружаться через `utilityProcess.fork()`.

Особенно важно проверить разрешение путей в установленном приложении. Пути из исходного monorepo не должны попадать в production runtime.

## 8.2. Native dependencies

Если для локального индекса используется `better-sqlite3`, необходимо обеспечить совместимость его бинарного модуля с версией Electron и целевой платформой.

Практически это означает:

- проверку ABI и сборки native module;

- включение `.node` в дистрибутив;

- корректное размещение native binary относительно ASAR;

- smoke test на реальном установленном приложении.

Официальная документация `electron-builder` отдельно описывает упаковку native modules и расположение ресурсов вне ASAR.

![](https://www.google.com/s2/favicons?domain=https://www.electron.build&sz=32)

electron-builder

+1

Для Frade я бы предусмотрел альтернативу на случай проблем с native dependencies: адаптер индекса должен быть скрыт за `IndexPort`, чтобы смена реализации SQLite не затрагивала Repository Core.

## 8.3. Packaging targets

|
ОС

|

Целевой формат

|
| --- | --- |
|

Windows

|

NSIS installer

|
|

macOS

|

DMG

|
|

Linux

|

AppImage или deb/rpm в зависимости от целевой среды

|

Дистрибутивы необходимо собирать и тестировать на целевых ОС. Windows-сборка сама по себе не подтверждает работоспособность macOS/Linux.

Для корпоративного распространения предусмотрите code signing, проверку целостности релиза, управление версиями и согласованный механизм обновлений.

Обновления не должны автоматически менять schemaVersion архитектурного репозитория. Миграция модели и обновление программы — независимые процессы.

### Production smoke test

После создания дистрибутива необходимо проверить не только запуск окна, но и полный сценарий:

```
Install
  ↓
Launch
  ↓
Start Utility Process
  ↓
Open fixture YAML Repository
  ↓
Compile Metamodel
  ↓
Build SQLite Index
  ↓
Open View
  ↓
Move Node
  ↓
Save View
  ↓
Close Frade
  ↓
Restart
  ↓
Verify persistence
```

Это должен быть автоматизированный тест там, где позволяет CI, с документированными дополнительными ручными проверками для установщиков и подписанных релизов.

# 9. Уточнённый план OpenSpec changes

Главное отличие от предыдущего варианта: `frade-electron-runtime` реализуется на раннем этапе, до подключения полноценного репозитория. Это позволяет сразу тестировать настоящий IPC, а не строить YAML Adapter поверх временных интерфейсов.

|
№

|

Change

|

Результат

|
| --- | --- | --- |
|

00

|

`frade-monorepo-foundation`

|

Monorepo, перенос Draw, CI

|
|

01

|

`frade-electron-runtime`

|

Main, Preload, Renderer, Utility, typed IPC

|
|

02

|

`frade-metamodel-domain`

|

Типы, атрибуты, отношения, ограничения

|
|

03

|

`frade-metamodel-compiler`

|

Компиляция, профили, fingerprints

|
|

04

|

`frade-repo-core`

|

Domain, Ports, Application Services

|
|

05

|

`frade-repository-yaml-read`

|

Чтение YAML и Repository Navigator

|
|

06

|

`frade-view-domain`

|

Независимая View Model

|
|

07

|

`frade-draw-bridge`

|

Связь Frade Draw с репозиторием

|
|

08

|

`frade-repository-yaml-write`

|

Редактирование и сохранение

|
|

09

|

`frade-dynamic-ui`

|

Inspector, Palette, Viewpoints

|
|

10

|

`frade-local-index`

|

SQLite и поиск

|
|

11

|

`frade-git-provider`

|

Git и синхронизация

|
|

12

|

`frade-federation-contract`

|

Несколько репозиториев и mapping

|
|

13

|

`frade-web-runtime`

|

Fastify, общий backend

|
|

14

|

`frade-desktop-hardening`

|

Packaging, security, release checks

|

У каждого change должны быть собственные proposal, design, specs, tasks, Gherkin-сценарии и verification evidence.

Чтобы избежать огромных changes, `frade-electron-runtime` допустимо разделить на foundation и backend lifecycle, а `frade-repository-yaml-write` — на single-resource mutations и multi-resource consistency.

# 10. Команды разработки и развертывания

После того как Codex создаст все необходимые scripts, управление проектом должно происходить из корня monorepo.

PowerShell

```
Set-Location E:\dev\codex\frade
```

### Установка

PowerShell

```
pnpm install --frozen-lockfile
```

Для первой установки без существующего lockfile:

PowerShell

```
pnpm install
```

### Разработка

PowerShell

```
# Desktop Electron
pnpm dev:desktop

# Web-приложение
pnpm dev:web

# Серверный runtime
pnpm dev:server
```

### Проверка

PowerShell

```
# Unit и пакетные тесты
pnpm test

# TypeScript
pnpm typecheck

# Lint
pnpm lint

# Полная проверка
pnpm check

# E2E
pnpm test:e2e
```

### Desktop build

PowerShell

```
pnpm --filter @frade/desktop build
```

### Создание установщика

PowerShell

```
pnpm dist:desktop
```

Команда `dist:desktop` должна создавать артефакты в заранее определённом каталоге, например `apps/desktop/release/`.

Проверки сборки desktop на Windows, macOS и Linux следует вынести в отдельные CI jobs.

### Валидация репозитория без UI

Сохраните отдельный CLI, пригодный для автоматизации:

PowerShell

```
pnpm --filter @frade/cli exec frade repository validate `
  --path ./fixtures/repositories/company-a
```

CLI должен использовать тот же Repository Application и Metamodel Compiler, что Electron backend и Fastify server. Создание третьей независимой реализации бизнес-логики недопустимо.

# 11. Итоговые архитектурные решения

Для Frade фиксируем:

|
Вопрос

|

Решение

|
| --- | --- |
|

Desktop runtime

|

Electron

|
|

UI

|

React + готовый Frade Draw

|
|

Графический движок

|

AntV X6

|
|

Backend

|

TypeScript / Node.js

|
|

Выполнение backend

|

Electron Utility Process

|
|

Системная интеграция

|

Electron Main

|
|

IPC

|

Типизированный, валидируемый

|
|

Доменная модель

|

Конфигурируемая Metamodel

|
|

Первый репозиторий

|

YAML

|
|

Универсальность хранилищ

|

Repository Ports & Adapters

|
|

Индексация

|

SQLite

|
|

Версионирование

|

Отдельный Git Provider

|
|

Web

|

Fastify с переиспользованием backend-пакетов

|
|

Процесс разработки

|

OpenSpec + BDD + TDD

|

Рекомендую начинать с двух изменений: `frade-monorepo-foundation` и `frade-electron-runtime`. Сначала необходимо перенести существующий Frade Draw без регрессий, затем создать рабочий Electron runtime с типизированным IPC и отдельным backend-процессом.

После этого конфигурируемая метамодель и YAML Repository Adapter будут разрабатываться уже на целевой технологической архитектуре, без необходимости последующего переноса с Tauri или переписывания интеграции.

Для первого запуска Codex используйте мастер-промпт из раздела 4. Он включает новую архитектуру Electron, требования к метамодели и репозиторию, процесс OpenSpec, BDD, TDD и критерии завершения.
