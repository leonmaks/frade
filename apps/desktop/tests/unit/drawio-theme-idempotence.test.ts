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
  Object.defineProperty(graph, 'background', { get: () => '#213752', set: forbidden })
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

// The established fixture above is copied without changing historical assertions.
async function applyLight(f: ReturnType<typeof fixture>, revision: number) {
  f.send('prepare', context('prepare', revision, revision), snapshot('light', revision))
  expect(f.replies().at(-1)).toMatchObject({
    status: 'READY',
    context: context('prepare', revision, revision),
  })
  f.send('apply', context('apply', revision, revision))
  await f.paint()
  expect(f.replies().at(-1)).toMatchObject({
    status: 'PAINTED',
    context: context('apply', revision, revision),
  })
  f.assertSemantic()
}
it('serialized equal-appearance revision retains the owned stylesheet and avoids redundant root DOM mutations while waiting for paint', async () => {
  const f = fixture(true)
  await applyLight(f, 1)
  const style = document.querySelector('style[data-frade-private-theme]'),
    changes: string[] = [],
    observer = new MutationObserver((records) =>
      changes.push(...records.map((r) => r.attributeName!)),
    )
  observer.observe(document.documentElement, { attributes: true })
  try {
    f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
    f.send('apply', context('apply', 2, 2))
    expect(f.replies().at(-1)).toMatchObject({ status: 'READY', context: context('prepare', 2, 2) })
    await f.paint()
    expect(f.replies().at(-1)).toMatchObject({ status: 'PAINTED', context: context('apply', 2, 2) })
    expect(document.querySelector('style[data-frade-private-theme]')).toBe(style)
    expect(changes).toEqual(['data-frade-frame-revision'])
    f.assertSemantic()
  } finally {
    observer.disconnect()
  }
})
it.each([
  'text',
  'cssom',
  'detached',
  'disabled',
  'sheet-disabled',
  'media',
  'extra-attribute',
  'cascade',
])('equal-appearance frame replaces a damaged owned stylesheet: %s', async (kind) => {
  const f = fixture(true)
  await applyLight(f, 1)
  const style = document.querySelector<HTMLStyleElement>('style[data-frade-private-theme]')!,
    expected = style.textContent
  if (kind === 'text') style.textContent += 'body{}'
  if (kind === 'cssom') style.sheet!.deleteRule(0)
  if (kind === 'detached') style.remove()
  if (kind === 'disabled') style.disabled = true
  if (kind === 'sheet-disabled') style.sheet!.disabled = true
  if (kind === 'media') style.media = 'print'
  if (kind === 'extra-attribute') style.setAttribute('title', 'outside')
  if (kind === 'cascade') {
    const later = document.createElement('style')
    later.textContent = 'body{}'
    document.head.append(later)
  }
  await applyLight(f, 2)
  const current = document.querySelector<HTMLStyleElement>('style[data-frade-private-theme]')!
  expect(current).not.toBe(style)
  expect(current.parentNode).toBe(document.head)
  expect(current.nextSibling).toBeNull()
  expect(current.textContent).toBe(expected)
  expect(current.disabled).not.toBe(true)
  expect(current.sheet!.disabled).not.toBe(true)
  expect(current.media).toBe('')
  expect(current.getAttribute('title')).toBeNull()
  f.assertSemantic()
})
it('a changed frame appearance replaces its stylesheet and rollback keeps original two-frame and semantic guarantees', async () => {
  const f = fixture(true)
  await applyLight(f, 1)
  const first = document.querySelector('style[data-frade-private-theme]')
  f.send('prepare', context('prepare', 2, 2), snapshot('dark', 2))
  f.send('apply', context('apply', 2, 2))
  await f.paint()
  expect(document.querySelector('style[data-frade-private-theme]')).not.toBe(first)
  expect(document.documentElement.dataset.fradeFrameTheme).toBe('dark')
  f.send('rollback', context('rollback', 0, 3), snapshot('light', 0))
  expect(f.replies().at(-1)?.context.revision).toBe(2)
  await f.paint()
  expect(f.replies().at(-1)).toMatchObject({
    status: 'PAINTED',
    context: context('rollback', 0, 3),
  })
  expect(document.documentElement.dataset.fradeFrameTheme).toBe('light')
  f.assertSemantic()
})
it('retained frame style still repairs actual property priority and is removed with original ownership on disposal', async () => {
  const f = fixture(true)
  await applyLight(f, 1)
  const root = document.documentElement,
    name = '--frade-frame-text-primary',
    expected = root.style.getPropertyValue(name),
    style = document.querySelector('style[data-frade-private-theme]')!
  root.style.setProperty(name, expected, 'important')
  await applyLight(f, 2)
  expect(root.style.getPropertyValue(name)).toBe(expected)
  expect(root.style.getPropertyPriority(name)).toBe('')
  expect(document.querySelector('style[data-frade-private-theme]')).toBe(style)
  f.dispose()
  expect(style.isConnected).toBe(false)
  expect(root.style.getPropertyValue(name)).toBe('')
  f.assertSemantic()
})
