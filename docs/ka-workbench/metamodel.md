# Metamodel configuration API

`@frade/metamodel-config` imports a declarative entity dialect through injected `DocumentLoader`, `ConfigDialect` and SHA-256 ports. It has no filesystem, Electron or renderer dependency. The sberea adapter supplies the rooted YAML/text loader and the `sberea` mapping. The public example is exercised through `packages/runtime-node/tests/repositories.test.ts` and the adapter conformance suites.

```ts
import { importMetamodel, type MetadataSet } from '@frade/metamodel-config'

const set: MetadataSet = {
  id: 'production',
  label: 'KA v2025 + historical tech_params',
  folderPath: authorizedMetadataFolder,
  dialect: 'sberea',
  schemaEntries: [
    'kadzo/v2025/entities/root.yaml',
    'kadzo/v2023/entities/technical/tech_params.yaml',
  ],
  documentEntries: selectedRelativeDocumentationEntries,
}
const model = await importMetamodel(set, rootedLoader, dialect, sha256)
```

The profile selects v2025 explicitly. The extra v2023 technical entry supplies the four historical tech_params records which have no replacement definition in this input. The UI identifies its source. This does not infer a version from data-file names or rewrite external `kadzo.v2023.*` identifiers.

Imports are relative to their containing entry. Repeated imports are deduplicated; import cycles, escaped paths, conflicting definitions, missing definitions/routes and unsupported constructs fail explicitly. The loader must enforce realpath containment as well as the portable entry checks. Import limits are depth 64, 1024 documents, 16 million canonical/text characters and 100,000 expanded schema nodes.

Entity `schema.$defs` definitions form a registry. `#/$defs/...` is resolved with cycle detection. `#/$rels/...` resolves a declared root object route to allowed target types. The dialect maps external types reversibly to `sberea:<external-id>`, while object IDs stay unchanged. Relationship fields become qualified object references internally and serialize back to the original source IDs.

Supported normalized constraints: primitive/object/array/null types; properties, patternProperties, additionalProperties; required; items; enum and const; numeric, string and list bounds; pattern; date/date-time; allOf, anyOf, oneOf; if/then/else; reference targets; literal defaults. Unknown keywords and executable/remote references are rejected. This is a bounded dialect for the provided schemas, not a claim of full JSON Schema support.

`constraintFields` exposes effective rules and conditional required fields. Schema title/description wins; absent values fall back to documentation tables keyed by external type and field, then the source key. Definition comments supply field groups. Documentation is displayed as literal text without executing Markdown HTML. Unknown attributes remain visible and round-trip through full-object saves. Defaults are suggestions for explicit Add actions and never materialize during reads.

Fingerprint covers sorted logical inputs, normalized types and documentation text. Absolute folder paths, set labels and set IDs are excluded, so moving identical content retains the fingerprint. A changed definition or document changes it. Compile and consumer type checks run in `pnpm check:all`.

Desktop named-set staging, compatibility checks, persistence rollback and independent model generations are described in [client.md](client.md). User actions are in the [Workbench guide](README.md).
