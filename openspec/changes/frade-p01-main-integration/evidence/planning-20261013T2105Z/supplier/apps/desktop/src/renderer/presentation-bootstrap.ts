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
  const boot = parsePresentationBoot(api.getBoot())
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
        await controller.whenReady()
        if (disposed) throw Error('Presentation bootstrap disposed')
        await api.ready(boot.bootRevision, controller.state().snapshot.revision)
        acknowledged = true
        if (environmentPending) {
          environmentPending = false
          changed()
        }
      })()),
    dispose: () => {
      if (disposed) return
      disposed = true
      for (const query of [dark, contrast, forced]) query.removeEventListener('change', changed)
      controller.dispose()
    },
  }
}
