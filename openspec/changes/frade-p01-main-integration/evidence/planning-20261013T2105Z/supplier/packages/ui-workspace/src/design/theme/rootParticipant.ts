import type { ResolvedTheme } from './types'
import { isHexColor, themeRoles } from './contrast'
import type {
  PresentationParticipant,
  PresentationBarrier,
  PhaseContext,
  PaintAck,
} from './service'
export interface RootParticipantOptions {
  readonly id?: string
  readonly generation?: number
  readonly paint?: () => Promise<void>
}
/** Two RAF boundaries: an ACK after the second observes the paint between them. */
export function afterPresentationPaint(root: HTMLElement): Promise<void> {
  const view = root.ownerDocument.defaultView
  if (!view) return Promise.reject(Error('Presentation document has no active view'))
  return new Promise((resolve) =>
    view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve())),
  )
}
const systemColor = (role: string): string =>
  [
    'action.primary',
    'action.primaryHover',
    'selection.bg',
    'selection.indicator',
    'focus.ring',
    'diagram.selection',
  ].includes(role)
    ? 'Highlight'
    : ['action.onPrimary', 'selection.fg'].includes(role)
      ? 'HighlightText'
      : role.startsWith('surface.') || role.endsWith('Bg') || role === 'diagram.canvas'
        ? 'Canvas'
        : 'CanvasText'
export function validatePresentationSnapshot(snapshot: ResolvedTheme): void {
  for (const values of [snapshot.colors, snapshot.effectiveColors])
    if (
      Object.keys(values).length !== themeRoles.length ||
      themeRoles.some((role) => !Object.hasOwn(values, role))
    )
      throw Error('Incomplete presentation role projection')
  for (const role of themeRoles)
    if (
      !isHexColor(snapshot.colors[role]) ||
      snapshot.effectiveColors[role] !==
        (snapshot.forcedColors ? systemColor(role) : snapshot.colors[role])
    )
      throw Error('Invalid presentation role projection: ' + role)
  if (
    !['light', 'dark', 'high-contrast'].includes(snapshot.kind) ||
    !['compact', 'comfortable'].includes(snapshot.density) ||
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < 0
  )
    throw Error('Invalid presentation root metadata')
}
export function applyRootSnapshot(root: HTMLElement, snapshot: ResolvedTheme): void {
  validatePresentationSnapshot(snapshot)
  for (const role of themeRoles)
    root.style.setProperty('--frade-' + role.replaceAll('.', '-'), snapshot.effectiveColors[role])
  root.dataset.fradeRuntime = '1'
  root.dataset.fradeTheme = snapshot.kind
  root.dataset.fradeDensity = snapshot.density
  root.dataset.fradeRevision = String(snapshot.revision)
  root.style.colorScheme = snapshot.forcedColors
    ? 'light dark'
    : snapshot.kind === 'light'
      ? 'light'
      : 'dark'
}
export function createRootParticipant(
  root: HTMLElement,
  options: RootParticipantOptions = {},
): PresentationParticipant {
  const id = options.id ?? 'root',
    generation = options.generation ?? 1,
    paint = options.paint ?? (() => afterPresentationPaint(root))
  let hidden = false,
    visibility = '',
    priority = ''
  return {
    id,
    generation,
    hide: () => {
      if (hidden) return
      hidden = true
      visibility = root.style.getPropertyValue('visibility')
      priority = root.style.getPropertyPriority('visibility')
      root.style.setProperty('visibility', 'hidden')
    },
    reveal: () => {
      if (!hidden) return
      hidden = false
      if (visibility) root.style.setProperty('visibility', visibility, priority)
      else root.style.removeProperty('visibility')
    },
    prepare: async (snapshot, preparedContext, preparedSignal) => {
      validatePresentationSnapshot(snapshot)
      let disposed = false
      const valid = (context: PhaseContext, signal: AbortSignal, rollback: boolean) => {
        if (disposed || signal.aborted || (!rollback && preparedSignal.aborted))
          throw Error('Presentation root handle invalidated')
        if (
          !rollback &&
          (context.requestId !== preparedContext.requestId ||
            context.sessionId !== preparedContext.sessionId ||
            context.generation !== preparedContext.generation ||
            context.transactionId !== preparedContext.transactionId ||
            context.revision !== snapshot.revision ||
            context.membership !== preparedContext.membership)
        )
          throw Error('Presentation root phase mismatch')
        if (
          rollback
            ? context.phase !== 'rollback'
            : context.phase !== 'apply' && context.phase !== 'join' && context.phase !== 'rollback'
        )
          throw Error('Presentation root phase mismatch')
      }
      const ack = (context: PhaseContext): PaintAck =>
        Object.freeze({
          ...context,
          participantId: id,
          participantGeneration: generation,
          painted: true,
        })
      return {
        apply: async (context, signal) => {
          valid(context, signal, false)
          applyRootSnapshot(root, snapshot)
          await paint()
          valid(context, signal, false)
          return ack(context)
        },
        rollback: async (previous, context, signal) => {
          valid(context, signal, true)
          applyRootSnapshot(root, previous)
          await paint()
          valid(context, signal, true)
          return ack(context)
        },
        dispose: () => {
          disposed = true
        },
      }
    },
  }
}
/** Caller mounts this in the stable managed host and supplies the service recovery action. */
export function createPresentationBarrier(
  host: HTMLElement,
  paint: () => Promise<void> = () => afterPresentationPaint(host),
  recover?: () => Promise<unknown>,
): PresentationBarrier {
  const curtain = host.ownerDocument.createElement('div'),
    status = host.ownerDocument.createElement('span'),
    button = host.ownerDocument.createElement('button')
  curtain.className = 'frade-theme-commit-barrier'
  curtain.hidden = true
  curtain.setAttribute('role', 'status')
  curtain.setAttribute('aria-live', 'polite')
  curtain.setAttribute('aria-atomic', 'true')
  status.textContent = 'Обновление интерфейса…'
  button.type = 'button'
  button.textContent = 'Повторить'
  button.hidden = true
  button.disabled = !recover
  curtain.append(status, button)
  host.append(curtain)
  const inert = new Map<HTMLElement, boolean>()
  let previousFocus: HTMLElement | undefined
  const cover = () => {
    curtain.hidden = false
    const owner = host.closest<HTMLElement>('.ka-workbench') ?? host
    if (!inert.size)
      previousFocus =
        host.ownerDocument.activeElement instanceof HTMLElement
          ? host.ownerDocument.activeElement
          : undefined
    for (const child of owner.children)
      if (
        child instanceof HTMLElement &&
        child !== curtain &&
        child !== host &&
        !inert.has(child)
      ) {
        inert.set(child, child.hasAttribute('inert'))
        child.setAttribute('inert', '')
      }
  }
  button.addEventListener('click', async () => {
    if (!recover || button.disabled) return
    button.disabled = true
    try {
      await recover()
    } catch (error) {
      status.textContent =
        'Восстановление не выполнено: ' + (error instanceof Error ? error.message : String(error))
    } finally {
      button.disabled = !recover
    }
  })
  return {
    paint: async () => {
      cover()
      button.hidden = true
      status.textContent = 'Обновление интерфейса…'
      await paint()
    },
    reveal: () => {
      curtain.hidden = true
      for (const [element, wasInert] of inert) if (!wasInert) element.removeAttribute('inert')
      inert.clear()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      previousFocus = undefined
    },
    recovery: (message) => {
      cover()
      status.textContent = 'Интерфейс ожидает восстановления: ' + message
      button.hidden = false
      button.disabled = !recover
      if (recover) button.focus({ preventScroll: true })
    },
  }
}
