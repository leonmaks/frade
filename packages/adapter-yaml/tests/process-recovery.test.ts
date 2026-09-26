import { expect, it } from 'vitest'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  NativeAdapter,
  createNativeRepository,
  inspectNativeRecovery,
  recoverNativeRepository,
} from '../src/index'
it.each(['staged', 'replaced'])(
  'CORE-020 actual process termination at %s preserves a recoverable native repository',
  async (phase) => {
    const root = await mkdtemp(join(tmpdir(), 'frade-process-crash-')),
      bundle = join(root, 'crash-worker.mjs')
    let child: ReturnType<typeof spawn> | undefined
    try {
      await createNativeRepository(root, { repositoryId: 'R', displayName: 'Crash' })
      const original = await readFile(join(root, 'repository.yaml'), 'utf8')
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
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
        env: { ...process.env, FRADE_CRASH_ROOT: root, FRADE_CRASH_PHASE: phase },
      })
      let stderr = ''
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
      const exit = once(child, 'exit')
      const message = await Promise.race([
        once(child, 'message'),
        exit.then(() => {
          throw Error('Worker exited before barrier: ' + stderr)
        }),
      ])
      expect(message[0]).toEqual({ phase })
      expect(await new NativeAdapter(root).open()).toMatchObject({
        ok: false,
        error: { code: 'RECOVERY_REQUIRED' },
      })
      const active = await inspectNativeRecovery(root)
      if (!active.ok) throw Error(active.error.code)
      expect(active.value.writerActive).toBe(true)
      expect(
        await recoverNativeRepository(root, {
          expectedJournalHash: active.value.journalHash,
          strategy: 'keep-source',
        }),
      ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
      child.kill('SIGKILL')
      await exit
      const preview = await inspectNativeRecovery(root)
      expect(preview).toMatchObject({
        ok: true,
        value: { phase: phase === 'staged' ? 'STAGED' : 'COMMITTED', writerActive: false },
      })
      if (!preview.ok) throw Error(preview.error.code)
      if (phase === 'staged')
        expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toBe(original)
      expect(
        (
          await recoverNativeRepository(root, {
            expectedJournalHash: preview.value.journalHash,
            strategy: 'finish-staged',
          })
        ).ok,
      ).toBe(true)
      const reopened = await new NativeAdapter(root).open()
      expect(reopened.ok).toBe(true)
      if (reopened.ok) {
        expect(
          (await reopened.value.read('object', { repositoryId: 'R', objectId: 'crash' })).ok,
        ).toBe(true)
        await reopened.value.close()
      }
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL')
        await once(child, 'exit').catch(() => {})
      }
      await rm(root, { recursive: true, force: true })
    }
  },
  15000,
)
