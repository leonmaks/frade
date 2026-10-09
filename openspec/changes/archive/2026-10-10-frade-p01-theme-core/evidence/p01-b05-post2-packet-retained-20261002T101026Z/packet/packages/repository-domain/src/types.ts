import type { JsonValue, ObjectReference, RelationReference } from '@frade/metamodel-domain'
import type { RepositoryModelBinding } from '@frade/metamodel-compiler'
export type { JsonValue, RepositoryModelBinding }
export type { ModelAnalysis } from '@frade/metamodel-domain'
export type ObjectRef = ObjectReference
export type RelationRef = RelationReference
export type RepositoryId = string
export type EntityId = string
export type TypeId = string
export type Revision = string & { readonly __revision: unique symbol }
export type EntityKind = 'object' | 'relation'
export interface RepositoryObject {
  readonly ref: ObjectRef
  readonly typeId: TypeId
  readonly name: string
  readonly attributes: Readonly<Record<string, JsonValue>>
  readonly revision: Revision
}
export interface RepositoryRelation {
  readonly ref: RelationRef
  readonly typeId: TypeId
  readonly source: ObjectRef
  readonly target: ObjectRef
  readonly attributes: Readonly<Record<string, JsonValue>>
  readonly revision: Revision
}
export type Entity = RepositoryObject | RepositoryRelation
export interface ResourceProvenance {
  readonly kind: EntityKind
  readonly ref: ObjectRef | RelationRef
  readonly locator: string
  readonly label?: string
}
export interface RepositorySnapshot {
  readonly repositoryId: RepositoryId
  readonly revision: Revision
  readonly complete: boolean
  readonly binding: RepositoryModelBinding
  readonly objects: readonly RepositoryObject[]
  readonly relations: readonly RepositoryRelation[]
}
export type ErrorCode =
  | 'INVALID_PATH'
  | 'INVALID_DIAGRAM'
  | 'ALREADY_EXISTS'
  | 'LIMIT_EXCEEDED'
  | 'PROFILE_INVALID'
  | 'METAMODEL_INVALID'
  | 'REPOSITORY_UNAVAILABLE'
  | 'REPOSITORY_READ_ONLY'
  | 'ENTITY_NOT_FOUND'
  | 'REFERENCE_UNRESOLVED'
  | 'MALFORMED_REFERENCE'
  | 'VALIDATION_FAILED'
  | 'ACCESS_DENIED'
  | 'REVISION_CONFLICT'
  | 'UNSUPPORTED_CAPABILITY'
  | 'WRITE_FAILED'
  | 'PARTIAL_FAILURE'
  | 'RECOVERY_REQUIRED'
  | 'INDEX_OUT_OF_SYNC'
  | 'SCHEMA_INCOMPATIBLE'
  | 'INVALID_INPUT'
  | 'RESOURCE_LIMIT'
  | 'CANCELLED'
  | 'SESSION_CLOSED'
  | 'INVALID_CURSOR'
  | 'STALE_CURSOR'
  | 'ADAPTER_CONTRACT'
  | 'OUTCOME_UNKNOWN'
  | 'OPERATION_ID_CONFLICT'
  | 'BINDING_MISMATCH'
  | 'INCOMPLETE_SNAPSHOT'
  | 'REPOSITORY_MISMATCH'
export interface Issue {
  readonly code: string
  readonly message: string
  readonly path: readonly (string | number)[]
  readonly ref?: ObjectRef | RelationRef
  readonly details?: Readonly<Record<string, JsonValue>>
}
export interface ApplicationError {
  readonly code: ErrorCode
  readonly message: string
  readonly retriable: boolean
  readonly issues: readonly Issue[]
  readonly operationId?: string
}
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApplicationError }
export interface ValidationResult {
  readonly errors: readonly Issue[]
  readonly warnings: readonly Issue[]
}
export const success = <T>(value: T): Result<T> => ({ ok: true, value })
export const failure = (
  code: ErrorCode,
  issues: readonly Issue[] = [],
  operationId?: string,
): Result<never> => ({
  ok: false,
  error: {
    code,
    message: code,
    retriable: ['REPOSITORY_UNAVAILABLE', 'INDEX_OUT_OF_SYNC'].includes(code),
    issues,
    ...(operationId === undefined ? {} : { operationId }),
  },
})
export function entityKey(kind: EntityKind, ref: ObjectRef | RelationRef): string {
  return JSON.stringify([kind, ref.repositoryId, 'objectId' in ref ? ref.objectId : ref.relationId])
}
