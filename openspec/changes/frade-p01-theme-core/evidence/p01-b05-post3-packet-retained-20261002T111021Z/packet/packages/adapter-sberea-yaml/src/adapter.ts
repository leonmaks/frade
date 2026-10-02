import { watch, type FSWatcher } from 'node:fs'
import { join, dirname } from 'node:path'
import { createWriter, exists } from './writer'
import { randomUUID } from 'node:crypto'
import {
  failure,
  success,
  queryEntities,
  entityKey,
  type Entity,
  type ErrorCode,
  type Result,
  type Issue,
} from '@frade/repository-domain'
import type {
  RepositoryAdapterSession,
  RepositoryCapabilities,
  RepositoryProfile,
  RepositoryEvent,
} from '@frade/repository-ports'
import { loadRepository, type SbereaOptions, type LoadedRepository } from './read'
import { SourceError } from './files'
import { modelDiagnostics } from './model'
export function sourceFailure(error: unknown): Result<never> {
  return failure(error instanceof SourceError ? error.code : 'REPOSITORY_UNAVAILABLE', [
    {
      code: error instanceof SourceError ? error.code : 'LOAD_FAILED',
      message: error instanceof Error ? error.message : String(error),
      path: [],
    },
  ])
}
export interface SbereaSession extends RepositoryAdapterSession {
  inspect(): {
    metadata: LoadedRepository['metadata']
    accounting: LoadedRepository['accounting']
    locators: readonly import('./read').Locator[]
    diagnostics: readonly Issue[]
  }
}
export function createSbereaYamlAdapter(options: SbereaOptions): {
  open(): Promise<Result<SbereaSession>>
} {
  return {
    async open() {
      try {
        let loaded = await loadRepository(options),
          closed = false
        if (await exists(join(loaded.root, '.frade-sberea-recovery.json')))
          return failure('RECOVERY_REQUIRED')
        const scope = randomUUID(),
          listeners = new Set<(event: RepositoryEvent) => void>(),
          watchers = new Map<string, FSWatcher>()
        let sequence = 0,
          epoch = 0,
          timer: ReturnType<typeof setTimeout> | undefined
        let loadIssues: readonly Issue[] = []
        let reloadTail: Promise<Result<boolean>> = Promise.resolve(success(false))
        const emit = (
          type: RepositoryEvent['type'],
          ref?: RepositoryEvent['ref'],
          state?: RepositoryEvent['state'],
        ) => {
          if (closed) return
          const event: RepositoryEvent = {
            eventId: randomUUID(),
            repositoryId: options.repositoryId,
            sequence: ++sequence,
            type,
            revision: loaded.snapshot.revision,
            ...(ref ? { ref } : {}),
            ...(state ? { state } : {}),
          }
          for (const listener of listeners)
            try {
              listener(event)
            } catch {
              /* Observers cannot undo publication. */
            }
        }
        const profile: RepositoryProfile = {
          schemaVersion: 1,
          repositoryId: options.repositoryId,
          displayName: options.label ?? 'KA',
          adapterKind: 'sberea',
          connection: {},
          metamodel: {
            path: options.metadataSet.schemaEntries[0],
            version: loaded.model.modelVersion,
          },
          mapping: { sourceFile: options.entry ?? 'root.yaml', format: 'yaml' },
          policyRef: 'repair',
          accessMode: options.readOnly ? 'read-only' : 'read-write',
          indexing: { enabled: true },
          versioning: { provider: 'none' },
        }
        const capabilities: RepositoryCapabilities = {
          canRead: true,
          canWrite: !options.readOnly,
          supportsBatch: false,
          supportsAtomicBatch: false,
          supportsWatch: true,
          supportsHistory: false,
          supportsTransactions: false,
          supportsCrossRepositoryReferences: false,
          supportsServerSideQueries: true,
          supportedQueryOperators: ['eq', 'ne', 'in', 'exists'],
          supportedMetamodelFeatures: [
            'sberea-yaml-repository',
            'constraints',
            'derived-relations',
          ],
          guardedSnapshot: !options.readOnly,
          reconciliation: options.readOnly ? 'none' : 'session',
          preservation: 'structure',
          writerCoordination: options.readOnly ? 'none' : 'cooperating-processes',
        }
        const available = (cancelled = false): ErrorCode | undefined =>
          closed ? 'SESSION_CLOSED' : cancelled ? 'CANCELLED' : undefined
        const session: SbereaSession = {
          profile,
          capabilities,
          get model() {
            return loaded.model
          },
          inspect: () => ({
            metadata: structuredClone(loaded.metadata),
            accounting: structuredClone(loaded.accounting),
            locators: [...loaded.locators.values()],
            diagnostics: [...modelDiagnostics(loaded.snapshot, loaded.metadata), ...loadIssues],
          }),
          async read(kind, ref, token) {
            const error = available(token?.isCancellationRequested)
            if (error) return failure(error)
            if (ref.repositoryId !== options.repositoryId) return failure('REPOSITORY_MISMATCH')
            const values: readonly Entity[] =
              kind === 'object' ? loaded.snapshot.objects : loaded.snapshot.relations
            const entity = values.find((e) => entityKey(kind, e.ref) === entityKey(kind, ref))
            return entity ? success(structuredClone(entity)) : failure('ENTITY_NOT_FOUND')
          },
          async query(kind, query, token) {
            const error = available(token?.isCancellationRequested)
            if (error) return failure(error)
            return queryEntities<Entity>(
              kind === 'object' ? loaded.snapshot.objects : loaded.snapshot.relations,
              query,
              scope + ':' + kind,
              loaded.snapshot.revision,
            )
          },
          async snapshot(token) {
            const error = available(token?.isCancellationRequested)
            return error ? failure(error) : success(structuredClone(loaded.snapshot))
          },
          reload() {
            const run = async (): Promise<Result<boolean>> => {
              if (closed) return failure('SESSION_CLOSED')
              const started = epoch
              try {
                const next = await loadRepository(options)
                if (closed) return failure('SESSION_CLOSED')
                if (started !== epoch) {
                  schedule()
                  return success(false)
                }
                const changed = next.snapshot.revision !== loaded.snapshot.revision
                const modelChanged = next.model.fingerprint !== loaded.model.fingerprint
                const recovered = loadIssues.length > 0
                syncWatchers(next)
                loaded = next
                epoch++
                loadIssues = []
                if (changed || recovered)
                  emit(
                    modelChanged ? 'metamodel.changed' : 'repository.reloaded',
                    undefined,
                    options.readOnly ? 'READ_ONLY' : 'READY',
                  )
                return success(changed || recovered)
              } catch (error) {
                if (closed) return failure('SESSION_CLOSED')
                if (started !== epoch) {
                  schedule()
                  return success(false)
                }
                const result = sourceFailure(error)
                if (!result.ok) loadIssues = result.error.issues
                emit('repository.reloaded', undefined, 'DEGRADED')
                return result
              }
            }
            reloadTail = reloadTail.then(run, run)
            return reloadTail
          },
          subscribe(listener) {
            if (closed) return () => {}
            listeners.add(listener)
            return () => {
              listeners.delete(listener)
            }
          },
          async close() {
            closed = true
            if (timer) clearTimeout(timer)
            watchers.forEach((w) => w.close())
            watchers.clear()
            listeners.clear()
            await reloadTail
          },
        }
        if (!options.readOnly)
          Object.assign(session, {
            writer: createWriter(
              options,
              () => loaded,
              (next) => {
                loaded = next
                epoch++
              },
              (result) => {
                for (const change of result.changes)
                  emit((change.kind + '.' + change.action) as RepositoryEvent['type'], change.ref)
              },
            ),
          })
        const schedule = () => {
          if (closed) return
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            void session.reload?.()
          }, 150)
        }
        const syncWatchers = (next: LoadedRepository) => {
          // Watch directories: atomic replacement detaches file watchers from the new inode.
          const desired = new Set([
            next.root,
            next.metadataRoot,
            ...[...next.files.keys()].map((file) => dirname(join(next.root, file))),
            ...[...next.metadata.inputs, ...next.metadata.documents.map((d) => d.entry)].map(
              (file) => dirname(join(next.metadataRoot, file)),
            ),
          ])
          const added = new Map<string, FSWatcher>()
          try {
            for (const directory of desired)
              if (!watchers.has(directory)) {
                const watcher = watch(directory, (_event, name) => {
                  // Writer bookkeeping must not trigger an endless recovery/reload loop.
                  if (name?.toString().startsWith('.frade-')) return
                  schedule()
                })
                watcher.on('error', () => schedule())
                added.set(directory, watcher)
              }
          } catch (error) {
            added.forEach((w) => w.close())
            throw error
          }
          for (const [directory, watcher] of watchers)
            if (!desired.has(directory)) {
              watcher.close()
              watchers.delete(directory)
            }
          for (const [directory, watcher] of added) watchers.set(directory, watcher)
        }
        syncWatchers(loaded)
        return success(session)
      } catch (error) {
        return sourceFailure(error)
      }
    },
  }
}
