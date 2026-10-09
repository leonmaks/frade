import type { ModelImport } from '@frade/metamodel-domain'
import type {
  CompiledModel,
  CompilerPorts,
  CompilerResult,
  CompileOptions,
  ModelLock,
  ModelPublisher,
  Projection,
} from './types'
import {
  canonical,
  clone,
  compare,
  diagnostic,
  fail,
  failure,
  Failure,
  freeze,
  success,
} from './common'
import { compose } from './compose'
import { decodeLock } from './source'
export async function compileModel(
  input: unknown,
  ports: CompilerPorts,
  options: CompileOptions = {},
): Promise<CompilerResult<CompiledModel>> {
  try {
    // Capture locks before any await: caller mutation during loading must not change the request.
    const supplied = options.lock === undefined ? undefined : decodeLock(options.lock)
    const c = await compose(input, ports),
      identity = { id: c.root.definition.id, version: c.root.definition.version }
    for (const viewpoint of c.definition.viewpoints) {
      const selected = new Set([...viewpoint.objectTypes, ...viewpoint.relationTypes])
      for (const p of viewpoint.presentation ?? [])
        if (!selected.has(p.typeId))
          fail(
            'INVALID_PROJECTION',
            'projection',
            ['presentation', p.typeId],
            c.owners.get(viewpoint.id),
            viewpoint.id,
          )
    }
    const hash = async (text: string, owner: ModelImport): Promise<string> => {
      let output: unknown
      try {
        output = await ports.sha256(text)
      } catch {
        fail('HASH_FAILED', 'hash', [], owner)
      }
      if (typeof output !== 'string' || !/^[a-f0-9]{64}$/.test(output))
        fail('HASH_FAILED', 'hash', [], owner)
      return output
    }
    const packages = []
    for (const s of c.sources)
      packages.push({
        id: s.definition.id,
        version: s.definition.version,
        contentHash: await hash(canonical(s), s.definition),
      })
    const objectTypes = [...c.analysis.objectTypes.values()]
    const relationTypes = [...c.analysis.relationTypes.values()].map((r) => ({
      ...r,
      direction: r.direction ?? ('directed' as const),
      allowSelfReference: r.allowSelfReference ?? false,
      duplicates: r.duplicates ?? ('forbid-same-type-and-pair' as const),
      sourceCardinality: r.sourceCardinality ?? { min: 0, max: null },
      targetCardinality: r.targetCardinality ?? { min: 0, max: null },
    }))
    const profiles = c.definition.profiles.map((p) => ({
      ...p,
      objectTypes: [...p.objectTypes].sort(compare),
      relationTypes: [...p.relationTypes].sort(compare),
    }))
    const viewpoints = c.definition.viewpoints.map((v) => ({
      ...v,
      objectTypes: [...v.objectTypes].sort(compare),
      relationTypes: [...v.relationTypes].sort(compare),
      presentation: [...(v.presentation ?? [])].sort((a, b) => compare(a.typeId, b.typeId)),
    }))
    const payload = {
      fingerprintFormatVersion: 1,
      root: identity,
      packages,
      objectTypes,
      relationTypes,
      profiles,
      viewpoints,
    }
    const fingerprint = await hash(canonical(payload), identity)
    const lock: ModelLock = {
      lockSchemaVersion: 1,
      fingerprintFormatVersion: 1,
      root: identity,
      packages,
      fingerprint,
    }
    if (supplied && canonical(supplied) !== canonical(lock))
      fail('LOCK_MISMATCH', 'lock', [], identity)
    const rawData = { objectTypes, relationTypes, profiles, viewpoints, lock }
    const data = freeze(JSON.parse(canonical(rawData)) as typeof rawData)
    const project = (profileId?: string, viewpointId?: string): CompilerResult<Projection> => {
      const profile =
        profileId === undefined ? undefined : data.profiles.find((p) => p.id === profileId)
      const viewpoint =
        viewpointId === undefined ? undefined : data.viewpoints.find((v) => v.id === viewpointId)
      if ((profileId !== undefined && !profile) || (viewpointId !== undefined && !viewpoint))
        return failure([
          diagnostic(
            'INVALID_PROJECTION',
            'projection',
            [],
            identity,
            !profile ? profileId : viewpointId,
          ),
        ])
      const select = (kind: 'objectTypes' | 'relationTypes') =>
        data[kind]
          .map((t) => t.id)
          .filter(
            (id) =>
              (!profile || profile[kind].includes(id)) &&
              (!viewpoint || viewpoint[kind].includes(id)),
          )
          .sort(compare)
      const objects = select('objectTypes'),
        relations = select('relationTypes'),
        ids = new Set([...objects, ...relations])
      const presentation = [...data.objectTypes, ...data.relationTypes]
        .filter((t) => ids.has(t.id))
        .map((t) => ({
          typeId: t.id,
          ui: { ...t.ui, ...viewpoint?.presentation.find((p) => p.typeId === t.id)?.ui },
        }))
        .sort((a, b) => compare(a.typeId, b.typeId))
      return freeze(success({ objectTypes: objects, relationTypes: relations, presentation }))
    }
    return freeze(
      success({
        ...identity,
        fingerprint,
        ...data,
        analysis: () => ({
          objectTypes: new Map(data.objectTypes.map((t) => [t.id, clone(t)])),
          relationTypes: new Map(data.relationTypes.map((t) => [t.id, clone(t)])),
        }),
        project,
      }),
    )
  } catch (error) {
    if (error instanceof Failure) return failure(error.diagnostics)
    // Unexpected host-object behavior (e.g. revoked proxies) must not leak or publish.
    return failure([diagnostic('INVALID_SOURCE', 'source')])
  }
}
export function createModelPublisher(ports: CompilerPorts): ModelPublisher {
  let generation = 0,
    current: CompiledModel | undefined
  return Object.freeze({
    current: () => current,
    compileAndPublish: async (input: unknown, options?: CompileOptions) => {
      const request = ++generation,
        result = await compileModel(input, ports, options)
      if (request !== generation)
        return failure<CompiledModel>([diagnostic('SUPERSEDED', 'publication')])
      if (result.ok) current = result.value
      return result
    },
  })
}
