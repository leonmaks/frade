# @frade/metamodel-domain

Pure TypeScript domain primitives for configurable architecture vocabularies. Production code has no package, Node, UI, Electron, storage or runtime dependency.

## Public operations

| Operation                                                               | Contract                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `decodeModel(unknown)`                                                  | Validate and copy a version-1 definition. Does not fetch imports or require externally referenced types to be locally present.                 |
| `analyzeModel(unknown)`                                                 | Validate a complete supplied definition set, resolve single inheritance and check all type references. Returns no partial analysis on failure. |
| `validateValue(schema, unknown, context?)`                              | Validate and copy one value without coercion.                                                                                                  |
| `validateAttributes(fields, unknown, context?)`                         | Validate an attribute map and return copied values with defaults applied only to absent fields.                                                |
| `isSubtype(analysis, typeId, ancestorId)`                               | Known-type equality or transitive single-inheritance membership.                                                                               |
| `relationEligibility(analysis, relationId, sourceTypeId, targetTypeId)` | Preliminary type compatibility, explicitly tagged `scope: 'types-only'`; not mutation approval.                                                |
| `validateSnapshot(analysis, prospectiveSnapshot)`                       | Check a complete prospective object/relation state, returning a copy on success. Does not commit, fetch, authorize or normalize the snapshot.  |
| `objectKey({ repositoryId, objectId })`                                 | Collision-safe key for caller-supplied reference target maps.                                                                                  |

Operations that can fail return `{ ok: true, value, diagnostics: [] }` or `{ ok: false, diagnostics }`. Diagnostics contain code, severity, path and entityId when known. Semantic paths are entity-relative and diagnostics canonically ordered; structural decode paths may contain source-array indices.

## Example

```ts
import { analyzeModel, validateAttributes, type ModelDefinition } from '@frade/metamodel-domain'

const model: ModelDefinition = {
  schemaVersion: 1,
  id: 'company:model',
  version: '1.0.0',
  imports: [],
  objectTypes: [
    {
      id: 'company:service',
      attributes: [
        { id: 'name', required: true, schema: { kind: 'string', minLength: 1 } },
        { id: 'enabled', default: true, schema: { kind: 'boolean' } },
      ],
    },
  ],
  relationTypes: [],
  profiles: [],
  viewpoints: [],
}
const analysis = analyzeModel(model)
if (analysis.ok) {
  const fields = analysis.value.objectTypes.get('company:service')!.attributes
  const checked = validateAttributes(fields, { name: 'Orders' })
  // checked.value, on success: { name: 'Orders', enabled: true }
}
```

## Definitions and conservative MVP policies

Model/type/profile/viewpoint IDs use `namespace:local-name`: ASCII alphanumeric initial characters, with dots, underscores and hyphens permitted thereafter. Attribute/state keys are local identifiers; prototype-sensitive keys are rejected. Labels do not establish identity.

The schemaVersion is 1. Model/import versions are exact [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) strings; import loading and version selection belong to the compiler. Profiles select type IDs; viewpoints select type IDs plus UI presentation metadata. They have no domain-constraint override channel.

Object types support one parent, explicit abstract flags, attributes, lifecycle declarations and UI metadata. A child's abstract flag is not inherited. Attributes and lifecycle are inherited. An inherited attribute can be redeclared with equal domain semantics, changing only label/description metadata; changing kind, defaults, nullability, required or constraints is rejected. Lifecycle redeclarations must be semantically identical. Lifecycle transitions are declarations, not a permissions or workflow engine.

## Attribute semantics

All eleven kinds are available: string, text, integer, decimal, boolean, date, datetime, enum, reference, list and object.

- Required presence and nullable values are independent. Explicit null never triggers a default.
- Defaults validate through the same machinery and are copied; absent optional parent objects are not synthesized.
- Integer means a safe integer. Decimal means a finite JavaScript number, not arbitrary-precision money.
- String/text bounds count Unicode code points. Enums are unique strings. Object values reject undeclared fields.
- Dates are real Gregorian YYYY-MM-DD calendar dates. Datetimes use an [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) subset with seconds and explicit Z/offset; leap seconds are rejected.
- References carry repositoryId/objectId, never storage paths. Supply `context.targets` keyed with objectKey and `context.analysis` for subtype matching. Unresolved target information fails explicitly. Reference defaults are structurally checked with definitions and resolved when applied to an instance.
- Inputs must be finite JSON-shaped data. Functions, accessors, cyclic objects, nonstandard array/object prototypes, sparse arrays and dangerous keys are rejected. Maximum traversal depth is 64; the visited-value budget is 100,000. Limit failures return diagnostics instead of partial values.

Readonly analysis/maps are caller-owned domain results. Treat them as immutable; construct them with analyzeModel rather than synthesizing an analysis from unchecked objects.

## Relation semantics and caller responsibilities

Relations have independent repository-qualified identities. Endpoint rules use typeIds plus an explicit includeSubtypes flag. Defaults: directed, self-reference forbidden, same-type-and-pair duplicates forbidden, min=0 and max=null (unbounded).

Directed bounds count outgoing/source and incoming/target participation separately. Undirected matching accepts either orientation, requires equal endpoint cardinalities and counts each incident relation once, including an allowed self-loop. Reversed undirected pairs are duplicates. `duplicates: 'allow'` permits parallel independently identified relations.

Final validation requires **all objects and relations relevant to the constraints**. Supply the complete prospective state after inserting/replacing/removing a relation. An update appears once by stable identity. Minimum cardinality also checks eligible objects with no relations. Invalid edges do not satisfy lower bounds.

Snapshot validation checks attribute defaults but returns the unchanged copied snapshot; call validateAttributes explicitly if a write operation needs materialized defaults. Repository Core will own freshness, permissions, revisions, transactions and persistence.

## Tests

```powershell
pnpm --filter @frade/metamodel-domain test
pnpm --filter @frade/metamodel-domain test:bdd
pnpm --filter @frade/metamodel-domain typecheck
pnpm test:boundaries
pnpm check:all
```

The BDD runner executes all 54 planned concrete cases and rejects missing/ambiguous steps and unexpanded outlines. Five [fast-check properties](https://fast-check.dev/docs/core-blocks/properties/) run 200 cases each with seed 20260923. The consumer fixture typechecks without Node/DOM ambient types.

No YAML loader, import compiler, fingerprint, model publication, lockfile/migration engine, repository adapter or new desktop UI is included.
