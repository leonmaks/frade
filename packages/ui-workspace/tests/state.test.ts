import type { Revision } from '@frade/repository-domain'
import { describe, it, expect } from 'vitest'
import { makeDraft, edited, refreshed, isDirty, openTab, readLayout, objectKey } from '../src/state'
const object = {
  ref: { repositoryId: 'A', objectId: 'same' },
  typeId: 't:T',
  name: 'Name',
  revision: '1' as Revision,
  attributes: { title: 'A', zero: 0, flag: false, unknown: { keep: true } },
}
describe('INS-002/004 shared draft lifecycle', () => {
  it('preserves unknown values, detects no-op and raw input, keeps local changes on external reload', () => {
    const clean = makeDraft(object, 1)
    expect(isDirty(clean)).toBe(false)
    const dirty = edited(clean, { ...clean.attributes, title: 'B' })
    expect(isDirty(dirty)).toBe(true)
    expect(dirty.attributes.unknown).toEqual({ keep: true })
    const next = {
      ...object,
      revision: '2' as Revision,
      attributes: { ...object.attributes, title: 'disk' },
    }
    expect(refreshed(clean, next, 1).attributes.title).toBe('disk')
    expect(refreshed(dirty, next, 1)).toMatchObject({
      state: 'conflict',
      attributes: { title: 'B' },
      disk: next,
    })
    expect(refreshed(dirty, object, 2)).toMatchObject({ state: 'conflict', modelGeneration: 1 })
    expect(refreshed(dirty, undefined, 1)).toMatchObject({ missing: true, state: 'conflict' })
    expect(isDirty({ ...clean, raw: { count: '-' } })).toBe(true)
    expect(edited(dirty, object.attributes).state).toBe('clean')
    expect(refreshed({ ...dirty, state: 'unknown' }, next, 1)).toMatchObject({
      state: 'unknown',
      attributes: { title: 'B' },
    })
  })
})
it('WB-003 qualified IDs, preview replacement, pinning, groups and shared draft keys', () => {
  const a = objectKey('A', 'same'),
    b = objectKey('B', 'same')
  expect(a).not.toBe(b)
  let groups = openTab([{ id: 'main', tabs: [] }], 'main', a, false)
  groups = openTab(groups, 'main', b, false)
  expect(groups[0].tabs).toEqual([b])
  groups = openTab(groups, 'main', b, true)
  groups = openTab(groups, 'main', a, false)
  expect(groups[0].tabs).toEqual([b, a])
  expect(groups[0].preview).toBe(a)
  groups = openTab([...groups, { id: 'split', tabs: [] }], 'split', b, true)
  expect(groups[1].tabs[0]).toBe(groups[0].tabs[0])
})
it('WB-002/003 layout survives resize and corrupt persistence safely', () => {
  expect(readLayout('{')).toMatchObject({ version: 1, sidebar: 300 })
  expect(
    readLayout(
      JSON.stringify({
        version: 1,
        sidebar: 1500,
        panel: 1500,
        expanded: ['A', 3],
        projection: 'sources',
        sidebarVisible: false,
      }),
      850,
      600,
    ),
  ).toMatchObject({
    sidebar: 550,
    panel: 380,
    expanded: ['A'],
    projection: 'sources',
    sidebarVisible: false,
  })
  expect(readLayout(JSON.stringify({ version: 99, sidebar: 1 })).sidebar).toBe(300)
})
