import { expect } from 'vitest'
import { compileModel, createModelPublisher, compareModels, previewMigration } from '../../src'
import { setup, source, attribute, value, copy, deferred } from './fixtures'
export {
  setup,
  source,
  attribute,
  value,
  copy,
  deferred,
  compileModel,
  createModelPublisher,
  compareModels,
  previewMigration,
}
export const init = (w: any) => Object.assign(w, setup())
export const extend = (w: any, kind = 'object', target = 'base:asset', field = attribute()) => {
  w.org.extensions = [{ targetKind: kind, targetId: target, attributes: [field] }]
}
export function projections(w: any) {
  init(w)
  w.org.definition.profiles = [
    { id: 'org:profile', objectTypes: ['base:asset'], relationTypes: ['base:uses'] },
  ]
  w.org.definition.viewpoints = [
    {
      id: 'org:view',
      objectTypes: ['base:asset', 'base:child'],
      relationTypes: ['base:uses'],
      presentation: [{ typeId: 'base:asset', ui: { label: 'Presented' } }],
    },
  ]
}
export function unsafe(w: any, defect: string) {
  init(w)
  w.executed = 0
  switch (defect) {
    case 'malformed JSON':
      w.org = '{'
      break
    case 'unsupported envelope':
      w.org.sourceSchemaVersion = 2
      break
    case 'unsupported domain version':
      w.org.definition.schemaVersion = 2
      break
    case 'accessor':
      Object.defineProperty(w.org, 'definition', {
        get() {
          w.executed++
          return {}
        },
        enumerable: true,
      })
      break
    case 'dangerous key':
      Object.defineProperty(w.org, '__proto__', { value: {}, enumerable: true })
      break
    case 'cyclic structured value':
      w.org.cycle = w.org
      break
    case 'nonstandard prototype':
      Object.setPrototypeOf(w.org, { bad: true })
      break
    case 'excessive nesting': {
      let deep: any = null
      for (let i = 0; i < 66; i++) deep = [deep]
      w.org.extra = deep
      break
    }
    case 'excessive text length':
      w.org = ' '.repeat(1_000_001)
      break
    case 'excessive value count':
      w.org.extra = Array.from({ length: 100001 }, () => null)
      break
    default:
      throw Error('Unknown unsafe fixture ' + defect)
  }
}
export function graph(w: any, defect: string) {
  init(w)
  const add = (id: string) => {
    const m: any = source(id)
    w.sources.set(id, m)
    return m
  }
  const ref = (id: string) => ({ id, version: '1.0.0' })
  switch (defect) {
    case 'unavailable package':
      w.sources.clear()
      break
    case 'mismatched identity':
      w.base.definition.version = '2.0.0'
      break
    case 'cyclic imports':
      w.base.definition.imports = [ref('org:model')]
      break
    case 'conflicting versions': {
      const m = add('z:model')
      m.definition.imports = [{ id: 'base:model', version: '2.0.0' }]
      w.org.definition.imports.push(ref('z:model'))
      break
    }
    case 'duplicate definition ID':
      w.org.definition.objectTypes = [copy(w.base.definition.objectTypes[0])]
      break
    case 'exceeded package budget':
      w.org.definition.imports = Array.from({ length: 1024 }, (_, i) => {
        const id = 'p:m' + String(i).padStart(4, '0')
        add(id)
        return ref(id)
      })
      break
    case 'exceeded graph depth': {
      let last = w.org
      for (let i = 0; i < 128; i++) {
        const id = 'p:m' + i
        last.definition.imports = [ref(id)]
        last = add(id)
      }
      break
    }
    case 'exceeded edge budget': {
      const ids = Array.from({ length: 100 }, (_, i) => 'leaf:m' + i)
      for (const id of ids) add(id)
      w.org.definition.imports = []
      for (let i = 0; i < 90; i++) {
        const m = add('parent:m' + i)
        m.definition.imports = ids.map(ref)
        w.org.definition.imports.push(ref(m.definition.id))
      }
      break
    }
    case 'exceeded total values': {
      w.org.definition.imports = []
      for (let i = 0; i < 12; i++) {
        const id = 'p:m' + i,
          m = add(id)
        m.definition.objectTypes = [
          {
            id: 'p:t' + i,
            attributes: [
              {
                id: 'choice',
                schema: { kind: 'enum', values: Array.from({ length: 90000 }, (_, j) => 'v' + j) },
              },
            ],
          },
        ]
        w.org.definition.imports.push(ref(id))
      }
      break
    }
    default:
      throw Error('Unknown graph fixture ' + defect)
  }
}
export function badExtension(w: any, defect: string) {
  init(w)
  extend(w)
  const e = w.org.extensions[0]
  switch (defect) {
    case 'existing own attribute':
      e.attributes = [attribute('name')]
      break
    case 'existing inherited attribute':
      e.targetId = 'base:child'
      e.attributes = [attribute('name')]
      break
    case 'identical duplicate addition':
      w.org.extensions.push(copy(e))
      break
    case 'ancestor descendant additions':
      w.org.extensions.push({ ...copy(e), targetId: 'base:child' })
      break
    case 'deletion field':
      e.remove = ['name']
      break
    case 'changed relation policy':
      e.targetKind = 'relation'
      e.targetId = 'base:uses'
      e.allowSelfReference = true
      break
    case 'changed parent':
      e.extends = 'base:target'
      break
    case 'changed abstract flag':
      e.abstract = false
      break
    case 'changed lifecycle':
      e.lifecycle = { states: ['x'], initial: 'x', transitions: [] }
      break
    case 'unknown target':
      e.targetId = 'base:missing'
      break
    case 'local target':
      w.org.definition.objectTypes = [{ id: 'org:local', attributes: [] }]
      e.targetId = 'org:local'
      break
    case 'sibling-only target': {
      const sibling: any = source('sibling:model')
      sibling.extensions = [e]
      w.org.extensions = []
      w.org.definition.imports.push({ id: 'sibling:model', version: '1.0.0' })
      w.sources.set('sibling:model', sibling)
      break
    }
    default:
      throw Error('Unknown extension fixture ' + defect)
  }
}
export function semanticError(w: any, defect: string) {
  init(w)
  switch (defect) {
    case 'incompatible descendant attribute':
      extend(w)
      w.base.definition.objectTypes[1].attributes = [{ id: 'owner', schema: { kind: 'integer' } }]
      w.expected = 'CONFLICTING_OVERRIDE'
      break
    case 'invalid extension default':
      extend(w)
      w.org.extensions[0].attributes[0].default = 5
      w.expected = 'TYPE_MISMATCH'
      break
    case 'unresolved reference target':
      w.base.definition.objectTypes[0].attributes.push({
        id: 'ref',
        schema: {
          kind: 'reference',
          targets: { typeIds: ['missing:type'], includeSubtypes: false },
        },
      })
      w.expected = 'UNKNOWN_TYPE'
      break
    case 'inheritance cycle':
      w.base.definition.objectTypes[0].extends = 'base:child'
      w.expected = 'INHERITANCE_CYCLE'
      break
    case 'missing parent':
      w.base.definition.objectTypes[0].extends = 'missing:type'
      w.expected = 'UNKNOWN_TYPE'
      break
    default:
      throw Error('Unknown semantic fixture ' + defect)
  }
}
export function changed(w: any, content: string) {
  switch (content) {
    case 'presentation label':
    case 'changed label only':
      w.base.definition.objectTypes[0].ui = { label: 'New' }
      break
    case 'attribute constraint':
      w.base.definition.objectTypes[0].attributes[0].schema.minLength = 3
      break
    case 'ordered default list':
      w.base.definition.objectTypes[0].attributes.push({
        id: 'list',
        schema: { kind: 'list', items: { kind: 'string' } },
        default: ['b', 'a'],
      })
      break
    case 'extension attribute':
      extend(w)
      break
    case 'imported source content':
      w.base.definition.objectTypes.push({ id: 'base:new', attributes: [] })
      break
    case 'model version':
    case 'model version only':
      w.org.definition.version = '1.0.1'
      break
    case 'removed type':
      w.base.definition.objectTypes = w.base.definition.objectTypes.filter(
        (t: any) => t.id !== 'base:child',
      )
      break
    case 'added required attribute':
      extend(w)
      break
    case 'changed relation bound':
      w.base.definition.relationTypes[0].sourceCardinality = { min: 1, max: null }
      break
    case 'changed profile selection':
      w.org.definition.profiles = [
        { id: 'org:profile', objectTypes: ['base:child'], relationTypes: [] },
      ]
      break
    default:
      throw Error('Unknown content fixture ' + content)
  }
}
export function repository(w: any) {
  w.context = {
    binding: { modelId: w.old.id, modelVersion: w.old.version, fingerprint: w.old.fingerprint },
    snapshot: {
      objects: [
        {
          ref: { repositoryId: 'R', objectId: 'A' },
          typeId: 'base:child',
          attributes: { name: 'A' },
        },
      ],
      relations: [],
    },
  }
  w.before = copy(w.context)
}
export function assertNoCandidate(r: any) {
  expect(r.ok).toBe(false)
  expect(r).not.toHaveProperty('value')
  expect(r.diagnostics.length).toBeGreaterThan(0)
}
export async function compile(w: any) {
  w.result = await compileModel(w.org, w.ports, w.options)
}
export async function race(w: any, outcome: string) {
  const gate = deferred<unknown>(),
    entered = deferred<void>()
  let blocked = false
  const p = createModelPublisher({
    ...w.ports,
    load: async (i: any) => {
      if (blocked) {
        entered.resolve()
        return gate.promise
      }
      return w.ports.load(i)
    },
  })
  w.initial = value(await p.compileAndPublish(w.org))
  blocked = true
  const older = p.compileAndPublish(w.org)
  await entered.promise
  const newest = copy(w.org)
  newest.definition.imports = []
  const next = await p.compileAndPublish(outcome === 'fails' ? 'bad JSON' : newest)
  w.expectedCurrent = next.ok ? next.value : w.initial
  gate.resolve(w.base)
  w.stale = await older
  w.current = p.current()
}
