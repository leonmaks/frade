import { realpath, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { parseDocument } from 'yaml'
import {
  copyJson,
  fields,
  record,
  nonblank,
  fieldValue,
  decodeObject,
  decodeRelation,
  entityKey,
  failure,
  success,
  type Result,
  type RepositoryObject,
  type RepositoryRelation,
  type Issue,
} from '@frade/repository-domain'
import { contained, boundedText } from './native'
export interface RecordMapping {
  readonly recordsPath: string
  readonly idPath: string
  readonly typePath: string
  readonly attributesPath: string
  readonly namePath?: string
  readonly sourcePath?: string
  readonly targetPath?: string
  readonly typeMap: Readonly<Record<string, string>>
  readonly identityMap?: Readonly<Record<string, string>>
}
export interface ExternalSchemaMapping {
  readonly repositoryId: string
  readonly files?: readonly string[]
  readonly directories?: readonly string[]
  readonly patterns?: readonly string[]
  readonly objects?: RecordMapping
  readonly relations?: RecordMapping
}
export interface DiscoveryResult {
  readonly canWrite: false
  readonly objects: readonly RepositoryObject[]
  readonly relations: readonly RepositoryRelation[]
  readonly diagnostics: readonly Issue[]
}
/** Inspection only: no external serialization or corporate schema is inferred. */
export async function inspectMappedRepository(
  root: string,
  input: unknown,
): Promise<Result<DiscoveryResult>> {
  const safe = copyJson(input)
  if (!safe.ok) return safe
  const v = safe.value
  if (
    !fields(v, ['repositoryId'], ['files', 'directories', 'patterns', 'objects', 'relations']) ||
    !nonblank(v.repositoryId)
  )
    return failure('PROFILE_INVALID')
  for (const list of [v.files, v.directories, v.patterns])
    if (list !== undefined && (!Array.isArray(list) || list.length > 1000 || !list.every(nonblank)))
      return failure('PROFILE_INVALID')
  for (const mapping of [v.objects, v.relations])
    if (
      mapping !== undefined &&
      (!fields(
        mapping,
        ['recordsPath', 'idPath', 'typePath', 'attributesPath', 'typeMap'],
        ['namePath', 'sourcePath', 'targetPath', 'identityMap'],
      ) ||
        !record(mapping.typeMap))
    )
      return failure('PROFILE_INVALID')
  const mapping = v as unknown as ExternalSchemaMapping,
    objects: RepositoryObject[] = [],
    relations: RepositoryRelation[] = [],
    diagnostics: Issue[] = [],
    seen = new Set<string>()
  try {
    const base = await realpath(root),
      files = [...(mapping.files ?? [])]
    if (mapping.directories) {
      const patterns = mapping.patterns ?? ['*.yaml', '*.yml', '*.json']
      if (patterns.some((p) => !/^[-a-zA-Z0-9_.*]+$/.test(p))) return failure('PROFILE_INVALID')
      const matchers = patterns.map(
        (p) => new RegExp('^' + p.replaceAll('.', '\\.').replaceAll('*', '.*') + '$'),
      )
      const scan = async (directory: string, depth: number): Promise<void> => {
        if (depth > 8 || files.length > 1000) throw Error('Resource limit')
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (entry.isSymbolicLink()) {
            diagnostics.push({
              code: 'UNSUPPORTED_MAPPING',
              message: 'Symbolic links are not traversed',
              path: [],
            })
            continue
          }
          const path = join(directory, entry.name)
          if (entry.isDirectory())
            await scan(await contained(base, relative(base, path)), depth + 1)
          else if (matchers.some((p) => p.test(entry.name))) files.push(relative(base, path))
        }
      }
      for (const directory of mapping.directories) await scan(await contained(base, directory), 0)
    }
    if (files.length > 1000) return failure('RESOURCE_LIMIT')
    for (const file of [...new Set(files)].sort()) {
      const text = await boundedText(await contained(base, file)),
        doc = parseDocument(text, { prettyErrors: false, logLevel: 'silent', uniqueKeys: true })
      if (doc.errors.length || doc.warnings.length) {
        diagnostics.push({
          code: 'INVALID_INPUT',
          message: 'Malformed source document',
          path: [file],
        })
        continue
      }
      const data = copyJson(doc.toJS({ maxAliasCount: 100 }))
      if (!data.ok) {
        diagnostics.push({
          code: data.error.code,
          message: 'Unsupported source value',
          path: [file],
        })
        continue
      }
      for (const kind of ['object', 'relation'] as const) {
        const rule = kind === 'object' ? mapping.objects : mapping.relations
        if (!rule) continue
        const rows = fieldValue(data.value, rule.recordsPath)
        if (!Array.isArray(rows)) {
          diagnostics.push({
            code: 'UNSUPPORTED_MAPPING',
            message: 'Mapped records are unavailable',
            path: [file, rule.recordsPath],
          })
          continue
        }
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i],
            externalId = fieldValue(row, rule.idPath),
            discriminator = fieldValue(row, rule.typePath),
            id =
              typeof externalId === 'string'
                ? (rule.identityMap?.[externalId] ?? externalId)
                : undefined,
            typeId = typeof discriminator === 'string' ? rule.typeMap[discriminator] : undefined
          if (!nonblank(id) || !typeId) {
            diagnostics.push({
              code: 'UNSUPPORTED_MAPPING',
              message: 'No explicit stable ID or type mapping',
              path: [file, rule.recordsPath, i],
            })
            continue
          }
          const attributes = fieldValue(row, rule.attributesPath),
            revision = createHash('sha256').update(text).digest('hex'),
            ref =
              kind === 'object'
                ? { repositoryId: mapping.repositoryId, objectId: id }
                : { repositoryId: mapping.repositoryId, relationId: id }
          const decoded =
            kind === 'object'
              ? decodeObject({
                  ref,
                  typeId,
                  name: rule.namePath ? fieldValue(row, rule.namePath) : id,
                  attributes,
                  revision,
                })
              : decodeRelation({
                  ref,
                  typeId,
                  source: {
                    repositoryId: mapping.repositoryId,
                    objectId: rule.sourcePath ? fieldValue(row, rule.sourcePath) : undefined,
                  },
                  target: {
                    repositoryId: mapping.repositoryId,
                    objectId: rule.targetPath ? fieldValue(row, rule.targetPath) : undefined,
                  },
                  attributes,
                  revision,
                })
          if (!decoded.ok) {
            diagnostics.push({
              code: 'UNSUPPORTED_MAPPING',
              message: 'Mapped entity is not canonical',
              path: [file, rule.recordsPath, i],
            })
            continue
          }
          const key = entityKey(kind, decoded.value.ref)
          if (seen.has(key)) {
            diagnostics.push({
              code: 'DUPLICATE_ID',
              message: 'Duplicate explicit identity',
              path: [file, rule.recordsPath, i],
            })
            continue
          }
          seen.add(key)
          if (kind === 'object') objects.push(decoded.value as RepositoryObject)
          else relations.push(decoded.value as RepositoryRelation)
        }
      }
    }
    for (const relation of relations)
      for (const endpoint of [relation.source, relation.target])
        if (!seen.has(entityKey('object', endpoint)))
          diagnostics.push({
            code: 'REFERENCE_UNRESOLVED',
            message: 'Mapped endpoint is absent',
            path: [],
            ref: relation.ref,
          })
    return success({ canWrite: false, objects, relations, diagnostics })
  } catch {
    return failure('PROFILE_INVALID')
  }
}
