import { Graph, History, Keyboard, Selection, Transform, Export } from '@antv/x6'
import '../segment-editing/floatingSegments'
import '../routing/roundedConnector'
import { installFloatingRoutingLifecycle } from '../routing/x6RoutingAdapter'

export function createGraph(container: HTMLElement) {
  const graph = new Graph({
    container,
    background: { color: '#f8fafc' },
    grid: { visible: true, size: 10 },
    panning: true,
    interacting: { edgeLabelMovable: true },
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    connecting: {
      allowNode: true,
      allowPort: false,
      allowBlank: false,
      allowLoop: false,
      anchor: 'center',
      connectionPoint: 'boundary',
      router: { name: 'orth' },
      connector: { name: 'frade-rounded', args: { radius: 8 } },
      validateConnection: ({
        sourceCell,
        targetCell,
      }: {
        sourceCell?: { id: string } | null
        targetCell?: { id: string } | null
      }) => !sourceCell || !targetCell || sourceCell.id !== targetCell.id,
      createEdge() {
        return this.createEdge({
          attrs: {
            line: { stroke: '#2563eb', strokeWidth: 2, targetMarker: { name: 'classic', size: 8 } },
          },
        })
      },
    },
    highlighting: {
      magnetAvailable: {
        name: 'stroke',
        args: { padding: 4, attrs: { stroke: '#00a8ff', strokeWidth: 3 } },
      },
      magnetAdsorbed: {
        name: 'stroke',
        args: { padding: 5, attrs: { stroke: '#00a8ff', strokeWidth: 3 } },
      },
    },
  })
  graph.use(new Selection({ enabled: true, multiple: false, rubberband: true }))
  graph.use(
    new History({
      enabled: true,
      beforeAddCommand: (event, args) =>
        event !== 'cell:change:*' || !args || !('key' in args) || args.key !== 'tools',
    }),
  )
  graph.use(new Transform({ resizing: { enabled: true }, rotating: false }))
  graph.use(new Keyboard({ enabled: true }))
  graph.use(new Export())
  graph.bindKey(['backspace', 'delete'], () => {
    graph.removeCells(graph.getSelectedCells())
    return false
  })
  graph.bindKey(['ctrl+z', 'meta+z'], () => {
    graph.undo()
    return false
  })
  graph.bindKey(['ctrl+y', 'meta+shift+z'], () => {
    graph.redo()
    return false
  })
  const uninstallRouting = installFloatingRoutingLifecycle(graph)
  const dispose = (graph as unknown as { dispose?: () => void }).dispose
  if (dispose)
    graph.dispose = () => {
      uninstallRouting()
      dispose.call(graph)
    }
  return graph
}
