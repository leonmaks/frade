// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest'
import { bootstrapPresentation } from '../../src/renderer/presentation-bootstrap'
import { createPresentationApi } from '../../src/preload/presentation-bridge'
import { createDesktopApi } from '../../src/preload/bridge'
import { parsePresentationResponse, parsePresentationRequest } from '@frade/runtime-contracts'
import type {
  PresentationBoot,
  PresentationPhase,
  PresentationRecord,
} from '@frade/runtime-contracts'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
const selection = {
  mode: 'light' as const,
  density: 'compact' as const,
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
}
const durable: PresentationRecord = {
  version: 1,
  revision: 2,
  generation: 4,
  transactionId: 'window/old',
  selection,
}
const boot = (): PresentationBoot => ({
  version: 1,
  sessionId: 'window',
  bootRevision: 2,
  snapshot: resolveTheme({ registry: createThemeRegistry(), selection, revision: 2 }),
  durable: structuredClone(durable),
  diagnostics: [],
})
const phase = (stage: PresentationPhase['phase'] = 'apply'): PresentationPhase => ({
  version: 1,
  requestId: 'window/new',
  transactionId: 'window/new',
  sessionId: 'window',
  generation: 5,
  revision: 3,
  membership: 2,
  phase: stage,
})
it('validated cached boot is synchronous, immutable, owned and never calls transport', () => {
  const input = boot(),
    invoke = vi.fn(async () => ({})),
    api = createPresentationApi(input, invoke, () => 'window/ready')
  const mutableDiagnostics = input.diagnostics as string[]
  mutableDiagnostics.push('external mutation')
  expect(api.getBoot().diagnostics).toEqual([])
  expect(Object.isFrozen(api.getBoot().snapshot.colors)).toBe(true)
  expect(invoke).not.toHaveBeenCalled()
  expect(Object.keys(api)).toEqual(['getBoot', 'announceIntent', 'persist', 'reconcile', 'ready'])
  const health = createDesktopApi(
    async () => ({}),
    () => () => {},
    () => 'health',
  )
  expect(Object.keys(health)).toEqual(['runtime', 'events'])
  expect(Object.keys(health.runtime)).toEqual(['getHealth'])
})
it('rejects invalid boot before exposing any capability or reading accessors', () => {
  const invoke = vi.fn(async () => ({})),
    getter = vi.fn(() => 1),
    input = boot()
  Object.defineProperty(input, 'version', { get: getter })
  expect(() => createPresentationApi(input, invoke, () => 'window/ready')).toThrow()
  expect(getter).not.toHaveBeenCalled()
  expect(invoke).not.toHaveBeenCalled()
})
it('intent announces a validated request and rejects stale or malformed generation replies', async () => {
  const invoke = vi.fn(async () => ({ generation: 5 })),
    api = createPresentationApi(boot(), invoke, () => 'window/ready')
  expect(await api.announceIntent('window/new')).toEqual({ generation: 5 })
  expect(invoke.mock.calls[0]).toEqual([
    { version: 1, sessionId: 'window', requestId: 'window/new', operation: 'intent', payload: {} },
  ])
  await expect(api.announceIntent('window/newer')).rejects.toThrow()
  const invalid = createPresentationApi(
    boot(),
    async () => ({ generation: 6, path: 'x' }),
    () => 'window/ready',
  )
  await expect(invalid.announceIntent('window/new')).rejects.toThrow()
})
it('input phase, session, choice and bounds are checked before any IPC call', async () => {
  const invoke = vi.fn(async () => ({})),
    api = createPresentationApi(boot(), invoke, () => 'window/ready')
  await expect(api.persist({ ...phase(), sessionId: 'foreign' }, selection, 2)).rejects.toThrow()
  await expect(api.persist(phase('prepare'), selection, 2)).rejects.toThrow()
  await expect(
    api.persist(phase(), { ...selection, density: 'huge' } as never, 2),
  ).rejects.toThrow()
  await expect(api.announceIntent('x'.repeat(40000))).rejects.toThrow()
  expect(invoke).not.toHaveBeenCalled()
})
it('persist ACK requires durable selection, owner and increasing CAS revision', async () => {
  const current = { ...durable, revision: 3, generation: 5, transactionId: 'window/new' },
    invoke = vi.fn(async () => ({ status: 'ACK', durable: current })),
    api = createPresentationApi(boot(), invoke, () => 'window/ready')
  const result = await api.persist(phase(), selection, 2)
  expect(result).toEqual({ status: 'ACK', durable: current })
  expect(Object.isFrozen(result)).toBe(true)
  const bad = [
    { ...current, generation: 4 },
    { ...current, transactionId: 'other' },
    { ...current, revision: 2 },
    { ...current, selection: { ...selection, mode: 'dark' } },
    { ...current, path: 'leak' },
  ]
  for (const record of bad) {
    const refused = createPresentationApi(
      boot(),
      async () => ({ status: 'ACK', durable: record }),
      () => 'window/ready',
    )
    await expect(refused.persist(phase(), selection, 2)).rejects.toThrow()
  }
})
it('explicit REFUSED and UNKNOWN preserve bounded truthful error text without exposing extra fields', async () => {
  for (const status of ['REFUSED', 'UNKNOWN'] as const) {
    const api = createPresentationApi(
      boot(),
      async () => ({ status, message: 'Readback unavailable' }),
      () => 'window/ready',
    )
    expect(await api.persist(phase(), selection, 2)).toEqual({
      status,
      message: 'Readback unavailable',
    })
  }
  const invalid = createPresentationApi(
    boot(),
    async () => ({ status: 'UNKNOWN', message: 'x'.repeat(40000) }),
    () => 'window/ready',
  )
  await expect(invalid.persist(phase(), selection, 2)).rejects.toThrow()
})
it('reconcile permits exact last publication or owned compensation; forged change cannot become authoritative', async () => {
  const rollback = phase('rollback'),
    record = { ...durable, revision: 4, generation: 5, transactionId: 'window/new' }
  for (const value of [durable, record]) {
    const api = createPresentationApi(
      boot(),
      async () => value,
      () => 'window/ready',
    )
    expect(await api.reconcile(rollback, durable)).toEqual(value)
  }
  for (const value of [
    { ...record, selection: { ...selection, mode: 'dark' } },
    { ...record, generation: 6 },
    { ...durable, transactionId: 'foreign' },
  ]) {
    const api = createPresentationApi(
      boot(),
      async () => value,
      () => 'window/ready',
    )
    await expect(api.reconcile(rollback, durable)).rejects.toThrow()
  }
})
it('ready accepts only matched boot/root revisions and a narrow host acknowledgement', async () => {
  const invoke = vi.fn(async () => ({ version: 1, ready: true })),
    api = createPresentationApi(boot(), invoke, () => 'window/ready')
  await api.ready(2, 2)
  expect(invoke.mock.calls[0]).toEqual([
    {
      version: 1,
      sessionId: 'window',
      requestId: 'window/ready',
      operation: 'ready',
      payload: { bootRevision: 2, rootRevision: 2 },
    },
  ])
  await expect(api.ready(1, 1)).rejects.toThrow()
  expect(invoke).toHaveBeenCalledTimes(1)
  const invalid = createPresentationApi(
    boot(),
    async () => ({ version: 1, ready: false }),
    () => 'window/ready',
  )
  await expect(invalid.ready(2, 2)).rejects.toThrow()
})
it('response parser bounds and owns data before exposing it to preload or renderer', () => {
  const request = parsePresentationRequest({
      version: 1,
      sessionId: 'window',
      requestId: 'window/new',
      operation: 'persist',
      payload: { context: phase(), selection, expectedRevision: 2 },
    }),
    input = {
      status: 'ACK',
      durable: { ...durable, revision: 3, generation: 5, transactionId: 'window/new' },
    }
  const result = parsePresentationResponse(input, request)
  expect(result).toEqual(input)
  expect(result).not.toBe(input)
  expect(Object.isFrozen(result)).toBe(true)
  const getter = vi.fn(() => 'ACK')
  Object.defineProperty(input, 'status', { get: getter })
  expect(() => parsePresentationResponse(input, request)).toThrow()
  expect(getter).not.toHaveBeenCalled()
})

const boots: (() => void)[] = []
afterEach(() => {
  for (const off of boots.splice(0)) off()
})
function bootFixture(paint: () => Promise<void> = async () => {}) {
  const root = document.createElement('div'),
    owner = document.createElement('div'),
    overlayHost = document.createElement('div')
  owner.className = 'ka-workbench'
  overlayHost.id = 'frade-overlay-host'
  owner.append(overlayHost)
  root.append(owner)
  document.body.append(root)
  let generation = durable.generation
  const invoke = vi.fn(async (input: unknown) => {
    const request = parsePresentationRequest(input)
    if (request.operation === 'ready') return { version: 1, ready: true }
    if (request.operation === 'intent') return { generation: ++generation }
    throw Error('No persistence during bootstrap/environment refresh')
  })
  const api = createPresentationApi(boot(), invoke, () => 'window/ready')
  const queries = new Map<string, MediaQueryList>()
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  const media = (query: string) => {
    const handlers = new Set<EventListenerOrEventListenerObject>()
    listeners.set(query, handlers)
    const result = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        handlers.add(callback)
      },
      removeEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        handlers.delete(callback)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }
    queries.set(query, result)
    return result
  }
  const value = bootstrapPresentation(api, root, { paint, media })
  const overlays = value.controller.mountHost(overlayHost)
  boots.push(() => {
    value.dispose()
    root.remove()
  })
  const change = (query: string, matches: boolean) => {
    Object.defineProperty(queries.get(query)!, 'matches', { value: matches, configurable: true })
    for (const listener of listeners.get(query)!) {
      if (typeof listener === 'function') listener(new Event('change'))
      else listener.handleEvent(new Event('change'))
    }
  }
  return { root, api, invoke, value, overlays, listeners, change }
}
it('prepaint bootstrap synchronously projects validated cached selection without invoking transport', async () => {
  const f = bootFixture()
  expect(f.root.dataset.fradeTheme).toBe('light')
  expect(f.root.dataset.fradeDensity).toBe('compact')
  expect(f.root.dataset.fradeRevision).toBe('2')
  expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe(
    boot().snapshot.colors['surface.base'],
  )
  expect(f.invoke).not.toHaveBeenCalled()
  await f.value.ready()
  expect(f.invoke).toHaveBeenCalledTimes(1)
  expect(parsePresentationRequest(f.invoke.mock.calls[0][0])).toMatchObject({
    operation: 'ready',
    payload: { bootRevision: 2, rootRevision: 2 },
  })
})
it('boot readiness waits for registered root paint before asking Main to show, and handshake refusal stays failed', async () => {
  let painted!: () => void
  const paint = new Promise<void>((resolve) => {
    painted = resolve
  })
  const f = bootFixture(async () => paint),
    ready = f.value.ready()
  await Promise.resolve()
  expect(f.invoke).not.toHaveBeenCalled()
  painted()
  await ready
  expect(f.value.controller.state().bootReady).toBe(true)
  const failed = bootFixture()
  failed.invoke.mockRejectedValue(Error('Main handshake refused'))
  await expect(failed.value.ready()).rejects.toThrow('Main handshake refused')
})
it('invalid cached boot is rejected before any root mutation or transport call', () => {
  const root = document.createElement('div')
  root.setAttribute('data-existing', 'retained')
  const api = createPresentationApi(
      boot(),
      async () => ({}),
      () => 'window/ready',
    ),
    bad = { ...api, getBoot: () => ({ ...boot(), bootRevision: 3 }) }
  const original = root.outerHTML
  expect(() => bootstrapPresentation(bad, root)).toThrow('INVALID_PRESENTATION')
  expect(root.outerHTML).toBe(original)
})
it('media refresh applies current forced colors without a durable write and every listener is disposed', async () => {
  const f = bootFixture()
  await f.value.ready()
  f.change('(forced-colors: active)', true)
  await vi.waitFor(() =>
    expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas'),
  )
  expect(f.value.controller.state().durableSelection.mode).toBe('light')
  expect(
    f.invoke.mock.calls.every(([input]) => parsePresentationRequest(input).operation !== 'persist'),
  ).toBe(true)
  f.value.dispose()
  for (const callbacks of f.listeners.values()) expect(callbacks.size).toBe(0)
})
