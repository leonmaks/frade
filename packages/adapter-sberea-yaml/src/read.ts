import { realpath } from 'node:fs/promises'
import {
  canonicalJson,
  record,
  type JsonValue,
  type RepositoryObject,
  type RepositorySnapshot,
  type Revision,
} from '@frade/repository-domain'
import type { MetadataSet } from '@frade/metamodel-config'
import { loadGraph, hash, fail, type SourceFile } from './files'
import { loadModel, canonicalAttributes, objectName, projectRelations } from './model'
export interface SbereaOptions {
  readonly dataRoot: string
  readonly repositoryId: string
  readonly label?: string
  readonly entry?: string
  readonly metadataSet: MetadataSet
  readonly readOnly?: boolean
  /** Trusted test/host observability, never deserialized from workspace or IPC. */
  readonly writeBarrier?: (phase: 'staged' | 'replaced') => Promise<void>
}
export interface Locator {
  readonly entry: string
  readonly externalType: string
  readonly objectId: string
  readonly writable: boolean
}
export interface Accounting {
  readonly files: readonly { entry: string; digest: string; bytes: number; objects: number }[]
  readonly sections: readonly {
    entry: string
    key: string
    kind: 'configuration' | 'unknown'
    value: JsonValue
  }[]
  readonly count: number
}
export async function loadRepository(options: SbereaOptions) {
  if (!options.repositoryId.trim()) fail('PROFILE_INVALID', 'Missing repository identity')
  const root = await realpath(options.dataRoot),
    metadataRoot = await realpath(options.metadataSet.folderPath)
  const [{ metadata, model }, files] = await Promise.all([
    loadModel(metadataRoot, options.metadataSet),
    loadGraph(root, [options.entry ?? 'root.yaml']),
  ])
  const locators = new Map<string, Locator>(),
    objects: RepositoryObject[] = [],
    sections: Accounting['sections'][number][] = [],
    counts = new Map<string, number>()
  for (const [entry, file] of files) {
    for (const [externalType, collection] of Object.entries(file.value)) {
      if (externalType === 'imports') continue
      const type = metadata.types.find((t) => t.externalId === externalType)
      if (!type) {
        sections.push({
          entry,
          key: externalType,
          kind: externalType === 'sber' ? 'configuration' : 'unknown',
          value: collection,
        })
        continue
      }
      if (!record(collection))
        fail('INVALID_INPUT', 'Expected collection: ' + entry + ' ' + externalType)
      for (const [objectId, raw] of Object.entries(collection)) {
        if (locators.has(objectId)) fail('INVALID_INPUT', 'Duplicate object ID: ' + objectId)
        if (!record(raw)) fail('INVALID_INPUT', 'Expected attributes: ' + objectId)
        if (!type.idPatterns.every((p) => new RegExp(p, 'u').test(objectId)))
          fail('INVALID_INPUT', 'Object ID violates its collection pattern: ' + objectId)
        const attributes = canonicalAttributes(raw as JsonValue, type.rule, options.repositoryId)
        objects.push({
          ref: { repositoryId: options.repositoryId, objectId },
          typeId: type.typeId,
          name: objectName(attributes, type.nameFields, objectId),
          attributes,
          revision: hash(metadata.fingerprint + canonicalJson(raw as JsonValue)) as Revision,
        })
        locators.set(objectId, {
          entry,
          externalType,
          objectId,
          writable: file.preservable && !options.readOnly,
        })
        counts.set(entry, (counts.get(entry) ?? 0) + 1)
        if (objects.length > 100000) fail('RESOURCE_LIMIT', 'Object count limit')
      }
    }
  }
  const accounting: Accounting = {
    files: [...files].map(([entry, f]) => ({
      entry,
      digest: f.digest,
      bytes: Buffer.byteLength(f.text),
      objects: counts.get(entry) ?? 0,
    })),
    sections,
    count: objects.length,
  }
  const snapshot: RepositorySnapshot = {
    repositoryId: options.repositoryId,
    revision: repositoryRevision(files, metadata.fingerprint),
    complete: true,
    binding: {
      modelId: model.modelId,
      modelVersion: model.modelVersion,
      fingerprint: model.fingerprint,
    },
    objects,
    relations: projectRelations(objects, metadata),
  }
  return { root, metadataRoot, metadata, model, files, locators, accounting, snapshot }
}
export function repositoryRevision(
  files: ReadonlyMap<string, SourceFile>,
  fingerprint: string,
): Revision {
  return hash(
    fingerprint +
      canonicalJson(
        [...files].sort(([a], [b]) => (a < b ? -1 : 1)).map(([entry, f]) => [entry, f.digest]),
      ),
  ) as Revision
}
export type LoadedRepository = Awaited<ReturnType<typeof loadRepository>>
