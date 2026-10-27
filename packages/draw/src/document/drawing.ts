import { parseDocument, type DiagramDocument } from './schema'

export type DrawingPage = {
  id: string
  name: string
  graph: DiagramDocument['graph']
  viewport?: DiagramDocument['viewport']
}
export type MultipageDocument = {
  format: 'frade-draw'
  version: 2
  metadata: DiagramDocument['metadata']
  pages: DrawingPage[]
}
export type DrawingDocument = DiagramDocument | MultipageDocument
export type DrawingState = {
  version: 1 | 2
  metadata: DiagramDocument['metadata']
  pages: DrawingPage[]
  activeId: string
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid drawing structure')
  return value as Record<string, unknown>
}
function name(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw Error(message)
  return value
}

/** Validate every graph before any editor/session replacement. The v1 API stays unchanged. */
export function parseDrawingDocument(value: unknown): DrawingDocument {
  const input = record(value)
  if (input.version !== 2) return parseDocument(value)
  if (input.format !== 'frade-draw') throw Error('Unsupported document format')
  const metadata = parseDocument({
    format: 'frade-draw',
    version: 1,
    metadata: input.metadata,
    graph: { nodes: [], edges: [] },
  }).metadata
  if (!Array.isArray(input.pages) || !input.pages.length) throw Error('Drawing needs a page')
  const ids = new Set<string>()
  const pages = input.pages.map((value) => {
    const page = record(value),
      id = name(page.id, 'Invalid page ID')
    if (ids.has(id)) throw Error('Duplicate page ID')
    ids.add(id)
    const parsed = parseDocument({
      format: 'frade-draw',
      version: 1,
      metadata,
      graph: page.graph,
      ...(page.viewport === undefined ? {} : { viewport: page.viewport }),
    })
    return {
      id,
      name: name(page.name, 'Invalid page name'),
      graph: parsed.graph,
      ...(parsed.viewport === undefined ? {} : { viewport: parsed.viewport }),
    }
  })
  return { format: 'frade-draw', version: 2, metadata, pages }
}
export const serializeDrawingDocument = (value: DrawingDocument) =>
  JSON.stringify(parseDrawingDocument(value), null, 2)
export const deserializeDrawingDocument = (json: string) => parseDrawingDocument(JSON.parse(json))

export function pageState(value: unknown, firstName = 'Страница-1'): DrawingState {
  const document = parseDrawingDocument(value)
  const pages =
    document.version === 2
      ? document.pages
      : [
          {
            id: document.metadata.id + '/page-1',
            name: firstName,
            graph: document.graph,
            ...(document.viewport === undefined ? {} : { viewport: document.viewport }),
          },
        ]
  return {
    version: document.version,
    metadata: document.metadata,
    pages,
    activeId: pages[0].id,
  }
}
export function drawingDocument(state: DrawingState): DrawingDocument {
  if (state.version === 2)
    return {
      format: 'frade-draw',
      version: 2,
      metadata: state.metadata,
      pages: state.pages,
    }
  const page = state.pages[0]
  return {
    format: 'frade-draw',
    version: 1,
    metadata: state.metadata,
    graph: page.graph,
    ...(page.viewport === undefined ? {} : { viewport: page.viewport }),
  }
}
export function semanticDrawing(value: DrawingDocument) {
  const parsed = parseDrawingDocument(value)
  if (parsed.version === 1) {
    return {
      format: parsed.format,
      version: parsed.version,
      metadata: parsed.metadata,
      graph: parsed.graph,
    }
  }
  return {
    ...parsed,
    pages: parsed.pages.map(({ id, name, graph }) => ({ id, name, graph })),
  }
}
/** Semantic dirty key: object formatting/order and navigation are not diagram edits. */
export function drawingContentKey(json: string): string {
  return JSON.stringify(semanticDrawing(deserializeDrawingDocument(json)), (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, value[key]]),
        )
      : value,
  )
}
function pageIndex(state: DrawingState, id: string) {
  const index = state.pages.findIndex((page) => page.id === id)
  if (index < 0) throw Error('Page no longer exists')
  return index
}
function newPage(state: DrawingState, page: DrawingPage) {
  if (state.pages.some((current) => current.id === page.id)) throw Error('Duplicate page ID')
  const parsed = parseDrawingDocument({
    format: 'frade-draw',
    version: 2,
    metadata: state.metadata,
    pages: [page],
  }) as MultipageDocument
  return parsed.pages[0]
}
export function nextPageName(pages: DrawingPage[], numbered: (index: number) => string) {
  const names = new Set(pages.map((page) => page.name))
  let index = pages.length + 1
  while (names.has(numbered(index))) index++
  return numbered(index)
}
export function insertDrawingPage(state: DrawingState, value: DrawingPage): DrawingState {
  const page = newPage(state, value)
  return {
    ...state,
    version: 2,
    pages: [...state.pages, page],
    activeId: page.id,
  }
}
export function duplicateDrawingPage(
  state: DrawingState,
  sourceId: string,
  id: string,
  copyName: string,
): DrawingState {
  const index = pageIndex(state, sourceId),
    source = state.pages[index]
  const graph = structuredClone(source.graph)
  const mapped = new Map(graph.nodes.map((node) => [node.id, id + '/' + node.id]))
  for (const node of graph.nodes) node.id = mapped.get(node.id)!
  for (const edge of graph.edges) {
    edge.id = id + '/' + edge.id
    edge.source.nodeId = mapped.get(edge.source.nodeId)!
    edge.target.nodeId = mapped.get(edge.target.nodeId)!
  }
  const page = newPage(state, { id, name: copyName, graph })
  const pages = state.pages.slice()
  pages.splice(index + 1, 0, page)
  return { ...state, version: 2, pages, activeId: id }
}
export function renameDrawingPage(state: DrawingState, id: string, value: string): DrawingState {
  const index = pageIndex(state, id)
  if (!value.trim() || state.pages[index].name === value) return state
  return {
    ...state,
    version: 2,
    pages: state.pages.map((page, i) => (i === index ? { ...page, name: value } : page)),
  }
}
export function clearDrawingPages(state: DrawingState, replacement: DrawingPage): DrawingState {
  const page = newPage(state, replacement)
  return { ...state, version: 2, pages: [page], activeId: page.id }
}
export function removeDrawingPage(
  state: DrawingState,
  id: string,
  replacement: DrawingPage,
): DrawingState {
  const index = pageIndex(state, id)
  if (state.pages.length === 1) return clearDrawingPages(state, replacement)
  const pages = state.pages.filter((page) => page.id !== id)
  return {
    ...state,
    version: 2,
    pages,
    activeId: state.activeId === id ? pages[Math.min(index, pages.length - 1)].id : state.activeId,
  }
}
export function moveDrawingPage(
  state: DrawingState,
  id: string,
  destination: number,
): DrawingState {
  const index = pageIndex(state, id)
  if (!Number.isInteger(destination) || destination < 0 || destination >= state.pages.length)
    throw Error('Invalid page position')
  if (index === destination) return state
  const pages = state.pages.slice(),
    page = pages.splice(index, 1)[0]
  pages.splice(destination, 0, page)
  return { ...state, version: 2, pages }
}
export function sortDrawingPages(state: DrawingState, locale: string): DrawingState {
  const compare = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  })
  const pages = state.pages.slice().sort((a, b) => compare.compare(a.name, b.name))
  return pages.every((page, i) => page === state.pages[i]) ? state : { ...state, version: 2, pages }
}
