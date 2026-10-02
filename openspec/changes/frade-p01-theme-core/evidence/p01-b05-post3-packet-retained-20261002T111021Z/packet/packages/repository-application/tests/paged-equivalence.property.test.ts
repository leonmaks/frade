import { it, expect } from 'vitest'
import fc from 'fast-check'
import { validateSnapshot } from '@frade/metamodel-domain'
import { compileModel } from '@frade/metamodel-compiler'
import { createHash } from 'node:crypto'
import { PagedCatalog } from '../../local-index/src/index'
import { sampleMetamodel } from '../../adapter-yaml/src/index'
import {
  validateStreaming,
  validationProjection,
  queryEntities,
  type Entity,
  type Revision,
  type Query,
} from '@frade/repository-domain'
const unwrap = <T>(
  r: { ok: true; value: T } | { ok: false; error?: unknown; diagnostics?: unknown },
): T => {
  if (!r.ok) throw Error(JSON.stringify(r))
  return r.value
}
const seed = { seed: 20260924, numRuns: 200 }
it('v2-index-import: bulk construction builds query indexes before exposing the catalog', async () => {
  const catalog = new PagedCatalog(':memory:')
  try {
    ;(catalog as any).beginImport()
    expect(
      catalog.db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='incoming'")
        .get(),
    ).toBeUndefined()
    unwrap(
      catalog.put('object', {
        ref: { repositoryId: 'R', objectId: 'A' },
        typeId: 'sample:ApplicationSystem',
        name: 'A',
        attributes: { status: 'created' },
        revision: 'r',
      }),
    )
    ;(catalog as any).finishImport()
    expect(
      catalog.db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='incoming'")
        .get(),
    ).toBeDefined()
    expect(
      unwrap(
        await catalog.query(
          'object',
          { where: { op: 'eq', field: 'attributes.status', value: 'created' } },
          'r',
        ),
      ).items,
    ).toHaveLength(1)
    const stored = catalog.db.prepare('SELECT ord FROM entities').get()!.ord
    expect(stored).toBeInstanceOf(Uint8Array)
    expect(() => (catalog as any).beginImport()).toThrow()
  } finally {
    catalog.close()
  }
})
it('v2-equivalence: seed 20260924 streaming graph validation agrees with complete snapshot validation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 0, max: 12 }),
      fc.array(fc.tuple(fc.integer({ min: 0, max: 13 }), fc.integer({ min: 0, max: 13 })), {
        maxLength: 30,
      }),
      fc.boolean(),
      fc.boolean(),
      fc.boolean(),
      async (size, edges, undirected, duplicates, bounded) => {
        const source = sampleMetamodel(),
          base = source.definition.relationTypes[0],
          model = {
            ...source,
            definition: {
              ...source.definition,
              relationTypes: [
                {
                  ...base,
                  direction: undirected ? ('undirected' as const) : ('directed' as const),
                  allowSelfReference: duplicates,
                  duplicates: duplicates
                    ? ('allow' as const)
                    : ('forbid-same-type-and-pair' as const),
                  ...(bounded
                    ? {
                        sourceCardinality: { min: 1, max: 2 },
                        targetCardinality: { min: 1, max: 2 },
                      }
                    : {}),
                },
              ],
            },
          }
        const compiled = unwrap(
            await compileModel(model, {
              load: async () => {
                throw Error('No imports')
              },
              sha256: async (text) => createHash('sha256').update(text).digest('hex'),
            }),
          ),
          ref = (i: number) => ({ repositoryId: 'R', objectId: 'N' + i }),
          objects = Array.from({ length: size }, (_, i) => ({
            ref: ref(i),
            name: 'N' + i,
            typeId: 'sample:ApplicationSystem',
            attributes: { status: 'created' },
            revision: 'r' as Revision,
          })),
          relations = edges.map(([s, t], i) => ({
            ref: { repositoryId: 'R', relationId: 'E' + i },
            typeId: 'sample:IntegrationFlow',
            source: ref(s),
            target: ref(t),
            attributes: {},
            revision: 'r' as Revision,
          })),
          catalog = new PagedCatalog(':memory:')
        try {
          for (const e of objects) unwrap(catalog.put('object', e))
          for (const e of relations) unwrap(catalog.put('relation', e))
          const projection = validationProjection({
            objects,
            relations,
            repositoryId: 'R',
            revision: 'r' as Revision,
            complete: true,
            binding: {
              modelId: compiled.id,
              modelVersion: compiled.version,
              fingerprint: compiled.fingerprint,
            },
          })
          expect((await validateStreaming(compiled.analysis(), catalog)).ok).toBe(
            validateSnapshot(compiled.analysis(), projection).ok,
          )
        } finally {
          catalog.close()
        }
      },
    ),
    seed,
  )
}, 20000)
it('v2-query-equivalence: seed 20260924 paged index filtering and sorting preserve portable semantics', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(
        fc.record({
          name: fc.string({ maxLength: 12 }),
          value: fc.oneof(fc.integer(), fc.constant(null), fc.string({ maxLength: 12 })),
        }),
        { maxLength: 50 },
      ),
      fc.boolean(),
      fc.integer({ min: 1, max: 10 }),
      async (values, descending, limit) => {
        const entities: Entity[] = values.map((v, i) => ({
            ref: { repositoryId: 'R', objectId: 'N' + i },
            name: 'Name ' + v.name,
            typeId: 'fixture:Type',
            attributes: { v: v.value },
            revision: 'r' as Revision,
          })),
          catalog = new PagedCatalog(':memory:')
        try {
          for (const e of entities) unwrap(catalog.put('object', e))
          const queries: Query[] = [
            {},
            { sort: [{ field: 'name', direction: descending ? 'desc' : 'asc' }] },
            {
              where: { op: 'not', filter: { op: 'exists', field: 'attributes.absent' } },
              projection: [],
            },
            {
              where: {
                op: 'or',
                filters: [
                  { op: 'eq', field: 'attributes.v', value: null },
                  { op: 'gt', field: 'attributes.v', value: 0 },
                ],
              },
            },
            {
              where: { op: 'in', field: 'attributes.v', value: [null, 0, ''] },
              sort: [{ field: 'attributes.v', direction: 'asc' }],
            },
          ]
          for (const query of queries) {
            const all: Partial<Entity>[] = []
            let cursor: string | undefined
            do {
              const page = unwrap(
                await catalog.query(
                  'object',
                  { ...query, limit, ...(cursor ? { cursor } : {}) },
                  'r',
                ),
              )
              all.push(...page.items)
              cursor = page.cursor
            } while (cursor)
            expect(all).toEqual(
              unwrap(queryEntities(entities, { ...query, limit: 1000 }, 'portable', 'r')).items,
            )
          }
        } finally {
          catalog.close()
        }
      },
    ),
    seed,
  )
}, 20000)
it('v2-cancellation: a portable sorted scan checks cancellation at bounded work checkpoints', async () => {
  const catalog = new PagedCatalog(':memory:')
  let checks = 0
  try {
    for (let i = 0; i < 3000; i++)
      unwrap(
        catalog.put('object', {
          ref: { repositoryId: 'R', objectId: 'N' + i },
          name: 'N' + i,
          typeId: 'fixture:Type',
          attributes: {},
          revision: 'r',
        }),
      )
    expect(
      await (catalog.query as any)(
        'object',
        { sort: [{ field: 'name', direction: 'desc' }] },
        'r',
        () => ++checks > 1,
      ),
    ).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
    expect(catalog.scanned).toBeLessThanOrEqual(1024)
  } finally {
    catalog.close()
  }
})
