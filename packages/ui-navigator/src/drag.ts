import type { ObjectRef } from '@frade/repository-domain'
export const REPOSITORY_OBJECT_MIME = 'application/x-frade-repository-object'
export interface RepositoryDragRef extends ObjectRef {
  sourceId?: string
}
export function readRepositoryDrag(raw: unknown): RepositoryDragRef | undefined {
  if (typeof raw !== 'string' || raw.length > 4096) return
  try {
    const value = JSON.parse(raw)
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((key) => !['repositoryId', 'objectId', 'sourceId'].includes(key))
    )
      return
    for (const key of ['repositoryId', 'objectId'])
      if (typeof value[key] !== 'string' || !value[key].length || value[key].length > 1024) return
    if (
      value.sourceId !== undefined &&
      (typeof value.sourceId !== 'string' || !value.sourceId.length || value.sourceId.length > 1024)
    )
      return
    return value
  } catch {
    return
  }
}
