import { PagedNativeAdapter } from '../../src/index'
import { openRepository } from '@frade/repository-application'
const opened = await openRepository(
  new PagedNativeAdapter(process.env.FRADE_CRASH_ROOT!, {
    writeBarrier: async (phase) => {
      if (phase === process.env.FRADE_CRASH_PHASE) {
        setInterval(() => {}, 1000)
        process.send?.({ phase })
        await new Promise(() => {})
      }
    },
  }),
  { callerId: 'test', repositoryIds: ['R'], permissions: ['read', 'write'] },
  { authorize: () => true },
)
if (!opened.ok) throw Error(opened.error.code)
const result = await opened.value.applyChanges({
  repositoryId: 'R',
  commands: [
    {
      op: 'createObject',
      object: {
        ref: { repositoryId: 'R', objectId: 'crash' },
        typeId: 'sample:ApplicationSystem',
        name: 'Crash',
        attributes: { status: 'created' },
      },
    },
  ],
})
if (!result.ok) throw Error(result.error.code)
await opened.value.close()
