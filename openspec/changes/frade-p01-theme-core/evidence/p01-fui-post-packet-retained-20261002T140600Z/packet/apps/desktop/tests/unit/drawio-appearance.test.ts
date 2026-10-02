import { afterEach, expect, it, vi } from 'vitest'
import { drawioRepositoryBridge } from '../../src/main/drawio-bridge'
afterEach(() => vi.unstubAllGlobals())
function xml(attributes: Record<string, string> = {}) {
  return {
    getAttribute: (key: string) => attributes[key] ?? null,
    setAttribute: (key: string, value: string) => {
      attributes[key] = value
    },
    cloneNode: () => xml({ ...attributes }),
  }
}
function setup() {
  type FakeCell = {
    vertex?: boolean
    edge?: boolean
    value?: ReturnType<typeof xml>
    source?: FakeCell
    target?: FakeCell
  }
  let connected:
    ((sender: unknown, event: { getProperty(key: string): FakeCell }) => void) | undefined
  let receive: (event: unknown) => void = () => {}
  const parent = {},
    pageListeners: Record<string, () => void> = {}
  const cell: FakeCell = { vertex: true, value: xml({ fradeObjectId: 'a' }) }
  const other: FakeCell = { vertex: true, value: xml() }
  let cells: FakeCell[] = [cell, other]
  const styles = new Map<object, Record<string, string>>([
    [cell, { fillColor: '#111111', fontSize: '22' }],
  ])
  const model = {
    beginUpdate: vi.fn(),
    endUpdate: vi.fn(),
    getRoot: () => ({}),
    getDescendants: () => cells,
    getTerminal: (cell: FakeCell, source: boolean) => (source ? cell.source : cell.target) ?? null,
    setValue: (cell: FakeCell, value: ReturnType<typeof xml>) => {
      cell.value = value
    },
  }
  const graph = {
    connectionHandler: {
      addListener: (_name: string, callback: typeof connected) => {
        connected = callback
      },
    },
    isEnabled: () => true,
    isCellLocked: () => false,
    getModel: () => model,
    getCellStyle: (cell: object) => styles.get(cell) ?? {},
    setCellStyles: vi.fn((key: string, value: string, cells: object[]) => {
      for (const cell of cells) styles.set(cell, { ...styles.get(cell), [key]: value })
    }),
  }
  const prototype = { init: () => {} }
  vi.stubGlobal('document', {
    implementation: { createDocument: () => ({ createElement: () => xml() }) },
  })
  vi.stubGlobal('window', {
    parent,
    EditorUi: { prototype },
    addEventListener: (_name: string, callback: typeof receive) => {
      receive = callback
    },
  })
  drawioRepositoryBridge('frade://app')
  const send = (data: object, origin = 'frade://app', source = parent) =>
    receive({ data: JSON.stringify(data), origin, source, stopImmediatePropagation: vi.fn() })
  send({ action: 'configure' })
  prototype.init.call({
    editor: {
      graph,
      addListener: (name: string, callback: () => void) => {
        pageListeners[name] = callback
      },
    },
  })
  send({ action: 'fradeDropState', enabled: true })
  const style = {
    shape: 'rectangle',
    rounded: '0',
    fillColor: '#E1D5E7',
    strokeColor: '#FF00FF',
    strokeWidth: '2',
    shadow: '1',
    shadowColor: '#000000',
    shadowOpacity: '25',
    shadowOffsetX: '2',
    shadowOffsetY: '3',
    shadowBlur: '2',
  }
  const sync = (live = true, patch = {}) => {
    send({ action: 'fradeAppearanceBegin', live })
    send({ action: 'fradeAppearanceChunk', objects: [{ id: 'a', style: { ...style, ...patch } }] })
    send({ action: 'fradeAppearanceCommit' })
  }
  return {
    send,
    sync,
    styles,
    cell,
    other,
    graph,
    model,
    pageListeners,
    connect: (edge: FakeCell) => {
      connected?.(undefined, { getProperty: () => edge })
    },
    setCells: (next: typeof cells) => {
      cells = next
    },
  }
}
it('updates only bound styles, retains manual edits until inputs change and honors live/read-only guards', () => {
  const t = setup()
  t.sync()
  expect(t.styles.get(t.cell)).toMatchObject({
    fillColor: '#E1D5E7',
    strokeWidth: '2',
    fontSize: '22',
  })
  expect(t.styles.has(t.other)).toBe(false)
  t.styles.get(t.cell)!.fillColor = '#123456'
  t.graph.setCellStyles.mockClear()
  t.sync()
  expect(t.graph.setCellStyles).not.toHaveBeenCalled()
  t.sync(false, { fillColor: '#AAAAAA' })
  expect(t.styles.get(t.cell)!.fillColor).toBe('#123456')
  t.sync(true, { fillColor: '#AAAAAA' })
  expect(t.styles.get(t.cell)!.fillColor).toBe('#AAAAAA')
  t.send({ action: 'fradeDropState', enabled: false })
  t.sync(true, { fillColor: '#BBBBBB' })
  expect(t.styles.get(t.cell)!.fillColor).toBe('#AAAAAA')
  expect(t.model.beginUpdate.mock.calls.length).toBe(t.model.endUpdate.mock.calls.length)
})
it('validates origins and style keys and refreshes a newly activated page', () => {
  const t = setup()
  t.sync(true, { fillColor: 'url(x)' })
  expect(t.styles.get(t.cell)!.fillColor).toBe('#111111')
  t.send({ action: 'fradeDropState', enabled: false }, 'https://untrusted.example')
  t.sync()
  expect(t.styles.get(t.cell)!.fillColor).toBe('#E1D5E7')
  const next = { ...t.cell }
  t.setCells([next])
  t.pageListeners.pageSelected()
  expect(t.styles.get(next)).toMatchObject({ fillColor: '#E1D5E7', strokeWidth: '2' })
})

it('tags only new connections between known systems, even in manual mode, and preserves ordinary edges', () => {
  const t = setup()
  t.sync(false)
  const edge = { edge: true, source: t.cell, target: { ...t.cell } }
  t.connect(edge)
  expect((edge as { value?: ReturnType<typeof xml> }).value?.getAttribute('fradeBundle')).toBe(
    'empty',
  )
  expect(t.styles.get(edge)).toMatchObject({
    strokeColor: '#404040',
    strokeWidth: '1',
    startArrow: 'none',
    endArrow: 'none',
    dashed: '0',
  })
  const ordinary = { edge: true, source: t.cell, target: t.other }
  t.connect(ordinary)
  expect(t.styles.has(ordinary)).toBe(false)
  t.setCells([edge, ordinary])
  t.send({
    action: 'fradeAppearanceBegin',
    live: true,
    emptyBundle: { stroke: '#556677', width: 2 },
  })
  t.send({ action: 'fradeAppearanceCommit' })
  expect(t.styles.get(edge)).toMatchObject({ strokeColor: '#556677', strokeWidth: '2' })
  expect(t.styles.has(ordinary)).toBe(false)
  t.send({ action: 'fradeDropState', enabled: false })
  t.send({
    action: 'fradeAppearanceBegin',
    live: true,
    emptyBundle: { stroke: '#AAAAAA', width: 3 },
  })
  t.send({ action: 'fradeAppearanceCommit' })
  expect(t.styles.get(edge)?.strokeWidth).toBe('2')
})
