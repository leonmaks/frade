import { handleRequest, RepositoryBackend } from '@frade/runtime-node'
import { record, validId } from '@frade/runtime-contracts'
import type { BackendCommand } from '@frade/repository-api/workbench'
import { decodeWorkbenchResult } from '@frade/repository-api/workbench'
const parent = process.parentPort
if (!parent) throw new Error('Utility parent port is required')
const repositories = new RepositoryBackend((value) =>
  parent.postMessage({ type: 'workbench-event', value }),
)
parent.on('message', ({ data }: { data: unknown }) => {
  if (record(data) && data.type === 'shutdown' && Object.keys(data).length === 1) {
    void repositories.closeAll().finally(() => process.exit(0))
    return
  }
  if (
    record(data) &&
    data.type === 'cancel' &&
    validId(data.requestId) &&
    Object.keys(data).length === 2
  )
    return
  if (record(data) && data.type === 'workbench-cancel' && validId(data.id)) {
    repositories.cancel(data.id)
    return
  }
  if (record(data) && data.type === 'workbench-request' && validId(data.id)) {
    void repositories.handle(data.command as BackendCommand, data.id).then((result) =>
      parent.postMessage({
        type: 'workbench-response',
        id: data.id,
        result: decodeWorkbenchResult(result),
      }),
    )
    return
  }
  // Health work is synchronous; no pending job survives a cancellation.
  const response = handleRequest(data)
  if (response) parent.postMessage(response)
})
parent.postMessage({ type: 'ready', protocolVersion: 1 })
