import type { Graph } from '@frade/draw'
import type { PresentationParticipant, PhaseContext } from './service'
import type { ResolvedTheme } from './types'
import { createRootParticipant, validatePresentationSnapshot } from './rootParticipant'
export type NativePresentationGraph = Pick<
  Graph,
  'options' | 'container' | 'drawBackground' | 'drawGrid'
>
export interface NativeParticipantOptions {
  readonly id?: string
  readonly generation?: number
  readonly paint?: () => Promise<void>
}
/** Existing X6 view managers only. No model, cell, history or document APIs are part of this port. */
export function createNativeParticipant(
  graph: NativePresentationGraph,
  options: NativeParticipantOptions = {},
): PresentationParticipant & { dispose(): void } {
  const root = createRootParticipant(graph.container, { ...options, id: options.id ?? 'native' })
  const background = graph.options.background ? { ...graph.options.background } : undefined
  const initialArgs = graph.options.grid.args
  const gridArgs = Array.isArray(initialArgs)
    ? initialArgs.map((arg) => ({ ...arg }))
    : initialArgs
      ? { ...initialArgs }
      : undefined
  const hadArgs = Object.hasOwn(graph.options.grid, 'args')
  let disposed = false,
    ownedBackground: Graph['options']['background'],
    ownedGridArgs: Graph['options']['grid']['args']
  function project(snapshot: ResolvedTheme) {
    validatePresentationSnapshot(snapshot)
    const color = snapshot.effectiveColors['diagram.canvas'],
      gridColor = snapshot.effectiveColors['diagram.grid']
    // An authored image owns its background options; do not clear/reload it via drawBackground.
    const currentBackground = graph.options.background
    if (!(currentBackground && currentBackground.image)) {
      ownedBackground = { ...(currentBackground || {}), color }
      graph.drawBackground(ownedBackground, true)
    }
    const grid = graph.options.grid,
      args = grid.args
    ownedGridArgs = Array.isArray(args)
      ? args.map((arg) => ({ ...arg, color: gridColor }))
      : { ...args, color: gridColor }
    graph.drawGrid({ ...grid, args: ownedGridArgs } as Parameters<Graph['drawGrid']>[0])
  }
  return {
    id: root.id,
    generation: root.generation,
    hide: root.hide,
    reveal: root.reveal,
    prepare: async (snapshot, context, signal) => {
      if (disposed || signal.aborted) throw Error('Native presentation participant unavailable')
      const handle = await root.prepare(snapshot, context, signal)
      let released = false
      function valid(next: PhaseContext, nextSignal: AbortSignal, rollback: boolean) {
        if (disposed || released || nextSignal.aborted || (!rollback && signal.aborted))
          throw Error('Native presentation handle invalidated')
        if (
          next.sessionId !== context.sessionId ||
          (rollback
            ? next.phase !== 'rollback'
            : !['apply', 'join', 'rollback'].includes(next.phase))
        )
          throw Error('Native presentation phase mismatch')
        if (
          !rollback &&
          (next.requestId !== context.requestId ||
            next.generation !== context.generation ||
            next.transactionId !== context.transactionId ||
            next.revision !== snapshot.revision ||
            next.membership !== context.membership)
        )
          throw Error('Native presentation owner mismatch')
      }
      return {
        apply: async (next, nextSignal) => {
          valid(next, nextSignal, false)
          project(snapshot)
          return handle.apply(next, nextSignal)
        },
        rollback: async (previous, next, nextSignal) => {
          valid(next, nextSignal, true)
          project(previous)
          return handle.rollback(previous, next, nextSignal)
        },
        dispose: () => {
          released = true
          handle.dispose()
        },
      }
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      root.reveal()
      if (ownedBackground && graph.options.background === ownedBackground)
        graph.drawBackground(background, true)
      if (ownedGridArgs && graph.options.grid.args === ownedGridArgs) {
        graph.drawGrid({ ...graph.options.grid, args: gridArgs } as Parameters<
          Graph['drawGrid']
        >[0])
        if (!hadArgs) delete graph.options.grid.args
      }
    },
  }
}
