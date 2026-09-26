import type { Edge } from '@antv/x6'
export const segmentEditingTokens = {
  minEditableLength: 1,
  precision: 0.5,
  snapRadius: 0,
  handleHitSize: 18,
}
export const drawioEditingTokens = { fill: '#29b6f2', stroke: '#fff', selection: '#00a8ff' }
function circlePath(radius: number) {
  return (
    'M ' +
    radius +
    ' 0 A ' +
    radius +
    ' ' +
    radius +
    ' 0 1 0 ' +
    -radius +
    ' 0 A ' +
    radius +
    ' ' +
    radius +
    ' 0 1 0 ' +
    radius +
    ' 0 Z'
  )
}
function terminalAttrs(edge: Edge, source: boolean) {
  const terminal = (source ? edge.getSource?.() : edge.getTarget?.()) as
    { cell?: string; port?: string } | undefined
  const radius = source ? 6 : 7
  return {
    d:
      circlePath(radius) +
      (terminal?.port ? ' M -3 -3 L 3 3 M -3 3 L 3 -3' : terminal?.cell ? ' ' + circlePath(3) : ''),
    fill: terminal?.port ? '#01bd22' : drawioEditingTokens.fill,
    stroke: drawioEditingTokens.stroke,
    'stroke-width': 1,
    'fill-rule': 'nonzero',
    cursor: 'move',
  }
}
export function installSegmentAdapter(edge: Edge, onChanged?: (edge: Edge) => void) {
  edge.addTools([
    {
      name: 'floating-segments',
      args: {
        precision: segmentEditingTokens.precision,
        threshold: segmentEditingTokens.minEditableLength,
        snapRadius: segmentEditingTokens.snapRadius,
        removeRedundancies: false,
        onChanged: ({ edge: changed }: { edge: Edge }) => onChanged?.(changed),
      },
    },
    { name: 'source-arrowhead', args: { attrs: terminalAttrs(edge, true) } },
    { name: 'target-arrowhead', args: { attrs: terminalAttrs(edge, false) } },
  ])
  return () => edge.removeTools()
}
