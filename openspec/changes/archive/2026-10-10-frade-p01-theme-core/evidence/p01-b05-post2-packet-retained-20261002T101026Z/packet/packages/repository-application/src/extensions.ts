import {
  copyJson,
  isReference,
  decodeSnapshot,
  entityKey,
  nonblank,
  failure,
  success,
  type ObjectRef,
  type RelationRef,
  type EntityKind,
  type Result,
  type RepositoryObject,
  type RepositoryRelation,
} from '@frade/repository-domain'
import type {
  RequestContext,
  FederationPort,
  RepositoryCommand,
  ChangeResult,
} from '@frade/repository-ports'
import type { RepositorySession } from './session'
export class RepositoryFederation implements FederationPort {
  private readonly repositories = new Map<string, RepositorySession>()
  register(repositoryId: string, session: RepositorySession): Result<true> {
    if (
      !nonblank(repositoryId) ||
      repositoryId !== session.repositoryId ||
      this.repositories.has(repositoryId)
    )
      return failure('INVALID_INPUT')
    this.repositories.set(repositoryId, session)
    return success(true)
  }
  unregister(repositoryId: string) {
    this.repositories.delete(repositoryId)
  }
  private async resolve(
    kind: EntityKind,
    input: unknown,
    context: RequestContext,
  ): Promise<Result<RepositoryObject | RepositoryRelation>> {
    const safe = copyJson(input)
    if (!safe.ok || !isReference(safe.value, kind)) return failure('MALFORMED_REFERENCE')
    if (
      !context.permissions.includes('read') ||
      !context.repositoryIds.includes(safe.value.repositoryId)
    )
      return failure('ACCESS_DENIED')
    const session = this.repositories.get(safe.value.repositoryId)
    if (!session || session.state === 'CLOSED' || session.state === 'ERROR')
      return failure('REPOSITORY_UNAVAILABLE')
    return kind === 'object' ? session.getObject(safe.value) : session.getRelation(safe.value)
  }
  resolveObject(ref: ObjectRef, context: RequestContext) {
    return this.resolve('object', ref, context) as Promise<Result<RepositoryObject>>
  }
  resolveRelation(ref: RelationRef, context: RequestContext) {
    return this.resolve('relation', ref, context) as Promise<Result<RepositoryRelation>>
  }
}
/** Explicit bounded merge import. Does not delete omitted entities or split an atomic batch. */
export async function importSnapshot(
  session: RepositorySession,
  input: unknown,
  options: { expectedRevision: string; idempotencyKey: string },
): Promise<Result<ChangeResult>> {
  if (!nonblank(options.expectedRevision) || !nonblank(options.idempotencyKey))
    return failure('INVALID_INPUT')
  const decoded = decodeSnapshot(input)
  if (!decoded.ok) return decoded
  if (decoded.value.repositoryId !== session.repositoryId) return failure('REPOSITORY_MISMATCH')
  const current = await session.exportSnapshot()
  if (!current.ok) return current
  if (current.value.revision !== options.expectedRevision) return failure('REVISION_CONFLICT')
  if (JSON.stringify(current.value.binding) !== JSON.stringify(decoded.value.binding))
    return failure('BINDING_MISMATCH')
  const commands: RepositoryCommand[] = []
  for (const object of decoded.value.objects) {
    const previous = current.value.objects.find(
      (o) => entityKey('object', o.ref) === entityKey('object', object.ref),
    )
    const { ref, typeId, name, attributes } = object,
      body = { ref, typeId, name, attributes }
    commands.push(
      previous
        ? { op: 'updateObject', object: body, expectedRevision: previous.revision }
        : { op: 'createObject', object: body },
    )
  }
  for (const relation of decoded.value.relations) {
    const previous = current.value.relations.find(
      (r) => entityKey('relation', r.ref) === entityKey('relation', relation.ref),
    )
    const { ref, typeId, source, target, attributes } = relation,
      body = { ref, typeId, source, target, attributes }
    commands.push(
      previous
        ? { op: 'updateRelation', relation: body, expectedRevision: previous.revision }
        : { op: 'createRelation', relation: body },
    )
  }
  if (!commands.length)
    return success({
      operationId: options.idempotencyKey,
      revision: current.value.revision,
      changes: [],
      warnings: [],
    })
  return session.applyChanges({
    repositoryId: session.repositoryId,
    commands,
    expectedRevision: options.expectedRevision,
    idempotencyKey: options.idempotencyKey,
    requireAtomic: true,
  })
}
