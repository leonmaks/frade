import {
  parsePresentationBoot,
  parsePresentationRequest,
  parsePresentationResponse,
} from '@frade/runtime-contracts'
import type {
  PresentationApi,
  PresentationRequest,
  PresentationOutcome,
  PresentationRecord,
} from '@frade/runtime-contracts'
/** A separate capability object. Bootstrap is cached data, never a renderer filesystem call. */
export function createPresentationApi(
  bootInput: unknown,
  invoke: (input: unknown) => Promise<unknown>,
  id: () => string,
): PresentationApi {
  const boot = parsePresentationBoot(bootInput)
  let acceptedGeneration = boot.durable.generation
  const request = async (input: unknown) => {
    const value: PresentationRequest = parsePresentationRequest(input)
    if (value.sessionId !== boot.sessionId) throw Error('UNAUTHORIZED_SESSION')
    return parsePresentationResponse(await invoke(value), value)
  }
  return Object.freeze({
    getBoot: () => parsePresentationBoot(boot),
    announceIntent: async (requestId: string) => {
      const response = (await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId,
        operation: 'intent',
        payload: {},
      })) as { readonly generation: number }
      if (response.generation <= acceptedGeneration) throw Error('STALE_PRESENTATION_INTENT')
      acceptedGeneration = response.generation
      return response
    },
    persist: async (context, selection, expectedRevision) =>
      (await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId: context.requestId,
        operation: 'persist',
        payload: { context, selection, expectedRevision },
      })) as PresentationOutcome,
    reconcile: async (context, lastPublished) =>
      (await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId: context.requestId,
        operation: 'reconcile',
        payload: { context, lastPublished },
      })) as PresentationRecord,
    ready: async (bootRevision: number, rootRevision: number) => {
      if (bootRevision !== boot.bootRevision || rootRevision !== boot.snapshot.revision)
        throw Error('STALE_PRESENTATION_READY')
      await request({
        version: 1,
        sessionId: boot.sessionId,
        requestId: id(),
        operation: 'ready',
        payload: { bootRevision, rootRevision },
      })
    },
  } satisfies PresentationApi)
}
