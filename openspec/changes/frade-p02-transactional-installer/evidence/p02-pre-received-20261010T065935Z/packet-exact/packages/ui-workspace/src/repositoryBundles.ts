import type { Graph, RepositoryNodeReference } from '@frade/draw'
import type { DiagramViewProps } from './DiagramView'
import { defaultAppearance, systemAppearance, type ElementAppearance } from './elementAppearance'
type Edge = ReturnType<Graph['getEdges']>[number]
type Cell = ReturnType<Graph['getCellById']>
export const bundleLine = (style: ElementAppearance['emptyBundle']) => ({
  stroke: style.stroke,
  strokeWidth: style.width,
  sourceMarker: null,
  targetMarker: null,
  strokeDasharray: 'none',
})
export function installRepositoryBundles(graph: Graph, context: () => DiagramViewProps) {
  const applied = new WeakMap<Edge, string>()
  const previews = new WeakMap<Edge, ReturnType<Edge['getAttrs']>>()
  const isSystem = (cell: Cell | null | undefined) => {
    const ref = cell?.getProp('repositoryRef') as RepositoryNodeReference | undefined
    const props = context()
    const object =
      ref && props.objects.find((o) => o.id === ref.objectId && o.sourceId === ref.sourceId)
    return !!object && !!systemAppearance(object, props.appearance ?? defaultAppearance)
  }
  const style = () => (context().appearance ?? defaultAppearance).emptyBundle
  const apply = (edge: Edge) => {
    const paint = style()
    applied.set(edge, JSON.stringify(paint))
    edge.attr('line', bundleLine(paint))
  }
  const connecting = graph.options.connecting,
    originalCreate = connecting.createEdge
  connecting.createEdge = function (args) {
    const edge = originalCreate?.call(this, args)
    if (edge && isSystem(args.sourceCell)) {
      previews.set(edge, structuredClone(edge.getAttrs()))
      edge.attr('line', bundleLine(style()))
    }
    return edge
  }
  const connected = ({ edge, isNew }: { edge: Edge; isNew: boolean }) => {
    if (!isNew || context().readOnly) return
    if (isSystem(edge.getSourceCell()) && isSystem(edge.getTargetCell())) {
      edge.setProp('repositoryBundle', { kind: 'empty' })
      apply(edge)
    } else {
      const original = previews.get(edge)
      if (original) edge.setAttrs(original, { overwrite: true })
    }
    previews.delete(edge)
  }
  graph.on('edge:connected', connected)
  return {
    refresh() {
      if (context().readOnly) return
      const signature = JSON.stringify(style())
      graph.batchUpdate('bundle-appearance', () => {
        for (const edge of graph.getEdges()) {
          if (edge.getProp('repositoryBundle')?.kind !== 'empty' || applied.get(edge) === signature)
            continue
          applied.set(edge, signature)
          const line = bundleLine(style())
          if (Object.entries(line).some(([key, value]) => edge.attr('line/' + key) !== value))
            edge.attr('line', line)
        }
      })
    },
    dispose() {
      graph.off('edge:connected', connected)
      connecting.createEdge = originalCreate
    },
  }
}
