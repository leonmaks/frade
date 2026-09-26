import { expect, it } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as git from '../src/index'
const exec = promisify(execFile)
it('Git exposes status history and explicit path-scoped commits without push', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-git-'))
  try {
    await exec('git', ['init', root])
    await exec('git', ['-C', root, 'config', 'user.name', 'Fixture'])
    await exec('git', ['-C', root, 'config', 'user.email', 'fixture@example.invalid'])
    await writeFile(join(root, 'a.txt'), 'one')
    await writeFile(join(root, 'b.txt'), 'unrelated')
    const versioning = new git.GitVersioning(root)
    expect(await versioning.status()).toMatchObject({
      ok: true,
      value: { revision: null, changedPaths: ['a.txt', 'b.txt'] },
    })
    const committed = await versioning.commit('Explicit fixture commit', ['a.txt'])
    expect(committed.ok).toBe(true)
    expect(await versioning.history(10)).toMatchObject({
      ok: true,
      value: [{ message: 'Explicit fixture commit' }],
    })
    expect(await versioning.status()).toMatchObject({
      ok: true,
      value: { changedPaths: ['b.txt'] },
    })
    expect((await versioning.commit('bad', ['../escape'])).ok).toBe(false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 20000)
