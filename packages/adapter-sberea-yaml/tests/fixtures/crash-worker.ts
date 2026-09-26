import { openRepository } from '@frade/repository-application'
import { createSbereaYamlAdapter, defaultMetadataSet } from '../../src'

const opened = await openRepository(
  createSbereaYamlAdapter({
    dataRoot: process.env.FRADE_CRASH_ROOT!,
    repositoryId: 'crash-test',
    metadataSet: defaultMetadataSet(process.env.FRADE_CRASH_METADATA!),
    writeBarrier: async (phase) => {
      if (phase !== process.env.FRADE_CRASH_PHASE) return
      process.send?.({ phase })
      await new Promise(() => {})
    },
  }),
  { callerId: 'test', repositoryIds: ['crash-test'], permissions: ['read', 'write'] },
  { authorize: () => true },
)
if (!opened.ok) throw Error(JSON.stringify(opened.error))
const page = await opened.value.queryObjects({ limit: 100 })
if (!page.ok) throw Error(page.error.code)
const ref = page.value.items.find((item) => item.typeId === 'sberea:kadzo.v2023.systems')!.ref!
const read = await opened.value.getObject(ref)
if (!read.ok) throw Error(read.error.code)
const object = read.value
const result = await opened.value.applyChanges({
  repositoryId: 'crash-test',
  idempotencyKey: 'interrupted-save',
  commands: [
    {
      op: 'updateObject',
      expectedRevision: object.revision,
      object: {
        ref: object.ref,
        typeId: object.typeId,
        name: object.name,
        attributes: { ...object.attributes, description: 'Crash recovery assertion' },
      },
    },
  ],
})
if (!result.ok) throw Error(JSON.stringify(result.error))
await opened.value.close()
