import { it, expect } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir, cpus, totalmem, platform, release } from 'node:os'
import { join, resolve } from 'node:path'
import { createPagedNativeRepository, PagedNativeAdapter } from '../../adapter-yaml/src/index'
import { openRepository } from '../src/index'
import type { Entity, Result, Revision } from '../../repository-domain/src/index'
const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw Error(r.error.code)
  return r.value
}
it('v2-measurements: measured Small Medium Large source-backed operations', async () => {
  const label = process.env.FRADE_V2_BENCH_LABEL ?? 'optimized'
  if (!/^[a-z0-9-]+$/.test(label)) throw Error('Invalid measurement label')
  const sourceDigests: Record<string, string> = {}
  for (const path of [
    '../adapter-yaml/src/paged.ts',
    '../local-index/src/paged.ts',
    '../repository-domain/src/stream-validation.ts',
    'src/session.ts',
    'src/commands.ts',
  ])
    sourceDigests[path] = createHash('sha256')
      .update(await readFile(resolve(path)))
      .digest('hex')
  const reports: Record<string, unknown>[] = [],
    hardware = {
      node: process.version,
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      totalMemory: totalmem(),
    }
  for (const [name, objects, relations] of [
    ['Small', 1000, 3000],
    ['Medium', 100000, 300000],
    ['Large', 1000000, 3000000],
  ] as const) {
    const root = await mkdtemp(join(tmpdir(), 'frade-v2-benchmark-')),
      report: Record<string, unknown> = { name, objects, relations }
    let session: Awaited<ReturnType<typeof openRepository>> | undefined
    let peakRss = 0,
      peakHeap = 0
    const sample = () => {
        const m = process.memoryUsage()
        peakRss = Math.max(peakRss, m.rss)
        peakHeap = Math.max(peakHeap, m.heapUsed)
      },
      timer = setInterval(sample, 100)
    const ref = (i: number) => ({ repositoryId: 'bench', objectId: 'o' + i })
    async function* rows(kind: 'object' | 'relation'): AsyncIterable<Entity> {
      for (let i = 0; i < (kind === 'object' ? objects : relations); i++)
        yield kind === 'object'
          ? {
              ref: ref(i),
              typeId: 'sample:ApplicationSystem',
              name: 'Object ' + i,
              attributes: { status: 'created' },
              revision: ('r' + i) as Revision,
            }
          : {
              ref: { repositoryId: 'bench', relationId: 'e' + i },
              typeId: 'sample:IntegrationFlow',
              source: ref(Math.floor(i / 3) % objects),
              target: ref((Math.floor(i / 3) + (i % 3) + 1) % objects),
              attributes: {},
              revision: ('e' + i) as Revision,
            }
    }
    const measure = async <T>(label: string, work: () => Promise<Result<T>>) => {
      console.log(name + ': ' + label)
      const start = performance.now()
      const result = await work()
      report[label] = performance.now() - start
      return unwrap(result)
    }
    try {
      await measure('generationIncludingValidationMs', () =>
        createPagedNativeRepository(root, {
          repositoryId: 'bench',
          displayName: name,
          objects: rows('object'),
          relations: rows('relation'),
        }),
      )
      const opened = await measure('coldOpenIncludingIndexAndValidationMs', () =>
        new PagedNativeAdapter(root).open(),
      )
      session = await openRepository(
        { open: async () => ({ ok: true, value: opened }) },
        { callerId: 'benchmark', repositoryIds: ['bench'], permissions: ['read', 'write'] },
        { authorize: () => true },
      )
      const app = unwrap(session)
      const current = await measure('getByIdMs', () => app.getObject(ref(500)))
      await measure('filterMs', () => app.queryByStatus('created', { limit: 100 }))
      report.filterScanned = (opened as any).metrics.lastQueryScanned
      const incoming = await measure('incomingMs', () => app.getIncomingRelations(ref(500)))
      expect(incoming.items).toHaveLength(3)
      report.incomingScanned = (opened as any).metrics.lastQueryScanned
      await measure('traversalMs', () =>
        app.getSubgraph(ref(500), { maxDepth: 3, maxResults: 100 }),
      )
      const { revision, ...body } = current
      await measure('updateIncludingIncrementalIndexMs', () =>
        app.applyChanges({
          repositoryId: 'bench',
          commands: [
            {
              op: 'updateObject',
              object: { ...body, name: 'Updated' },
              expectedRevision: revision,
            },
          ],
        }),
      )
      expect(unwrap(await app.getObject(ref(500))).name).toBe('Updated')
      report.metrics = (opened as any).metrics
      report.status = 'MEASURED'
    } catch (error) {
      report.status = 'FAILED'
      report.error = String(error)
    } finally {
      sample()
      clearInterval(timer)
      report.sampledPeakRssBytes = peakRss
      report.sampledPeakHeapBytes = peakHeap
      report.endMemoryBytes = process.memoryUsage()
      if (session?.ok) await session.value.close()
      await rm(root, { recursive: true, force: true })
      reports.push(report)
      const evidence = {
        label,
        sourceDigests,
        recordedAt: new Date().toISOString(),
        hardware,
        memorySamplingIntervalMs: 100,
        reports,
      }
      await writeFile(
        resolve(
          '../../openspec/changes/frade-repo-core/evidence/benchmark-v2-' + label + '-results.json',
        ),
        JSON.stringify(evidence, null, 2) + '\n',
      )
      console.log(JSON.stringify(report))
    }
  }
  expect(reports.map((r) => r.status)).toEqual(['MEASURED', 'MEASURED', 'MEASURED'])
}, 3600000)
