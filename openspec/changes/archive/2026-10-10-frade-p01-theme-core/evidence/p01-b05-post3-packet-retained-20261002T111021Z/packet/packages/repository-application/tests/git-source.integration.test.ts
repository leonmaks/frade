import { expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeAdapter, createNativeRepository } from '../../adapter-yaml/src/index'
import { GitVersioning } from '../../versioning-git/src/index'
import { openRepository } from '../src/index'
import { context, obj } from './fixtures/memory'
const exec = promisify(execFile)
const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw Error(JSON.stringify(r.error))
  return r.value
}
it('CORE-018 domain writes never commit or push a Git-backed native repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-git-source-'))
  const git = (...args: string[]) =>
    exec('git', ['-C', root, ...args], { windowsHide: true, timeout: 10000 })
  try {
    await git('init', '-b', 'main')
    await git('config', 'user.name', 'Fixture')
    await git('config', 'user.email', 'fixture@example.invalid')
    await createNativeRepository(root, { repositoryId: 'R', displayName: 'Git source' })
    const versioning = new GitVersioning(root),
      head = unwrap(
        await versioning.commit('baseline', ['profile.json', 'metamodel.json', 'repository.yaml']),
      )
    const session = unwrap(
      await openRepository(new NativeAdapter(root), context, { authorize: () => true }),
    )
    try {
      unwrap(
        await session.applyChanges({
          repositoryId: 'R',
          commands: [{ op: 'createObject', object: obj() }],
        }),
      )
    } finally {
      await session.close()
    }
    expect(unwrap(await versioning.status())).toMatchObject({
      revision: head,
      changedPaths: ['repository.yaml'],
    })
    expect(unwrap(await versioning.history(10))).toHaveLength(1)
    expect((await git('remote')).stdout).toBe('')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 20000)
it('CORE-020 Git conflict inspection is distinct from semantic revision conflicts and never resolves files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-git-conflict-'))
  const git = (...args: string[]) =>
    exec('git', ['-C', root, ...args], { windowsHide: true, timeout: 10000 })
  try {
    await git('init', '-b', 'main')
    await git('config', 'user.name', 'Fixture')
    await git('config', 'user.email', 'fixture@example.invalid')
    const path = join(root, 'conflict.txt'),
      versioning = new GitVersioning(root)
    await writeFile(path, 'base\n')
    unwrap(await versioning.commit('base', ['conflict.txt']))
    await git('switch', '-c', 'other')
    await writeFile(path, 'other\n')
    unwrap(await versioning.commit('other', ['conflict.txt']))
    await git('switch', 'main')
    await writeFile(path, 'main\n')
    const head = unwrap(await versioning.commit('main', ['conflict.txt']))
    await expect(git('-c', 'core.editor=true', 'merge', 'other')).rejects.toBeDefined()
    const before = await readFile(path, 'utf8')
    expect(unwrap(await versioning.status())).toMatchObject({
      revision: head,
      conflicts: ['conflict.txt'],
    })
    expect(await versioning.commit('forbidden', ['conflict.txt'])).toMatchObject({
      ok: false,
      error: { code: 'REVISION_CONFLICT' },
    })
    expect(await readFile(path, 'utf8')).toBe(before)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 20000)
