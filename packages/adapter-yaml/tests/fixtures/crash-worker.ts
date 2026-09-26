import { NativeAdapter } from '../../src/index'
const phase = process.env.FRADE_CRASH_PHASE
const opened = await new NativeAdapter(process.env.FRADE_CRASH_ROOT!, {
  writeBarrier: async (at) => {
    if (at === phase) {
      process.send?.({ phase: at })
      await new Promise(() => {})
    }
  },
}).open()
if (!opened.ok) throw Error(opened.error.code)
const snapshot = await opened.value.snapshot()
if (!snapshot.ok) throw Error(snapshot.error.code)
const entity = {
  ref: { repositoryId: 'R', objectId: 'crash' },
  typeId: 'sample:ApplicationSystem',
  name: 'crash',
  attributes: { status: 'created' },
  revision: 'pending' as any,
}
await opened.value.writer!.commit({
  operationId: 'crash-test',
  expectedRevision: snapshot.value.revision,
  candidate: { ...snapshot.value, objects: [entity] },
  changes: [{ kind: 'object', action: 'created', ref: entity.ref, entity }],
})
await opened.value.close()
