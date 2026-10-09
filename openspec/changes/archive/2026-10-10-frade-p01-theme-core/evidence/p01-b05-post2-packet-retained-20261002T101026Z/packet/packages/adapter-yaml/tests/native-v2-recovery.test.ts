import { expect, it } from 'vitest'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import * as native from '../src/index'
import { openRepository } from '@frade/repository-application'
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
it('v2-orphan-lock: an inactive writer interrupted before journaling can preserve-source recover', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-orphan-'))
  try {
    unwrap(
      await native.createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Orphan',
        objects: empty(),
        relations: empty(),
      }),
    )
    const before = await readFile(join(root, 'manifest.json'), 'utf8')
    await writeFile(
      join(root, '.frade-v2-write.lock'),
      JSON.stringify({ pid: process.pid, operationId: 'interrupted-before-journal' }),
    )
    const preview = unwrap(await native.inspectPagedNativeRecovery(root))
    expect(preview).toMatchObject({ phase: 'LOCK_ONLY', writerActive: false })
    expect(
      await native.recoverPagedNativeRepository(root, {
        expectedJournalHash: preview.journalHash,
        strategy: 'finish-staged',
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
    unwrap(
      await native.recoverPagedNativeRepository(root, {
        expectedJournalHash: preview.journalHash,
        strategy: 'keep-source',
      }),
    )
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
    const opened = unwrap(await new native.PagedNativeAdapter(root).open())
    await opened.close()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
async function* empty() {}
it('v2-post-commit: acknowledgement failure never rolls back or replays the published source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-ack-'))
  let barriers = 0
  unwrap(
    await native.createPagedNativeRepository(root, {
      repositoryId: 'R',
      displayName: 'Ack',
      objects: empty(),
      relations: empty(),
    }),
  )
  const opened = unwrap(
    await openRepository(
      new native.PagedNativeAdapter(root, {
        writeBarrier: async (phase) => {
          if (phase === 'replaced') {
            barriers++
            throw Error('Lost finalization acknowledgement')
          }
        },
      }),
      { callerId: 'test', repositoryIds: ['R'], permissions: ['read', 'write'] },
      { authorize: () => true },
    ),
  )
  try {
    const change = {
        repositoryId: 'R',
        idempotencyKey: 'once',
        commands: [
          {
            op: 'createObject',
            object: {
              ref: { repositoryId: 'R', objectId: 'A' },
              typeId: 'sample:ApplicationSystem',
              name: 'A',
              attributes: { status: 'created' },
            },
          },
        ],
      },
      result = unwrap(await opened.applyChanges(change)),
      after = await readFile(join(root, 'manifest.json'), 'utf8')
    expect(result.warnings).toContain('RECOVERY_REQUIRED')
    expect(barriers).toBe(1)
    const retry = await opened.applyChanges(change)
    if (retry.ok) expect(retry.value).toEqual(result)
    else expect(retry.error.code).toBe('RECOVERY_REQUIRED')
    expect(barriers).toBe(1)
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(after)
    const preview = unwrap(await native.inspectPagedNativeRecovery(root))
    expect(preview.phase).toBe('COMMITTED')
    unwrap(
      await native.recoverPagedNativeRepository(root, {
        expectedJournalHash: preview.journalHash,
        strategy: 'keep-source',
      }),
    )
    const fresh = unwrap(await new native.PagedNativeAdapter(root).open())
    try {
      expect(unwrap(await fresh.query('object', {})).items).toHaveLength(1)
    } finally {
      await fresh.close()
    }
  } finally {
    await opened.close()
    await rm(root, { recursive: true, force: true })
  }
})
it('v2-recovery: actual process interruption before and after publication has explicit recovery', async () => {
  for (const phase of ['staged', 'replaced']) {
    const root = await mkdtemp(join(tmpdir(), 'frade-v2-crash-')),
      bundle = join(root, 'worker.mjs')
    let child: ReturnType<typeof spawn> | undefined
    try {
      unwrap(
        await native.createPagedNativeRepository(root, {
          repositoryId: 'R',
          displayName: 'Recovery',
          objects: empty(),
          relations: empty(),
        }),
      )
      const before = await readFile(join(root, 'manifest.json'), 'utf8')
      await build({
        entryPoints: [resolve('tests/fixtures/v2-crash-worker.ts')],
        outfile: bundle,
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node24',
        logLevel: 'silent',
        banner: {
          js: "import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);",
        },
      })
      child = spawn(process.execPath, [bundle], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
        env: { ...process.env, FRADE_CRASH_ROOT: root, FRADE_CRASH_PHASE: phase },
      })
      let stderr = ''
      child.stderr?.on('data', (chunk) => (stderr += chunk.toString()))
      const exit = once(child, 'exit')
      expect(
        (
          await Promise.race([
            once(child, 'message'),
            exit.then(() => {
              throw Error(stderr)
            }),
          ])
        )[0],
      ).toEqual({ phase })
      expect(await new native.PagedNativeAdapter(root).open()).toMatchObject({
        ok: false,
        error: { code: 'RECOVERY_REQUIRED' },
      })
      const active = unwrap<any>(await (native as any).inspectPagedNativeRecovery(root))
      expect(active.writerActive).toBe(true)
      expect(
        await (native as any).recoverPagedNativeRepository(root, {
          expectedJournalHash: active.journalHash,
          strategy: 'keep-source',
        }),
      ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
      child.kill('SIGKILL')
      await exit
      const preview = unwrap<any>(await (native as any).inspectPagedNativeRecovery(root))
      expect(preview.writerActive).toBe(false)
      expect(preview.phase).toBe(phase === 'staged' ? 'STAGED' : 'COMMITTED')
      if (phase === 'staged')
        expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
      unwrap(
        await (native as any).recoverPagedNativeRepository(root, {
          expectedJournalHash: preview.journalHash,
          strategy: 'finish-staged',
        }),
      )
      const session = unwrap(await new native.PagedNativeAdapter(root).open())
      try {
        expect((await session.read('object', { repositoryId: 'R', objectId: 'crash' })).ok).toBe(
          true,
        )
      } finally {
        await session.close()
      }
      expect(await readdir(join(root, '.frade-v2-recovered'))).toHaveLength(1)
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL')
        await once(child, 'exit').catch(() => {})
      }
      await rm(root, { recursive: true, force: true })
    }
  }
}, 30000)
it('v2-recovery-conflict: a failed staged write preserves source and requires a matching explicit preview', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-v2-stage-'))
  let session: Awaited<ReturnType<typeof openRepository>> | undefined
  try {
    unwrap(
      await native.createPagedNativeRepository(root, {
        repositoryId: 'R',
        displayName: 'Recovery',
        objects: empty(),
        relations: empty(),
      }),
    )
    const before = await readFile(join(root, 'manifest.json'), 'utf8')
    session = await openRepository(
      new native.PagedNativeAdapter(root, {
        writeBarrier: async () => {
          throw Error('Injected failure')
        },
      }),
      { callerId: 'test', repositoryIds: ['R'], permissions: ['read', 'write'] },
      { authorize: () => true },
    )
    expect(
      await unwrap(session).applyChanges({
        repositoryId: 'R',
        commands: [
          {
            op: 'createObject',
            object: {
              ref: { repositoryId: 'R', objectId: 'A' },
              typeId: 'sample:ApplicationSystem',
              name: 'A',
              attributes: { status: 'created' },
            },
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'RECOVERY_REQUIRED' } })
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
    const preview = unwrap(await native.inspectPagedNativeRecovery(root))
    expect(preview.writerActive).toBe(false)
    expect(
      await native.recoverPagedNativeRepository(root, {
        expectedJournalHash: 'stale',
        strategy: 'finish-staged',
      }),
    ).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
    unwrap(
      await native.recoverPagedNativeRepository(root, {
        expectedJournalHash: preview.journalHash,
        strategy: 'keep-source',
      }),
    )
    expect(await readFile(join(root, 'manifest.json'), 'utf8')).toBe(before)
    const reopened = unwrap(await new native.PagedNativeAdapter(root).open())
    try {
      expect(await reopened.read('object', { repositoryId: 'R', objectId: 'A' })).toMatchObject({
        ok: false,
        error: { code: 'ENTITY_NOT_FOUND' },
      })
    } finally {
      await reopened.close()
    }
  } finally {
    if (session?.ok) await session.value.close()
    await rm(root, { recursive: true, force: true })
  }
})
