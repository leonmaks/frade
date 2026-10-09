import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import * as core from '../src/index'

const object = () => ({
  ref: { repositoryId: 'R', objectId: 'A' },
  typeId: 'sample:ApplicationSystem',
  name: 'A',
  attributes: { nested: { status: 'created' } },
  revision: '9',
})

describe('CORE-003 stable identity and RE-1 namespaces', () => {
  it('keeps identity after rename and provenance relocation', () => {
    const before = object()
    const after = { ...before, name: 'renamed' }
    expect(core.entityKey('object', before.ref)).toBe(core.entityKey('object', after.ref))
    expect(core.entityKey('object', before.ref)).not.toBe(
      core.entityKey('relation', { repositoryId: 'R', relationId: 'A' }),
    )
    expect(core.entityKey('object', before.ref)).not.toBe(
      core.entityKey('object', { repositoryId: 'S', objectId: 'A' }),
    )
  })
  it('tuple identity is injective with seed 20260924', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string()),
        fc.tuple(fc.string(), fc.string()),
        (a, b) => {
          expect(
            core.entityKey('object', { repositoryId: a[0], objectId: a[1] }) ===
              core.entityKey('object', { repositoryId: b[0], objectId: b[1] }),
          ).toBe(a[0] === b[0] && a[1] === b[1])
        },
      ),
      { seed: 20260924, numRuns: 200 },
    )
  })
  it('RE-2 makes independent copies without normalizing revision', () => {
    const input = object()
    const decoded = core.decodeObject(input)
    expect(decoded.ok).toBe(true)
    input.attributes.nested.status = 'used'
    if (decoded.ok) {
      expect(decoded.value.attributes).toEqual({ nested: { status: 'created' } })
      expect(decoded.value.revision).toBe('9')
    }
  })
  it('RE-2 rejects unsafe values without getter execution', () => {
    let reads = 0
    const accessor = Object.defineProperty({}, 'hidden', {
      enumerable: true,
      get() {
        reads++
        return 'secret'
      },
    })
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    for (const attributes of [
      accessor,
      cycle,
      { bad: NaN },
      { bad: undefined },
      { bad: new Date() },
      { bad: Array(2) },
      JSON.parse('{"__proto__":{}}'),
      Object.assign({}, { [Symbol('x')]: true }),
    ]) {
      expect(core.decodeObject({ ...object(), attributes }).ok).toBe(false)
    }
    expect(reads).toBe(0)
  })
  it.each(['ref', 'name', 'revision', 'typeId'])('RE-2 rejects malformed %s', (key) => {
    expect(core.decodeObject({ ...object(), [key]: ' ' }).ok).toBe(false)
  })
  it('RE-2 rejects extra envelope keys and custom prototypes', () => {
    expect(core.decodeObject({ ...object(), extra: true }).ok).toBe(false)
    expect(core.decodeObject(Object.assign(Object.create({ x: 1 }), object())).ok).toBe(false)
  })
  it('RE-2 observes exact depth and value budgets', () => {
    const nested = (depth: number) => {
      let value: unknown = 0
      for (let i = 0; i < depth; i++) value = { x: value }
      return value
    }
    expect(core.copyJson(nested(64)).ok).toBe(true)
    expect(core.copyJson(nested(65))).toMatchObject({
      ok: false,
      error: { code: 'RESOURCE_LIMIT' },
    })
    expect(core.copyJson(Array(99999).fill(null)).ok).toBe(true)
    expect(core.copyJson(Array(100000).fill(null))).toMatchObject({
      ok: false,
      error: { code: 'RESOURCE_LIMIT' },
    })
  })
  it('CORE-003 supported serialization round trips, property seed 20260924', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const result = core.copyJson(value)
        if (result.ok) expect(JSON.parse(core.canonicalJson(result.value))).toEqual(value)
      }),
      { seed: 20260924, numRuns: 200 },
    )
  })
})
