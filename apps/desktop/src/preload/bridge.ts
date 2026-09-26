import {
  healthRequest,
  parseBackendMessage,
  parseHealthEvent,
  RuntimeError,
  type DesktopApi,
} from '@frade/runtime-contracts'
export function createDesktopApi(
  invoke: (value: unknown) => Promise<unknown>,
  subscribe: (listener: (value: unknown) => void) => () => void,
  id: () => string,
): DesktopApi {
  return {
    runtime: {
      async getHealth() {
        const request = healthRequest(id())
        const response = parseBackendMessage(await invoke(request))
        if (response.type !== 'response' || response.requestId !== request.requestId)
          throw new RuntimeError('PROTOCOL_ERROR')
        if (!response.ok) throw new RuntimeError(response.error)
        return response.result
      },
    },
    events: {
      subscribe(listener) {
        let active = true,
          last = -1
        const off = subscribe((value) => {
          if (!active) return
          try {
            const event = parseHealthEvent(value)
            if (event.health.sequence <= last) return
            last = event.health.sequence
            listener(event.health)
          } catch {
            /* Never expose unvalidated messages to the renderer. */
          }
        })
        return () => {
          active = false
          off()
        }
      },
    },
  }
}
