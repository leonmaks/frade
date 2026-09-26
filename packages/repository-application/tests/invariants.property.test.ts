import { expect, it } from 'vitest'
import fc from 'fast-check'
import { validateSnapshot } from '@frade/metamodel-domain'
import { validationProjection, entityKey, copyJson } from '@frade/repository-domain'
import { memory, context, obj } from './fixtures/memory'
import { modelFixture } from './bdd/world'
import { sampleMetamodel } from '../../adapter-yaml/src/index'
import { openRepository } from '../src/index'
const config = { seed: 20260924, numRuns: 200 }
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
it('RE-2 property seed 20260924: decoded nested collections never alias their input', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (values) => {
      const input = { nested: { values: [...values] } },
        copied = unwrap(copyJson(input))
      input.nested.values.push(999)
      expect(copied).toEqual({ nested: { values } })
    }),
    config,
  )
})
it('RC-3 property seed 20260924: failed second-stage commits preserve authoritative state', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer(), async (n) => {
      const f = await memory({ failChange: 1 }),
        s = unwrap(await openRepository(f.adapter, context, { authorize: () => true })),
        before = f.state
      try {
        const result = await s.applyChanges({
          repositoryId: 'R',
          commands: [
            { op: 'createObject', object: obj('A' + n) },
            { op: 'createObject', object: obj('B' + n) },
          ],
        })
        expect(result).toMatchObject({ ok: false, error: { code: 'WRITE_FAILED' } })
        expect(f.state).toEqual(before)
        expect(f.writes).toBe(1)
      } finally {
        await s.close()
      }
    }),
    config,
  )
})
it('RC-2 CORE-006 property seed 20260924: both configured models retain valid directed cyclic graphs', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 2, max: 8 }), fc.boolean(), async (size, second) => {
      const source = second ? modelFixture() : sampleMetamodel()
      const model = {
        ...source,
        definition: {
          ...source.definition,
          id: second ? 'organization:beta' : 'organization:alpha',
        },
      }
      const f = await memory({ model }),
        s = unwrap(await openRepository(f.adapter, context, { authorize: () => true }))
      try {
        const objects = Array.from({ length: size }, (_, i) => obj('N' + i))
        const relations = objects.map((o, i) => ({
          ref: { repositoryId: 'R', relationId: 'E' + i },
          typeId: 'sample:IntegrationFlow',
          source: o.ref,
          target: objects[(i + 1) % size].ref,
          attributes: {},
        }))
        unwrap(
          await s.applyChanges({
            repositoryId: 'R',
            commands: [
              ...objects.map((object) => ({ op: 'createObject', object })),
              ...relations.map((relation) => ({ op: 'createRelation', relation })),
            ],
          }),
        )
        expect(validateSnapshot(f.session.model.analysis(), validationProjection(f.state)).ok).toBe(
          true,
        )
        for (const edge of relations) {
          const outgoing = unwrap(await s.getOutgoingRelations(edge.source)),
            incoming = unwrap(await s.getIncomingRelations(edge.target))
          expect(outgoing.items.map((e) => entityKey('relation', e.ref!))).toContain(
            entityKey('relation', edge.ref),
          )
          expect(incoming.items.map((e) => entityKey('relation', e.ref!))).toContain(
            entityKey('relation', edge.ref),
          )
        }
        const graph = unwrap(await s.getSubgraph(objects[0].ref, { maxDepth: 10, maxResults: 100 }))
        expect(graph.objects).toHaveLength(size)
        expect(graph.relations).toHaveLength(size)
      } finally {
        await s.close()
      }
    }),
    config,
  )
}, 15000)
