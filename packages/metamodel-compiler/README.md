# @frade/metamodel-compiler

Host-independent compilation of exact-version model packages into immutable, reproducible snapshots. The only production dependency is the public @frade/metamodel-domain package. No Node, DOM, filesystem, YAML, network, UI or Electron implementation is included.

## API

| Operation                                   | Contract                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| compileModel(input, ports, options?)        | Asynchronously compile a structured envelope or JSON text; return a complete candidate or structured diagnostics, never a partial candidate.                           |
| createModelPublisher(ports)                 | Own one current snapshot. compileAndPublish uses latest-started-request-wins; current() is undefined until the first success.                                          |
| candidate.project(profileId?, viewpointId?) | Exact type selections, intersected when both are present, with presentation overlays. Neither selector means all types; empty lists mean none; unknown selectors fail. |
| candidate.analysis()                        | A defensive caller-owned ModelAnalysis copy usable with domain validators. Mutating it cannot alter the candidate.                                                     |
| compareModels(old, candidate)               | Deterministic stable-ID impact, including presentation, projection, validation-review and model-identity changes. Not a repository compatibility guarantee.            |
| previewMigration(old, candidate, context?)  | Read-only validation of a supplied complete repository snapshot and explicit old-model binding. Without context, repositoryStatus is not-evaluated.                    |

Results use ok/value/diagnostics or ok:false/diagnostics. Diagnostics contain code, severity, stage, structured path and model/entity identity when available. Structural errors may have array indices; semantic diagnostics use entity-relative paths. Loader/hash exception details are not returned.

## Sources and organization extensions

Wrap existing ModelDefinition data without changing its schema:

```ts
import { compileModel, type ModelSource, type CompilerPorts } from '@frade/metamodel-compiler'

const organization: ModelSource = {
  sourceSchemaVersion: 1,
  definition: {
    schemaVersion: 1,
    id: 'retail:model',
    version: '1.0.0',
    imports: [{ id: 'shared:model', version: '1.0.0' }],
    objectTypes: [],
    relationTypes: [],
    profiles: [],
    viewpoints: [],
  },
  extensions: [
    {
      targetKind: 'object',
      targetId: 'shared:service',
      attributes: [
        { id: 'owner', required: true, default: 'unassigned', schema: { kind: 'string' } },
      ],
    },
  ],
}
declare const ports: CompilerPorts
const result = await compileModel(organization, ports)
// A successful result contains result.value.lock, fingerprint and effective definitions.
```

The loader receives an exact {id, version} and returns an envelope or JSON text. The compiler checks returned identity, deduplicates diamonds per run and rejects missing imports, cycles, version conflicts and duplicate entity IDs across packages/categories. It does not fetch packages itself.

Extensions target object or relation types owned by transitive imports. They may add new attributes only; existing own/inherited attributes, relation policies, parent, abstract flag and lifecycle cannot be replaced. Identical duplicate additions also fail. Ancestor additions reach descendants; conflicting descendant declarations fail final domain analysis. Extensions cannot repair invalid base models or target a sibling-only/local type.

[Typechecked examples](./tests/consumer/examples.ts) compile retail owner and research laboratory vocabularies independently from the same base service type.

## Fingerprints and locks

ports.sha256 must return a Promise of 64 lowercase hexadecimal characters: standard SHA-256 of the supplied canonical text encoded as UTF-8. Use the host's standard cryptographic implementation. Known-vector conformance tests cover empty text, abc and Japanese text; tests use Node crypto, which is not imported into production.

Canonicalization sorts object keys, keyed declarations and set-like selections. Lineage and arbitrary default arrays retain their order. Both the published data and fingerprint are independent of declaration ordering. Presentation, source content, exact versions and constraints affect identity. Explicit source declarations can produce different source hashes even when their effective defaults are equivalent. No timestamps or host paths enter identity.

A successful candidate includes a ModelLock with lockSchemaVersion:1, fingerprintFormatVersion:1, root, exact package identities/content hashes (including root) and fingerprint. Passing {lock} enables locked compilation: sources are reloaded, hashes recomputed and the exact graph/content verified. Supplied locks are copied and never rewritten. Omitting lock explicitly compiles unlocked and returns a new DTO. The host owns disk persistence. Fingerprints/locks are not signatures or evidence of publisher authenticity.

## Publication and immutability

compileModel does not publish. The publisher swaps the complete candidate only after success. A failure leaves the last successful snapshot unchanged. Once a newer request starts, every older request is superseded, even if the newer one fails. Loader cancellation/timeouts remain host responsibilities; a permanently pending loader cannot partially publish.

Snapshots, locks and projections are deeply frozen plain data. No mutable Map is exposed from published state; analysis() returns new maps and copies. Inputs are not frozen or modified. Never infer runtime immutability merely from TypeScript ReadonlyMap.

## Profiles and migration preview

Profiles select explicit IDs without subtype expansion. Viewpoints may style only selected types. A selected relation can have hidden endpoint types; visibility is neither relation eligibility nor operation authorization. Always validate repository state against the complete analysis, not a filtered projection.

Preview context is {binding:{modelId, modelVersion, fingerprint}, snapshot:{objects, relations}}. Binding must match the supplied old model. The caller must supply complete repository state; freshness and completeness cannot be proven by the compiler. Diagnostics retain repository-qualified object/relation identities, including when their local IDs coincide. Preview never applies defaults to stored objects, updates the binding, emits deletion commands or executes migrations. A type removal is a review item, not deletion authorization.

## Resource limits

| Resource                                     |                     Maximum |
| -------------------------------------------- | --------------------------: |
| JSON source text                             | 1,000,000 UTF-16 code units |
| Source/lock nesting depth                    |                          64 |
| Visited values per source/lock/preview input |                     100,000 |
| Packages including root                      |                       1,024 |
| Import edges                                 |                       8,192 |
| Import graph depth including root            |                         128 |
| Aggregate source values                      |                   1,000,000 |
| Flattened domain input values                |                     100,000 |

Excess input fails with RESOURCE_LIMIT; there is no truncation or larger-limit override. Finite plain JSON data only: accessors, cycles, dangerous keys, functions, symbols, sparse arrays and custom prototypes fail. Depth and value limits describe structural traversal, not a wall-clock timeout.

## Verification

```powershell
pnpm --filter @frade/metamodel-domain build
pnpm --filter @frade/metamodel-compiler build
pnpm --filter @frade/metamodel-compiler typecheck
pnpm --filter @frade/metamodel-compiler test
pnpm --filter @frade/metamodel-compiler test:bdd
pnpm check:all
```

The focused compiler declaration build consumes domain declarations; the root dependency-aware build builds them first. The consumer fixture has ES2022 only, without Node/DOM ambient types. BDD executes all 99 planned cases with awaited assertion-bearing steps. Property tests run 200 cases each with seed 20260924. Root gates also check source/manifest isolation, Draw Chromium and real Electron regressions.

Repository permission policy, YAML adapters, production host hashing adapters, persistent locks, transactional adoption, migration execution and desktop UI wiring remain separate stages.
