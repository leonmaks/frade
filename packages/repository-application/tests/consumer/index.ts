import type { RepositorySession } from '../../src/index'
/** Public documentation example, compiled against ES2022 without Node/DOM. */
export async function renameObject(
  session: RepositorySession,
  objectId: string,
  name: string,
  operationId: string,
) {
  const current = await session.getObject({ repositoryId: session.repositoryId, objectId })
  if (!current.ok) return current
  const { revision, ...body } = current.value
  return session.applyChanges({
    repositoryId: session.repositoryId,
    idempotencyKey: operationId,
    commands: [{ op: 'updateObject', object: { ...body, name }, expectedRevision: revision }],
  })
}
