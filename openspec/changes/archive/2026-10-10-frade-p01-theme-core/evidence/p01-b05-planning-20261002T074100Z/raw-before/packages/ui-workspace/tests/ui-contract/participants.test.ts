// @vitest-environment jsdom
import { it, expect, vi } from 'vitest'
import {
  createRootParticipant,
  applyRootSnapshot,
  createPresentationBarrier,
} from '../../src/design/theme/rootParticipant'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { themeRoles } from '../../src/design/theme/contrast'
import type { PhaseContext } from '../../src/design/theme/service'
const phase = (revision: number, stage: PhaseContext['phase'] = 'apply'): PhaseContext => ({
  version: 1,
  requestId: 'window-1/intent-1',
  sessionId: 'window-1',
  generation: 1,
  transactionId: 'window-1/intent-1',
  revision,
  membership: 1,
  phase: stage,
})
const snapshot = (
  mode: 'light' | 'dark' | 'high-contrast',
  revision: number,
  forcedColors = false,
) =>
  resolveTheme({
    registry: createThemeRegistry(),
    selection: { mode, density: 'comfortable', preferred: { ...BUILTIN_IDS } },
    environment: { forcedColors },
    revision,
  })
const gate = () => {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
it('boot root projection installs only the complete role data and theme/density/revision metadata', () => {
  const root = document.createElement('div'),
    value = snapshot('light', 3)
  root.setAttribute('data-owned-by-workspace', 'kept')
  root.style.setProperty('--other-contract', 'retained')
  applyRootSnapshot(root, value)
  for (const role of themeRoles)
    expect(root.style.getPropertyValue('--frade-' + role.replaceAll('.', '-'))).toBe(
      value.effectiveColors[role],
    )
  expect(root.dataset.fradeRuntime).toBe('1')
  expect(root.dataset.fradeTheme).toBe('light')
  expect(root.dataset.fradeDensity).toBe('comfortable')
  expect(root.dataset.fradeRevision).toBe('3')
  expect(root.style.colorScheme).toBe('light')
  expect(root.getAttribute('data-owned-by-workspace')).toBe('kept')
  expect(root.style.getPropertyValue('--other-contract')).toBe('retained')
})
it('prepare is side-effect-free; apply waits for subsequent paint and rollback restores the committed snapshot', async () => {
  const root = document.createElement('div'),
    before = snapshot('light', 0),
    after = snapshot('dark', 1),
    wait = gate(),
    paint = vi.fn(async () => wait.promise)
  applyRootSnapshot(root, before)
  const participant = createRootParticipant(root, { id: 'root', generation: 4, paint }),
    original = root.outerHTML
  const handle = await participant.prepare(after, phase(1, 'prepare'), new AbortController().signal)
  expect(root.outerHTML).toBe(original)
  let acknowledged = false
  const applying = handle.apply(phase(1), new AbortController().signal).then((ack) => {
    acknowledged = true
    return ack
  })
  await Promise.resolve()
  expect(root.dataset.fradeTheme).toBe('dark')
  expect(acknowledged).toBe(false)
  wait.resolve()
  expect(await applying).toEqual({
    ...phase(1),
    participantId: 'root',
    participantGeneration: 4,
    painted: true,
  })
  expect(paint).toHaveBeenCalledTimes(1)
  const ack = await handle.rollback(before, phase(0, 'rollback'), new AbortController().signal)
  expect(ack.phase).toBe('rollback')
  expect(root.outerHTML).toBe(original)
  handle.dispose()
})
it('invalidated/disposed handles cannot mutate or acknowledge a later root revision', async () => {
  const root = document.createElement('div'),
    before = snapshot('light', 0)
  applyRootSnapshot(root, before)
  const participant = createRootParticipant(root, { paint: async () => {} }),
    signal = new AbortController(),
    handle = await participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), signal.signal),
    original = root.outerHTML
  signal.abort()
  await expect(handle.apply(phase(1), new AbortController().signal)).rejects.toThrow()
  expect(root.outerHTML).toBe(original)
  handle.dispose()
  await expect(handle.apply(phase(1), new AbortController().signal)).rejects.toThrow()
  expect(root.outerHTML).toBe(original)
})
it('joining root is hidden until its accepted paint and restores preexisting visibility ownership', () => {
  const root = document.createElement('div')
  root.style.visibility = 'visible'
  const participant = createRootParticipant(root, { paint: async () => {} })
  participant.hide()
  expect(root.style.visibility).toBe('hidden')
  participant.reveal()
  expect(root.style.visibility).toBe('visible')
})
it('forced root projection installs final system keywords without persisting them into palette input', () => {
  const root = document.createElement('div'),
    value = snapshot('light', 1, true),
    before = JSON.stringify(value.colors)
  applyRootSnapshot(root, value)
  expect(root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
  expect(root.style.getPropertyValue('--frade-focus-ring')).toBe('Highlight')
  expect(JSON.stringify(value.colors)).toBe(before)
})
it('neutral curtain owns full client-area node, stays until reveal and exposes accessible recovery without discarding editor DOM', async () => {
  const host = document.createElement('div'),
    editor = document.createElement('textarea')
  editor.value = 'unsaved draft'
  host.append(editor)
  document.body.append(host)
  const wait = gate(),
    barrier = createPresentationBarrier(host, async () => wait.promise)
  let painted = false
  const waiting = barrier.paint(phase(1)).then(() => {
    painted = true
  })
  await Promise.resolve()
  const curtain = host.querySelector<HTMLElement>('.frade-theme-commit-barrier')!
  expect(curtain).toBeTruthy()
  expect(curtain.hidden).toBe(false)
  expect(curtain.getAttribute('role')).toBe('status')
  expect(curtain.getAttribute('aria-live')).toBe('polite')
  expect(painted).toBe(false)
  wait.resolve()
  await waiting
  expect(painted).toBe(true)
  barrier.recovery('Frame unavailable')
  expect(curtain.hidden).toBe(false)
  expect(curtain.textContent).toContain('Frame unavailable')
  expect(curtain.querySelector('button')?.textContent).toContain('Повторить')
  expect(host.contains(editor)).toBe(true)
  expect(editor.value).toBe('unsaved draft')
  barrier.reveal(phase(1))
  expect(curtain.hidden).toBe(true)
  host.remove()
})

import { createNativeParticipant } from '../../src/design/theme/nativeParticipant'
import type { NativePresentationGraph } from '../../src/design/theme/nativeParticipant'
function nativeFixture(image = false) {
  const root = document.createElement('div'),
    model = Object.freeze({
      nodes: [Object.freeze({ id: 'authored', fill: 'authored-paint' })],
      undo: ['user-edit'],
      selection: ['authored'],
      draft: 'dirty',
    }),
    identity = { graph: 'same' },
    options = {
      background: {
        color: 'original-canvas',
        ...(image ? { image: 'retained-image', opacity: 0.7, position: { x: 12, y: 30 } } : {}),
      },
      grid: {
        size: 10,
        visible: true,
        type: 'dot',
        args: { color: 'original-grid', thickness: 2 },
      },
    }
  const forbidden = vi.fn(() => {
    throw Error('Forbidden model API')
  })
  const instance = {
    container: root,
    options,
    identity,
    model,
    drawBackground: vi.fn((value: typeof options.background) => {
      options.background = value
      root.style.backgroundColor = value.color
      return instance
    }),
    drawGrid: vi.fn((value: Partial<typeof options.grid>) => {
      Object.assign(options.grid, value)
      return instance
    }),
    loadDocument: forbidden,
    fromJSON: forbidden,
    setCellStyles: forbidden,
    refresh: forbidden,
    modelBeginUpdate: forbidden,
  }
  return {
    instance,
    graph: instance as unknown as NativePresentationGraph,
    root,
    options,
    model,
    forbidden,
  }
}
it('native prepare does not write view or document; painted apply and rollback change only UI canvas/grid', async () => {
  const f = nativeFixture(),
    wait = gate(),
    before = JSON.stringify(f.model),
    identity = f.instance.identity,
    participant = createNativeParticipant(f.graph, { generation: 3, paint: () => wait.promise }),
    candidate = snapshot('dark', 1)
  const handle = await participant.prepare(
    candidate,
    phase(1, 'prepare'),
    new AbortController().signal,
  )
  expect(f.instance.drawGrid).not.toHaveBeenCalled()
  expect(f.instance.drawBackground).not.toHaveBeenCalled()
  let acknowledged = false
  const applying = handle.apply(phase(1), new AbortController().signal).then((ack) => {
    acknowledged = true
    return ack
  })
  await Promise.resolve()
  expect(acknowledged).toBe(false)
  expect(f.options.background.color).toBe(candidate.colors['diagram.canvas'])
  expect(f.options.grid.args.color).toBe(candidate.colors['diagram.grid'])
  expect(JSON.stringify(f.model)).toBe(before)
  expect(f.instance.identity).toBe(identity)
  expect(f.forbidden).not.toHaveBeenCalled()
  wait.resolve()
  expect(await applying).toEqual({
    ...phase(1),
    participantId: 'native',
    participantGeneration: 3,
    painted: true,
  })
  const previous = snapshot('light', 0)
  await handle.rollback(previous, phase(0, 'rollback'), new AbortController().signal)
  expect(f.options.background.color).toBe(previous.colors['diagram.canvas'])
  expect(f.options.grid.args.color).toBe(previous.colors['diagram.grid'])
  expect(f.options.grid.size).toBe(10)
  expect(f.options.grid.args.thickness).toBe(2)
  expect(JSON.stringify(f.model)).toBe(before)
  expect(f.forbidden).not.toHaveBeenCalled()
  participant.dispose()
})
it('native projection retains authored image/options and keeps user grid visibility/size through palette rollback', async () => {
  const f = nativeFixture(true),
    originalImage = f.options.background.image,
    position = f.options.background.position,
    participant = createNativeParticipant(f.graph, { paint: async () => {} }),
    handle = await participant.prepare(
      snapshot('dark', 1),
      phase(1, 'prepare'),
      new AbortController().signal,
    )
  await handle.apply(phase(1), new AbortController().signal)
  expect(f.instance.drawBackground).not.toHaveBeenCalled()
  expect(f.options.background.image).toBe(originalImage)
  expect(f.options.background.position).toBe(position)
  f.options.grid.visible = false
  f.options.grid.size = 20
  await handle.rollback(snapshot('light', 0), phase(0, 'rollback'), new AbortController().signal)
  expect(f.options.grid.visible).toBe(false)
  expect(f.options.grid.size).toBe(20)
  expect(f.options.background.image).toBe(originalImage)
  expect(f.forbidden).not.toHaveBeenCalled()
  participant.dispose()
})
it('native disposal restores owned view settings and visibility without changing semantic model or removing another owner state', async () => {
  const f = nativeFixture(),
    before = JSON.stringify(f.model),
    participant = createNativeParticipant(f.graph, { paint: async () => {} }),
    handle = await participant.prepare(
      snapshot('dark', 1),
      phase(1, 'prepare'),
      new AbortController().signal,
    )
  participant.hide()
  expect(f.root.style.visibility).toBe('hidden')
  participant.reveal()
  expect(f.root.style.visibility).toBe('')
  await handle.apply(phase(1), new AbortController().signal)
  f.options.grid.visible = false
  participant.dispose()
  expect(f.options.background.color).toBe('original-canvas')
  expect(f.options.grid.args.color).toBe('original-grid')
  expect(f.options.grid.visible).toBe(false)
  expect(JSON.stringify(f.model)).toBe(before)
  await expect(handle.apply(phase(1), new AbortController().signal)).rejects.toThrow()
  expect(f.forbidden).not.toHaveBeenCalled()
})
it('native late/aborted handles and mismatched phase cannot mutate graph view', async () => {
  const f = nativeFixture(),
    participant = createNativeParticipant(f.graph, { paint: async () => {} }),
    abort = new AbortController(),
    handle = await participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  await expect(
    handle.apply({ ...phase(1), generation: 2 }, new AbortController().signal),
  ).rejects.toThrow()
  expect(f.instance.drawGrid).not.toHaveBeenCalled()
  abort.abort()
  await expect(handle.apply(phase(1), new AbortController().signal)).rejects.toThrow()
  expect(f.instance.drawBackground).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})
it('native forced projection uses trusted system colors and never writes them into semantic paint', async () => {
  const f = nativeFixture(),
    before = JSON.stringify(f.model),
    participant = createNativeParticipant(f.graph, { paint: async () => {} }),
    handle = await participant.prepare(
      snapshot('light', 1, true),
      phase(1, 'prepare'),
      new AbortController().signal,
    )
  await handle.apply(phase(1), new AbortController().signal)
  expect(f.options.background.color).toBe('Canvas')
  expect(f.options.grid.args.color).toBe('CanvasText')
  expect(JSON.stringify(f.model)).toBe(before)
  expect(f.forbidden).not.toHaveBeenCalled()
  participant.dispose()
})

import { createFrameParticipant } from '../../src/design/theme/frameParticipant'
function frameFixture(
  paintSurface?: () => () => void,
  surfacePaint?: () => Promise<void> | undefined,
) {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const post = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => {}),
    invalidated = vi.fn(),
    shortcut = vi.fn(),
    participant = createFrameParticipant(frame, {
      id: 'frame',
      generation: 7,
      sessionId: 'window-1',
      onInvalidated: invalidated,
      onShortcut: shortcut,
      paintSurface,
      surfacePaint,
    })
  const receive = (
    context: PhaseContext,
    status = 'READY',
    operation = 'prepare',
    patch: Record<string, unknown> = {},
    source: MessageEventSource | null = frame.contentWindow,
    origin = 'frade://drawio',
  ) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source,
        origin,
        data: JSON.stringify({
          event: 'fradePresentation',
          version: 1,
          participantId: 'frame',
          participantGeneration: 7,
          context,
          operation,
          status,
          ...patch,
        }),
      }),
    )
  const cleanup = () => {
    participant.dispose()
    post.mockRestore()
    frame.remove()
  }
  return { frame, post, participant, invalidated, shortcut, receive, cleanup }
}
it('frame prepare waits for matching READY; apply waits for actual painted ACK and preserves semantic APIs', async () => {
  const f = frameFixture(),
    before = f.frame.outerHTML,
    controller = new AbortController(),
    prepared = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), controller.signal)
  let ready = false
  void prepared.then(() => {
    ready = true
  })
  await Promise.resolve()
  expect(ready).toBe(false)
  expect(f.frame.outerHTML).toBe(before)
  const sent = JSON.parse(String(f.post.mock.calls[0][0]))
  expect(sent.operation).toBe('prepare')
  expect(sent.context).toEqual(phase(1, 'prepare'))
  expect(sent.snapshot.colors['diagram.canvas']).toBe(snapshot('dark', 1).colors['diagram.canvas'])
  expect(f.post.mock.calls[0][1]).toBe('frade://drawio')
  f.receive(phase(1, 'prepare'))
  const handle = await prepared
  let painted = false
  const apply = handle.apply(phase(1), new AbortController().signal).then((ack) => {
    painted = true
    return ack
  })
  await Promise.resolve()
  expect(painted).toBe(false)
  f.receive(phase(1), 'READY', 'apply')
  await Promise.resolve()
  expect(painted).toBe(false)
  f.receive(phase(1), 'PAINTED', 'apply')
  expect(await apply).toEqual({
    ...phase(1),
    participantId: 'frame',
    participantGeneration: 7,
    painted: true,
  })
  expect(f.frame.dataset.fradeRevision).toBe('1')
  expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
    'prepare',
    'apply',
  ])
  handle.dispose()
  f.cleanup()
})
it('frame rejects foreign source/origin, stale generation/membership/session and extra fields before satisfying prepare', async () => {
  const f = frameFixture(),
    controller = new AbortController(),
    prepared = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), controller.signal)
  let ready = false
  void prepared.then(() => {
    ready = true
  })
  f.receive(phase(1, 'prepare'), 'READY', 'prepare', {}, window)
  f.receive(
    phase(1, 'prepare'),
    'READY',
    'prepare',
    {},
    f.frame.contentWindow,
    'https://untrusted.example',
  )
  f.receive(phase(1, 'prepare'), 'READY', 'prepare', { participantGeneration: 6 })
  f.receive({ ...phase(1, 'prepare'), membership: 2 })
  f.receive({ ...phase(1, 'prepare'), sessionId: 'other' })
  f.receive(phase(1, 'prepare'), 'READY', 'prepare', { unknown: true })
  await Promise.resolve()
  expect(ready).toBe(false)
  f.receive(phase(1, 'prepare'))
  ;(await prepared).dispose()
  f.cleanup()
})
it('frame rollback carries previous snapshot with new owner and requires its painted ACK before revealing', async () => {
  const f = frameFixture(),
    prepared = f.participant.prepare(
      snapshot('dark', 1),
      phase(1, 'prepare'),
      new AbortController().signal,
    )
  f.receive(phase(1, 'prepare'))
  const handle = await prepared
  const rollbackContext = {
      ...phase(0, 'rollback'),
      generation: 2,
      requestId: 'window-1/intent-2',
      transactionId: 'window-1/intent-2',
    },
    rollback = handle.rollback(snapshot('light', 0), rollbackContext, new AbortController().signal)
  const sent = JSON.parse(String(f.post.mock.calls.at(-1)![0]))
  expect(sent.snapshot.kind).toBe('light')
  expect(sent.context).toEqual(rollbackContext)
  f.receive(rollbackContext, 'PAINTED', 'rollback')
  expect((await rollback).revision).toBe(0)
  expect(f.frame.dataset.fradeRevision).toBe('0')
  handle.dispose()
  f.cleanup()
})
it('frame abort, disposal and navigation reject waiting work and invalidate old generation', async () => {
  const f = frameFixture(),
    abort = new AbortController(),
    prepared = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  abort.abort()
  await expect(prepared).rejects.toThrow()
  expect(JSON.parse(String(f.post.mock.calls.at(-1)![0])).operation).toBe('release')
  const pending = f.participant.prepare(
    snapshot('dark', 1),
    phase(1, 'prepare'),
    new AbortController().signal,
  )
  f.frame.dispatchEvent(new Event('load'))
  await expect(pending).rejects.toThrow()
  expect(f.invalidated).toHaveBeenCalledTimes(1)
  await expect(
    f.participant.prepare(snapshot('light', 2), phase(2, 'prepare'), new AbortController().signal),
  ).rejects.toThrow()
  f.cleanup()
})
it('frame refusal remains an explicit error and join visibility is owned until ACK', async () => {
  const f = frameFixture()
  f.frame.style.visibility = 'visible'
  f.participant.hide()
  expect(f.frame.style.visibility).toBe('hidden')
  const join = phase(0, 'join'),
    prepared = f.participant.prepare(snapshot('light', 0), join, new AbortController().signal)
  f.receive(join, 'REFUSED', 'prepare', { message: 'Frame graph unavailable' })
  await expect(prepared).rejects.toThrow('Frame graph unavailable')
  expect(f.frame.style.visibility).toBe('hidden')
  f.participant.reveal()
  expect(f.frame.style.visibility).toBe('visible')
  f.cleanup()
})
it('frame forwards only validated presentation keys for its current painted owner and never save/close', async () => {
  const f = frameFixture(),
    join = phase(0, 'join'),
    prepared = f.participant.prepare(snapshot('light', 0), join, new AbortController().signal)
  f.receive(join)
  const handle = await prepared,
    applied = handle.apply(join, new AbortController().signal)
  f.receive(join, 'PAINTED', 'apply')
  await applied
  const key = (value: string, context = join) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source: f.frame.contentWindow,
        origin: 'frade://drawio',
        data: JSON.stringify({
          event: 'fradePresentationKey',
          version: 1,
          participantId: 'frame',
          participantGeneration: 7,
          context,
          key: value,
        }),
      }),
    )
  key('k')
  key('t')
  key('Escape')
  key('save')
  key('close')
  key('k', { ...join, membership: 8 })
  expect(f.shortcut.mock.calls).toEqual([['k'], ['t'], ['Escape']])
  handle.dispose()
  f.cleanup()
})

import { createPresentationService } from '../../src/design/theme/service'
import type { PresentationSelection } from '../../src/design/theme/types'
async function environmentFixture() {
  const selection: PresentationSelection = {
      mode: 'system',
      density: 'compact',
      preferred: { ...BUILTIN_IDS },
    },
    registry = createThemeRegistry(),
    initial = resolveTheme({
      registry,
      selection,
      environment: { colorScheme: 'light' },
      revision: 0,
    }),
    durable = { revision: 0, generation: 0, transactionId: 'boot', selection },
    root = document.createElement('div'),
    editor = document.createElement('textarea')
  editor.value = 'dirty editor'
  root.append(editor)
  document.body.append(root)
  let generation = 0
  const host = {
      announceIntent: vi.fn(async () => ({ generation: ++generation })),
      persist: vi.fn(async () => {
        throw Error('OS refresh must never persist')
      }),
      reconcile: vi.fn(async (_context: PhaseContext, published: typeof durable) => published),
    },
    barrier = { paint: vi.fn(async () => {}), reveal: vi.fn(), recovery: vi.fn() },
    service = createPresentationService({
      sessionId: 'environment-window',
      initialSnapshot: initial,
      initialDurable: durable,
      host,
      barrier,
    }),
    registration = service.register(createRootParticipant(root, { paint: async () => {} }))
  await registration.ready
  return {
    service,
    host,
    barrier,
    root,
    editor,
    selection,
    registry,
    durable,
    cleanup: () => {
      registration.dispose()
      root.remove()
    },
  }
}
it('OS refresh updates the System committed view atomically without persisting selection; later cancel retains current OS', async () => {
  const f = await environmentFixture(),
    durableBefore = JSON.stringify(f.service.state().durable),
    did = vi.fn()
  f.service.onDidChangeTheme(did)
  const next = resolveTheme({
    registry: f.registry,
    selection: f.selection,
    environment: { colorScheme: 'dark' },
  })
  expect((await f.service.refreshEnvironment(next)).status).toBe('APPLIED')
  expect(f.service.state().committedSnapshot.kind).toBe('dark')
  expect(f.service.state().preview).toBe(false)
  expect(f.root.dataset.fradeTheme).toBe('dark')
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(JSON.stringify(f.service.state().durable)).toBe(durableBefore)
  expect(did).toHaveBeenCalledTimes(1)
  expect((await f.service.cancel()).snapshot.kind).toBe('dark')
  expect(f.editor.value).toBe('dirty editor')
  expect(f.root.contains(f.editor)).toBe(true)
  f.cleanup()
})
it('OS refresh preserves explicit live preview and density, but Escape restores newly resolved System baseline', async () => {
  const f = await environmentFixture(),
    previewChoice: PresentationSelection = { ...f.selection, mode: 'light', density: 'comfortable' }
  await f.service.preview(
    previewChoice,
    resolveTheme({
      registry: f.registry,
      selection: previewChoice,
      environment: { colorScheme: 'light' },
    }),
  )
  const baseline = resolveTheme({
      registry: f.registry,
      selection: f.selection,
      environment: { colorScheme: 'dark' },
    }),
    visible = resolveTheme({
      registry: f.registry,
      selection: previewChoice,
      environment: { colorScheme: 'dark' },
    })
  expect((await f.service.refreshEnvironment(baseline, visible)).status).toBe('APPLIED')
  expect(f.service.state().preview).toBe(true)
  expect(f.service.state().snapshot.kind).toBe('light')
  expect(f.service.state().snapshot.density).toBe('comfortable')
  expect(f.service.state().committedSnapshot.kind).toBe('dark')
  await f.service.cancel()
  expect(f.root.dataset.fradeTheme).toBe('dark')
  expect(f.root.dataset.fradeDensity).toBe('compact')
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(f.editor.value).toBe('dirty editor')
  f.cleanup()
})
it('forced OS refresh is final in explicit preview and updates cancel baseline without persisting system keywords', async () => {
  const f = await environmentFixture(),
    choice: PresentationSelection = { ...f.selection, mode: 'light', density: 'comfortable' },
    environment = { colorScheme: 'dark' as const, highContrast: true, forcedColors: true }
  await f.service.preview(choice, resolveTheme({ registry: f.registry, selection: choice }))
  const result = await f.service.refreshEnvironment(
    resolveTheme({ registry: f.registry, selection: f.selection, environment }),
    resolveTheme({ registry: f.registry, selection: choice, environment }),
  )
  expect(result.snapshot.kind).toBe('light')
  expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
  expect(f.service.state().snapshot.forcedColors).toBe(true)
  await f.service.cancel()
  expect(f.service.state().snapshot.kind).toBe('high-contrast')
  expect(f.service.state().snapshot.forcedColors).toBe(true)
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(f.service.state().durable.selection).toEqual(f.selection)
  f.cleanup()
})

it('cancel resolves current environment while superseding an unpublished OS refresh and never writes its selection', async () => {
  const f = await environmentFixture(),
    start = gate(),
    registration = f.service.register({
      id: 'controlled-os',
      generation: 1,
      hide: () => {},
      reveal: () => {},
      prepare: async (value, ctx, signal) => {
        if (ctx.phase === 'prepare' && ctx.generation === 1) {
          start.resolve()
          await new Promise<void>((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(Error('superseded')), { once: true }),
          )
        }
        const ack = (phase: PhaseContext) => ({
          ...phase,
          participantId: 'controlled-os',
          participantGeneration: 1,
          painted: true as const,
        })
        return {
          apply: async (next) => ack(next),
          rollback: async (_previous, next) => ack(next),
          dispose: () => {},
        }
      },
    })
  await registration.ready
  const baseline = resolveTheme({
      registry: f.registry,
      selection: f.selection,
      environment: { colorScheme: 'dark', highContrast: true, forcedColors: true },
    }),
    refresh = f.service.refreshEnvironment(baseline)
  await start.promise
  const canceled = f.service.cancel(baseline)
  expect((await refresh).status).toBe('SUPERSEDED')
  expect((await canceled).status).toBe('CANCELED')
  expect(f.service.state().committedSnapshot.kind).toBe('high-contrast')
  expect(f.service.state().committedSnapshot.forcedColors).toBe(true)
  expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
  expect(f.service.state().durable.selection).toEqual(f.selection)
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(f.editor.value).toBe('dirty editor')
  registration.dispose()
  f.cleanup()
})

it('recovery restores current OS projection under the retained curtain before publishing success', async () => {
  const f = await environmentFixture()
  let available = false
  const registration = f.service.register({
    id: 'recover-os',
    generation: 1,
    hide: () => {},
    reveal: () => {},
    prepare: async (_value, _ctx) => {
      const ack = (phase: PhaseContext) => ({
        ...phase,
        participantId: 'recover-os',
        participantGeneration: 1,
        painted: true as const,
      })
      return {
        apply: async (next) => {
          if (next.phase !== 'join' && !available) throw Error('frame unavailable')
          return ack(next)
        },
        rollback: async (_previous, next) => {
          if (!available) throw Error('rollback unavailable')
          return ack(next)
        },
        dispose: () => {},
      }
    },
  })
  await registration.ready
  expect(
    (
      await f.service.preview(
        { ...f.selection, mode: 'dark' },
        resolveTheme({ registry: f.registry, selection: { ...f.selection, mode: 'dark' } }),
      )
    ).status,
  ).toBe('RECOVERY_BLOCKED')
  available = true
  const baseline = resolveTheme({
      registry: f.registry,
      selection: f.selection,
      environment: { colorScheme: 'dark', highContrast: true, forcedColors: true },
    }),
    result = await f.service.recover(baseline)
  expect(result.status).toBe('CANCELED')
  expect(f.service.state().committedSnapshot.kind).toBe('high-contrast')
  expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
  expect(f.host.persist).not.toHaveBeenCalled()
  expect(f.editor.value).toBe('dirty editor')
  registration.dispose()
  f.cleanup()
})

it('render-dependent join paints its neutral cover before frame rendering and retains it through matching ACK', async () => {
  let painted = false,
    visible = false,
    applying = false
  const wait = gate(),
    barrier = {
      paint: vi.fn(async () => {
        painted = true
      }),
      reveal: vi.fn(() => {
        visible = true
      }),
      recovery: vi.fn(),
    }
  const service = createPresentationService({
    sessionId: 'window-1',
    initialSnapshot: snapshot('light', 0),
    initialDurable: {
      revision: 0,
      generation: 0,
      transactionId: 'boot',
      selection: { mode: 'light', density: 'comfortable', preferred: { ...BUILTIN_IDS } },
    },
    host: {
      announceIntent: async () => ({ generation: 1 }),
      persist: async () => {
        throw Error('join cannot persist')
      },
      reconcile: async (_ctx, record) => record,
    },
    barrier,
  })
  const participant = {
    id: 'paint-dependent-frame',
    generation: 1,
    requiresPaintCover: true,
    hide: () => {},
    reveal: () => {
      expect(painted).toBe(true)
    },
    prepare: async (_value: ReturnType<typeof snapshot>, ctx: PhaseContext) => {
      expect(ctx.phase).toBe('join')
      return {
        apply: async (phase: PhaseContext) => {
          if (!painted) throw Error('Paint cover required before frame rendering')
          applying = true
          await wait.promise
          return {
            ...phase,
            participantId: 'paint-dependent-frame',
            participantGeneration: 1,
            painted: true as const,
          }
        },
        rollback: async (_previous: ReturnType<typeof snapshot>, phase: PhaseContext) => ({
          ...phase,
          participantId: 'paint-dependent-frame',
          participantGeneration: 1,
          painted: true as const,
        }),
        dispose: () => {},
      }
    },
  }
  const registration = service.register(participant)
  let failure: unknown
  const settled = registration.ready.catch((error) => {
    failure = error
  })
  try {
    await vi.waitFor(() => expect(applying).toBe(true))
    expect(visible).toBe(false)
    expect(barrier.reveal).not.toHaveBeenCalled()
    wait.resolve()
    await settled
    expect(failure).toBeUndefined()
    expect(visible).toBe(true)
    expect(barrier.paint).toHaveBeenCalledTimes(1)
    expect(barrier.recovery).not.toHaveBeenCalled()
  } finally {
    wait.resolve()
    await settled
    registration.dispose()
  }
})
it('failed neutral join cover keeps a required frame hidden and produces explicit recovery before apply', async () => {
  const apply = vi.fn(async (ctx: PhaseContext) => ({
      ...ctx,
      participantId: 'covered-frame',
      participantGeneration: 1,
      painted: true as const,
    })),
    reveal = vi.fn(),
    recovery = vi.fn()
  const service = createPresentationService({
    sessionId: 'window-1',
    initialSnapshot: snapshot('light', 0),
    initialDurable: {
      revision: 0,
      generation: 0,
      transactionId: 'boot',
      selection: { mode: 'light', density: 'comfortable', preferred: { ...BUILTIN_IDS } },
    },
    host: {
      announceIntent: async () => ({ generation: 1 }),
      persist: async () => {
        throw Error('join cannot persist')
      },
      reconcile: async (_ctx, record) => record,
    },
    barrier: {
      paint: async () => {
        throw Error('Cover paint refused')
      },
      reveal,
      recovery,
    },
  })
  const participant = {
    id: 'covered-frame',
    generation: 1,
    requiresPaintCover: true,
    hide: () => {},
    reveal: vi.fn(),
    prepare: async () => ({
      apply,
      rollback: async (_snapshot: ReturnType<typeof snapshot>, ctx: PhaseContext) => apply(ctx),
      dispose: () => {},
    }),
  }
  const registration = service.register(participant)
  try {
    await expect(registration.ready).rejects.toThrow('Cover paint refused')
    expect(apply).not.toHaveBeenCalled()
    expect(reveal).not.toHaveBeenCalled()
    expect(participant.reveal).not.toHaveBeenCalled()
    expect(service.state().phase).toBe('RECOVERY_BLOCKED')
    expect(recovery).toHaveBeenCalledWith('Cover paint refused')
  } finally {
    registration.dispose()
  }
})
it('covered frame apply permits rendering for its paint but leaves reveal ownership until the exact ACK', async () => {
  const f = frameFixture()
  f.frame.style.visibility = 'visible'
  f.participant.hide()
  const abort = new AbortController(),
    preparing = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await preparing
  const applying = handle.apply(phase(1), abort.signal)
  try {
    expect(f.frame.style.visibility).toBe('visible')
    f.receive(phase(1), 'PAINTED', 'apply')
    await applying
    f.participant.reveal()
    expect(f.frame.style.visibility).toBe('visible')
  } finally {
    abort.abort()
    await applying.catch((error) => {
      expect(error.message).toContain('aborted')
    })
    handle.dispose()
    f.cleanup()
  }
})

it('parked surface lease starts only in covered apply and survives rollback until reveal or disposal', async () => {
  const release = vi.fn(),
    acquire = vi.fn(() => release),
    f = frameFixture(acquire),
    abort = new AbortController()
  f.participant.hide()
  const prepared = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await prepared
  expect(acquire).not.toHaveBeenCalled()
  const applying = handle.apply(phase(1), abort.signal)
  try {
    expect(acquire).toHaveBeenCalledTimes(1)
    expect(release).not.toHaveBeenCalled()
    f.receive(phase(1), 'PAINTED', 'apply')
    await applying
    const restoring = handle.rollback(snapshot('light', 0), phase(0, 'rollback'), abort.signal)
    expect(acquire).toHaveBeenCalledTimes(1)
    f.receive(phase(0, 'rollback'), 'PAINTED', 'rollback')
    await restoring
    expect(release).not.toHaveBeenCalled()
    f.participant.reveal()
    expect(release).toHaveBeenCalledTimes(1)
    handle.dispose()
    f.participant.dispose()
    expect(release).toHaveBeenCalledTimes(1)
  } finally {
    abort.abort()
    await applying.catch((error) => {
      expect(error.message).toContain('aborted')
    })
    f.cleanup()
  }
})
it('unavailable parked paint surface refuses before sending apply and cannot fabricate an ACK', async () => {
  const acquire = vi.fn(() => {
      throw Error('Parking surface unavailable')
    }),
    f = frameFixture(acquire),
    abort = new AbortController()
  f.participant.hide()
  const preparing = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await preparing
  try {
    await expect(handle.apply(phase(1), abort.signal)).rejects.toThrow(
      'Parking surface unavailable',
    )
    expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
      'prepare',
    ])
    expect(f.frame.dataset.fradeRevision).toBeUndefined()
  } finally {
    abort.abort()
    handle.dispose()
    f.cleanup()
  }
})

it('parked frame requests its own apply only after parent staging paint and still requires the exact subsequent frame ACK', async () => {
  const wait = gate(),
    release = vi.fn(),
    parentPaint = vi.fn(() => wait.promise),
    f = frameFixture(() => release, parentPaint),
    abort = new AbortController()
  f.participant.hide()
  const preparing = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await preparing
  expect(parentPaint).not.toHaveBeenCalled()
  const applying = handle.apply(phase(1), abort.signal)
  try {
    expect(parentPaint).toHaveBeenCalledTimes(1)
    expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
      'prepare',
    ])
    wait.resolve()
    await vi.waitFor(() =>
      expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
        'prepare',
        'apply',
      ]),
    )
    expect(f.frame.dataset.fradeRevision).toBeUndefined()
    f.receive(phase(1), 'PAINTED', 'apply')
    await applying
    expect(release).not.toHaveBeenCalled()
    f.participant.reveal()
    expect(release).toHaveBeenCalledTimes(1)
  } finally {
    abort.abort()
    wait.resolve()
    await applying.catch((error) => expect(error.message).toContain('aborted'))
    handle.dispose()
    f.cleanup()
  }
})
it('aborted parent staging paint cannot send a late apply into a newer frame owner', async () => {
  const wait = gate(),
    f = frameFixture(
      () => () => {},
      () => wait.promise,
    ),
    abort = new AbortController()
  f.participant.hide()
  const preparing = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await preparing
  const applying = handle.apply(phase(1), abort.signal)
  const rejected = expect(applying).rejects.toThrow('invalidated')
  abort.abort()
  wait.resolve()
  try {
    await rejected
    expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
      'prepare',
    ])
    expect(f.frame.dataset.fradeRevision).toBeUndefined()
  } finally {
    handle.dispose()
    f.cleanup()
  }
})

it('removed frame cleanup rejects pending prepare, restores owned visibility and revision, and sends no detach to a missing window', async () => {
  const f = frameFixture(),
    abort = new AbortController()
  f.frame.style.visibility = 'visible'
  f.participant.hide()
  const pending = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal),
    rejected = expect(pending).rejects.toThrow('disposed')
  f.frame.remove()
  Object.defineProperty(f.frame, 'contentWindow', { configurable: true, get: () => null })
  expect(() => f.participant.dispose()).not.toThrow()
  await rejected
  expect(f.frame.style.visibility).toBe('visible')
  expect(f.frame.hasAttribute('data-frade-revision')).toBe(false)
  expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
    'prepare',
  ])
  expect(() => f.participant.dispose()).not.toThrow()
  f.cleanup()
})
it('prepared handle and leased frame dispose after DOM removal without losing lease or restoring a fabricated ACK', async () => {
  const release = vi.fn(),
    f = frameFixture(() => release),
    abort = new AbortController()
  f.frame.style.visibility = 'visible'
  f.participant.hide()
  const preparing = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal)
  f.receive(phase(1, 'prepare'))
  const handle = await preparing
  const applying = handle.apply(phase(1), abort.signal)
  f.receive(phase(1), 'PAINTED', 'apply')
  await applying
  f.frame.remove()
  Object.defineProperty(f.frame, 'contentWindow', { configurable: true, get: () => null })
  expect(() => handle.dispose()).not.toThrow()
  expect(() => f.participant.dispose()).not.toThrow()
  expect(release).toHaveBeenCalledTimes(1)
  expect(f.frame.style.visibility).toBe('visible')
  expect(f.frame.hasAttribute('data-frade-revision')).toBe(false)
  expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
    'prepare',
    'apply',
  ])
  await expect(handle.apply(phase(1), abort.signal)).rejects.toThrow('invalidated')
  f.cleanup()
})
it('aborting a removed frame pending command rejects without throwing from the release notification or permitting late work', async () => {
  const f = frameFixture(),
    abort = new AbortController(),
    pending = f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal),
    rejected = expect(pending).rejects.toThrow('aborted')
  f.frame.remove()
  Object.defineProperty(f.frame, 'contentWindow', { configurable: true, get: () => null })
  const errors: unknown[] = [],
    error = (event: ErrorEvent) => errors.push(event.error)
  window.addEventListener('error', error)
  try {
    abort.abort()
    await rejected
    expect(errors).toEqual([])
    expect(() => f.participant.dispose()).not.toThrow()
    expect(f.post.mock.calls.map((call) => JSON.parse(String(call[0])).operation)).toEqual([
      'prepare',
    ])
  } finally {
    window.removeEventListener('error', error)
    f.cleanup()
  }
})

it('active frame prepare with missing content window still refuses and cannot be treated as an optional cleanup notification', async () => {
  const f = frameFixture(),
    abort = new AbortController()
  f.frame.remove()
  Object.defineProperty(f.frame, 'contentWindow', { configurable: true, get: () => null })
  await expect(
    f.participant.prepare(snapshot('dark', 1), phase(1, 'prepare'), abort.signal),
  ).rejects.toThrow('window unavailable')
  expect(f.post).not.toHaveBeenCalled()
  expect(f.frame.hasAttribute('data-frade-revision')).toBe(false)
  f.cleanup()
})
