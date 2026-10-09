import { expect, it } from 'vitest'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createKaFixture } from '../../../scripts/ka-fixtures.mjs'
import {
  createSbereaYamlAdapter,
  defaultMetadataSet,
  inspectSbereaRecovery,
  resolveSbereaRecovery,
} from '../src'

it.each(['staged', 'replaced'])(
  'KA-004 real process interruption at %s preserves source and evidence without replay',
  async (phase) => {
    const fixture = await createKaFixture()
    let child: ReturnType<typeof spawn> | undefined
    try {
      const source = join(fixture.dataRoot, 'v2023/application/systems.yaml')
      const original = await readFile(source, 'utf8')
      const bundle = join(fixture.destination, 'crash-worker.mjs')
      await build({
        entryPoints: [resolve('tests/fixtures/crash-worker.ts')],
        outfile: bundle,
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node24',
        logLevel: 'silent',
        banner: {
          js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
        },
      })
      child = spawn(process.execPath, [bundle], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          FRADE_CRASH_ROOT: fixture.dataRoot,
          FRADE_CRASH_METADATA: fixture.metadataRoot,
          FRADE_CRASH_PHASE: phase,
        },
      })
      let stderr = ''
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
      const exited = once(child, 'exit')
      expect(
        (
          await Promise.race([
            once(child, 'message'),
            exited.then(() => {
              throw Error(stderr)
            }),
          ])
        )[0],
      ).toEqual({ phase })
      const options = {
        dataRoot: fixture.dataRoot,
        repositoryId: 'crash-test',
        metadataSet: defaultMetadataSet(fixture.metadataRoot),
      }
      expect(await createSbereaYamlAdapter(options).open()).toMatchObject({
        ok: false,
        error: { code: 'RECOVERY_REQUIRED' },
      })
      const active = await inspectSbereaRecovery(fixture.dataRoot)
      await expect(resolveSbereaRecovery(fixture.dataRoot, active)).rejects.toThrow('still alive')
      child.kill('SIGKILL')
      await exited
      const preview = await inspectSbereaRecovery(fixture.dataRoot)
      expect(preview.state).toBe(phase === 'staged' ? 'before' : 'after')
      const observed = await readFile(source, 'utf8')
      if (phase === 'staged') expect(observed).toBe(original)
      else expect(observed).toContain('Crash recovery assertion')
      await expect(
        resolveSbereaRecovery(fixture.dataRoot, { ...preview, journalHash: 'stale' }),
      ).rejects.toThrow('changed')
      await writeFile(source, observed + '\n# external edit\n')
      await expect(resolveSbereaRecovery(fixture.dataRoot, preview)).rejects.toThrow(
        'changed or conflicts',
      )
      await writeFile(source, observed)
      await resolveSbereaRecovery(fixture.dataRoot, preview)
      expect(await readFile(source, 'utf8')).toBe(observed)
      const evidenceName = (await readdir(fixture.dataRoot)).find((name) =>
        name.startsWith('.frade-sberea-evidence-'),
      )!
      const evidence = await readdir(join(fixture.dataRoot, evidenceName))
      expect(evidence).toEqual(
        expect.arrayContaining([
          'journal.json',
          'writer-lock.json',
          'resolved-journal.json',
          'resolved-lock.json',
        ]),
      )
      expect(evidence.includes('staged.yaml')).toBe(phase === 'staged')
      const reopened = await createSbereaYamlAdapter(options).open()
      if (!reopened.ok) throw Error(JSON.stringify(reopened.error))
      await reopened.value.close()
      expect(await readFile(source, 'utf8')).toBe(observed)
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit')
        child.kill('SIGKILL')
        await exited
      }
      await rm(fixture.destination, { recursive: true, force: true })
    }
  },
  60000,
)
import { openRepository } from '@frade/repository-application'

it.each(['staged', 'replaced'] as const)(
  'KA-004 lost acknowledgement at %s reconciles without repeating mutation',
  async (phase) => {
    const fixture = await createKaFixture()
    let close: (() => Promise<unknown>) | undefined
    try {
      let barriers = 0
      const opened = await openRepository(
        createSbereaYamlAdapter({
          dataRoot: fixture.dataRoot,
          repositoryId: 'ack-test',
          metadataSet: defaultMetadataSet(fixture.metadataRoot),
          writeBarrier: async (at) => {
            if (at === phase) {
              barriers++
              throw Error('Lost acknowledgement')
            }
          },
        }),
        { callerId: 'test', repositoryIds: ['ack-test'], permissions: ['read', 'write'] },
        { authorize: () => true },
      )
      if (!opened.ok) throw Error(JSON.stringify(opened.error))
      const core = opened.value
      close = () => core.close()
      const page = await core.queryObjects({ limit: 100 })
      if (!page.ok) throw Error(page.error.code)
      const found = await core.getObject(
        page.value.items.find((item) => item.typeId === 'sberea:kadzo.v2023.systems')!.ref!,
      )
      if (!found.ok) throw Error(found.error.code)
      const object = found.value
      const command = {
        repositoryId: 'ack-test',
        idempotencyKey: 'lost-ack',
        commands: [
          {
            op: 'updateObject',
            expectedRevision: object.revision,
            object: {
              ref: object.ref,
              name: object.name,
              typeId: object.typeId,
              attributes: { ...object.attributes, description: 'Lost acknowledgement assertion' },
            },
          },
        ],
      }
      const result = await core.applyChanges(command)
      expect(result.ok).toBe(false)
      const observed = await readFile(
        join(fixture.dataRoot, 'v2023/application/systems.yaml'),
        'utf8',
      )
      expect(await core.reconcile('lost-ack')).toMatchObject({
        ok: true,
        value: { status: phase === 'staged' ? 'not-committed' : 'committed' },
      })
      await core.applyChanges(command)
      expect(barriers).toBe(1)
      expect(await readFile(join(fixture.dataRoot, 'v2023/application/systems.yaml'), 'utf8')).toBe(
        observed,
      )
      expect((await readdir(fixture.dataRoot)).includes('.frade-sberea-recovery.json')).toBe(true)
    } finally {
      await close?.()
      await rm(fixture.destination, { recursive: true, force: true })
    }
  },
  60000,
)
