import { expect, it } from 'vitest'
import fc from 'fast-check'
import { SqliteIndex } from '../../local-index/src/index'
import { queryEntities, type Entity, type Query } from '@frade/repository-domain'
import { memory, obj } from './fixtures/memory'

it('CORE-012 seeded SQLite rebuilds preserve source query ordering and adjacency', async () => {
  const fixture = await memory()
  await fc.assert(
    fc.asyncProperty(
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 30 }).filter((name) => !!name.trim()),
          status: fc.constantFrom('created', 'used'),
        }),
        { minLength: 1, maxLength: 30 },
      ),
      fc.integer({ min: 1, max: 10 }),
      async (values, limit) => {
        const objects = values.map((value, i) => ({
            ...obj('o' + i),
            name: value.name,
            attributes: { status: value.status },
            revision: 'r1' as any,
          })),
          relations = objects.map((source, i) => ({
            ref: { repositoryId: 'R', relationId: 'e' + i },
            typeId: 'sample:IntegrationFlow',
            source: source.ref,
            target: objects[(i + 1) % objects.length].ref,
            attributes: {},
            revision: 'r1' as any,
          })),
          snapshot = { ...fixture.state, objects, relations }
        for (let rebuild = 0; rebuild < 2; rebuild++) {
          const index = new SqliteIndex(':memory:')
          try {
            expect((await index.rebuild(snapshot)).ok).toBe(true)
            for (const [kind, rows, query] of [
              ['object', objects, { sort: [{ field: 'name', direction: 'asc' }] }],
              [
                'object',
                objects,
                { where: { op: 'eq', field: 'attributes.status', value: 'created' } },
              ],
              [
                'relation',
                relations,
                { where: { op: 'eq', field: 'target.objectId', value: 'o0' } },
              ],
            ] as const) {
              const actual: Partial<Entity>[] = []
              let cursor: string | undefined
              do {
                const request = { ...query, limit, ...(cursor ? { cursor } : {}) },
                  page =
                    kind === 'object'
                      ? await index.queryObjects(request)
                      : await index.queryRelations(request)
                if (!page.ok) throw Error(page.error.code)
                actual.push(...page.value.items)
                cursor = page.value.cursor
              } while (cursor)
              const expected = queryEntities<Entity>(
                rows,
                { ...query, limit: 1000 } as Query,
                'source',
                snapshot.revision,
              )
              if (!expected.ok) throw Error(expected.error.code)
              expect(actual).toEqual(expected.value.items)
            }
          } finally {
            await index.close()
          }
        }
      },
    ),
    { seed: 20260924, numRuns: 200 },
  )
})
it('CORE-012 an incomplete snapshot cannot be certified as a rebuilt index', async () => {
  const fixture = await memory(),
    index = new SqliteIndex(':memory:')
  try {
    expect(await index.rebuild({ ...fixture.state, complete: false })).toMatchObject({
      ok: false,
      error: { code: 'INDEX_OUT_OF_SYNC' },
    })
    expect(index.state).toBe('OUT_OF_SYNC')
  } finally {
    await index.close()
  }
})
