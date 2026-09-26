import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RepositoryAdapter } from '@frade/repository-ports'
import { openRepository, type RepositorySession } from '../../src/index'
import { context, obj } from '../fixtures/memory'
export interface RepositoryAdapterTestHarness {
  createRepository(): Promise<{
    adapter: RepositoryAdapter
    repositoryId: string
    dispose(): Promise<void>
  }>
}
export function repositoryAdapterContract(name: string, harness: RepositoryAdapterTestHarness) {
  describe('RepositoryAdapter: ' + name, () => {
    let fixture: Awaited<ReturnType<RepositoryAdapterTestHarness['createRepository']>>,
      session: RepositorySession
    beforeEach(async () => {
      fixture = await harness.createRepository()
      const opened = await openRepository(fixture.adapter, context, { authorize: () => true })
      if (!opened.ok) throw Error(opened.error.code)
      session = opened.value
    })
    afterEach(async () => {
      await session?.close()
      await fixture?.dispose()
    })
    it('reads a persisted object by stable ref', async () => {
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [{ op: 'createObject', object: obj() }],
          })
        ).ok,
      ).toBe(true)
      expect(await session.getObject(obj().ref)).toMatchObject({
        ok: true,
        value: { ref: obj().ref, name: 'A', attributes: { status: 'created' } },
      })
    })
    it('rejects a stale revision without overwriting the newer object', async () => {
      await session.applyChanges({
        repositoryId: 'R',
        commands: [{ op: 'createObject', object: obj() }],
      })
      const initial = await session.getObject(obj().ref)
      if (!initial.ok) throw Error('initial')
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              {
                op: 'updateObject',
                object: { ...obj(), name: 'newer' },
                expectedRevision: initial.value.revision,
              },
            ],
          })
        ).ok,
      ).toBe(true)
      const before = await session.getObject(obj().ref)
      expect(
        await session.applyChanges({
          repositoryId: 'R',
          commands: [
            {
              op: 'updateObject',
              object: { ...obj(), name: 'stale' },
              expectedRevision: initial.value.revision,
            },
          ],
        }),
      ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
      expect(await session.getObject(obj().ref)).toEqual(before)
    })
    it('returns equivalent incoming and outgoing relation identities', async () => {
      const relation = {
        ref: { repositoryId: 'R', relationId: 'edge' },
        typeId: 'sample:IntegrationFlow',
        source: obj('A').ref,
        target: obj('B').ref,
        attributes: {},
      }
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              { op: 'createObject', object: obj('A') },
              { op: 'createObject', object: obj('B') },
              { op: 'createRelation', relation },
            ],
          })
        ).ok,
      ).toBe(true)
      const outgoing = await session.getOutgoingRelations(obj('A').ref),
        incoming = await session.getIncomingRelations(obj('B').ref)
      if (!outgoing.ok || !incoming.ok) throw Error('query')
      expect(outgoing.value.items).toEqual(incoming.value.items)
      expect(incoming.value.items).toHaveLength(1)
    })
    it('rejects unsupported history explicitly', async () => {
      expect(await session.history()).toMatchObject({
        ok: false,
        error: { code: 'UNSUPPORTED_CAPABILITY' },
      })
    })
    it('invalid final state leaves the authoritative snapshot unchanged', async () => {
      const before = await session.exportSnapshot()
      expect(
        (
          await session.applyChanges({
            repositoryId: 'R',
            commands: [
              { op: 'createObject', object: obj() },
              { op: 'createObject', object: { ...obj('B'), attributes: { status: 'bad' } } },
            ],
          })
        ).ok,
      ).toBe(false)
      expect(await session.exportSnapshot()).toEqual(before)
    })
  })
}
