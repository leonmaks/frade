import { analyzeModel } from '@frade/metamodel-domain'
import type { ModelAnalysis, ModelDefinition, ModelImport } from '@frade/metamodel-domain'
import type { CompilerPorts, ModelSource, Stage } from './types'
import { clone, compare, fail, Failure, LIMITS } from './common'
import { decodeSource } from './source'
export const groups = ['objectTypes', 'relationTypes', 'profiles', 'viewpoints'] as const
export interface Composition {
  root: ModelSource
  sources: ModelSource[]
  definition: ModelDefinition
  analysis: ModelAnalysis
  owners: Map<string, ModelImport>
}
export async function compose(input: unknown, ports: CompilerPorts): Promise<Composition> {
  const decoded = decodeSource(input),
    root = decoded.source
  let total = decoded.count,
    edges = 0
  const found = new Map<string, ModelSource>([[root.definition.id, root]])
  const active = new Set<string>(),
    closures = new Map<string, Set<string>>(),
    depths = new Map<string, number>()
  const stack: {
    source: ModelSource
    imports: ModelImport[]
    index: number
    closure: Set<string>
    height: number
  }[] = []
  const enter = (source: ModelSource) => {
    if (stack.length >= LIMITS.graphDepth) fail('RESOURCE_LIMIT', 'imports', [], source.definition)
    active.add(source.definition.id)
    stack.push({
      source,
      imports: [...source.definition.imports].sort(
        (a, b) => compare(a.id, b.id) || compare(a.version, b.version),
      ),
      index: 0,
      closure: new Set(),
      height: 1,
    })
  }
  enter(root)
  while (stack.length) {
    const frame = stack[stack.length - 1],
      id = frame.source.definition.id
    if (frame.index === frame.imports.length) {
      closures.set(id, frame.closure)
      depths.set(id, frame.height)
      active.delete(id)
      stack.pop()
      if (stack.length) {
        const parent = stack[stack.length - 1]
        parent.closure.add(id)
        for (const member of frame.closure) parent.closure.add(member)
        parent.height = Math.max(parent.height, 1 + frame.height)
        if (parent.height > LIMITS.graphDepth)
          fail('RESOURCE_LIMIT', 'imports', [], parent.source.definition)
      }
      continue
    }
    const request = frame.imports[frame.index++]
    if (++edges > LIMITS.edges) fail('RESOURCE_LIMIT', 'imports', [], frame.source.definition)
    let next = found.get(request.id)
    if (next && next.definition.version !== request.version)
      fail('VERSION_CONFLICT', 'imports', [], request)
    if (active.has(request.id)) fail('IMPORT_CYCLE', 'imports', [], request)
    if (!next) {
      if (found.size >= LIMITS.packages) fail('RESOURCE_LIMIT', 'imports', [], request)
      let raw: unknown
      try {
        raw = await ports.load(Object.freeze({ ...request }))
      } catch {
        fail('LOAD_FAILED', 'load', [], request)
      }
      const loaded = decodeSource(raw, request)
      if (
        loaded.source.definition.id !== request.id ||
        loaded.source.definition.version !== request.version
      )
        fail('IMPORT_IDENTITY_MISMATCH', 'imports', [], request)
      total += loaded.count
      if (total > LIMITS.totalValues) fail('RESOURCE_LIMIT', 'imports', [], request)
      next = loaded.source
      found.set(request.id, next)
    }
    const closure = closures.get(request.id)
    if (closure) {
      frame.closure.add(request.id)
      for (const member of closure) frame.closure.add(member)
      frame.height = Math.max(frame.height, 1 + depths.get(request.id)!)
      if (frame.height + stack.length - 1 > LIMITS.graphDepth)
        fail('RESOURCE_LIMIT', 'imports', [], request)
    } else enter(next)
  }
  const sources = [...found.values()].sort((a, b) => compare(a.definition.id, b.definition.id))
  const owners = new Map<string, ModelImport>()
  const combined: any = {
    ...root.definition,
    imports: [],
    objectTypes: [],
    relationTypes: [],
    profiles: [],
    viewpoints: [],
  }
  for (const source of sources)
    for (const group of groups)
      for (const entity of source.definition[group]) {
        if (owners.has(entity.id))
          fail('DEFINITION_COLLISION', 'analysis', [group, entity.id], source.definition, entity.id)
        owners.set(entity.id, { id: source.definition.id, version: source.definition.version })
        combined[group].push(clone(entity))
      }
  for (const group of groups)
    combined[group].sort((a: { id: string }, b: { id: string }) => compare(a.id, b.id))
  const analyze = (stage: Stage): ModelAnalysis => {
    const result = analyzeModel(combined)
    if (!result.ok)
      throw new Failure(
        result.diagnostics.map((d) => {
          const indexed =
            typeof d.path[1] === 'number' ? combined[d.path[0]]?.[d.path[1]]?.id : undefined
          const owner = owners.get(d.entityId ?? indexed) ?? root.definition
          return { ...d, stage, modelId: owner.id, modelVersion: owner.version }
        }),
      )
    return result.value
  }
  const original = analyze('analysis')
  const additions: {
    source: ModelSource
    kind: 'object' | 'relation'
    target: string
    attribute: any
  }[] = []
  for (const source of sources)
    for (const e of source.extensions ?? []) {
      const owner = owners.get(e.targetId)
      const target =
        e.targetKind === 'object'
          ? original.objectTypes.get(e.targetId)
          : original.relationTypes.get(e.targetId)
      if (!target || !owner || !closures.get(source.definition.id)!.has(owner.id))
        fail(
          'INVALID_EXTENSION_TARGET',
          'extensions',
          ['extensions', e.targetId],
          source.definition,
          e.targetId,
        )
      for (const attribute of e.attributes) {
        if (target.attributes.some((a) => a.id === attribute.id))
          fail(
            'EXTENSION_CONFLICT',
            'extensions',
            ['attributes', attribute.id],
            source.definition,
            e.targetId,
          )
        additions.push({ source, kind: e.targetKind, target: e.targetId, attribute })
      }
    }
  for (const [i, a] of additions.entries()) {
    const relatives = new Set([
      a.target,
      ...(a.kind === 'object' ? original.objectTypes.get(a.target)!.ancestors : []),
    ])
    for (const b of additions.slice(0, i)) {
      if (a.kind !== b.kind || a.attribute.id !== b.attribute.id) continue
      if (
        relatives.has(b.target) ||
        (b.kind === 'object' && original.objectTypes.get(b.target)!.ancestors.includes(a.target))
      )
        fail(
          'EXTENSION_CONFLICT',
          'extensions',
          ['attributes', a.attribute.id],
          a.source.definition,
          a.target,
        )
    }
  }
  for (const a of additions) {
    const group = a.kind === 'object' ? 'objectTypes' : 'relationTypes'
    combined[group]
      .find((t: { id: string }) => t.id === a.target)
      .attributes.push(clone(a.attribute))
  }
  const analysis = additions.length ? analyze('extensions') : original
  return { root, sources, definition: combined, analysis, owners }
}
