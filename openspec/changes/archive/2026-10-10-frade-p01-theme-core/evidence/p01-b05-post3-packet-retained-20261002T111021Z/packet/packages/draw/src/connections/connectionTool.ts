import type { Edge, Graph } from '@antv/x6'
import { transitionConnection, type ConnectionState } from './connectionStateMachine'

export class ConnectionTool {
  private state: ConnectionState = { kind: 'idle' }
  private highlightedNodeId?: string

  constructor(private readonly graph: Graph) {}

  begin(sourceNodeId: string) {
    this.state = transitionConnection(this.state, { type: 'begin', sourceNodeId })
    return this.state
  }
  hoverTarget(targetNodeId?: string) {
    if (this.highlightedNodeId && this.highlightedNodeId !== targetNodeId)
      this.clearHighlight(this.highlightedNodeId)
    this.highlightedNodeId = targetNodeId
    if (targetNodeId) this.graph.getCellById(targetNodeId)?.attr('body/strokeWidth', 3)
    this.state = transitionConnection(this.state, { type: 'hover-target', targetNodeId })
    return this.state
  }
  commit(): Edge | undefined {
    if (this.state.kind !== 'previewing' || !this.state.targetNodeId) return undefined
    const edge = this.graph.addEdge({
      source: { cell: this.state.sourceNodeId },
      target: { cell: this.state.targetNodeId },
    })
    this.state = transitionConnection(this.state, { type: 'commit', edgeId: edge.id })
    this.clearHighlight(this.highlightedNodeId)
    this.highlightedNodeId = undefined
    return edge
  }
  cancel() {
    this.clearHighlight(this.highlightedNodeId)
    this.highlightedNodeId = undefined
    this.state = transitionConnection(this.state, { type: 'cancel' })
    return this.state
  }
  reconnectSource(edgeId: string, nodeId: string) {
    const edge = this.graph.getCellById(edgeId)
    if (edge?.isEdge()) edge.setSource({ cell: nodeId })
  }
  reconnectTarget(edgeId: string, nodeId: string) {
    const edge = this.graph.getCellById(edgeId)
    if (edge?.isEdge()) edge.setTarget({ cell: nodeId })
  }
  getState() {
    return this.state
  }
  private clearHighlight(nodeId?: string) {
    if (nodeId) this.graph.getCellById(nodeId)?.attr('body/strokeWidth', 1)
  }
}
