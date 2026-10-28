// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createPresentationApi } from '../../src/preload/presentation-bridge'
import { bootstrapPresentation } from '../../src/renderer/presentation-bootstrap'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
import { parsePresentationRequest } from '@frade/runtime-contracts'
import type { PresentationBoot, PresentationPhase } from '@frade/runtime-contracts'
const selection = {
  mode: 'light' as const,
  density: 'compact' as const,
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
}
const boot = (): PresentationBoot => ({
  version: 1,
  sessionId: 'window',
  bootRevision: 0,
  snapshot: resolveTheme({ registry: createThemeRegistry(), selection, revision: 0 }),
  durable: { version: 1, revision: 0, generation: 0, transactionId: 'boot', selection },
  diagnostics: [],
})
const context: PresentationPhase = {
  version: 1,
  sessionId: 'window',
  requestId: 'window/1',
  transactionId: 'window/1',
  generation: 1,
  revision: 1,
  membership: 1,
  phase: 'prepare',
}
const cleanups: Array<() => void> = []
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
it('preload stages only validated owned bounded input and returns strict temporary acknowledgement', async () => {
  const invoke = vi.fn(async (_value: unknown) => ({ status: 'STAGED' })),
    api = createPresentationApi(boot(), invoke, () => 'window/ready')
  expect(await api.stage!(context, selection, 0)).toEqual({ status: 'STAGED' })
  expect(invoke).toHaveBeenCalledWith({
    version: 1,
    sessionId: 'window',
    requestId: 'window/1',
    operation: 'stage',
    payload: { context, selection, expectedRevision: 0 },
  })
  invoke.mockClear()
  for (const phase of ['apply', 'rollback', 'join'] as const)
    await expect(api.stage!({ ...context, phase }, selection, 0)).rejects.toThrow()
  await expect(api.stage!({ ...context, sessionId: 'foreign' }, selection, 0)).rejects.toThrow()
  await expect(api.stage!(context, { ...selection, density: 'huge' } as never, 0)).rejects.toThrow()
  expect(invoke).not.toHaveBeenCalled()
  for (const invalid of [
    { status: 'ACK' },
    { status: 'STAGED', path: 'outside' },
    { status: 'UNKNOWN', message: 'x'.repeat(40000) },
  ]) {
    invoke.mockResolvedValueOnce(invalid as never)
    await expect(api.stage!(context, selection, 0)).rejects.toThrow()
  }
})
it('bootstrap forwards stage capability only for capable hosts and preserves legacy commit', async () => {
  for (const staging of [true, false]) {
    let generation = 0
    const operations: string[] = []
    const api = createPresentationApi(
      boot(),
      async (input: unknown) => {
        const request = parsePresentationRequest(input)
        operations.push(request.operation)
        if (request.operation === 'intent') return { generation: ++generation }
        if (request.operation === 'stage') return { status: 'STAGED' }
        if (request.operation === 'ready') return { version: 1, ready: true }
        if (request.operation === 'persist')
          return {
            status: 'ACK',
            durable: {
              version: 1,
              revision: 1,
              generation,
              transactionId: request.requestId,
              selection: request.payload.selection,
            },
          }
        throw Error('Unexpected reconciliation')
      },
      () => 'window/ready',
    )
    const legacy = { getBoot: api.getBoot, announceIntent: api.announceIntent, persist: api.persist, reconcile: api.reconcile, ready: api.ready }
    const root = document.createElement('div'),
      owner = document.createElement('div'),
      overlay = document.createElement('div')
    owner.className = 'ka-workbench'
    owner.append(overlay)
    root.append(owner)
    document.body.append(root)
    const media = (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList
    const value = bootstrapPresentation(staging ? api : legacy, root, {
      paint: async () => {},
      media,
    })
    value.controller.mountHost(overlay)
    cleanups.push(() => value.dispose())
    await value.ready()
    expect((await value.controller.commit({ ...selection, mode: 'dark' })).status).toBe('COMMITTED')
    expect(operations).toEqual(
      staging ? ['ready', 'intent', 'stage', 'persist'] : ['ready', 'intent', 'persist'],
    )
    expect(root.dataset.fradeTheme).toBe('dark')
    value.dispose()
  }
})
