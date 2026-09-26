# Design

## Context

Мотивация и состав результата описаны в proposal.md. Исследование выполнено на реальном коде и данных, а не только по README, который отстаёт от реализации Repository Core.

- `packages/adapter-yaml/src/native.ts` поддерживает собственные YAML/JSON-форматы Frade. `discovery.ts` инспектирует массивы внешних записей и возвращает `canWrite: false`; прямого round-trip KA нет.
- В KA ключ верхнего уровня задаёт тип, следующий ключ — стабильный ID, значение — атрибуты. `root.yaml` импортирует `v2023/root.yaml`, откуда доступны все 19 коллекций. Всего 22 файла, 68 203 байта, 138 записей; дубликаты ID и ошибки YAML при исследовании не обнаружены.
- Распределение записей: goals 3, strategy 2, clients 4, products 4, channels 8, processes 4, business_objects 3, data_objects 17, systems 20, groups 8, functions 7, tasks 2, kb_systems 3, integrations 21, endpoints 3, softwares 3, tech_services 12, tech_params 4, criticality_passport 10.
- Каталог схем v2025 сохраняет внешние имена v2023. В нём нет `kadzo.v2023.tech_params`; соответствующее определение найдено в `_ecosystems_/kadzo/v2023/entities/technical/tech_params.yaml`, а его общий `kadzo.tech_component.type` — в v2025/common/ta_props.yaml.
- Схемы используют anchors, $defs/$rels, композицию и условные ограничения. Это не готовый `ModelSource` Frade. Внутренние типы Frade требуют `namespace:Type`; внешние идентификаторы типов не следует записывать в исходные файлы в таком виде.
- В KA отсутствуют цели ссылок `sber.softwares.mysql`, `ms_ad`, `cbsec.bizone_qurator`, `sftp`, `nginx`, `prometheus`, `kafka` с общим префиксом `sber.softwares.`. Полная семантическая проверка набора ещё не выполнялась; отсутствие ошибок YAML не означает соответствия всем схемам.
- `apps/desktop/src/renderer/main.tsx` монтирует Draw. Репозиторный IPC существует, но `RepositoryDesktopController` открывает NativeAdapter в Main; Utility сейчас обслуживает health. Пакеты UI отсутствуют, однако прямо предусмотрены master prompt.
- `frade-repo-core` остаётся активным change с незавершёнными задачами. Его утверждение о том, что Navigator/Inspector не входят в scope, относится к прежнему change; настоящий change добавляет этот scope отдельно.

## Goals / Non-Goals

**Goals:** обеспечить обратимый переход между физическими YAML и объектами Core, единую семантику проверки в UI/backend, независимые UI-пакеты, подтверждённое сохранение и измеряемое соответствие VSCode.

**Non-Goals:** миграция KA в native v1/v2, автоматическая правка исходного набора для прохождения проверок, генерация отсутствующих справочников, cloud-сервисы, автоматический Git commit/push, завершение всех остальных задач `frade-repo-core`. Создание/удаление сущностей и файлов не является условием данного шестишагового сценария; UI не показывает такие операции работающими без соответствующих capabilities. Архитектурный граф и дерево входят в Core и навигатор; отдельная новая свободная диаграмма не подменяет требуемые дерево и карточки.

## Decisions

### 1. Package ownership and dependency direction

| Package                                   | Responsibility                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `adapter-sberea-yaml` (new)               | sberea format traversal, AST/provenance, source mapping, guarded writes, watchers and recovery                                                               |
| `adapter-yaml` (existing)                 | Existing native v1/v2 formats; no embedded sberea behavior                                                                                                   |
| `metamodel-config` (new)                  | Host-neutral translation of supplied schema/doc documents into Frade model input and source mapping descriptors; receives documents through injected loaders |
| `metamodel-domain` / `metamodel-compiler` | General typed constraints, effective types, references, deterministic composition and model fingerprints; no KA paths or entity names in generic logic       |
| `repository-domain` / `repository-ports`  | Portable entity/provenance contracts and additive metadata, diagnostic and validation-policy contracts                                                       |
| `repository-application`                  | Session, command authorization, prospective-state validation, baseline diagnostic comparison, event sequencing and mutation outcome                          |
| `repository-api`                          | Versioned metadata/diagnostic/query/command/event DTOs; no YAML or renderer state                                                                            |
| `runtime-node`                            | Composition of adapter, model loader and application session in a host-independent backend service                                                           |
| `runtime-electron` / `runtime-contracts`  | Validated transport, requests/events, cancellation, deadlines, backend lifecycle                                                                             |
| `ui-navigator` (new)                      | Pure tree projections and React explorer interactions using a portable repository client                                                                     |
| `ui-inspector` (new)                      | Effective-metadata fields, draft state and validation presentation using that client                                                                         |
| `ui-workspace` (new)                      | VSCode layout, tabs/groups, commands, focus and persisted workspace state; composes navigator/inspector                                                      |
| `apps/desktop`                            | Main dialogs and trusted directory capabilities; preload bridge; Utility composition; renderer mounts workspace                                              |

UI packages must not import Node, Electron, adapter implementations or backend application instances. Leaf navigator/inspector packages consume injected theme values or CSS variables; they must not import their composing ui-workspace package and create a dependency cycle. Pure model/domain packages retain ES2022-only checks. Add public entry points and executable boundary rules with negative cases. Draw remains independent; repository context is provided through existing bridge interfaces when needed.

Alternative rejected: a monolithic desktop component reading YAML directly would bypass existing command validation and create a second repository implementation.

```text
Renderer: ui-workspace --> ui-navigator + ui-inspector
                        |
                 repository-api DTOs
                        |
                  Preload / Main relay
                        |
Utility: runtime-node --> repository-application
                        |                 |
                adapter registry    compiled metamodel
                        |                 |
                 KA source files    metamodel-config
```

### 2. Explicit source profile and complete import accounting

Main selects each repository data root and its metadata folder independently. The sibling `_ecosystems_` is only a pilot default, not a required location. Store an ordered list of entries in a versioned `.frade-workspace` file: stable repository UUID, label, data-root path, adapterKind, named metadata sets and active set. Untitled workspaces retain the same structure in local app state until Save Workspace As. Reopening or explicitly relocating an entry retains its UUID. Relative paths resolve against the workspace file; untitled workspaces use absolute paths, and Save As rebases paths without changing their targets. Canonicalized physical roots prevent duplicate writer sessions; duplicate Add focuses the existing entry. A cloned distinct directory added as another repository receives its own UUID. Settings paths are data validated by the host, never renderer filesystem authority.

Each entry records adapterKind (sberea for this format), root.yaml entry, permitted roots, metadata sets and diagnostic policy. The backend registry maps kinds to injected adapter factories; YAML extension alone never selects sberea. Add a second-format conformance fixture proving dispatch independence without implementing another corporate adapter. The implementation package is @frade/adapter-sberea-yaml; the capability is sberea-yaml-repository. Format-specific source decoding/mapping stays in this adapter; metamodel-config exposes public translation contracts with an explicitly selected dialect, so future YAML adapters can supply their own mapping without changing generic domain/UI behavior. Existing KA requirement IDs stay stable for traceability.

Each named metadata set records id/label, folderPath and schema/document/extension entries relative to that folder. For the baseline `_ecosystems_` folder these are kadzo/v2025/entities/root.yaml, docs/metamodel and kadzo/v2023/entities/technical/tech_params.yaml. A different folder layout can supply different relative entries; nothing resolves against the application checkout or an old hardcoded sibling. Several repositories may select the same folder without sharing mutable session state. Read schema files as read-only dependencies, separate from writable architecture data. Do not recursively ingest the entire ecosystems tree: its functions, datasets and presentations are not KA objects and must not be executed.

Resolve imports relative to their containing file; maintain visiting/visited sets, finite depth/file/byte limits and a per-file accounting manifest. Duplicate imports are harmless; cycles, missing inputs, invalid structures and ambiguous duplicate IDs are diagnosed. Unknown top-level collections appear in the accounting report instead of disappearing. The `sber` roots are accessible as repository metadata; preservation is mandatory, while unmodelled configuration does not acquire invented editable semantics.

The baseline is small enough for a bounded snapshot; keep existing decoder limits and use paging in public UI queries. No native-v2 conversion is necessary. Reject oversized input explicitly rather than dropping records.

### 3. Stable entities, references and graph projections

Preserve source IDs as objectId. Map each source type to an internal namespaced ID through an explicit table (for example, external `kadzo.v2023.systems` to internal `sberea:kadzo.v2023.systems`), with inverse mapping used by serialization. Keep original source type and YAML path in adapter-owned provenance rather than identity.

Name mapping uses configured fields: title, goal, strategy, task, description where appropriate, then ID. UI displays a readable fallback without writing it into attributes. Stable object identity does not change when any name field changes.

Resolve `$rels` through entity definitions and their `objects` routes. Reference-valued attributes become qualified references in canonical DTOs and return to their exact source string representation on save. Every source record, including each integration and criticality passport, stays an independently selectable object. Derived graph edges represent reference fields, list memberships and parent links. Their deterministic identifiers use owner identity, logical attribute path and target identity (plus occurrence ordinal for identical repeated values), never a physical file location or a list index that changes on reorder. They are projections of those attributes, not independently writable duplicates.

An object update and its changed derived edges are prepared and validated together. Add a generic adapter projection contract if the existing command path cannot express this; no KA-specific regeneration belongs in Core. The write boundary still belongs to the owning source file. Source-bound edge mutation goes through its owning attribute; independent create/delete relation commands are unsupported for these projections. A multi-file atomic request is rejected before writing.

Alternative rejected: turning integrations exclusively into bare Core relations loses their identity as rich editable KA records and complicates references to integrations.

### 4. Schema compilation and presentation metadata

`metamodel-config` accepts parsed documents through a loader port; filesystem loading lives in the adapter/backend. Build a registry of entity schemas, shared definitions and relation routes. Add the historical tech_params schema explicitly and fingerprint the complete model input. Resolve references with cycle detection and declared supported constructs; imports never evaluate JSONata, JavaScript or external executable content.

Translate ordinary field types to existing ValueSchema. Extend public metamodel contracts additively for the generic constraint semantics actually needed by allOf/anyOf/oneOf/if/then/pattern and controlled additional attributes, rather than implementing a second weaker validation engine in UI. Keep composed validation rules alongside effective field metadata: flattening fields for display must not flatten away alternatives or conditional requirements. Backend remains authoritative; UI consumes the same compiled rules or their public projection.

Schema title/description is authoritative. docs/metamodel supplies supplementary help or fallback text keyed by exact type and attribute, never by fuzzy name. Conflicting documentation is reported without overriding schema constraints. Render documentation as safe text/Markdown with no executable HTML.

Unknown existing fields remain in the canonical attribute payload through an explicit additional-attribute policy. Show them in a supplementary section; only fields with supported safe editing controls are writable. Distinguish missing/null/empty/false/zero through explicit field state. Loading does not insert defaults; a deliberate UI field addition may use an advertised default without changing unrelated fields.

### 5. Baseline diagnostics without blanket validation bypass

The provided dataset is not assumed semantically clean. The sberea profile explicitly opts into a generic repair policy while native adapters retain strict validation. Structural integrity (safe parsing, complete imports, unique identities and supported mapping) remains a prerequisite for any write. Structural failures cannot be grandfathered.

For a complete pinned snapshot, collect semantic diagnostics keyed by entity, attribute path, rule and offending value/target. Validate the complete prospective state after each change, including affected references and projected graph edges. Allow only if its diagnostic multiset is a subset of the baseline with no strengthened severity and no newly invalid changed value. A changed invalid value cannot reuse a previous error merely because code/path matches; compare offending values and rule evidence. Fixes remove diagnostics. Unsupported rules make the affected records read-only, rather than eligible for repair bypass.

Recompute baseline after successful writes/reloads. Validate under the same source/model revision at the adapter write boundary. A permissive frontend never bypasses this policy. Report missing external targets with their original IDs; do not invent placeholders that falsely satisfy validation. Add deliberate invalid/repair fixtures and parity tests for this policy.

### 6. Minimal source edits and one-file atomicity

Retain document AST and source locators from the pinned revision. Saving a card builds an attribute diff against its base snapshot, inverse-maps references, and changes only affected AST nodes. Preserve comments, unknown values, adjacent records, source encoding/line endings and scalar styles where untouched. Prefer source-range replacement of the affected node if whole-document serialization changes unrelated formatting. Test arrays and nested objects as well as scalars. No-op save returns without touching disk.

Under an exclusive cooperating-writer lock, verify file/import/model hashes, prepare the new file, parse and semantically validate it, record recovery evidence, flush and replace the one target file. Recheck guards immediately before replacement. Reuse native utilities only through appropriate module/public boundaries; do not pretend its whole-format serializer supports KA. Partial writes or unsafe aliases/tags are refused. Schema anchors can be read without making schema files writable.

One Save is one owning file; derived edge changes require no extra authoritative files. Save All invokes independent saves with per-object results and freshly managed source revisions; success of one does not disguise failure of another. External watchers debounce invalidation and reload coherent snapshots. An interrupted operation retains recovery evidence and follows existing explicit reconciliation/recovery patterns. No universal power-loss or noncooperating-writer exclusion guarantee is claimed.

Alternative rejected: export to repository.yaml or native-v2 would break the requirement to save directly into the supplied KA structure.

### 7. Runtime session and contracts

Move repository ownership and derived indexes to a registry in runtime-node composed inside Utility, keyed by repository UUID. Each entry owns an independent adapter/model/session, permissions, revision stream, cancellation scope and diagnostic baseline. Selecting another root never closes an existing session. Main continues to own dialog selection, permitted-root handoff, window lifecycle and a validated relay. BackendSupervisor handles request IDs, generation, cancellation, deadlines and crash signals. Health and repository readiness remain distinct.

Extend RepositoryRequest additively with model/field metadata, source-tree descriptors and diagnostics; expose session identity, revisions and declared write limitations. Provide session-scoped event subscriptions for object/relation changes, model invalidation, reload and health. Do not send filesystem handles, raw absolute locators or unbounded full graphs to renderer. Update consumers and native v1/v2 transport tests along with the move.

Backend crash preserves renderer-owned drafts. No auto-replay after crash or timeout. Lost commit confirmation remains outcome-unknown until reconciliation/source inspection can establish its outcome. Removing a repository closes only its session after its unsaved-change handling. Replacing the whole workspace handles all affected drafts. Adding/selecting another root does not prompt or close sessions. Route requests/events by repositoryId plus sessionId/generation, and model generation for metadata-sensitive operations; reject cross-root spoofing and late responses. Failure to load one root stays local; a shared Utility process crash marks all of its sessions unavailable while retaining all drafts.

### 8. Navigator, cards and draft ownership

Default tree: workspace -> ordered repository roots -> architecture section -> type -> objects, nesting explicit parent links within the type where applicable. Source projection: workspace -> ordered repository roots -> source directories/files -> the same entity references. Keep diagnostics and source metadata visible. Cycle/orphan buckets and reference leaves ensure every record remains reachable without endless expansion. Search reveals matches with their ancestors. Fetch all required query pages; a cursor invalidated by reload restarts from a coherent revision.

Workspace owns selection, tab/group placement and a draft registry keyed by qualified object reference. Inspector owns typed field rendering and emits draft edits through that registry. Multiple views of the same object share the draft. Draft contains base snapshot/revision/model binding, edited values, field diagnostics and save state. Commands retain complete untouched attributes because current updateObject replaces the mutable body.

State flow is clean -> dirty -> validating -> saving -> clean, with error/conflict/outcome-unknown branches retaining the draft. Editing a preview pins it. Closing dirty tabs, removing roots, switching their metadata, replacing the workspace and application quit use Save/Discard/Cancel; merely activating another root preserves drafts silently. Clean objects refresh automatically; dirty objects show a three-way base/local/disk conflict view. Accepting an updated base always revalidates before issuing a new revision-guarded command. No automatic overwrite or invalid-value coercion.

### 9. VSCode fidelity as an acceptance contract

Reference: https://github.com/microsoft/vscode; behavior: https://code.visualstudio.com/docs/editing/getting-started/userinterface and https://code.visualstudio.com/docs/configure/custom-layout. At implementation start, pin an exact upstream commit/release, Windows environment, default Dark Modern theme, fonts, 100% zoom and reference screenshots. Record actual measured constants and source locations; do not invent pixel values in this plan.

`ui-workspace` provides shared tokens, Codicon assets and behavior primitives; navigator and inspector consume them. Reuse upstream code/assets where suitable with attribution and preserved licenses. Prefer narrowly ported primitives/styles to embedding or forking the entire Code OSS workbench, which would replace Frade's established React/runtime composition. Preserve standalone Draw's own baseline and integrate its surface as an editor without imposing repository dependencies.

Create a parity matrix for title/command area, Activity Bar, sidebar headers and tree rows, editor groups/tabs/breadcrumbs, splitters, bottom diagnostics and status, menus/tooltips/forms/scrollbars and all applicable mouse/keyboard states. Cover drag-resize, tab drag/reorder/group placement, single-click preview, double-click pin, dirty indicators, context menu positioning, focus restoration and shortcuts. UI actions must have working semantics; do not add clickable placeholders for unrelated VSCode tools.

Baseline screenshot comparisons use fixed 1280x850, 1600x900 and a narrow-window case; include resized layouts, expanded trees, active/inactive/dirty tabs, nested-field cards and validation states. Record geometry tolerances and rasterization-only allowances before accepting comparisons. An unmeasured or unexplained mismatch is incomplete work, not evidence of maximal fidelity. Repository-specific form content is an intentional extension of the editor surface, styled with the same controls.

### 10. Multiple repositories and workspace commands

Workspace roots are simultaneous sessions, not alternatives in one global currentRepository slot. Add Repository to Workspace, Remove Repository from Workspace, root labels/order and Open/Save Workspace As follow the familiar VSCode multi-root interaction. Persist each root's adapter and metadata settings in the workspace; keep UI expansion/layout/tab state separately keyed by workspace/repository identity. Relative paths are rebased on Save As. Restoring an unavailable root retains its configuration and a retry/fix-path action; it does not block healthy roots.

Every tab/draft/selection key includes repositoryId and objectId. Disambiguate equal tab titles with the root label in descriptions, breadcrumbs and tooltips. Save targets the active editor's repository even if the last tree selection is another root. Root settings target the explicitly selected root. Save All reports independent results per repository/object, without cross-repository atomicity. Reference pickers remain scoped to the owning repository unless an explicitly supported qualified external reference is configured; workspace membership does not silently enable federation or merge identities.

Removing a root handles only its dirty tabs and closes its resources after Save/Discard/Cancel. It never deletes files. Add/select/reorder operations leave drafts and model bindings intact. Cover two sberea roots with colliding local IDs and different metadata, plus a native root, in transport and UI acceptance.

### 11. Relocatable and switchable metadata per root

Provide repository settings with a metadata-folder path field, Browse action, named sets, Add/Edit/Remove set controls and an active-set selector. Main validates a submitted settings path and authorizes read access; renderer cannot turn a path string into arbitrary filesystem access. Resolve schema/document/extension entries under the selected folder using the same containment rules. The folder can be external to the repository, renamed, moved, shared or replaced. No automatic folder search chooses a different model when the saved path is missing.

A metadata fingerprint is based on logical input content, configured dialect/entries and compilation options, not absolute folder location. Relocating identical content preserves semantic model identity. A different set is staged as a candidate: load and compile, compare type/attribute mapping, validate the repository and show a compatibility preview. Reject missing types, incompatible mappings and unsupported constraints without changing the active binding. Existing-data semantic diagnostics are displayed in the preview and governed by the explicit repair policy; they must not be confused with structural model incompatibility.

Before activation, resolve affected dirty cards with Save under the old model, Discard or Cancel. Wait for in-flight writes and require reconciliation of unknown outcomes. Stage a complete candidate binding for this root, persist its selection through an atomic workspace-settings update, then publish one generation change that updates model, cards, diagnostics and watchers together. A failed persistence/activation keeps the old selection/binding, or marks this root unavailable until it is reloaded consistently; it must never remain writable with mismatched configuration and model. On success, old-model responses are discarded and the identity of repository/entities remains unchanged.

A missing current metadata folder disables writes for this root and offers Change Path/Retry; other roots remain usable. Switching A never switches B even if they share a folder. Actual external edits to a shared folder are detected separately by each subscribed root. Closing a root releases its subscription without stopping another root's watcher. Switching and relocating never rewrite source YAML or metadata files.

## Risks / Trade-offs

- Existing invalid data -> explicit repair policy and regression tests; never global validation disablement.
- Imported schema expressiveness exceeds ValueSchema -> additive generic constraint contracts and parity fixtures for every used construct; unsupported constructs block affected writes.
- Full-file YAML serialization changes formatting -> AST/range editing and byte/hash assertions for unaffected content; unsafe constructs fail before mutation.
- Several cards share a source file -> refresh source revision and compare object snapshots; do not treat a stale file revision as permission to overwrite.
- Current Main-owned session conflicts with target runtime -> dedicated Utility integration tests including crash, cancellation and late-response isolation.
- VSCode is a moving target -> exact pinned revision and reference matrix; compatibility is assessed against that recorded target.
- User sample availability on CI -> synthetic distributable fixtures plus explicit local sample verification on a copied dataset; missing real-data execution remains an unpassed acceptance gate.
- Concurrent work on frade-repo-core -> implement additive contracts, re-read affected public APIs before edits, and leave the other change's status/evidence untouched.

## Migration Plan

1. Add packages/contracts and the separate sberea adapter through backend registry selection; preserve native routing and regression checks.
2. Introduce backend composition and transport while retaining native-v1/v2 operation semantics.
3. Mount the workspace in Desktop, retaining access to Draw and its document lifecycle.
4. Verify on a temporary copy of KA plus read-only copies of schemas/docs; capture original hashes before any test writes.
5. Deliver opening/saving instructions and actual acceptance evidence. User opens the original repository deliberately through the implemented host dialog; deployment does not rewrite it.

Rollback selects the existing native/Draw path or restores the previous application version; KA files remain standard YAML. Recovery of an interrupted write uses retained evidence, not deletion of journals or arbitrary replacement of the user's data. Local workspace/profile state is versioned and disposable without modifying source architecture.
