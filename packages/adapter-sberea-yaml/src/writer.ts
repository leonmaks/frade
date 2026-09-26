import { open, rename, unlink, lstat, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { patchSource } from './preserve'
import {
  canonicalJson,
  checkDiagnosticRepair,
  copyJson,
  entityKey,
  failure,
  record,
  success,
  type JsonValue,
  type Result,
  decodeSnapshot,
} from '@frade/repository-domain'
import type {
  RepositoryWriter,
  CommitRequest,
  ChangeResult,
  OperationOutcome,
} from '@frade/repository-ports'
import { hash, textFile, contained, parseFile, SourceError, fail } from './files'
import {
  loadRepository,
  repositoryRevision,
  type SbereaOptions,
  type LoadedRepository,
} from './read'
import { sourceAttributes } from './model'
const JOURNAL = '.frade-sberea-recovery.json',
  LOCK = '.frade-sberea-write.lock'
interface Journal {
  version: 1
  operationId: string
  signature: string
  entry: string
  staged: string
  before: string
  after: string
  revisionAfter: string
  request: CommitRequest
}
const activeLocks = new Set<string>()
export async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw e
  }
}
async function durable(path: string, text: string) {
  const handle = await open(path, 'wx')
  try {
    await handle.writeFile(text)
    await handle.sync()
  } finally {
    await handle.close()
  }
}
function writerFailure(e: unknown, operationId: string, staged: boolean): Result<never> {
  return failure(
    staged ? 'RECOVERY_REQUIRED' : e instanceof SourceError ? e.code : 'WRITE_FAILED',
    [
      {
        code: e instanceof SourceError ? e.code : 'WRITE_FAILED',
        message: e instanceof Error ? e.message : String(e),
        path: [],
      },
    ],
    operationId,
  )
}
export function createWriter(
  options: SbereaOptions,
  get: () => LoadedRepository,
  set: (value: LoadedRepository) => void,
  changed: (result: ChangeResult) => void,
): RepositoryWriter {
  const outcomes = new Map<string, { signature: string; outcome: OperationOutcome }>()
  let busy = false
  return {
    async lookup(id) {
      const previous = outcomes.get(id)
      if (previous && previous.outcome.status !== 'unknown')
        return success(structuredClone(previous.outcome))
      if (await exists(join(get().root, JOURNAL))) {
        try {
          const journal = await readJournal(get().root)
          if (journal.operationId !== id) return success({ status: 'unknown' })
          const latest = await loadRepository(options)
          if (latest.snapshot.revision === journal.revisionAfter) {
            const result = committedResult(journal.request, latest)
            outcomes.set(id, {
              signature: journal.signature,
              outcome: { status: 'committed', result },
            })
            set(latest)
            return success({ status: 'committed', result })
          }
          if (latest.snapshot.revision === journal.request.expectedRevision)
            return success({ status: 'not-committed' })
        } catch {
          return success({ status: 'unknown' })
        }
      }
      return success({ status: 'unknown' })
    },
    async commit(request, token) {
      const signature = hash(canonicalJson(request as unknown as JsonValue)),
        previous = outcomes.get(request.operationId)
      if (previous)
        return previous.signature === signature
          ? previous.outcome.status === 'committed'
            ? success(previous.outcome.result)
            : failure('OUTCOME_UNKNOWN', [], request.operationId)
          : failure('OPERATION_ID_CONFLICT')
      if (busy) return failure('REVISION_CONFLICT')
      if (token?.isCancellationRequested) return failure('CANCELLED')
      busy = true
      const root = get().root,
        lockPath = join(root, LOCK),
        journalPath = join(root, JOURNAL)
      let lock: Awaited<ReturnType<typeof open>> | undefined,
        staged = false,
        stagePath: string | undefined
      outcomes.set(request.operationId, { signature, outcome: { status: 'pending' } })
      try {
        const safe = copyJson(request),
          decoded = decodeSnapshot(request.candidate)
        if (
          !safe.ok ||
          !decoded.ok ||
          request.candidate.repositoryId !== options.repositoryId ||
          request.candidate.revision !== request.expectedRevision ||
          !request.candidate.complete
        )
          fail('INVALID_INPUT', 'Invalid commit request')
        if (options.readOnly) fail('REPOSITORY_READ_ONLY', 'Read-only repository')
        if (await exists(journalPath))
          fail('RECOVERY_REQUIRED', 'An interrupted write needs recovery')
        try {
          lock = await open(lockPath, 'wx')
        } catch {
          fail('RECOVERY_REQUIRED', 'Another writer or interrupted write owns this repository')
        }
        activeLocks.add(root)
        await lock.writeFile(
          JSON.stringify({
            pid: process.pid,
            nonce: randomUUID(),
            operationId: request.operationId,
          }),
        )
        await lock.sync()
        const latest = await loadRepository(options)
        if (latest.snapshot.revision !== request.expectedRevision)
          fail('REVISION_CONFLICT', 'Repository changed')
        if (latest.model.fingerprint !== request.candidate.binding.fingerprint)
          fail('BINDING_MISMATCH', 'Metadata changed')
        const candidate = request.candidate,
          validation = latest.model.sourceValidation!
        // Re-project independently from submitted objects. A caller cannot inject derived edges.
        const projected = validation.project(
          { ...candidate, relations: latest.snapshot.relations },
          latest.snapshot,
        )
        if (!projected.ok) return projected
        if (
          canonicalJson(projected.value as unknown as JsonValue) !==
          canonicalJson(candidate as unknown as JsonValue)
        )
          fail('ADAPTER_CONTRACT', 'Candidate graph differs from authoritative projection')
        const valid = checkDiagnosticRepair(
          validation.diagnostics(latest.snapshot),
          validation.diagnostics(candidate),
          validation.mode,
        )
        if (!valid.ok) return valid
        const changedObjects = candidate.objects.filter((o) => {
          const old = latest.snapshot.objects.find((v) => v.ref.objectId === o.ref.objectId)
          return (
            canonicalJson(o as unknown as JsonValue) !==
            (old ? canonicalJson(old as unknown as JsonValue) : 'missing')
          )
        })
        const locations = new Map(
          changedObjects.map((o) => {
            const old = latest.locators.get(o.ref.objectId)
            if (old) return [o.ref.objectId, old] as const
            const type = latest.metadata.types.find((t) => t.typeId === o.typeId)
            if (!type?.integrationFlow)
              fail('UNSUPPORTED_CAPABILITY', 'Only configured flows may be created')
            const entry =
              [...latest.files]
                .filter(
                  ([, file]) => Object.hasOwn(file.value, type.externalId) && file.preservable,
                )
                .map(([entry]) => entry)
                .sort()[0] ??
              options.entry ??
              'root.yaml'
            return [
              o.ref.objectId,
              { entry, externalType: type.externalId, objectId: o.ref.objectId, writable: true },
            ] as const
          }),
        )
        const entries = new Set(changedObjects.map((o) => locations.get(o.ref.objectId)?.entry))
        if (entries.size !== 1 || entries.has(undefined))
          fail(
            'UNSUPPORTED_CAPABILITY',
            'Only one authorized source file can be committed atomically',
          )
        const entry = [...entries][0]!,
          file = latest.files.get(entry)!
        if (!file.preservable)
          fail(
            'UNSUPPORTED_CAPABILITY',
            'Aliases, anchors or custom tags require a read-only source',
          )
        const expected = structuredClone(file.value)
        for (const object of changedObjects) {
          const location = locations.get(object.ref.objectId)!,
            type = latest.metadata.types.find((t) => t.typeId === object.typeId)!
          if (!Object.hasOwn(expected, location.externalType)) expected[location.externalType] = {}
          ;(expected[location.externalType] as Record<string, JsonValue>)[location.objectId] =
            sourceAttributes(object.attributes, type.rule, options.repositoryId)
        }
        const text = patchSource(file, expected)
        if (text === file.text) fail('ADAPTER_CONTRACT', 'Unexpected empty source change')
        const parsed = parseFile(entry, text)
        const sourcePath = await contained(root, entry),
          stageName = '.frade-' + randomUUID() + '.tmp'
        stagePath = join(dirname(sourcePath), stageName)
        const stageEntry = entry.split('/').slice(0, -1).concat(stageName).join('/')
        await durable(stagePath, text)
        const projectedFiles = new Map(latest.files)
        projectedFiles.set(entry, parsed)
        const journal: Journal = {
          version: 1,
          operationId: request.operationId,
          signature,
          entry,
          staged: stageEntry,
          before: file.digest,
          after: hash(text),
          revisionAfter: repositoryRevision(projectedFiles, latest.model.fingerprint),
          request,
        }
        await durable(journalPath, JSON.stringify(journal))
        staged = true
        await options.writeBarrier?.('staged')
        if (token?.isCancellationRequested) fail('CANCELLED', 'Cancelled before replacement')
        // Lock coordinates Frade writers; external writers are guarded again just before rename.
        const guarded = await loadRepository(options)
        if (guarded.snapshot.revision !== request.expectedRevision)
          fail('REVISION_CONFLICT', 'Source or metadata changed before replacement')
        await rename(stagePath, sourcePath)
        await options.writeBarrier?.('replaced')
        const loaded = await loadRepository(options)
        if (hash(await textFile(root, entry)) !== journal.after)
          fail('REVISION_CONFLICT', 'Source changed after replacement')
        const result = committedResult(request, loaded)
        set(loaded)
        outcomes.set(request.operationId, { signature, outcome: { status: 'committed', result } })
        await unlink(journalPath)
        staged = false
        changed(result)
        return success(structuredClone(result))
      } catch (error) {
        outcomes.set(request.operationId, {
          signature,
          outcome: { status: staged ? 'unknown' : 'not-committed' },
        })
        return writerFailure(error, request.operationId, staged)
      } finally {
        busy = false
        activeLocks.delete(root)
        if (outcomes.get(request.operationId)?.outcome.status === 'pending')
          outcomes.set(request.operationId, { signature, outcome: { status: 'not-committed' } })
        if (lock) {
          await lock.close()
          if (!staged) await unlink(lockPath).catch(() => {})
        }
        if (!staged && stagePath) await unlink(stagePath).catch(() => {})
      }
    },
  }
}
export interface RecoveryPreview {
  readonly operationId: string
  readonly journalHash: string
  readonly state: 'before' | 'after' | 'conflict'
  readonly sourceHash: string
  readonly entry: string
}
/** Read-only evidence. Recovery never replays a write or guesses which data should win. */
export async function inspectSbereaRecovery(root: string): Promise<RecoveryPreview> {
  const text = await textFile(root, JOURNAL, 16_000_000),
    journal = await readJournal(root)
  const current = hash(await textFile(root, journal.entry))
  return {
    operationId: journal.operationId,
    journalHash: hash(text),
    sourceHash: current,
    entry: journal.entry,
    state: current === journal.before ? 'before' : current === journal.after ? 'after' : 'conflict',
  }
}

function committedResult(request: CommitRequest, loaded: LoadedRepository): ChangeResult {
  return {
    operationId: request.operationId,
    revision: loaded.snapshot.revision,
    changes: request.changes.map((change) => {
      if (change.action === 'deleted') return change
      const entities =
        change.kind === 'object' ? loaded.snapshot.objects : loaded.snapshot.relations
      const entity = entities.find(
        (e) => entityKey(change.kind, e.ref) === entityKey(change.kind, change.ref),
      )
      if (!entity) fail('ADAPTER_CONTRACT', 'Missing committed entity')
      return { ...change, entity }
    }),
    warnings: [],
  }
}
async function readJournal(root: string): Promise<Journal> {
  const text = await textFile(root, JOURNAL, 16_000_000),
    safe = copyJson(JSON.parse(text))
  if (!safe.ok || !record(safe.value)) fail('RECOVERY_REQUIRED', 'Malformed recovery journal')
  const value = safe.value
  if (
    value.version !== 1 ||
    !['operationId', 'signature', 'entry', 'staged', 'before', 'after', 'revisionAfter'].every(
      (k) => typeof value[k] === 'string',
    ) ||
    !record(value.request) ||
    !decodeSnapshot(value.request.candidate).ok
  )
    fail('RECOVERY_REQUIRED', 'Malformed recovery journal')
  return value as unknown as Journal
}
/** Acknowledges the observed source state; preserves evidence and never rewrites architecture data. */
export async function resolveSbereaRecovery(
  root: string,
  expected: RecoveryPreview,
): Promise<void> {
  const actual = await inspectSbereaRecovery(root)
  if (
    actual.journalHash !== expected.journalHash ||
    actual.sourceHash !== expected.sourceHash ||
    actual.state === 'conflict'
  )
    fail('REVISION_CONFLICT', 'Recovery evidence changed or conflicts')
  if (activeLocks.has(root)) fail('RECOVERY_REQUIRED', 'Writer is still active')
  const lock = JSON.parse(await textFile(root, LOCK, 65536))
  if (!Number.isSafeInteger(lock.pid) || lock.pid <= 0)
    fail('RECOVERY_REQUIRED', 'Invalid writer lock')
  if (lock.pid !== process.pid) {
    try {
      process.kill(lock.pid, 0)
      fail('RECOVERY_REQUIRED', 'Writer process is still alive')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
  const journal = await readJournal(root),
    evidenceName = '.frade-sberea-evidence-' + randomUUID(),
    evidence = join(root, evidenceName)
  await mkdir(evidence)
  const directory = await contained(root, evidenceName)
  await durable(join(directory, 'journal.json'), await textFile(root, JOURNAL, 16_000_000))
  await durable(join(directory, 'writer-lock.json'), await textFile(root, LOCK, 65536))
  const recheck = await inspectSbereaRecovery(root)
  if (recheck.journalHash !== expected.journalHash || recheck.sourceHash !== expected.sourceHash)
    fail('REVISION_CONFLICT', 'Recovery evidence changed')
  if (await exists(join(root, journal.staged)))
    await rename(await contained(root, journal.staged), join(directory, 'staged.yaml'))
  await rename(await contained(root, JOURNAL), join(directory, 'resolved-journal.json'))
  await rename(await contained(root, LOCK), join(directory, 'resolved-lock.json'))
}
