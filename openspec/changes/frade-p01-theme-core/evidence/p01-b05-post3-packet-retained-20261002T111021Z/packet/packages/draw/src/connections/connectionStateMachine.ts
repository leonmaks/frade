export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'source-selected'; sourceNodeId: string }
  | { kind: 'previewing'; sourceNodeId: string; targetNodeId?: string }
  | { kind: 'committed'; edgeId: string }

export type ConnectionEvent =
  | { type: 'begin'; sourceNodeId: string }
  | { type: 'hover-target'; targetNodeId?: string }
  | { type: 'commit'; edgeId: string }
  | { type: 'cancel' }
  | { type: 'pointercancel' }
  | { type: 'source-deleted' }

export function transitionConnection(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  if (event.type === 'cancel' || event.type === 'pointercancel' || event.type === 'source-deleted')
    return { kind: 'idle' }
  if (event.type === 'begin') return { kind: 'source-selected', sourceNodeId: event.sourceNodeId }
  if (
    event.type === 'hover-target' &&
    (state.kind === 'source-selected' || state.kind === 'previewing')
  ) {
    return {
      kind: 'previewing',
      sourceNodeId: state.sourceNodeId,
      targetNodeId: event.targetNodeId,
    }
  }
  if (event.type === 'commit' && state.kind === 'previewing' && state.targetNodeId)
    return { kind: 'committed', edgeId: event.edgeId }
  return state
}
