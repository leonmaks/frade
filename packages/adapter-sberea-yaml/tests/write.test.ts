import { it, expect } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openRepository } from '@frade/repository-application'
import { createKaFixture } from '../../../scripts/ka-fixtures.mjs'
import { createSbereaYamlAdapter, defaultMetadataSet } from '../src'
it('saves via Core, preserves untouched bytes, rejects new invalid values and reconciles a repeated operation', async () => {
  const fixture = await createKaFixture()
  let close: (() => Promise<unknown>) | undefined
  try {
    const path = join(fixture.dataRoot, 'v2023/application/systems.yaml'),
      original = await readFile(path, 'utf8')
    await writeFile(path, '\uFEFF# preserved heading\r\n' + original.replace(/\r?\n/g, '\r\n'))
    const adapter = createSbereaYamlAdapter({
      dataRoot: fixture.dataRoot,
      repositoryId: 'test',
      metadataSet: defaultMetadataSet(fixture.metadataRoot),
    })
    const raw = await adapter.open()
    if (!raw.ok) throw Error(JSON.stringify(raw.error))
    const metadata = raw.value.inspect(),
      data = await raw.value.snapshot()
    if (!data.ok) throw Error(data.error.code)
    await raw.value.close()
    const opened = await openRepository(
      adapter,
      { callerId: 'test', repositoryIds: ['test'], permissions: ['read', 'write'] },
      { authorize: () => true },
    )
    if (!opened.ok) throw Error(JSON.stringify(opened.error))
    const core = opened.value
    close = () => core.close()
    const system = data.value.objects.find((o) => o.typeId === 'sberea:kadzo.v2023.systems')!
    const before = await readFile(path, 'utf8')
    const body = {
      ref: system.ref,
      typeId: system.typeId,
      name: system.name,
      attributes: { ...system.attributes, description: 'Описание для проверки сохранения' },
    }
    const command = {
      repositoryId: 'test',
      idempotencyKey: 'save-1',
      expectedRevision: data.value.revision,
      commands: [{ op: 'updateObject', object: body, expectedRevision: system.revision }],
    }
    const result = await core.applyChanges(command)
    if (!result.ok) throw Error(JSON.stringify(result.error))
    expect(result.value.changes.some((c) => c.kind === 'object')).toBe(true)
    expect(await core.applyChanges(command)).toEqual(result)
    const after = await readFile(path, 'utf8')
    expect(after).not.toBe(before)
    expect(after.startsWith('\uFEFF# preserved heading\r\n')).toBe(true)
    expect(after.replaceAll('\r\n', '')).not.toContain('\n')
    const updated = await core.getObject(system.ref)
    if (!updated.ok) throw Error(updated.error.code)
    expect(updated.value.attributes.description).toBe(body.attributes.description)
    const invalid = await core.applyChanges({
      repositoryId: 'test',
      commands: [
        {
          op: 'updateObject',
          object: { ...body, attributes: { ...body.attributes, location: 'NEW INVALID VALUE' } },
          expectedRevision: updated.value.revision,
        },
      ],
    })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.error.code).toBe('VALIDATION_FAILED')
    expect(await readFile(path, 'utf8')).toBe(after)
    const noOp = await core.applyChanges({
      repositoryId: 'test',
      commands: [{ op: 'updateObject', object: body, expectedRevision: updated.value.revision }],
    })
    expect(noOp.ok && noOp.value.changes).toEqual([])
    for (const file of metadata.accounting.files.filter(
      (f) => f.entry !== 'v2023/application/systems.yaml',
    )) {
      const source = fixture.manifest.files.find((f) => f.path === 'KA/' + file.entry)!
      const { createHash } = await import('node:crypto')
      expect(
        createHash('sha256')
          .update(await readFile(join(fixture.dataRoot, file.entry)))
          .digest('hex'),
      ).toBe(source.sha256)
    }
  } finally {
    await close?.()
    await rm(fixture.destination, { recursive: true, force: true })
  }
}, 60000)
