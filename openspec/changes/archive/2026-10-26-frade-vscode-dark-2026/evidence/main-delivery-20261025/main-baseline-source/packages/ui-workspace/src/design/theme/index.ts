import { createContext, useContext, useSyncExternalStore } from 'react'
import { createThemeRegistry } from './registry'
import { resolveTheme } from './resolver'
import { freezeOwned } from './types'
import { createPresentationService } from './service'
import {
  createRootParticipant,
  createPresentationBarrier,
  afterPresentationPaint,
} from './rootParticipant'
import { createManagedOverlays } from './overlays'
import type { PresentationBarrier } from './service'
import type { ThemeRegistry, PresentationSelection, ResolvedTheme, ResolveInput } from './types'
import type {
  ServiceOptions,
  PresentationService,
  TransactionResult,
  PresentationParticipant,
  TransactionPhase,
} from './service'
import type { ManagedOverlays } from './overlays'
export interface ThemeControllerState {
  readonly snapshot: ResolvedTheme
  readonly selection: PresentationSelection
  readonly durableSelection: PresentationSelection
  readonly phase: TransactionPhase
  readonly busy: boolean
  readonly bootReady: boolean
  readonly preview: boolean
  readonly message: string
  readonly error?: string
  readonly diagnostics: readonly string[]
}
export interface ThemeControllerOptions extends Omit<ServiceOptions, 'barrier'> {
  readonly root: HTMLElement
  readonly registry?: ThemeRegistry
  readonly environment?: ResolveInput['environment']
  readonly overrides?: ResolveInput['overrides']
  readonly paint?: () => Promise<void>
  readonly diagnostics?: readonly string[]
}
export interface ThemeController {
  readonly sessionId: string
  readonly service: PresentationService
  readonly registry: ThemeRegistry
  state(): ThemeControllerState
  subscribe(listener: () => void): () => void
  mountHost(host: HTMLElement): ManagedOverlays
  whenReady(): Promise<void>
  register(participant: PresentationParticipant): { ready: Promise<void>; dispose(): void }
  preview(selection: PresentationSelection): Promise<TransactionResult>
  commit(selection: PresentationSelection): Promise<TransactionResult>
  cancel(): Promise<TransactionResult>
  recover(): Promise<TransactionResult>
  refreshEnvironment(environment: ResolveInput['environment']): Promise<TransactionResult>
  dispose(): void
}
export function createThemeController(options: ThemeControllerOptions): ThemeController {
  const registry = options.registry ?? createThemeRegistry(),
    listeners = new Set<() => void>(),
    registrations = new Set<{ dispose(): void }>(),
    pending = new Set<Promise<void>>()
  const paint = options.paint ?? (() => afterPresentationPaint(options.root))
  let environment = { ...options.environment },
    barrier: PresentationBarrier | undefined,
    managed: ManagedOverlays | undefined,
    host: HTMLElement | undefined,
    disposed = false,
    bootReady = false,
    busy = true,
    message = 'Подготовка интерфейса…',
    error: string | undefined,
    recoveryMessage: string | undefined
  let selection = freezeOwned(structuredClone(options.initialDurable.selection)),
    requested = selection,
    requestSequence = 0,
    pendingPreview = false,
    pendingAction: 'preview' | 'commit' | 'cancel' | 'recover' | 'refresh' | undefined
  let mounted!: () => void
  const hostReady = new Promise<void>((resolve) => {
    mounted = resolve
  })
  const service = createPresentationService({
    ...options,
    barrier: {
      paint: (context) =>
        barrier
          ? barrier.paint(context)
          : Promise.reject(Error('Managed presentation host unavailable')),
      reveal: (context) => barrier?.reveal(context),
      recovery: (reason) => {
        recoveryMessage = reason
        barrier?.recovery(reason)
      },
    },
  })
  let cached: ThemeControllerState
  const update = () => {
    const state = service.state()
    cached = Object.freeze({
      snapshot: state.snapshot,
      selection,
      durableSelection: state.durable.selection,
      phase: state.phase,
      busy,
      bootReady,
      preview: state.preview,
      message,
      ...(error ? { error } : {}),
      diagnostics: Object.freeze([
        ...(options.diagnostics ?? []),
        ...state.diagnostics,
        ...state.snapshot.issues.map((issue) => issue.message),
      ]),
    })
    if (!disposed) for (const listener of [...listeners]) listener()
  }
  update()
  const offWill = service.onWillChangeTheme(() => {
      busy = true
      update()
    }),
    offEvents = service.subscribe((event) => {
      busy = false
      if (event.type === 'did-change' || event.type === 'did-cancel')
        selection = service.state().durable.selection
      else if (event.type === 'did-preview') selection = requested
      else if (event.type === 'did-refresh')
        selection = service.state().preview ? requested : service.state().durable.selection
      else if (!service.state().preview) selection = service.state().durable.selection
      if (event.type === 'failure' || event.type === 'recovery-blocked') {
        error = event.message ?? 'Не удалось обновить интерфейс'
        message = error
      } else {
        error = undefined
        message =
          event.type === 'did-change'
            ? 'Сохранено'
            : event.type === 'did-preview'
              ? 'Предпросмотр — Enter сохранит выбор'
              : event.type === 'did-refresh'
                ? service.state().preview
                  ? 'Предпросмотр — Enter сохранит выбор'
                  : 'Тема системы обновлена'
                : 'Выбор восстановлен'
      }
      update()
    })
  const resolve = (choice: PresentationSelection) =>
    resolveTheme({ registry, selection: choice, environment, overrides: options.overrides })
  const run = async (
    action: NonNullable<typeof pendingAction>,
    choice: PresentationSelection,
    preservePreview = false,
  ): Promise<TransactionResult> => {
    if (disposed) throw Error('Presentation controller disposed')
    const ticket = ++requestSequence
    requested = freezeOwned(structuredClone(choice))
    pendingPreview = preservePreview || action === 'preview' || action === 'commit'
    pendingAction = action
    busy = true
    error = undefined
    message =
      action === 'commit'
        ? 'Применение и сохранение…'
        : action === 'cancel'
          ? 'Восстановление выбора…'
          : action === 'recover'
            ? 'Восстановление интерфейса…'
            : 'Подготовка предпросмотра…'
    update()
    const baseline = resolve(service.state().durable.selection)
    const visible = service.state().preview || pendingPreview
    const result =
      action === 'preview'
        ? await service.preview(requested, resolve(requested))
        : action === 'commit'
          ? await service.commit(requested, resolve(requested))
          : action === 'cancel'
            ? await service.cancel(baseline)
            : action === 'recover'
              ? await service.recover(baseline)
              : await service.refreshEnvironment(baseline, visible ? resolve(requested) : undefined)
    if (ticket === requestSequence) {
      busy = false
      pendingAction = undefined
      if (result.status === 'REFUSED' || result.status === 'RECOVERY_BLOCKED') {
        error = result.message ?? 'Обновление интерфейса отклонено'
        message = error
      } else if (result.status === 'SUPERSEDED') message = 'Выбор изменился — повторите применение'
      update()
    }
    return result
  }
  const register = (participant: PresentationParticipant) => {
    if (disposed) throw Error('Presentation controller disposed')
    const registration = service.register(participant)
    pending.add(registration.ready)
    registrations.add(registration)
    void registration.ready.then(
      () => {
        pending.delete(registration.ready)
      },
      (reason) => {
        pending.delete(registration.ready)
        error = reason instanceof Error ? reason.message : String(reason)
        message = error
        busy = false
        update()
      },
    )
    return {
      ready: registration.ready,
      dispose: () => {
        registration.dispose()
        registrations.delete(registration)
        pending.delete(registration.ready)
      },
    }
  }
  const controller: ThemeController = {
    sessionId: options.sessionId,
    service,
    registry,
    state: () => cached,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    register,
    mountHost: (node) => {
      if (disposed) throw Error('Presentation controller disposed')
      if (host) {
        if (host !== node) throw Error('Presentation overlay host changed identity')
        return managed!
      }
      const owner = node.closest<HTMLElement>('.ka-workbench') ?? node.parentElement
      if (!owner) throw Error('Presentation Workbench owner unavailable')
      host = node
      barrier = createPresentationBarrier(node, paint, () => controller.recover())
      managed = createManagedOverlays(owner, node)
      if (recoveryMessage) barrier.recovery(recoveryMessage)
      mounted()
      return managed
    },
    whenReady: async () => {
      await hostReady
      while (pending.size) await Promise.all([...pending])
      await paint()
      if (pending.size) return controller.whenReady()
      if (disposed || service.state().phase === 'RECOVERY_BLOCKED')
        throw Error(error ?? 'Presentation boot recovery required')
      bootReady = true
      busy = false
      message = 'Интерфейс готов'
      update()
    },
    preview: (choice) => run('preview', choice),
    commit: (choice) => run('commit', choice),
    cancel: () => run('cancel', service.state().durable.selection),
    recover: () => run('recover', service.state().durable.selection),
    refreshEnvironment: (next) => {
      environment = { ...next }
      const visible = service.state().preview || (pendingAction !== undefined && pendingPreview)
      return run('refresh', visible ? requested : service.state().durable.selection, visible)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      for (const registration of registrations) registration.dispose()
      registrations.clear()
      pending.clear()
      offWill()
      offEvents()
      managed?.dispose()
      host?.querySelector('.frade-theme-commit-barrier')?.remove()
      listeners.clear()
    },
  }
  register(createRootParticipant(options.root, { paint }))
  return controller
}
export const ThemeControllerContext = createContext<ThemeController | undefined>(undefined)
export const useThemeController = () => useContext(ThemeControllerContext)
export const useThemeControllerState = (controller: ThemeController) =>
  useSyncExternalStore(controller.subscribe, controller.state, controller.state)
export { createRootParticipant, applyRootSnapshot, afterPresentationPaint } from './rootParticipant'
export { createNativeParticipant } from './nativeParticipant'
export { createFrameParticipant } from './frameParticipant'
export { createShortcutRegistry, registerThemeChord } from './shortcuts'
export { createManagedOverlays } from './overlays'
