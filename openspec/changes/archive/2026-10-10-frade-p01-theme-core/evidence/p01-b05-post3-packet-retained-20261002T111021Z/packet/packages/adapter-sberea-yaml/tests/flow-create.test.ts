import { it, expect } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openRepository } from '@frade/repository-application'
import { fixture, unwrap, schema } from './fixtures/synthetic'
it('creates canonical flows through core and preserves source bytes, identity/revisions and permissions', async () => {
  const f = await fixture('# keep\nsystems:\n  a: {title: A}\n  b: {title: B}\nflows: {}\n')
  let core: any
  try {
    const metadata = structuredClone(schema) as any
    metadata.entities.flows = {
      title: 'Flows',
      integrationFlow: {
        source: 'producer',
        consumer: 'receiver',
        search: ['title'],
        columns: [],
        nonCloneable: [],
      },
      schema: {
        patternProperties: {
          '^F[0-9]+$': {
            type: 'object',
            required: ['title', 'producer', 'receiver'],
            properties: {
              title: { type: 'string' },
              producer: { $ref: '#/$rels/systems.systems' },
              receiver: { $ref: '#/$rels/systems.systems' },
            },
          },
        },
      },
    }
    await writeFile(join(f.metadataRoot, 'schema.yaml'), JSON.stringify(metadata))
    core = unwrap(
      await openRepository(
        f.adapter(),
        { callerId: 'test', repositoryIds: ['test'], permissions: ['read', 'write'] },
        { authorize: () => true },
      ),
    )
    const flow = {
      ref: { repositoryId: 'test', objectId: 'F1' },
      typeId: 'sberea:flows',
      name: 'Payload',
      attributes: {
        title: 'Payload',
        producer: { repositoryId: 'test', objectId: 'a' },
        receiver: { repositoryId: 'test', objectId: 'b' },
      },
    }
    const command = {
      repositoryId: 'test',
      idempotencyKey: 'create-F1',
      commands: [{ op: 'createObject', object: flow }],
    }
    const result = await core.applyChanges(command)
    expect(result).toMatchObject({ ok: true })
    expect(await core.applyChanges(command)).toEqual(result)
    const disk = await readFile(join(f.dataRoot, 'objects.yaml'), 'utf8')
    expect(disk).toContain('# keep\nsystems:\n  a: {title: A}\n  b: {title: B}')
    expect(disk).not.toContain('repositoryId')
    expect(await core.getObject(flow.ref)).toMatchObject({
      ok: true,
      value: { ref: flow.ref, attributes: flow.attributes },
    })
    expect(await core.applyChanges({ ...command, idempotencyKey: 'duplicate' })).toMatchObject({
      ok: false,
    })
    expect(
      await core.applyChanges({
        repositoryId: 'test',
        idempotencyKey: 'invalid-user-id',
        commands: [
          { op: 'createObject', object: { ...flow, ref: { ...flow.ref, objectId: 'invalid' } } },
        ],
      }),
    ).toMatchObject({ ok: false })
    await core.close()
    core = unwrap(
      await openRepository(
        f.adapter({ readOnly: true }),
        { callerId: 'test', repositoryIds: ['test'], permissions: ['read', 'write'] },
        { authorize: () => true },
      ),
    )
    expect(await core.applyChanges({ ...command, idempotencyKey: 'readonly' })).toMatchObject({
      ok: false,
      error: { code: 'REPOSITORY_READ_ONLY' },
    })
  } finally {
    await core?.close()
    await f.cleanup()
  }
})

it('opens deterministic flow fixture', async () => {
  const { createFlowFixture } = await import('../../../scripts/flow-fixtures.mjs')
  const { createSbereaYamlAdapter, defaultMetadataSet } = await import('../src')
  const f = await createFlowFixture()
  const result = await createSbereaYamlAdapter({
    dataRoot: f.dataRoot,
    repositoryId: 'r',
    metadataSet: defaultMetadataSet(f.metadataRoot),
  }).open()
  if (!result.ok) throw Error(JSON.stringify(result.error))
  await result.value.close()
})
