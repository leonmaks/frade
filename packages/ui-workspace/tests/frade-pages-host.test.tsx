// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { DiagramViewProps, DrawioHandle } from '../src/DiagramView'
const probe = vi.hoisted(() => {
  const listeners = new Set<(event: string) => void>()
  let model: unknown
  const graph = {
    container: document.createElement('div'),
    options: { connecting: {} },
    on: vi.fn(),
    off: vi.fn(),
    getNodes: () => [],
    getEdges: () => [],
    getSelectedCells: () => [],
    getCellById: vi.fn(),
    zoom: () => 1,
    translate: () => ({ tx: 0, ty: 0 }),
  }
  const session = {
    generation: 1,
    load: vi.fn((value: unknown) => {
      model = structuredClone(value)
      for (const notify of listeners) notify('load')
      return model
    }),
    snapshot: vi.fn(() => structuredClone(model)),
    subscribe: (callback: (event: string) => void) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
  return {
    graph,
    session,
    notify: (event: string) => {
      for (const callback of listeners) callback(event)
    },
    seenReadonly: undefined as boolean | undefined,
    graphExport: vi.fn(() => ({
      format: 'frade-draw',
      version: 1,
      metadata: { id: 'wrong', name: 'Wrong' },
      graph: { nodes: [], edges: [] },
    })),
  }
})
vi.mock('@frade/draw', async () => {
  const codec = await import('@frade/draw/document'),
    React = await import('react')
  return {
    ...codec,
    graphToDocument: probe.graphExport,
    loadDocument: vi.fn(() => probe.graphExport()),
    nodeToCell: vi.fn(),
    DiagramEditor: ({
      onGraphReady,
      readOnly,
    }: {
      onGraphReady(graph: unknown, session: unknown): () => void
      readOnly?: boolean
    }) => {
      probe.seenReadonly = readOnly
      React.useEffect(() => onGraphReady(probe.graph, probe.session), [onGraphReady])
      return React.createElement('div', { 'data-native-page-fixture': '1' })
    },
  }
})
vi.mock('../src/repositoryBundles', () => ({
  installRepositoryBundles: () => ({ dispose: vi.fn(), refresh: vi.fn() }),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('loads/flushes the complete drawing, reports only semantic changes and supplies readonly to the native editor', async () => {
  const { FradeDiagramView } = await import('../src/FradeDiagramView')
  const model = {
    format: 'frade-draw',
    version: 2,
    metadata: { id: 'native', name: 'Native' },
    pages: [
      { id: 'a', name: 'A', graph: { nodes: [], edges: [] } },
      { id: 'b', name: 'B', graph: { nodes: [], edges: [] } },
    ],
  }
  let handle: DrawioHandle | undefined
  const baseline = vi.fn(),
    changed = vi.fn()
  const props: DiagramViewProps = {
    draft: {
      repositoryId: 'repo',
      path: 'd.frade',
      xml: JSON.stringify(model),
      current: JSON.stringify(model),
      revision: 'r',
      dirty: false,
      epoch: 0,
    },
    target: '#pages-host-slot',
    objects: [],
    readOnly: true,
    onBaseline: baseline,
    onChange: changed,
    onError: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onOpenObject: vi.fn(),
    onShortcut: vi.fn(),
    register: (next) => {
      handle = next
    },
  }
  render(
    <>
      <div id="pages-host-slot" />
      <FradeDiagramView {...props} />
    </>,
  )
  expect(probe.session.load).toHaveBeenCalledWith(model)
  expect(JSON.parse(baseline.mock.calls[0][0])).toEqual(model)
  expect(JSON.parse(await handle!.flush())).toEqual(model)
  expect(probe.graphExport).not.toHaveBeenCalled()
  expect(probe.seenReadonly).toBe(true)
  act(() => probe.notify('page'))
  expect(changed).not.toHaveBeenCalled()
  act(() => probe.notify('change'))
  expect(JSON.parse(changed.mock.calls[0][0])).toEqual(model)
  const other = {
    ...model,
    pages: [...model.pages, { id: 'c', name: 'C', graph: { nodes: [], edges: [] } }],
  }
  act(() => handle!.load(JSON.stringify(other)))
  expect(JSON.parse(await handle!.flush())).toEqual(other)
})
