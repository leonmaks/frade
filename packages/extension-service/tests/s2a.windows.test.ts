import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  createVerifiedFilesystem,
  NATIVE_FILESYSTEM_SOURCE_SHA256,
} from '../src/filesystem/factory'
import type { VerifiedFilesystem } from '../src/filesystem/factory'
import { WindowsFilesystemTransport } from '../src/filesystem/windows'
import { CheckedStorage } from '../src/storage'
import { InstallerJournal } from '../src/journal'
import { hash, plan, tx } from './s2a-fixture'
const distributionDirectory = fileURLToPath(new URL('../dist/native/', import.meta.url))
const compatible = await fs.readFile(
  new URL('./fixtures/compatible-light-dark.frade-extension', import.meta.url),
)
const tokens = JSON.parse(
  await fs.readFile(new URL('../../ui-workspace/tokens/tokens.json', import.meta.url), 'utf8'),
)
const options = {
  appVersion: '0.1.0',
  apiVersion: '1.0.0',
  themeRoles: Object.keys(tokens.themes.light),
}
async function removeOwnedFixture(temp: string, parent: string) {
  const actual = await fs.realpath(temp)
  if (
    path.dirname(actual).toLowerCase() !== parent.toLowerCase() ||
    !path.basename(actual).startsWith('frade-p02-s2a-')
  )
    throw Error('UNSAFE_OWNED_S2A_CLEANUP')
  await fs.rm(actual, { recursive: true })
}
async function fixture(
  run: (
    root: string,
    open: (generation: number) => Promise<VerifiedFilesystem>,
    kill: () => Promise<void>,
  ) => Promise<void>,
) {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw Error('S2A_WINDOWS_NATIVE_NOT_RUN')
  const parent = await fs.realpath(os.tmpdir()),
    temp = await fs.mkdtemp(path.join(parent, 'frade-p02-s2a-')),
    root = path.join(temp, 'extensions'),
    outside = path.join(temp, 'outside-original')
  await fs.writeFile(outside, 'outside-original')
  const sourceHash = hash(compatible),
    started = performance.now()
  let transport: WindowsFilesystemTransport | undefined,
    port: VerifiedFilesystem | undefined,
    commands = 0
  const open = async (generation: number) => {
    port = await createVerifiedFilesystem(
      {
        installationRoot: root,
        distributionDirectory,
        sourceSha256: NATIVE_FILESYSTEM_SOURCE_SHA256,
        generation,
      },
      {
        connect: async (o) => {
          transport = await WindowsFilesystemTransport.connect(o)
          const live = transport
          return {
            get closed() {
              return live.closed
            },
            request(p) {
              commands++
              return live.request(p)
            },
            dispose() {
              return live.dispose()
            },
          }
        },
      },
    )
    return port
  }
  const kill = async () => {
    if (!transport) throw Error('OWNED_HELPER_MISSING')
    const child = (transport as unknown as { child: ChildProcessWithoutNullStreams }).child
    if (
      !child ||
      !child.pid ||
      child.exitCode !== null ||
      child.signalCode !== null ||
      !child.spawnfile.replaceAll('\\', '/').endsWith('/frade-filesystem.exe')
    )
      throw Error('OWNED_HELPER_KILL_INVALID')
    const exited = new Promise<void>((resolve) => child.once('close', () => resolve()))
    if (!child.kill()) throw Error('OWNED_HELPER_KILL_FAILED')
    await exited
  }
  try {
    await run(root, open, kill)
  } finally {
    await port?.dispose()
    expect(await fs.readFile(outside, 'utf8')).toBe('outside-original')
    expect(hash(compatible)).toBe(sourceHash)
    await removeOwnedFixture(temp, parent)
    console.log(
      JSON.stringify({
        scope:
          'S2a task-owned NTFS helper/archive/journal only; Main/store reconciliation/full kill matrix NOT_RUN',
        commands,
        durationMs: Math.round(performance.now() - started),
        outsideUnchanged: true,
        sourceUnchanged: true,
        powerLoss: 'NOT_PROVEN',
      }),
    )
  }
}
describe('P02FS003/S2a actual checked NTFS archive and journal proof', () => {
  it('stores exact paired archive, completes eight records, reopens a fresh verified context with unchanged prefix', () =>
    fixture(async (root, open) => {
      const first = await open(1),
        journal = new InstallerJournal(first, 1),
        p = plan(hash(compatible))
      await journal.begin(tx, p)
      const stored = await new CheckedStorage(first).putArchive(
        compatible,
        hash(compatible),
        options,
        () => journal.scan(),
      )
      expect(stored.status).toBe('VALID')
      expect(stored.themes.map((t) => t.kind)).toEqual(['light', 'dark'])
      expect(
        await fs.readFile(path.join(root, 'versions', hash(compatible), 'archive.frade-extension')),
      ).toEqual(compatible)
      for (const phase of [
        'VALIDATED',
        'PREPARED',
        'SWAPPED',
        'PRESENTATION_ACK',
        'COMMITTED',
        'CLEANUP',
      ])
        await journal.phase(tx, phase)
      const scan = await journal.scan(),
        marker = scan.records.find((r) => r.record.phase === 'COMMITTED')
      if (!marker) throw Error('COMMITTED_MISSING')
      await journal.disposition(tx, {
        outcome: 'RETAINED_COMMITTED',
        authorityHash: marker.sha256,
        registry: p.newRegistry,
        presentation: p.newPresentation,
        consumedRevision: 12,
        cleanupPending: [],
      })
      const entries = await fs.readdir(path.join(root, 'journal', 'records')),
        before = await Promise.all(
          entries.map(async (name) => ({
            name,
            sha: hash(await fs.readFile(path.join(root, 'journal', 'records', name))),
          })),
        )
      expect(entries).toHaveLength(8)
      await first.dispose()
      const reopened = await open(2),
        after = await new InstallerJournal(reopened, 2).scan()
      expect(after.records).toHaveLength(8)
      expect(after.active).toBeNull()
      expect(after.authority?.registry).toEqual(p.newRegistry)
      expect(after.records.map((r) => ({ name: r.name, sha: r.sha256 }))).toEqual(
        before.sort((a, b) => a.name.localeCompare(b.name)),
      )
    }))
  it.each(['before', 'after'] as const)(
    'kills the actual task-owned helper %s valid COMMITTED; fresh scan selects the matching authority',
    (side) =>
      fixture(async (_root, open, kill) => {
        const first = await open(1),
          journal = new InstallerJournal(first, 1),
          p = plan(hash(compatible))
        await journal.begin(tx, p)
        await new CheckedStorage(first).putArchive(compatible, hash(compatible), options, () =>
          journal.scan(),
        )
        for (const phase of ['VALIDATED', 'PREPARED', 'SWAPPED', 'PRESENTATION_ACK'])
          await journal.phase(tx, phase)
        if (side === 'after') await journal.phase(tx, 'COMMITTED')
        const prefix = (await journal.scan()).records.map((r) => ({ name: r.name, sha: r.sha256 }))
        await kill()
        await first.dispose()
        const second = await open(2),
          reopened = await new InstallerJournal(second, 2).scan()
        expect(reopened.records.map((r) => ({ name: r.name, sha: r.sha256 }))).toEqual(prefix)
        expect(reopened.authority?.registry).toEqual(
          side === 'after' ? p.newRegistry : p.oldRegistry,
        )
        expect(reopened.active).not.toBeNull()
        expect(reopened.remainingSlots).toBe(side === 'after' ? 2 : 3)
      }),
  )
})
