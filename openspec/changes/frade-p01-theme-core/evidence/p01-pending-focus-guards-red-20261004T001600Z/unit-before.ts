// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest'
import { drawioThemeBridge } from '../../src/main/drawio-theme-bridge'
import { createThemeRegistry } from '@frade/ui-workspace/design/theme/registry'
import { resolveTheme } from '@frade/ui-workspace/design/theme/resolver'
import { presentationRoles } from '@frade/runtime-contracts'
import { createFrameParticipant } from '@frade/ui-workspace/design/theme'
import type { PhaseContext } from '@frade/ui-workspace/design/theme/service'
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

it('P01-LOWER checkability comes from the original actual checkmark and is restored with its DOM unchanged', async () => {
  const f = lowerMenuFixture(),
    mark = document.createElement('div')
  Object.assign(window, { Editor: { checkmarkImage: 'data:original-checkmark' } })
  mark.style.backgroundImage = 'url("data:original-checkmark")'
  f.rename.children[1].append(mark)
  const originalImage = mark.outerHTML
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  await Promise.resolve()
  await Promise.resolve()
  expect(f.rename.getAttribute('role')).toBe('menuitemcheckbox')
  expect(f.rename.getAttribute('aria-checked')).toBe('true')
  expect(f.move.hasAttribute('aria-checked')).toBe(false)
  f.key(f.rename, 'Escape')
  expect(mark.outerHTML).toBe(originalImage)
  expect(f.rename.hasAttribute('aria-checked')).toBe(false)
  f.assertSemantic()
})

it('P01-LOWER Tab dismisses owned menu and permits native focus navigation without downstream vendor key activation', async () => {
  const f = lowerMenuFixture(),
    vendorKey = vi.fn()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  document.addEventListener('keydown', vendorKey)
  try {
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    f.rename.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(f.menu.div.isConnected).toBe(false)
    expect(vendorKey).not.toHaveBeenCalled()
    f.assertSemantic()
  } finally {
    document.removeEventListener('keydown', vendorKey)
  }
})
it('P01-LOWER prepare keeps menu DOM untouched and applied new ownership cancels it through original UI hide lifecycle', async () => {
  const f = lowerMenuFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  const originalHide = f.menu.hideMenu
  const originalMenuDOM = f.menu.div.outerHTML
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
  await Promise.resolve()
  await Promise.resolve()
  expect(f.menu.div.outerHTML).toBe(originalMenuDOM)
  expect(f.menu.div.isConnected).toBe(true)
  f.send('apply', context('apply', 2, 2))
  await f.paint()
  expect(f.menu.div.isConnected).toBe(false)
  expect(f.menu.hideMenu).toBe(originalHide)
  expect(f.menu.div.hasAttribute('role')).toBe(false)
  expect(f.effects).toEqual([])
  f.assertSemantic()
})

it('P01-LOWER detached original glyph restores exact prior style during lower recreation', async () => {
  const f = lowerFixture()
  const glyph = f.lower.querySelector('.gePageTab .geButton') as HTMLElement
  glyph.style.backgroundImage = 'url("original-icon.svg")'
  const original = glyph.getAttribute('style')
  f.send('prepare')
  f.send('apply')
  await f.paint()
  expect(glyph.style.backgroundImage).toBe('none')
  glyph.parentElement!.remove()
  await Promise.resolve()
  await Promise.resolve()
  expect(glyph.getAttribute('style')).toBe(original)
  f.assertSemantic()
})
it('P01-LOWER owned menu glyph teardown preserves an originally present empty style attribute', async () => {
  const f = lowerMenuFixture(),
    cell = f.rename.children[0] as HTMLElement,
    image = document.createElement('img')
  image.src = 'original-icon.svg'
  cell.append(image)
  cell.setAttribute('style', '')
  const originalStyle = cell.getAttribute('style')
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  expect(cell.style.getPropertyValue('mask-image')).not.toBe('')
  f.key(f.rename, 'Escape')
  expect(cell.getAttribute('style')).toBe(originalStyle)
  f.assertSemantic()
})

it('P01-POST-B01 stale key after next prepare preserves original cancellation lease through matching apply', async () => {
  const f = lowerMenuFixture()
  const hide = vi.spyOn(f.menu, 'hideMenu')
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.pages.focus()
  f.key(f.pages, 'Enter')
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
  f.key(f.rename, 'Enter')
  expect(f.effects).toEqual([])
  expect(f.menu.div.hasAttribute('role')).toBe(false)
  expect(f.menu.div.isConnected).toBe(true)
  f.send('apply', context('apply', 2, 2))
  await f.paint()
  expect(hide).toHaveBeenCalledTimes(1)
  expect(f.menu.div.isConnected).toBe(false)
  expect(f.effects).toEqual([])
  f.assertSemantic()
})
it('P01-POST-B02 Escape leaves lower navigation for the remembered original idle canvas without actions', async () => {
  const f = lowerFixture()
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.shim.focus()
  f.key(f.shim, 'F6')
  expect(document.activeElement).toBe(f.pages)
  f.key(f.pages, 'Escape')
  expect(document.activeElement).toBe(f.shim)
  expect(f.original).not.toHaveBeenCalled()
  f.assertSemantic()
})
it('P01-POST-B03 focus-only End reveals a clipped original lower target and its ring by local scroller scroll only', async () => {
  const f = lowerFixture(),
    scroller = f.lower.querySelector('.geTabScroller') as HTMLElement,
    target = f.lower.querySelectorAll<HTMLElement>('.gePageTab .geButton')[1]
  Object.defineProperty(scroller, 'clientWidth', { value: 200 })
  Object.defineProperty(scroller, 'clientLeft', { value: 0 })
  scroller.getBoundingClientRect = () => new DOMRect(0, 0, 200, 60)
  target.getBoundingClientRect = () => new DOMRect(400 - scroller.scrollLeft, 16, 28, 36)
  f.send('prepare')
  f.send('apply')
  await f.paint()
  f.shim.focus()
  f.key(f.shim, 'F6')
  f.key(f.pages, 'End')
  expect(document.activeElement).toBe(target)
  expect(scroller.scrollLeft).toBeGreaterThan(0)
  expect(target.getBoundingClientRect().right + 4).toBeLessThanOrEqual(200)
  expect(target.getBoundingClientRect().left - 4).toBeGreaterThanOrEqual(0)
  expect(f.original).not.toHaveBeenCalled()
  f.assertSemantic()
})


function lowerLayoutFixture(width = 501, childLeft = 5) {
  let viewportWidth = width, coarse = false
  const widthBefore = Object.getOwnPropertyDescriptor(window, 'innerWidth')!
  const heightBefore = Object.getOwnPropertyDescriptor(window, 'innerHeight')!
  const mediaBefore = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  const callbacks = new Set<() => void>()
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => viewportWidth })
  Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => 423 })
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    media: query, get matches() { return query.includes('coarse') && coarse },
    addEventListener: (_: string, fn: () => void) => { callbacks.add(fn) },
    removeEventListener: (_: string, fn: () => void) => { callbacks.delete(fn) },
  }) })
  const f = lowerMenuFixture()
  cleanup.push(() => {
    Object.defineProperty(window, 'innerWidth', widthBefore)
    Object.defineProperty(window, 'innerHeight', heightBefore)
    if (mediaBefore) Object.defineProperty(window, 'matchMedia', mediaBefore)
    else delete (window as unknown as { matchMedia?: unknown }).matchMedia
  })
  const root = f.menu.div, child = f.move.div!, panels = [root, child]
  const tables = panels.map(node => node.querySelector('table')!)
  root.style.setProperty('left', '70px', 'important'); root.style.top = '270px'
  child.style.left = childLeft + 'px'; child.style.top = '270px'
  tables[0].setAttribute('style', '')
  const original = panels.map(node => node.outerHTML)
  panels.forEach((panel, index) => {
    panel.getBoundingClientRect = () => {
      const naturalWidth = index ? 278 : 246, currentWidth = Number.parseFloat(panel.style.width) || naturalWidth
      const label = panel.querySelector<HTMLElement>('tr>td:nth-child(2)')!
      const wrapped = label.style.whiteSpace === 'normal' && currentWidth < naturalWidth
      return new DOMRect(Number.parseFloat(panel.style.left), Number.parseFloat(panel.style.top), currentWidth,
        144 + (wrapped ? 36 : 0) + (coarse ? 120 : 0))
    }
    const table = tables[index]
    table.getBoundingClientRect = () => { const b = panel.getBoundingClientRect(); return new DOMRect(b.left+5,b.top+5,b.width-10,b.height-10) }
    Array.from(table.rows).forEach((row, n) => {
      row.getBoundingClientRect = () => { const b=table.getBoundingClientRect(); return new DOMRect(b.left,b.top+n*36,b.width,36) }
      Array.from(row.cells).forEach((cell, col) => {
        cell.getBoundingClientRect = () => { const b=row.getBoundingClientRect(); return new DOMRect(b.left+(col?28:0),b.top,col===1?b.width-42:col===0?28:14,b.height) }
      })
    })
  })
  const fitting = vi.fn(() => { throw Error('Bridge must never call vendor fit') })
  vi.stubGlobal('mxUtils', { fit: fitting })
  const open = async () => {
    f.send('prepare'); f.send('apply'); await f.paint()
    f.pages.focus(); f.key(f.pages, 'Enter'); f.key(f.move, 'ArrowRight')
    await Promise.resolve(); await Promise.resolve()
  }
  const assertBounds = () => {
    const [a,c] = panels.map(node=>node.getBoundingClientRect())
    for (const r of [a,c]) { expect(r.left).toBeGreaterThanOrEqual(4); expect(r.right).toBeLessThanOrEqual(viewportWidth-4)
      expect(r.top).toBeGreaterThanOrEqual(4); expect(r.bottom).toBeLessThanOrEqual(419); expect(r.width).toBeGreaterThanOrEqual(44) }
    expect(a.right+4<=c.left || c.right+4<=a.left).toBe(true)
    expect(root.contains(f.move)).toBe(true); expect(child.contains(f.first)).toBe(true)
    expect(document.activeElement).toBe(f.first); expect(f.effects).toEqual([])
    expect(fitting).not.toHaveBeenCalled(); f.assertSemantic()
  }
  return { ...f,root,child,tables,original,fitting,open,assertBounds,callbacks,
    resize: async (next:number)=>{viewportWidth=next;window.dispatchEvent(new Event('resize'));await Promise.resolve();await Promise.resolve()},
    media: async (next:boolean)=>{coarse=next;for(const callback of callbacks)callback();await Promise.resolve();await Promise.resolve()},
  }
}
it('P01-REFLOW serialized narrow chain wraps original labels, fits viewport and restores exact panel/table/cell styles', async () => {
  const f=lowerLayoutFixture(), originalHide=f.menu.hideMenu, label=f.rename.textContent
  await f.open();f.assertBounds()
  expect(f.rename.textContent).toBe(label);expect(f.rename.cells[1].style.whiteSpace).toBe('normal')
  f.key(f.first,'ArrowLeft');expect(f.child.outerHTML).toBe(f.original[1]);expect(f.tables[1].hasAttribute('style')).toBe(false)
  f.key(f.move,'Escape');expect(f.root.outerHTML).toBe(f.original[0]);expect(f.tables[0].getAttribute('style')).toBe('')
  expect(f.menu.hideMenu).toBe(originalHide);expect(f.effects).toEqual([]);f.assertSemantic()
})
it('P01-REFLOW feasible anchor/side stays exact and open-chain resize/media avoids observer write loops', async () => {
  const f=lowerLayoutFixture(700,321), positions=[f.root.style.cssText,f.child.style.cssText]
  await f.open();expect([f.root.style.cssText,f.child.style.cssText]).toEqual(positions)
  await f.resize(501);f.assertBounds()
  const rootWrites=vi.spyOn(f.root.style,'setProperty'),childWrites=vi.spyOn(f.child.style,'setProperty')
  const owned = [f.root,f.child,...f.root.querySelectorAll<HTMLElement>('table,td'),...f.child.querySelectorAll<HTMLElement>('table,td')]
  const settledStyles = owned.map(node=>node.getAttribute('style'))
  for(let n=0;n<6;n++){f.lower.setAttribute('title','actual observer trigger '+n);await Promise.resolve();await Promise.resolve()
    expect(owned.map(node=>node.getAttribute('style'))).toEqual(settledStyles);f.assertBounds()}
  expect(rootWrites).not.toHaveBeenCalled();expect(childWrites).not.toHaveBeenCalled()
  await f.resize(700);expect([f.root.style.cssText,f.child.style.cssText]).toEqual(positions)
  await f.media(true);expect(f.callbacks.size).toBeGreaterThan(0);f.assertBounds()
  f.dispose();expect(f.callbacks.size).toBe(0);expect(f.root.outerHTML).toBe(f.original[0]);expect(f.child.outerHTML).toBe(f.original[1]);f.assertSemantic()
})
it('P01-REFLOW deferred original fit, stale cancellation lease and unowned panels retain bounded ownership', async () => {
  const f=lowerLayoutFixture();await f.open();f.assertBounds()
  f.root.style.left='999px';await Promise.resolve();await Promise.resolve();f.assertBounds()
  f.key(f.first,'ArrowLeft');expect(f.child.outerHTML).toBe(f.original[1])
  f.send('prepare',context('prepare',2,2),snapshot('light',2));f.key(f.rename,'Enter')
  expect(f.root.outerHTML).toBe(f.original[0]);expect(f.root.isConnected).toBe(true)
  f.send('apply',context('apply',2,2));await f.paint();expect(f.root.isConnected).toBe(false);expect(f.effects).toEqual([])
  document.body.append(f.root);Object.assign(f.ui,{currentMenu:f.menu});const excluded=f.root.outerHTML
  await f.resize(400);expect(f.root.outerHTML).toBe(excluded);expect(f.fitting).not.toHaveBeenCalled();f.assertSemantic()
})

it('P01-REFLOW impossible owned capacity reports refusal without hidden labels or semantic/fitting actions', async () => {
  const f=lowerLayoutFixture(88)
  await f.open()
  expect(f.replies().some(reply=>reply.status==='REFUSED' && reply.message.includes('LOWER_MENU_REFLOW_UNAVAILABLE'))).toBe(true)
  expect(f.rename.textContent).toContain('Rename');expect(f.first.textContent).toContain('First')
  expect(f.root.style.display).not.toBe('none');expect(f.child.style.display).not.toBe('none')
  expect(f.effects).toEqual([]);expect(f.fitting).not.toHaveBeenCalled();f.assertSemantic()
})

it('P01-B05 impossible root stops adoption, cancels the original menu, restores exact state and permits feasible original retry', async () => {
  const f=lowerLayoutFixture(40)
  await f.open()
  expect(f.root.isConnected).toBe(false);expect(f.root.outerHTML).toBe(f.original[0]);expect(f.child.outerHTML).toBe(f.original[1])
  expect(f.pages.getAttribute('aria-expanded')).toBe('false');expect(document.activeElement).toBe(f.pages)
  for(let n=0;n<6;n++){f.lower.setAttribute('title','refused observer '+n);await Promise.resolve();await Promise.resolve()}
  expect(f.replies().filter(reply=>reply.status==='REFUSED')).toHaveLength(1)
  await f.resize(501);f.key(f.pages,'Enter');f.key(f.move,'ArrowRight');f.assertBounds()
  expect(f.effects).toEqual([]);f.assertSemantic()
})
it('P01-B05 serialized bridge refusal reaches the actual painted parent after release and cancels an open chain on resize', async () => {
  const f=lowerLayoutFixture(700,321),parentFrame=document.createElement('iframe');document.body.append(parentFrame)
  const diagnostic=vi.fn(),invalidated=vi.fn(),parentPost=vi.spyOn(parentFrame.contentWindow!,'postMessage').mockImplementation(()=>{})
  const parent=createFrameParticipant(parentFrame,{id:'frame',generation:7,sessionId:'window',onPresentationDiagnostic:diagnostic,onInvalidated:invalidated})
  cleanup.push(()=>{parent.dispose();parentPost.mockRestore();parentFrame.remove()})
  let delivered=0
  const deliver=()=>{const records=f.post.mock.calls;for(;delivered<records.length;delivered++)window.dispatchEvent(new MessageEvent('message',{source:parentFrame.contentWindow,origin:'frade://drawio',data:String(records[delivered][0])}))}
  const prepared=parent.prepare(snapshot('dark',1),context('prepare') as PhaseContext,new AbortController().signal)
  f.send('prepare');deliver();const handle=await prepared
  const apply=handle.apply(context('apply') as PhaseContext,new AbortController().signal),settled=vi.fn(),rejected=vi.fn()
  void apply.then(settled,rejected);f.send('apply');await f.paint();deliver();const ack=await apply;handle.dispose()
  f.pages.focus();f.key(f.pages,'Enter');f.key(f.move,'ArrowRight');f.assertBounds()
  const parentBefore=parentFrame.outerHTML,posts=parentPost.mock.calls.length
  await f.resize(88);deliver()
  expect(diagnostic.mock.calls).toEqual([['LOWER_MENU_REFLOW_UNAVAILABLE: original targets cannot fit without forbidden behavior']])
  expect(f.root.isConnected).toBe(false);expect(f.child.isConnected).toBe(false)
  expect(f.root.outerHTML).toBe(f.original[0]);expect(f.child.outerHTML).toBe(f.original[1]);expect(document.activeElement).toBe(f.pages)
  expect(settled).toHaveBeenCalledTimes(1);expect(rejected).not.toHaveBeenCalled();expect(await apply).toBe(ack)
  expect(parentFrame.outerHTML).toBe(parentBefore);expect(parentPost.mock.calls).toHaveLength(posts);expect(invalidated).not.toHaveBeenCalled()
  expect(f.effects).toEqual([]);expect(f.fitting).not.toHaveBeenCalled();f.assertSemantic()
})

it('P01-B05 original mouse root opening and open-chain media refusal stop without repeated diagnostics or hidden success', async () => {
  const f=lowerLayoutFixture(40);f.send('prepare');f.send('apply');await f.paint()
  f.pages.click();await Promise.resolve();await Promise.resolve()
  expect(f.root.isConnected).toBe(false);expect(f.root.outerHTML).toBe(f.original[0]);expect(document.activeElement).toBe(f.pages)
  expect(f.replies().filter(reply=>reply.status==='REFUSED')).toHaveLength(1)
  await f.resize(501);f.pages.focus();f.key(f.pages,'Enter');f.key(f.move,'ArrowRight');f.assertBounds()
  await f.resize(88);await f.media(true)
  expect(f.root.isConnected).toBe(false);expect(f.child.isConnected).toBe(false)
  expect(f.replies().filter(reply=>reply.status==='REFUSED')).toHaveLength(1)
  expect(f.root.outerHTML).toBe(f.original[0]);expect(f.child.outerHTML).toBe(f.original[1]);f.assertSemantic()
})

// P01-UPPER-THREE: original assets; append-only ownership/lifecycle regressions.
const upperOriginalUrls = [
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjMDAwMDAwIj48cGF0aCBkPSJNMjAwLTEyMHEtMzMgMC01Ni41LTIzLjVUMTIwLTIwMHYtNTYwcTAtMzMgMjMuNS01Ni41VDIwMC04NDBoNTYwcTMzIDAgNTYuNSAyMy41VDg0MC03NjB2NTYwcTAgMzMtMjMuNSA1Ni41VDc2MC0xMjBIMjAwWm0xMjAtODB2LTU2MEgyMDB2NTYwaDEyMFptODAgMGgzNjB2LTU2MEg0MDB2NTYwWm0tODAgMEgyMDBoMTIwWiIvPjwvc3ZnPg==",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTkgMTNoLTZ2NmgtMnYtNkg1di0yaDZWNWgydjZoNnYyeiIvPjwvc3ZnPg==",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjRweCIgZmlsbD0iIzAwMDAwMCI+PHJlY3QgZmlsbD0ibm9uZSIgaGVpZ2h0PSIyNCIgd2lkdGg9IjI0Ii8+PHBhdGggZD0iTTQuNSw4YzEuMDQsMCwyLjM0LTEuNSw0LjI1LTEuNWMxLjUyLDAsMi43NSwxLjIzLDIuNzUsMi43NWMwLDIuMDQtMS45OSwzLjE1LTMuOTEsNC4yMkM1LjQyLDE0LjY3LDQsMTUuNTcsNCwxNyBjMCwxLjEsMC45LDIsMiwydjJjLTIuMjEsMC00LTEuNzktNC00YzAtMi43MSwyLjU2LTQuMTQsNC42Mi01LjI4YzEuNDItMC43OSwyLjg4LTEuNiwyLjg4LTIuNDdjMC0wLjQxLTAuMzQtMC43NS0wLjc1LTAuNzUgQzcuNSw4LjUsNi4yNSwxMCw0LjUsMTBDMy4xMiwxMCwyLDguODgsMiw3LjVDMiw1LjQ1LDQuMTcsMi44Myw1LDJsMS40MSwxLjQxQzUuNDEsNC40Miw0LDYuNDMsNCw3LjVDNCw3Ljc4LDQuMjIsOCw0LjUsOHogTTgsMjEgbDMuNzUsMGw4LjA2LTguMDZsLTMuNzUtMy43NUw4LDE3LjI1TDgsMjF6IE0xMCwxOC4wOGw2LjA2LTYuMDZsMC45MiwwLjkyTDEwLjkyLDE5TDEwLDE5TDEwLDE4LjA4eiBNMjAuMzcsNi4yOSBjLTAuMzktMC4zOS0xLjAyLTAuMzktMS40MSwwbC0xLjgzLDEuODNsMy43NSwzLjc1bDEuODMtMS44M2MwLjM5LTAuMzksMC4zOS0xLjAyLDAtMS40MUwyMC4zNyw2LjI5eiIvPjwvc3ZnPg=="
] as const
async function upperGlyphFixture(digestOverride?: (algorithm: AlgorithmIdentifier, bytes: BufferSource) => Promise<ArrayBuffer>) {
  const { webcrypto } = await import('node:crypto')
  const f = fixture(true)
  const digest = vi.fn(digestOverride ?? ((algorithm: AlgorithmIdentifier, bytes: BufferSource) => webcrypto.subtle.digest(algorithm, bytes)))
  vi.stubGlobal('crypto', { subtle: { digest } })
  const style = document.createElement('style')
  style.textContent = upperOriginalUrls.map((url, i) => '.upper-original-' + i + '{background-image:url("' + url + '");background-size:18px 18px;background-position:50% 50%;background-repeat:no-repeat;width:28px;height:28px;position:static;opacity:.65;padding:0;border:0}').join('')
  document.head.append(style)
  const toolbar = document.createElement('div')
  toolbar.className = 'geToolbarContainer'
  toolbar.innerHTML = '<div class="geToolbar">' + upperOriginalUrls.map((_, i) => '<a class="geButton upper-original-' + i + '" title="Original ' + i + '"></a>').join('') + '<a class="geButton untrusted" style="background-image:url(data:image/svg+xml;base64,PHN2Zy8+)"></a></div>'
  document.body.append(toolbar)
  const targets = Array.from(toolbar.querySelectorAll<HTMLAnchorElement>('a')).slice(0, 3)
  targets[1].style.setProperty('background-image', 'url("' + upperOriginalUrls[1] + '")', 'important')
  targets[2].style.setProperty('opacity', '.75')
  const outside = targets[0].cloneNode(true) as HTMLAnchorElement
  document.body.append(outside)
  const nativeStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((node, pseudo) => {
    const value = nativeStyle(node)
    return new Proxy(value, { get(css, key) {
      if (pseudo) return key === 'content' ? 'none' : key === 'backgroundImage' ? 'none' : Reflect.get(css, key, css)
      const defaults: Record<string, string> = { opacity: '1', filter: 'none', transform: 'none', mixBlendMode: 'normal', backdropFilter: 'none', boxShadow: 'none', clipPath: 'none', position: 'static', visibility: 'visible' }
      const result = Reflect.get(css, key, css)
      return typeof result === 'function' ? result.bind(css) : result || defaults[String(key)] || result
    } })
  })
  for (const [i, node] of targets.entries()) node.getBoundingClientRect = () => new DOMRect(20 + i * 40, 20, 28, 28)
  const original = targets.map(node => node.outerHTML), excluded = [outside, toolbar.querySelector('.untrusted')!].map(node => node.outerHTML)
  const callbacks = targets.map(node => { const callback = vi.fn(); node.addEventListener('click', callback); return callback })
  const settle = async (operation = 'apply') => {
    await vi.waitFor(async () => { await f.paint(); expect(f.replies().some(reply => reply.operation === operation && reply.status === 'PAINTED')).toBe(true) }, { timeout: 1200, interval: 10 })
  }
  const assertOwned = () => {
    targets.forEach((node, i) => {
      expect(node.hasAttribute('data-frade-upper-glyph'), JSON.stringify({ i, html: node.outerHTML, digestCalls: digest.mock.calls.length, replies: f.replies(), background: window.getComputedStyle(node).backgroundImage })).toBe(true)
      expect(node.style.backgroundImage).toBe('none')
      expect(node.style.getPropertyValue('--frade-upper-icon-image')).toBe('url("' + upperOriginalUrls[i] + '")')
      expect(node.parentElement).toBe(toolbar.firstElementChild)
      expect(node.title).toBe('Original ' + i)
      expect(window.getComputedStyle(node).opacity).toBe(i === 2 ? '0.75' : '0.65')
    })
    expect([outside, toolbar.querySelector('.untrusted')!].map(node => node.outerHTML)).toEqual(excluded)
    f.assertSemantic()
  }
  return { ...f, digest, targets, toolbar, original, callbacks, settle, assertOwned }
}
it('P01-UPPER-017 exact original three masks acquire canonical paint and restore absent/important inline state on detach', async () => {
  const f = await upperGlyphFixture(), before = document.documentElement.outerHTML
  f.send('prepare'); expect(document.documentElement.outerHTML).toBe(before); expect(f.digest).not.toHaveBeenCalled()
  f.send('apply'); await f.settle(); f.assertOwned()
  expect(f.digest.mock.calls.length).toBeGreaterThanOrEqual(3)
  f.targets.forEach(node => node.click()); f.callbacks.forEach(fn => expect(fn).toHaveBeenCalledTimes(1))
  f.send('detach'); expect(f.targets.map(node => node.outerHTML)).toEqual(f.original); f.assertSemantic()
})
it('P01-UPPER-018 release retains active projection, rollback restores previous canonical theme, disposal restores originals', async () => {
  const f = await upperGlyphFixture(); f.send('prepare'); f.send('apply'); await f.settle(); f.assertOwned()
  f.send('release', context('apply')); f.assertOwned()
  f.send('rollback', context('rollback', 0, 2), snapshot('light', 0)); await f.settle('rollback'); f.assertOwned()
  expect(document.documentElement.style.getPropertyValue('--frade-frame-text-primary')).toBe(snapshot('light', 0).effectiveColors['text.primary'])
  f.dispose(); expect(f.targets.map(node => node.outerHTML)).toEqual(f.original); f.assertSemantic()
})
it('P01-UPPER-018 passive replacement after release uses verified bytes without crypto and preserves newer vendor writes', async () => {
  const f = await upperGlyphFixture(); f.send('prepare'); f.send('apply'); await f.settle(); f.assertOwned()
  f.send('release', context('apply')); const calls = f.digest.mock.calls.length, old = f.targets[0]
  const replacement = document.createElement('a'); replacement.className = old.className; replacement.title = old.title
  replacement.getBoundingClientRect = old.getBoundingClientRect
  old.replaceWith(replacement)
  await vi.waitFor(() => expect(replacement.hasAttribute('data-frade-upper-glyph')).toBe(true))
  expect(old.outerHTML).toBe(f.original[0]); expect(f.digest).toHaveBeenCalledTimes(calls)
  replacement.style.backgroundImage = 'url("data:image/svg+xml;base64,PHN2Zy8+")'
  await vi.waitFor(() => expect(replacement.hasAttribute('data-frade-upper-glyph')).toBe(false))
  expect(replacement.style.backgroundImage).toBe('url("data:image/svg+xml;base64,PHN2Zy8+")')
  expect(replacement.style.getPropertyValue('--frade-upper-icon-image')).toBe('')
  expect(replacement.style.position).toBe(''); expect(f.digest).toHaveBeenCalledTimes(calls); f.assertSemantic()
})
it('P01-UPPER-019 released deferred verification has no late projection, positive cache publication or ACK', async () => {
  const pending: { algorithm: AlgorithmIdentifier; bytes: BufferSource; resolve: (value: ArrayBuffer) => void }[] = []
  const f = await upperGlyphFixture((algorithm, bytes) => new Promise(resolve => pending.push({ algorithm, bytes, resolve })))
  f.send('prepare'); f.send('apply'); expect(f.digest).toHaveBeenCalled()
  f.send('release', context('apply')); const html = f.targets.map(node => node.outerHTML), posts = f.replies().length
  const { webcrypto } = await import('node:crypto')
  for (const item of pending) item.resolve(await webcrypto.subtle.digest(item.algorithm, item.bytes))
  await new Promise(resolve => setTimeout(resolve, 10)); await f.paint()
  expect(f.targets.map(node => node.outerHTML)).toEqual(html); expect(f.replies()).toHaveLength(posts)
  const calls = f.digest.mock.calls.length
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2)); f.send('apply', context('apply', 2, 2))
  expect(f.digest.mock.calls.length).toBeGreaterThan(calls); f.dispose(); f.assertSemantic()
})
it('P01-UPPER-019 rejected native digest refuses the real pending parent before painted and never becomes a late diagnostic', async () => {
  const f = await upperGlyphFixture(async () => { throw Error('Controlled native digest refusal') })
  const parentFrame = document.createElement('iframe'); document.body.append(parentFrame)
  const parentPost = vi.spyOn(parentFrame.contentWindow!, 'postMessage').mockImplementation(() => {})
  const diagnostic = vi.fn(), parent = createFrameParticipant(parentFrame, { id: 'frame', generation: 7, sessionId: 'window', onPresentationDiagnostic: diagnostic })
  cleanup.push(() => { parent.dispose(); parentPost.mockRestore(); parentFrame.remove() })
  let delivered = 0
  const deliver = () => { for (; delivered < f.post.mock.calls.length; delivered++) window.dispatchEvent(new MessageEvent('message', { source: parentFrame.contentWindow, origin: 'frade://drawio', data: String(f.post.mock.calls[delivered][0]) })) }
  const ready = parent.prepare(snapshot('dark', 1), context('prepare') as PhaseContext, new AbortController().signal)
  f.send('prepare'); deliver(); const handle = await ready
  const outcome = handle.apply(context('apply') as PhaseContext, new AbortController().signal).then(() => ({ status: 'PAINTED', message: '' }), error => ({ status: 'REFUSED', message: String(error) }))
  f.send('apply'); await new Promise(resolve => setTimeout(resolve, 10)); await f.paint(); deliver()
  expect(await outcome).toMatchObject({ status: 'REFUSED', message: expect.stringContaining('Controlled native digest refusal') })
  expect(f.replies().filter(reply => reply.status === 'PAINTED')).toHaveLength(0)
  expect(diagnostic).not.toHaveBeenCalled(); handle.dispose(); f.assertSemantic()
})

it('P01-UPPER-017 Chromium computed 18px auto preserves the pinned square original glyph geometry', async () => {
  const f = await upperGlyphFixture()
  f.targets.forEach(node => { node.style.backgroundSize = '18px auto' })
  expect(f.targets.map(node => window.getComputedStyle(node).backgroundSize)).toEqual(['18px auto', '18px auto', '18px auto'])
  // jsdom's reflected style attribute can lag its CSSOM priority. Assert every actual property.
  const exactInline = (node: HTMLElement) => ({
    attributes: Array.from(node.attributes).filter(attribute => attribute.name !== 'style').map(attribute => [attribute.name, attribute.value]),
    stylePresent: node.hasAttribute('style'), cssText: node.style.cssText,
    properties: Array.from(node.style).map(name => ({ name, value: node.style.getPropertyValue(name), priority: node.style.getPropertyPriority(name) })),
  })
  const original = f.targets.map(exactInline)
  expect(original[1].properties.find(property => property.name === 'background-image')?.priority).toBe('important')
  f.send('prepare'); f.send('apply'); await f.settle(); f.assertOwned()
  f.dispose(); expect(f.targets.map(exactInline)).toEqual(original); f.assertSemantic()
})


for (const ending of ['superseded', 'detached', 'disposed', 'root-lost'] as const) {
  it('P01-UPPER-019 deferred native verification is inert after ' + ending, async () => {
    const pending: { algorithm: AlgorithmIdentifier; bytes: BufferSource; resolve: (value: ArrayBuffer) => void }[] = []
    const f = await upperGlyphFixture((algorithm, bytes) => new Promise(resolve => pending.push({ algorithm, bytes, resolve })))
    f.send('prepare'); f.send('apply'); expect(pending).toHaveLength(3)
    if (ending === 'superseded') f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
    if (ending === 'detached') f.send('detach')
    if (ending === 'disposed') f.dispose()
    if (ending === 'root-lost') document.documentElement.removeAttribute('data-frade-frame-runtime')
    await Promise.resolve(); await Promise.resolve()
    const html = document.documentElement.outerHTML, replies = f.replies()
    const { webcrypto } = await import('node:crypto')
    for (const item of pending) item.resolve(await webcrypto.subtle.digest(item.algorithm, item.bytes))
    await new Promise(resolve => setTimeout(resolve, 10)); await f.paint()
    expect(document.documentElement.outerHTML).toBe(html); expect(f.replies()).toEqual(replies)
    expect(f.replies().some(reply => reply.status === 'PAINTED')).toBe(false)
    if (ending === 'superseded') {
      f.send('apply', context('apply', 2, 2)); expect(f.digest).toHaveBeenCalledTimes(6)
    }
    f.dispose(); f.assertSemantic()
  })
}
it('P01-UPPER-019 native timeout rejects the actual pending parent exactly once and late completion cannot publish', async () => {
  const pending: { algorithm: AlgorithmIdentifier; bytes: BufferSource; resolve: (value: ArrayBuffer) => void }[] = []
  const f = await upperGlyphFixture((algorithm, bytes) => new Promise(resolve => pending.push({ algorithm, bytes, resolve })))
  const parentFrame = document.createElement('iframe'); document.body.append(parentFrame)
  const parentPost = vi.spyOn(parentFrame.contentWindow!, 'postMessage').mockImplementation(() => {})
  const diagnostic = vi.fn(), parent = createFrameParticipant(parentFrame, { id: 'frame', generation: 7, sessionId: 'window', onPresentationDiagnostic: diagnostic })
  cleanup.push(() => { parent.dispose(); parentPost.mockRestore(); parentFrame.remove() })
  let delivered = 0
  const deliver = () => { for (; delivered < f.post.mock.calls.length; delivered++) window.dispatchEvent(new MessageEvent('message', { source: parentFrame.contentWindow, origin: 'frade://drawio', data: String(f.post.mock.calls[delivered][0]) })) }
  const ready = parent.prepare(snapshot('dark', 1), context('prepare') as PhaseContext, new AbortController().signal)
  f.send('prepare'); deliver(); const handle = await ready
  const settled = vi.fn(), outcome = handle.apply(context('apply') as PhaseContext, new AbortController().signal).then(() => { settled('PAINTED'); return '' }, error => { settled('REFUSED'); return String(error) })
  f.send('apply')
  await vi.waitFor(() => { deliver(); expect(settled).toHaveBeenCalledWith('REFUSED') }, { timeout: 1950, interval: 10 })
  expect(await outcome).toContain('Upper glyph verification exceeded pending deadline')
  expect(f.replies().filter(reply => reply.status === 'REFUSED')).toHaveLength(1)
  expect(f.replies().filter(reply => reply.status === 'PAINTED')).toHaveLength(0)
  const html = f.targets.map(node => node.outerHTML), replies = f.replies()
  const { webcrypto } = await import('node:crypto')
  for (const item of pending) item.resolve(await webcrypto.subtle.digest(item.algorithm, item.bytes))
  await new Promise(resolve => setTimeout(resolve, 10)); await f.paint(); deliver()
  expect(f.targets.map(node => node.outerHTML)).toEqual(html); expect(f.replies()).toEqual(replies)
  expect(settled).toHaveBeenCalledTimes(1); expect(diagnostic).not.toHaveBeenCalled(); handle.dispose(); f.assertSemantic()
})
for (const released of [false, true]) {
  it('P01-UPPER-018 selector loss and original replacement restore exact ownership with release=' + released, async () => {
    const f = await upperGlyphFixture(); f.send('prepare'); f.send('apply'); await f.settle()
    if (released) f.send('release', context('apply'))
    const old = f.targets[0], calls = f.digest.mock.calls.length
    document.body.append(old)
    await vi.waitFor(() => expect(old.outerHTML).toBe(f.original[0]))
    f.toolbar.firstElementChild!.append(old)
    await vi.waitFor(() => expect(old.hasAttribute('data-frade-upper-glyph')).toBe(true))
    const replacement = document.createElement('a'); replacement.className = old.className; replacement.title = old.title
    replacement.getBoundingClientRect = old.getBoundingClientRect; old.replaceWith(replacement)
    await vi.waitFor(() => expect(replacement.hasAttribute('data-frade-upper-glyph')).toBe(true))
    expect(old.outerHTML).toBe(f.original[0]); expect(f.digest).toHaveBeenCalledTimes(calls)
    f.dispose(); expect(replacement.outerHTML).toBe(f.original[0]); f.assertSemantic()
  })
}
it('P01-UPPER-019 passive unknown bytes wait for a normal apply while an equivalent URL reuses exact verified bytes', async () => {
  const f = await upperGlyphFixture(), second = f.targets[1], third = f.targets[2]
  second.remove(); third.remove(); f.send('prepare'); f.send('apply'); await f.settle()
  expect(f.digest).toHaveBeenCalledTimes(1); f.send('release', context('apply'))
  f.toolbar.firstElementChild!.append(second)
  await Promise.resolve(); await Promise.resolve(); await f.paint()
  expect(second.hasAttribute('data-frade-upper-glyph')).toBe(false); expect(f.digest).toHaveBeenCalledTimes(1)
  const bytes = atob(upperOriginalUrls[0].split(',')[1]), alternate = 'data:image/svg+xml,' + encodeURIComponent(bytes)
  const first = f.targets[0]; first.style.setProperty('background-image', 'url("' + alternate + '")', 'important')
  await vi.waitFor(() => expect(first.style.getPropertyValue('--frade-upper-icon-image')).toBe('url("' + alternate + '")'))
  expect(f.digest).toHaveBeenCalledTimes(1)
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2)); f.send('apply', context('apply', 2, 2))
  await vi.waitFor(async () => { await f.paint(); expect(f.replies().some(reply => reply.status === 'PAINTED' && reply.context.generation === 2)).toBe(true) })
  expect(second.hasAttribute('data-frade-upper-glyph')).toBe(true); expect(f.digest).toHaveBeenCalledTimes(2)
  f.dispose(); expect(first.style.backgroundImage).toBe('url("' + alternate + '")'); expect(second.outerHTML).toBe(f.original[1]); f.assertSemantic()
})
it('P01-UPPER-018 settled observer performs no repeated writes and root scope loss restores originals', async () => {
  const f = await upperGlyphFixture(); f.send('prepare'); f.send('apply'); await f.settle(); f.send('release', context('apply'))
  const setters = f.targets.map(node => vi.spyOn(node.style, 'setProperty')), html = f.targets.map(node => node.outerHTML), calls = f.digest.mock.calls.length
  for (let n = 0; n < 8; n++) { f.toolbar.title = 'unrelated observer ' + n; await Promise.resolve(); await Promise.resolve(); expect(f.targets.map(node => node.outerHTML)).toEqual(html) }
  setters.forEach(setter => expect(setter).not.toHaveBeenCalled()); expect(f.digest).toHaveBeenCalledTimes(calls)
  document.documentElement.removeAttribute('data-frade-frame-runtime')
  await vi.waitFor(() => expect(f.targets.map(node => node.outerHTML)).toEqual(f.original)); f.assertSemantic()
})
it('P01-UPPER-019 more than 256 exact selector candidates refuse before hashing or painted acknowledgement', async () => {
  const f = await upperGlyphFixture()
  for (let n = f.toolbar.querySelectorAll('a.geButton').length; n < 257; n++) { const node = document.createElement('a'); node.className = 'geButton'; f.toolbar.firstElementChild!.append(node) }
  f.send('prepare'); f.send('apply'); await f.paint()
  expect(f.replies().filter(reply => reply.status === 'REFUSED').map(reply => reply.message)).toEqual(['Upper glyph candidate bound exceeded'])
  expect(f.digest).not.toHaveBeenCalled(); expect(f.replies().some(reply => reply.status === 'PAINTED')).toBe(false); f.assertSemantic()
})
it('P01-UPPER-019 oversized decoded SVG stays unowned and never enters native verification', async () => {
  const f = await upperGlyphFixture(); f.targets[0].style.backgroundImage = 'url("data:image/svg+xml;base64,' + btoa('<svg>' + ' '.repeat(4096) + '</svg>') + '")'
  const oversized = f.targets[0].outerHTML; f.send('prepare'); f.send('apply'); await f.settle()
  expect(f.targets[0].outerHTML).toBe(oversized); expect(f.digest).toHaveBeenCalledTimes(2)
  expect(f.targets.slice(1).every(node => node.hasAttribute('data-frade-upper-glyph'))).toBe(true); f.assertSemantic()
})
it('P01-UPPER-019 continuing new source churn refuses after three bounded native verification passes', async () => {
  const { webcrypto } = await import('node:crypto')
  let calls = 0
  const f: Awaited<ReturnType<typeof upperGlyphFixture>> = await upperGlyphFixture(async (algorithm, bytes) => {
    const hash = await webcrypto.subtle.digest(algorithm, bytes), index = calls++ % 3
    f.targets[index].style.backgroundImage = 'url("data:image/svg+xml;base64,' + btoa('<svg>' + calls + '</svg>') + '")'
    return hash
  })
  f.send('prepare'); f.send('apply')
  await vi.waitFor(async () => { await f.paint(); expect(f.replies().some(reply => reply.status === 'REFUSED')).toBe(true) })
  expect(f.replies().filter(reply => reply.status === 'REFUSED').map(reply => reply.message)).toEqual(['Upper glyph resources kept changing during verification'])
  expect(f.digest).toHaveBeenCalledTimes(9); expect(f.replies().some(reply => reply.status === 'PAINTED')).toBe(false)
  expect(f.targets.every(node => !node.hasAttribute('data-frade-upper-glyph'))).toBe(true); f.assertSemantic()
})


type UpperKeyboardRow = HTMLTableRowElement & { div?: HTMLDivElement; tbody?: HTMLTableSectionElement; activeRow?: UpperKeyboardRow; mxListenerList?: { name: string; f: EventListener }[] }
async function upperKeyboardFixture(deferredNativeClick = false) {
  const f = await upperGlyphFixture(), effects: string[] = [], hides: string[] = []
  let drawing = false
  const graph = Object.assign(f.graph, { isEnabled: () => true, isEditing: () => false, isMouseDown: false, freehand: { isDrawing: () => drawing } })
  const ui = Object.assign(f.ui, { currentMenu: null as ReturnType<typeof makeMenu> | null, currentMenuElt: null as HTMLElement | null, dialog: null as HTMLElement | null })
  const listen = (node: HTMLElement, name: string, fn: EventListener) => {
    node.addEventListener(name, fn)
    const original = node as HTMLElement & { mxListenerList?: { name: string; f: EventListener }[] }
    ;(original.mxListenerList ??= []).push({ name, f: fn })
  }
  function makeMenu(opener: HTMLElement) {
    const root = document.createElement('div'), table = document.createElement('table'), tbody = document.createElement('tbody')
    root.className = table.className = 'mxPopupMenu'; table.append(tbody); root.append(table)
    const menu = {
      div: root as HTMLDivElement | null, tbody, activeRow: undefined as UpperKeyboardRow | undefined, eventReceiver: undefined as UpperKeyboardRow | undefined,
      hideSubmenu: vi.fn((scope: { activeRow?: UpperKeyboardRow }) => {
        if (scope.activeRow) { menu.hideSubmenu(scope.activeRow); scope.activeRow.div?.remove(); scope.activeRow = undefined }
      }),
      hideMenu: vi.fn(() => { menu.hideSubmenu(menu); root.remove(); hides.push('view-only HIDE'); ui.currentMenu = null; ui.currentMenuElt = null; menu.div = null }),
    }
    const item = (parent: { tbody?: HTMLTableSectionElement; activeRow?: UpperKeyboardRow }, label: string, disabled = false) => {
      const row = document.createElement('tr') as UpperKeyboardRow
      row.className = 'mxPopupMenuItem'; row.innerHTML = '<td class="mxPopupMenuIcon"></td><td class="mxPopupMenuItem"></td><td class="mxPopupMenuItem"></td>'; row.cells[1].textContent = label
      parent.tbody!.append(row)
      if (disabled) row.cells[1].classList.add('mxDisabled')
      else {
        listen(row, 'mousedown', event => { menu.eventReceiver = row; if (parent.activeRow !== row) { menu.hideSubmenu(parent); if (row.div) { document.body.append(row.div); parent.activeRow = row } } event.preventDefault(); event.stopPropagation() })
        listen(row, 'mousemove', () => { if (row.div) { menu.hideSubmenu(parent); document.body.append(row.div); parent.activeRow = row } })
        listen(row, 'mouseup', event => { if (menu.eventReceiver === row) { if (!row.div) { effects.push(label); menu.hideMenu() } menu.eventReceiver = undefined } event.preventDefault(); event.stopPropagation() })
      }
      return row
    }
    const first = item(menu, 'Original first'), disabled = item(menu, 'Unavailable original', true), parent = item(menu, 'Original submenu'), last = item(menu, 'Original last')
    parent.div = document.createElement('div'); parent.div.className = 'mxPopupMenu'; const nestedTable = document.createElement('table'); parent.tbody = document.createElement('tbody'); nestedTable.append(parent.tbody); parent.div.append(nestedTable)
    const nested = item(parent, 'Original nested')
    const original = Object.assign(menu, { root, first, disabled, parent, nested, last, item })
    document.body.append(root); ui.currentMenu = original; ui.currentMenuElt = opener
    return original
  }
  f.targets.slice(0, 2).forEach(node => { Object.assign(node, { enabled: true }); listen(node, 'click', () => { if ((node as HTMLAnchorElement & { enabled: boolean }).enabled) { ui.currentMenu?.hideMenu(); if (deferredNativeClick) queueMicrotask(() => makeMenu(node)); else makeMenu(node) } }) })
  listen(f.targets[2], 'click', () => { if (!f.targets[2].hasAttribute('disabled')) { drawing = !drawing; f.targets[2].title = 'Original drawing ' + drawing } })
  const before = f.targets.map(node => node.outerHTML)
  const start = async () => { f.send('prepare'); f.send('apply'); await f.settle(); await Promise.resolve(); await Promise.resolve() }
  const key = (node: HTMLElement, key: string, extra: KeyboardEventInit = {}) => { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }); node.dispatchEvent(e); return e }
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); await f.paint() }
  return { ...f, graph, ui, effects, hides, before, start, key, flush, makeMenu, listen }
}
it('P01-UPPER-023 exact eligible anchors gain truthful focus/name/state and original keyboard action exactly once', async () => {
  const f = await upperKeyboardFixture(); await f.start()
  for (const node of f.targets) { expect(node.getAttribute('role')).toBe('button'); expect(node.tabIndex).toBe(0); expect(node.getAttribute('aria-label')).toBe(node.title); expect(node.getAttribute('aria-disabled')).toBe('false') }
  expect(f.targets[0].getAttribute('aria-haspopup')).toBe('menu'); expect(f.targets[1].getAttribute('aria-haspopup')).toBe('menu'); expect(f.targets[2].getAttribute('aria-haspopup')).toBeNull()
  expect(f.targets[2].getAttribute('aria-pressed')).toBe('false'); f.targets[2].focus(); expect(document.activeElement).toBe(f.targets[2])
  expect(f.key(f.targets[2], 'Enter').defaultPrevented).toBe(true); await f.flush()
  expect(f.callbacks[2]).toHaveBeenCalledTimes(1); expect(f.targets[2].getAttribute('aria-pressed')).toBe('true')
  for (const extra of [{ repeat: true }, { isComposing: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(f.key(f.targets[2], 'Enter', extra).defaultPrevented).toBe(false)
  expect(f.callbacks[2]).toHaveBeenCalledTimes(1)
  f.key(f.targets[2], ' '); await f.flush(); expect(f.callbacks[2]).toHaveBeenCalledTimes(2); expect(f.targets[2].getAttribute('aria-pressed')).toBe('false')
  f.targets[2].setAttribute('disabled', 'disabled'); await f.flush(); expect(f.targets[2].getAttribute('aria-disabled')).toBe('true'); expect(f.targets[2].tabIndex).toBe(-1)
  f.key(f.targets[2], 'Enter'); expect(f.callbacks[2]).toHaveBeenCalledTimes(2)
  f.targets[2].removeAttribute('disabled'); await f.flush(); expect(f.targets[2].getAttribute('aria-disabled')).toBe('false')
  expect(f.toolbar.querySelector('.untrusted')!.hasAttribute('tabindex')).toBe(false); f.assertSemantic()
})
it('P01-UPPER-024 original menu keyboard navigation skips disabled rows and traverses only native submenus', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.targets[0].focus(); f.key(f.targets[0], 'ArrowDown'); await f.flush()
  const menu = f.ui.currentMenu!; expect(menu).not.toBeNull(); expect(f.callbacks[0]).toHaveBeenCalledTimes(1); expect(menu.root.getAttribute('role')).toBe('menu'); expect(document.activeElement).toBe(menu.first)
  expect(menu.disabled.getAttribute('aria-disabled')).toBe('true'); f.key(menu.first, 'ArrowDown'); expect(document.activeElement).toBe(menu.parent)
  f.key(menu.parent, 'ArrowRight'); await f.flush(); expect(menu.parent.div!.isConnected).toBe(true); expect(document.activeElement).toBe(menu.nested)
  expect(menu.parent.getAttribute('aria-expanded')).toBe('true'); f.key(menu.nested, 'Escape'); expect(menu.parent.div!.isConnected).toBe(false); expect(document.activeElement).toBe(menu.parent); expect(menu.hideMenu).not.toHaveBeenCalled()
  f.key(menu.parent, 'End'); expect(document.activeElement).toBe(menu.last); f.key(menu.last, 'Home'); expect(document.activeElement).toBe(menu.first)
  f.key(menu.first, ' '); await f.flush(); expect(f.effects).toEqual(['Original first']); expect(menu.hideMenu).toHaveBeenCalledTimes(1); f.assertSemantic()
})
for (const origin of ['body', 'canvas'] as const) it('P01-UPPER-025 original pointer-open root Escape works from ' + origin + ' and returns the exact opener', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.targets[1].click(); await f.flush(); const menu = f.ui.currentMenu!
  const target = origin === 'body' ? document.body : f.container; target.tabIndex = -1; target.focus()
  expect(f.key(target, 'Escape').defaultPrevented).toBe(true); expect(menu.root.isConnected).toBe(false); expect(menu.hideMenu).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(f.targets[1]); expect(f.targets[1].getAttribute('aria-expanded')).toBe('false'); expect(f.effects).toEqual([]); expect(f.hides).toEqual(['view-only HIDE']); f.assertSemantic()
})
it('P01-UPPER-025 Tab cancels once and preserves default traversal; unrelated popup and editable/dialog keys stay untouched', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.key(f.targets[0], 'Enter'); await f.flush(); const own = f.ui.currentMenu!
  expect(own).not.toBeNull()
  const tab = f.key(own.first, 'Tab', { shiftKey: true }); expect(tab.defaultPrevented).toBe(false); expect(own.hideMenu).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(f.targets[0])
  const alien = document.createElement('button'); document.body.append(alien); const unrelated = f.makeMenu(alien), html = unrelated.root.outerHTML
  expect(f.key(document.body, 'Escape').defaultPrevented).toBe(false); expect(unrelated.hideMenu).not.toHaveBeenCalled(); expect(unrelated.root.outerHTML).toBe(html)
  unrelated.hideMenu(); f.targets[0].click(); await f.flush(); const own2 = f.ui.currentMenu!, input = document.createElement('input'); own2.root.append(input); input.focus()
  expect(f.key(input, 'Escape').defaultPrevented).toBe(false); expect(own2.hideMenu).not.toHaveBeenCalled(); f.ui.dialog = document.createElement('div')
  expect(f.key(document.body, 'Escape').defaultPrevented).toBe(false); expect(own2.hideMenu).not.toHaveBeenCalled(); f.ui.dialog = null; f.assertSemantic()
})
it('P01-UPPER-026 prepare is DOM pure, retained lease cancels at apply and release/rollback preserve working accessibility', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.targets[0].click(); await f.flush(); const menu = f.ui.currentMenu!, html = document.documentElement.outerHTML
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2)); expect(document.documentElement.outerHTML).toBe(html)
  expect(f.key(document.body, 'Escape').defaultPrevented).toBe(false); expect(menu.hideMenu).not.toHaveBeenCalled()
  f.send('apply', context('apply', 2, 2)); await f.settle(); expect(menu.hideMenu).toHaveBeenCalledTimes(1); expect(f.targets[0].getAttribute('aria-expanded')).toBe('false')
  f.send('release', context('apply', 2, 2)); expect(f.targets[0].tabIndex).toBe(0)
  f.send('rollback', context('rollback', 1, 3), snapshot('dark', 1)); await f.settle('rollback'); expect(f.targets[0].tabIndex).toBe(0)
  f.dispose(); expect(f.targets.map(node => node.outerHTML)).toEqual(f.before); f.assertSemantic()
})
it('P01-UPPER-026 external vendor attribute/style writes survive restoration and stale menu replacement cannot be canceled', async () => {
  const f = await upperKeyboardFixture(); f.targets[0].setAttribute('aria-label', 'prior name'); f.targets[0].style.setProperty('outline', '1px solid teal', 'important'); await f.start()
  expect(f.targets[0].getAttribute('aria-label')).toBe(f.targets[0].title); f.targets[0].click(); await f.flush(); const old = f.ui.currentMenu!
  f.targets[0].setAttribute('aria-label', 'later vendor name'); f.targets[0].style.setProperty('outline', '3px dotted olive', 'important')
  const alien = document.createElement('button'); document.body.append(alien); const replacement = f.makeMenu(alien); old.root.remove(); await f.flush()
  f.dispose(); expect(old.hideMenu).not.toHaveBeenCalled(); expect(replacement.hideMenu).not.toHaveBeenCalled(); expect(f.targets[0].getAttribute('aria-label')).toBe('later vendor name'); expect(f.targets[0].style.getPropertyValue('outline')).toBe('3px dotted olive'); expect(f.targets[0].style.getPropertyPriority('outline')).toBe('important'); f.assertSemantic()
})
it('P01-UPPER-027 changed source and bounded cyclic menu relationships revoke ownership without repeated writes', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.targets[0].click(); await f.flush(); const menu = f.ui.currentMenu!
  expect(menu.root.getAttribute('role')).toBe('menu'); menu.activeRow = menu.parent; menu.parent.div = menu.root; menu.parent.tbody = menu.tbody; menu.parent.activeRow = menu.parent
  menu.root.title = 'trigger native mutation'; await f.flush(); expect(f.key(document.body, 'Escape').defaultPrevented).toBe(false); expect(menu.hideMenu).not.toHaveBeenCalled(); expect(menu.root.getAttribute('role')).toBeNull()
  menu.activeRow = undefined; menu.parent.activeRow = undefined; uiCleanup()
  function uiCleanup() { f.ui.currentMenu = null; f.ui.currentMenuElt = null; menu.root.remove() }
  f.targets[0].style.backgroundImage = 'url("data:image/svg+xml;base64,PHN2Zy8+")'; await f.flush(); expect(f.targets[0].hasAttribute('tabindex')).toBe(false)
  const writes = f.targets.map(node => vi.spyOn(node, 'setAttribute')); for (let i = 0; i < 6; i++) { f.toolbar.title = 'unrelated ' + i; await f.flush() }; writes.forEach(spy => expect(spy).not.toHaveBeenCalled()); f.assertSemantic()
})


it('P01-UPPER-025 original menu opens after the capture microtask checkpoint and still gains a bounded current lease', async () => {
  const f = await upperKeyboardFixture(true); await f.start(); f.targets[0].click()
  await new Promise(resolve => setTimeout(resolve, 0)); await f.flush()
  const menu = f.ui.currentMenu!; expect(menu).not.toBeNull(); expect(menu.root.getAttribute('role')).toBe('menu')
  expect(f.key(document.body, 'Escape').defaultPrevented).toBe(true); expect(menu.hideMenu).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(f.targets[0]); f.assertSemantic()
})


it('P01-UPPER-029 focus projection avoids original opacity and follows ownership without changing target geometry or actions', async () => {
  const f=await upperKeyboardFixture();f.toolbar.style.position='absolute';f.toolbar.getBoundingClientRect=()=>new DOMRect(0,0,300,70);await f.start()
  const node=f.targets[0],before=node.outerHTML;node.focus();await f.flush()
  const ring=document.body.querySelector<HTMLElement>('[data-frade-upper-focus-ring="1"]');expect(ring).not.toBeNull()
  expect(ring!.parentElement).toBe(document.body);expect(node.contains(ring)).toBe(false);expect(ring!.getAttribute('aria-hidden')).toBe('true');expect(ring!.hasAttribute('inert')).toBe(true);expect(ring!.style.pointerEvents).toBe('none');expect(ring!.style.opacity).toBe('1')
  expect(node.outerHTML).toBe(before);expect(ring!.style.left).toBe('15px');expect(ring!.style.top).toBe('15px');expect(ring!.style.width).toBe('38px');expect(ring!.style.height).toBe('38px')
  const writes=vi.spyOn(ring!.style,'setProperty');for(let n=0;n<5;n++){f.toolbar.title='native unrelated '+n;await f.flush()};expect(writes).not.toHaveBeenCalled()
  const html=document.documentElement.outerHTML;f.send('prepare',context('prepare',2,2),snapshot('light',2));expect(document.documentElement.outerHTML).toBe(html)
  f.send('apply',context('apply',2,2));await f.settle();f.send('release',context('apply',2,2));expect(document.body.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  node.blur();await f.flush();expect(document.body.querySelector('[data-frade-upper-focus-ring]')).toBeNull();node.focus();await f.flush();expect(document.body.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  f.dispose();expect(document.body.querySelector('[data-frade-upper-focus-ring]')).toBeNull();expect(f.targets.map(n=>n.outerHTML)).toEqual(f.before);f.callbacks.forEach(cb=>expect(cb).not.toHaveBeenCalled());f.assertSemantic()
})


it('P01-UPPER-030 body focus decoration escapes original clipping within five pixels and stays below native overlays', async () => {
  const f=await upperKeyboardFixture();f.toolbar.style.position='relative';f.toolbar.style.overflow='hidden';f.toolbar.getBoundingClientRect=()=>new DOMRect(0,18,300,30);await f.start()
  const node=f.targets[0],before=node.outerHTML;node.focus();await f.flush()
  const ring=document.querySelector<HTMLElement>('body>[data-frade-upper-focus-ring="1"]');expect(ring).not.toBeNull()
  expect(ring!.style.position).toBe('fixed');expect(ring!.style.left).toBe('15px');expect(ring!.style.top).toBe('15px');expect(ring!.style.width).toBe('38px');expect(ring!.style.height).toBe('38px')
  expect(ring!.style.borderWidth).toBe('4px');expect(ring!.style.borderStyle).toBe('solid');expect(ring!.style.zIndex).toBe('4');expect(ring!.style.opacity).toBe('1');expect(ring!.style.pointerEvents).toBe('none');expect(ring!.hasAttribute('inert')).toBe(true);expect(ring!.getAttribute('aria-hidden')).toBe('true')
  expect(node.outerHTML).toBe(before);expect(f.toolbar.style.overflow).toBe('hidden');expect(f.toolbar.getBoundingClientRect().height).toBe(30);expect(document.activeElement).toBe(node)
  const contour=ring!.firstElementChild as HTMLElement;expect(contour.style.left).toBe('1px');expect(contour.style.top).toBe('1px');expect(contour.style.width).toBe('28px');expect(contour.style.height).toBe('28px');expect(contour.style.outlineOffset).toBe('2px')
  f.ui.dialog=document.createElement('div');f.toolbar.title='dialog changed';await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull();f.ui.dialog=null;f.toolbar.title='dialog closed';await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  f.key(node,'Enter');await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull();f.key(document.body,'Escape');await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  const focused=vi.spyOn(document,'hasFocus').mockReturnValue(false);window.dispatchEvent(new Event('blur'));await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull();focused.mockReturnValue(true);window.dispatchEvent(new Event('focus'));await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  Object.assign(node,{enabled:false});f.toolbar.title='capability changed';await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull();Object.assign(node,{enabled:true});f.toolbar.title='capability restored';await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  window.dispatchEvent(new Event('focus'));f.dispose();await f.flush();expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull();expect(f.targets.map(n=>n.outerHTML)).toEqual(f.before);f.assertSemantic()
})


it('P01-UPPER-032 private focus backing cannot paint the adjacent target edge or inherit vendor important colors', async () => {
  const f=await upperKeyboardFixture();await f.start();f.targets[1].focus();await f.flush()
  const ring=document.querySelector<HTMLElement>('body>[data-frade-upper-focus-ring="1"]')!
  expect(ring.style.clipPath).toBe('inset(0px 1px)')
  expect(ring.style.getPropertyValue('border-color')).toBe('var(--frade-frame-surface-panel)');expect(ring.style.getPropertyPriority('border-color')).toBe('important')
  expect(ring.style.getPropertyValue('outline')).toBe('none');expect(ring.style.getPropertyPriority('outline')).toBe('important')
  expect(ring.style.forcedColorAdjust).toBe('none');f.assertSemantic()
})


// P01-UPPER-033: prepare is pure, but a retained visual lease needs a live anchor.
for (const invalidation of ['blur', 'window-blur', 'disabled', 'menu', 'dialog', 'handoff'] as const) {
  it('P01-UPPER-033 pending prepare revokes invalid retained focus on ' + invalidation, async () => {
    const f = await upperKeyboardFixture(); await f.start()
    const node = f.targets[0]; node.focus(); await f.flush()
    expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
    const before = document.documentElement.outerHTML
    f.send('prepare', context('prepare', 2, 2), snapshot('light', 2))
    expect(document.documentElement.outerHTML).toBe(before)
    if (invalidation === 'handoff') f.targets[1].focus()
    else if (invalidation === 'blur') node.blur()
    else if (invalidation === 'window-blur') {
      vi.spyOn(document, 'hasFocus').mockReturnValue(false)
      window.dispatchEvent(new Event('blur'))
    } else if (invalidation === 'disabled') {
      Object.assign(node, { enabled: false }); f.toolbar.title = 'native capability changed'
    } else if (invalidation === 'menu') f.makeMenu(node)
    else { f.ui.dialog = document.createElement('div'); f.toolbar.title = 'native modal changed' }
    await f.flush()
    expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull()
    f.callbacks.forEach(callback => expect(callback).not.toHaveBeenCalled())
    f.assertSemantic()
  })
}

it('P01-UPPER-033 pending prepare retains the still-valid ring without writes and never recreates an invalidated lease', async () => {
  const f = await upperKeyboardFixture(); await f.start(); f.targets[0].focus(); await f.flush()
  const ring = document.querySelector<HTMLElement>('[data-frade-upper-focus-ring]')!, before = document.documentElement.outerHTML
  f.send('prepare', context('prepare', 2, 2), snapshot('light', 2)); await f.flush()
  expect(document.documentElement.outerHTML).toBe(before)
  const writes = vi.spyOn(ring.style, 'setProperty')
  for (let n = 0; n < 3; n++) { window.dispatchEvent(new Event('focus')); await f.flush() }
  expect(document.querySelector('[data-frade-upper-focus-ring]')).toBe(ring); expect(writes).not.toHaveBeenCalled()
  f.targets[0].blur(); await f.flush(); expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull()
  f.targets[0].focus(); await f.flush(); expect(document.querySelector('[data-frade-upper-focus-ring]')).toBeNull()
  f.send('apply', context('apply', 2, 2)); await f.settle(); expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  f.send('release', context('apply', 2, 2)); await f.flush(); expect(document.querySelector('[data-frade-upper-focus-ring]')).not.toBeNull()
  f.callbacks.forEach(callback => expect(callback).not.toHaveBeenCalled()); f.assertSemantic()
})
