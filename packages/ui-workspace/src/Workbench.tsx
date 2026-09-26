import { startPointerDrag } from './pointerDrag'
import { ElementAppearanceSettings } from './ElementAppearanceSettings'
import { appearanceStorageKey, readAppearance } from './elementAppearance'
import { sameDiagramContent } from './diagramContent'
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import {
  DiagramView,
  type DiagramDraft,
  type DiagramDocument,
  type DrawioHandle,
  type DiagramObject,
} from './DiagramView'
import { FradeDiagramView, type FradeDiagramEvent } from './FradeDiagramView'
import { Navigator, type NavigatorRoot } from '@frade/ui-navigator'
import { ObjectInspector } from '@frade/ui-inspector'
import {
  failure,
  type RepositoryObject,
  type ObjectRef,
  type Result,
  type JsonValue,
  type Issue,
} from '@frade/repository-domain'
import type {
  WorkbenchClient,
  WorkspaceStatus,
  RepositoryPresentation,
  MetadataSetProfile,
  MetadataPreview,
  RecoveryInfo,
  HostCommand,
} from '@frade/repository-api/workbench'
import type { RepositoryRequest } from '@frade/repository-api/protocol'
import {
  objectKey,
  makeDraft,
  edited,
  refreshed,
  isDirty,
  openTab,
  readLayout,
  readEditors,
  type Draft,
  type EditorGroup,
} from './state'
type LoadedRoot = WorkspaceStatus['roots'][number] & {
  catalogs?: { id: string; label: string; objects: DiagramObject[] }[]
  diagrams?: { path: string; kind: 'file' | 'folder' }[]
  objects: RepositoryObject[]
  presentation?: RepositoryPresentation
  loading?: boolean
}
export interface WorkbenchProps {
  client: WorkbenchClient & { onCloseRequested?: (listener: () => void) => () => void }
  health: string
  draw?: ReactNode
  onDiagramEvent?: (event: FradeDiagramEvent) => void
}
type Prompt = { label: string; resolve: (choice: 'save' | 'discard' | 'cancel') => void }
const errorText = (r: Result<unknown>) =>
  r.ok ? '' : r.error.issues.map((i) => i.message).join('\n') || r.error.code
export function Workbench({ client, health, onDiagramEvent }: WorkbenchProps) {
  const [appearance, setAppearance] = useState(() =>
    readAppearance(localStorage.getItem(appearanceStorageKey)),
  )
  const [roots, setRoots] = useState<LoadedRoot[]>([]),
    rootsRef = useRef(roots)
  rootsRef.current = roots
  const diagrams = useRef<Record<string, DiagramDraft>>({}),
    diagramHandles = useRef(new Map<string, DrawioHandle>())
  const allKeys = () => [...Object.keys(drafts.current), ...Object.keys(diagrams.current)]
  const dirtyKey = (key: string) =>
    diagrams.current[key]?.dirty || !!(drafts.current[key] && isDirty(drafts.current[key]))
  const [fileAction, setFileAction] = useState<{
    id: string
    path: string
    action: 'create' | 'folder' | 'rename'
    name: string
  }>()
  const drafts = useRef<Record<string, Draft>>({}),
    [revision, bump] = useState(0)
  const [groups, setGroups] = useState<EditorGroup[]>(() =>
      readEditors(localStorage.getItem('frade.editors')),
    ),
    groupsRef = useRef(groups)
  groupsRef.current = groups
  const [activeGroup, setActiveGroup] = useState('main'),
    activeGroupRef = useRef(activeGroup)
  activeGroupRef.current = activeGroup
  const [selected, setSelected] = useState<ObjectRef | undefined>(() => {
      try {
        const s = JSON.parse(localStorage.getItem('frade.selection') ?? 'null')
        return typeof s?.repositoryId === 'string' && typeof s?.objectId === 'string'
          ? s
          : undefined
      } catch {
        return undefined
      }
    }),
    [selectedRoot, setSelectedRoot] = useState<string>()
  const [layout, setLayout] = useState(() =>
    readLayout(localStorage.getItem('frade.layout'), window.innerWidth, window.innerHeight),
  )
  const [notice, setNotice] = useState(''),
    [menu, setMenu] = useState(false),
    [commands, setCommands] = useState(false),
    [commandSearch, setCommandSearch] = useState('')
  const [panelTab, setPanelTab] = useState<'issues' | 'sources'>('issues')
  const [recovery, setRecovery] = useState<{ id: string; info: RecoveryInfo }>()
  const [renameRoot, setRenameRoot] = useState<{ id: string; label: string }>()
  const [prompt, setPrompt] = useState<Prompt>(),
    promptRef = useRef<Prompt>(),
    [settings, setSettings] = useState<{
      id: string
      set: MetadataSetProfile
      preview?: MetadataPreview
      error?: string
    }>()
  const initialized = useRef(false),
    loads = useRef(new Map<string, number>()),
    lastEvents = useRef(new Map<string, number>()),
    focused = useRef<HTMLElement | null>(null)
  const notifyDraft = () => bump((n) => n + 1)
  const request = useCallback(
    async (
      root: LoadedRoot,
      operation: RepositoryRequest['operation'],
      payload: Record<string, JsonValue> = {},
    ): Promise<Result<unknown>> => {
      if (!root.session) return failure('REPOSITORY_UNAVAILABLE')
      const { repositoryId, sessionId, generation, modelGeneration } = root.session
      return client.request({
        scope: { repositoryId, sessionId, generation, modelGeneration },
        request: { version: 1, operation, payload },
      })
    },
    [client],
  )
  const refreshRoot = useCallback(
    async (root: LoadedRoot) => {
      if (!root.session) return
      const id = root.root.repositoryId,
        n = (loads.current.get(id) ?? 0) + 1
      loads.current.set(id, n)
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const meta = await request(root, 'presentation')
          if (!meta.ok) {
            if (loads.current.get(id) === n)
              setRoots((rs) =>
                rs.map((r) =>
                  r.root.repositoryId === id ? { ...r, error: errorText(meta), loading: false } : r,
                ),
              )
            return
          }
          const listing = await request(root, 'diagram', { action: 'list' })
          const diagramEntries = listing.ok
            ? (listing.value as { entries: { path: string; kind: 'file' | 'folder' }[] }).entries
            : []
          const catalogsResult = await request(root, 'diagram', { action: 'catalogs' })
          const catalogs = catalogsResult.ok
            ? (
                catalogsResult.value as {
                  catalogs: { id: string; label: string; objects: DiagramObject[] }[]
                }
              ).catalogs
            : []
          const presentation = meta.value as RepositoryPresentation,
            objects: RepositoryObject[] = []
          let cursor: string | undefined,
            stale = false
          do {
            const page = await request(root, 'queryObjects', {
              query: { limit: 100, ...(cursor ? { cursor } : {}) },
            })
            if (!page.ok) {
              if (page.error.code === 'STALE_CURSOR') {
                stale = true
                break
              }
              throw Error(errorText(page))
            }
            const value = page.value as {
              items: RepositoryObject[]
              cursor?: string
              revision: string
            }
            if (value.revision !== presentation.revision) {
              stale = true
              break
            }
            objects.push(...value.items)
            cursor = value.cursor
          } while (cursor)
          if (stale) continue
          if (loads.current.get(id) !== n) return
          setRoots((rs) =>
            rs.map((r) =>
              r.root.repositoryId === id
                ? {
                    ...root,
                    presentation,
                    objects,
                    catalogs,
                    diagrams: diagramEntries,
                    loading: false,
                    error: undefined,
                  }
                : r,
            ),
          )
          for (const [key, d] of Object.entries(drafts.current))
            if (d.base.ref.repositoryId === id)
              drafts.current[key] = refreshed(
                d,
                objects.find((o) => o.ref.objectId === d.base.ref.objectId),
                root.session.modelGeneration,
              )
          for (const group of groupsRef.current)
            for (const key of group.tabs) {
              if (drafts.current[key]) continue
              const [repositoryId, objectId, path] = JSON.parse(key)
              if (repositoryId === id && objectId === 'diagram' && path && !diagrams.current[key]) {
                const file = await request(root, 'diagram', { action: 'read', path })
                if (file.ok) {
                  const doc = file.value as DiagramDocument
                  diagrams.current[key] = {
                    ...doc,
                    repositoryId: id,
                    current: doc.xml,
                    dirty: false,
                    epoch: 0,
                  }
                } else setNotice(errorText(file))
                continue
              }
              if (repositoryId === id) {
                const object = objects.find((o) => o.ref.objectId === objectId)
                if (object) drafts.current[key] = makeDraft(object, root.session.modelGeneration)
              }
            }
          notifyDraft()
          return
        }
        throw Error('Источник изменяется во время чтения. Повторите обновление.')
      } catch (e) {
        if (loads.current.get(id) === n)
          setRoots((rs) =>
            rs.map((r) =>
              r.root.repositoryId === id ? { ...r, error: String(e), loading: false } : r,
            ),
          )
      }
    },
    [request],
  )
  const applyStatus = useCallback(
    (status: WorkspaceStatus, restore = false) => {
      if (status.focusRoot) {
        setSelectedRoot(status.focusRoot)
        setSelected(undefined)
      }
      const next = status.roots.map((r) => ({
        ...r,
        objects:
          rootsRef.current.find((old) => old.root.repositoryId === r.root.repositoryId)?.objects ??
          [],
        loading: !!r.session,
      }))
      const added = restore
        ? []
        : next.filter(
            (r) => !rootsRef.current.some((old) => old.root.repositoryId === r.root.repositoryId),
          )
      rootsRef.current = next
      setRoots(next)
      setLayout((l) => ({
        ...l,
        expanded: [
          ...new Set([...l.expanded, ...added.map((r) => JSON.stringify([r.root.repositoryId]))]),
        ],
      }))
      for (const root of next) void refreshRoot(root)
    },
    [refreshRoot],
  )
  const host = useCallback(
    async (command: HostCommand) => {
      const result = await client.command(command)
      if (!result.ok) {
        if (result.error.code !== 'CANCELLED') setNotice(errorText(result))
        return false
      }
      applyStatus(result.value as WorkspaceStatus, command.operation === 'restore')
      setNotice('')
      return true
    },
    [client, applyStatus],
  )
  useEffect(() => {
    try {
      localStorage.setItem('frade.selection', JSON.stringify(selected ?? null))
    } catch {
      /* Optional local UI state. */
    }
  }, [selected])
  useEffect(() => {
    try {
      localStorage.setItem('frade.editors', JSON.stringify({ version: 1, groups }))
    } catch {
      /* In-memory editing remains available. */
    }
    if (!groups.some((g) => g.id === activeGroup)) setActiveGroup(groups[0]?.id ?? 'main')
  }, [groups, activeGroup])
  useEffect(() => {
    try {
      localStorage.setItem('frade.layout', JSON.stringify(layout))
    } catch {
      /* Keep drafts. */
    }
  }, [layout])
  useEffect(() => {
    const resize = () =>
      setLayout((l) => readLayout(JSON.stringify(l), window.innerWidth, window.innerHeight))
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    if (health === 'unavailable')
      setRoots((rs) =>
        rs.map((r) => ({
          ...r,
          error: 'Backend остановлен. Нажмите «Повторить», чтобы открыть сессию заново.',
        })),
      )
  }, [health])
  useEffect(() => {
    if (health === 'ready' && !initialized.current) {
      initialized.current = true
      void host({ operation: 'restore' })
    }
  }, [health, host])
  useEffect(
    () =>
      client.subscribe((event) => {
        const root = rootsRef.current.find((r) => r.root.repositoryId === event.scope.repositoryId)
        if (
          !root?.session ||
          root.session.sessionId !== event.scope.sessionId ||
          root.session.generation !== event.scope.generation
        )
          return
        const previous = lastEvents.current.get(event.scope.sessionId) ?? 0
        if (event.event.sequence <= previous) return
        lastEvents.current.set(event.scope.sessionId, event.event.sequence)
        const next = { ...root, session: { ...root.session, ...event.scope } }
        if (event.event.state === 'DEGRADED') {
          setRoots((rs) =>
            rs.map((r) =>
              r === root
                ? {
                    ...next,
                    error:
                      'Источник недоступен или содержит ошибки. Исправьте файл и повторите чтение.',
                  }
                : r,
            ),
          )
          return
        }
        void refreshRoot(next)
      }),
    [client, refreshRoot],
  )
  const openingResource = useRef(0)
  const preparePreview = async () => {
    const preview = groupsRef.current.find((g) => g.id === activeGroupRef.current)?.preview
    if (!preview || !diagrams.current[preview]) return true
    try {
      await flushDiagram(preview)
      return true
    } catch (e) {
      setNotice(String(e))
      return false
    }
  }
  useEffect(() => {
    let disposed = false,
      running = false
    const poll = async () => {
      if (running || health !== 'ready') return
      running = true
      try {
        for (const root of rootsRef.current) {
          if (!root.session) continue
          const result = await request(root, 'diagram', { action: 'list' })
          if (disposed) return
          if (result.ok) {
            const entries = (
              result.value as { entries: { path: string; kind: 'file' | 'folder' }[] }
            ).entries
            setRoots((rs) =>
              rs.map((r) =>
                r.root.repositoryId === root.root.repositoryId &&
                r.session?.sessionId === root.session?.sessionId &&
                JSON.stringify(r.diagrams) !== JSON.stringify(entries)
                  ? { ...r, diagrams: entries }
                  : r,
              ),
            )
          }
          for (const [key, d] of Object.entries(diagrams.current)) {
            if (
              d.repositoryId !== root.root.repositoryId ||
              d.saving ||
              !groupsRef.current.some((g) => g.tabs.includes(key))
            )
              continue
            const disk = await request(root, 'diagram', { action: 'read', path: d.path })
            if (disposed || diagrams.current[key] !== d || d.saving) continue
            if (!disk.ok) {
              if (d.error !== errorText(disk)) {
                d.error = errorText(disk)
                notifyDraft()
              }
              continue
            }
            const doc = disk.value as DiagramDocument
            if (doc.revision !== d.revision) {
              try {
                await flushDiagram(key)
              } catch {
                continue
              }
              if (d.dirty) {
                if (d.error !== 'REVISION_CONFLICT') {
                  d.error = 'REVISION_CONFLICT'
                  notifyDraft()
                }
              } else {
                diagrams.current[key] = {
                  ...doc,
                  repositoryId: d.repositoryId,
                  current: doc.xml,
                  dirty: false,
                  epoch: d.epoch + 1,
                }
                notifyDraft()
              }
            }
          }
        }
      } finally {
        running = false
      }
    }
    const timer = setInterval(() => void poll(), 2000)
    return () => {
      disposed = true
      clearInterval(timer)
    }
    // Poll uses current drafts and sessions, keeping source refresh independent of card queries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health, request])
  const openObject = async (ref: ObjectRef, pinned = false) => {
    const opening = ++openingResource.current
    if (!(await preparePreview()) || opening !== openingResource.current) return
    const root = rootsRef.current.find((r) => r.root.repositoryId === ref.repositoryId),
      object = root?.objects.find((o) => o.ref.objectId === ref.objectId)
    if (!root?.session || !object) {
      setNotice('Объект недоступен')
      return
    }
    const key = objectKey(ref.repositoryId, ref.objectId)
    if (!drafts.current[key]) drafts.current[key] = makeDraft(object, root.session.modelGeneration)
    setGroups((gs) =>
      openTab(gs, activeGroupRef.current, key, pinned || isDirty(drafts.current[key])),
    )
    setSelected(ref)
    setSelectedRoot(ref.repositoryId)
    notifyDraft()
  }
  const openDiagram = async (id: string, path: string, pinned = false) => {
    const opening = ++openingResource.current
    if (!(await preparePreview()) || opening !== openingResource.current) return
    const root = rootsRef.current.find((r) => r.root.repositoryId === id)
    if (!root) return
    const key = JSON.stringify([id, 'diagram', path])
    if (!diagrams.current[key]) {
      const result = await request(root, 'diagram', { action: 'read', path })
      if (!result.ok) {
        setNotice(errorText(result))
        return
      }
      const doc = result.value as DiagramDocument
      diagrams.current[key] = { ...doc, repositoryId: id, current: doc.xml, dirty: false, epoch: 0 }
    }
    if (opening !== openingResource.current) return
    setGroups((gs) =>
      openTab(gs, activeGroupRef.current, key, pinned || diagrams.current[key].dirty),
    )
    setSelected(undefined)
    setSelectedRoot(id)
    notifyDraft()
  }
  const flushDiagram = async (key: string) => {
    const d = diagrams.current[key],
      handle = diagramHandles.current.get(key)
    if (!d || !handle) return
    const xml = await handle.flush()
    if (!sameDiagramContent(d.path, xml, d.current)) {
      d.current = xml
      d.dirty = true
      pin(key)
      notifyDraft()
    }
  }
  const discardDiagram = async (key: string) => {
    const d = diagrams.current[key],
      root = rootsRef.current.find((r) => r.root.repositoryId === d.repositoryId)
    if (!root || d.saving) return false
    const result = await request(root, 'diagram', { action: 'read', path: d.path })
    if (!result.ok) {
      d.error = errorText(result)
      notifyDraft()
      return false
    }
    const doc = result.value as DiagramDocument
    diagrams.current[key] = {
      ...doc,
      repositoryId: d.repositoryId,
      current: doc.xml,
      dirty: false,
      epoch: d.epoch + 1,
    }
    notifyDraft()
    return true
  }
  const submitFileAction = async () => {
    if (!fileAction) return
    const { id, path, action, name } = fileAction,
      root = rootsRef.current.find((r) => r.root.repositoryId === id)
    if (!root) return
    const target =
      action === 'rename' ? path.slice(0, path.lastIndexOf('/') + 1) + name : path + '/' + name
    let result: Result<unknown>
    if (action === 'rename') {
      const key = JSON.stringify([id, 'diagram', path])
      if (!(await guard([key]))) return
      const read = await request(root, 'diagram', { action: 'read', path })
      if (!read.ok) {
        setNotice(errorText(read))
        return
      }
      result = await request(root, 'diagram', {
        action,
        path,
        destination: target,
        revision: (read.value as DiagramDocument).revision,
      })
      if (result.ok) {
        delete diagrams.current[key]
        setGroups((gs) =>
          gs.map((g) => ({
            ...g,
            tabs: g.tabs.filter((t) => t !== key),
            active: g.active === key ? undefined : g.active,
          })),
        )
      }
    } else result = await request(root, 'diagram', { action, path: target })
    if (!result.ok) {
      setNotice(errorText(result))
      return
    }
    setFileAction(undefined)
    setLayout((l) => ({
      ...l,
      expanded: [
        ...new Set([
          ...l.expanded,
          JSON.stringify([id]),
          JSON.stringify([id, 'diagram', '_diagrams']),
          JSON.stringify([id, 'diagram', path]),
        ]),
      ],
    }))
    await refreshRoot(root)
    if (action !== 'folder') await openDiagram(id, target, true)
  }
  const pin = (key: string) =>
    setGroups((gs) => gs.map((g) => (g.preview === key ? { ...g, preview: undefined } : g)))
  const validateDraft = async (key: string) => {
    const d = drafts.current[key],
      root = rootsRef.current.find((r) => r.root.repositoryId === d.base.ref.repositoryId)
    if (!root?.session || Object.keys(d.raw).length) return
    const type = root.presentation?.types.find((t) => t.id === d.base.typeId),
      name = type?.nameFields
        .map((f) => d.attributes[f])
        .find((v) => typeof v === 'string' && v.trim())
    const command = {
      repositoryId: root.root.repositoryId,
      commands: [
        {
          op: 'updateObject',
          expectedRevision: d.base.revision,
          object: {
            ref: { ...d.base.ref },
            typeId: d.base.typeId,
            name: typeof name === 'string' ? name.split(/\r?\n/)[0].slice(0, 240) : d.base.name,
            attributes: d.attributes,
          },
        },
      ],
    }
    const result = await request(root, 'validate', { changeSet: command as unknown as JsonValue })
    if (drafts.current[key] !== d) return
    if (result.ok) {
      const validation = result.value as { errors: Issue[] }
      drafts.current[key] = { ...d, issues: validation.errors }
    }
    notifyDraft()
  }
  const validationTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const editDraft = (key: string, attributes: Record<string, JsonValue>) => {
    drafts.current[key] = edited(drafts.current[key], attributes)
    pin(key)
    notifyDraft()
    clearTimeout(validationTimers.current.get(key))
    validationTimers.current.set(
      key,
      setTimeout(() => void validateDraft(key), 250),
    )
  }
  const save = async (key: string): Promise<boolean> => {
    if (diagrams.current[key]) {
      const d = diagrams.current[key],
        root = rootsRef.current.find((r) => r.root.repositoryId === d.repositoryId)
      if (!root || d.saving || d.unknown) return false
      try {
        await flushDiagram(key)
      } catch (e) {
        d.error = String(e)
        notifyDraft()
        return false
      }
      if (!d.dirty) return true
      d.saving = true
      notifyDraft()
      const xml = d.current,
        result = await request(root, 'diagram', {
          action: 'write',
          path: d.path,
          xml,
          revision: d.revision,
        })
      d.saving = false
      if (!result.ok) {
        d.error = errorText(result)
        d.unknown = result.error.code === 'OUTCOME_UNKNOWN'
        notifyDraft()
        return false
      }
      const doc = result.value as DiagramDocument
      d.xml = doc.xml
      d.revision = doc.revision
      d.dirty = !sameDiagramContent(d.path, d.current, xml)
      d.error = undefined
      notifyDraft()
      setNotice('Диаграмма сохранена')
      return true
    }
    const d = drafts.current[key]
    if (!d) return true
    if (d.state === 'saving' || d.state === 'unknown' || Object.keys(d.raw).length || d.missing)
      return false
    if (!isDirty(d)) return true
    const root = rootsRef.current.find((r) => r.root.repositoryId === d.base.ref.repositoryId)
    if (
      !root?.session ||
      health !== 'ready' ||
      root.error ||
      d.disk ||
      d.modelGeneration !== root.session.modelGeneration
    ) {
      setNotice('Перед сохранением разрешите конфликт или восстановите репозиторий.')
      return false
    }
    const type = root.presentation?.types.find((t) => t.id === d.base.typeId),
      name = type?.nameFields
        .map((f) => d.attributes[f])
        .find((v) => typeof v === 'string' && v.trim())
    const operationId = crypto.randomUUID(),
      saving: Draft = { ...d, state: 'saving', operationId, error: undefined }
    drafts.current[key] = saving
    notifyDraft()
    const result = await request(root, 'applyChanges', {
      changeSet: {
        repositoryId: root.root.repositoryId,
        idempotencyKey: operationId,
        commands: [
          {
            op: 'updateObject',
            expectedRevision: d.base.revision,
            object: {
              ref: { ...d.base.ref },
              typeId: d.base.typeId,
              name: typeof name === 'string' ? name.split(/\r?\n/)[0].slice(0, 240) : d.base.name,
              attributes: d.attributes,
            },
          },
        ],
      },
    })
    if (!result.ok) {
      drafts.current[key] = {
        ...saving,
        state: ['OUTCOME_UNKNOWN', 'RECOVERY_REQUIRED'].includes(result.error.code)
          ? 'unknown'
          : result.error.code === 'REVISION_CONFLICT'
            ? 'conflict'
            : 'error',
        issues: result.error.issues,
        error: errorText(result),
      }
      notifyDraft()
      if (result.error.code === 'REVISION_CONFLICT') void refreshRoot(root)
      return false
    }
    const object = await request(root, 'getObject', { ref: d.base.ref as unknown as JsonValue })
    if (!object.ok) {
      drafts.current[key] = {
        ...saving,
        state: 'unknown',
        error: 'Запись подтверждена, но не удалось перечитать объект. Проверьте исход операции.',
      }
      notifyDraft()
      return false
    }
    drafts.current[key] = makeDraft(object.value as RepositoryObject, root.session.modelGeneration)
    notifyDraft()
    void refreshRoot(root)
    setNotice('Сохранено в исходный YAML')
    return true
  }
  const reconcile = async (key: string) => {
    const d = drafts.current[key],
      root = rootsRef.current.find((r) => r.root.repositoryId === d.base.ref.repositoryId)
    if (!root || !d.operationId) return
    const result = await request(root, 'reconcile', { operationId: d.operationId })
    if (!result.ok) {
      setNotice(errorText(result))
      return
    }
    const outcome = result.value as { status: string }
    if (outcome.status === 'committed') {
      const object = await request(root, 'getObject', { ref: d.base.ref as unknown as JsonValue })
      if (object.ok) {
        drafts.current[key] = makeDraft(
          object.value as RepositoryObject,
          root.session!.modelGeneration,
        )
        notifyDraft()
        void refreshRoot(root)
      }
    } else if (outcome.status === 'not-committed') {
      drafts.current[key] = {
        ...d,
        state: 'dirty',
        error: 'Запись не выполнена. Черновик сохранён.',
      }
      notifyDraft()
    } else setNotice('Исход операции пока неизвестен. Автоматического повтора не будет.')
  }
  const ask = (label: string) =>
    new Promise<'save' | 'discard' | 'cancel'>((resolve) => {
      focused.current = document.activeElement as HTMLElement
      const p = { label, resolve }
      promptRef.current = p
      setPrompt(p)
    })
  const finishPrompt = (choice: 'save' | 'discard' | 'cancel') => {
    promptRef.current?.resolve(choice)
    promptRef.current = undefined
    setPrompt(undefined)
    requestAnimationFrame(() => focused.current?.focus())
  }
  const guard = async (keys: string[]) => {
    try {
      for (const key of keys) await flushDiagram(key)
    } catch (e) {
      setNotice(String(e))
      return false
    }
    const dirty = keys.filter(dirtyKey)
    if (!dirty.length) return true
    const choice = await ask(`Есть несохранённые изменения (${dirty.length}).`)
    if (choice === 'cancel') return false
    if (choice === 'save') {
      for (const key of dirty) if (!(await save(key))) return false
    } else
      for (const key of dirty) {
        if (diagrams.current[key]) {
          if (!(await discardDiagram(key))) return false
          continue
        }
        const d = drafts.current[key]
        if (d.state === 'saving' || d.state === 'unknown') {
          setNotice('Сначала выясните исход незавершённой записи.')
          return false
        }
        drafts.current[key] = makeDraft(
          d.disk ?? d.base,
          rootsRef.current.find((r) => r.root.repositoryId === d.base.ref.repositoryId)?.session
            ?.modelGeneration ?? d.modelGeneration,
        )
      }
    notifyDraft()
    return true
  }
  const closeTab = async (groupId: string, key: string) => {
    const other = groupsRef.current.some((g) => g.id !== groupId && g.tabs.includes(key))
    if (!other && !(await guard([key]))) return
    if (!other) delete diagrams.current[key]
    setGroups((gs) =>
      gs
        .map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                tabs: g.tabs.filter((k) => k !== key),
                active: g.active === key ? g.tabs.filter((k) => k !== key).at(-1) : g.active,
                preview: g.preview === key ? undefined : g.preview,
              },
        )
        .filter((g) => g.id === 'main' || g.tabs.length),
    )
  }
  const inspectRecovery = async (id: string) => {
    const result = await client.command({ operation: 'recoveryPreview', repositoryId: id })
    if (result.ok) setRecovery({ id, info: result.value as RecoveryInfo })
    else setNotice(errorText(result))
  }
  const resolveRecovery = async () => {
    if (!recovery) return
    const { id, info } = recovery
    if (
      await host({
        operation: 'recoveryResolve',
        repositoryId: id,
        journalHash: info.journalHash,
        sourceHash: info.sourceHash,
      })
    ) {
      for (const [key, d] of Object.entries(drafts.current))
        if (d.base.ref.repositoryId === id && d.operationId === info.operationId)
          drafts.current[key] = {
            ...d,
            state: 'dirty',
            error:
              info.state === 'after'
                ? 'Запись найдена на диске. Сравните результат.'
                : 'Запись не применена. Черновик сохранён.',
          }
      notifyDraft()
      setRecovery(undefined)
      const root = rootsRef.current.find((r) => r.root.repositoryId === id)
      if (root) void refreshRoot(root)
    }
  }
  const removeRoot = async (id: string) => {
    const keys = allKeys().filter((k) => JSON.parse(k)[0] === id)
    if (!(await guard(keys))) return
    if (await host({ operation: 'remove', repositoryId: id })) {
      setGroups((gs) =>
        gs.map((g) => ({
          ...g,
          tabs: g.tabs.filter((k) => !keys.includes(k)),
          active: g.active && keys.includes(g.active) ? undefined : g.active,
        })),
      )
      for (const k of keys) {
        delete drafts.current[k]
        delete diagrams.current[k]
      }
      notifyDraft()
    }
  }
  const saveAll = async () => {
    let saved = 0,
      failed = 0
    for (const key of allKeys()) {
      try {
        await flushDiagram(key)
      } catch {
        failed++
        continue
      }
      if (dirtyKey(key)) {
        if (await save(key)) saved++
        else failed++
      }
    }
    setNotice(`Сохранено: ${saved}. Ошибки: ${failed}.`)
  }
  const openWorkspace = async () => {
    if (!(await guard(allKeys()))) return
    if (await host({ operation: 'openWorkspace' })) {
      drafts.current = {}
      diagrams.current = {}
      setGroups([{ id: 'main', tabs: [] }])
      notifyDraft()
    }
  }
  const rootSettings = (id: string) => {
    const root = rootsRef.current.find((r) => r.root.repositoryId === id)
    if (!root || root.root.adapterKind !== 'sberea') {
      setNotice('Настройка метаописания доступна для sberea.')
      return
    }
    const set = root.root.metadataSets.find((s) => s.id === root.root.activeMetadataSet)!
    setSettings({ id, set: structuredClone(set) })
  }
  const openSettings = () => {
    const active = groupsRef.current.find((group) => group.id === activeGroupRef.current)?.active
    const id =
      (active ? (JSON.parse(active)[0] as string) : undefined) ??
      selectedRoot ??
      selected?.repositoryId ??
      roots[0]?.root.repositoryId
    if (id) rootSettings(id)
  }
  const stageSettings = async () => {
    if (!settings) return
    const keys = allKeys().filter((k) => JSON.parse(k)[0] === settings.id)
    if (!(await guard(keys))) return
    const result = await client.command({
      operation: 'stageMetadata',
      repositoryId: settings.id,
      metadataSet: settings.set,
    })
    setSettings((s) =>
      s
        ? {
            ...s,
            preview: result.ok ? (result.value as MetadataPreview) : undefined,
            error: result.ok ? undefined : errorText(result),
          }
        : s,
    )
  }
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const cancelSettings = useCallback(() => {
    const s = settingsRef.current
    if (s) void client.command({ operation: 'cancelMetadata', repositoryId: s.id })
    setSettings(undefined)
  }, [client])
  const activateSettings = async () => {
    if (!settings?.preview) return
    if (
      await host({
        operation: 'activateMetadata',
        repositoryId: settings.id,
        candidateId: settings.preview.candidateId,
      })
    ) {
      setSettings(undefined)
      setNotice('Набор метаописания применён')
    }
  }
  const current = groups.find((g) => g.id === activeGroup) ?? groups[0],
    activeKey = current?.active,
    active = activeKey ? drafts.current[activeKey] : undefined
  const commandsList = [
    ['Добавить репозиторий KA', () => void host({ operation: 'add', adapterKind: 'sberea' })],
    ['Добавить native-репозиторий', () => void host({ operation: 'add', adapterKind: 'native' })],
    ['Открыть рабочее пространство', () => void openWorkspace()],
    [
      'Сохранить рабочее пространство как…',
      () => void host({ operation: 'saveWorkspace', roots: roots.map((r) => r.root) }),
    ],
    ['Сохранить все', () => void saveAll()],
    [
      'Переключить боковую панель',
      () => setLayout((l) => ({ ...l, sidebarVisible: !l.sidebarVisible })),
    ],
    ['Показать диагностику', () => setLayout((l) => ({ ...l, panelVisible: !l.panelVisible }))],
  ] as const
  const actionsRef = useRef({ save, saveAll, closeTab, guard, activeKey, activeGroup })
  actionsRef.current = { save, saveAll, closeTab, guard, activeKey, activeGroup }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const a = actionsRef.current
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) void a.saveAll()
        else if (a.activeKey) void a.save(a.activeKey)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (a.activeKey) void a.closeTab(a.activeGroup, a.activeKey)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setLayout((l) => ({ ...l, sidebarVisible: !l.sidebarVisible }))
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault()
        setGroups((gs) =>
          gs.map((g) =>
            g.id === a.activeGroup
              ? {
                  ...g,
                  active:
                    g.tabs[
                      (g.tabs.indexOf(g.active ?? '') + (e.shiftKey ? g.tabs.length - 1 : 1)) %
                        g.tabs.length
                    ],
                }
              : g,
          ),
        )
      } else if (
        e.key === 'F1' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault()
        setCommands(true)
      } else if (e.key === 'Tab') {
        const dialogs = [
            ...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
          ],
          dialog = promptRef.current
            ? document.querySelector<HTMLElement>('[aria-label="Несохранённые изменения"]')
            : dialogs.at(-1)
        if (dialog) {
          const controls = [
            ...dialog.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]',
            ),
          ].filter((n) => n.getClientRects().length)
          if (controls.length) {
            const first = controls[0],
              last = controls.at(-1)!
            if (
              e.shiftKey &&
              (document.activeElement === first || !dialog.contains(document.activeElement))
            ) {
              e.preventDefault()
              last.focus()
            } else if (
              !e.shiftKey &&
              (document.activeElement === last || !dialog.contains(document.activeElement))
            ) {
              e.preventDefault()
              first.focus()
            }
          }
        }
      } else if (e.key === 'Escape') {
        if (promptRef.current) finishPrompt('cancel')
        else {
          setMenu(false)
          setCommands(false)
          cancelSettings()
          setRenameRoot(undefined)
          setRecovery(undefined)
        }
      }
    }
    window.addEventListener('keydown', key)
    const off = client.onCloseRequested?.(() => {
      void actionsRef.current.guard(Object.keys(drafts.current)).then((ok) => {
        if (ok) void client.command({ operation: 'approveClose' })
      })
    })
    return () => {
      window.removeEventListener('keydown', key)
      off?.()
    }
  }, [client, cancelSettings])
  useEffect(
    () => () => {
      for (const timer of validationTimers.current.values()) clearTimeout(timer)
    },
    [],
  )
  const resize = (event: React.PointerEvent, part: 'sidebar' | 'panel') => {
    event.preventDefault()
    const x = event.clientX,
      y = event.clientY,
      start = part === 'sidebar' ? layout.sidebar : layout.panel
    const move = (e: PointerEvent) =>
      setLayout((l) => ({
        ...l,
        [part]:
          part === 'sidebar'
            ? Math.max(180, Math.min(window.innerWidth - 300, start + e.clientX - x))
            : Math.max(100, Math.min(window.innerHeight - 220, start + y - e.clientY)),
      }))
    startPointerDrag(event, move)
  }
  const navRoots: NavigatorRoot[] = roots.map((r) => ({
    root: r.root,
    objects: r.objects,
    presentation: r.presentation,
    diagrams: r.diagrams,
    catalogs: r.catalogs,
    error: r.error,
  }))
  const diagnostics = roots.flatMap((r) =>
    (r.presentation?.diagnostics ?? []).map((issue) => ({ root: r, issue })),
  )
  const activeRoot = roots.find((r) => r.root.repositoryId === active?.base.ref.repositoryId)
  return (
    <div className="ka-workbench" data-revision={revision}>
      <header className="wb-titlebar">
        <span className="frade-mark">F</span>
        <button onClick={() => setMenu(!menu)} aria-label="Меню Файл">
          Файл
        </button>
        <button onClick={() => setCommands(true)}>Вид</button>
        <button
          className="command-center"
          onClick={() => setCommands(true)}
          title="Показать все команды (Ctrl+Shift+P)"
        >
          ⌕{' '}
          {roots.length
            ? roots.map((r) => r.root.label).join(', ')
            : 'Frade — архитектурное пространство'}
        </button>
        <span>Frade</span>
      </header>
      {menu && (
        <div className="context-menu file-menu" role="menu">
          {commandsList.map(([label, action]) => (
            <button
              role="menuitem"
              key={label}
              onClick={() => {
                setMenu(false)
                action()
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="wb-body">
        <nav className="activity-bar" aria-label="Разделы">
          <button
            className="active"
            title="Проводник (Ctrl+B)"
            aria-label="Проводник"
            onClick={() => {
              setLayout((l) => ({ ...l, sidebarVisible: true }))
            }}
          >
            <i aria-hidden="true" className="codicon codicon-files" />
          </button>
          <button
            title="Поиск объектов"
            aria-label="Поиск"
            onClick={() => {
              setLayout((l) => ({ ...l, sidebarVisible: true }))
              requestAnimationFrame(() =>
                document.querySelector<HTMLInputElement>('[aria-label="Поиск объектов"]')?.focus(),
              )
            }}
          >
            <i aria-hidden="true" className="codicon codicon-search" />
          </button>
          <div className="activity-spacer" />
          <button
            title="Настройки репозитория"
            aria-label="Настройки репозитория"
            onClick={openSettings}
          >
            <i aria-hidden="true" className="codicon codicon-settings-gear" />
          </button>
        </nav>
        {layout.sidebarVisible && (
          <>
            <aside className="wb-sidebar" style={{ width: layout.sidebar }}>
              <div className="sidebar-title">
                <span>ПРОВОДНИК</span>
                <button
                  aria-label="Добавить репозиторий"
                  title="Добавить репозиторий KA"
                  onClick={() => void host({ operation: 'add', adapterKind: 'sberea' })}
                >
                  ＋
                </button>
                <button aria-label="Настройки выбранного корня" onClick={openSettings}>
                  ⋯
                </button>
              </div>
              <div className="workspace-heading">⌄ РАБОЧЕЕ ПРОСТРАНСТВО</div>
              <Navigator
                onCatalog={(id) => void host({ operation: 'connectCatalog', repositoryId: id })}
                onDiagram={(id, path, pinned) => void openDiagram(id, path, pinned)}
                onDiagramAction={(id, path, action) =>
                  setFileAction({
                    id,
                    path,
                    action,
                    name:
                      action === 'create'
                        ? 'Новая диаграмма.drawio'
                        : action === 'folder'
                          ? 'Новая папка'
                          : path.split('/').at(-1)!,
                  })
                }
                roots={navRoots}
                expanded={layout.expanded}
                projection={layout.projection}
                selected={selected}
                selectedRoot={selectedRoot}
                onRename={(id) => {
                  const root = roots.find((r) => r.root.repositoryId === id)
                  if (root) setRenameRoot({ id, label: root.root.label })
                }}
                onExpand={(expanded) => setLayout((l) => ({ ...l, expanded }))}
                onProjection={(projection) => setLayout((l) => ({ ...l, projection }))}
                onOpen={openObject}
                onRoot={(id) => {
                  setSelectedRoot(id)
                  setSelected(undefined)
                }}
                onSettings={rootSettings}
                onRemove={(id) => void removeRoot(id)}
                onRetry={(id) => void host({ operation: 'retry', repositoryId: id })}
                onReorder={(repositoryIds) => void host({ operation: 'reorder', repositoryIds })}
              />
              {roots.map((r) =>
                r.error ? (
                  <div className="root-error" key={r.root.repositoryId}>
                    <strong>{r.root.label}</strong>
                    <p>{r.error}</p>
                    {r.error.includes('RECOVERY') && (
                      <button onClick={() => void inspectRecovery(r.root.repositoryId)}>
                        Проверить восстановление
                      </button>
                    )}
                    <button
                      onClick={() =>
                        void host({ operation: 'retry', repositoryId: r.root.repositoryId })
                      }
                    >
                      Повторить
                    </button>
                    <button onClick={() => rootSettings(r.root.repositoryId)}>
                      Изменить путь метаописания
                    </button>
                  </div>
                ) : r.loading ? (
                  <div className="loading" key={r.root.repositoryId}>
                    Загрузка {r.root.label}…
                  </div>
                ) : null,
              )}
            </aside>
            <div
              className="splitter vertical"
              role="separator"
              aria-label="Ширина проводника"
              aria-orientation="vertical"
              tabIndex={0}
              onPointerDown={(e) => resize(e, 'sidebar')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
                  setLayout((l) => ({
                    ...l,
                    sidebar: Math.max(180, l.sidebar + (e.key === 'ArrowRight' ? 10 : -10)),
                  }))
              }}
            />
          </>
        )}
        <main className="wb-main">
          <div className="wb-editor-area">
            {groups.map((group) => {
              const key = group.active,
                d = key ? drafts.current[key] : undefined,
                root = roots.find((r) => r.root.repositoryId === d?.base.ref.repositoryId),
                type = root?.presentation?.types.find((t) => t.id === d?.base.typeId)
              return (
                <section
                  className={'editor-group ' + (group.id === activeGroup ? 'active-group' : '')}
                  key={group.id}

                  onFocusCapture={() => setActiveGroup(group.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const data = e.dataTransfer.getData('application/frade-tab')
                    if (!data) return
                    const move = JSON.parse(data) as { key: string; group: string }
                    setGroups((gs) =>
                      openTab(
                        gs.map((g) =>
                          g.id === move.group
                            ? {
                                ...g,
                                tabs: g.tabs.filter((k) => k !== move.key),
                                active:
                                  g.active === move.key
                                    ? g.tabs.filter((k) => k !== move.key).at(-1)
                                    : g.active,
                              }
                            : g,
                        ),
                        group.id,
                        move.key,
                        true,
                      ),
                    )
                  }}
                >
                  <div className="editor-tabs" role="tablist">
                    {group.tabs.map((tab) => {
                      const draft = drafts.current[tab],
                        diagram = diagrams.current[tab]
                      if (!draft && !diagram) return null
                      const title = diagram ? diagram.path.split('/').at(-1)! : draft.base.name
                      const tabRoot = roots.find(
                        (r) =>
                          r.root.repositoryId ===
                          (diagram?.repositoryId ?? draft.base.ref.repositoryId),
                      )
                      return (
                        <div
                          className={
                            'editor-tab ' +
                            (group.active === tab ? 'active ' : '') +
                            (group.preview === tab ? 'preview' : '')
                          }
                          key={tab}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData(
                              'application/frade-tab',
                              JSON.stringify({ key: tab, group: group.id }),
                            )
                          }
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation()
                            const raw = e.dataTransfer.getData('application/frade-tab')
                            if (!raw) return
                            const moved = JSON.parse(raw) as { key: string; group: string }
                            setGroups((gs) =>
                              gs.map((g) => {
                                if (g.id !== moved.group && g.id !== group.id) return g
                                const tabs = g.tabs.filter((t) => t !== moved.key)
                                if (g.id === group.id) {
                                  tabs.splice(Math.max(0, tabs.indexOf(tab)), 0, moved.key)
                                  return { ...g, tabs, active: moved.key, preview: undefined }
                                }
                                return {
                                  ...g,
                                  tabs,
                                  active: g.active === moved.key ? tabs.at(-1) : g.active,
                                }
                              }),
                            )
                          }}
                        >
                          <button
                            role="tab"
                            aria-selected={group.active === tab}
                            title={`${tabRoot?.root.label} / ${diagram?.path ?? draft.base.ref.objectId}`}
                            onClick={() => {
                              setGroups((gs) =>
                                gs.map((g) => (g.id === group.id ? { ...g, active: tab } : g)),
                              )
                              setActiveGroup(group.id)
                              setSelected(diagram ? undefined : draft.base.ref)
                            }}
                            onDoubleClick={() => pin(tab)}
                          >
                            <span
                              aria-hidden="true"
                              className={
                                'tab-icon codicon codicon-' + (diagram ? 'graph' : 'symbol-class')
                              }
                            />
                            {title}
                            {dirtyKey(tab) && <span className="dirty-dot">●</span>}
                          </button>
                          <button
                            className="close-tab"
                            aria-label={`Закрыть ${title}`}
                            onClick={() => void closeTab(group.id, tab)}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                    <div className="tab-fill" />
                    <button
                      className="split-editor"
                      aria-label="Разделить редактор"
                      title="Разделить редактор"
                      onClick={() => {
                        if (!group.active) return
                        const id = crypto.randomUUID()
                        setGroups((gs) => [
                          ...gs,
                          { id, tabs: [group.active!], active: group.active },
                        ])
                        setActiveGroup(id)
                      }}
                    >
                      <i aria-hidden="true" className="codicon codicon-split-horizontal" />
                    </button>
                  </div>
                  <div
                    className="diagram-slot"
                    data-diagram-group={group.id}
                    style={{ display: key && diagrams.current[key] ? 'flex' : 'none' }}
                  >
                    {key && diagrams.current[key] && (
                      <button
                        className="activate-diagram"
                        onClick={() => {
                          setActiveGroup(group.id)
                          notifyDraft()
                        }}
                      >
                        Активировать диаграмму в этой группе
                      </button>
                    )}
                  </div>
                  {key && diagrams.current[key] ? null : d && key && root ? (
                    <>
                      <div className="breadcrumbs">
                        {root.root.label}
                        <span>›</span>
                        {type?.label ?? d.base.typeId}
                        <span>›</span>
                        {d.base.name}
                      </div>
                      <div className="editor-actions">
                        <span>
                          {d.state === 'clean'
                            ? 'Все изменения сохранены'
                            : d.state === 'saving'
                              ? 'Сохранение…'
                              : d.state === 'unknown'
                                ? 'Исход записи неизвестен'
                                : 'Есть несохранённые изменения'}
                        </span>
                        <button
                          disabled={
                            health !== 'ready' ||
                            !!root.error ||
                            !root.session?.capabilities.canWrite ||
                            d.state === 'saving' ||
                            d.state === 'unknown' ||
                            !!d.disk ||
                            !!d.missing ||
                            Object.keys(d.raw).length > 0
                          }
                          onClick={() => void save(key)}
                        >
                          Сохранить
                        </button>
                        {isDirty(d) && (
                          <button
                            disabled={d.state === 'saving' || d.state === 'unknown'}
                            onClick={() => {
                              drafts.current[key] = makeDraft(
                                d.disk ?? d.base,
                                root.session?.modelGeneration ?? d.modelGeneration,
                              )
                              notifyDraft()
                            }}
                          >
                            Отменить изменения
                          </button>
                        )}
                        {d.state === 'unknown' && (
                          <button onClick={() => void reconcile(key)}>Выяснить исход</button>
                        )}
                      </div>
                      {d.error && <div className="editor-error">{d.error}</div>}
                      {d.disk && (
                        <div className="conflict-review">
                          <h3>Конфликт: исходное / черновик / на диске</h3>
                          <table>
                            <thead>
                              <tr>
                                <th>Поле</th>
                                <th>Исходное</th>
                                <th>Черновик</th>
                                <th>На диске</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ...new Set([
                                  ...Object.keys(d.base.attributes),
                                  ...Object.keys(d.attributes),
                                  ...Object.keys(d.disk.attributes),
                                ]),
                              ]
                                .filter(
                                  (f) =>
                                    JSON.stringify(d.attributes[f]) !==
                                    JSON.stringify(d.disk!.attributes[f]),
                                )
                                .map((f) => (
                                  <tr key={f}>
                                    <td>{f}</td>
                                    <td>{JSON.stringify(d.base.attributes[f]) ?? 'отсутствует'}</td>
                                    <td>{JSON.stringify(d.attributes[f]) ?? 'отсутствует'}</td>
                                    <td>
                                      {JSON.stringify(d.disk!.attributes[f]) ?? 'отсутствует'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          <button
                            onClick={() => {
                              drafts.current[key] = {
                                ...d,
                                base: d.disk!,
                                disk: undefined,
                                state: 'dirty',
                                modelGeneration: root.session!.modelGeneration,
                                error: undefined,
                              }
                              notifyDraft()
                              void validateDraft(key)
                            }}
                          >
                            Проверить черновик относительно новой версии
                          </button>
                          <button
                            onClick={() => {
                              drafts.current[key] = makeDraft(
                                d.disk!,
                                root.session!.modelGeneration,
                              )
                              notifyDraft()
                            }}
                          >
                            Принять версию с диска
                          </button>
                        </div>
                      )}
                      <ObjectInspector
                        sourceLocation={
                          root.presentation?.sources.find((s) => s.objectId === d.base.ref.objectId)
                            ?.entry
                        }
                        metadataSource={type?.source}
                        object={d.base}
                        attributes={d.attributes}
                        rule={type?.rule ?? { type: 'object' }}
                        objects={root.objects}
                        disabled={
                          health !== 'ready' ||
                          !!root.error ||
                          !root.session?.capabilities.canWrite ||
                          d.state === 'saving' ||
                          d.state === 'unknown' ||
                          !!d.missing ||
                          root.presentation?.sources.find((s) => s.objectId === d.base.ref.objectId)
                            ?.writable === false
                        }
                        issues={d.issues}
                        raw={d.raw}
                        onRaw={(path, value) => {
                          const old = drafts.current[key],
                            raw = { ...old.raw }
                          if (value === undefined) delete raw[path]
                          else raw[path] = value
                          drafts.current[key] = { ...old, raw, state: 'dirty' }
                          pin(key)
                          notifyDraft()
                        }}
                        onChange={(attributes) => editDraft(key, attributes)}
                        onOpenReference={(ref) => openObject(ref, true)}
                      />
                    </>
                  ) : (
                    <div className="welcome">
                      <div className="welcome-symbol">F</div>
                      <h1>Архитектурное пространство</h1>
                      <p>Откройте KA, чтобы исследовать объекты и редактировать их свойства.</p>
                      <button
                        className="primary"
                        onClick={() => void host({ operation: 'add', adapterKind: 'sberea' })}
                      >
                        Открыть KA
                      </button>
                      <button onClick={() => void openWorkspace()}>
                        Открыть рабочее пространство
                      </button>
                      <p>Диаграммы доступны в папке _diagrams каждого репозитория.</p>
                      <dl>
                        <dt>Все команды</dt>
                        <dd>Ctrl Shift P</dd>
                        <dt>Сохранить</dt>
                        <dd>Ctrl S</dd>
                        <dt>Проводник</dt>
                        <dd>Ctrl B</dd>
                      </dl>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
          {layout.panelVisible && (
            <>
              <div
                className="splitter horizontal"
                role="separator"
                aria-label="Высота панели диагностики"
                aria-orientation="horizontal"
                onPointerDown={(e) => resize(e, 'panel')}
              />
              <section className="diagnostics-panel" style={{ height: layout.panel }}>
                <header>
                  <button onClick={() => setPanelTab('issues')}>
                    ПРОБЛЕМЫ <b>{diagnostics.length}</b>
                  </button>
                  <button onClick={() => setPanelTab('sources')}>ИСХОДНЫЕ РАЗДЕЛЫ</button>
                  <button
                    aria-label="Закрыть диагностику"
                    onClick={() => setLayout((l) => ({ ...l, panelVisible: false }))}
                  >
                    ×
                  </button>
                </header>
                <div>
                  {panelTab === 'sources'
                    ? roots.flatMap((root) =>
                        (root.presentation?.sections ?? []).map((section) => (
                          <details
                            className="source-section"
                            key={root.root.repositoryId + section.entry + section.key}
                          >
                            <summary>
                              {root.root.label} / {section.entry} / {section.key}
                            </summary>
                            <pre>{JSON.stringify(section.value, null, 2)}</pre>
                          </details>
                        )),
                      )
                    : diagnostics.map(({ root, issue }, i) => (
                        <button
                          className="diagnostic-row"
                          key={`${root.root.repositoryId}:${i}`}
                          onClick={() => {
                            if (issue.ref && 'objectId' in issue.ref) openObject(issue.ref, true)
                          }}
                        >
                          <span>⚠</span>
                          <strong>{root.root.label}</strong>
                          <span>
                            {issue.path.join('.')} — {issue.message}
                          </span>
                        </button>
                      ))}
                  {!diagnostics.length && <p>Проблемы не обнаружены</p>}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
      <footer className="wb-statusbar">
        <button
          aria-label="Диагностика"
          title="Диагностика"
          onClick={() => setLayout((l) => ({ ...l, panelVisible: !l.panelVisible }))}
        >
          ⊗ 0 ⚠ {diagnostics.length}
        </button>
        <span className="status-message" aria-live="polite">
          {notice ||
            `${roots.length} репозиториев · ${roots.reduce((n, r) => n + r.objects.length, 0)} объектов`}
        </span>
        <span>{activeRoot?.root.label}</span>
        <span role="status">Backend: {health}</span>
        <span>UTF-8 YAML</span>
      </footer>
      {health !== 'ready' && (
        <div className="backend-banner">
          Backend недоступен. Черновики сохранены в открытых карточках.
        </div>
      )}
      {Object.entries(diagrams.current)
        .filter(([key]) => groups.some((g) => g.tabs.includes(key)))
        .map(([key, d]) => {
          const root = roots.find((r) => r.root.repositoryId === d.repositoryId)
          const target =
            groups.find((g) => g.id === activeGroup && g.active === key) ??
            groups.find((g) => g.active === key)
          const objects: DiagramObject[] = [
            ...(root?.objects.map((o) => ({
              id: o.ref.objectId,
              name: o.name,
              type: o.typeId,
              attributes:
                drafts.current[objectKey(d.repositoryId, o.ref.objectId)]?.attributes ??
                o.attributes,
            })) ?? []),
            ...(root?.catalogs?.flatMap((c) => c.objects.map((o) => ({ ...o, sourceId: c.id }))) ??
              []),
          ]
          const Editor = d.path.toLowerCase().endsWith('.frade') ? FradeDiagramView : DiagramView
          return (
            <Editor
              onEvent={onDiagramEvent}
              key={key + ':' + d.epoch}
              draft={d}
              target={target ? '[data-diagram-group="' + CSS.escape(target.id) + '"]' : null}
              objects={objects}
              flowRepository={
                root
                  ? {
                      types: root.presentation?.types ?? [],
                      objects: root.objects,
                      readOnly: !!root.root.readOnly || !root.session?.capabilities.canWrite,
                      available: !!root.session && !root.error && health === 'ready',
                      revision: root.presentation?.revision ?? '',
                      request: (operation, payload) => request(root, operation, payload),
                    }
                  : undefined
              }
              appearance={appearance}
              readOnly={!!root?.root.readOnly || health !== 'ready' || !!d.saving || !!d.unknown}
              register={(handle) => {
                if (handle) diagramHandles.current.set(key, handle)
                else diagramHandles.current.delete(key)
              }}
              onBaseline={(xml) => {
                if (!d.dirty) d.current = xml
              }}
              onChange={(xml) => {
                if (!sameDiagramContent(d.path, xml, d.current)) {
                  d.current = xml
                  d.dirty = true
                  pin(key)
                  notifyDraft()
                }
              }}
              onError={(message) => {
                d.error = message
                notifyDraft()
              }}
              onSave={() => void save(key)}
              onDiscard={() => void discardDiagram(key)}
              onOpenObject={(id) =>
                openObject({ repositoryId: d.repositoryId, objectId: id }, true)
              }
              onShortcut={(command) => {
                if (command === 'save') void save(key)
                else if (command === 'saveAll') void saveAll()
                else if (command === 'close' && target) void closeTab(target.id, key)
              }}
            />
          )
        })}
      {fileAction && (
        <div className="wb-modal-backdrop">
          <form
            className="wb-dialog"
            role="dialog"
            aria-label="Файл диаграммы"
            onSubmit={(e) => {
              e.preventDefault()
              void submitFileAction()
            }}
          >
            <h2>
              {fileAction.action === 'create'
                ? 'Новая диаграмма'
                : fileAction.action === 'folder'
                  ? 'Новая папка'
                  : 'Переименовать диаграмму'}
            </h2>
            {fileAction.action === 'create' && (
              <label>
                Формат
                <select
                  aria-label="Формат диаграммы"
                  value={fileAction.name.endsWith('.frade') ? 'frade' : 'drawio'}
                  onChange={(e) =>
                    setFileAction({
                      ...fileAction,
                      name:
                        fileAction.name.replace(/\.(drawio|frade)$/i, '') + '.' + e.target.value,
                    })
                  }
                >
                  <option value="drawio">Draw.io (.drawio)</option>
                  <option value="frade">Frade Draw (.frade)</option>
                </select>
              </label>
            )}
            <label>
              Имя
              <input
                autoFocus
                aria-label="Имя файла или папки"
                value={fileAction.name}
                onChange={(e) => setFileAction({ ...fileAction, name: e.target.value })}
              />
            </label>
            <div className="dialog-actions">
              <button type="submit" disabled={!fileAction.name.trim()}>
                Применить
              </button>
              <button type="button" onClick={() => setFileAction(undefined)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
      {prompt && (
        <div className="wb-modal-backdrop" style={{ zIndex: 100 }}>
          <div
            className="wb-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Несохранённые изменения"
          >
            <h2>Сохранить изменения?</h2>
            <p>{prompt.label}</p>
            <div className="dialog-actions">
              <button className="primary" autoFocus onClick={() => finishPrompt('save')}>
                Сохранить
              </button>
              <button onClick={() => finishPrompt('discard')}>Не сохранять</button>
              <button onClick={() => finishPrompt('cancel')}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {commands && (
        <div
          className="command-palette"
          role="dialog"
          aria-label="Команды"
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
              e.preventDefault()
              const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('input,button')],
                index = controls.indexOf(document.activeElement as HTMLElement)
              controls[
                (index + (e.key === 'ArrowDown' ? 1 : controls.length - 1)) % controls.length
              ]?.focus()
            } else if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault()
              e.currentTarget.querySelector<HTMLButtonElement>('button')?.click()
            }
          }}
        >
          <input
            autoFocus
            aria-label="Найти команду"
            value={commandSearch}
            onChange={(e) => setCommandSearch(e.target.value)}
            placeholder="> Введите команду"
          />
          {commandsList
            .filter(([label]) =>
              label.toLocaleLowerCase().includes(commandSearch.toLocaleLowerCase()),
            )
            .map(([label, action]) => (
              <button
                key={label}
                onClick={() => {
                  setCommands(false)
                  action()
                }}
              >
                {label}
              </button>
            ))}
        </div>
      )}
      {recovery && (
        <div className="wb-modal-backdrop">
          <div
            className="wb-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Восстановление записи"
          >
            <h2>Проверка незавершённой записи</h2>
            <p>Файл: {recovery.info.entry}</p>
            <p>
              {recovery.info.state === 'after'
                ? 'Изменение уже находится в исходном файле.'
                : recovery.info.state === 'before'
                  ? 'Исходный файл остался в прежнем состоянии.'
                  : 'Файл изменён извне. Автоматическое разрешение невозможно.'}
            </p>
            <p>
              Подтверждение сохраняет журнал и временный файл как свидетельство операции. Исходный
              YAML не переписывается.
            </p>
            <div className="dialog-actions">
              <button
                className="primary"
                disabled={recovery.info.state === 'conflict'}
                onClick={() => void resolveRecovery()}
              >
                Подтвердить состояние
              </button>
              <button onClick={() => setRecovery(undefined)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {renameRoot && (
        <div className="wb-modal-backdrop">
          <form
            className="wb-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Переименовать корень"
            onSubmit={(e) => {
              e.preventDefault()
              void host({
                operation: 'rename',
                repositoryId: renameRoot.id,
                label: renameRoot.label,
              }).then((ok) => {
                if (ok) setRenameRoot(undefined)
              })
            }}
          >
            <label>
              Название корня
              <input
                autoFocus
                aria-label="Название корня"
                value={renameRoot.label}
                onChange={(e) => setRenameRoot({ ...renameRoot, label: e.target.value })}
              />
            </label>
            <div className="dialog-actions">
              <button type="submit" disabled={!renameRoot.label.trim()}>
                Переименовать
              </button>
              <button type="button" onClick={() => setRenameRoot(undefined)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
      {settings && (
        <div className="wb-modal-backdrop">
          <div
            className="wb-dialog settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Метаописание репозитория"
          >
            <h2>Настройки: {roots.find((r) => r.root.repositoryId === settings.id)?.root.label}</h2>
            <p>
              Папка данных репозитория:{' '}
              <code>{roots.find((r) => r.root.repositoryId === settings.id)?.root.dataRoot}</code>
            </p>
            <ElementAppearanceSettings
              value={appearance}
              onApply={(value) => {
                localStorage.setItem(appearanceStorageKey, JSON.stringify(value))
                setAppearance(value)
              }}
            />
            <p>Для KA папка метаописания — _ecosystems_, содержащая схемы kadzo.</p>
            <label>
              Именованный набор
              <select
                aria-label="Именованный набор"
                value={settings.set.id}
                onChange={(e) => {
                  const set = roots
                    .find((r) => r.root.repositoryId === settings.id)
                    ?.root.metadataSets.find((s) => s.id === e.target.value)
                  if (set)
                    setSettings({ ...settings, set: structuredClone(set), preview: undefined })
                }}
              >
                {roots
                  .find((r) => r.root.repositoryId === settings.id)
                  ?.root.metadataSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                {!roots
                  .find((r) => r.root.repositoryId === settings.id)
                  ?.root.metadataSets.some((s) => s.id === settings.set.id) && (
                  <option value={settings.set.id}>{settings.set.label}</option>
                )}
              </select>
            </label>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  set: { ...settings.set, id: crypto.randomUUID(), label: 'Новый набор' },
                  preview: undefined,
                })
              }
            >
              Добавить набор
            </button>
            <button
              disabled={
                roots.find((r) => r.root.repositoryId === settings.id)?.root.activeMetadataSet ===
                settings.set.id
              }
              onClick={() =>
                void host({
                  operation: 'removeMetadataSet',
                  repositoryId: settings.id,
                  metadataSetId: settings.set.id,
                }).then((ok) => {
                  if (ok) rootSettings(settings.id)
                })
              }
            >
              Удалить неактивный набор
            </button>
            <label>
              Название
              <input
                aria-label="Название набора"
                value={settings.set.label}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    set: { ...settings.set, label: e.target.value },
                    preview: undefined,
                  })
                }
              />
            </label>
            <label>
              Папка метаописания
              <input
                aria-label="Папка метаописания"
                value={settings.set.folderPath}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    set: { ...settings.set, folderPath: e.target.value },
                    preview: undefined,
                  })
                }
              />
            </label>
            <button
              onClick={() =>
                void client
                  .command({ operation: 'browseMetadata', repositoryId: settings.id })
                  .then((r) => {
                    if (r.ok)
                      setSettings((s) =>
                        s
                          ? {
                              ...s,
                              set: { ...s.set, folderPath: String(r.value) },
                              preview: undefined,
                            }
                          : s,
                      )
                  })
              }
            >
              Обзор…
            </button>
            <label>
              Файлы схем (по одному в строке)
              <textarea
                aria-label="Файлы схем"
                value={settings.set.schemaEntries.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    set: {
                      ...settings.set,
                      schemaEntries: e.target.value.split(/\r?\n/).filter(Boolean),
                    },
                    preview: undefined,
                  })
                }
              />
            </label>
            <label>
              Файлы документации
              <textarea
                aria-label="Файлы документации"
                value={settings.set.documentEntries.join('\n')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    set: {
                      ...settings.set,
                      documentEntries: e.target.value.split(/\r?\n/).filter(Boolean),
                    },
                    preview: undefined,
                  })
                }
              />
            </label>
            {settings.error && <p className="field-error">{settings.error}</p>}
            {settings.preview && (
              <div className="metadata-preview">
                <strong>Совместимый набор</strong>
                <p>
                  {settings.preview.types.length} типов ·{' '}
                  {settings.preview.changedTypes?.length ?? 0} изменённых определений ·{' '}
                  {settings.preview.diagnostics.length} исходных диагностик
                </p>
                <code>{settings.preview.fingerprint}</code>
              </div>
            )}
            <div className="dialog-actions">
              <button onClick={() => void stageSettings()}>Проверить набор</button>
              <button
                className="primary"
                disabled={!settings.preview}
                onClick={() => void activateSettings()}
              >
                Применить
              </button>
              <button onClick={cancelSettings}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
