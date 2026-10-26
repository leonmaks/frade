// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createNativeParticipant } from '../../src/design/theme/nativeParticipant'
import type { NativePresentationGraph } from '../../src/design/theme/nativeParticipant'
import { applyRootSnapshot } from '../../src/design/theme/rootParticipant'
import { createApplicationThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { drawioEditor } from '../../src/design/generated/drawio-editor'
import { referenceTheme } from '../../src/design/reference/vscode-dark-2026/generated'
import type { PhaseContext } from '../../src/design/theme/service'
import type { Density, ThemeMode } from '../../src/design/theme/types'

const phase = (revision: number, stage: PhaseContext['phase'] = 'apply'): PhaseContext => ({
  version: 1,
  requestId: 'window-lde/intent-1',
  sessionId: 'window-lde',
  generation: 1,
  transactionId: 'window-lde/intent-1',
  revision,
  membership: 1,
  phase: stage,
})
const choices = [
  'light',
  'dark',
  'high-contrast',
  'system-light',
  'system-dark',
  'reference',
] as const
function value(
  choice: (typeof choices)[number],
  density: Density,
  forcedColors: boolean,
  revision = 7,
) {
  const mode: ThemeMode =
    choice === 'reference'
      ? 'dark'
      : choice.startsWith('system-')
        ? 'system'
        : (choice as ThemeMode)
  return resolveTheme({
    registry: createApplicationThemeRegistry(),
    selection: {
      mode,
      density,
      preferred: { ...BUILTIN_IDS, ...(choice === 'reference' ? { dark: referenceTheme.id } : {}) },
    },
    environment: { colorScheme: choice === 'system-dark' ? 'dark' : 'light', forcedColors },
    revision,
  })
}
function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function fixture() {
  const app = document.createElement('main'),
    editor = document.createElement('section'),
    canvas = document.createElement('div')
  const authored = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  authored.setAttribute('fill', '#C14F71')
  authored.setAttribute('stroke', '#207D63')
  authored.setAttribute('opacity', '0.65')
  authored.setAttribute('d', 'M 10 10 L 30 40')
  canvas.append(authored)
  editor.append(canvas)
  app.append(editor)
  document.body.append(app)
  editor.setAttribute('data-editor-identity', 'retained')
  editor.style.setProperty('--unrelated-owner', 'kept')
  const model = Object.freeze({
    document: '<authored fill="rose" opacity="0.65"/>',
    dirty: true,
    undo: ['user-edit'],
    selection: ['node-1'],
  })
  const forbidden = vi.fn(() => {
    throw Error('Presentation must not enter model APIs')
  })
  const graph = {
    container: canvas,
    options: {
      background: { color: 'original-canvas' },
      grid: {
        size: 10,
        visible: true,
        type: 'dot',
        args: { color: 'original-grid', thickness: 1.2 },
      },
    },
    drawBackground: vi.fn((background: { color: string }) => {
      graph.options.background = background
      return graph
    }),
    drawGrid: vi.fn((grid: Partial<typeof graph.options.grid>) => {
      Object.assign(graph.options.grid, grid)
      return graph
    }),
    loadDocument: forbidden,
    fromJSON: forbidden,
    setCellStyles: forbidden,
    modelBeginUpdate: forbidden,
  }
  return { app, editor, canvas, authored, graph, model, forbidden }
}
afterEach(() => {
  document.body.replaceChildren()
})

for (const choice of choices)
  for (const density of ['compact', 'comfortable'] as const)
    for (const forcedColors of [false, true]) {
      it(`LDE-001 LDE-006 native scope under ${choice}/${density}/forced=${forcedColors} preserves the app and authored state`, async () => {
        const f = fixture(),
          input = value(choice, density, forcedColors),
          beforeInput = JSON.stringify(input),
          beforeModel = JSON.stringify(f.model)
        applyRootSnapshot(f.app, input)
        const appStyle = f.app.style.cssText,
          appMetadata = JSON.stringify(f.app.dataset),
          author = f.authored.outerHTML,
          wait = gate()
        // Structural options permit baseline execution: the old adapter simply ignores editorRoot.
        const options = {
          id: 'native/lde',
          generation: 4,
          editorRoot: f.editor,
          paint: () => wait.promise,
        }
        const participant = createNativeParticipant(
          f.graph as unknown as NativePresentationGraph,
          options,
        )
        const beforePrepare = f.editor.outerHTML
        const handle = await participant.prepare(
          input,
          phase(7, 'prepare'),
          new AbortController().signal,
        )
        expect(f.editor.outerHTML).toBe(beforePrepare)
        expect(f.graph.drawBackground).not.toHaveBeenCalled()
        expect(f.graph.drawGrid).not.toHaveBeenCalled()
        let acknowledged = false
        const applying = handle.apply(phase(7), new AbortController().signal).then((ack) => {
          acknowledged = true
          return ack
        })
        await Promise.resolve()
        expect(acknowledged).toBe(false)
        wait.resolve()
        const ack = await applying
        expect(ack).toEqual({
          ...phase(7),
          participantId: 'native/lde',
          participantGeneration: 4,
          painted: true,
        })
        expect(f.graph.options.background.color).toBe(
          forcedColors ? 'Canvas' : drawioEditor.colors['diagram.canvas'],
        )
        expect(majorGridInk(f.graph.options.grid.args)).toBe(
          forcedColors ? 'CanvasText' : drawioEditor.colors['diagram.grid'],
        )
        expect(f.editor.dataset.fradeTheme).toBe('light')
        expect(f.editor.dataset.fradeDensity).toBe(density)
        expect(f.editor.dataset.fradeRevision).toBe('7')
        expect(f.editor.style.getPropertyValue('--frade-text-primary')).toBe(
          forcedColors ? 'CanvasText' : drawioEditor.colors['text.primary'],
        )
        expect(f.editor.style.getPropertyValue('--unrelated-owner')).toBe('kept')
        expect(f.graph.options.grid.size).toBe(10)
        expect(f.graph.options.grid.visible).toBe(true)
        expect(f.authored.outerHTML).toBe(author)
        expect(f.canvas.firstChild).toBe(f.authored)
        expect(JSON.stringify(f.model)).toBe(beforeModel)
        expect(f.forbidden).not.toHaveBeenCalled()
        expect(f.app.style.cssText).toBe(appStyle)
        expect(JSON.stringify(f.app.dataset)).toBe(appMetadata)
        expect(JSON.stringify(input)).toBe(beforeInput)
        handle.dispose()
        participant.dispose()
      })
    }

it('LDE-006 LDE-007 native forced-colors round trip and rollback retain author/settings/revision ownership', async () => {
  const f = fixture(),
    options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  const before = JSON.stringify(f.model),
    off = value('reference', 'comfortable', false, 6),
    on = value('reference', 'comfortable', true, 7)
  const handle = await participant.prepare(on, phase(7, 'prepare'), new AbortController().signal)
  await handle.apply(phase(7), new AbortController().signal)
  expect(f.graph.options.background.color).toBe('Canvas')
  await handle.rollback(off, phase(6, 'rollback'), new AbortController().signal)
  expect(f.graph.options.background.color).toBe(drawioEditor.colors['diagram.canvas'])
  expect(majorGridInk(f.graph.options.grid.args)).toBe(drawioEditor.colors['diagram.grid'])
  expect(f.editor.dataset.fradeTheme).toBe('light')
  expect(f.editor.dataset.fradeRevision).toBe('6')
  expect(f.editor.dataset.fradeDensity).toBe('comfortable')
  expect(off.kind).toBe('dark')
  expect(off.id).toBe(referenceTheme.id)
  expect(on.forcedColors).toBe(true)
  expect(JSON.stringify(f.model)).toBe(before)
  expect(f.forbidden).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})
it('LDE-007 stale/aborted editor handle cannot paint either root or canvas', async () => {
  const f = fixture(),
    options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
      f.graph as unknown as NativePresentationGraph,
      options,
    ),
    abort = new AbortController()
  const handle = await participant.prepare(
      value('dark', 'compact', false),
      phase(7, 'prepare'),
      abort.signal,
    ),
    before = f.editor.outerHTML
  await expect(
    handle.apply({ ...phase(7), membership: 9 }, new AbortController().signal),
  ).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(f.graph.drawGrid).not.toHaveBeenCalled()
  abort.abort()
  await expect(handle.apply(phase(7), new AbortController().signal)).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(f.graph.drawBackground).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})
it('LDE-003 disposal restores owned root projections and preserves a later unrelated style owner', async () => {
  const f = fixture(),
    editorBefore = f.editor.outerHTML,
    canvasStyle = f.canvas.style.cssText
  const participant = createNativeParticipant(f.graph as unknown as NativePresentationGraph, {
    ...{ editorRoot: f.editor },
    paint: async () => {},
  })
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await handle.apply(phase(7), new AbortController().signal)
  f.editor.style.setProperty('--frade-focus-ring', 'later-owner')
  handle.dispose()
  participant.dispose()
  expect(f.editor.style.getPropertyValue('--frade-focus-ring')).toBe('later-owner')
  f.editor.style.removeProperty('--frade-focus-ring')
  expect(f.editor.outerHTML).toBe(editorBefore)
  expect(f.canvas.style.cssText).toBe(canvasStyle)
})
it('LDE-007 covered native join is paintable before ACK and retains reveal/disposal ownership', async () => {
  const f = fixture(),
    wait = gate(),
    options = { editorRoot: f.editor, paint: () => wait.promise }
  f.editor.style.visibility = 'visible'
  f.canvas.style.visibility = 'visible'
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  expect(participant.requiresPaintCover).toBe(true)
  participant.hide()
  expect(f.editor.style.visibility).toBe('hidden')
  expect(f.canvas.style.visibility).toBe('hidden')
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'join'),
    new AbortController().signal,
  )
  expect(f.editor.style.visibility).toBe('hidden')
  let painted = false
  const applying = handle.apply(phase(7, 'join'), new AbortController().signal).then(() => {
    painted = true
  })
  await Promise.resolve()
  expect(f.editor.style.visibility).toBe('visible')
  expect(f.canvas.style.visibility).toBe('visible')
  expect(painted).toBe(false)
  wait.resolve()
  await applying
  participant.reveal()
  handle.dispose()
  participant.dispose()
  expect(f.editor.style.visibility).toBe('visible')
  expect(f.canvas.style.visibility).toBe('visible')
})

it('LDE-007 invalid covered handle cannot reveal its parent before refusal', async () => {
  const f = fixture(),
    paint = vi.fn(async () => {}),
    options = { editorRoot: f.editor, paint }
  const participant = createNativeParticipant(
      f.graph as unknown as NativePresentationGraph,
      options,
    ),
    abort = new AbortController()
  participant.hide()
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    abort.signal,
  )
  const before = f.editor.outerHTML
  abort.abort()
  await expect(handle.apply(phase(7), new AbortController().signal)).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(paint).not.toHaveBeenCalled()
  expect(f.graph.drawBackground).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})

import { createEditorPresentationParticipant } from '../../src/design/theme/editorPresentationParticipant'
import type { PreparedPresentation, PresentationParticipant } from '../../src/design/theme/service'
it('LDE-003 late prepare after owner disposal is rejected and its acquired handle is disposed', async () => {
  const root = document.createElement('section')
  let ready!: (value: PreparedPresentation) => void
  const delay = new Promise<PreparedPresentation>((resolve) => {
    ready = resolve
  })
  const child = { apply: vi.fn(), rollback: vi.fn(), dispose: vi.fn() }
  const delegate: PresentationParticipant & { dispose(): void } = {
    id: 'frame/late',
    generation: 1,
    hide() {},
    reveal() {},
    prepare: async () => delay,
    dispose: vi.fn(),
  }
  const participant = createEditorPresentationParticipant(root, delegate, { paint: async () => {} })
  const pending = participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await Promise.resolve()
  participant.dispose()
  ready(child)
  await expect(pending).rejects.toThrow()
  expect(child.dispose).toHaveBeenCalledTimes(1)
  expect(child.apply).not.toHaveBeenCalled()
  expect(child.rollback).not.toHaveBeenCalled()
})

import { createFrameParticipant } from '../../src/design/theme/frameParticipant'
it('LDE-001 LDE-007 frame prepares a validated Light DTO while keeping the authoritative Dark context', async () => {
  const editor = document.createElement('section'),
    frame = document.createElement('iframe')
  editor.append(frame)
  document.body.append(editor)
  const input = value('reference', 'comfortable', false),
    before = JSON.stringify(input)
  const post = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation((data) => {
    const message = JSON.parse(String(data))
    if (!['prepare', 'apply', 'rollback'].includes(message.operation)) return
    queueMicrotask(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          source: frame.contentWindow,
          origin: 'frade://drawio',
          data: JSON.stringify({
            event: 'fradePresentation',
            version: 1,
            participantId: 'frame/lde',
            participantGeneration: 4,
            operation: message.operation,
            context: message.context,
            status: message.operation === 'prepare' ? 'READY' : 'PAINTED',
          }),
        }),
      ),
    )
  })
  const options = { id: 'frame/lde', generation: 4, sessionId: 'window-lde', editorRoot: editor }
  const participant = createFrameParticipant(frame, options)
  try {
    const prepared = await participant.prepare(
      input,
      phase(7, 'prepare'),
      new AbortController().signal,
    )
    const sent = JSON.parse(
      String(
        post.mock.calls.find((call) => JSON.parse(String(call[0])).operation === 'prepare')![0],
      ),
    )
    expect(sent.context).toEqual(phase(7, 'prepare'))
    expect(sent.snapshot.kind).toBe('light')
    expect(sent.snapshot.id).toBe('frade.editor/drawio-light')
    expect(sent.snapshot.colors['diagram.grid']).toBe(drawioEditor.colors['diagram.grid'])
    await prepared.apply(phase(7), new AbortController().signal)
    expect(editor.dataset.fradeTheme).toBe('light')
    expect(editor.dataset.fradeRevision).toBe('7')
    expect(frame.dataset.fradeRevision).toBe('7')
    expect(JSON.stringify(input)).toBe(before)
    expect(input.kind).toBe('dark')
    prepared.dispose()
  } finally {
    participant.dispose()
    post.mockRestore()
  }
})

it('LDE-004 upstream mesh stroke and major step restore without changing grid semantics', async () => {
  const f = fixture()
  f.graph.options.grid.args.thickness = 2
  const original = { ...f.graph.options.grid.args },
    options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await handle.apply(phase(7), new AbortController().signal)
  const mesh = f.graph.options.grid.args as unknown as {
    color: string
    thickness: number
    factor?: number
  }[]
  expect(mesh).toHaveLength(2)
  expect(mesh[0].thickness).toBe(drawioEditor.grid.strokeWidth)
  expect(mesh[1].thickness).toBe(drawioEditor.grid.strokeWidth)
  expect(mesh[1].factor).toBe(drawioEditor.grid.majorSteps)
  expect(f.graph.options.grid.size).toBe(10)
  expect(f.graph.options.grid.type).toBe('doubleMesh')
  participant.dispose()
  expect(f.graph.options.grid.args).toEqual(original)
})

import { getEditorAppearanceOwner } from '../../src/design/theme/editorPresentationParticipant'
import type { EditorAppearanceOwner } from '../../src/design/theme/editorPresentationParticipant'
import { createManagedOverlays } from '../../src/design/theme/overlays'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { createHash } from 'node:crypto'
function majorGridInk(value: unknown): string {
  return Array.isArray(value) ? value[value.length - 1].color : (value as { color: string }).color
}
function ownedDialog(host: HTMLElement, label: string) {
  const element = document.createElement('section'),
    button = document.createElement('button')
  element.setAttribute('role', 'dialog')
  element.setAttribute('aria-label', label)
  button.textContent = 'Cancel'
  element.append(button)
  host.append(element)
  return { element, button }
}
async function readyOwner(f: ReturnType<typeof fixture>, density: Density = 'compact') {
  const options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  const h = await participant.prepare(
    value('dark', density, false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await h.apply(phase(7), new AbortController().signal)
  h.dispose()
  return { participant, lease: getEditorAppearanceOwner(f.editor)! }
}
it('LDE-003 managed editor overlay keeps focus/cancel semantics and isolates the global picker and second editor', async () => {
  const a = fixture(),
    b = fixture(),
    host = document.createElement('div')
  a.app.append(b.editor, host)
  b.app.remove()
  applyRootSnapshot(a.app, value('dark', 'compact', false))
  const first = await readyOwner(a),
    second = await readyOwner(b, 'comfortable'),
    manager = createManagedOverlays(a.app, host)
  const global = ownedDialog(host, 'Global picker'),
    local = ownedDialog(host, 'Editor A'),
    cancel = vi.fn(() => true)
  const offGlobal = manager.register({
    id: 'global',
    element: global.element,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel: () => true,
  })
  const offLocal = manager.register({
    id: 'local',
    element: local.element,
    priority: 200,
    modal: true,
    opener: global.button,
    outside: 'retain',
    cancel,
    appearanceOwner: first.lease,
  })
  expect(local.element.dataset.fradeTheme).toBe('light')
  expect(local.element.style.getPropertyValue('--frade-surface-overlay')).toBe(
    drawioEditor.colors['surface.overlay'],
  )
  expect(global.element.dataset.fradeEditor).toBeUndefined()
  expect(global.element.style.getPropertyValue('--frade-surface-overlay')).toBe('')
  expect(a.app.dataset.fradeTheme).toBe('dark')
  expect(b.editor.dataset.fradeDensity).toBe('comfortable')
  expect(document.activeElement).toBe(local.button)
  expect(manager.handleKey(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))).toBe(
    true,
  )
  await Promise.resolve()
  expect(cancel).toHaveBeenCalledTimes(1)
  offLocal()
  expect(document.activeElement).toBe(global.button)
  expect(local.element.dataset.fradeEditor).toBeUndefined()
  offGlobal()
  manager.dispose()
  first.participant.dispose()
  second.participant.dispose()
})
it('LDE-003 LDE-006 owned overlay follows same-transaction forced-colors rollback without touching the second owner/global host', async () => {
  const a = fixture(),
    b = fixture(),
    host = document.createElement('div')
  a.app.append(b.editor, host)
  b.app.remove()
  applyRootSnapshot(a.app, value('dark', 'compact', false))
  const first = await readyOwner(a),
    second = await readyOwner(b),
    manager = createManagedOverlays(a.app, host),
    dialog = ownedDialog(host, 'A')
  const off = manager.register({
    id: 'a',
    element: dialog.element,
    priority: 100,
    modal: true,
    outside: 'retain',
    cancel: () => true,
    appearanceOwner: first.lease,
  })
  const h = await first.participant.prepare(
    value('reference', 'comfortable', true, 8),
    phase(8, 'prepare'),
    new AbortController().signal,
  )
  await h.apply(phase(8), new AbortController().signal)
  expect(dialog.element.style.getPropertyValue('--frade-surface-overlay')).toBe('Canvas')
  expect(dialog.element.dataset.fradeDensity).toBe('comfortable')
  expect(dialog.element.dataset.fradeRevision).toBe('8')
  expect(b.editor.style.getPropertyValue('--frade-surface-overlay')).toBe(
    drawioEditor.colors['surface.overlay'],
  )
  expect(a.app.dataset.fradeTheme).toBe('dark')
  await h.rollback(
    value('dark', 'compact', false, 7),
    phase(7, 'rollback'),
    new AbortController().signal,
  )
  expect(dialog.element.style.getPropertyValue('--frade-surface-overlay')).toBe(
    drawioEditor.colors['surface.overlay'],
  )
  expect(dialog.element.dataset.fradeRevision).toBe('7')
  expect(dialog.element.dataset.fradeDensity).toBe('compact')
  expect(document.activeElement).toBe(dialog.button)
  h.dispose()
  off()
  manager.dispose()
  first.participant.dispose()
  second.participant.dispose()
})
it('LDE-003 disposed/foreign/forged leases fail without rebinding or changing the active modal', async () => {
  const a = fixture(),
    b = fixture(),
    host = document.createElement('div')
  a.app.append(host)
  const first = await readyOwner(a),
    foreign = await readyOwner(b),
    manager = createManagedOverlays(a.app, host)
  const current = ownedDialog(host, 'A'),
    candidate = ownedDialog(host, 'B')
  const off = manager.register({
    id: 'current',
    element: current.element,
    priority: 100,
    modal: true,
    outside: 'retain',
    cancel: () => true,
    appearanceOwner: first.lease,
  })
  const prior = candidate.element.outerHTML
  for (const lease of [foreign.lease, Object.freeze({}) as EditorAppearanceOwner])
    expect(() =>
      manager.register({
        id: 'invalid',
        element: candidate.element,
        priority: 200,
        modal: true,
        outside: 'retain',
        cancel: () => true,
        appearanceOwner: lease,
      }),
    ).toThrow('appearance owner unavailable')
  expect(candidate.element.outerHTML).toBe(prior)
  expect(manager.top()?.id).toBe('current')
  first.participant.dispose()
  expect(current.element.dataset.fradeEditor).toBeUndefined()
  expect(current.element.style.getPropertyValue('--frade-surface-overlay')).toBe('')
  expect(() =>
    manager.register({
      id: 'stale',
      element: candidate.element,
      priority: 200,
      modal: true,
      outside: 'retain',
      cancel: () => true,
      appearanceOwner: first.lease,
    }),
  ).toThrow('appearance owner unavailable')
  const replacement = await readyOwner(a)
  expect(replacement.lease).not.toBe(first.lease)
  expect(() =>
    manager.register({
      id: 'old-generation',
      element: candidate.element,
      priority: 200,
      modal: true,
      outside: 'retain',
      cancel: () => true,
      appearanceOwner: first.lease,
    }),
  ).toThrow()
  const offNext = manager.register({
    id: 'next',
    element: candidate.element,
    priority: 200,
    modal: true,
    outside: 'retain',
    cancel: () => true,
    appearanceOwner: replacement.lease,
  })
  expect(candidate.element.dataset.fradeTheme).toBe('light')
  off()
  expect(candidate.element.dataset.fradeTheme).toBe('light')
  offNext()
  manager.dispose()
  replacement.participant.dispose()
  foreign.participant.dispose()
})
it('LDE-003 initial owned popup projects the supplied visible snapshot before first participant paint', () => {
  const f = fixture(),
    host = document.createElement('div')
  f.app.append(host)
  const input = value('dark', 'comfortable', true),
    before = JSON.stringify(input),
    options = { editorRoot: f.editor, editorRootSnapshot: input, paint: async () => {} }
  const participant = createNativeParticipant(
      f.graph as unknown as NativePresentationGraph,
      options,
    ),
    manager = createManagedOverlays(f.app, host),
    popup = ownedDialog(host, 'Before paint')
  const lease = getEditorAppearanceOwner(f.editor)!
  const off = manager.register({
    id: 'early',
    element: popup.element,
    priority: 100,
    modal: true,
    outside: 'retain',
    cancel: () => true,
    appearanceOwner: lease,
  })
  expect(popup.element.style.getPropertyValue('--frade-surface-overlay')).toBe('Canvas')
  expect(popup.element.dataset.fradeDensity).toBe('comfortable')
  expect(f.graph.drawBackground).not.toHaveBeenCalled()
  expect(f.graph.drawGrid).not.toHaveBeenCalled()
  expect(JSON.stringify(input)).toBe(before)
  off()
  manager.dispose()
  participant.dispose()
})
it('LDE-007 dirty guard retains every original byte outside the exact accepted metadata call', () => {
  const approved = JSON.parse(
    readFileSync(
      new NodeURL('./light-diagram-editor/accepted-guard-transform.json', import.meta.url),
      'utf8',
    ),
  )
  const published = JSON.parse(
    readFileSync(
      new NodeURL('./light-diagram-editor/published-git-guard-transform.json', import.meta.url),
      'utf8',
    ),
  )
  const sha = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')
  const verify = (guard: string) => {
    const record = [approved, published].find((item) => item.guardProposedSha256 === sha(guard))
    if (!record || guard.split(record.afterCall).length !== 2)
      throw Error('Unapproved dirty guard bytes')
    const reversed = guard.replace(record.afterCall, record.beforeCall)
    expect(Buffer.from(reversed)).toEqual(Buffer.from(record.guardBeforeBase64, 'base64'))
    expect(sha(reversed)).toBe(record.guardBeforeSha256)
  }
  const source = readFileSync(new NodeURL('../../src/Workbench.tsx', import.meta.url), 'utf8'),
    start = source.indexOf('  const guard = async (keys: string[]) => {'),
    end = source.indexOf('  const closeTab = async', start)
  verify(source.slice(start, end))
  for (const raw of [approved, published]) {
    const guard = Buffer.from(raw.guardProposedBase64, 'base64').toString('utf8')
    verify(guard)
    expect(() => verify(guard.replace('return false', 'return true'))).toThrow(
      'Unapproved dirty guard bytes',
    )
    expect(() => verify(guard.replace(raw.afterCall, raw.beforeCall))).toThrow(
      'Unapproved dirty guard bytes',
    )
  }
})

it('LDE upstream contract uses pinned panel color without changing workbench or author state', async () => {
  const css = readFileSync(
      new NodeURL('../../../../apps/desktop/vendor/drawio/styles/grapheditor.css', import.meta.url),
      'utf8',
    ),
    panel = css.match(/--ge-panel-color:\s*(#[0-9a-f]+);/i)?.[1]
  expect(panel).toBeDefined()
  const f = fixture(),
    input = value('dark', 'comfortable', false),
    beforeModel = JSON.stringify(f.model)
  applyRootSnapshot(f.app, input)
  const global = f.app.outerHTML,
    participant = createNativeParticipant(f.graph as unknown as NativePresentationGraph, {
      editorRoot: f.editor,
      paint: async () => {},
    })
  try {
    const handle = await participant.prepare(
      input,
      phase(7, 'prepare'),
      new AbortController().signal,
    )
    await handle.apply(phase(7), new AbortController().signal)
    expect(JSON.stringify(f.model)).toBe(beforeModel)
    expect(f.app.style.getPropertyValue('--frade-surface-panel')).toBe(
      input.effectiveColors['surface.panel'],
    )
    expect(f.editor.style.getPropertyValue('--frade-surface-panel').toUpperCase()).toBe(
      panel!.toUpperCase(),
    )
    expect(f.app.outerHTML).not.toBe(global)
    handle.dispose()
  } finally {
    participant.dispose()
  }
})

it('LDE upstream grid uses existing double mesh view while keeping semantic grid and exact disposal', async () => {
  const f = fixture(),
    before = JSON.stringify(f.model),
    originalType = f.graph.options.grid.type,
    originalArgs = { ...f.graph.options.grid.args },
    participant = createNativeParticipant(f.graph as unknown as NativePresentationGraph, {
      editorRoot: f.editor,
      paint: async () => {},
    })
  try {
    const handle = await participant.prepare(
      value('dark', 'comfortable', false),
      phase(7, 'prepare'),
      new AbortController().signal,
    )
    await handle.apply(phase(7), new AbortController().signal)
    expect(f.graph.options.grid.type).toBe('doubleMesh')
    expect(f.graph.options.grid.size).toBe(10)
    expect(f.graph.options.grid.visible).toBe(true)
    expect(JSON.stringify(f.model)).toBe(before)
    expect(f.forbidden).not.toHaveBeenCalled()
    handle.dispose()
  } finally {
    participant.dispose()
  }
  expect(f.graph.options.grid.type).toBe(originalType)
  expect(f.graph.options.grid.args).toEqual(originalArgs)
})
