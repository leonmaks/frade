import { expect, it } from 'vitest'
import * as core from '../src/index'
const objects = ['C', 'A', 'B'].map((id) => ({
  ref: { repositoryId: 'R', objectId: id },
  name: 'same',
  typeId: 'sample:App',
  attributes: id === 'B' ? { status: null } : { status: 'active' },
  revision: 'r',
}))
it('CORE-006 sorts with identity tie breakers and distinguishes missing null and NOT', () => {
  const result = core.queryEntities(objects, { limit: 2 }, 'session', 'revision')
  expect(result).toMatchObject({
    ok: true,
    value: { items: [{ ref: { objectId: 'A' } }, { ref: { objectId: 'B' } }] },
  })
  if (!result.ok) throw Error('query')
  expect(
    core.queryEntities(objects, { limit: 2, cursor: result.value.cursor }, 'session', 'revision'),
  ).toMatchObject({ ok: true, value: { items: [{ ref: { objectId: 'C' } }] } })
  expect(
    core.queryEntities(
      objects,
      { where: { op: 'eq', field: 'attributes.status', value: null } },
      'session',
      'revision',
    ),
  ).toMatchObject({ ok: true, value: { items: [{ ref: { objectId: 'B' } }] } })
  expect(
    core.queryEntities(
      objects,
      { where: { op: 'not', filter: { op: 'exists', field: 'attributes.unknown' } } },
      'session',
      'revision',
    ),
  ).toMatchObject({
    ok: true,
    value: { items: [...objects].sort((a, b) => a.ref.objectId.localeCompare(b.ref.objectId)) },
  })
})
it('CORE-006 rejects stale, foreign and query-mismatched cursors and invalid bounds', () => {
  const first = core.queryEntities(objects, { limit: 1 }, 'session', 'r1')
  if (!first.ok) throw Error('first')
  expect(
    core.queryEntities(objects, { limit: 1, cursor: first.value.cursor }, 'session', 'r2'),
  ).toMatchObject({ ok: false, error: { code: 'STALE_CURSOR' } })
  expect(
    core.queryEntities(objects, { limit: 1, cursor: first.value.cursor }, 'other', 'r1'),
  ).toMatchObject({ ok: false, error: { code: 'INVALID_CURSOR' } })
  expect(
    core.queryEntities(
      objects,
      {
        limit: 1,
        cursor: first.value.cursor,
        where: { op: 'eq', field: 'name', value: 'different' },
      },
      'session',
      'r1',
    ).ok,
  ).toBe(false)
  for (const limit of [0, 1001, NaN, Infinity, -1, 1.5])
    expect(core.queryEntities(objects, { limit }, 'session', 'r1').ok).toBe(false)
})
it('CORE-006 enforces logical operators projection and scalar comparison', () => {
  expect(
    core.queryEntities(
      objects,
      {
        where: {
          op: 'and',
          filters: [
            { op: 'eq', field: 'typeId', value: 'sample:App' },
            { op: 'in', field: 'ref.objectId', value: ['A', 'C'] },
          ],
        },
        projection: ['name'],
      },
      's',
      'r',
    ),
  ).toMatchObject({
    ok: true,
    value: { items: [{ ref: { objectId: 'A' } }, { ref: { objectId: 'C' } }] },
  })
  expect(
    core.queryEntities(objects, { where: { op: 'eval', value: 'process.exit()' } }, 's', 'r').ok,
  ).toBe(false)
})
