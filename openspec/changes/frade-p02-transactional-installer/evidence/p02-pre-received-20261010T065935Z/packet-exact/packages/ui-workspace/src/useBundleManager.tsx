import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  flowRefKey,
  formatBundleFlowLabel,
  type ObjectRef,
  type JsonValue,
} from '@frade/repository-domain'
import type { DiagramViewProps } from './DiagramView'
import type { BundleState, FlowPage } from './flowContracts'
import { FlowManager } from './FlowManager'
export function useBundleManager(
  props: DiagramViewProps,
  change: (bundle: BundleState, refs: ObjectRef[]) => Promise<void>,
  badge?: (id: string, text: string) => void,
) {
  const [bundle, setBundle] = useState<BundleState>(),
    [open, setOpen] = useState(false),
    [hint, setHint] = useState(false),
    [count, setCount] = useState<number>(),
    [newFlow, setNewFlow] = useState(false),
    [annotations, setAnnotations] = useState<BundleState[]>([])
  const current = useRef(bundle),
    opened = useRef(open)
  useLayoutEffect(() => {
    current.current = bundle
    opened.current = open
  })
  const latest = useRef(props),
    callbacks = useRef({ change, badge })
  useLayoutEffect(() => {
    latest.current = props
    callbacks.current = { change, badge }
  })
  const tail = useRef<Promise<void>>(Promise.resolve())
  const removed = (id: string) => {
    if (current.current?.id === id) {
      setOpen(false)
      setBundle(undefined)
      setHint(false)
    }
  }
  const update = (next: BundleState | undefined) => {
    if (opened.current && current.current && next?.id !== current.current.id) return
    setBundle(next)
  }
  const annotate = (next: BundleState[], replace = true) =>
    setAnnotations((old) => {
      const result = replace ? next : [...new Map([...old, ...next].map((b) => [b.id, b])).values()]
      return JSON.stringify(old) === JSON.stringify(result) ? old : result
    })
  const description = (data: FlowPage) =>
    formatBundleFlowLabel(
      data.members.map((member) => {
        const flow = member.flow,
          capability = data.capabilities.find((c) => c.typeId === flow?.typeId)
        const status =
          capability?.status ??
          capability?.columns.find((c) => c.field === 'status' || /статус|status/iu.test(c.label))
            ?.field
        return {
          name: flow?.name ?? 'Недоступный поток: ' + member.ref.objectId,
          status: status ? flow?.attributes[status] : undefined,
        }
      }),
    )
  const capabilityKey = JSON.stringify(
    props.flowRepository?.types.map((type) => type.integrationFlow),
  )
  const annotationKey = JSON.stringify(annotations)
  useEffect(() => {
    let stopped = false
    const repo = latest.current.flowRepository
    if (!repo?.available) return
    for (const b of JSON.parse(annotationKey) as BundleState[]) {
      if (!b.endpointA || !b.endpointB) continue
      void repo
        .request('integrationFlows', {
          query: {
            endpointA: b.endpointA,
            endpointB: b.endpointB,
            members: b.members,
            limit: 1,
          } as unknown as JsonValue,
        })
        .then((result) => {
          if (!stopped && result.ok)
            callbacks.current.badge?.(b.id, description(result.value as FlowPage))
        })
    }
    return () => {
      stopped = true
    }
  }, [
    annotationKey,
    capabilityKey,
    props.flowRepository?.revision,
    props.flowRepository?.available,
  ])
  const bundleKey = bundle ? JSON.stringify(bundle) : ''
  useEffect(() => {
    if (!bundleKey) return
    const active = JSON.parse(bundleKey) as BundleState
    const repo = latest.current.flowRepository
    let stopped = false
    if (!repo?.available || !active.endpointA || !active.endpointB) return
    void repo
      .request('integrationFlows', {
        query: {
          endpointA: active.endpointA,
          endpointB: active.endpointB,
          members: active.members,
          limit: 1,
        } as unknown as JsonValue,
      })
      .then((result) => {
        if (stopped) return
        if (result.ok) {
          const data = result.value as FlowPage
          setCount(data.totalEligible)
          callbacks.current.badge?.(active.id, description(data))
        }
      })
    return () => {
      stopped = true
    }
  }, [bundleKey, capabilityKey, props.flowRepository?.revision, props.flowRepository?.available])
  const onMembers = (refs: ObjectRef[]) => {
    const work = tail.current.then(async () => {
      const b = current.current
      if (!b || latest.current.readOnly) throw Error('Диаграмма недоступна для изменения')
      const added = refs.filter((r) => !b.members.some((old) => flowRefKey(old) === flowRefKey(r)))
      if (added.length) {
        const repo = latest.current.flowRepository
        if (!repo || !b.endpointA || !b.endpointB) throw Error('Репозиторий недоступен')
        const result = await repo.request('integrationFlows', {
          query: {
            endpointA: b.endpointA,
            endpointB: b.endpointB,
            members: added,
            limit: 1,
          } as unknown as JsonValue,
        })
        if (!result.ok || (result.value as FlowPage).members.some((m) => m.state !== 'valid'))
          throw Error('Поток не соответствует системам жгута')
      }
      await change(b, refs)
    })
    tail.current = work.catch(() => {})
    return work
  }
  const label = (ref: ObjectRef | undefined) =>
    ref
      ? (props.flowRepository?.objects.find((o) => flowRefKey(o.ref) === flowRefKey(ref))?.name ??
        ref.objectId)
      : '?'
  return {
    isOpen: open,
    annotate,
    update,
    removed,
    open: (next?: BundleState) => {
      if (opened.current && next && next.id !== current.current?.id) return
      if (next) setBundle(next)
      setOpen(true)
      setHint(false)
    },
    created: (next: BundleState) => {
      setBundle(next)
      setHint(true)
      setOpen(false)
    },
    current,
    controls: bundle ? (
      <>
        {hint && (
          <div className="bundle-hint">
            Найдено {count ?? '…'} потоков между {label(bundle.endpointA)} и{' '}
            {label(bundle.endpointB)}{' '}
            <button
              onClick={() => {
                setOpen(true)
                setHint(false)
              }}
            >
              Выбрать потоки
            </button>
            <button
              onClick={() => {
                setNewFlow(true)
                setOpen(true)
                setHint(false)
              }}
            >
              Создать новый
            </button>
            <button aria-label="Скрыть подсказку жгута" onClick={() => setHint(false)}>
              ×
            </button>
          </div>
        )}
        <div className="bundle-controls" aria-label="Свойства выбранного жгута">
          <span>
            {bundle.members.length} / {count ?? '…'} потоков
          </span>
          <button
            onClick={() => {
              setOpen(true)
              setHint(false)
            }}
          >
            Интеграционные потоки…
          </button>
        </div>
      </>
    ) : (
      <div className="bundle-controls" aria-hidden="true" />
    ),
    panel: open && bundle && (
      <FlowManager
        key={bundle.id}
        repository={props.flowRepository}
        bundle={bundle}
        readOnly={props.readOnly}
        onMembers={onMembers}
        onClose={() => {
          setOpen(false)
          setNewFlow(false)
        }}
        onCounts={(_n, m) => {
          setCount(m)
        }}
        createInitially={newFlow}
      />
    ),
  }
}
