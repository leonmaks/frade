import { expect, it } from 'vitest'
import fc from 'fast-check'
import { compileModel, createModelPublisher } from '../../src'
import { setup, attribute, value, copy, deferred } from '../support/fixtures'
const options = { seed: 20260924, numRuns: 200 }
it('declaration permutations preserve fingerprints', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.shuffledSubarray([0, 1, 2], { minLength: 3, maxLength: 3 }),
      async (order) => {
        const w = setup(),
          before = value(await compileModel(w.org, w.ports))
        w.base.definition.objectTypes = order.map((i) => w.base.definition.objectTypes[i])
        const after = value(await compileModel(w.org, w.ports))
        expect(after.fingerprint).toBe(before.fingerprint)
      },
    ),
    options,
  )
})
it('sources are unchanged for arbitrary valid default lists', async () => {
  await fc.assert(
    fc.asyncProperty(fc.array(fc.string(), { maxLength: 12 }), async (defaults) => {
      const w = setup()
      w.base.definition.objectTypes[0].attributes.push({
        id: 'list',
        schema: { kind: 'list', items: { kind: 'string' } },
        default: defaults,
      })
      const before = copy([w.org, w.base])
      value(await compileModel(w.org, w.ports))
      expect([w.org, w.base]).toEqual(before)
    }),
    options,
  )
})
it('published data is isolated from caller-owned analysis and inputs', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (text) => {
      const w = setup(),
        p = createModelPublisher(w.ports),
        m = value(await p.compileAndPublish(w.org)),
        before = JSON.stringify(m)
      const analysis: any = m.analysis()
      analysis.objectTypes.get('base:asset').attributes[0].id = text
      w.org.definition.id = text
      expect(JSON.stringify(p.current())).toBe(before)
    }),
    options,
  )
})
it('additive extension preserves original constraints and reaches every child', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (n) => {
      const w = setup()
      w.base.definition.objectTypes[0].attributes[0].schema.minLength = n
      w.org.extensions = [
        { targetKind: 'object', targetId: 'base:asset', attributes: [attribute()] },
      ]
      const m = value(await compileModel(w.org, w.ports))
      for (const id of ['base:asset', 'base:child']) {
        const t = m.objectTypes.find((t) => t.id === id)!
        expect(t.attributes).toContainEqual(w.base.definition.objectTypes[0].attributes[0])
        expect(t.attributes).toContainEqual(attribute())
      }
    }),
    options,
  )
})
it('only the latest-started generation can publish for generated completion orders', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.shuffledSubarray([0, 1, 2], { minLength: 3, maxLength: 3 }),
      fc.boolean(),
      async (order, failNewest) => {
        const w = setup(),
          gates = [deferred<unknown>(), deferred<unknown>(), deferred<unknown>()]
        let request = 0
        const p = createModelPublisher({ ...w.ports, load: () => gates[request++].promise })
        const runs = gates.map((_, i) => {
          const root: any = copy(w.org)
          root.definition.version = '1.0.' + i
          return p.compileAndPublish(root)
        })
        for (const i of order) {
          gates[i].resolve(failNewest && i === 2 ? 'bad JSON' : w.base)
          await runs[i]
        }
        const results = await Promise.all(runs)
        expect(results[0].diagnostics[0].code).toBe('SUPERSEDED')
        expect(results[1].diagnostics[0].code).toBe('SUPERSEDED')
        if (failNewest) expect(p.current()).toBeUndefined()
        else expect(p.current()!.version).toBe('1.0.2')
      },
    ),
    options,
  )
})
