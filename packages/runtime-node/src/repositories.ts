import { DiagramFiles } from './diagram-files'
import { randomUUID, createHash } from 'node:crypto'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { SqliteIndex } from '@frade/local-index'
import { NativeRepositoryController } from './native-session'
import { realpath } from 'node:fs/promises'
import {
  openRepository,
  type RepositorySession,
  CancellationSource,
  IntegrationFlowService,
} from '@frade/repository-application'
import { RepositoryApi } from '@frade/repository-api'
import {
  decodeScopedRequest,
  decodeWorkspace,
  decodeMetadataSet,
  boundedWorkbenchValue,
  type BackendCommand,
  type RootSession,
  type WorkspaceRoot,
  type RepositoryPresentation,
  type TypePresentation,
  type WorkbenchEvent,
  type SessionScope,
} from '@frade/repository-api/workbench'
import { constraintFields, type Constraint, type ValueSchema } from '@frade/metamodel-domain'
import { failure, success, record, type Result } from '@frade/repository-domain'
import type { RepositoryAdapterSession } from '@frade/repository-ports'
import {
  inspectSbereaRecovery,
  resolveSbereaRecovery,
  type SbereaSession,
} from '@frade/adapter-sberea-yaml'
import { referenceTargets } from '@frade/metamodel-config'
import { createRepositoryAdapterRegistry } from './adapters'

interface Entry {
  root: WorkspaceRoot
  physical: string
  adapter: RepositoryAdapterSession
  core: RepositorySession
  scope: SessionScope
  off: () => void
  pending: number
  diagrams?: DiagramFiles
  flows?: IntegrationFlowService
  unknown: Set<string>
}
function renameIdentity(value: unknown, from: string, to: string): unknown {
  if (Array.isArray(value)) return value.map((v) => renameIdentity(v, from, to))
  if (!record(value)) return value
  const out = Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, renameIdentity(v, from, to)]),
  )
  if (
    out.repositoryId === from &&
    (typeof out.objectId === 'string' ||
      typeof out.relationId === 'string' ||
      Array.isArray(out.commands) ||
      Array.isArray(out.objects) ||
      typeof out.eventId === 'string')
  )
    out.repositoryId = to
  return out
}
function referenceMapping(rule: Constraint): string {
  const paths: Record<string, readonly string[]> = {}
  const walk = (r: Constraint, path: string[]) => {
    const targets = referenceTargets(r)
    if (targets.length) {
      paths[path.join('.')] = [...targets].sort()
      return
    }
    const items =
      r.items ??
      [...(r.allOf ?? []), ...(r.anyOf ?? []), ...(r.oneOf ?? [])].find((b) => b.items)?.items
    if (items) walk(items, [...path, '[]'])
    for (const f of constraintFields(r)) walk(f.rule, [...path, f.key])
  }
  walk(rule, [])
  return JSON.stringify(
    Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
  )
}
function nativeRule(schema: ValueSchema): Constraint {
  const nullable = schema.nullable ? ['null'] : []
  switch (schema.kind) {
    case 'string':
    case 'text':
    case 'date':
    case 'datetime':
      return {
        type: nullable.length ? ['string', ...nullable] : 'string',
        ...(schema.kind === 'date'
          ? { format: 'date' as const }
          : schema.kind === 'datetime'
            ? { format: 'date-time' as const }
            : {}),
      }
    case 'integer':
    case 'decimal':
      return {
        type: nullable.length
          ? [schema.kind === 'integer' ? 'integer' : 'number', ...nullable]
          : schema.kind === 'integer'
            ? 'integer'
            : 'number',
        ...(schema.minimum !== undefined ? { minimum: schema.minimum } : {}),
        ...(schema.maximum !== undefined ? { maximum: schema.maximum } : {}),
      }
    case 'boolean':
      return { type: 'boolean' }
    case 'enum':
      return { enum: schema.values }
    case 'reference':
      return { referenceTargets: schema.targets.typeIds }
    case 'list':
      return { type: 'array', items: nativeRule(schema.items) }
    case 'object':
      return {
        type: 'object',
        properties: Object.fromEntries(
          schema.fields.map((f) => [f.id, { ...nativeRule(f.schema), title: f.ui?.label ?? f.id }]),
        ),
        required: schema.fields.filter((f) => f.required).map((f) => f.id),
      }
  }
}
export class RepositoryBackend {
  private legacy?: NativeRepositoryController
  private entries = new Map<string, Entry>()
  private generations = new Map<string, number>()
  private candidates = new Map<
    string,
    { id: string; entry: Entry; generation: number; fingerprint: string }
  >()
  private requests = new Map<
    string,
    { repositoryId: string; cancel: CancellationSource; operationId?: string }
  >()

  constructor(
    private readonly publish: (event: WorkbenchEvent) => void = () => {},
    private readonly registry = createRepositoryAdapterRegistry(),
  ) {}
  private describe(e: Entry): RootSession {
    return {
      ...e.scope,
      label: e.root.label,
      state: e.core.state,
      capabilities: {
        ...e.core.capabilities,
        canWrite: !e.root.readOnly && e.core.capabilities.canWrite,
      },
      binding: {
        modelId: e.adapter.model.modelId,
        modelVersion: e.adapter.model.modelVersion,
        fingerprint: e.adapter.model.fingerprint,
      },
    }
  }
  private async create(
    root: WorkspaceRoot,
    generation: number,
    modelGeneration = 1,
  ): Promise<Result<Entry>> {
    const metadataSet = root.metadataSets.find((s) => s.id === root.activeMetadataSet)
    const opened = await this.registry.open(
      {
        adapterKind: root.adapterKind,
        dataRoot: root.dataRoot,
        repositoryId: root.repositoryId,
        label: root.label,
        entry: root.entry,
        ...(metadataSet ? { metadataSet } : {}),
      },
      { allowSourceIdentity: root.adapterKind === 'native' },
    )
    if (!opened.ok) return opened
    const adapter = opened.value,
      sourceId = adapter.profile.repositoryId
    const core = await openRepository(
      { open: async () => success(adapter) },
      {
        callerId: 'desktop',
        repositoryIds: [sourceId],
        permissions: root.readOnly ? ['read'] : ['read', 'write'],
      },
      { authorize: (ctx) => ctx.permissions.includes('write') },
    )
    if (!core.ok) {
      await adapter.close()
      return core
    }
    const e: Entry = {
      root,
      physical: await realpath(root.dataRoot),
      adapter,
      core: core.value,
      scope: {
        repositoryId: root.repositoryId,
        sessionId: randomUUID(),
        generation,
        modelGeneration,
      },
      off: () => {},
      pending: 0,
      unknown: new Set(),
    }
    return success(e)
  }
  private bind(e: Entry) {
    let fingerprint = e.adapter.model.fingerprint
    e.off = e.core.subscribe((event) => {
      if (this.entries.get(e.root.repositoryId) !== e) return
      if (event.type === 'metamodel.changed') {
        e.flows?.dispose()
        e.flows = undefined
      }
      if (e.adapter.model.fingerprint !== fingerprint) {
        fingerprint = e.adapter.model.fingerprint
        e.scope = { ...e.scope, modelGeneration: e.scope.modelGeneration + 1 }
      }
      const translated = renameIdentity(
        event,
        e.adapter.profile.repositoryId,
        e.root.repositoryId,
      ) as WorkbenchEvent['event']
      this.publish({ version: 1, scope: { ...e.scope }, event: translated })
    })
  }
  private async dispose(e: Entry) {
    e.off()
    e.flows?.dispose()
    await e.core.close()
  }
  async close(repositoryId: string) {
    this.generations.set(repositoryId, (this.generations.get(repositoryId) ?? 0) + 1)
    for (const request of this.requests.values())
      if (request.repositoryId === repositoryId) request.cancel.cancel()
    const e = this.entries.get(repositoryId)
    this.entries.delete(repositoryId)
    const candidate = this.candidates.get(repositoryId)
    this.candidates.delete(repositoryId)
    if (candidate) await this.dispose(candidate.entry)
    if (e) await this.dispose(e)
    return success(true)
  }
  async closeAll() {
    await this.legacy?.close()
    await Promise.all([...this.entries.keys()].map((id) => this.close(id)))
  }
  cancel(id: string) {
    const request = this.requests.get(id)
    request?.cancel.cancel()
    if (request?.operationId)
      this.entries.get(request.repositoryId)?.unknown.add(request.operationId)
  }
  async handle(
    command: BackendCommand,
    requestId: string = randomUUID(),
  ): Promise<Result<unknown>> {
    try {
      if (!boundedWorkbenchValue(command).ok) return failure('INVALID_INPUT')
      if (command.operation === 'recoveryPreview')
        return success(await inspectSbereaRecovery(command.dataRoot))
      if (command.operation === 'recoveryResolve') {
        const preview = await inspectSbereaRecovery(command.dataRoot)
        if (
          preview.journalHash !== command.journalHash ||
          preview.sourceHash !== command.sourceHash
        )
          return failure('REVISION_CONFLICT')
        await resolveSbereaRecovery(command.dataRoot, preview)
        return success(preview)
      }
      if (command.operation === 'legacyOpen') {
        await this.legacy?.close()
        this.legacy = new NativeRepositoryController(
          async () => command.dataRoot,
          async (repositoryId) => {
            await mkdir(command.indexDirectory, { recursive: true })
            return new SqliteIndex(
              join(
                command.indexDirectory,
                createHash('sha256').update(repositoryId).digest('hex') + '.sqlite',
              ),
            )
          },
        )
        return this.legacy.open()
      }
      if (command.operation === 'legacyRequest')
        return this.legacy ? this.legacy.request(command.value) : failure('REPOSITORY_UNAVAILABLE')
      if (command.operation === 'legacyClose') {
        await this.legacy?.close()
        this.legacy = undefined
        return success(true)
      }
      if (command.operation === 'close') return this.close(command.repositoryId)
      if (command.operation === 'open') {
        const valid = decodeWorkspace({ version: 1, roots: [command.root] })
        if (!valid.ok) return valid
        const root = valid.value.roots[0],
          physical = await realpath(root.dataRoot)
        const duplicate = [...this.entries.values()].find(
          (e) =>
            e.physical.toLowerCase() === physical.toLowerCase() &&
            e.root.repositoryId !== root.repositoryId,
        )
        if (duplicate)
          return failure('PROFILE_INVALID', [
            { code: 'DUPLICATE_ROOT', message: 'Этот каталог уже открыт', path: [] },
          ])
        await this.close(root.repositoryId)
        const generation = this.generations.get(root.repositoryId)!
        const created = await this.create(root, generation)
        if (!created.ok) return created
        if (this.generations.get(root.repositoryId) !== generation) {
          await this.dispose(created.value)
          return failure('CANCELLED')
        }
        this.entries.set(root.repositoryId, created.value)
        this.bind(created.value)
        return success(this.describe(created.value))
      }
      if (command.operation === 'cancelCandidate') {
        const c = this.candidates.get(command.repositoryId)
        this.candidates.delete(command.repositoryId)
        if (c) await this.dispose(c.entry)
        return success(true)
      }
      if (command.operation === 'stage') {
        const e = this.entries.get(command.repositoryId)
        if (!e && !command.root) return failure('SESSION_CLOSED')
        if (e && (e.pending || e.unknown.size)) return failure('OUTCOME_UNKNOWN')
        const metadata = decodeMetadataSet(command.metadataSet)
        if (!metadata.ok) return metadata
        const base = e?.root ?? command.root!
        if (
          base.repositoryId !== command.repositoryId ||
          !decodeWorkspace({ version: 1, roots: [base] }).ok
        )
          return failure('INVALID_INPUT')
        const root = {
          ...base,
          metadataSets: [
            ...base.metadataSets.filter((s) => s.id !== metadata.value.id),
            metadata.value,
          ],
          activeMetadataSet: metadata.value.id,
        }
        const candidate = await this.create(
          root,
          (e?.scope.generation ?? this.generations.get(command.repositoryId) ?? 0) + 1,
          (e?.scope.modelGeneration ?? 0) + 1,
        )
        if (!candidate.ok) return candidate
        const oldTypes = e?.adapter.model.analysis().objectTypes ?? new Map(),
          newTypes = candidate.value.adapter.model.analysis().objectTypes
        if ([...oldTypes.keys()].some((id) => !newTypes.has(id))) {
          await this.dispose(candidate.value)
          return failure('SCHEMA_INCOMPATIBLE')
        }
        if (e && 'inspect' in e.adapter && 'inspect' in candidate.value.adapter) {
          const old = (e.adapter as SbereaSession).inspect().metadata.types,
            next = (candidate.value.adapter as SbereaSession).inspect().metadata.types
          if (
            old.some((t) => {
              const n = next.find((n) => n.externalId === t.externalId)
              return (
                !n || n.typeId !== t.typeId || referenceMapping(n.rule) !== referenceMapping(t.rule)
              )
            })
          ) {
            await this.dispose(candidate.value)
            return failure('SCHEMA_INCOMPATIBLE')
          }
        }
        if (this.entries.get(command.repositoryId) !== e) {
          await this.dispose(candidate.value)
          return failure('CANCELLED')
        }
        const old = this.candidates.get(command.repositoryId)
        if (old) await this.dispose(old.entry)
        const id = randomUUID()
        this.candidates.set(command.repositoryId, {
          id,
          entry: candidate.value,
          generation: e?.scope.generation ?? this.generations.get(command.repositoryId) ?? 0,
          fingerprint: candidate.value.adapter.model.fingerprint,
        })
        const presentation = await this.presentation(candidate.value)
        return success({
          candidateId: id,
          ...(e ? { previousFingerprint: e.adapter.model.fingerprint } : {}),
          changedTypes: [...newTypes.keys()].filter(
            (id) => JSON.stringify(newTypes.get(id)) !== JSON.stringify(oldTypes.get(id)),
          ),
          fingerprint: candidate.value.adapter.model.fingerprint,
          types: [...newTypes.keys()],
          diagnostics: presentation.diagnostics,
        })
      }
      if (command.operation === 'activate') {
        const e = this.entries.get(command.repositoryId),
          c = this.candidates.get(command.repositoryId)
        if (
          !c ||
          c.id !== command.candidateId ||
          c.generation !== (e?.scope.generation ?? this.generations.get(command.repositoryId) ?? 0)
        )
          return failure('REVISION_CONFLICT')
        if (e && (e.pending || e.unknown.size)) return failure('OUTCOME_UNKNOWN')
        const reloaded = await c.entry.core.reload()
        if (!reloaded.ok) return reloaded
        if (c.entry.adapter.model.fingerprint !== c.fingerprint) return failure('BINDING_MISMATCH')
        if (c.entry.core.state !== 'READY' && c.entry.core.state !== 'READ_ONLY')
          return failure('METAMODEL_INVALID')
        this.entries.set(command.repositoryId, c.entry)
        this.generations.set(command.repositoryId, c.entry.scope.generation)
        this.candidates.delete(command.repositoryId)
        this.bind(c.entry)
        if (e) await this.dispose(e)
        return success(this.describe(c.entry))
      }
      if (command.operation !== 'request') return failure('INVALID_INPUT')
      const decoded = decodeScopedRequest(command.value)
      if (!decoded.ok) return decoded
      const { scope, request } = decoded.value,
        e = this.entries.get(scope.repositoryId)
      if (!e || scope.sessionId !== e.scope.sessionId || scope.generation !== e.scope.generation)
        return failure('SESSION_CLOSED')
      if (scope.modelGeneration !== e.scope.modelGeneration) return failure('BINDING_MISMATCH')
      const ref = request.payload.ref
      if (record(ref) && ref.repositoryId !== scope.repositoryId)
        return failure('REPOSITORY_MISMATCH')
      const change = request.payload.changeSet
      if (record(change) && change.repositoryId !== scope.repositoryId)
        return failure('REPOSITORY_MISMATCH')
      const cancellation = new CancellationSource()
      this.requests.set(requestId, { repositoryId: scope.repositoryId, cancel: cancellation })
      const mutation =
          request.operation === 'applyChanges' ||
          (request.operation === 'diagram' &&
            !['list', 'read'].includes(String(request.payload.action))),
        op = record(change) ? String(change.idempotencyKey) : undefined
      if (mutation && op) this.requests.get(requestId)!.operationId = op
      if (mutation) {
        if (e.root.readOnly) {
          this.requests.delete(requestId)
          return failure('REPOSITORY_READ_ONLY')
        }
        if (this.candidates.has(scope.repositoryId)) {
          this.requests.delete(requestId)
          return failure('BINDING_MISMATCH')
        }
        e.pending++
      }
      try {
        const result =
          request.operation === 'diagram'
            ? await (e.diagrams ??= new DiagramFiles(e.physical, !!e.root.readOnly)).execute(
                request.payload,
              )
            : request.operation === 'integrationFlows'
              ? await (e.flows ??= new IntegrationFlowService(
                  e.core,
                  (await this.presentation(e)).types.flatMap((t) =>
                    t.integrationFlow ? [t.integrationFlow] : [],
                  ),
                )).search(
                  renameIdentity(
                    request.payload.query,
                    scope.repositoryId,
                    e.adapter.profile.repositoryId,
                  ),
                  cancellation,
                )
              : request.operation === 'presentation'
                ? success(await this.presentation(e))
                : await new RepositoryApi(e.core).handle(
                    renameIdentity(request, scope.repositoryId, e.adapter.profile.repositoryId),
                    cancellation,
                  )
        if (
          mutation &&
          op &&
          !result.ok &&
          ['OUTCOME_UNKNOWN', 'RECOVERY_REQUIRED'].includes(result.error.code)
        )
          e.unknown.add(op)
        if (
          request.operation === 'reconcile' &&
          result.ok &&
          record(result.value) &&
          ['committed', 'not-committed'].includes(String(result.value.status))
        )
          e.unknown.delete(String(request.payload.operationId))
        if (this.entries.get(scope.repositoryId) !== e)
          return failure(mutation ? 'OUTCOME_UNKNOWN' : 'SESSION_CLOSED', [], op)
        if (scope.modelGeneration !== e.scope.modelGeneration && !mutation)
          return failure('BINDING_MISMATCH')
        return renameIdentity(
          result,
          e.adapter.profile.repositoryId,
          scope.repositoryId,
        ) as Result<unknown>
      } finally {
        this.requests.delete(requestId)
        if (mutation) e.pending--
      }
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
  private async presentation(e: Entry): Promise<RepositoryPresentation> {
    if ('inspect' in e.adapter) {
      const report = (e.adapter as SbereaSession).inspect(),
        snapshot = await e.adapter.snapshot()
      if (!snapshot.ok) throw Error(snapshot.error.code)
      return {
        types: report.metadata.types.map((t) => ({
          id: t.typeId,
          externalId: t.externalId,
          source: t.source,
          label: t.label,
          section: t.section,
          description: t.description,
          nameFields: t.nameFields,
          idPatterns: t.idPatterns,
          ...(t.integrationFlow
            ? {
                integrationFlow: {
                  ...t.integrationFlow,
                  typeId: t.typeId,
                  idPatterns: t.idPatterns,
                },
              }
            : {}),
          rule: t.rule,
          fields: t.fields,
        })),
        sources: report.locators.map((l) => ({
          objectId: l.objectId,
          entry: l.entry,
          writable: l.writable && !e.root.readOnly,
        })),
        diagnostics: report.diagnostics,
        sections: report.accounting.sections,
        revision: snapshot.value.revision,
      }
    }
    const types: TypePresentation[] = [...e.adapter.model.analysis().objectTypes.values()].map(
      (t) => {
        const rule: Constraint = {
          type: 'object',
          properties: Object.fromEntries(
            t.attributes.map((a) => [
              a.id,
              {
                ...nativeRule(a.schema),
                title: a.ui?.label ?? a.id,
                description: a.ui?.description ?? '',
              },
            ]),
          ),
          required: t.attributes.filter((a) => a.required).map((a) => a.id),
        }
        return {
          id: t.id,
          externalId: t.id,
          label: t.ui?.label ?? t.id,
          section: 'Объекты',
          description: t.ui?.description ?? '',
          nameFields: [],
          ...(t.integrationFlow ? { integrationFlow: { ...t.integrationFlow, typeId: t.id } } : {}),
          rule,
          fields: constraintFields(rule),
        }
      },
    )
    const page = await e.core.queryObjects({ limit: 1 })
    return {
      types,
      sources: [],
      diagnostics: [],
      sections: [],
      revision: page.ok ? page.value.revision : '',
    }
  }
}
