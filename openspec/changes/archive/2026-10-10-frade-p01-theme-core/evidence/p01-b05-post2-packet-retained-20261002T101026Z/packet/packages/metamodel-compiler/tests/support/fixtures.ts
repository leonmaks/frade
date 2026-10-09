import { createHash } from 'node:crypto'
import type { CompilerPorts, CompilerResult, ModelSource } from '../../src'
export const copy = <T>(v: T): T => structuredClone(v)
export function source(id = 'base:model'): ModelSource {
  return {
    sourceSchemaVersion: 1,
    definition: {
      schemaVersion: 1,
      id,
      version: '1.0.0',
      imports: [],
      objectTypes: [],
      relationTypes: [],
      profiles: [],
      viewpoints: [],
    },
  }
}
export function setup() {
  const base: any = source()
  base.definition.objectTypes = [
    { id: 'base:asset', attributes: [{ id: 'name', required: true, schema: { kind: 'string' } }] },
    { id: 'base:child', extends: 'base:asset', attributes: [] },
    { id: 'base:target', attributes: [] },
  ]
  base.definition.relationTypes = [
    {
      id: 'base:uses',
      source: { typeIds: ['base:asset'], includeSubtypes: true },
      target: { typeIds: ['base:target'], includeSubtypes: false },
      attributes: [],
    },
  ]
  const org: any = source('org:model')
  org.definition.imports = [{ id: 'base:model', version: '1.0.0' }]
  const sources = new Map<string, any>([['base:model', base]])
  const calls: string[] = []
  const ports: CompilerPorts = {
    load: async (i) => {
      calls.push(i.id)
      if (!sources.has(i.id)) throw Error('private host detail')
      return sources.get(i.id)
    },
    sha256: async (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
  }
  return { base, org, sources, calls, ports }
}
export function value<T>(r: CompilerResult<T>): T {
  if (!r.ok) throw Error(JSON.stringify(r.diagnostics))
  return r.value
}
export function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
export const attribute = (id = 'owner') => ({
  id,
  schema: { kind: 'string' as const },
  required: true,
  default: 'team',
})
