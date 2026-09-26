# Pre-flight findings

- No AGENTS.md in this workspace or its package directories; unrelated sibling AGENTS do not apply.
- pnpm12/Node24/TypeScript5.9/React18, Vitest+RTL, Playwright Electron; root check:all, format:check and OpenSpec strict are existing gates.
- Canonical ObjectRef is {repositoryId,objectId}. Object IDs are globally unique within repository; typeId belongs to resolved entity.
- RepositorySession provides queryObjects/getObject/applyChanges/validate, authentication, optimistic revisions, events, cancellation and reconciliation.
- RepositoryApi and scoped WorkbenchClient route IPC. RepositoryBackend owns adapters and physical identity mapping.
- SqliteIndex/PagedCatalog are existing general indexes. Neither exposes configured source/consumer attributes as an unordered flow pair; a specialized derived pair index is needed inside the application service.
- ImportedType/Constraint/constraintFields and TypePresentation provide labels, reference targets, enum/array rules and nameFields. ObjectInspector already renders all attributes and LOV references.
- KA adapter projects references into derived relations; sourceValidation and writer currently only accept existing-object updates. Creation requires extending the same single-source writer.
- Frade DiagramEdge stores bundle:{kind:'empty'}; graphAdapter maps repositoryBundle. X6 history batches own undo/redo. Draw.io fradeBundle XML metadata and model transactions are equivalent.
- Workbench dirty/save/discard/tab lifecycle and root-scoped events are reused.
- Iframe messages are origin/source checked; new bundle protocol remains bounded and validated.

The original request is preserved in request.txt. All 42 requested BDD scenarios are retained in the feature file. The user's explicit implementation instruction supersedes the planning-only default of openspec-propose.
