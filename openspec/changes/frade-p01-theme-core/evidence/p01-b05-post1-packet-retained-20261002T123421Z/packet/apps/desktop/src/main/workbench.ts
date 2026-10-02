import { randomUUID } from 'node:crypto'
import { readFile, mkdir, rename, realpath, open, unlink, stat } from 'node:fs/promises'
import { dirname, resolve, relative } from 'node:path'
import {
  failure,
  success,
  copyJson,
  record,
  type JsonValue,
  type Result,
} from '@frade/repository-domain'
import {
  decodeHostCommand,
  decodeWorkspace,
  decodeScopedRequest,
  decodeWorkbenchResult,
  decodeWorkbenchEvent,
  type BackendCommand,
  type WorkspaceRoot,
  type WorkspaceStatus,
  type RootSession,
  type MetadataPreview,
  type HostCommand,
  type WorkbenchEvent,
} from '@frade/repository-api/workbench'

async function atomicJson(target: string, value: unknown) {
  const stage = target + '.' + randomUUID() + '.tmp'
  try {
    const handle = await open(stage, 'wx')
    try {
      await handle.writeFile(JSON.stringify(value, null, 2))
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(stage, target)
  } finally {
    await unlink(stage).catch(() => {})
  }
}
export class WorkbenchRelay {
  private child?: Electron.UtilityProcess
  private epoch = 0
  private pending = new Map<
    string,
    {
      finish: (r: Result<unknown>) => void
      timer: ReturnType<typeof setTimeout>
      mutation: boolean
      operationId?: string
    }
  >()
  constructor(private readonly event: (event: WorkbenchEvent) => void) {}
  attach(child: Electron.UtilityProcess) {
    this.failed()
    this.child = child
    const epoch = ++this.epoch
    child.on('message', (message: unknown) => {
      if (this.child !== child || epoch !== this.epoch || !message || typeof message !== 'object')
        return
      const m = message as Record<string, unknown>
      if (m.type === 'workbench-event') {
        const decoded = decodeWorkbenchEvent(m.value)
        if (decoded.ok) this.event(decoded.value)
        return
      }
      if (m.type !== 'workbench-response' || typeof m.id !== 'string') return
      const entry = this.pending.get(m.id)
      if (!entry) return
      clearTimeout(entry.timer)
      this.pending.delete(m.id)
      entry.finish(decodeWorkbenchResult(m.result))
    })
    child.on('exit', () => {
      if (this.child === child) this.failed()
    })
  }
  failed() {
    this.child = undefined
    this.epoch++
    for (const p of this.pending.values()) {
      clearTimeout(p.timer)
      p.finish(
        failure(p.mutation ? 'OUTCOME_UNKNOWN' : 'REPOSITORY_UNAVAILABLE', [], p.operationId),
      )
    }
    this.pending.clear()
  }
  request(command: BackendCommand): Promise<Result<unknown>> {
    const child = this.child
    if (!child) return Promise.resolve(failure('REPOSITORY_UNAVAILABLE'))
    const id = randomUUID(),
      mutation =
        command.operation === 'request' &&
        (command.value.request.operation === 'applyChanges' ||
          (command.value.request.operation === 'diagram' &&
            !['list', 'read', 'catalogs'].includes(String(command.value.request.payload.action))))
    const operationId = mutation
      ? String(
          (command as Extract<BackendCommand, { operation: 'request' }>).value.request.payload
            .changeSet &&
            (
              (command as Extract<BackendCommand, { operation: 'request' }>).value.request.payload
                .changeSet as Record<string, unknown>
            ).idempotencyKey,
        )
      : undefined
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve(failure(mutation ? 'OUTCOME_UNKNOWN' : 'CANCELLED', [], operationId))
        try {
          child.postMessage({ type: 'workbench-cancel', id })
        } catch {
          /* Child may already have exited. */
        }
      }, 30000)
      this.pending.set(id, { finish: resolve, timer, mutation, operationId })
      try {
        child.postMessage({ type: 'workbench-request', id, command })
      } catch {
        clearTimeout(timer)
        this.pending.delete(id)
        resolve(failure(mutation ? 'OUTCOME_UNKNOWN' : 'REPOSITORY_UNAVAILABLE', [], operationId))
      }
    })
  }
}
interface HostOptions {
  settingsFile: string
  request: (command: BackendCommand) => Promise<Result<unknown>>
  pick: (kind: 'data' | 'metadata' | 'workspace' | 'catalog') => Promise<string | undefined>
  save: () => Promise<string | undefined>
  close: () => void
}
async function requiredEntry(
  folder: string,
  entry: string,
  role: 'data' | 'metadata',
): Promise<Result<true>> {
  const label = role === 'data' ? 'Папка данных репозитория' : 'Папка метаописания'
  const hint =
    role === 'data'
      ? 'Выберите папку с root.yaml (для KA — папку KA).'
      : 'Выберите папку со схемами (для KA — _ecosystems_).'
  try {
    if ((await stat(resolve(folder, entry))).isFile()) return success(true)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT' && code !== 'ENOTDIR')
      return failure('ACCESS_DENIED', [
        {
          code: 'PATH_UNAVAILABLE',
          path: [role],
          message: label + ': ' + folder + '. Не удалось прочитать ' + entry + ' (' + code + ').',
        },
      ])
  }
  return failure('PROFILE_INVALID', [
    {
      code: 'ENTRY_NOT_FOUND',
      path: [role],
      message: label + ': ' + folder + '. Не найден файл ' + entry + '. ' + hint,
    },
  ])
}
async function validatePaths(root: WorkspaceRoot): Promise<Result<true>> {
  if (root.adapterKind !== 'sberea') return success(true)
  const data = await requiredEntry(root.dataRoot, root.entry, 'data')
  if (!data.ok) return data
  const set = root.metadataSets.find((item) => item.id === root.activeMetadataSet)
  if (!set) return failure('PROFILE_INVALID')
  for (const entry of set.schemaEntries) {
    const result = await requiredEntry(set.folderPath, entry, 'metadata')
    if (!result.ok) return result
  }
  return success(true)
}
const describeFailure = (result: Extract<Result<unknown>, { ok: false }>) =>
  [result.error.code, ...result.error.issues.map((issue) => issue.message)].join('\n')
export class WorkbenchHost {
  private roots: WorkspaceStatus['roots'][number][] = []
  private file?: string
  private observed = new Map<string, WorkbenchEvent>()
  private candidates = new Map<string, { preview: MetadataPreview; root: WorkspaceRoot }>()
  private tail: Promise<unknown> = Promise.resolve()
  constructor(private readonly options: HostOptions) {}
  observe(event: WorkbenchEvent) {
    const session = this.roots.find(
      (r) => r.root.repositoryId === event.scope.repositoryId,
    )?.session
    if (
      !session ||
      session.sessionId !== event.scope.sessionId ||
      session.generation !== event.scope.generation
    )
      return
    const previous = this.observed.get(event.scope.repositoryId)
    if (
      previous?.scope.sessionId === event.scope.sessionId &&
      previous.event.sequence >= event.event.sequence
    )
      return
    this.observed.set(event.scope.repositoryId, event)
  }
  private status(focusRoot?: string): WorkspaceStatus {
    return {
      ...(focusRoot ? { focusRoot } : {}),
      roots: structuredClone(
        this.roots.map((root) => {
          const observed = this.observed.get(root.root.repositoryId)
          if (
            !root.session ||
            !observed ||
            observed.scope.sessionId !== root.session.sessionId ||
            observed.scope.generation !== root.session.generation
          )
            return root
          return {
            ...root,
            session: {
              ...root.session,
              ...observed.scope,
              ...(observed.event.state ? { state: observed.event.state } : {}),
            },
          }
        }),
      ),
      ...(this.file ? { file: this.file } : {}),
    }
  }
  private async persist(roots = this.roots, file = this.file) {
    const target = this.options.settingsFile
    await mkdir(dirname(target), { recursive: true })
    await atomicJson(target, {
      version: 1,
      roots: roots.map((r) => r.root),
      ...(file ? { workspaceFile: file } : {}),
    })
  }
  private async open(root: WorkspaceRoot) {
    root = { ...root, dataRoot: await realpath(root.dataRoot).catch(() => root.dataRoot) }
    const paths = await validatePaths(root)
    const result = paths.ok ? await this.options.request({ operation: 'open', root }) : paths
    return result.ok
      ? { root, session: result.value as RootSession }
      : { root, error: describeFailure(result) }
  }
  async request(value: unknown) {
    const decoded = decodeScopedRequest(value)
    if (!decoded.ok) return decoded
    if (!this.roots.some((r) => r.root.repositoryId === decoded.value.scope.repositoryId))
      return failure('ACCESS_DENIED')
    if (
      decoded.value.request.operation === 'diagram' &&
      decoded.value.request.payload.action === 'catalogs'
    ) {
      const item = this.status().roots.find(
        (r) => r.root.repositoryId === decoded.value.scope.repositoryId,
      )
      if (
        !item?.session ||
        item.session.sessionId !== decoded.value.scope.sessionId ||
        item.session.generation !== decoded.value.scope.generation ||
        item.session.modelGeneration !== decoded.value.scope.modelGeneration
      )
        return failure('SESSION_CLOSED')
      const catalogs: unknown[] = [],
        errors: string[] = []
      for (const ref of item.root.externalCatalogs ?? []) {
        try {
          const catalog = await readCatalog(ref.path)
          if (catalog.id !== ref.id) throw Error('Изменился идентификатор источника')
          catalogs.push(catalog)
        } catch (e) {
          errors.push(ref.id + ': ' + String(e))
        }
      }
      return success({ catalogs, errors })
    }
    return this.options.request({ operation: 'request', value: decoded.value })
  }
  command(input: unknown): Promise<Result<unknown>> {
    const decoded = decodeHostCommand(input)
    if (!decoded.ok) return Promise.resolve(decoded)
    const run = () => this.execute(decoded.value).catch(() => failure('REPOSITORY_UNAVAILABLE'))
    const result = this.tail.then(run, run)
    this.tail = result
    return result
  }
  private async execute(command: HostCommand): Promise<Result<unknown>> {
    switch (command.operation) {
      case 'connectCatalog': {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry) return failure('ACCESS_DENIED')
        const selected = await this.options.pick('catalog')
        if (!selected) return failure('CANCELLED')
        const path = await realpath(selected),
          catalog = await readCatalog(path)
        const refs = entry.root.externalCatalogs ?? []
        if (refs.some((c) => c.id === catalog.id && c.path !== path))
          return failure('INVALID_INPUT')
        const next = this.roots.map((r) =>
          r === entry
            ? {
                ...r,
                root: {
                  ...r.root,
                  externalCatalogs: [
                    ...refs.filter((c) => c.id !== catalog.id),
                    { id: catalog.id, path },
                  ],
                },
              }
            : r,
        )
        await this.persist(next)
        this.roots = next
        return success(this.status())
      }
      case 'disconnectCatalog': {
        const next = this.roots.map((r) =>
          r.root.repositoryId === command.repositoryId
            ? {
                ...r,
                root: {
                  ...r.root,
                  externalCatalogs: (r.root.externalCatalogs ?? []).filter(
                    (c) => c.id !== command.sourceId,
                  ),
                },
              }
            : r,
        )
        await this.persist(next)
        this.roots = next
        return success(this.status())
      }
      case 'add': {
        if (!['sberea', 'native'].includes(command.adapterKind))
          return failure('UNSUPPORTED_CAPABILITY')
        const selected = await this.options.pick('data')
        if (!selected) return failure('CANCELLED')
        const dataRoot = await realpath(selected)
        const duplicate = this.roots.find(
          (r) => r.root.dataRoot.toLowerCase() === dataRoot.toLowerCase(),
        )
        if (duplicate) return success(this.status(duplicate.root.repositoryId))
        if (command.adapterKind === 'sberea') {
          const data = await requiredEntry(dataRoot, 'root.yaml', 'data')
          if (!data.ok) return data
        }
        const folder =
          command.adapterKind === 'sberea' ? await this.options.pick('metadata') : undefined
        if (command.adapterKind === 'sberea' && !folder) return failure('CANCELLED')
        const root: WorkspaceRoot = {
          repositoryId: randomUUID(),
          label: dataRoot.split(/[\\/]/).at(-1) ?? 'Repository',
          adapterKind: command.adapterKind,
          dataRoot,
          entry: 'root.yaml',
          metadataSets: folder
            ? [
                {
                  id: 'v2025',
                  label: 'КАДЗО v2025 + tech_params',
                  folderPath: await realpath(folder),
                  dialect: 'sberea',
                  schemaEntries: [
                    'kadzo/v2025/entities/root.yaml',
                    'kadzo/v2023/entities/technical/tech_params.yaml',
                  ],
                  documentEntries: [
                    'docs/metamodel/kadzo-app.md',
                    'docs/metamodel/kadzo-ba.md',
                    'docs/metamodel/kadzo-da.md',
                    'docs/metamodel/kadzo-change.md',
                  ],
                },
              ]
            : [],
          activeMetadataSet: folder ? 'v2025' : '',
        }
        const paths = await validatePaths(root)
        if (!paths.ok) return paths
        const opened = await this.open(root)
        this.roots.push(opened)
        await this.persist()
        return success(this.status(root.repositoryId))
      }
      case 'restore': {
        if (this.roots.length) return success(this.status())
        try {
          const value = JSON.parse(await readFile(this.options.settingsFile, 'utf8')),
            decoded = decodeWorkspace({ version: value.version, roots: value.roots })
          if (!decoded.ok) return decoded
          this.file = typeof value.workspaceFile === 'string' ? value.workspaceFile : undefined
          for (const root of decoded.value.roots) this.roots.push(await this.open(root))
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') return failure('PROFILE_INVALID')
        }
        return success(this.status())
      }
      case 'retry': {
        const i = this.roots.findIndex((r) => r.root.repositoryId === command.repositoryId)
        if (i < 0) return failure('ACCESS_DENIED')
        this.roots[i] = await this.open(this.roots[i].root)
        return success(this.status())
      }
      case 'remove': {
        const found = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!found) return failure('ACCESS_DENIED')
        const next = this.roots.filter((r) => r !== found)
        await this.persist(next)
        await this.options.request({ operation: 'close', repositoryId: command.repositoryId })
        this.roots = next
        return success(this.status())
      }
      case 'reorder': {
        if (
          command.repositoryIds.length !== this.roots.length ||
          command.repositoryIds.some((id) => !this.roots.some((r) => r.root.repositoryId === id))
        )
          return failure('INVALID_INPUT')
        const next = command.repositoryIds.map((id) =>
          this.roots.find((r) => r.root.repositoryId === id)!,
        )
        await this.persist(next)
        this.roots = next
        return success(this.status())
      }
      case 'rename': {
        const next = this.roots.map((r) =>
          r.root.repositoryId === command.repositoryId
            ? { ...r, root: { ...r.root, label: command.label } }
            : r,
        )
        await this.persist(next)
        this.roots = next
        return success(this.status())
      }
      case 'saveWorkspace': {
        // Paths and adapter grants come from host state, never renderer-submitted profiles.
        const selected = await this.options.save()
        if (!selected) return failure('CANCELLED')
        const roots = this.roots.map(({ root }) => ({
          ...root,
          dataRoot: relative(dirname(selected), root.dataRoot) || '.',
          ...(root.externalCatalogs
            ? {
                externalCatalogs: root.externalCatalogs.map((c) => ({
                  ...c,
                  path: relative(dirname(selected), c.path),
                })),
              }
            : {}),
          metadataSets: root.metadataSets.map((s) => ({
            ...s,
            folderPath: relative(dirname(selected), s.folderPath) || '.',
          })),
        }))
        await atomicJson(selected, { version: 1, roots })
        this.file = selected
        await this.persist()
        return success(this.status())
      }
      case 'openWorkspace': {
        const file = await this.options.pick('workspace')
        if (!file) return failure('CANCELLED')
        const decoded = decodeWorkspace(JSON.parse(await readFile(file, 'utf8')))
        if (!decoded.ok) return decoded
        const roots = decoded.value.roots.map((root) => ({
          ...root,
          dataRoot: resolve(dirname(file), root.dataRoot),
          ...(root.externalCatalogs
            ? {
                externalCatalogs: root.externalCatalogs.map((c) => ({
                  ...c,
                  path: resolve(dirname(file), c.path),
                })),
              }
            : {}),
          metadataSets: root.metadataSets.map((s) => ({
            ...s,
            folderPath: resolve(dirname(file), s.folderPath),
          })),
        }))
        for (const old of this.roots)
          await this.options.request({ operation: 'close', repositoryId: old.root.repositoryId })
        this.roots = []
        this.file = file
        for (const root of roots) this.roots.push(await this.open(root))
        await this.persist()
        return success(this.status())
      }
      case 'browseMetadata': {
        if (!this.roots.some((r) => r.root.repositoryId === command.repositoryId))
          return failure('ACCESS_DENIED')
        const path = await this.options.pick('metadata')
        return path ? success(await realpath(path)) : failure('CANCELLED')
      }
      case 'stageMetadata': {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry) return failure('ACCESS_DENIED')
        const selectedFolder = resolve(
          this.file ? dirname(this.file) : entry.root.dataRoot,
          command.metadataSet.folderPath,
        )
        for (const schema of command.metadataSet.schemaEntries) {
          const valid = await requiredEntry(selectedFolder, schema, 'metadata')
          if (!valid.ok) return valid
        }
        const folderPath = await realpath(selectedFolder)
        const metadataSet = { ...command.metadataSet, folderPath }
        const result = await this.options.request({
          operation: 'stage',
          repositoryId: command.repositoryId,
          metadataSet,
          root: entry.root,
        })
        if (!result.ok) return result
        const root = {
          ...entry.root,
          metadataSets: [
            ...entry.root.metadataSets.filter((s) => s.id !== metadataSet.id),
            metadataSet,
          ],
          activeMetadataSet: metadataSet.id,
        }
        this.candidates.set(command.repositoryId, {
          preview: result.value as MetadataPreview,
          root,
        })
        return result
      }
      case 'recoveryPreview': {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry || entry.root.adapterKind !== 'sberea') return failure('ACCESS_DENIED')
        return this.options.request({ operation: 'recoveryPreview', dataRoot: entry.root.dataRoot })
      }
      case 'recoveryResolve': {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry || entry.root.adapterKind !== 'sberea') return failure('ACCESS_DENIED')
        const resolved = await this.options.request({
          operation: 'recoveryResolve',
          dataRoot: entry.root.dataRoot,
          journalHash: command.journalHash,
          sourceHash: command.sourceHash,
        })
        if (!resolved.ok) return resolved
        this.roots = this.roots.map((r) => (r === entry ? { root: r.root } : r))
        return this.execute({ operation: 'retry', repositoryId: command.repositoryId })
      }
      case 'removeMetadataSet': {
        const entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry) return failure('ACCESS_DENIED')
        if (entry.root.activeMetadataSet === command.metadataSetId) return failure('INVALID_INPUT')
        const next = this.roots.map((r) =>
          r === entry
            ? {
                ...r,
                root: {
                  ...r.root,
                  metadataSets: r.root.metadataSets.filter((s) => s.id !== command.metadataSetId),
                },
              }
            : r,
        )
        await this.persist(next)
        this.roots = next
        return success(this.status())
      }
      case 'cancelMetadata': {
        if (!this.roots.some((r) => r.root.repositoryId === command.repositoryId))
          return failure('ACCESS_DENIED')
        this.candidates.delete(command.repositoryId)
        return this.options.request({
          operation: 'cancelCandidate',
          repositoryId: command.repositoryId,
        })
      }
      case 'activateMetadata': {
        const candidate = this.candidates.get(command.repositoryId),
          entry = this.roots.find((r) => r.root.repositoryId === command.repositoryId)
        if (!entry || !candidate || candidate.preview.candidateId !== command.candidateId)
          return failure('REVISION_CONFLICT')
        const next = this.roots.map((r) => (r === entry ? { ...r, root: candidate.root } : r))
        await this.persist(next)
        const activated = await this.options.request({
          operation: 'activate',
          repositoryId: command.repositoryId,
          candidateId: command.candidateId,
        })
        if (!activated.ok) {
          try {
            await this.persist()
          } catch {
            await this.options.request({ operation: 'close', repositoryId: command.repositoryId })
            this.roots = this.roots.map((r) =>
              r === entry
                ? {
                    root: r.root,
                    error: 'Не удалось восстановить настройки. Требуется повторное открытие.',
                  }
                : r,
            )
          }
          return activated
        }
        this.roots = next.map((r) =>
          r.root.repositoryId === command.repositoryId
            ? { root: r.root, session: activated.value as RootSession }
            : r,
        )
        this.candidates.delete(command.repositoryId)
        return success(this.status())
      }
      case 'approveClose':
        this.options.close()
        return success(true)
      default:
        return failure('UNSUPPORTED_CAPABILITY')
    }
  }
}

export async function readCatalog(path: string): Promise<{
  version: 1
  id: string
  label: string
  objects: { id: string; name: string; type?: string; attributes?: Record<string, JsonValue> }[]
}> {
  if ((await stat(path)).size > 1024 * 1024) throw Error('Каталог превышает 1 МБ')
  const value = JSON.parse(await readFile(path, 'utf8'))
  if (
    !value ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.label !== 'string' ||
    !Array.isArray(value.objects) ||
    value.objects.length > 5000
  )
    throw Error('Некорректное описание внешнего каталога')
  const ids = new Set<string>()
  for (const object of value.objects) {
    if (
      !object ||
      typeof object.id !== 'string' ||
      !object.id.trim() ||
      typeof object.name !== 'string' ||
      ids.has(object.id) ||
      (object.type !== undefined && typeof object.type !== 'string') ||
      (object.attributes !== undefined &&
        (!record(object.attributes) || !copyJson(object.attributes).ok))
    )
      throw Error('Некорректный объект внешнего каталога')
    ids.add(object.id)
  }
  return {
    version: 1,
    id: value.id,
    label: value.label,
    objects: value.objects.map(
      (o: { id: string; name: string; type?: string; attributes?: Record<string, JsonValue> }) => ({
        id: o.id,
        name: o.name,
        ...(o.type ? { type: o.type } : {}),
        ...(o.attributes ? { attributes: o.attributes } : {}),
      }),
    ),
  }
}
