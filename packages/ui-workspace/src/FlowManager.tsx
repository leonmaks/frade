import { startPointerDrag } from './pointerDrag'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ObjectInspector } from '@frade/ui-inspector'
import {
  flowRefKey,
  sameObjectRef,
  setBundleMembers,
  isFlowEligibleForBundle,
  reverseIntegrationFlow,
  cloneIntegrationFlow,
  type ObjectRef,
  type RepositoryObject,
  type JsonValue,
  type Issue,
  type Revision,
} from '@frade/repository-domain'
import type { FlowRepository, BundleState, FlowPage } from './flowContracts'
interface Props {
  createInitially?: boolean
  repository?: FlowRepository
  bundle: BundleState
  readOnly: boolean
  onMembers(refs: ObjectRef[]): Promise<void>
  onClose(): void
  onCounts(n: number, m: number): void
}
type Editor = {
  mode: 'create' | 'edit' | 'clone'
  base: RepositoryObject
  attributes: Record<string, JsonValue>
  id: string
  add: boolean
  confirmed: boolean
  raw: Record<string, string>
  issues: readonly Issue[]
  error?: string
  conflict?: boolean
  dirty: boolean
}
export function FlowManager(props: Props) {
  const { repository: repo, bundle } = props
  const membershipReadOnly = props.readOnly || !!bundle.invalidMembership
  const [pendingMembers, setPendingMembers] = useState<ObjectRef[]>()
  const [text, setText] = useState(''),
    [search, setSearch] = useState(''),
    [scope, setScope] = useState(false),
    [membership, setMembership] = useState('ALL'),
    [direction, setDirection] = useState('ANY'),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [offset, setOffset] = useState(0),
    [sort, setSort] = useState(''),
    [descending, setDescending] = useState(false)
  const [page, setPage] = useState<FlowPage>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0),
    [details, setDetails] = useState<RepositoryObject>(),
    [editor, setEditor] = useState<Editor>(),
    [saving, setSaving] = useState(false),
    [status, setStatus] = useState(''),
    [retryMember, setRetryMember] = useState<ObjectRef>(),
    [guard, setGuard] = useState<() => void>(),
    [width, setWidth] = useState(620)
  const optimistic = useRef<ObjectRef[]>()
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const head = useRef<HTMLInputElement>(null),
    panel = useRef<HTMLElement>(null),
    generation = useRef(0)
  const label = (ref: ObjectRef | undefined) =>
    ref
      ? (repo?.objects.find((o) => sameObjectRef(o.ref, ref))?.name ?? ref.objectId)
      : 'Недоступная система'
  const A = label(bundle.endpointA),
    B = label(bundle.endpointB),
    selected = new Set((pendingMembers ?? bundle.members).map(flowRefKey))
  const config = (flow: RepositoryObject) =>
    repo?.types.find((t) => t.id === flow.typeId)?.integrationFlow
  const [newType, setNewType] = useState('')
  const defaultType =
    repo?.types.find((t) => t.id === newType && t.integrationFlow) ??
    repo?.types.find((t) => t.integrationFlow)
  const type = editor ? repo?.types.find((t) => t.id === editor.base.typeId) : undefined
  const changeQuery = (fn: () => void) => {
    fn()
    setOffset(0)
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(text)
      setOffset(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [text])
  const queryKey = JSON.stringify({
    endpointA: bundle.endpointA,
    endpointB: bundle.endpointB,
    scope: scope ? 'ALL' : 'PAIR',
    text: search,
    membership,
    direction,
    filters,
    members: bundle.members,
    offset,
    limit: 50,
    ...(sort ? { sort, descending } : {}),
  })
  useEffect(() => {
    const query = JSON.parse(queryKey),
      repository = latest.current.repository
    let stopped = false
    const id = ++generation.current
    setLoading(true)
    setError('')
    if (!repository?.available || !query.endpointA || !query.endpointB) {
      setLoading(false)
      setError('Репозиторий или системы жгута недоступны')
      return
    }
    void repository
      .request('integrationFlows', { query })
      .then((result) => {
        if (stopped || id !== generation.current) return
        setLoading(false)
        if (!result.ok) {
          setError('Ошибка запроса: ' + result.error.code)
          return
        }
        const data = result.value as FlowPage
        setPage(data)
        latest.current.onCounts(query.members.length, data.totalEligible)
      })
      .catch(() => {
        if (!stopped) {
          setLoading(false)
          setError('Ошибка запроса: REPOSITORY_UNAVAILABLE')
        }
      })
    return () => {
      stopped = true
    }
  }, [repo?.revision, repo?.available, queryKey, refresh])
  useEffect(() => {
    if (pendingMembers && JSON.stringify(pendingMembers) === JSON.stringify(bundle.members))
      queueMicrotask(() => {
        optimistic.current = undefined
        setPendingMembers(undefined)
      })
  }, [pendingMembers, bundle.members])
  const eligible = (page?.items ?? []).filter((row) => row.eligible)
  useEffect(() => {
    if (head.current)
      head.current.indeterminate =
        eligible.some((row) => selected.has(flowRefKey(row.flow.ref))) &&
        !eligible.every((row) => selected.has(flowRefKey(row.flow.ref)))
  })
  const safeAction = (fn: () => void) => {
    if (editor?.dirty) setGuard(() => fn)
    else fn()
  }
  const members = async (refs: ObjectRef[]) => {
    optimistic.current = refs
    setPendingMembers(refs)
    try {
      await props.onMembers(setBundleMembers(refs))
      setStatus('Состав жгута изменён')
      setError('')
    } catch (e) {
      optimistic.current = undefined
      setPendingMembers(undefined)
      setStatus('')
      setError('Не удалось изменить состав: ' + String(e))
      throw e
    }
  }
  const toggle = async (ref: ObjectRef, include: boolean) => {
    try {
      await members(
        setBundleMembers(optimistic.current ?? latest.current.bundle.members, ref, include),
      )
    } catch {
      /* remains available for retry */
    }
  }
  const begin = (mode: Editor['mode'], object?: RepositoryObject, reverse = false) =>
    safeAction(() => {
      const c = object ? config(object) : defaultType?.integrationFlow
      if (!c || !bundle.endpointA || !bundle.endpointB) return
      const id =
        mode === 'edit' ? object!.ref.objectId : c.idPatterns?.length ? '' : crypto.randomUUID()
      let base = object ?? {
        ref: { repositoryId: bundle.endpointA.repositoryId, objectId: id || 'draft' },
        typeId: c.typeId,
        name: 'Новый поток',
        revision: '' as Revision,
        attributes: {},
      }
      let attributes: Record<string, JsonValue>
      if (mode === 'clone') {
        attributes = {
          ...cloneIntegrationFlow(
            base,
            c,
            { repositoryId: base.ref.repositoryId, objectId: 'clone-' + crypto.randomUUID() },
            isFlowEligibleForBundle(base, c, bundle.endpointA, bundle.endpointB)
              ? undefined
              : [bundle.endpointA, bundle.endpointB],
          ).attributes,
        }
      } else if (mode === 'create') {
        const fields = defaultType?.fields ?? []
        attributes = Object.fromEntries(
          fields
            .filter((f) => f.required || f.rule.default !== undefined)
            .map((f) => [
              f.key,
              f.rule.default ??
                f.rule.enum?.[0] ??
                (f.rule.type === 'array'
                  ? []
                  : f.rule.type === 'boolean'
                    ? false
                    : f.rule.type === 'number' || f.rule.type === 'integer'
                      ? 0
                      : ''),
            ]),
        )
        attributes[c.source] = bundle.endpointA as unknown as JsonValue
        attributes[c.consumer] = bundle.endpointB as unknown as JsonValue
      } else {
        base = reverse ? reverseIntegrationFlow(base, c) : base
        attributes = { ...structuredClone(base.attributes) }
      }
      setEditor({
        mode,
        base,
        attributes,
        id,
        add: !membershipReadOnly,
        confirmed: false,
        raw: {},
        issues: [],
        dirty: mode !== 'edit' || reverse,
      })
      setDetails(undefined)
      setStatus('')
    })
  const initialCreate = useRef(false),
    beginRef = useRef(begin)
  useLayoutEffect(() => {
    beginRef.current = begin
  })
  const canInitialCreate = !!defaultType && !!bundle.endpointA && !!bundle.endpointB
  useEffect(() => {
    if (props.createInitially && canInitialCreate && !initialCreate.current) {
      initialCreate.current = true
      beginRef.current('create')
    }
  }, [props.createInitially, canInitialCreate])
  const canWrite = !!repo?.available && !repo.readOnly
  const incompatible =
    !!editor &&
    !!type?.integrationFlow &&
    !!bundle.endpointA &&
    !!bundle.endpointB &&
    !isFlowEligibleForBundle(
      { ...editor.base, attributes: editor.attributes },
      type.integrationFlow,
      bundle.endpointA,
      bundle.endpointB,
    )
  const invalidating =
    !!editor && editor.mode === 'edit' && selected.has(flowRefKey(editor.base.ref)) && incompatible
  const save = async () => {
    if (
      !editor ||
      !repo ||
      !canWrite ||
      !type ||
      saving ||
      Object.keys(editor.raw).length ||
      (invalidating && !editor.confirmed)
    )
      return
    const captured = editor
    if (
      !editor.id.trim() ||
      (type.idPatterns ?? type.integrationFlow?.idPatterns ?? []).some(
        (pattern) => !new RegExp(pattern, 'u').test(editor.id),
      )
    ) {
      setEditor({ ...editor, error: 'ID не соответствует правилам метамодели' })
      return
    }
    const name = type.nameFields
      .map((k) => editor.attributes[k])
      .find((v) => typeof v === 'string' && v.trim())
    const object = {
      ref: { ...editor.base.ref, objectId: editor.id },
      typeId: editor.base.typeId,
      name:
        typeof name === 'string'
          ? name.split(/\r?\n/)[0].slice(0, 240)
          : editor.mode === 'edit'
            ? editor.base.name
            : editor.id,
      attributes: editor.attributes,
    }
    const commands = [
      editor.mode === 'edit'
        ? { op: 'updateObject', object, expectedRevision: editor.base.revision }
        : { op: 'createObject', object },
    ]
    const changeSet = {
      repositoryId: object.ref.repositoryId,
      commands,
      idempotencyKey: crypto.randomUUID(),
    }
    setSaving(true)
    setEditor({ ...editor, error: undefined, issues: [] })
    try {
      const validation = await repo.request('validate', {
        changeSet: changeSet as unknown as JsonValue,
      })
      if (!validation.ok) {
        setEditor({ ...captured, error: validation.error.code })
        return
      }
      const issues = (validation.value as { errors: Issue[] }).errors
      if (issues.length) {
        setEditor({ ...captured, issues, error: 'Исправьте ошибки формы' })
        return
      }
      const result = await repo.request('applyChanges', {
        changeSet: changeSet as unknown as JsonValue,
      })
      if (!result.ok) {
        setEditor({
          ...captured,
          issues: result.error.issues,
          error:
            result.error.code === 'REVISION_CONFLICT'
              ? 'Поток был изменен в репозитории.'
              : result.error.code,
          conflict: result.error.code === 'REVISION_CONFLICT',
        })
        return
      }
      setEditor(undefined)
      setRefresh((n) => n + 1)
      setStatus(
        editor.mode === 'edit'
          ? 'Поток обновлён в цифровом репозитории'
          : 'Поток создан в цифровом репозитории',
      )
      if (editor.mode === 'edit' && invalidating) {
        try {
          await members(setBundleMembers(latest.current.bundle.members, object.ref, false))
        } catch {
          setStatus('Поток сохранён, но не удалось исключить его из жгута')
        }
      } else if (editor.mode !== 'edit' && editor.add && !incompatible) {
        try {
          await members(setBundleMembers(latest.current.bundle.members, object.ref, true))
        } catch {
          setRetryMember(object.ref)
          setStatus('Поток создан, но не удалось добавить его в текущий жгут.')
        }
      }
    } catch (e) {
      setEditor({ ...captured, error: String(e) })
    } finally {
      setSaving(false)
    }
  }
  const reloadConflict = async () => {
    if (!editor || !repo) return
    const result = await repo.request('getObject', { ref: editor.base.ref as unknown as JsonValue })
    if (result.ok) {
      const object = result.value as RepositoryObject
      setEditor({ ...editor, base: object, conflict: false, error: undefined, issues: [] })
    }
  }
  const showDetails = (flow: RepositoryObject) =>
    safeAction(() => {
      setEditor(undefined)
      setDetails(flow)
    })
  const columns = [
    ...new Map(
      (
        page?.capabilities ??
        repo?.types.flatMap((t) => (t.integrationFlow ? [t.integrationFlow] : [])) ??
        []
      )
        .flatMap((c) => c.columns)
        .map((c) => [c.field, c]),
    ).values(),
  ]
  return (
    <aside
      ref={panel}
      className="flow-manager"
      aria-label="Интеграционные потоки"
      style={{ width }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          safeAction(() =>
            editor ? setEditor(undefined) : details ? setDetails(undefined) : props.onClose(),
          )
        }
      }}
    >
      <div
        className="flow-resizer"
        role="separator"
        aria-label="Ширина менеджера потоков"
        aria-orientation="vertical"
        tabIndex={0}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight'].includes(e.key))
            setWidth((w) => Math.max(360, Math.min(1000, w + (e.key === 'ArrowLeft' ? 20 : -20))))
        }}
        onPointerDown={(e) => {
          const x = e.clientX,
            w = width
          const move = (event: PointerEvent) =>
            setWidth(Math.max(360, Math.min(1000, w + x - event.clientX)))
          startPointerDrag(e, move)
        }}
      />
      <header>
        <h2>Интеграционные потоки</h2>
        <button
          aria-label="Закрыть менеджер потоков"
          disabled={saving}
          onClick={() => safeAction(props.onClose)}
        >
          ×
        </button>
        <p>
          {A} ↔ {B}
        </p>
        <p>
          В репозитории: {page?.totalEligible ?? '…'} · В жгуте: {bundle.members.length}
        </p>
      </header>
      {guard && (
        <div role="alert" className="flow-warning">
          Есть несохранённые изменения формы.
          <button
            onClick={() => {
              const action = guard
              setGuard(undefined)
              setEditor(undefined)
              action()
            }}
          >
            Продолжить без сохранения
          </button>
          <button onClick={() => setGuard(undefined)}>Продолжить редактирование</button>
        </div>
      )}
      {bundle.invalidMembership && (
        <div role="alert" className="flow-warning">
          Состав жгута повреждён. Запись ссылок приостановлена.
          <button disabled={props.readOnly} onClick={() => void members([]).catch(() => {})}>
            Очистить повреждённый состав
          </button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {status}
      </div>
      {retryMember && (
        <button
          disabled={props.readOnly}
          onClick={() =>
            void members(
              setBundleMembers(
                optimistic.current ?? latest.current.bundle.members,
                retryMember,
                true,
              ),
            )
              .then(() => setRetryMember(undefined))
              .catch(() => {})
          }
        >
          Повторить добавление
        </button>
      )}
      {!editor && (
        <>
          <div className="flow-toolbar">
            <input
              aria-label="Поиск потоков"
              placeholder="Поиск потоков…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setText('')
                }
              }}
            />
            <label>
              <input
                type="checkbox"
                checked={scope}
                onChange={(e) => changeQuery(() => setScope(e.target.checked))}
              />
              Искать во всем репозитории
            </label>
            <select
              aria-label="Состав жгута"
              value={membership}
              onChange={(e) => changeQuery(() => setMembership(e.target.value))}
            >
              <option value="ALL">Все</option>
              <option value="INCLUDED">В жгуте</option>
              <option value="EXCLUDED">Не в жгуте</option>
            </select>
            <select
              aria-label="Направление потока"
              value={direction}
              onChange={(e) => changeQuery(() => setDirection(e.target.value))}
            >
              <option value="ANY">Любое направление</option>
              <option value="A_TO_B">
                {A} → {B}
              </option>
              <option value="B_TO_A">
                {B} → {A}
              </option>
            </select>
            <details>
              <summary>Фильтры</summary>
              {columns.map((c) => (
                <label key={c.field}>
                  {c.label}
                  <input
                    aria-label={'Фильтр: ' + c.label}
                    value={filters[c.field] ?? ''}
                    onChange={(e) =>
                      changeQuery(() => setFilters({ ...filters, [c.field]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </details>
            {(repo?.types.filter((t) => t.integrationFlow).length ?? 0) > 1 && (
              <select
                aria-label="Тип нового потока"
                value={defaultType?.id ?? ''}
                onChange={(e) => setNewType(e.target.value)}
              >
                {repo?.types
                  .filter((t) => t.integrationFlow)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
            )}
            <button
              disabled={!canWrite || !defaultType}
              title={
                !canWrite
                  ? 'Репозиторий только для чтения или недоступен'
                  : !defaultType
                    ? 'В метамодели не настроены интеграционные потоки'
                    : undefined
              }
              onClick={() => begin('create')}
            >
              + Новый поток
            </button>
          </div>
          {loading && <p role="status">Загрузка потоков…</p>}
          {error && (
            <div role="alert">
              {error}
              <button onClick={() => setRefresh((n) => n + 1)}>Повторить запрос</button>
            </div>
          )}
          {!loading && !error && page && !page.items.length && (
            <p>
              {!scope &&
              !search &&
              !Object.values(filters).some(Boolean) &&
              membership === 'ALL' &&
              direction === 'ANY' &&
              page.totalEligible === 0
                ? 'Между ' + A + ' и ' + B + ' интеграционных потоков в репозитории нет.'
                : 'По заданным условиям потоки не найдены.'}
            </p>
          )}
          {page && !error && (
            <div className="flow-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        ref={head}
                        type="checkbox"
                        aria-label="Включить все подходящие потоки из текущей выборки"
                        disabled={membershipReadOnly || !eligible.length}
                        checked={
                          !!eligible.length &&
                          eligible.every((row) => selected.has(flowRefKey(row.flow.ref)))
                        }
                        onChange={(e) => {
                          let next = optimistic.current ?? latest.current.bundle.members
                          for (const row of eligible)
                            next = setBundleMembers(next, row.flow.ref, e.target.checked)
                          void members(next).catch(() => {})
                        }}
                      />
                      В жгуте
                    </th>
                    <th>
                      <button
                        onClick={() =>
                          changeQuery(() => {
                            setSort('direction')
                            setDescending(sort === 'direction' && !descending)
                          })
                        }
                      >
                        Направление
                      </button>
                    </th>
                    <th>
                      <button
                        onClick={() =>
                          changeQuery(() => {
                            setSort('name')
                            setDescending(sort === 'name' && !descending)
                          })
                        }
                      >
                        Поток
                      </button>
                    </th>
                    {scope && (
                      <>
                        <th>Источник</th>
                        <th>Потребитель</th>
                      </>
                    )}
                    {columns.map((c) => (
                      <th
                        key={c.field}
                        aria-sort={
                          sort === c.field ? (descending ? 'descending' : 'ascending') : 'none'
                        }
                      >
                        <button
                          onClick={() =>
                            changeQuery(() => {
                              setSort(c.field)
                              setDescending(sort === c.field && !descending)
                            })
                          }
                        >
                          {c.label}
                        </button>
                      </th>
                    ))}
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((row) => {
                    const f = row.flow,
                      c = config(f),
                      included = selected.has(flowRefKey(f.ref)),
                      directionText =
                        row.direction === 'A_TO_B'
                          ? A + ' → ' + B
                          : row.direction === 'B_TO_A'
                            ? B + ' → ' + A
                            : c
                              ? row.values[c.source] + ' → ' + row.values[c.consumer]
                              : 'Неизвестное направление',
                      reason =
                        'Нельзя включить в этот жгут: поток связывает ' +
                        (c ? row.values[c.source] : '?') +
                        ' → ' +
                        (c ? row.values[c.consumer] : '?')
                    return (
                      <tr
                        key={flowRefKey(f.ref)}
                        tabIndex={0}
                        aria-label={'Поток: ' + f.name}
                        aria-description={directionText}
                        onClick={() => showDetails(f)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            showDetails(f)
                          }
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={'В жгуте: ' + f.name}
                            title={
                              !row.eligible
                                ? reason
                                : props.readOnly
                                  ? 'Диаграмма только для чтения'
                                  : undefined
                            }
                            aria-description={!row.eligible ? reason : directionText}
                            checked={included}
                            disabled={membershipReadOnly || (!row.eligible && !included)}
                            onChange={(e) => void toggle(f.ref, e.target.checked)}
                          />
                        </td>
                        <td>{directionText}</td>
                        <td>
                          {f.name}
                          <small>{f.ref.objectId}</small>
                          {scope && row.eligible && <small>Между текущими системами</small>}
                        </td>
                        {scope && (
                          <>
                            <td>{c && row.values[c.source]}</td>
                            <td>{c && row.values[c.consumer]}</td>
                          </>
                        )}
                        {columns.map((col) => (
                          <td key={col.field}>{row.values[col.field]}</td>
                        ))}
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            aria-label={'Подробнее: ' + f.name}
                            onClick={() => showDetails(f)}
                          >
                            Подробнее
                          </button>
                          <details>
                            <summary aria-label={'Действия: ' + f.name}>…</summary>
                            <button disabled={!canWrite} onClick={() => begin('edit', f)}>
                              Редактировать
                            </button>
                            <button disabled={!canWrite} onClick={() => begin('edit', f, true)}>
                              Поменять направление
                            </button>
                            <button disabled={!canWrite} onClick={() => begin('clone', f)}>
                              {row.eligible ? 'Клонировать' : 'Клонировать для A ↔ B'}
                            </button>
                          </details>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {page && page.total > 50 && (
            <nav aria-label="Страницы потоков">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
                Предыдущие
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 50, page.total)} из {page.total}
              </span>
              <button disabled={offset + 50 >= page.total} onClick={() => setOffset(offset + 50)}>
                Следующие
              </button>
            </nav>
          )}
          {(page?.members ?? [])
            .filter((m) => m.state !== 'valid')
            .map((member) => (
              <div className="flow-warning" key={flowRefKey(member.ref)}>
                <span>
                  {member.state === 'missing'
                    ? 'Недоступный поток'
                    : 'Поток больше не связывает системы жгута'}
                  : {member.ref.objectId}
                </span>
                <button disabled={props.readOnly} onClick={() => void toggle(member.ref, false)}>
                  Исключить из жгута
                </button>
              </div>
            ))}
          {details && (
            <section aria-label="Свойства потока">
              <button onClick={() => setDetails(undefined)}>Закрыть свойства</button>
              <ObjectInspector
                object={repo?.objects.find((o) => sameObjectRef(o.ref, details.ref)) ?? details}
                attributes={
                  (repo?.objects.find((o) => sameObjectRef(o.ref, details.ref)) ?? details)
                    .attributes
                }
                rule={repo?.types.find((t) => t.id === details.typeId)?.rule ?? {}}
                objects={repo?.objects ?? []}
                disabled
                issues={[]}
                raw={{}}
                onRaw={() => {}}
                onChange={() => {}}
                onOpenReference={() => {}}
              />
            </section>
          )}
        </>
      )}
      {editor && (
        <section aria-label="Редактор интеграционного потока">
          <h3>
            {editor.mode === 'edit'
              ? 'Редактировать поток'
              : editor.mode === 'clone'
                ? 'Клонировать поток'
                : 'Создать поток'}
          </h3>
          <p>
            Изменения будут сохранены в цифровом репозитории и будут видны во всех представлениях
            этого потока.
          </p>
          {editor.mode !== 'edit' &&
            !!(type?.idPatterns ?? type?.integrationFlow?.idPatterns)?.length && (
              <label>
                ID потока
                <input
                  aria-label="ID потока"
                  value={editor.id}
                  onChange={(e) =>
                    setEditor({ ...editor, id: e.target.value, dirty: true, error: undefined })
                  }
                />
              </label>
            )}
          {type?.integrationFlow && (
            <div>
              Направление:{' '}
              <button
                disabled={saving}
                onClick={() => {
                  const c = type.integrationFlow!
                  setEditor({
                    ...editor,
                    attributes: {
                      ...editor.attributes,
                      [c.source]: editor.attributes[c.consumer],
                      [c.consumer]: editor.attributes[c.source],
                    },
                    dirty: true,
                    confirmed: false,
                  })
                }}
              >
                Поменять источник и потребителя
              </button>
            </div>
          )}
          <ObjectInspector
            object={editor.base}
            attributes={editor.attributes}
            rule={type?.rule ?? {}}
            objects={repo?.objects ?? []}
            disabled={saving}
            editableFields={type?.integrationFlow?.editable}
            issues={editor.issues}
            raw={editor.raw}
            onRaw={(key, value) =>
              setEditor((current) => {
                if (!current) return current
                const raw = { ...current.raw }
                if (value === undefined) delete raw[key]
                else raw[key] = value
                return { ...current, raw, dirty: true }
              })
            }
            onChange={(attributes) =>
              setEditor((current) =>
                current
                  ? {
                      ...current,
                      attributes,
                      dirty: true,
                      confirmed: false,
                      issues: [],
                      error: undefined,
                    }
                  : current,
              )
            }
            onOpenReference={() => {}}
          />
          {invalidating && (
            <div role="alert" className="flow-warning">
              После изменения поток больше не будет связывать {A} и {B} и будет исключен из текущего
              жгута.
              <label>
                <input
                  type="checkbox"
                  checked={editor.confirmed}
                  onChange={(e) => setEditor({ ...editor, confirmed: e.target.checked })}
                />
                Подтверждаю исключение из текущего жгута
              </label>
            </div>
          )}
          {editor.mode !== 'edit' && (
            <label>
              <input
                type="checkbox"
                checked={editor.add && !incompatible}
                disabled={membershipReadOnly || incompatible}
                onChange={(e) => setEditor({ ...editor, add: e.target.checked, dirty: true })}
              />
              Добавить в текущий жгут
            </label>
          )}
          {editor.error && (
            <div role="alert">
              {editor.error}
              {editor.conflict && (
                <>
                  <button onClick={() => void reloadConflict()}>
                    Загрузить актуальную версию для повторения изменений
                  </button>
                  <p>Черновик сохранён. После загрузки актуальной ревизии повторите сохранение.</p>
                </>
              )}
            </div>
          )}
          <button
            disabled={
              !canWrite ||
              saving ||
              !!Object.keys(editor.raw).length ||
              (invalidating && !editor.confirmed)
            }
            onClick={() => void save()}
          >
            {saving ? 'Сохранение…' : 'Сохранить поток'}
          </button>
          <button disabled={saving} onClick={() => safeAction(() => setEditor(undefined))}>
            Отмена редактирования
          </button>
        </section>
      )}
    </aside>
  )
}
