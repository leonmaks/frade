import { parsePresentationBoot } from '@frade/runtime-contracts'
import type { PresentationApi } from '@frade/runtime-contracts'
import { createThemeController, applyRootSnapshot } from '@frade/ui-workspace/design/theme'
import type { ThemeController } from '@frade/ui-workspace/design/theme'
/** Synchronous validated projection precedes createRoot; Main show requires a later paint handshake. */
export function bootstrapPresentation(
  api: PresentationApi,
  root: HTMLElement,
  options: { paint?: () => Promise<void>; media?: (query: string) => MediaQueryList } = {},
): { controller: ThemeController; ready(): Promise<void>; dispose(): void } {
  if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'boot.enter', performance.now())
  if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'boot.input.before', performance.now())
  const boot = parsePresentationBoot(api.getBoot())
  if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'boot.input.after', performance.now())
  const media = options.media ?? ((query: string) => window.matchMedia(query))
  const dark = media('(prefers-color-scheme: dark)'),
    contrast = media('(prefers-contrast: more)'),
    forced = media('(forced-colors: active)')
  const environment = () => ({
    colorScheme: dark.matches ? ('dark' as const) : ('light' as const),
    highContrast: contrast.matches,
    forcedColors: forced.matches,
  })
  applyRootSnapshot(root, boot.snapshot)
  if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'controller.before', performance.now())
  const controller = createThemeController({
    sessionId: boot.sessionId,
    root,
    initialSnapshot: boot.snapshot,
    initialDurable: {
      revision: boot.durable.revision,
      generation: boot.durable.generation,
      transactionId: boot.durable.transactionId,
      selection: boot.durable.selection,
    },
    diagnostics: boot.diagnostics,
    environment: environment(),
    paint: options.paint,
    host: {
      announceIntent: (requestId) => api.announceIntent(requestId),
      persist: (context, selection, expectedRevision) =>
        api.persist(context, selection, expectedRevision),
      reconcile: (context, lastPublished) =>
        api.reconcile(context, { version: 1, ...lastPublished }),
    },
  })
  if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'controller.after', performance.now())
  let disposed = false,
    acknowledged = false,
    environmentPending = false,
    readiness: Promise<void> | undefined
  const changed = () => {
    if (disposed) return
    if (!acknowledged) {
      environmentPending = true
      return
    }
    void controller.refreshEnvironment(environment())
  }
  for (const query of [dark, contrast, forced]) query.addEventListener('change', changed)
  return {
    controller,
    ready: () =>
      (readiness ??= (async () => {
        if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'ready.enter', performance.now())
        await controller.whenReady()
        if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'ready.controller.settled', performance.now())
        if (disposed) throw Error('Presentation bootstrap disposed')
        if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'ready.host.before', performance.now())
        await api.ready(boot.bootRevision, controller.state().snapshot.revision)
        if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'ready.host.after', performance.now())
        acknowledged = true
        if (environmentPending) {
          environmentPending = false
          changed()
        }
      })()),
    dispose: () => {
      if (disposed) return
      if (import.meta.env.DEV) console.info('[frade:p02:renderer]', 'dispose', performance.now())
      disposed = true
      for (const query of [dark, contrast, forced]) query.removeEventListener('change', changed)
      controller.dispose()
    },
  }
}
