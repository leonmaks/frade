import { referenceTheme } from '../reference/vscode-dark-2026/generated'
import { themeRoles } from './contrast'
import { projectEditorPresentation } from './editorPresentation'
import { createRootParticipant, applyRootSnapshot } from './rootParticipant'
import type { ResolvedTheme } from './types'
import type { PresentationParticipant, PreparedPresentation } from './service'

type DisposableParticipant = PresentationParticipant & { dispose(): void }
interface EditorParticipantOptions {
  readonly initialSnapshot?: ResolvedTheme
  readonly paint?: () => Promise<void>
  readonly contentRoot?: HTMLElement
}
declare const appearanceOwnerBrand: unique symbol
/** Opaque, instance-bound presentation authority; no document or persistence capability. */
export interface EditorAppearanceOwner {
  readonly [appearanceOwnerBrand]: true
}
interface AppearanceState {
  readonly root: HTMLElement
  readonly lease: EditorAppearanceOwner
  readonly overlays: Map<HTMLElement, OverlayProjection>
  snapshot?: ResolvedTheme
  active: boolean
}
interface OverlayProjection {
  readonly element: HTMLElement
  readonly tracker: ReturnType<typeof trackProjection>
  release(): void
}
const owners = new WeakMap<HTMLElement, AppearanceState>()
const leases = new WeakMap<EditorAppearanceOwner, AppearanceState>()
const overlayOwners = new WeakMap<HTMLElement, OverlayProjection>()
export function getEditorAppearanceOwner(root: HTMLElement): EditorAppearanceOwner | undefined {
  const state = owners.get(root)
  return state?.active ? state.lease : undefined
}
function applyOverlayProjection(entry: OverlayProjection, snapshot: ResolvedTheme) {
  if (overlayOwners.get(entry.element) !== entry) return
  const before = entry.tracker.read()
  applyRootSnapshot(entry.element, snapshot)
  entry.element.dataset.fradeEditor = 'light'
  entry.tracker.record(before)
}
/** Called by the existing managed host; a supplied stale/foreign lease never rebinds. */
export function attachEditorPresentationOverlay(
  lease: EditorAppearanceOwner,
  element: HTMLElement,
  workbench: HTMLElement,
): () => void {
  const state = leases.get(lease)
  if (
    !state?.active ||
    owners.get(state.root) !== state ||
    !state.snapshot ||
    !workbench.contains(state.root) ||
    !workbench.contains(element) ||
    state.root.ownerDocument !== element.ownerDocument ||
    !state.root.isConnected ||
    overlayOwners.has(element)
  )
    throw Error('Editor overlay appearance owner unavailable')
  let released = false
  const entry: OverlayProjection = {
    element,
    tracker: trackProjection(element),
    release: () => {
      if (released) return
      released = true
      state.overlays.delete(element)
      if (overlayOwners.get(element) === entry) {
        overlayOwners.delete(element)
        entry.tracker.restore()
      }
    },
  }
  state.overlays.set(element, entry)
  overlayOwners.set(element, entry)
  try {
    applyOverlayProjection(entry, state.snapshot)
  } catch (error) {
    entry.release()
    throw error
  }
  return entry.release
}
const phaseKeys = [
  'version',
  'requestId',
  'sessionId',
  'generation',
  'transactionId',
  'revision',
  'membership',
  'phase',
] as const
const identity = (value: string) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 160 &&
  /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) &&
  !value.split('/').some((part) => !part || part === '.' || part === '..')
const attributes = [
  'data-frade-runtime',
  'data-frade-theme',
  'data-frade-density',
  'data-frade-revision',
  'data-frade-reference',
  'data-frade-editor',
  'data-frade-editor-pending',
]
const properties = [
  ...themeRoles.map((role) => '--frade-' + role.replaceAll('.', '-')),
  ...Object.keys(referenceTheme.slots).map((slot) => '--frade-vscode-' + slot),
  'color-scheme',
]
/** Restore explicit projection fields only, and never overwrite a subsequent owner. */
function trackProjection(root: HTMLElement) {
  const stylePresent = root.hasAttribute('style')
  const read = () =>
    new Map([
      ...attributes.map((name) => [name, root.getAttribute(name)] as const),
      ...properties.map(
        (name) =>
          [
            name,
            JSON.stringify([
              root.style.getPropertyValue(name),
              root.style.getPropertyPriority(name),
            ]),
          ] as const,
      ),
    ])
  const initial = read(),
    owned = new Map<string, string | null>()
  return {
    read,
    record: (before: ReturnType<typeof read>) => {
      for (const [name, value] of read()) if (before.get(name) !== value) owned.set(name, value)
    },
    restore: () => {
      const current = read()
      for (const [name, last] of owned) {
        if (current.get(name) !== last) continue
        const value = initial.get(name) ?? null
        if (attributes.includes(name)) {
          if (value === null) root.removeAttribute(name)
          else root.setAttribute(name, value)
        } else {
          const [property, priority] = JSON.parse(value!) as [string, string]
          if (property) root.style.setProperty(name, property, priority)
          else root.style.removeProperty(name)
        }
      }
      if (!stylePresent && root.style.length === 0) root.removeAttribute('style')
      owned.clear()
    },
  }
}
/** Parent chrome and existing canvas/frame capability share one registration and paint barrier. */
export function createEditorPresentationParticipant(
  editor: HTMLElement,
  delegate: DisposableParticipant,
  options: EditorParticipantOptions = {},
): DisposableParticipant {
  if (owners.has(editor) || (options.contentRoot && !editor.contains(options.contentRoot))) {
    delegate.dispose()
    throw Error('Diagram editor presentation root already owned or detached')
  }
  let initialSnapshot: ResolvedTheme | undefined
  try {
    initialSnapshot = options.initialSnapshot
      ? projectEditorPresentation(options.initialSnapshot)
      : undefined
  } catch (error) {
    delegate.dispose()
    throw error
  }
  const lease = Object.freeze({}) as EditorAppearanceOwner
  const appearance: AppearanceState = {
    root: editor,
    lease,
    overlays: new Map(),
    active: true,
    snapshot: initialSnapshot,
  }
  owners.set(editor, appearance)
  leases.set(lease, appearance)
  const root = createRootParticipant(editor, {
    id: delegate.id,
    generation: delegate.generation,
    paint: options.paint,
  })
  const projections = [
    trackProjection(editor),
    ...(options.contentRoot ? [trackProjection(options.contentRoot)] : []),
  ]
  const handles = new Set<PreparedPresentation>()
  let disposed = false,
    contentVisibility: { value: string; priority: string } | undefined
  const valid = () => {
    if (disposed || owners.get(editor) !== appearance)
      throw Error('Diagram editor presentation owner disposed')
  }
  return {
    id: delegate.id,
    generation: delegate.generation,
    requiresPaintCover: true,
    hide: () => {
      valid()
      if (!contentVisibility && options.contentRoot)
        contentVisibility = {
          value: options.contentRoot.style.getPropertyValue('visibility'),
          priority: options.contentRoot.style.getPropertyPriority('visibility'),
        }
      root.hide()
      delegate.hide()
    },
    reveal: () => {
      if (disposed) return
      delegate.reveal()
      root.reveal()
      contentVisibility = undefined
    },
    prepare: async (snapshot, context, signal) => {
      valid()
      const projected = projectEditorPresentation(snapshot)
      const parent = await root.prepare(projected, context, signal)
      let child: PreparedPresentation
      try {
        valid()
        if (signal.aborted) throw Error('Diagram editor prepare aborted')
        child = await delegate.prepare(projected, context, signal)
        try {
          valid()
          if (signal.aborted) throw Error('Diagram editor prepare aborted')
        } catch (error) {
          child.dispose()
          throw error
        }
      } catch (error) {
        parent.dispose()
        throw error
      }
      let released = false
      const stage = async (
        next: Parameters<PreparedPresentation['apply']>[0],
        nextSignal: AbortSignal,
        previous?: Parameters<PreparedPresentation['rollback']>[0],
      ) => {
        valid()
        if (released || nextSignal.aborted || (!previous && signal.aborted))
          throw Error('Diagram editor presentation handle invalidated')
        if (
          Object.keys(next).length !== phaseKeys.length ||
          phaseKeys.some((key) => !Object.hasOwn(next, key)) ||
          next.version !== 1 ||
          next.sessionId !== context.sessionId ||
          next.requestId !== next.transactionId ||
          ![next.requestId, next.sessionId, next.transactionId].every(identity) ||
          ![next.generation, next.revision, next.membership].every(
            (number) => Number.isSafeInteger(number) && number >= 0,
          ) ||
          (previous
            ? next.phase !== 'rollback'
            : !['apply', 'join', 'rollback'].includes(next.phase)) ||
          (!previous && phaseKeys.some((key) => key !== 'phase' && next[key] !== context[key]))
        )
          throw Error('Diagram editor presentation phase mismatch')
        const localSnapshot = previous ? projectEditorPresentation(previous) : projected
        const before = projections.map((projection) => projection.read())
        appearance.snapshot = localSnapshot
        editor.dataset.fradeEditor = 'light'
        editor.removeAttribute('data-frade-editor-pending')
        const parentPaint = previous
          ? parent.rollback(localSnapshot, next, nextSignal)
          : parent.apply(next, nextSignal)
        for (const entry of appearance.overlays.values())
          applyOverlayProjection(entry, localSnapshot)
        // Only a service-painted neutral cover permits this path. Do not leave an iframe
        // under visibility:hidden while waiting for its own RAF/PAINTED acknowledgement.
        root.reveal()
        if (
          contentVisibility &&
          options.contentRoot &&
          options.contentRoot.style.visibility === 'hidden'
        ) {
          if (contentVisibility.value)
            options.contentRoot.style.setProperty(
              'visibility',
              contentVisibility.value,
              contentVisibility.priority,
            )
          else options.contentRoot.style.removeProperty('visibility')
        }
        const childPaint = previous
          ? child.rollback(localSnapshot, next, nextSignal)
          : child.apply(next, nextSignal)
        for (const [index, projection] of projections.entries()) projection.record(before[index])
        const settled = await Promise.allSettled([parentPaint, childPaint])
        const rejected = settled.find((result) => result.status === 'rejected')
        if (rejected?.status === 'rejected') throw rejected.reason
        valid()
        if (released || nextSignal.aborted)
          throw Error('Diagram editor presentation handle invalidated')
        return (
          settled[1] as PromiseFulfilledResult<Awaited<ReturnType<PreparedPresentation['apply']>>>
        ).value
      }
      const handle: PreparedPresentation = {
        apply: (next, nextSignal) => stage(next, nextSignal),
        rollback: (previous, next, nextSignal) => stage(next, nextSignal, previous),
        dispose: () => {
          if (released) return
          released = true
          handles.delete(handle)
          child.dispose()
          parent.dispose()
        },
      }
      handles.add(handle)
      return handle
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      appearance.active = false
      for (const entry of [...appearance.overlays.values()]) entry.release()
      leases.delete(lease)
      for (const handle of [...handles]) handle.dispose()
      delegate.dispose()
      root.reveal()
      for (const projection of projections) projection.restore()
      if (owners.get(editor) === appearance) owners.delete(editor)
    },
  }
}
