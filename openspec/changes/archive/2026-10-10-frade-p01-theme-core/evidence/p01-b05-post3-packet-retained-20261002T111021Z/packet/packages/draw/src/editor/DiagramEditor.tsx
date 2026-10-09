import { useEffect, useRef, useState } from 'react'
import type { Graph } from '@antv/x6'
import { createGraph } from './createGraph'
import { graphToDocument, loadDocument, nodeToCell } from '../document/graphAdapter'
import { downloadDocument, readDocument } from '../document/fileAdapter'
import { diagramShapes, type DiagramDocument, type DiagramShape } from '../document/schema'
import { installSegmentAdapter } from '../segment-editing/x6Adapter'

export type DiagramEditorProps = {
  embedded?: boolean
  onGraphReady?: (graph: Graph) => void | (() => void)
  requestDocumentName?: (currentName: string) => string | null | Promise<string | null>
}
const newMetadata = () => ({ id: crypto.randomUUID(), name: 'diagram' })
let number = 1
export function DiagramEditor({ onGraphReady, requestDocumentName, embedded }: DiagramEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const graph = useRef<Graph | null>(null)
  const metadata = useRef<DiagramDocument['metadata']>(newMetadata())
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
    const resize = () => instance.resize?.(host.current!.clientWidth, host.current!.clientHeight)
    resize()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize)
    observer?.observe(host.current)
    const disposeHostIntegration = onGraphReady?.(instance)
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
      instance.dispose()
      graph.current = null
    }
  }, [onGraphReady])
  const add = (shape: DiagramShape) => {
    const instance = graph.current
    if (!instance) return
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
    if (selected) graph.current?.removeCell(selected)
  }
  const zoom = (amount: number) => graph.current?.zoom(amount)
  const toggleGrid = () => {
    const next = !gridVisible
    setGridVisible(next)
    if (next) graph.current?.showGrid()
    else graph.current?.hideGrid()
  }
  const save = async (saveAs = false) => {
    const instance = graph.current
    if (!instance) return
    const generation = readGeneration.current
    let next = metadata.current
    try {
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
        next = { ...next, name: name.trim() }
      }
      const { tx, ty } = instance.translate()
      downloadDocument(
        graphToDocument(instance, next, { zoom: instance.zoom(), pan: { x: tx, y: ty } }),
      )
      metadata.current = next
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save the document.')
    }
  }
  const createNew = () => {
    const instance = graph.current
    if (!instance) return
    readGeneration.current++
    setOpening(false)
    const next = newMetadata()
    loadDocument(instance, {
      format: 'frade-draw',
      version: 1,
      metadata: next,
      graph: { nodes: [], edges: [] },
    })
    metadata.current = next
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
      loadDocument(instance, model)
      metadata.current = model.metadata
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
    <main>
      <header>
        <strong>Frade Draw</strong>
        {!embedded && (
          <>
            <button onClick={createNew}>New</button>
            <button onClick={() => save()} disabled={opening}>
              Save
            </button>
            <button onClick={() => save(true)} disabled={opening}>
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
        <button onClick={remove} disabled={!selected || opening}>
          Delete
        </button>
        <button onClick={() => graph.current?.undo()} disabled={opening}>
          Undo
        </button>
        <button onClick={() => graph.current?.redo()} disabled={opening}>
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
          <button key={shape} disabled={opening} onClick={() => add(shape)}>
            {shape}
          </button>
        ))}
        {error && <p role="alert">{error}</p>}
      </aside>
      <div className="canvas" ref={host} style={opening ? { pointerEvents: 'none' } : undefined} />
    </main>
  )
}
