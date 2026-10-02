import { describe, it, expect } from 'vitest'
import { defaultMetadataSet, createSbereaYamlAdapter } from '../src'
import { createKaFixture } from '../../../scripts/ka-fixtures.mjs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
describe('KA isolated real-data baseline', () => {
  it('loads every record through Core-shaped pages, metadata and derived graph without changing source bytes', async () => {
    const fixture = await createKaFixture()
    try {
      const opened = await createSbereaYamlAdapter({
        dataRoot: fixture.dataRoot,
        repositoryId: 'ka-test',
        metadataSet: defaultMetadataSet(fixture.metadataRoot),
      }).open()
      if (!opened.ok) throw Error(JSON.stringify(opened.error))
      const session = opened.value,
        snapshot = await session.snapshot()
      expect(snapshot.ok).toBe(true)
      if (!snapshot.ok) return
      expect(snapshot.value.objects).toHaveLength(138)
      expect(new Set(snapshot.value.objects.map((o) => o.typeId)).size).toBe(19)
      expect(
        snapshot.value.objects.filter((o) => o.typeId === 'sberea:kadzo.v2023.integrations'),
      ).toHaveLength(21)
      expect(snapshot.value.relations.length).toBeGreaterThan(100)
      const first = await session.query('object', { limit: 100 })
      expect(first.ok).toBe(true)
      if (!first.ok) return
      expect(first.value.items).toHaveLength(100)
      const second = await session.query('object', { limit: 100, cursor: first.value.cursor })
      expect(second.ok && second.value.items).toHaveLength(38)
      const report = session.inspect()
      expect(report.accounting.files).toHaveLength(22)
      expect(report.metadata.types).toHaveLength(19)
      expect(report.diagnostics.some((d) => d.code === 'UNRESOLVED_REFERENCE')).toBe(true)
      await session.close()
      for (const file of report.accounting.files) {
        const bytes = await readFile(join(fixture.dataRoot, file.entry))
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.digest)
      }
    } finally {
      await rm(fixture.destination, { recursive: true, force: true })
    }
  }, 60000)
})
