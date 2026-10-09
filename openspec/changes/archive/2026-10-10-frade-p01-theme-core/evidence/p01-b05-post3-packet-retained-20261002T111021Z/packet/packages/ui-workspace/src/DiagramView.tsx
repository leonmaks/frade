import { REPOSITORY_OBJECT_MIME } from '@frade/ui-navigator'
import { useEffect, useRef, useState, useLayoutEffect, useId } from 'react'
import { useThemeController, createFrameParticipant, afterPresentationPaint } from './design/theme'
import { createPortal } from 'react-dom'
import {
  defaultAppearance,
  drawioAppearance,
  systemAppearance,
  type ElementAppearance,
} from './elementAppearance'
import { droppedObject } from './repositoryDrop'
import { useBundleManager } from './useBundleManager'
import type { BundleState, FlowPage } from './flowContracts'
import type { JsonValue, ObjectRef } from '@frade/repository-domain'
import { DiagramReferences } from './DiagramReferences'
export interface DiagramDocument {
  path: string
  xml: string
  revision: string
}
export interface DiagramDraft extends DiagramDocument {
  repositoryId: string
  current: string
  dirty: boolean
  error?: string
  saving?: boolean
  unknown?: boolean
  epoch: number
}
export interface DiagramObject {
  id: string
  name: string
  sourceId?: string
  type?: string
  attributes?: Readonly<Record<string, unknown>>
}
export interface DrawioHandle {
  flush(): Promise<string>
  load(xml: string): void
}
const origin = 'frade://drawio'
const url =
  origin +
  '/index.html?embed=1&proto=json&configure=1&offline=1&pwa=0&local=1&noSaveBtn=1&noExitBtn=1&saveAndExit=0&libs=1&libraries=1&lang=ru&plugins=0&stealth=1'
export interface DiagramViewProps {
  flowRepository?: import('./flowContracts').FlowRepository
  appearance?: ElementAppearance
  draft: DiagramDraft
  target: string | null
  objects: DiagramObject[]
  readOnly: boolean
  onBaseline(xml: string): void
  onChange(xml: string): void
  onError(message: string): void
  onSave(): void
  onDiscard(): void
  onOpenObject(id: string): void
  onShortcut(command: string): void
  register(handle: DrawioHandle | undefined): void
}
export function DiagramView(props: DiagramViewProps) {
  const presentation = useThemeController(),
    presentationId = useId().replaceAll(':', ''),
    presentationGeneration = useRef(0),
    [themeDocumentLoaded, setThemeDocumentLoaded] = useState(false),
    [themeReady, setThemeReady] = useState(false),
    [themeError, setThemeError] = useState<string>(),
    presentationBinding = useRef<{
      participant: ReturnType<typeof createFrameParticipant>
      registration: ReturnType<NonNullable<typeof presentation>['register']>
    }>()
  const [container] = useState(() => {
    const node = document.createElement('div')
    node.className = 'repository-diagram'
    return node
  })
  const parking = useRef<HTMLDivElement>(null),
    lastVisibleBounds = useRef<{ left: number; top: number; width: number; height: number }>(),
    frame = useRef<HTMLIFrameElement>(null)
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false),
    [references, setReferences] = useState<DiagramObject[]>([])
  const editorHandle = useRef<DrawioHandle>(),
    currentPage = useRef(0)
  const requestId = useRef(0),
    pending = useRef(
      new Map<
        number,
        {
          resolve: (xml: string) => void
          reject: (e: Error) => void
          timer: ReturnType<typeof setTimeout>
        }
      >(),
    )
  const send = (data: object) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify(data), origin)
  const flowWaiting = useRef(
      new Map<
        number,
        { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
      >(),
    ),
    flowSequence = useRef(0)
  const manager = useBundleManager(
    props,
    async (bundle, members) =>
      new Promise<void>((resolve, reject) => {
        const requestId = ++flowSequence.current,
          timer = setTimeout(() => {
            flowWaiting.current.delete(requestId)
            reject(Error('Редактор не подтвердил изменение состава'))
          }, 10000)
        flowWaiting.current.set(requestId, { resolve, reject, timer })
        send({ action: 'fradeFlow', kind: 'membership', id: bundle.id, members, requestId })
      }),
    (id, text) => send({ action: 'fradeFlow', kind: 'badge', id, text }),
  )
  useEffect(() => {
    if (ready) send({ action: 'fradeFlow', kind: 'panel', open: manager.isOpen })
  }, [ready, manager.isOpen])
  const managerRef = useRef(manager)
  useLayoutEffect(() => {
    managerRef.current = manager
  })
  const [reconnect, setReconnect] = useState<{
    token: number
    bundle: BundleState
    members: ObjectRef[]
    count: number
  }>()
  useLayoutEffect(() => {
    const parent = props.target ? document.querySelector(props.target) : parking.current
    if (parent && container.parentElement !== parent) {
      if (parent === parking.current && container.isConnected) {
        const bounds = container.getBoundingClientRect()
        if (bounds.width > 0 && bounds.height > 0)
          lastVisibleBounds.current = {
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
          }
      }
      if (container.isConnected && 'moveBefore' in parent)
        (parent as Element & { moveBefore(node: Node, before: Node | null): void }).moveBefore(
          container,
          null,
        )
      else parent.appendChild(container)
    }
  }, [container, props.target])
  useLayoutEffect(() => {
    const capture = () => {
      if (!container.isConnected || parking.current?.contains(container)) return
      const bounds = container.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0)
        lastVisibleBounds.current = {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
        }
    }
    capture()
    const observer = new ResizeObserver(capture)
    observer.observe(container)
    return () => observer.disconnect()
  }, [container, props.target])
  useEffect(() => () => container.remove(), [container])
  useEffect(() => {
    const waiting = pending.current
    const membershipWaiting = flowWaiting.current
    const handle: DrawioHandle = {
      load: (xml) => send({ action: 'load', xml, autosave: 1, title: latest.current.draft.path }),
      flush: () =>
        new Promise((resolve, reject) => {
          const id = ++requestId.current
          const timer = setTimeout(() => {
            waiting.delete(id)
            reject(Error('Редактор не подтвердил чтение диаграммы'))
          }, 10000)
          waiting.set(id, { resolve, reject, timer })
          send({ action: 'resetEditor' })
          send({ action: 'export', format: 'xml', requestId: id })
        }),
    }
    editorHandle.current = handle
    latest.current.register(handle)
    const message = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== origin ||
        typeof event.data !== 'string' ||
        event.data.length > 6 * 1024 * 1024
      )
        return
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }
      if (!data || typeof data !== 'object') return
      if (data.event === 'fradeFlow') {
        if (data.kind === 'ack') {
          const p = flowWaiting.current.get(data.requestId)
          if (p) {
            clearTimeout(p.timer)
            flowWaiting.current.delete(data.requestId)
            if (data.ok) p.resolve()
            else p.reject(Error('Изменение состава отклонено'))
          }
          return
        }
        if (data.kind === 'removed') {
          managerRef.current.removed(data.id)
          return
        }
        const b = data.bundle as BundleState
        if (
          !b ||
          typeof b.id !== 'string' ||
          b.id.length > 1000 ||
          !Array.isArray(b.members) ||
          b.members.length > 100000 ||
          b.members.some(
            (r) =>
              !r ||
              typeof r.repositoryId !== 'string' ||
              typeof r.objectId !== 'string' ||
              Object.keys(r).length !== 2,
          ) ||
          [b.endpointA, b.endpointB].some(
            (r) =>
              r !== undefined &&
              (!r ||
                typeof r.repositoryId !== 'string' ||
                typeof r.objectId !== 'string' ||
                Object.keys(r).length !== 2),
          )
        )
          return
        if (data.kind === 'annotation') {
          managerRef.current.annotate([b], false)
          return
        }
        if (data.kind === 'open') managerRef.current.open(b)
        else if (data.kind === 'created') managerRef.current.created(b)
        else if (data.kind === 'reconnect') {
          const repository = latest.current.flowRepository
          if (!repository || !b.endpointA || !b.endpointB) {
            send({ action: 'fradeFlow', kind: 'reconnect', token: data.token, commit: false })
            return
          }
          void repository
            .request('integrationFlows', {
              query: {
                endpointA: b.endpointA,
                endpointB: b.endpointB,
                members: b.members,
                limit: 1,
              } as unknown as JsonValue,
            })
            .then((result) => {
              if (!result.ok) {
                send({ action: 'fradeFlow', kind: 'reconnect', token: data.token, commit: false })
                latest.current.onError('Не удалось проверить состав жгута')
                return
              }
              const members = (result.value as FlowPage).members
                  .filter((m) => m.state === 'valid')
                  .map((m) => m.ref),
                count = b.members.length - members.length
              if (count) setReconnect({ token: data.token, bundle: b, members, count })
              else
                send({
                  action: 'fradeFlow',
                  kind: 'reconnect',
                  token: data.token,
                  members,
                  commit: true,
                })
            })
        } else managerRef.current.update(b)
        return
      }
      if (Number.isInteger(data.currentPage) && data.currentPage >= 0)
        currentPage.current = data.currentPage
      if (data.event === 'configure')
        send({
          action: 'configure',
          config: {
            defaultGridSize: 4,
            defaultPageVisible: false,
            defaultFonts: ['Arial', 'Verdana', 'Times New Roman'],
            suppressNewWindows: true,
            useInternalClipboard: true,
            preserveViewState: true,
            passThroughKeys: [
              { key: 83, ctrl: true, command: 'save' },
              { key: 83, ctrl: true, shift: true, command: 'saveAll' },
              { key: 87, ctrl: true, command: 'close' },
            ],
          },
        })
      else if (data.event === 'init') handle.load(latest.current.draft.current)
      else if (data.event === 'load') {
        void handle
          .flush()
          .then((xml) => {
            latest.current.onBaseline(xml)
            setReady(true)
            setThemeDocumentLoaded(true)
          })
          .catch((e) => latest.current.onError(String(e)))
      } else if (data.event === 'autosave' && typeof data.xml === 'string')
        latest.current.onChange(data.xml)
      else if (data.event === 'save') latest.current.onSave()
      else if (data.event === 'shortcut' && typeof data.command === 'string')
        latest.current.onShortcut(data.command)
      else if (data.event === 'export') {
        const item = waiting.get(data.message?.requestId)
        if (!item) return
        waiting.delete(data.message.requestId)
        clearTimeout(item.timer)
        if (typeof data.xml === 'string') item.resolve(data.xml)
        else item.reject(Error('Draw.io не вернул XML'))
      } else if (data.event === 'error' || data.error)
        latest.current.onError(String(data.error ?? data.message ?? 'Ошибка Draw.io'))
    }
    window.addEventListener('message', message)
    return () => {
      window.removeEventListener('message', message)
      latest.current.register(undefined)
      for (const p of waiting.values()) {
        clearTimeout(p.timer)
        p.reject(Error('Редактор закрыт'))
      }
      waiting.clear()
      for (const p of membershipWaiting.values()) {
        clearTimeout(p.timer)
        p.reject(Error('Редактор закрыт'))
      }
      membershipWaiting.clear()
    }
  }, [])
  useEffect(() => {
    if (!presentation || !ready || !themeDocumentLoaded || !frame.current) return
    // Keep an invalidated required member until its successor is ready to attach; navigation cannot silently opt out.
    presentationBinding.current?.registration.dispose()
    presentationBinding.current?.participant.dispose()
    // Transfer the initial React concealment to the participant synchronously; it will
    // become paintable only after the shared neutral cover is actually painted.
    frame.current.style.removeProperty('visibility')
    let current = true, lowerDiagnosticRevision: string | undefined
    const clearPresentationError = () => {
      // Same-owner publication/failure notifications cannot prove menu recovery.
      // A successfully published new painted revision ends the old diagnostic lease.
      if (lowerDiagnosticRevision === undefined ||
          frame.current?.getAttribute('data-frade-revision') !== lowerDiagnosticRevision) {
        lowerDiagnosticRevision = undefined
        setThemeError(undefined)
      }
    }
    const participant = createFrameParticipant(frame.current, {
      id: 'frame/' + presentationId,
      generation: ++presentationGeneration.current,
      sessionId: presentation.sessionId,
      paintSurface: () => {
        const node = parking.current
        if (!node || !node.contains(container) || !node.hidden) return () => {}
        const bounds = lastVisibleBounds.current
        if (!bounds) throw Error('Inactive editor paint bounds unavailable')
        const originalStyle = node.getAttribute('style'),
          originalInert = node.hasAttribute('inert')
        // Same connected iframe, same last visible geometry, rendered only beneath the painted curtain.
        node.hidden = false
        node.setAttribute('inert', '')
        Object.assign(node.style, {
          position: 'fixed',
          left: bounds.left + 'px',
          top: bounds.top + 'px',
          width: bounds.width + 'px',
          height: bounds.height + 'px',
          zIndex: '2147482000',
          pointerEvents: 'none',
        })
        return () => {
          node.hidden = true
          if (originalStyle === null) node.removeAttribute('style')
          else node.setAttribute('style', originalStyle)
          if (!originalInert) node.removeAttribute('inert')
        }
      },
      surfacePaint: () => {
        const node = parking.current
        return node?.contains(container) && !node.hidden && node.style.position === 'fixed'
          ? afterPresentationPaint(node)
          : undefined
      },
      onPresentationDiagnostic: () => {
        if (!current) return
        lowerDiagnosticRevision = frame.current?.getAttribute('data-frade-revision') ?? undefined
        setThemeError('Меню страниц не помещается в доступной области. Увеличьте окно и откройте меню снова.')
      },
      onInvalidated: () => {
        setThemeReady(false)
        setThemeDocumentLoaded(false)
        setThemeError('Встроенный редактор ожидает восстановления темы')
      },
      onShortcut: (key) =>
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            ctrlKey: key !== 'Escape',
            bubbles: true,
            cancelable: true,
          }),
        ),
    })
    const registration = presentation.register(participant)
    presentationBinding.current = { participant, registration }
    const published = () => {
      const state = presentation.state()
      if (
        current &&
        state.phase === 'PUBLISHED' &&
        frame.current?.getAttribute('data-frade-revision') === String(state.snapshot.revision)
      ) {
        setThemeReady(true)
        clearPresentationError()
      }
    }
    const off = presentation.service.onDidChangeTheme(published)
    void registration.ready.then(
      () => {
        if (current) {
          setThemeReady(true)
          clearPresentationError()
        }
      },
      (error) => {
        if (current) {
          setThemeReady(false)
          setThemeError(error instanceof Error ? error.message : String(error))
        }
      },
    )
    return () => {
      current = false
      off()
    }
  }, [presentation, ready, themeDocumentLoaded, presentationId, container])
  useEffect(
    () => () => {
      presentationBinding.current?.registration.dispose()
      presentationBinding.current?.participant.dispose()
      presentationBinding.current = undefined
    },
    [],
  )
  useEffect(() => {
    if (ready) send({ action: 'fradeFlow', kind: 'init', repositoryId: props.draft.repositoryId })
  }, [ready, props.draft.repositoryId])
  useEffect(() => {
    send({ action: 'fradeDropState', enabled: ready && !props.readOnly })
  }, [ready, props.readOnly])
  const appearance = props.appearance ?? defaultAppearance
  const appearanceMessage = JSON.stringify(
    props.objects.flatMap((object) => {
      const style = systemAppearance(object, appearance)
      return style
        ? [{ id: object.id, sourceId: object.sourceId, style: drawioAppearance(style) }]
        : []
    }),
  )
  useEffect(() => {
    if (!ready) return
    send({
      action: 'fradeAppearanceBegin',
      live: appearance.drawioLive,
      emptyBundle: appearance.emptyBundle,
    })
    // Bound each message independently; repositories can contain thousands of objects.
    const objects = JSON.parse(appearanceMessage) as object[]
    for (let i = 0; i < objects.length; i += 50)
      send({ action: 'fradeAppearanceChunk', objects: objects.slice(i, i + 50) })
    send({ action: 'fradeAppearanceCommit' })
  }, [ready, props.readOnly, appearance.drawioLive, appearance.emptyBundle, appearanceMessage])
  useEffect(() => {
    const start = (event: DragEvent) =>
      setDragging(!!event.dataTransfer?.types.includes(REPOSITORY_OBJECT_MIME))
    const stop = () => setDragging(false)
    window.addEventListener('dragstart', start)
    window.addEventListener('dragend', stop)
    window.addEventListener('drop', stop)
    window.addEventListener('blur', stop)
    return () => {
      window.removeEventListener('dragstart', start)
      window.removeEventListener('dragend', stop)
      window.removeEventListener('drop', stop)
      window.removeEventListener('blur', stop)
    }
  }, [])
  useEffect(() => {
    const release = (event: Event) => {
      const rect = frame.current?.getBoundingClientRect(),
        pointer = event as PointerEvent
      send({
        action: 'fradeFlow',
        kind: 'releasePointer',
        x: Number.isFinite(pointer.clientX) ? pointer.clientX - (rect?.left ?? 0) : 0,
        y: Number.isFinite(pointer.clientY) ? pointer.clientY - (rect?.top ?? 0) : 0,
      })
    }
    window.addEventListener('pointerup', release, true)
    window.addEventListener('pointercancel', release, true)
    return () => {
      window.removeEventListener('pointerup', release, true)
      window.removeEventListener('pointercancel', release, true)
    }
  }, [])
  const currentXml = props.draft.current
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const doc = new DOMParser().parseFromString(currentXml, 'text/xml')
      for (const page of Array.from(doc.querySelectorAll('diagram'))) {
        if (page.querySelector('mxGraphModel') || !page.textContent?.trim()) continue
        try {
          const bytes = Uint8Array.from(atob(page.textContent.trim()), (c) => c.charCodeAt(0))
          const stream = new Blob([bytes])
            .stream()
            .pipeThrough(new DecompressionStream('deflate-raw'))
          const xml = decodeURIComponent(await new Response(stream).text())
          const model = new DOMParser().parseFromString(xml, 'text/xml').documentElement
          page.replaceChildren(doc.importNode(model, true))
        } catch {
          /* The native editor reports invalid compressed pages. */
        }
      }
      const refs = Array.from(doc.querySelectorAll('[fradeObjectId]')).map((n) => ({
        id: n.getAttribute('fradeObjectId')!,
        sourceId: n.getAttribute('fradeSourceId') || undefined,
        name: n.getAttribute('label') || n.getAttribute('fradeObjectId')!,
      }))
      if (!cancelled) setReferences(refs)
    })()
    return () => {
      cancelled = true
    }
  }, [currentXml])
  return (
    <>
      <div ref={parking} hidden />
      {createPortal(
        <>
          <div className="breadcrumbs">
            {props.draft.path}
            <span>·</span>Draw.io 31.5.2
          </div>
          <div className="editor-actions">
            <span>
              {props.draft.saving
                ? 'Сохранение…'
                : props.draft.dirty
                  ? 'Есть несохранённые изменения'
                  : 'Все изменения сохранены'}
            </span>
            <button
              disabled={!ready || props.readOnly || props.draft.saving || props.draft.unknown}
              onClick={props.onSave}
            >
              Сохранить
            </button>
            <button disabled={!ready || props.draft.saving} onClick={props.onDiscard}>
              Отменить изменения
            </button>
            <DiagramReferences
              references={references}
              objects={props.objects}
              onOpen={props.onOpenObject}
            />
          </div>
          {props.draft.error && (
            <div role="alert" className="diagram-error">
              {props.draft.error}
            </div>
          )}
          {themeError && (
            <div role="status" aria-live="polite">
              {themeError}
            </div>
          )}
          {manager.controls}
          <div className="diagram-body">
            <div className={'diagram-frame ' + (props.readOnly ? 'readonly' : '')}>
              <iframe
                ref={frame}
                style={presentation && !themeReady ? { visibility: 'hidden' } : undefined}
                title={props.draft.path}
                src={url}
                sandbox="allow-scripts allow-same-origin allow-downloads"
              />
              {dragging && (
                <div
                  className="diagram-drop-target"
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = ready && !props.readOnly ? 'copy' : 'none'
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    if (!ready) return
                    const object = droppedObject(
                      event.dataTransfer.getData(REPOSITORY_OBJECT_MIME),
                      latest.current,
                    )
                    const rect = frame.current?.getBoundingClientRect()
                    if (object && rect)
                      send({
                        action: 'fradeRepositoryInsert',
                        object: { id: object.id, name: object.name, sourceId: object.sourceId },
                        style: (() => {
                          const style = systemAppearance(
                            object,
                            latest.current.appearance ?? defaultAppearance,
                          )
                          return style ? drawioAppearance(style) : undefined
                        })(),
                        clientX: event.clientX - rect.left,
                        clientY: event.clientY - rect.top,
                      })
                  }}
                />
              )}
              <div className="diagram-readonly">Репозиторий доступен только для чтения</div>
            </div>
            {manager.panel}
            {reconnect && (
              <div
                role="alertdialog"
                aria-label="Изменение конца жгута"
                className="bundle-reconnect"
              >
                <p>
                  При изменении конца жгута {reconnect.count} потока перестанут соответствовать его
                  системам и будут исключены из этого представления.
                </p>
                <button
                  onClick={() => {
                    send({
                      action: 'fradeFlow',
                      kind: 'reconnect',
                      token: reconnect.token,
                      members: reconnect.members,
                      commit: true,
                    })
                    setReconnect(undefined)
                  }}
                >
                  Изменить конец и исключить потоки
                </button>
                <button
                  onClick={() => {
                    send({
                      action: 'fradeFlow',
                      kind: 'reconnect',
                      token: reconnect.token,
                      commit: false,
                    })
                    setReconnect(undefined)
                  }}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </>,
        container,
      )}
    </>
  )
}
