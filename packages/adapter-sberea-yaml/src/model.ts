import {
  importMetamodel,
  mapAttributeReferences,
  type MetadataSet,
  type ImportedMetamodel,
  type ConfigDialect,
} from '@frade/metamodel-config'
import { compileModel, type ModelSource } from '@frade/metamodel-compiler'
import { validateConstraint, type JsonValue } from '@frade/metamodel-domain'
import {
  canonicalJson,
  failure,
  success,
  record,
  type RepositorySnapshot,
  type RepositoryRelation,
  type RepositoryObject,
  type Revision,
  type Issue,
} from '@frade/repository-domain'
import type { RepositoryModel } from '@frade/repository-ports'
import { hash, textFile, parseFile, fail } from './files'
export const sbereaDialect: ConfigDialect = {
  id: 'sberea',
  mapping: (externalId, source) => ({
    externalId,
    typeId: 'sberea:' + externalId,
    nameFields: ['title', 'goal', 'strategy', 'task', 'description'],
    ...(externalId === 'kadzo.v2023.integrations'
      ? {
          integrationFlow: {
            status: 'status',
            source: 'source',
            consumer: 'consumer',
            search: ['description', 'source', 'consumer', 'data-objects', 'technologies', 'status'],
            columns: [
              { field: 'data-objects', label: 'Объекты данных' },
              { field: 'technologies', label: 'Технологии' },
              { field: 'technical-use', label: 'Механизм использования' },
              { field: 'async', label: 'Асинхронный' },
              { field: 'status', label: 'Статус' },
            ],
            nonCloneable: [],
          },
        }
      : {}),
    section: source.includes('/business/')
      ? 'Бизнес-архитектура'
      : source.includes('/information/')
        ? 'Архитектура данных'
        : source.includes('/technical/')
          ? 'Технологическая архитектура'
          : source.includes('/application/')
            ? 'Прикладная архитектура'
            : 'Архитектурные сведения',
  }),
}
export function defaultMetadataSet(folderPath: string): MetadataSet {
  return {
    id: 'v2025',
    label: 'КАДЗО v2025 + tech_params v2023',
    folderPath,
    dialect: 'sberea',
    schemaEntries: [
      'kadzo/v2025/entities/root.yaml',
      'kadzo/v2023/entities/technical/tech_params.yaml',
    ],
    documentEntries: [
      'docs/metamodel/kadzo-app.md',
      'docs/metamodel/kadzo-ba.md',
      'docs/metamodel/kadzo-da.md',
      'docs/metamodel/kadzo-change.md',
    ],
  }
}
export async function loadModel(
  root: string,
  set: MetadataSet,
): Promise<{ metadata: ImportedMetamodel; model: RepositoryModel }> {
  const metadata = await importMetamodel(
    set,
    {
      load: async (entry) => parseFile(entry, await textFile(root, entry)).value,
      text: (entry) => textFile(root, entry),
    },
    sbereaDialect,
    async (text) => hash(text),
  )
  const definition: ModelSource = {
    sourceSchemaVersion: 1,
    definition: {
      schemaVersion: 1,
      id: 'sberea:metamodel',
      version: '2025.0.0',
      imports: [],
      profiles: [],
      viewpoints: [],
      objectTypes: metadata.types.map((t) => ({
        id: t.typeId,
        attributes: [],
        ui: { label: t.label, description: t.description },
        ...(t.integrationFlow ? { integrationFlow: t.integrationFlow } : {}),
      })),
      relationTypes: [
        {
          id: 'sberea:reference',
          source: { typeIds: metadata.types.map((t) => t.typeId), includeSubtypes: false },
          target: { typeIds: metadata.types.map((t) => t.typeId), includeSubtypes: false },
          attributes: [],
          allowSelfReference: true,
          duplicates: 'allow',
        },
      ],
    },
  }
  const compiled = await compileModel(definition, {
    load: async () => {
      throw Error('Unexpected model import')
    },
    sha256: async (text) => hash(text),
  })
  if (!compiled.ok) fail('METAMODEL_INVALID', JSON.stringify(compiled.diagnostics))
  const model: RepositoryModel = {
    modelId: compiled.value.id,
    modelVersion: compiled.value.version,
    fingerprint: metadata.fingerprint,
    analysis: compiled.value.analysis,
    sourceValidation: {
      mode: 'repair',
      project: (snapshot, previous) => {
        // Derived graph is authoritative. Existing updates and configured flow creation only.
        if (
          canonicalJson(snapshot.relations as unknown as JsonValue) !==
          canonicalJson(previous.relations as unknown as JsonValue)
        )
          return failure('UNSUPPORTED_CAPABILITY')
        if (
          previous.objects.some(
            (old) => !snapshot.objects.some((o) => o.ref.objectId === old.ref.objectId),
          )
        )
          return failure('UNSUPPORTED_CAPABILITY')
        for (const o of snapshot.objects) {
          const old = previous.objects.find((x) => x.ref.objectId === o.ref.objectId)
          if (old && (old.typeId !== o.typeId || old.ref.repositoryId !== o.ref.repositoryId))
            return failure('UNSUPPORTED_CAPABILITY')
          const type = metadata.types.find((t) => t.typeId === o.typeId)
          if (!type) return failure('METAMODEL_INVALID')
          if (
            !old &&
            (!type.integrationFlow ||
              !type.idPatterns.every((p) => new RegExp(p, 'u').test(o.ref.objectId)))
          )
            return failure('UNSUPPORTED_CAPABILITY')
          if (o.name !== objectName(o.attributes, type.nameFields, o.ref.objectId))
            return failure('INVALID_INPUT')
        }
        const relations = projectRelations(snapshot.objects, metadata).map((r) => ({
          ...r,
          revision:
            previous.relations.find((old) => old.ref.relationId === r.ref.relationId)?.revision ??
            ('pending' as Revision),
        }))
        return success({ ...snapshot, relations })
      },
      diagnostics: (snapshot) => modelDiagnostics(snapshot, metadata),
    },
  }
  return { metadata, model }
}
export function objectName(
  attributes: Readonly<Record<string, JsonValue>>,
  fields: readonly string[],
  fallback: string,
): string {
  for (const field of fields) {
    const value = attributes[field]
    if (typeof value === 'string' && value.trim()) return value.split(/\r?\n/)[0].slice(0, 240)
  }
  return fallback
}
export function canonicalAttributes(
  attributes: JsonValue,
  rule: Parameters<typeof mapAttributeReferences>[1],
  repositoryId: string,
): Record<string, JsonValue> {
  return mapAttributeReferences(attributes, rule, (v) =>
    typeof v === 'string' ? { repositoryId, objectId: v } : v,
  ) as Record<string, JsonValue>
}
export function sourceAttributes(
  attributes: Readonly<Record<string, JsonValue>>,
  rule: Parameters<typeof mapAttributeReferences>[1],
  repositoryId: string,
): Record<string, JsonValue> {
  return mapAttributeReferences(attributes, rule, (v) => {
    if (record(v) && typeof v.objectId === 'string') {
      if (v.repositoryId !== repositoryId)
        fail('ACCESS_DENIED', 'Cross-repository source reference')
      return v.objectId
    }
    return v
  }) as Record<string, JsonValue>
}
export function projectRelations(
  objects: readonly RepositoryObject[],
  metadata: ImportedMetamodel,
): RepositoryRelation[] {
  const relations: RepositoryRelation[] = []
  for (const object of objects) {
    const type = metadata.types.find((t) => t.typeId === object.typeId)
    if (!type) continue
    const occurrences = new Map<string, number>()
    mapAttributeReferences(object.attributes, type.rule, (value, _targets, path) => {
      if (
        record(value) &&
        typeof value.repositoryId === 'string' &&
        typeof value.objectId === 'string'
      ) {
        const logical = path.map((p) => (typeof p === 'number' ? '[]' : p)),
          base = canonicalJson([object.ref.objectId, logical, value] as JsonValue)
        const ordinal = occurrences.get(base) ?? 0
        occurrences.set(base, ordinal + 1)
        const relation = {
          ref: {
            repositoryId: object.ref.repositoryId,
            relationId: 'derived:' + hash(base + ':' + ordinal),
          },
          typeId: 'sberea:reference',
          source: object.ref,
          target: { repositoryId: value.repositoryId, objectId: value.objectId },
          attributes: { attributePath: logical as JsonValue, parent: logical[0] === 'parent' },
        }
        relations.push({
          ...relation,
          revision: hash(canonicalJson(relation as unknown as JsonValue)) as Revision,
        })
      }
      return value
    })
  }
  return relations
}
export function modelDiagnostics(
  snapshot: RepositorySnapshot,
  metadata: ImportedMetamodel,
): Issue[] {
  const targets = new Map(
    snapshot.objects.map((o) => [canonicalJson(o.ref as unknown as JsonValue), o.typeId]),
  )
  return snapshot.objects.flatMap((object): Issue[] => {
    const type = metadata.types.find((t) => t.typeId === object.typeId)
    if (!type)
      return [
        {
          code: 'UNKNOWN_TYPE',
          message: 'Нет определения типа',
          path: [],
          ref: object.ref,
          details: { typeId: object.typeId },
        },
      ]
    return validateConstraint(type.rule, object.attributes, {
      resolve: (ref) => targets.get(canonicalJson(ref as unknown as JsonValue)),
    }).map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: ['attributes', ...issue.path],
      ref: object.ref,
      details: {
        rulePath: [...issue.rulePath],
        present: Object.hasOwn(issue, 'value'),
        ...(Object.hasOwn(issue, 'value') ? { value: issue.value! } : {}),
      },
    }))
  })
}
