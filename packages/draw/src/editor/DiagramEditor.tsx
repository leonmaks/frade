import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react'
import type { Graph } from '@antv/x6'
import { createGraph } from './createGraph'
import { nodeToCell } from '../document/graphAdapter'
import { downloadDocument, readDocument } from '../document/fileAdapter'
import { diagramShapes, type DiagramDocument, type DiagramShape } from '../document/schema'
import { installSegmentAdapter } from '../segment-editing/x6Adapter'
import { createDrawingSession, type DrawingSession } from './drawingSession'
import { PageStrip } from './PageStrip'
import type { PageOverlayHost } from './PageStrip'
import { receivePageTransfer, openTransferredPage } from './pageTransfer'
import { pageLabels } from './generated/drawio-pages'

export type DiagramEditorProps = {
  embedded?: boolean
  onGraphReady?: (graph: Graph, session: DrawingSession) => void | (() => void)
  requestDocumentName?: (currentName: string) => string | null | Promise<string | null>
  initialDocument?: unknown
  readOnly?: boolean
  locale?: keyof typeof pageLabels
  pageOverlays?: PageOverlayHost
}
const newMetadata = () => ({ id: crypto.randomUUID(), name: 'diagram' })
let number = 1
export function DiagramEditor({
  onGraphReady,
  requestDocumentName,
  embedded,
  initialDocument,
  readOnly = false,
  locale = 'ru',
  pageOverlays,
}: DiagramEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const graph = useRef<Graph | null>(null)
  const setup = useRef({ locale, readOnly })
  useLayoutEffect(() => {
    setup.current = { locale, readOnly }
  }, [locale, readOnly])
  const initial = useRef(initialDocument),
    controller = useRef<DrawingSession>()
  const [session, setSession] = useState<DrawingSession>()
  const [, refresh] = useState(0)
  const idPrefix = 'frade-drawing-' + useId().replaceAll(':', '')
  const readGeneration = useRef(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [gridVisible, setGridVisible] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const generationRef = readGeneration
    if (!host.current) return
    const instance = createGraph(host.current)
    graph.current = instance
    const empty: DiagramDocument = {
      format: 'frade-draw',
      version: 1,
      metadata: newMetadata(),
      graph: { nodes: [], edges: [] },
    }
    let model = initial.current
    if (model === undefined)
      try {
        model = receivePageTransfer()
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error))
      }
    let drawing: DrawingSession
    try {
      drawing = createDrawingSession(instance, model ?? empty, {
        firstPageName: pageLabels[setup.current.locale].pageWithNumber.replace('{1}', '1'),
        onError: (error) => setError(error.message),
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
      drawing = createDrawingSession(instance, empty)
    }
    drawing.setReadOnly(setup.current.readOnly)
    controller.current = drawing
    const unsubscribe = drawing.subscribe(() => refresh((value) => value + 1))
    setSession(drawing)
    const resize = () => instance.resize?.(host.current!.clientWidth, host.current!.clientHeight)
    resize()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize)
    observer?.observe(host.current)
    const disposeHostIntegration = onGraphReady?.(instance, drawing)
    instance.on('selection:changed', ({ selected }) => {
      instance.getEdges().forEach((edge) => edge.removeTools())
      const cell = selected[0]
      if (cell?.isEdge()) installSegmentAdapter(cell)
      setSelected(cell?.id ?? null)
    })
    return () => {
      generationRef.current++
      observer?.disconnect()
      disposeHostIntegration?.()
      unsubscribe()
      drawing.dispose()
      instance.dispose()
      graph.current = null
      controller.current = undefined
    }
  }, [onGraphReady])
  useLayoutEffect(() => {
    const instance = graph.current
    if (!instance || !session) return
    session.setReadOnly(readOnly || opening)
    const previous = instance.options.interacting
    if (readOnly || opening) {
      instance.options.interacting = false
      instance.disableKeyboard()
      instance.cleanSelection()
      instance.clearTransformWidgets()
    } else instance.enableKeyboard()
    return () => {
      instance.options.interacting = previous
    }
  }, [readOnly, opening, session])
  const add = (shape: DiagramShape) => {
    const instance = graph.current
    if (!instance || readOnly || opening) return
    let id: string
    do {
      id = 'node-' + number++
    } while (instance.getCellById(id))
    instance.addNode(
      nodeToCell({
        id,
        shape,
        x: 120 + number * 12,
        y: 120 + number * 12,
        width: 150,
        height: 72,
        label: shape === 'text' ? 'Text' : 'New shape',
      }),
    )
  }
  const remove = () => {
    if (selected && !readOnly && !opening) graph.current?.removeCell(selected)
  }
  const zoom = (amount: number) => graph.current?.zoom(amount)
  const toggleGrid = () => {
    const next = !gridVisible
    setGridVisible(next)
    if (next) graph.current?.showGrid()
    else graph.current?.hideGrid()
  }
  const save = async (saveAs = false) => {
    const instance = graph.current,
      drawing = controller.current
    if (!instance || !drawing || readOnly) return
    const generation = readGeneration.current
    try {
      const next = drawing.snapshot().metadata
      if (saveAs) {
        const name = requestDocumentName
          ? await requestDocumentName(next.name)
          : window.prompt('Document name', next.name)
        if (generation !== readGeneration.current || graph.current !== instance) return
        if (name === null) return
        if (!name.trim()) {
          setError('Document name must not be empty.')
          return
        }
        drawing.setName(name.trim())
      }
      downloadDocument(drawing.snapshot())
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save the document.')
    }
  }
  const createNew = () => {
    const instance = graph.current
    if (!instance || readOnly) return
    readGeneration.current++
    setOpening(false)
    const next = newMetadata()
    controller.current?.load({
      format: 'frade-draw',
      version: 1,
      metadata: next,
      graph: { nodes: [], edges: [] },
    })
    setSelected(null)
    setError('')
  }
  const open = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0],
      instance = graph.current
    event.target.value = ''
    if (!file || !instance) return
    const generation = ++readGeneration.current
    setOpening(true)
    try {
      const model = await readDocument(file)
      if (generation !== readGeneration.current || graph.current !== instance) return
      controller.current?.load(model)
      setSelected(null)
      setError('')
    } catch (error) {
      if (generation === readGeneration.current)
        setError(error instanceof Error ? error.message : 'Could not open the document.')
    } finally {
      if (generation === readGeneration.current) setOpening(false)
    }
  }
  return (
    <main className="frade-drawing-editor">
      <header>
        <strong>Frade Draw</strong>
        {!embedded && (
          <>
            <button onClick={createNew} disabled={readOnly}>
              New
            </button>
            <button onClick={() => save()} disabled={opening || readOnly}>
              Save
            </button>
            <button onClick={() => save(true)} disabled={opening || readOnly}>
              Save As
            </button>
            <button onClick={() => fileInput.current?.click()}>Open</button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              aria-label="Open diagram"
              hidden
              onChange={open}
            />
          </>
        )}
        <button onClick={remove} disabled={!selected || opening || readOnly}>
          Delete
        </button>
        <button
          onClick={() => graph.current?.undo()}
          disabled={opening || readOnly}
        >
          Undo
        </button>
        <button
          onClick={() => graph.current?.redo()}
          disabled={opening || readOnly}
        >
          Redo
        </button>
        <button onClick={() => zoom(0.1)}>Zoom +</button>
        <button onClick={() => zoom(-0.1)}>Zoom −</button>
        <button onClick={() => graph.current?.zoomToFit({ padding: 30 })}>Fit</button>
        <button onClick={toggleGrid}>Grid</button>
        <button onClick={() => graph.current?.exportSVG('diagram.svg')}>SVG</button>
        <button onClick={() => graph.current?.exportPNG('diagram.png')}>PNG</button>
      </header>
      <aside>
        {diagramShapes.map((shape) => (
          <button key={shape} disabled={opening || readOnly} onClick={() => add(shape)}>
            {shape}
          </button>
        ))}
        {error && <p role="alert">{error}</p>}
      </aside>
      <div
        className="canvas"
        ref={host}
        id={idPrefix + '-canvas'}
        role="tabpanel"
        aria-labelledby={
          session ? idPrefix + '-page-' + encodeURIComponent(session.view().activeId) : undefined
        }
        style={opening ? { pointerEvents: 'none' } : undefined}
      />
      {session && (
        <PageStrip
          overlays={pageOverlays}
          session={session}
          locale={locale}
          idPrefix={idPrefix}
          embedded={embedded}
          onError={setError}
          onOpenPage={(id) => {
            openTransferredPage(session.extract(id, crypto.randomUUID()))
          }}
        />
      )}
    </main>
  )
}
