import { contextBridge, ipcRenderer } from 'electron'
import { REQUEST_CHANNEL, EVENT_CHANNEL } from '@frade/runtime-contracts'
import { createDesktopApi } from './bridge'
import {
  REPOSITORY_CHANNEL,
  REPOSITORY_OPEN_CHANNEL,
  decodeRequest,
} from '@frade/repository-api/protocol'
import { copyJson, failure } from '@frade/repository-domain'
const api = createDesktopApi(
  (value) => ipcRenderer.invoke(REQUEST_CHANNEL, value),
  (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) => listener(value)
    ipcRenderer.on(EVENT_CHANNEL, handler)
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNEL, handler)
    }
  },
  () => crypto.randomUUID(),
)
contextBridge.exposeInMainWorld('frade', api)
const safeResponse = (value: unknown) => {
  const copied = copyJson(value)
  return copied.ok ? copied.value : failure('ADAPTER_CONTRACT')
}
contextBridge.exposeInMainWorld('fradeRepository', {
  open: async () => safeResponse(await ipcRenderer.invoke(REPOSITORY_OPEN_CHANNEL)),
  request: async (value: unknown) => {
    const decoded = decodeRequest(value)
    return decoded.ok
      ? safeResponse(await ipcRenderer.invoke(REPOSITORY_CHANNEL, decoded.value))
      : decoded
  },
})

import {
  WORKBENCH_CHANNEL,
  WORKBENCH_REQUEST_CHANNEL,
  WORKBENCH_EVENT_CHANNEL,
  WORKBENCH_CLOSE_CHANNEL,
  decodeHostCommand,
  decodeScopedRequest,
  decodeWorkbenchResult,
  decodeOperationResult,
  decodeWorkbenchEvent,
} from '@frade/repository-api/workbench'
contextBridge.exposeInMainWorld('fradeWorkbench', {
  command: async (input: unknown) => {
    const decoded = decodeHostCommand(input)
    return decoded.ok
      ? decodeWorkbenchResult(await ipcRenderer.invoke(WORKBENCH_CHANNEL, decoded.value))
      : decoded
  },
  request: async (input: unknown) => {
    const decoded = decodeScopedRequest(input)
    return decoded.ok
      ? decodeOperationResult(
          await ipcRenderer.invoke(WORKBENCH_REQUEST_CHANNEL, decoded.value),
          decoded.value.request,
        )
      : decoded
  },
  subscribe: (listener: (value: unknown) => void) => {
    let active = true
    const handler = (_e: Electron.IpcRendererEvent, input: unknown) => {
      const decoded = decodeWorkbenchEvent(input)
      if (active && decoded.ok) listener(decoded.value)
    }
    ipcRenderer.on(WORKBENCH_EVENT_CHANNEL, handler)
    return () => {
      active = false
      ipcRenderer.off(WORKBENCH_EVENT_CHANNEL, handler)
    }
  },
  onCloseRequested: (listener: () => void) => {
    const handler = () => listener()
    ipcRenderer.on(WORKBENCH_CLOSE_CHANNEL, handler)
    return () => ipcRenderer.off(WORKBENCH_CLOSE_CHANNEL, handler)
  },
})
