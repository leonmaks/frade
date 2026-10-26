// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest'
import { drawioThemeBridge } from '../../src/main/drawio-theme-bridge'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
const cleanup: (() => void)[] = []
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-frade-frame-runtime')
  document.documentElement.removeAttribute('data-frade-frame-theme')
  document.documentElement.removeAttribute('data-frade-frame-density')
  document.documentElement.removeAttribute('data-frade-frame-revision')
  document.documentElement.removeAttribute('style')
})
const snapshot = (
  mode: 'light' | 'dark' | 'high-contrast',
  revision: number,
  forcedColors = false,
) =>
  resolveTheme({
    registry: createThemeRegistry(),
    selection: { mode, density: 'comfortable' },
    environment: { forcedColors },
    revision,
  })
const context = (phase = 'prepare', revision = 1, generation = 1) => ({
  version: 1,
  requestId: 'window/' + generation,
  sessionId: 'window',
  generation,
  transactionId: 'window/' + generation,
  revision,
  membership: 1,
  phase,
})
function fixture(serialized = false) {
  document.body.innerHTML =
    '<div class="geEditor"><div class="geMenubarContainer"><button>UI command</button></div><div class="geDiagramContainer"><div id="paper" style="background-color: rgb(10, 30, 50); background-image: url(data:grid)"></div><svg><g><rect fill="#C83717" stroke="#167344"></rect></g></svg></div></div>'
  const container = document.querySelector<HTMLElement>('.geDiagramContainer')!,
    paper = document.getElementById('paper')!,
    canvas = container.querySelector('g')!,
    node = canvas.querySelector('rect')!,
    authoredBefore = node.outerHTML,
    paperBefore = paper.style.cssText,
    prefs = JSON.stringify({ gridColor: '#214A77', gridEnabled: true }),
    xml =
      '<mxGraphModel background="#213752"><root><mxCell style="fillColor=#C83717;strokeColor=#167344"/></root></mxGraphModel>',
    undo = Object.freeze(['dirty user edit']),
    selection = Object.freeze(['cell-1']),
    identity = { editor: 'stable' }
  localStorage.setItem('p01-prefs', prefs)
  const listeners = new Map<string, Set<() => void>>(),
    forbidden = vi.fn(() => {
      throw Error('Forbidden semantic/model/settings API')
    }),
    view = {
      canvas,
      backgroundPageShape: { node: paper },
      scale: 1.5,
      translate: { x: 12, y: 8 },
      addListener: (name: string, fn: () => void) => {
        const callbacks = listeners.get(name) ?? new Set()
        callbacks.add(fn)
        listeners.set(name, callbacks)
      },
      removeListener: (fn: () => void) => {
        for (const callbacks of listeners.values()) callbacks.delete(fn)
      },
    }
  const graph = {
    container,
    view,
    gridSize: 10,
    isGridEnabled: () => true,
    setCellStyles: forbidden,
    refresh: forbidden,
    getModel: forbidden,
    load: forbidden,
    import: forbidden,
    export: forbidden,
    identity,
    undo,
    selection,
  }
  Object.defineProperty(graph, 'background', {
    configurable: true,
    get: () => '#213752',
    set: forbidden,
  })
  const prototype = { init: vi.fn() },
    ui = {
      editor: {
        graph,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        load: forbidden,
        import: forbidden,
        export: forbidden,
      },
      setBackgroundColor: forbidden,
      setGridColor: forbidden,
    }
  vi.stubGlobal('mxSettings', new Proxy({}, { get: forbidden, set: forbidden }))
  Object.assign(window, { EditorUi: { prototype } })
  const frames: FrameRequestCallback[] = [],
    raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    }),
    post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
  const bridge = serialized
    ? (new Function('return (' + drawioThemeBridge.toString() + ')')() as typeof drawioThemeBridge)
    : drawioThemeBridge
  const dispose = bridge('frade://app')
  cleanup.push(dispose)
  const send = (
    operation: string,
    phase = context(
      operation === 'apply' ? 'apply' : operation === 'rollback' ? 'rollback' : 'prepare',
    ),
    value: unknown = operation === 'prepare' ? snapshot('dark', phase.revision) : undefined,
    patch: Record<string, unknown> = {},
    origin = 'frade://app',
    source: MessageEventSource | null = window.parent,
  ) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        source,
        origin,
        data: JSON.stringify({
          action: 'fradePresentation',
          version: 1,
          participantId: 'frame',
          participantGeneration: 7,
          context: phase,
          operation,
          ...(value ? { snapshot: value } : {}),
          ...patch,
        }),
      }),
    )
  window.dispatchEvent(
    new MessageEvent('message', {
      source: window.parent,
      origin: 'frade://app',
      data: JSON.stringify({ action: 'configure' }),
    }),
  )
  prototype.init.call(ui)
  const paint = async () => {
    for (let count = 0; count < 2; count++) {
      const callbacks = frames.splice(0)
      for (const callback of callbacks) callback(count * 16)
      await Promise.resolve()
    }
    await Promise.resolve()
  }
  const replies = () => post.mock.calls.map((call) => JSON.parse(String(call[0])))
  const assertSemantic = () => {
    expect(node.outerHTML).toBe(authoredBefore)
    expect(paper.style.cssText).toBe(paperBefore)
    expect(graph.identity).toBe(identity)
    expect(graph.undo).toBe(undo)
    expect(graph.selection).toBe(selection)
    expect(localStorage.getItem('p01-prefs')).toBe(prefs)
    expect(xml).toBe(
      '<mxGraphModel background="#213752"><root><mxCell style="fillColor=#C83717;strokeColor=#167344"/></root></mxGraphModel>',
    )
    expect(forbidden).not.toHaveBeenCalled()
  }
  return {
    send,
    paint,
    replies,
    post,
    raf,
    dispose,
    container,
    paper,
    node,
    graph,
    view,
    listeners,
    assertSemantic,
    ui,
  }
}

it('implicit backing follows author ownership and restores exactly without semantic writes', async () => {
  const f = fixture(true),
    svg = f.view.canvas.ownerSVGElement!
  svg.style.backgroundColor = 'white'
  svg.setAttribute('data-frade-presentation-workspace-backing', 'prior')
  let background: string | null = null
  Object.defineProperty(f.graph, 'background', { configurable: true, get: () => background })
  const styleBefore = svg.getAttribute('style')
  f.send('prepare')
  f.send('apply')
  await f.paint()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('1')
  background = '#213752'
  for (const callback of f.listeners.get('scale') ?? []) callback()
  await f.paint()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('prior')
  background = null
  for (const callback of f.listeners.get('scale') ?? []) callback()
  await f.paint()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('1')
  f.dispose()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('prior')
  expect(svg.getAttribute('style')).toBe(styleBefore)
  f.assertSemantic()
})

it('image-backed SVG and later foreign backing metadata are never claimed or overwritten', async () => {
  const f = fixture(),
    svg = f.view.canvas.ownerSVGElement!
  Object.defineProperty(f.graph, 'background', { configurable: true, get: () => null })
  const image = { src: 'data:fixture', width: 20, height: 20 }
  Object.assign(f.graph, { backgroundImage: image })
  f.send('prepare')
  f.send('apply')
  await f.paint()
  expect(svg.hasAttribute('data-frade-presentation-workspace-backing')).toBe(false)
  expect((f.graph as typeof f.graph & { backgroundImage: unknown }).backgroundImage).toBe(image)
  Object.assign(f.graph, { backgroundImage: null })
  for (const callback of f.listeners.get('scale') ?? []) callback()
  await f.paint()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('1')
  svg.setAttribute('data-frade-presentation-workspace-backing', 'foreign')
  f.dispose()
  expect(svg.getAttribute('data-frade-presentation-workspace-backing')).toBe('foreign')
  f.assertSemantic()
})

import { projectEditorPresentation } from '../../../../packages/ui-workspace/src/design/theme/editorPresentation'
it('upstream Light reveals original grid while forced rollback retains strict ACK and authored bytes', async () => {
  const f = fixture(true),
    ordinary = projectEditorPresentation(snapshot('dark', 1)),
    force = projectEditorPresentation(snapshot('dark', 2, true))
  f.send('prepare', context(), ordinary)
  f.send('apply')
  expect(f.replies().filter((reply) => reply.status === 'PAINTED')).toHaveLength(0)
  await f.paint()
  expect(document.querySelector('[data-frade-private-grid]')).toBeNull()
  expect(f.paper.hasAttribute('data-frade-presentation-grid-layer')).toBe(false)
  f.assertSemantic()
  f.send('prepare', context('prepare', 2, 2), force)
  f.send('apply', context('apply', 2, 2))
  await f.paint()
  expect(document.querySelector('[data-frade-private-grid] circle')?.getAttribute('fill')).toBe(
    'CanvasText',
  )
  f.assertSemantic()
  f.send('rollback', context('rollback', 1, 3), ordinary)
  await f.paint()
  expect(document.querySelector('[data-frade-private-grid]')).toBeNull()
  expect(f.replies().at(-1)).toMatchObject({
    status: 'PAINTED',
    context: context('rollback', 1, 3),
  })
  f.assertSemantic()
})
