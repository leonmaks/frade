import type { ObjectRef, RepositoryObject, Result, JsonValue } from '@frade/repository-domain'
import type { TypePresentation } from '@frade/repository-api/workbench'
import type { RepositoryRequest } from '@frade/repository-api/protocol'
export interface FlowRepository {
  types: readonly TypePresentation[]
  objects: readonly RepositoryObject[]
  readOnly: boolean
  available: boolean
  revision: string
  request(
    operation: RepositoryRequest['operation'],
    payload: Record<string, JsonValue>,
  ): Promise<Result<unknown>>
}
export interface BundleState {
  id: string
  endpointA?: ObjectRef
  endpointB?: ObjectRef
  members: ObjectRef[]
  created?: boolean
  invalidMembership?: boolean
}
export type { FlowRow, FlowPage } from '@frade/repository-domain'
