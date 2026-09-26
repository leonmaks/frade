import { expect, it } from 'vitest'
import { compileModel, compareModels, previewMigration, LIMITS } from '../../src'
import { decodeSource } from '../../src/source'
import { inspect, Failure } from '../../src/common'
import { graph } from '../support/scenarios'
import { source, setup, value, copy, attribute, deferred } from '../support/fixtures'
it('rejects explicit null extensions instead of silently dropping them', async () => {
  const w = setup()
  w.org.extensions = null
  expect((await compileModel(w.org, w.ports)).ok).toBe(false)
})
it('classifies presentation-only profile and viewpoint changes as presentation', async () => {
  const w = setup()
  w.org.definition.profiles = [
    { id: 'org:profile', objectTypes: [], relationTypes: [], ui: { label: 'old' } },
  ]
  w.org.definition.viewpoints = [
    { id: 'org:view', objectTypes: [], relationTypes: [], ui: { label: 'old' } },
  ]
  const a = value(await compileModel(w.org, w.ports))
  w.org.definition.profiles[0].ui.label = 'new'
  w.org.definition.viewpoints[0].ui.label = 'new'
  const b = value(await compileModel(w.org, w.ports))
  expect(
    compareModels(a, b)
      .changes.filter((c) => c.kind !== 'model')
      .map((c) => c.classification),
  ).toEqual(['presentation', 'presentation'])
})
it.each([
  'sparse',
  'array prototype',
  'symbol',
  'nonenumerable',
  'infinity',
  'function',
  'accessor',
])('rejects %s without executing it', async (defect) => {
  const w = setup()
  let ran = false
  if (defect === 'sparse') w.org.extensions = new Array(1)
  if (defect === 'array prototype') {
    w.org.extensions = []
    Object.setPrototypeOf(w.org.extensions, {})
  }
  if (defect === 'symbol') w.org[Symbol('bad')] = 1
  if (defect === 'nonenumerable') Object.defineProperty(w.org, 'bad', { value: 1 })
  if (defect === 'infinity') w.org.bad = Infinity
  if (defect === 'function')
    w.org.bad = () => {
      ran = true
    }
  if (defect === 'accessor')
    Object.defineProperty(w.org, 'bad', {
      get() {
        ran = true
        return 1
      },
      enumerable: true,
    })
  expect((await compileModel(w.org, w.ports)).ok).toBe(false)
  expect(ran).toBe(false)
})
it('enforces exact JSON text, traversal depth and value limits', async () => {
  const w = setup(),
    json = JSON.stringify(source()),
    exact = json + ' '.repeat(LIMITS.text - json.length)
  expect((await compileModel(exact, w.ports)).ok).toBe(true)
  expect((await compileModel(exact + ' ', w.ports)).diagnostics[0].code).toBe('RESOURCE_LIMIT')
  const nested = (depth: number) => {
    let v: any = null
    for (let i = 0; i < depth; i++) v = [v]
    return v
  }
  expect(inspect(nested(LIMITS.depth), 'source').count).toBe(LIMITS.depth + 1)
  expect(() => inspect(nested(LIMITS.depth + 1), 'source')).toThrow(Failure)
  expect(inspect(Array(LIMITS.values - 1).fill(null), 'source').count).toBe(LIMITS.values)
  expect(() => inspect(Array(LIMITS.values).fill(null), 'source')).toThrow(Failure)
})
it('accepts exact package and graph-depth limits and rejects the next value', async () => {
  for (const [defect, trim] of [
    ['exceeded package budget', true],
    ['exceeded graph depth', false],
  ] as const) {
    const w: any = {}
    graph(w, defect)
    const bad = await compileModel(w.org, w.ports)
    expect(bad.diagnostics[0]).toMatchObject({ code: 'RESOURCE_LIMIT', stage: 'imports' })
    if (trim) w.org.definition.imports.pop()
    else w.sources.get('p:m126').definition.imports = []
    const ok = await compileModel(w.org, w.ports)
    expect(ok.ok, JSON.stringify(ok.diagnostics)).toBe(true)
  }
})
function edgeGraph(edges: number) {
  const w = setup()
  w.sources.clear()
  w.org.definition.imports = []
  const ref = (id: string) => ({ id, version: '1.0.0' })
  for (let i = 0; i < 100; i++) w.sources.set('leaf:m' + i, source('leaf:m' + i))
  let remaining = edges - 90
  for (let i = 0; i < 90; i++) {
    const id = 'parent:m' + String(i).padStart(3, '0'),
      m: any = source(id),
      n = Math.min(100, remaining)
    m.definition.imports = Array.from({ length: n }, (_, j) => ref('leaf:m' + j))
    remaining -= n
    w.sources.set(id, m)
    w.org.definition.imports.push(ref(id))
  }
  return w
}
it('counts exact import edges independently of package and depth budgets', async () => {
  const a = edgeGraph(LIMITS.edges),
    b = edgeGraph(LIMITS.edges + 1)
  expect((await compileModel(a.org, a.ports)).ok).toBe(true)
  expect((await compileModel(b.org, b.ports)).diagnostics[0]).toMatchObject({
    code: 'RESOURCE_LIMIT',
    stage: 'imports',
  })
})
it('checks aggregate source values separately from flattened-model limits', async () => {
  const w = setup()
  w.sources.clear()
  w.org.definition.imports = []
  for (let i = 0; i < 11; i++) {
    const m: any = source('p:m' + i)
    m.definition.objectTypes = [
      { id: 'p:t' + i, attributes: [{ id: 'a', schema: { kind: 'enum', values: ['first'] } }] },
    ]
    w.sources.set(m.definition.id, m)
    w.org.definition.imports.push({ id: m.definition.id, version: '1.0.0' })
  }
  let current =
    decodeSource(w.org).count +
    [...w.sources.values()].reduce((sum, m) => sum + decodeSource(m).count, 0)
  for (const m of w.sources.values()) {
    const values = m.definition.objectTypes[0].attributes[0].schema.values
    const n = Math.min(95000, LIMITS.totalValues - current)
    values.push(...Array.from({ length: n }, (_, j) => 'v' + j))
    current += n
  }
  expect(current).toBe(LIMITS.totalValues)
  const at = await compileModel(w.org, w.ports)
  expect(at.diagnostics[0]).toMatchObject({ code: 'RESOURCE_LIMIT', stage: 'analysis' })
  const last = [...w.sources.values()].at(-1)
  last.definition.objectTypes[0].attributes[0].schema.values.push('one-more')
  const over = await compileModel(w.org, w.ports)
  expect(over.diagnostics[0]).toMatchObject({ code: 'RESOURCE_LIMIT', stage: 'imports' })
}, 30000)
it('copies sources and locks before an asynchronous loader returns', async () => {
  const w = setup(),
    first = value(await compileModel(w.org, w.ports)),
    gate = deferred<unknown>(),
    lock: any = copy(first.lock)
  const run = compileModel(w.org, { ...w.ports, load: () => gate.promise }, { lock })
  w.org.definition.version = '2.0.0'
  lock.fingerprint = '0'.repeat(64)
  gate.resolve(w.base)
  expect(value(await run).fingerprint).toBe(first.fingerprint)
})
it('distinguishes colliding object and relation IDs in migration diagnostics', async () => {
  const w = setup(),
    m = value(await compileModel(w.org, w.ports))
  const context = {
    binding: { modelId: m.id, modelVersion: m.version, fingerprint: m.fingerprint },
    snapshot: {
      objects: [
        {
          ref: { repositoryId: 'R', objectId: 'same' },
          typeId: 'base:asset',
          attributes: { name: 'A' },
        },
      ],
      relations: [
        {
          ref: { repositoryId: 'R', relationId: 'same' },
          typeId: 'unknown:relation',
          source: { repositoryId: 'R', objectId: 'same' },
          target: { repositoryId: 'R', objectId: 'same' },
          attributes: {},
        },
      ],
    },
  }
  const before = copy(context),
    p = value(previewMigration(m, m, context))
  expect(p.diagnostics).toHaveLength(1)
  expect(p.diagnostics[0].relationRef).toEqual({ repositoryId: 'R', relationId: 'same' })
  expect(p.diagnostics[0].objectRef).toBeUndefined()
  expect(context).toEqual(before)
})
it('detects transitive extensions and conflicts between imported extension packages', async () => {
  const w = setup(),
    middle: any = source('middle:model')
  middle.definition.imports = copy(w.org.definition.imports)
  w.sources.set(middle.definition.id, middle)
  w.org.definition.imports = [{ id: middle.definition.id, version: middle.definition.version }]
  w.org.extensions = [{ targetKind: 'object', targetId: 'base:asset', attributes: [attribute()] }]
  expect((await compileModel(w.org, w.ports)).ok).toBe(true)
  middle.extensions = copy(w.org.extensions)
  expect((await compileModel(w.org, w.ports)).diagnostics[0].code).toBe('EXTENSION_CONFLICT')
})
it('hash port conforms to standard and Unicode SHA-256 vectors', async () => {
  const { ports } = setup()
  expect(await ports.sha256('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  expect(await ports.sha256('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  expect(await ports.sha256('こんにちは')).toBe(
    '125aeadf27b0459b8760c13a3d80912dfa8a81a68261906f60d87f4a0268646c',
  )
})
