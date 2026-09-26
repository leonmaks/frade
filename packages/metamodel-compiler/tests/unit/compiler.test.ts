import { describe, expect, it } from 'vitest'
import { compileModel, createModelPublisher, compareModels, previewMigration } from '../../src'
import { setup, value, attribute, copy, deferred } from '../support/fixtures'
describe('compiler acceptance RED baseline', () => {
  it('loads exact imports and resolves inherited attributes without mutation', async () => {
    const w = setup(),
      before = copy(w.org)
    const c = value(await compileModel(w.org, w.ports))
    expect(c.objectTypes.find((t) => t.id === 'base:child')!.attributes[0].id).toBe('name')
    expect(w.org).toEqual(before)
    expect(w.calls).toEqual(['base:model'])
  })
  it('extends an imported parent and relation additively', async () => {
    const w = setup()
    w.org.extensions = [
      { targetKind: 'object', targetId: 'base:asset', attributes: [attribute()] },
      { targetKind: 'relation', targetId: 'base:uses', attributes: [attribute()] },
    ]
    const c = value(await compileModel(w.org, w.ports))
    expect(c.objectTypes.find((t) => t.id === 'base:child')!.attributes.map((a) => a.id)).toEqual([
      'name',
      'owner',
    ])
    expect(c.relationTypes[0].attributes[0].id).toBe('owner')
  })
  it('returns structured failures', async () => {
    const w = setup()
    w.org.definition.imports[0].version = '2.0.0'
    const c = await compileModel(w.org, w.ports)
    expect(c.ok).toBe(false)
    expect(c.diagnostics[0]).toMatchObject({ code: 'IMPORT_IDENTITY_MISMATCH', severity: 'error' })
  })
  it('projects exact type intersections without changing analysis', async () => {
    const w = setup()
    w.org.definition.profiles = [
      { id: 'org:profile', objectTypes: ['base:asset'], relationTypes: [] },
    ]
    w.org.definition.viewpoints = [
      { id: 'org:view', objectTypes: ['base:child'], relationTypes: [] },
    ]
    const c = value(await compileModel(w.org, w.ports))
    expect(value(c.project('org:profile', 'org:view')).objectTypes).toEqual([])
    expect(c.analysis().objectTypes.size).toBe(3)
  })
  it('replays locks and rejects same-version content drift', async () => {
    const w = setup(),
      a = value(await compileModel(w.org, w.ports))
    expect(value(await compileModel(w.org, w.ports, { lock: a.lock })).fingerprint).toBe(
      a.fingerprint,
    )
    w.base.definition.objectTypes[0].ui = { label: 'Changed' }
    expect((await compileModel(w.org, w.ports, { lock: a.lock })).ok).toBe(false)
  })
  it('publishes atomically and defeats stale completions', async () => {
    const w = setup(),
      p = createModelPublisher(w.ports)
    const first = value(await p.compileAndPublish(w.org))
    expect(p.current()).toBe(first)
    const gate = deferred<unknown>()
    const controlled = createModelPublisher({ ...w.ports, load: () => gate.promise })
    const old = controlled.compileAndPublish(w.org)
    const newer = copy(w.org)
    newer.definition.imports = []
    const last = value(await controlled.compileAndPublish(newer))
    gate.resolve(w.base)
    const stale = await old
    expect(stale.diagnostics[0].code).toBe('SUPERSEDED')
    expect(controlled.current()).toBe(last)
    expect((await p.compileAndPublish('invalid JSON')).ok).toBe(false)
    expect(p.current()).toBe(first)
  })
  it('reports removed types and previews data without deleting or normalizing', async () => {
    const w = setup(),
      old = value(await compileModel(w.org, w.ports))
    w.base.definition.objectTypes = w.base.definition.objectTypes.filter(
      (t: any) => t.id !== 'base:child',
    )
    const next = value(await compileModel(w.org, w.ports))
    expect(compareModels(old, next).changes).toContainEqual({
      kind: 'object',
      id: 'base:child',
      change: 'removed',
      classification: 'review',
    })
    const context = {
      binding: { modelId: old.id, modelVersion: old.version, fingerprint: old.fingerprint },
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
    const before = copy(context),
      preview = value(previewMigration(old, next, context))
    expect(preview.repositoryStatus).toBe('invalid')
    expect(preview.diagnostics[0].objectRef).toEqual({ repositoryId: 'R', objectId: 'A' })
    expect(context).toEqual(before)
    expect(value(previewMigration(old, next)).repositoryStatus).toBe('not-evaluated')
  })
})
