import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, readdir, unlink, rmdir, realpath, rm } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { createPresentationSettings } from '../../src/main/presentation-settings'
import type { PresentationChoice, PresentationPhase } from '@frade/runtime-contracts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) {
    const actual = await realpath(root), parent = await realpath(tmpdir())
    if (dirname(actual) !== parent || !basename(actual).startsWith('frade-staging-obstruction-'))
      throw Error('UNSAFE_OBSTRUCTION_FIXTURE_CLEANUP')
    await rm(actual, { recursive: true, force: true })
  }
})

const choice = (mode: 'light' | 'dark'): PresentationChoice => ({
  mode,
  density: 'compact',
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
})

it.each(['directory', 'file'] as const)(
  'real default staging preserves foreign %s and reconciles definite no-write refusal before retry',
  async (kind) => {
    const root = await mkdtemp(join(tmpdir(), 'frade-staging-obstruction-'))
    roots.push(root)
    const target = join(root, 'presentation-settings.json'), staged = target + '.staged'
    const original = JSON.stringify({
      version: 1, revision: 7, generation: 7, transactionId: 'seed/7', selection: choice('light'),
    }) + '\n'
    await writeFile(target, original)
    const store = createPresentationSettings({ userData: root, sessionId: 'obstruction-window', windowId: 5 })
    const boot = await store.initialize()
    if (kind === 'directory') {
      await mkdir(staged)
      await writeFile(join(staged, 'owner.txt'), 'foreign-owner')
    } else await writeFile(staged, 'foreign-owner')
    const first = await store.announceIntent('obstruction-window/first')
    const context = (generation: number, request: string, phase: PresentationPhase['phase']): PresentationPhase => ({
      version: 1, sessionId: 'obstruction-window', requestId: request, transactionId: request,
      generation, revision: 8, membership: 1, phase,
    })
    const firstContext = (phase: PresentationPhase['phase']) => context(first.generation, 'obstruction-window/first', phase)
    expect((await store.stage(firstContext('prepare'), choice('dark'), 7)).status).toBe('REFUSED')
    expect(await readFile(target, 'utf8')).toBe(original)
    expect(await store.reconcile(firstContext('rollback'), boot.durable)).toEqual(boot.durable)
    expect(await readFile(target, 'utf8')).toBe(original)
    if (kind === 'directory') {
      expect(await readdir(staged)).toEqual(['owner.txt'])
      expect(await readFile(join(staged, 'owner.txt'), 'utf8')).toBe('foreign-owner')
      await unlink(join(staged, 'owner.txt'))
      await rmdir(staged)
    } else {
      expect(await readFile(staged, 'utf8')).toBe('foreign-owner')
      await unlink(staged)
    }
    const next = await store.announceIntent('obstruction-window/next')
    const nextContext = (phase: PresentationPhase['phase']) => context(next.generation, 'obstruction-window/next', phase)
    expect((await store.stage(nextContext('prepare'), choice('dark'), 7)).status).toBe('STAGED')
    const persisted = await store.persist(nextContext('apply'), choice('dark'), 7)
    expect(persisted.status).toBe('ACK')
    if (persisted.status !== 'ACK') throw Error('Expected owned durable acknowledgement')
    expect((await store.persist(firstContext('apply'), choice('light'), 7)).status).toBe('REFUSED')
    const committed = await readFile(target, 'utf8')
    expect(JSON.parse(committed)).toEqual(persisted.durable)
    expect(persisted.durable.revision).toBeGreaterThan(7)
    expect(persisted.durable.selection).toEqual(choice('dark'))
    const restarted = createPresentationSettings({ userData: root, sessionId: 'restarted', windowId: 5 })
    expect((await restarted.initialize()).durable.selection).toEqual(choice('dark'))
    expect(await readFile(target, 'utf8')).toBe(committed)
  },
)
