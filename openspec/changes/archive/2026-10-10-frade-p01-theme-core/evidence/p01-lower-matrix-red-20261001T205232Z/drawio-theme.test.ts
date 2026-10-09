// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest'
import { drawioThemeBridge } from '../../src/main/drawio-theme-bridge'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
import { presentationRoles } from '@frade/runtime-contracts'
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
it('serialized bridge prepare leaves DOM/prefs/model untouched; apply ACK occurs only after subsequent paint', async () => {
  const f = fixture(true),
    before = document.documentElement.outerHTML
  f.send('prepare')
  expect(document.documentElement.outerHTML).toBe(before)
  expect(f.replies().at(-1)).toMatchObject({
    operation: 'prepare',
    status: 'READY',
    context: context(),
  })
  f.send('apply')
  expect(document.documentElement.dataset.fradeFrameTheme).toBe('dark')
  expect(f.replies().filter((reply) => reply.status === 'PAINTED')).toHaveLength(0)
  expect(document.querySelector('[data-frade-private-grid]')).toBeTruthy()
  f.assertSemantic()
  await f.paint()
  expect(f.replies().at(-1)).toMatchObject({
    operation: 'apply',
    status: 'PAINTED',
    context: context('apply'),
  })
  f.assertSemantic()
})
it('bridge rejects untrusted origin/source, incomplete roles, arbitrary CSS, unknown fields and stale owner', async () => {
  const f = fixture(),
    before = document.documentElement.outerHTML
  f.send('prepare', context(), snapshot('dark', 1), {}, 'https://untrusted.example')
  f.send('prepare', context(), snapshot('dark', 1), {}, 'frade://app', {} as Window)
  f.send('prepare', context(), {
    ...snapshot('dark', 1),
    colors: { 'surface.base': 'url(external)' },
  })
  f.send('prepare', context(), snapshot('dark', 1), { unknown: true })
  expect(document.documentElement.outerHTML).toBe(before)
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
  f.send('apply', context('apply', 1, 1))
  await f.paint()
  expect(document.documentElement.outerHTML).toBe(before)
  f.assertSemantic()
})
it('bridge rollback accepts new intent and restores presentation while retaining paper/image/node/edge paint and preferences', async () => {
  const f = fixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.send('rollback', context('rollback', 0, 2), snapshot('light', 0))
  expect(document.documentElement.dataset.fradeFrameTheme).toBe('light')
  await f.paint()
  expect(f.replies().at(-1)).toMatchObject({
    operation: 'rollback',
    status: 'PAINTED',
    context: context('rollback', 0, 2),
  })
  f.assertSemantic()
})
it('bridge owned grid follows view scale/translate and repairs vendor DOM redraw with a fresh paint acknowledgement', async () => {
  const f = fixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  const overlay = document.querySelector('[data-frade-private-grid]')!
  overlay.remove()
  f.view.scale = 2
  f.view.translate = { x: 4, y: 7 }
  for (const callback of f.listeners.get('scale') ?? []) callback()
  const next = document.querySelector('[data-frade-private-grid]')!
  expect(next).toBeTruthy()
  expect(next.querySelector('pattern')?.getAttribute('width')).toBe('20')
  expect(next.querySelector('pattern')?.getAttribute('x')).toBe('8')
  expect(next.querySelector('pattern')?.getAttribute('y')).toBe('14')
  await f.paint()
  expect(f.replies().filter((reply) => reply.status === 'PAINTED').length).toBeGreaterThan(1)
  f.assertSemantic()
})
it('bridge final forced projection uses only canonical trusted keywords while authored paper and paint stay unchanged', async () => {
  const f = fixture()
  f.send('prepare', context(), snapshot('light', 1, true))
  f.send('apply')
  await f.paint()
  const value = snapshot('light', 1, true)
  for (const role of presentationRoles)
    expect(
      document.documentElement.style.getPropertyValue('--frade-frame-' + role.replaceAll('.', '-')),
    ).toBe(value.effectiveColors[role])
  expect(document.querySelector('circle')?.getAttribute('fill')).toBe('CanvasText')
  f.assertSemantic()
})
it('bridge forwards contextual presentation chord only, respecting text/IME and existing vendor save/close', async () => {
  const f = fixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  const button = document.querySelector('button')!,
    input = document.createElement('input')
  document.body.append(input)
  const key = (target: Element, key: string, extra: KeyboardEventInit = {}) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    )
  key(input, 'k')
  key(button, 'k', { isComposing: true })
  key(button, 's')
  key(button, 'w')
  expect(f.replies().filter((reply) => reply.event === 'fradePresentationKey')).toHaveLength(0)
  key(button, 'k')
  key(button, 't')
  expect(
    f
      .replies()
      .filter((reply) => reply.event === 'fradePresentationKey')
      .map((reply) => reply.key),
  ).toEqual(['k', 't'])
  f.assertSemantic()
})
it('bridge teardown restores precisely owned DOM values and listener registrations without changing vendor state', async () => {
  document.documentElement.setAttribute('data-frade-frame-theme', 'prior-owner')
  document.documentElement.style.setProperty(
    '--frade-frame-surface-base',
    'prior-owner',
    'important',
  )
  const f = fixture(),
    before = document.documentElement.outerHTML
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.send('release', context())
  expect(document.querySelector('[data-frade-private-grid]')).toBeTruthy()
  f.dispose()
  expect(document.documentElement.outerHTML).toBe(before)
  for (const callbacks of f.listeners.values()) expect(callbacks.size).toBe(0)
  f.assertSemantic()
})

it('separate presentation channel never reaches downstream vendor semantic handler, while unrelated actions still do', () => {
  const f = fixture(true),
    semantic = vi.fn(),
    receive = (event: MessageEvent) => semantic(JSON.parse(event.data))
  window.addEventListener('message', receive)
  try {
    f.send('prepare')
    expect(f.replies().at(-1)?.status).toBe('READY')
    expect(semantic).not.toHaveBeenCalled()
    f.send('prepare', context('prepare'), snapshot('dark', 1), { unrecognized: true })
    expect(semantic).not.toHaveBeenCalled()
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window.parent,
        origin: 'frade://app',
        data: JSON.stringify({ action: 'load', xml: 'observed semantic payload' }),
      }),
    )
    expect(semantic).toHaveBeenCalledExactlyOnceWith({
      action: 'load',
      xml: 'observed semantic payload',
    })
    f.assertSemantic()
  } finally {
    window.removeEventListener('message', receive)
  }
})

function lowerFixture() {
  const f = fixture(true)
  const lower = document.createElement('div')
  lower.className = 'geTabContainer'
  lower.innerHTML =
    '<div class="geTab geControlTab" title="Pages"><div class="geButton"></div></div><div class="geTabScroller"><div class="geTab gePageTab geActivePage"><span>Workshop</span><div class="geButton"></div></div><div class="geTab gePageTab"><span>Second</span><div class="geButton"></div></div></div>'
  f.container.parentElement!.append(lower)
  const pages = lower.firstElementChild as HTMLElement
  const shim = document.createElement('textarea')
  shim.className = 'mxTypingShim'
  shim.tabIndex = -1
  f.container.append(shim)
  Object.assign(f.ui, {
    tabContainer: lower,
    tabScroller: lower.lastElementChild,
    pageMenuTab: pages,
    typingShim: shim,
  })
  Object.assign(f.graph, { isEnabled: () => true, isEditing: () => false, isMouseDown: false })
  Object.assign(window, {
    mxResources: {
      get: (key: string) =>
        ({ pages: 'Pages', previousPage: 'Previous page', nextPage: 'Next page' })[key],
    },
    mxClient: { IS_POINTER: false },
  })
  for (const group of Array.from(lower.querySelectorAll<HTMLElement>('.gePageTab'))) {
    const down = vi.fn(),
      up = vi.fn()
    for (const node of [group, group.querySelector<HTMLElement>('.geButton')!]) {
      node.addEventListener('mousedown', down)
      node.addEventListener('mouseup', up)
      Object.assign(node, {
        mxListenerList: [
          { name: 'mousedown', f: down },
          { name: 'mouseup', f: up },
        ],
      })
    }
  }
  const original = vi.fn()
  pages.addEventListener('click', original)
  Object.assign(pages, { mxListenerList: [{ name: 'click', f: original }] })
  const key = (target: HTMLElement, key: string, extra: KeyboardEventInit = {}) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }),
    )
  return { ...f, lower, pages, shim, original, key }
}
it('P01-LOWER serialized F6 enters from idle canvas shim, arrows only focus and Enter runs original DOM action once', async () => {
  const f = lowerFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.shim.focus()
  f.key(f.shim, 'F6')
  expect(f.lower.contains(document.activeElement)).toBe(true)
  expect(document.activeElement?.getAttribute('role')).toBe('button')
  f.key(document.activeElement as HTMLElement, 'End')
  expect(document.activeElement?.getAttribute('aria-label')).toContain('Second')
  expect(f.original).not.toHaveBeenCalled()
  f.key(document.activeElement as HTMLElement, 'Home')
  f.key(document.activeElement as HTMLElement, 'Enter')
  expect(f.original).toHaveBeenCalledTimes(1)
  f.assertSemantic()
  f.dispose()
  expect(f.pages.hasAttribute('role')).toBe(false)
  expect(f.pages.hasAttribute('tabindex')).toBe(false)
})

function lowerMenuFixture() {
  const f = lowerFixture(),
    effects: string[] = []
  type Row = HTMLTableRowElement & {
    div?: HTMLDivElement
    tbody?: HTMLTableSectionElement
    activeRow?: Row
  }
  const div = document.createElement('div'),
    table = document.createElement('table'),
    tbody = document.createElement('tbody')
  div.className = table.className = 'mxPopupMenu'
  div.append(table)
  table.append(tbody)
  const menu = {
    div,
    tbody,
    activeRow: undefined as Row | undefined,
    eventReceiver: undefined as Row | undefined,
    hideSubmenu(scope: { activeRow?: Row }) {
      scope.activeRow?.div?.remove()
      scope.activeRow = undefined
    },
    hideMenu() {
      this.hideSubmenu(this)
      div.remove()
      Object.assign(f.ui, { currentMenu: null })
    },
  }
  const listen = (node: HTMLElement, name: string, fn: EventListener) => {
    node.addEventListener(name, fn)
    const value = node as HTMLElement & { mxListenerList?: { name: string; f: EventListener }[] }
    ;(value.mxListenerList ??= []).push({ name, f: fn })
  }
  const item = (
    parent: typeof menu | Row,
    label: string,
    action?: () => void,
    disabled = false,
  ) => {
    const row = document.createElement('tr') as Row
    row.className = 'mxPopupMenuItem'
    row.innerHTML =
      '<td class="mxPopupMenuIcon"></td><td class="mxPopupMenuItem"></td><td class="mxPopupMenuItem"></td>'
    row.cells[1].textContent = label
    if (disabled) row.cells[1].classList.add('mxDisabled')
    parent.tbody!.append(row)
    if (!disabled) {
      listen(row, 'mousedown', (event) => {
        menu.eventReceiver = row
        if (parent.activeRow !== row) {
          menu.hideSubmenu(parent)
          if (row.div) {
            document.body.append(row.div)
            parent.activeRow = row
          }
        }
        event.stopPropagation()
        event.preventDefault()
      })
      listen(row, 'mousemove', () => {
        if (row.div) {
          document.body.append(row.div)
          parent.activeRow = row
        }
      })
      listen(row, 'mouseup', (event) => {
        if (menu.eventReceiver === row) {
          if (parent.activeRow !== row) menu.hideMenu()
          action?.()
          menu.eventReceiver = undefined
        }
        event.stopPropagation()
        event.preventDefault()
      })
    }
    return row
  }
  const rename = item(menu, 'Rename', () => effects.push('rename'))
  const move = item(menu, 'Move')
  move.div = document.createElement('div')
  move.div.className = 'mxPopupMenu'
  move.tbody = document.createElement('tbody')
  const subtable = document.createElement('table')
  subtable.className = 'mxPopupMenu'
  subtable.append(move.tbody)
  move.div.append(subtable)
  const first = item(move, 'First', () => effects.push('move-first'))
  const disabled = item(menu, 'Unavailable', () => effects.push('forbidden'), true)
  const open = () => {
    document.body.append(div)
    Object.assign(f.ui, { currentMenu: menu })
  }
  f.pages.addEventListener('click', open)
  Object.assign(f.ui, { hideCurrentMenu: () => menu.hideMenu() })
  Object.assign(window, { mxClient: { IS_POINTER: false } })
  return { ...f, menu, rename, move, first, disabled, effects }
}
it('P01-LOWER captured original popup provides focus-only rows, original submenu gestures, exactly-once activation and Escape/Tab cleanup', async () => {
  const f = lowerMenuFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.shim.focus()
  f.key(f.shim, 'F6')
  f.key(document.activeElement as HTMLElement, 'Enter')
  expect(f.menu.div.getAttribute('role')).toBe('menu')
  expect(document.activeElement).toBe(f.rename)
  expect(f.disabled.getAttribute('aria-disabled')).toBe('true')
  f.key(f.rename, 'ArrowDown')
  expect(document.activeElement).toBe(f.move)
  expect(f.effects).toEqual([])
  f.key(f.move, 'ArrowRight')
  expect(document.activeElement).toBe(f.first)
  expect(f.move.getAttribute('aria-expanded')).toBe('true')
  f.key(f.first, 'ArrowLeft')
  expect(document.activeElement).toBe(f.move)
  expect(f.first.isConnected).toBe(false)
  f.key(f.move, 'Home')
  f.key(f.rename, 'Enter')
  expect(f.effects).toEqual(['rename'])
  await Promise.resolve()
  expect(f.menu.div.hasAttribute('role')).toBe(false)
  f.pages.focus()
  f.key(f.pages, 'Enter')
  f.key(f.rename, 'Escape')
  expect(f.menu.div.isConnected).toBe(false)
  expect(document.activeElement).toBe(f.pages)
  f.key(f.pages, 'Enter')
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
  f.rename.dispatchEvent(tab)
  expect(tab.defaultPrevented).toBe(false)
  expect(f.menu.div.isConnected).toBe(false)
  f.assertSemantic()
})
it('P01-LOWER editing/IME, unowned and stale menus cannot acquire lower ownership or activate actions', async () => {
  const f = lowerMenuFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()
  f.key(input, 'F6')
  expect(document.activeElement).toBe(input)
  f.shim.focus()
  f.key(f.shim, 'F6', { isComposing: true })
  expect(document.activeElement).toBe(f.shim)
  document.body.append(f.menu.div)
  Object.assign(f.ui, { currentMenu: f.menu })
  f.rename.tabIndex = 0
  f.rename.focus()
  f.key(f.rename, 'Enter')
  expect(f.effects).toEqual([])
  expect(f.menu.div.hasAttribute('role')).toBe(false)
  f.menu.hideMenu()
  f.shim.focus()
  f.key(f.shim, 'F6')
  f.key(document.activeElement as HTMLElement, 'Enter')
  expect(f.menu.div.getAttribute('role')).toBe('menu')
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
  f.key(f.rename, 'Enter')
  expect(f.effects).toEqual([])
  expect(f.menu.div.hasAttribute('role')).toBe(false)
  f.dispose()
  expect(f.pages.hasAttribute('role')).toBe(false)
  f.assertSemantic()
})

it('P01-LOWER real capability removal and restoration, hidden controls and regenerated DOM retain exact original handlers', async () => {
  const f = lowerFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.classList.add('mxDisabled')
  await Promise.resolve()
  expect(f.pages.getAttribute('aria-disabled')).toBe('true')
  f.pages.classList.remove('mxDisabled')
  await Promise.resolve()
  expect(f.pages.getAttribute('aria-disabled')).toBe('false')
  f.pages.style.display = 'none'
  await Promise.resolve()
  expect(f.pages.tabIndex).toBe(-1)
  f.pages.style.display = ''
  await Promise.resolve()
  f.pages.focus()
  f.key(f.pages, 'Enter', { repeat: true })
  expect(f.original).not.toHaveBeenCalled()
  f.pages.click()
  expect(f.original).toHaveBeenCalledTimes(1)
  f.pages.remove()
  await Promise.resolve()
  expect(f.pages.hasAttribute('role')).toBe(false)
  expect(f.pages.hasAttribute('aria-disabled')).toBe(false)
  f.assertSemantic()
})
it('P01-LOWER pointer registrations execute one original family only and menu DOM ownership restores exact prior values', async () => {
  const f = lowerMenuFixture()
  const rename = f.rename as unknown as HTMLElement & {
    mxListenerList: { name: string; f: EventListener }[]
  }
  const calls: string[] = []
  for (const registration of rename.mxListenerList) {
    rename.removeEventListener(registration.name, registration.f)
    registration.name = registration.name.replace('mouse', 'pointer')
    const original = registration.f
    registration.f = (event) => {
      calls.push(event.type)
      original(event)
    }
    rename.addEventListener(registration.name, registration.f)
  }
  Object.assign(window, { mxClient: { IS_POINTER: true }, PointerEvent: MouseEvent })
  f.menu.div.setAttribute('role', 'prior-menu-owner')
  f.rename.setAttribute('tabindex', '-1')
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  f.key(f.rename, 'Enter')
  expect(calls).toEqual(['pointerdown', 'pointerup'])
  expect(f.effects).toEqual(['rename'])
  await Promise.resolve()
  expect(f.menu.div.getAttribute('role')).toBe('prior-menu-owner')
  expect(f.rename.getAttribute('tabindex')).toBe('-1')
  f.assertSemantic()
})

it('P01-LOWER original action recreating the strip returns focus to a connected proven replacement', async () => {
  const f = lowerMenuFixture()
  const replacement = document.createElement('div')
  replacement.className = 'geTab geControlTab'
  replacement.title = 'Pages'
  replacement.addEventListener('click', f.original)
  Object.assign(replacement, { mxListenerList: [{ name: 'click', f: f.original }] })
  f.rename.addEventListener('mouseup', () => {
    f.pages.replaceWith(replacement)
    Object.assign(f.ui, { pageMenuTab: replacement })
  })
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  f.key(f.rename, 'Enter')
  expect(f.effects).toEqual(['rename'])
  expect(document.activeElement).toBe(replacement)
  expect(f.pages.hasAttribute('role')).toBe(false)
  f.assertSemantic()
})

it('P01-LOWER original lower opening that recreates its opener binds only a unique connected DOM-identical replacement', async () => {
  const f = lowerMenuFixture()
  const replacement = document.createElement('div')
  replacement.className = 'geTab geControlTab'
  replacement.title = 'Pages'
  replacement.addEventListener('click', f.original)
  Object.assign(replacement, { mxListenerList: [{ name: 'click', f: f.original }] })
  f.pages.addEventListener('click', () => {
    f.pages.replaceWith(replacement)
    Object.assign(f.ui, { pageMenuTab: replacement })
  })
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  expect(f.pages.isConnected).toBe(false)
  expect(f.menu.div.getAttribute('role')).toBe('menu')
  expect(document.activeElement).toBe(f.rename)
  f.key(f.rename, 'Escape')
  expect(document.activeElement).toBe(replacement)
  f.assertSemantic()
})
