import { describe, expect, it } from 'vitest'
import { transitionConnection } from '../../src/connections/connectionStateMachine'

describe('connection state machine', () => {
  it('supports preview, commit and cancellation', () => {
    let state = transitionConnection({ kind: 'idle' }, { type: 'begin', sourceNodeId: 'a' })
    state = transitionConnection(state, { type: 'hover-target', targetNodeId: 'b' })
    expect(state).toEqual({ kind: 'previewing', sourceNodeId: 'a', targetNodeId: 'b' })
    expect(transitionConnection(state, { type: 'commit', edgeId: 'e1' })).toEqual({
      kind: 'committed',
      edgeId: 'e1',
    })
    expect(transitionConnection(state, { type: 'pointercancel' })).toEqual({ kind: 'idle' })
  })

  it('does not commit without a target', () => {
    const state = transitionConnection(
      { kind: 'source-selected', sourceNodeId: 'a' },
      { type: 'commit', edgeId: 'e1' },
    )
    expect(state).toEqual({ kind: 'source-selected', sourceNodeId: 'a' })
  })
})
