import { describe, expect, it } from 'vitest'
import { ConnectionTool } from '../../src/connections/connectionTool'

describe('ConnectionTool', () => {
  it('commits a node-level floating edge and can reconnect terminals', () => {
    const cells = new Map<string, any>()
    const graph: any = {
      getCellById: (id: string) => cells.get(id),
      addEdge: (data: any) => {
        const edge: any = {
          id: 'edge-1',
          source: data.source,
          target: data.target,
          isEdge: () => true,
          setSource(value: any) {
            this.source = value
          },
          setTarget(value: any) {
            this.target = value
          },
        }
        cells.set(edge.id, edge)
        return edge
      },
    }
    for (const id of ['a', 'b', 'c']) cells.set(id, { attr: () => undefined })
    const tool = new ConnectionTool(graph)
    tool.begin('a')
    tool.hoverTarget('b')
    const edge = tool.commit()
    expect((edge as any)?.source.cell).toBe('a')
    expect((edge as any)?.target.cell).toBe('b')
    tool.reconnectTarget(edge!.id, 'c')
    expect((edge as any)?.target.cell).toBe('c')
    tool.cancel()
  })
  it('highlights the whole hovered node and clears it on cancellation', () => {
    const calls: unknown[][] = []
    const target = { attr: (...args: unknown[]) => calls.push(args) }
    const graph: any = {
      getCellById: (id: string) => (id === 'target' ? target : undefined),
      addEdge: () => {
        throw new Error('not expected')
      },
    }
    const tool = new ConnectionTool(graph)
    tool.begin('source')
    tool.hoverTarget('target')
    tool.cancel()
    expect(calls).toEqual([
      ['body/strokeWidth', 3],
      ['body/strokeWidth', 1],
    ])
    expect(tool.getState()).toEqual({ kind: 'idle' })
  })
})
