import { useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { DiagramEditor } from '../src/editor/DiagramEditor'
import type { DrawingSession } from '../src/editor/drawingSession'
import type { Graph } from '@antv/x6'
import '../src/style.css'
import { createManagedOverlays } from '../../ui-workspace/src/design/theme/overlays'
declare global {
  interface Window {
    pageFixture: {
      session: DrawingSession
      graph: Graph
      readOnly(value: boolean): void
      overlayTop(): boolean
    }
  }
}
const params = new URLSearchParams(location.search)
const root = document.querySelector<HTMLElement>('#root')!
const host = document.createElement('div')
host.id = 'fixture-overlay-host'
root.parentElement!.append(host)
const managed = createManagedOverlays(root.parentElement!, host)
window.addEventListener(
  'keydown',
  (event) => {
    if (managed.handleKey(event)) event.stopPropagation()
  },
  false,
)
const overlays = params.has('hosted')
  ? {
      host,
      register: (
        element: HTMLElement,
        options: {
          modal: boolean
          opener: HTMLElement
          initialFocus?: HTMLElement | null
          cancel(): void
        },
      ) =>
        managed.register({
          id: 'fixture-pages',
          element,
          priority: 50,
          modal: options.modal,
          opener: options.opener,
          initialFocus: options.initialFocus,
          outside: 'retain',
          cancel: () => {
            options.cancel()
            return true
          },
        }),
    }
  : undefined
const fixture = params.has('seed')
  ? {
      format: 'frade-draw',
      version: 2,
      metadata: { id: 'seed', name: 'Seed' },
      pages: Array.from({ length: 20 }, (_, i) => ({
        id: 'page-' + i,
        name: 'Страница-' + (i + 1),
        graph: { nodes: [], edges: [] },
      })),
    }
  : undefined
function Fixture() {
  const [readOnly, setReadOnly] = useState(params.has('readonly'))
  const ready = useCallback((graph: Graph, session: DrawingSession) => {
    window.pageFixture = {
      graph,
      session,
      readOnly: setReadOnly,
      overlayTop: () => !!managed.top(),
    }
  }, [])
  return (
    <DiagramEditor
      embedded={params.has('embed')}
      readOnly={readOnly}
      initialDocument={fixture}
      onGraphReady={ready}
      pageOverlays={overlays}
    />
  )
}
createRoot(document.querySelector('#root')!).render(<Fixture />)
