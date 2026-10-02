import { it, expect } from 'vitest'
import { mkdtemp, open, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir, cpus, totalmem, platform, release } from 'node:os'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createNativeRepository, NativeAdapter } from '../../adapter-yaml/src/index'
import { SqliteIndex } from '../../local-index/src/index'
import { openRepository } from '../src/index'
const samples = [
  ['Small', 1000, 3000],
  ['Medium', 100000, 300000],
  ['Large', 1000000, 3000000],
] as const
it('records measured capacity and latency without treating rejected sizes as successful performance', async () => {
  const reports: Record<string, unknown>[] = []
  for (const [name, objects, relations] of samples) {
    const root = await mkdtemp(join(tmpdir(), 'frade-benchmark-'))
    let session: Awaited<ReturnType<typeof openRepository>> | undefined
    try {
      await createNativeRepository(root, {
        repositoryId: 'bench',
        displayName: name,
        format: 'json',
      })
      const source = join(root, 'repository.json'),
        file = await open(source, 'w'),
        generated = performance.now()
      await file.writeFile('{"formatVersion":1,"repositoryId":"bench","objects":[')
      const ref = (i: number) => ({ repositoryId: 'bench', objectId: 'o' + i })
      for (let start = 0; start < objects; start += 1000) {
        const rows = []
        for (let i = start; i < Math.min(start + 1000, objects); i++)
          rows.push(
            JSON.stringify({
              ref: ref(i),
              typeId: 'sample:ApplicationSystem',
              name: 'Object ' + i,
              attributes: { status: 'created' },
              revision: 'r' + i,
            }),
          )
        await file.writeFile((start ? ',' : '') + rows.join(','))
      }
      await file.writeFile('],"relations":[')
      for (let start = 0; start < relations; start += 1000) {
        const rows = []
        for (let i = start; i < Math.min(start + 1000, relations); i++) {
          const source = Math.floor(i / 3) % objects,
            target = (source + (i % 3) + 1) % objects
          rows.push(
            JSON.stringify({
              ref: { repositoryId: 'bench', relationId: 'e' + i },
              typeId: 'sample:IntegrationFlow',
              source: ref(source),
              target: ref(target),
              attributes: {},
              revision: 'e' + i,
            }),
          )
        }
        await file.writeFile((start ? ',' : '') + rows.join(','))
      }
      await file.writeFile(']}')
      await file.sync()
      await file.close()
      const report: Record<string, unknown> = {
        name,
        objects,
        relations,
        bytes: (await stat(source)).size,
        generationMs: performance.now() - generated,
      }
      const start = performance.now()
      session = await openRepository(
        new NativeAdapter(root),
        { callerId: 'benchmark', repositoryIds: ['bench'], permissions: ['read', 'write'] },
        { authorize: () => true },
      )
      report.coldOpenMs = performance.now() - start
      if (!session.ok) {
        report.openError = session.error.code
        report.dependentMeasurements = 'BLOCKED_BY_OPEN'
        reports.push(report)
        continue
      }
      const repository = session.value,
        measure = async (label: string, work: () => Promise<unknown>) => {
          const start = performance.now(),
            result = await work()
          report[label] = performance.now() - start
          return result
        }
      const snapshot = await repository.exportSnapshot()
      if (!snapshot.ok) throw Error(snapshot.error.code)
      const cache = new SqliteIndex(join(root, 'derived.sqlite'))
      try {
        const indexed = await measure('indexBuildMs', () => cache.rebuild(snapshot.value))
        expect(indexed).toMatchObject({ ok: true })
        await repository.attachIndex(cache)
        const point = await measure('getByIdMs', () => repository.getObject(ref(500)))
        expect(point).toMatchObject({ ok: true })
        await measure('filterMs', () => repository.queryByStatus('created', { limit: 100 }))
        await measure('incomingMs', () => repository.getIncomingRelations(ref(500)))
        await measure('traversalMs', () =>
          repository.getSubgraph(ref(500), { maxDepth: 3, maxResults: 100 }),
        )
        const object = await repository.getObject(ref(500))
        if (!object.ok) throw Error(object.error.code)
        const before = await repository.exportSnapshot()
        if (!before.ok) throw Error(before.error.code)
        const changed = await measure('updateIncludingIncrementalIndexMs', () =>
          repository.applyChanges({
            repositoryId: 'bench',
            idempotencyKey: 'bench-update',
            commands: [
              {
                op: 'updateObject',
                expectedRevision: object.value.revision,
                object: {
                  ref: object.value.ref,
                  typeId: object.value.typeId,
                  name: 'Updated',
                  attributes: object.value.attributes,
                },
              },
            ],
          }),
        )
        expect(changed).toMatchObject({ ok: true })
        await measure('indexedPointMs', () => cache.getObject(ref(500)))
        report.memoryBytes = process.memoryUsage()
      } finally {
        await cache.close()
      }
      reports.push(report)
    } finally {
      if (session?.ok) await session.value.close()
      await rm(root, { recursive: true, force: true })
    }
  }
  const evidence = {
    recordedAt: new Date().toISOString(),
    node: process.version,
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    totalMemory: totalmem(),
    reports,
  }
  await writeFile(
    resolve('../../openspec/changes/frade-repo-core/evidence/benchmark-results.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  )
  console.log(JSON.stringify(evidence))
  expect(reports).toHaveLength(3)
}, 600000)
