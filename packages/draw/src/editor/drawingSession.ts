import type { Graph } from '@antv/x6'
import { graphToDocument, loadDocument } from '../document/graphAdapter'
import {
  pageState,
  drawingDocument,
  insertDrawingPage,
  duplicateDrawingPage,
  removeDrawingPage,
  renameDrawingPage,
  moveDrawingPage,
  sortDrawingPages,
  clearDrawingPages,
  parseDrawingDocument,
  type DrawingDocument,
  type DrawingState,
  type DrawingPage,
} from '../document/drawing'

export type DrawingSessionEvent = 'change' | 'page' | 'load' | 'readonly'
export type DrawingSession = ReturnType<typeof createDrawingSession>
type HistoryEntry = { before: DrawingState; after: DrawingState }
type Options = { firstPageName?: string; onError?(error: Error): void }

/** One stable X6 surface; semantic snapshots follow native committed history batches. */
export function createDrawingSession(graph: Graph, initial: unknown, options: Options = {}) {
  let data = pageState(initial, options.firstPageName),
    readonly = false,
    disposed = false,
    restoring = false,
    generation = 0
  const past: HistoryEntry[] = [],
    future: HistoryEntry[] = []
  const listeners = new Set<(event: DrawingSessionEvent) => void>()
  const original = {
    undo: graph.undo,
    redo: graph.redo,
    canUndo: graph.canUndo,
    canRedo: graph.canRedo,
  }
  const current = () => data.pages.find((page) => page.id === data.activeId)!
  const assertLive = () => {
    if (disposed) throw Error('Drawing session is closed')
  }
  const editable = () => {
    assertLive()
    if (readonly) throw Error('Drawing is read-only')
  }
  const notify = (event: DrawingSessionEvent) => {
    for (const listener of listeners) listener(event)
  }
  function capture() {
    assertLive()
    const { tx, ty } = graph.translate()
    const model = graphToDocument(graph, data.metadata, {
      zoom: graph.zoom(),
      pan: { x: tx, y: ty },
    })
    // Reject transient invalid graphs before they enter page state or history.
    parseDrawingDocument(model)
    const page = current()
    const graphData =
      JSON.stringify(page.graph) === JSON.stringify(model.graph) ? page.graph : model.graph
    data = {
      ...data,
      pages: data.pages.map((p) =>
        p.id === page.id ? { ...page, graph: graphData, viewport: model.viewport } : p,
      ),
    }
    return data
  }
  function restore(next: DrawingState, force = false) {
    const old = current(),
      page = next.pages.find((p) => p.id === next.activeId)!
    const changedPage = old.id !== page.id
    const replace = force || changedPage || old.graph !== page.graph
    if (replace) {
      const selected = changedPage ? [] : graph.getSelectedCells().map((cell) => cell.id)
      restoring = true
      try {
        const model = loadDocument(graph, {
          format: 'frade-draw',
          version: 1,
          metadata: next.metadata,
          graph: page.graph,
          ...(page.viewport === undefined ? {} : { viewport: page.viewport }),
        })
        next = {
          ...next,
          pages: next.pages.map((p) => (p.id === page.id ? { ...p, graph: model.graph } : p)),
        }
        if (selected.length)
          graph.select(
            selected.flatMap((id) => {
              const cell = graph.getCellById(id)
              return cell ? [cell] : []
            }),
          )
      } finally {
        restoring = false
      }
      generation++
    }
    data = next
    return replace
  }
  function mutate(operation: (state: DrawingState) => DrawingState) {
    editable()
    const before = capture(),
      next = operation(before)
    if (next === before) return
    const pageChanged = restore(next)
    past.push({ before, after: data })
    future.length = 0
    if (pageChanged) notify('page')
    notify('change')
  }
  function committed() {
    if (restoring || disposed) return
    // X6 records a provisional connection before both semantic terminals exist.
    // It is not a drawing command yet; flush/navigation still validate and reject it.
    if (graph.getEdges().some((edge) => !edge.getSourceCell() || !edge.getTargetCell())) return
    const before = data
    try {
      capture()
      if (current().graph === before.pages.find((p) => p.id === before.activeId)!.graph) return
      past.push({ before, after: data })
      future.length = 0
      notify('change')
    } catch (error) {
      if (!options.onError) throw error
      options.onError(error instanceof Error ? error : Error(String(error)))
    }
  }
  function replay(state: DrawingState) {
    // A history command is complete when its model AND replacement views are ready.
    // Keep the validated loader and documentRestore flag; restore normal scheduling afterwards.
    const asynchronous = graph.options.async
    graph.options.async = false
    try {
      return restore({ ...state, metadata: data.metadata })
    } finally {
      graph.options.async = asynchronous
    }
  }
  function undo() {
    editable()
    capture()
    const entry = past.at(-1)
    if (!entry) return
    const changedPage = replay(entry.before)
    past.pop()
    future.push(entry)
    if (changedPage) notify('page')
    notify('change')
  }
  function redo() {
    editable()
    capture()
    const entry = future.at(-1)
    if (!entry) return
    const changedPage = replay(entry.after)
    future.pop()
    past.push(entry)
    if (changedPage) notify('page')
    notify('change')
  }
  restore(data, true)
  capture()
  graph.on('history:add', committed)
  function nativeHistory(operation: () => void) {
    try {
      operation()
    } catch (error) {
      if (!options.onError) throw error
      options.onError(error instanceof Error ? error : Error(String(error)))
    }
    return graph
  }
  graph.undo = () => nativeHistory(undo)
  graph.redo = () => nativeHistory(redo)
  graph.canUndo = () => !readonly && past.length > 0
  graph.canRedo = () => !readonly && future.length > 0
  const empty = (id: string, name: string): DrawingPage => ({
    id,
    name,
    graph: { nodes: [], edges: [] },
  })
  return {
    view: () => ({
      activeId: data.activeId,
      pages: data.pages.map(({ id, name }) => ({ id, name })),
      canUndo: !readonly && past.length > 0,
      canRedo: !readonly && future.length > 0,
      readOnly: readonly,
    }),
    get generation() {
      return generation
    },
    get restoring() {
      return restoring
    },
    subscribe(listener: (event: DrawingSessionEvent) => void) {
      assertLive()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    snapshot(): DrawingDocument {
      return parseDrawingDocument(drawingDocument(capture()))
    },
    load(value: unknown) {
      assertLive()
      const next = pageState(value, options.firstPageName)
      restore(next, true)
      capture()
      past.length = 0
      future.length = 0
      notify('load')
      return drawingDocument(data)
    },
    select(id: string) {
      assertLive()
      if (id === data.activeId) return
      if (!data.pages.some((page) => page.id === id)) throw Error('Page no longer exists')
      capture()
      restore({ ...data, activeId: id })
      notify('page')
    },
    insert: (id: string, name: string) =>
      mutate((state) => insertDrawingPage(state, empty(id, name))),
    duplicate: (source: string, id: string, name: string) =>
      mutate((state) => duplicateDrawingPage(state, source, id, name)),
    rename: (id: string, name: string) => mutate((state) => renameDrawingPage(state, id, name)),
    remove: (id: string, replacementId: string, name: string) =>
      mutate((state) => removeDrawingPage(state, id, empty(replacementId, name))),
    move: (id: string, index: number) => mutate((state) => moveDrawingPage(state, id, index)),
    sort: (locale: string) => mutate((state) => sortDrawingPages(state, locale)),
    clear: (id: string, name: string) =>
      mutate((state) => clearDrawingPages(state, empty(id, name))),
    setName(name: string) {
      editable()
      if (!name.trim()) throw Error('Document name must not be empty.')
      capture()
      data = { ...data, metadata: { ...data.metadata, name: name.trim() } }
      notify('change')
    },
    extract(id: string, documentId: string) {
      capture()
      const page = data.pages.find((p) => p.id === id)
      if (!page) throw Error('Page no longer exists')
      return parseDrawingDocument({
        format: 'frade-draw',
        version: 2,
        metadata: { id: documentId, name: page.name },
        pages: [page],
      })
    },
    setReadOnly(value: boolean) {
      assertLive()
      if (readonly !== value) {
        readonly = value
        notify('readonly')
      }
    },
    undo,
    redo,
    dispose() {
      if (disposed) return
      disposed = true
      graph.off('history:add', committed)
      listeners.clear()
      Object.assign(graph, original)
    },
  }
}
