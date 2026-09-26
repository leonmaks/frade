import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as index from '../src/index'
it('derived index rejects reads before rebuild and releases SQLite resources', async () => {
  const root = await mkdtemp(join(tmpdir(), 'frade-index-'))
  try {
    const cache = new index.SqliteIndex(join(root, 'derived.sqlite'))
    expect(await cache.queryObjects({})).toMatchObject({
      ok: false,
      error: { code: 'INDEX_OUT_OF_SYNC' },
    })
    await cache.close()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
