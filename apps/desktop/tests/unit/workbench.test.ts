import { it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { WorkbenchHost, WorkbenchRelay } from '../../src/main/workbench'
import { RepositoryBackend } from '@frade/runtime-node'
import type {
  WorkspaceRoot,
  WorkspaceStatus,
  MetadataPreview,
  BackendCommand,
} from '@frade/repository-api/workbench'
import { fixture, unwrap } from '../../../../packages/adapter-sberea-yaml/tests/fixtures/synthetic'
it('WB-006/KM-006 persists host grants, rebases workspace paths and keeps the old binding when settings cannot be committed', async () => {
  const f = await fixture(),
    backend = new RepositoryBackend(),
    settingsFile = join(f.destination, 'settings.json'),
    workspace = join(f.destination, 'saved.frade-workspace')
  const root: WorkspaceRoot = {
    repositoryId: 'A',
    label: 'A',
    adapterKind: 'sberea',
    dataRoot: f.dataRoot,
    entry: 'root.yaml',
    metadataSets: [f.options.metadataSet],
    activeMetadataSet: f.options.metadataSet.id,
  }
  await writeFile(settingsFile, JSON.stringify({ version: 1, roots: [root] }))
  const host = new WorkbenchHost({
    settingsFile,
    request: (command) => backend.handle(command),
    pick: async () => workspace,
    save: async () => workspace,
    close: () => {},
  })
  try {
    const initial = unwrap(await host.command({ operation: 'restore' })) as WorkspaceStatus
    expect(initial.roots[0].session).toBeTruthy()
    expect(
      await host.command({
        operation: 'saveWorkspace',
        roots: [{ ...root, dataRoot: 'C:/injected' }],
      }),
    ).toMatchObject({ ok: true })
    const stored = JSON.parse(await readFile(workspace, 'utf8'))
    expect(resolve(f.destination, stored.roots[0].dataRoot)).toBe(resolve(f.dataRoot))
    expect(await host.command({ operation: 'openWorkspace' })).toMatchObject({ ok: true })
    expect(
      await host.command({
        operation: 'stageMetadata',
        repositoryId: 'B',
        metadataSet: f.options.metadataSet,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } })
    const candidate = unwrap(
      await host.command({
        operation: 'stageMetadata',
        repositoryId: 'A',
        metadataSet: { ...f.options.metadataSet, id: 'second' },
      }),
    ) as MetadataPreview
    await unlink(settingsFile)
    await mkdir(settingsFile)
    expect(
      await host.command({
        operation: 'activateMetadata',
        repositoryId: 'A',
        candidateId: candidate.candidateId,
      }),
    ).toMatchObject({ ok: false })
    expect(
      (unwrap(await host.command({ operation: 'restore' })) as WorkspaceStatus).roots[0].root
        .activeMetadataSet,
    ).toBe('test')
    expect(await host.command({ operation: 'cancelMetadata', repositoryId: 'A' })).toMatchObject({
      ok: true,
    })
  } finally {
    await backend.closeAll()
    await f.cleanup()
  }
})
it('DS-002/003 relay deadlines, lost mutation acknowledgement, late replies and child replacement never replay writes', async () => {
  vi.useFakeTimers()
  const messages: unknown[] = [],
    child = new EventEmitter() as EventEmitter & { postMessage: (v: unknown) => void }
  child.postMessage = (v) => messages.push(v)
  const relay = new WorkbenchRelay(() => {})
  relay.attach(child as unknown as Electron.UtilityProcess)
  const command: BackendCommand = {
    operation: 'request',
    value: {
      scope: { repositoryId: 'A', sessionId: 's', generation: 1, modelGeneration: 1 },
      request: {
        version: 1,
        operation: 'applyChanges',
        payload: { changeSet: { repositoryId: 'A', idempotencyKey: 'once', commands: [] } },
      },
    },
  }
  try {
    const pending = relay.request(command)
    await vi.advanceTimersByTimeAsync(30001)
    expect(await pending).toMatchObject({
      ok: false,
      error: { code: 'OUTCOME_UNKNOWN', operationId: 'once' },
    })
    expect(messages).toHaveLength(2)
    expect(messages[1]).toMatchObject({ type: 'workbench-cancel' })
    child.emit('message', {
      type: 'workbench-response',
      id: (messages[0] as any).id,
      result: { ok: true, value: true },
    })
    const second = relay.request(command)
    child.emit('exit', 1)
    expect(await second).toMatchObject({ ok: false, error: { code: 'OUTCOME_UNKNOWN' } })
    const replacement = new EventEmitter() as typeof child
    replacement.postMessage = (v) => messages.push(v)
    relay.attach(replacement as unknown as Electron.UtilityProcess)
    expect(messages.filter((v: any) => v.type === 'workbench-request')).toHaveLength(2)
    const closing = relay.request({ operation: 'close', repositoryId: 'A' })
    replacement.emit('exit', 1)
    expect(await closing).toMatchObject({ ok: false, error: { code: 'REPOSITORY_UNAVAILABLE' } })
  } finally {
    relay.failed()
    vi.useRealTimers()
  }
})

it('external catalogs remain separate, explicitly scoped, validated and rebased', async () => {
  const a = await fixture(),
    b = await fixture(),
    backend = new RepositoryBackend()
  const roots = [a, b].map((f, i): WorkspaceRoot => ({
    repositoryId: i ? 'B' : 'A',
    label: i ? 'B' : 'A',
    adapterKind: 'sberea',
    dataRoot: f.dataRoot,
    entry: 'root.yaml',
    metadataSets: [f.options.metadataSet],
    activeMetadataSet: f.options.metadataSet.id,
  }))
  const settingsFile = join(a.destination, 'catalog-settings.json'),
    catalog = join(a.destination, 'services.json'),
    workspace = join(a.destination, 'catalogs.frade-workspace')
  await writeFile(settingsFile, JSON.stringify({ version: 1, roots }))
  await writeFile(
    catalog,
    JSON.stringify({
      version: 1,
      id: 'services',
      label: 'External services',
      objects: [
        {
          id: 'same-id',
          name: 'External API',
          type: 'kadzo.v2023.systems',
          attributes: { location: 'Внешняя', parent: '' },
        },
      ],
    }),
  )
  const host = new WorkbenchHost({
    settingsFile,
    request: (c) => backend.handle(c),
    pick: async () => catalog,
    save: async () => workspace,
    close: () => {},
  })
  try {
    const opened = unwrap(await host.command({ operation: 'restore' })) as WorkspaceStatus
    expect((await host.command({ operation: 'connectCatalog', repositoryId: 'A' })).ok).toBe(true)
    const request = (id: string) => {
      const session = opened.roots.find((r) => r.root.repositoryId === id)!.session!
      return host.request({
        scope: {
          repositoryId: id,
          sessionId: session.sessionId,
          generation: session.generation,
          modelGeneration: session.modelGeneration,
        },
        request: { version: 1, operation: 'diagram', payload: { action: 'catalogs' } },
      })
    }
    expect(unwrap(await request('A'))).toMatchObject({
      catalogs: [
        {
          id: 'services',
          objects: [
            {
              id: 'same-id',
              name: 'External API',
              attributes: { location: 'Внешняя', parent: '' },
            },
          ],
        },
      ],
      errors: [],
    })
    expect(unwrap(await request('B'))).toEqual({ catalogs: [], errors: [] })
    await host.command({ operation: 'saveWorkspace', roots })
    const stored = JSON.parse(await readFile(workspace, 'utf8'))
    expect(stored.roots[0].externalCatalogs).toEqual([{ id: 'services', path: 'services.json' }])
    expect(stored.roots[1].externalCatalogs).toBeUndefined()
    await writeFile(
      catalog,
      JSON.stringify({
        version: 1,
        id: 'services',
        label: 'x',
        objects: [
          { id: 'same-id', name: 'one' },
          { id: 'same-id', name: 'two' },
        ],
      }),
    )
    expect(unwrap(await request('A'))).toMatchObject({ catalogs: [] })
    expect((unwrap(await request('A')) as { errors: string[] }).errors).toHaveLength(1)
    await host.command({ operation: 'disconnectCatalog', repositoryId: 'A', sourceId: 'services' })
    expect(unwrap(await request('A'))).toEqual({ catalogs: [], errors: [] })
  } finally {
    await backend.closeAll()
    await a.cleanup()
    await b.cleanup()
  }
})
