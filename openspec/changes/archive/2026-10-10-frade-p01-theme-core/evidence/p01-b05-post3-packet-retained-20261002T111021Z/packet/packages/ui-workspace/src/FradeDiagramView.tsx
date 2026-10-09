import { useCallback, useEffect, useLayoutEffect, useRef, useState, useId } from 'react'
import { useThemeController, createNativeParticipant } from './design/theme'
import { createPortal } from 'react-dom'
import {
  DiagramEditor,
  deserializeDocument,
  serializeDocument,
  graphToDocument,
  loadDocument,
  nodeToCell,
  type Graph,
  type RepositoryNodeReference,
} from '@frade/draw'
import type { DiagramViewProps, DiagramObject } from './DiagramView'
import { REPOSITORY_OBJECT_MIME } from '@frade/ui-navigator'
import { defaultAppearance, systemAppearance } from './elementAppearance'
import { installRepositoryBundles } from './repositoryBundles'
import { useBundleManager } from './useBundleManager'
import type { BundleState, FlowPage } from './flowContracts'
import type { ObjectRef, JsonValue } from '@frade/repository-domain'
import { droppedObject } from './repositoryDrop'
import { DiagramReferences } from './DiagramReferences'
export interface FradeDiagramEvent {
  type:
    | 'document-changed'
    | 'node-selected'
    | 'node-activated'
    | 'object-updated'
    | 'reference-unresolved'
  repositoryId: string
  path: string
  cellId?: string
  reference?: RepositoryNodeReference
}
export function FradeDiagramView(
  props: DiagramViewProps & { onEvent?(event: FradeDiagramEvent): void },
) {
  const presentation = useThemeController(),
    presentationRef = useRef(presentation),
    presentationId = useRef('native/' + useId().replaceAll(':', ''))
  useLayoutEffect(() => {
    presentationRef.current = presentation
  }, [presentation])
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const appearanceSignatures = useRef(new WeakMap<object, string>())
  const bundles = useRef<ReturnType<typeof installRepositoryBundles>>()
  const graph = useRef<Graph>(),
    metadata = useRef(deserializeDocument(props.draft.current).metadata)
  const manager = useBundleManager(
    props,
    async (bundle, members) => {
      const instance = graph.current,
        edge = instance?.getCellById(bundle.id)
      if (!instance || !edge?.isEdge() || edge.getProp('repositoryBundle')?.kind !== 'empty')
        throw Error('Жгут больше не существует')
      instance.batchUpdate('bundle-membership', () =>
        edge.setProp('repositoryBundle', { kind: 'empty', integrationFlowRefs: members }),
      )
    },
    (id, text) => {
      const instance = graph.current,
        edge = instance?.getCellById(id)
      if (instance && edge?.isEdge()) {
        const measure = document.createElement('canvas').getContext('2d')
        if (measure) measure.font = '12px Arial'
        const width = Math.max(
          0,
          ...text.split('\n').map((line) => measure?.measureText(line).width ?? line.length * 7),
        )
        const currentPosition = edge.getLabelAt(0)?.position,
          automaticPosition = edge.getProp('bundleAutoLabelPosition'),
          manual =
            currentPosition &&
            JSON.stringify(currentPosition) !== JSON.stringify(automaticPosition),
          position = manual
            ? currentPosition
            : {
                distance: 0.5,
                offset: { x: 0, y: -(48 + (text.split('\n').length - 1) * 8) },
                options: { absoluteOffset: true },
              }
        if (!manual) edge.setProp('bundleAutoLabelPosition', position, { silent: true })
        edge.setLabels(
          [
            {
              position,
              attrs: {
                body: { fill: '#FFFFFFAA' },
                label: {
                  text,
                  fill: '#404040',
                  fontSize: 12,
                  fontFamily: 'Arial',
                  textAnchor: 'start',
                  x: -width / 2,
                },
              },
            },
          ],
          {
            silent: true,
          },
        )
        const view = edge.findView(instance)
        if (view?.isEdgeView()) {
          view.onLabelsChange()
          const label = view.container.querySelector('.x6-edge-labels')?.getBoundingClientRect(),
            viewport = instance.container.getBoundingClientRect()
          if (label?.height && label.top < viewport.top + 8 && label.bottom > viewport.top) {
            const { tx, ty } = instance.translate()
            instance.translate(tx, ty + viewport.top + 8 - label.top)
          }
        }
      }
    },
  )
  const managerRef = useRef(manager)
  useLayoutEffect(() => {
    managerRef.current = manager
  })
  const bundleState = (edge: ReturnType<Graph['getEdges']>[number]): BundleState => {
    const get = (source: boolean) => {
      const node = source ? edge.getSourceCell() : edge.getTargetCell()
      const ref = node?.getProp('repositoryRef') as RepositoryNodeReference | undefined
      return ref && !ref.sourceId
        ? { repositoryId: latest.current.draft.repositoryId, objectId: ref.objectId }
        : undefined
    }
    return {
      id: edge.id,
      endpointA: get(true),
      endpointB: get(false),
      members: edge.getProp('repositoryBundle')?.integrationFlowRefs ?? [],
    }
  }
  const [reconnect, setReconnect] = useState<{
    edgeId: string
    source: ReturnType<ReturnType<Graph['getEdges']>[number]['getSource']>
    target: ReturnType<ReturnType<Graph['getEdges']>[number]['getTarget']>
    expected: string
    members: ObjectRef[]
    count: number
  }>()
  const [contextMenu, setContextMenu] = useState<BundleState>()
  const [container] = useState(() => {
    const element = document.createElement('div')
    element.className = 'repository-diagram'
    return element
  })
  const parking = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false),
    [references, setReferences] = useState<
      { cellId: string; ref: RepositoryNodeReference; name: string }[]
    >([])
  const emit = useCallback(
    (type: FradeDiagramEvent['type'], cellId?: string, reference?: RepositoryNodeReference) =>
      latest.current.onEvent?.({
        type,
        repositoryId: latest.current.draft.repositoryId,
        path: latest.current.draft.path,
        cellId,
        reference,
      }),
    [],
  )
  useLayoutEffect(() => {
    const parent = props.target ? document.querySelector(props.target) : parking.current
    if (parent && container.parentElement !== parent) parent.appendChild(container)
  }, [container, props.target])
  useEffect(() => () => container.remove(), [container])
  const readyGraph = useCallback(
    (instance: Graph) => {
      graph.current = instance
      const model = loadDocument(instance, JSON.parse(latest.current.draft.current))
      metadata.current = model.metadata
      const bundleIntegration = installRepositoryBundles(instance, () => latest.current)
      const originalValidate = instance.options.connecting.validateEdge
      instance.options.connecting.validateEdge = function (args) {
        if (originalValidate && !originalValidate.call(this, args)) return false
        const { edge, type, previous } = args,
          members = edge.getProp('repositoryBundle')?.integrationFlowRefs ?? []
        if (
          !members.length ||
          JSON.stringify(previous) ===
            JSON.stringify(type === 'source' ? edge.getSource() : edge.getTarget())
        )
          return true
        const source = edge.getSource(),
          target = edge.getTarget(),
          prospective = bundleState(edge),
          expected = JSON.stringify({
            source: type === 'source' ? previous : source,
            target: type === 'target' ? previous : target,
            members,
          })
        const unchanged = () =>
          instance.getCellById(edge.id) === edge &&
          !latest.current.readOnly &&
          JSON.stringify({
            source: edge.getSource(),
            target: edge.getTarget(),
            members: edge.getProp('repositoryBundle')?.integrationFlowRefs ?? [],
          }) === expected
        queueMicrotask(() => {
          const repo = latest.current.flowRepository
          if (!repo || !prospective.endpointA || !prospective.endpointB) {
            latest.current.onError('Не удалось разрешить системы жгута')
            return
          }
          void repo
            .request('integrationFlows', {
              query: {
                endpointA: prospective.endpointA,
                endpointB: prospective.endpointB,
                members,
                limit: 1,
              } as unknown as JsonValue,
            })
            .then((result) => {
              if (!result.ok) {
                latest.current.onError('Не удалось проверить состав жгута')
                return
              }
              if (!unchanged()) {
                latest.current.onError(
                  'Жгут изменился во время проверки. Повторите переподключение.',
                )
                return
              }
              const valid = (result.value as FlowPage).members
                  .filter((m) => m.state === 'valid')
                  .map((m) => m.ref),
                count = members.length - valid.length
              if (count)
                setReconnect({ edgeId: edge.id, source, target, members: valid, count, expected })
              else
                instance.batchUpdate('bundle-reconnect', () => {
                  edge.setSource(source)
                  edge.setTarget(target)
                  edge.setProp('repositoryBundle', { kind: 'empty', integrationFlowRefs: valid })
                  instance.trigger('edge:connected', { edge, isNew: false })
                })
            })
        })
        return false
      }
      bundles.current = bundleIntegration
      const snapshot = () => {
        const { tx, ty } = instance.translate()
        return serializeDocument(
          graphToDocument(instance, metadata.current, {
            zoom: instance.zoom(),
            pan: { x: tx, y: ty },
          }),
        )
      }
      const refs = () =>
        setReferences(
          instance.getNodes().flatMap((node) => {
            const ref = node.getProp('repositoryRef') as RepositoryNodeReference | undefined
            return ref
              ? [{ cellId: node.id, ref, name: String(node.attr('label/text') ?? ref.objectId) }]
              : []
          }),
        )
      const annotate = () =>
        managerRef.current.annotate(
          instance
            .getEdges()
            .filter((edge) => edge.getProp('repositoryBundle'))
            .map(bundleState),
        )
      const changed = () => {
        try {
          annotate()
          latest.current.onChange(snapshot())
          refs()
          emit('document-changed')
          const bundle = managerRef.current.current.current
          if (bundle) {
            const edge = instance.getCellById(bundle.id)
            if (edge?.isEdge()) managerRef.current.update(bundleState(edge))
            else managerRef.current.removed(bundle.id)
          }
        } catch {
          /* In-progress connection geometry is validated on flush. */
        }
      }
      const activated = ({ node }: { node: ReturnType<Graph['getNodes']>[number] }) => {
        const ref = node.getProp('repositoryRef') as RepositoryNodeReference | undefined
        emit('node-activated', node.id, ref)
        if (
          ref &&
          !ref.sourceId &&
          latest.current.objects.some((o) => !o.sourceId && o.id === ref.objectId)
        )
          latest.current.onOpenObject(ref.objectId)
      }
      const selected = () => {
        const cell = instance.getSelectedCells()[0]
        if (cell?.isEdge() && cell.getProp('repositoryBundle')) {
          managerRef.current.update(bundleState(cell))
        } else {
          for (const edge of instance.getEdges()) edge.removeTools()
          managerRef.current.update(undefined)
        }
        emit(
          'node-selected',
          cell?.id,
          cell?.getProp('repositoryRef') as RepositoryNodeReference | undefined,
        )
      }
      for (const event of ['cell:added', 'cell:removed', 'cell:changed'] as const)
        instance.on(event, changed)
      instance.on('node:dblclick', activated)
      instance.on('selection:changed', selected)
      const openBundle = ({ edge }: { edge: ReturnType<Graph['getEdges']>[number] }) => {
        if (edge.getProp('repositoryBundle')) managerRef.current.open(bundleState(edge))
      }
      const hoverBundle = ({ edge }: { edge: ReturnType<Graph['getEdges']>[number] }) => {
        if (edge.getProp('repositoryBundle')) managerRef.current.update(bundleState(edge))
      }
      const createdBundle = ({
        edge,
        isNew,
      }: {
        edge: ReturnType<Graph['getEdges']>[number]
        isNew: boolean
      }) => {
        if (isNew && edge.getProp('repositoryBundle')) managerRef.current.created(bundleState(edge))
      }
      const contextBundle = ({ edge }: { edge: ReturnType<Graph['getEdges']>[number] }) => {
        if (edge.getProp('repositoryBundle')) setContextMenu(bundleState(edge))
      }
      const captureDoubleClick = (event: MouseEvent) => {
        if (event.type === 'mousedown' && event.detail !== 2) return
        const element =
          event.target instanceof Element ? event.target.closest('[data-cell-id]') : null
        let cell = element ? instance.getCellById(element.getAttribute('data-cell-id')!) : undefined
        if (!cell) {
          const point = instance.clientToLocal(event.clientX, event.clientY)
          cell = instance.getEdges().find((edge) => {
            const view = edge.findView(instance)
            const nearest = view?.isEdgeView() ? view.getClosestPoint(point) : undefined
            return (
              nearest && Math.hypot(nearest.x - point.x, nearest.y - point.y) * instance.zoom() < 8
            )
          })
        }
        if (cell?.isEdge() && cell.getProp('repositoryBundle')) {
          event.stopPropagation()
          openBundle({ edge: cell })
        }
      }
      instance.container.addEventListener('dblclick', captureDoubleClick, true)
      instance.container.addEventListener('mousedown', captureDoubleClick, true)
      instance.on('edge:dblclick', openBundle)
      instance.on('edge:contextmenu', contextBundle)
      instance.on('edge:mouseenter', hoverBundle)
      instance.on('edge:connected', createdBundle)
      latest.current.onBaseline(snapshot())
      refs()
      annotate()
      const themeOwner = presentationRef.current
      const themeParticipant = themeOwner
        ? createNativeParticipant(instance, { id: presentationId.current })
        : undefined
      const themeRegistration = themeParticipant
        ? themeOwner!.register(themeParticipant)
        : undefined
      setReady(true)
      latest.current.register({
        flush: async () => snapshot(),
        load: (xml) => {
          loadDocument(instance, JSON.parse(xml))
          refs()
          annotate()
        },
      })
      return () => {
        themeRegistration?.dispose()
        themeParticipant?.dispose()
        for (const event of ['cell:added', 'cell:removed', 'cell:changed'] as const)
          instance.off(event, changed)
        instance.off('node:dblclick', activated)
        instance.off('selection:changed', selected)
        instance.container.removeEventListener('dblclick', captureDoubleClick, true)
        instance.container.removeEventListener('mousedown', captureDoubleClick, true)
        instance.off('edge:dblclick', openBundle)
        instance.off('edge:contextmenu', contextBundle)
        instance.off('edge:mouseenter', hoverBundle)
        instance.off('edge:connected', createdBundle)
        latest.current.register(undefined)
        bundleIntegration.dispose()
        instance.options.connecting.validateEdge = originalValidate
        bundles.current = undefined
        graph.current = undefined
      }
    },
    [emit],
  )
  useEffect(() => {
    const instance = graph.current
    if (!instance || props.readOnly) return
    bundles.current?.refresh()
    for (const node of instance.getNodes()) {
      const ref = node.getProp('repositoryRef') as RepositoryNodeReference | undefined
      if (!ref) continue
      const object = props.objects.find((o) => o.id === ref.objectId && o.sourceId === ref.sourceId)
      if (!object) {
        if (!node.getProp('referenceMissing')) {
          node.setProp('referenceMissing', true, { silent: true })
          emit('reference-unresolved', node.id, ref)
        }
        continue
      }
      node.setProp('referenceMissing', false, { silent: true })
      const style = systemAppearance(object, props.appearance ?? defaultAppearance)
      if (style) {
        const signature = JSON.stringify(style)
        if (appearanceSignatures.current.get(node) !== signature) {
          appearanceSignatures.current.set(node, signature)
          const cell = nodeToCell({
            id: node.id,
            shape: 'rect',
            ...node.getPosition(),
            ...node.getSize(),
            label: object.name,
            style: {
              fill: style.fill,
              stroke: style.stroke,
              strokeWidth: style.width,
              rx: 0,
              ry: 0,
            },
            shadow: style.shadow,
          })
          const body = cell.attrs?.body
          if (
            body &&
            (node.getProp('diagramShape') !== 'rect' ||
              JSON.stringify(node.getProp('diagramShadow') ?? null) !==
                JSON.stringify(style.shadow ?? null) ||
              Object.entries(body).some(
                ([key, val]) => JSON.stringify(node.attr('body/' + key)) !== JSON.stringify(val),
              ))
          ) {
            instance.batchUpdate('repository-appearance', () => {
              node.setProp('diagramShape', 'rect')
              node.setProp('diagramShadow', style.shadow ?? null)
              node.attr('body', body)
            })
            emit('object-updated', node.id, ref)
          }
        }
      }
      if (node.attr('label/text') !== object.name) {
        node.attr('label/text', object.name)
        emit('object-updated', node.id, ref)
      }
    }
  }, [props.objects, props.appearance, props.readOnly, ready, emit])
  const insert = (object: DiagramObject, point: { x: number; y: number }) => {
    const style = systemAppearance(object, latest.current.appearance ?? defaultAppearance)
    const node = graph.current?.addNode(
      nodeToCell({
        id: crypto.randomUUID(),
        shape: style ? 'rect' : 'rounded-rect',
        ...(style
          ? {
              style: {
                fill: style.fill,
                stroke: style.stroke,
                strokeWidth: style.width,
                rx: 0,
                ry: 0,
              },
              shadow: style.shadow,
            }
          : {}),
        x: point.x,
        y: point.y,
        width: 180,
        height: 75,
        label: object.name,
        repositoryRef: {
          objectId: object.id,
          ...(object.sourceId ? { sourceId: object.sourceId } : {}),
        },
      }),
    )
    if (node && style) appearanceSignatures.current.set(node, JSON.stringify(style))
  }
  return (
    <>
      <div hidden ref={parking} />
      {createPortal(
        <>
          <div className="breadcrumbs">
            {props.draft.path}
            <span>·</span>Frade Draw · NRT
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
              references={references.map((r) => ({
                id: r.ref.objectId,
                sourceId: r.ref.sourceId,
                name: r.name,
              }))}
              objects={props.objects}
              onOpen={props.onOpenObject}
            />
          </div>
          {props.draft.error && (
            <div role="alert" className="diagram-error">
              {props.draft.error}
            </div>
          )}
          {manager.controls}
          <div className="diagram-body">
            <div
              className={'frade-canvas diagram-frame ' + (props.readOnly ? 'readonly' : '')}
              onDragOver={(event) => {
                if (
                  event.dataTransfer.types.includes(REPOSITORY_OBJECT_MIME) &&
                  graph.current?.container.contains(event.target as Node)
                ) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = ready && !props.readOnly ? 'copy' : 'none'
                }
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes(REPOSITORY_OBJECT_MIME)) return
                event.preventDefault()
                const instance = graph.current
                if (!ready || !instance?.container.contains(event.target as Node)) return
                const object = droppedObject(
                  event.dataTransfer.getData(REPOSITORY_OBJECT_MIME),
                  latest.current,
                )
                if (object) insert(object, instance.clientToLocal(event.clientX, event.clientY))
              }}
            >
              <DiagramEditor embedded onGraphReady={readyGraph} />
              <div className="diagram-readonly">Редактирование временно недоступно</div>
            </div>
            {manager.panel}
            {contextMenu && (
              <div role="menu" className="bundle-reconnect">
                <button
                  role="menuitem"
                  onClick={() => {
                    manager.open(contextMenu)
                    setContextMenu(undefined)
                  }}
                >
                  Интеграционные потоки…
                </button>
                <button onClick={() => setContextMenu(undefined)}>Закрыть меню</button>
              </div>
            )}
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
                    const instance = graph.current,
                      edge = instance?.getCellById(reconnect.edgeId)
                    if (
                      instance &&
                      edge?.isEdge() &&
                      !props.readOnly &&
                      JSON.stringify({
                        source: edge.getSource(),
                        target: edge.getTarget(),
                        members: edge.getProp('repositoryBundle')?.integrationFlowRefs ?? [],
                      }) === reconnect.expected
                    )
                      instance.batchUpdate('bundle-reconnect', () => {
                        edge.setSource(reconnect.source)
                        edge.setTarget(reconnect.target)
                        edge.setProp('repositoryBundle', {
                          kind: 'empty',
                          integrationFlowRefs: reconnect.members,
                        })
                        instance.trigger('edge:connected', { edge, isNew: false })
                      })
                    setReconnect(undefined)
                  }}
                >
                  Изменить конец и исключить потоки
                </button>
                <button onClick={() => setReconnect(undefined)}>Отмена</button>
              </div>
            )}
          </div>
        </>,
        container,
      )}
    </>
  )
}
