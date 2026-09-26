import { expect, it } from 'vitest'
import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createKaFixture } from '../../../scripts/ka-fixtures.mjs'
import { createSbereaYamlAdapter, defaultMetadataSet } from '../src'
import type { RepositoryEvent } from '@frade/repository-ports'

it('KA-004/KM-004 watches replacement, new imports, malformed repair and metadata with independent subscriptions', async () => {
  const fixture = await createKaFixture()
  const sessions: Array<{ close(): Promise<void> }> = []
  try {
    const options = {
      dataRoot: fixture.dataRoot,
      repositoryId: 'watch-A',
      metadataSet: defaultMetadataSet(fixture.metadataRoot),
    }
    const opened = await createSbereaYamlAdapter(options).open()
    const other = await createSbereaYamlAdapter({ ...options, repositoryId: 'watch-B' }).open()
    if (!opened.ok || !other.ok) throw Error('Open failed')
    const a = opened.value,
      b = other.value
    sessions.push(a, b)
    const events: RepositoryEvent[] = [],
      otherEvents: RepositoryEvent[] = []
    a.subscribe!((event) => events.push(event))
    b.subscribe!((event) => otherEvents.push(event))
    // A throwing consumer must not prevent other consumers or state publication.
    a.subscribe!(() => {
      throw Error('Observer failure')
    })
    const page = await a.query('object', { limit: 100 })
    if (!page.ok) throw Error(page.error.code)
    const source = join(fixture.dataRoot, 'v2023/application/systems.yaml')
    const original = await readFile(source, 'utf8')
    const replace = async (text: string) => {
      await writeFile(source + '.new', text)
      await rename(source + '.new', source)
    }
    await replace(original + '\n# first external rename\n')
    await expect.poll(() => events.length, { timeout: 10000 }).toBeGreaterThan(0)
    const firstRevision = events.at(-1)!.revision
    expect(await a.query('object', { limit: 100, cursor: page.value.cursor })).toMatchObject({
      ok: false,
    })
    await replace(original + '\n# second external rename\n')
    await expect.poll(() => events.at(-1)!.revision, { timeout: 10000 }).not.toBe(firstRevision)

    await replace('broken: [')
    await expect.poll(() => events.at(-1)!.state, { timeout: 10000 }).toBe('DEGRADED')
    expect(a.inspect().diagnostics.some((issue) => issue.code === 'INVALID_INPUT')).toBe(true)
    await replace(original)
    await expect.poll(() => events.at(-1)!.state, { timeout: 10000 }).toBe('READY')
    expect(a.inspect().diagnostics.some((issue) => issue.code === 'INVALID_INPUT')).toBe(false)

    const rootPath = join(fixture.dataRoot, 'root.yaml')
    const rootText = await readFile(rootPath, 'utf8')
    await writeFile(join(fixture.dataRoot, 'extra.yaml'), 'extra:\n  value: one\n')
    // This fixture root contains a block imports list.
    await writeFile(rootPath, rootText.replace('imports:', 'imports:\n  - extra.yaml'))
    await expect.poll(() => a.inspect().accounting.files.length, { timeout: 10000 }).toBe(23)
    const revision = events.at(-1)!.revision
    await writeFile(join(fixture.dataRoot, 'extra.yaml'), 'extra:\n  value: two\n')
    await expect.poll(() => events.at(-1)!.revision, { timeout: 10000 }).not.toBe(revision)
    expect(
      a
        .inspect()
        .accounting.sections.some(
          (section) => section.key === 'extra' && JSON.stringify(section.value).includes('two'),
        ),
    ).toBe(true)

    await a.close()
    const closedCount = events.length
    const oldFingerprint = b.model.fingerprint
    const doc = join(fixture.metadataRoot, b.inspect().metadata.documents[0].entry)
    await writeFile(doc, (await readFile(doc, 'utf8')) + '\nShared folder watcher assertion.\n')
    await expect.poll(() => b.model.fingerprint, { timeout: 10000 }).not.toBe(oldFingerprint)
    expect(otherEvents.at(-1)!.type).toBe('metamodel.changed')
    expect(events).toHaveLength(closedCount)
    expect(await a.snapshot()).toMatchObject({ ok: false, error: { code: 'SESSION_CLOSED' } })
    expect(otherEvents.map((event) => event.sequence)).toEqual(
      otherEvents.map((_, index) => index + 1),
    )
  } finally {
    for (const session of sessions) await session.close()
    await rm(fixture.destination, { recursive: true, force: true })
  }
}, 60000)
