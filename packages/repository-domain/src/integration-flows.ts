import { copyJson } from './codec'
const clone = <T>(v: T): T => {
  const r = copyJson(v)
  if (!r.ok) throw Error('Invalid data')
  return r.value as T
}
import { entityKey, type ObjectRef, type RepositoryObject, type JsonValue } from './types'
export interface IntegrationFlowCapability {
  readonly typeId: string
  readonly status?: string
  readonly source: string
  readonly consumer: string
  readonly search: readonly string[]
  readonly columns: readonly { readonly field: string; readonly label: string }[]
  readonly nonCloneable: readonly string[]
  readonly editable?: readonly string[]
  readonly idPatterns?: readonly string[]
}
export type FlowDirection = 'A_TO_B' | 'B_TO_A' | 'OTHER'
export const flowRefKey = (ref: ObjectRef) => entityKey('object', ref)
export const sameObjectRef = (a: unknown, b: ObjectRef) =>
  !!a &&
  typeof a === 'object' &&
  'repositoryId' in a &&
  'objectId' in a &&
  a.repositoryId === b.repositoryId &&
  a.objectId === b.objectId
export const flowPairKey = (a: ObjectRef, b: ObjectRef) =>
  JSON.stringify([flowRefKey(a), flowRefKey(b)].sort())
export function classifyFlowDirection(
  flow: RepositoryObject,
  c: IntegrationFlowCapability,
  a: ObjectRef,
  b: ObjectRef,
): FlowDirection {
  if (flow.typeId !== c.typeId) return 'OTHER'
  const source = flow.attributes[c.source],
    consumer = flow.attributes[c.consumer]
  if (sameObjectRef(source, a) && sameObjectRef(consumer, b)) return 'A_TO_B'
  if (sameObjectRef(source, b) && sameObjectRef(consumer, a)) return 'B_TO_A'
  return 'OTHER'
}
export const isFlowEligibleForBundle = (
  flow: RepositoryObject,
  c: IntegrationFlowCapability,
  a: ObjectRef,
  b: ObjectRef,
) => classifyFlowDirection(flow, c, a, b) !== 'OTHER'
export function setBundleMembers(
  members: readonly ObjectRef[],
  ref?: ObjectRef,
  include = true,
): ObjectRef[] {
  const unique = new Map(members.map((r) => [flowRefKey(r), { ...r }]))
  if (ref) {
    if (include) unique.set(flowRefKey(ref), { ...ref })
    else unique.delete(flowRefKey(ref))
  }
  return [...unique.values()]
}
export function reverseIntegrationFlow(
  flow: RepositoryObject,
  c: IntegrationFlowCapability,
): RepositoryObject {
  return {
    ...clone(flow),
    attributes: {
      ...clone(flow.attributes),
      [c.source]: clone(flow.attributes[c.consumer]),
      [c.consumer]: clone(flow.attributes[c.source]),
    },
  }
}
export function cloneIntegrationFlow(
  flow: RepositoryObject,
  c: IntegrationFlowCapability,
  ref: ObjectRef,
  endpoints?: readonly [ObjectRef, ObjectRef],
): Omit<RepositoryObject, 'revision'> {
  if (sameObjectRef(flow.ref, ref)) throw Error('Clone must have new identity')
  const ignored = new Set([
    'id',
    'objectId',
    'revision',
    'version',
    'etag',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    ...c.nonCloneable,
  ])
  const attributes = Object.fromEntries(
    Object.entries(flow.attributes)
      .filter(([k]) => !ignored.has(k))
      .map(([k, v]) => [k, clone(v)]),
  )
  if (endpoints) {
    attributes[c.source] = endpoints[0] as unknown as JsonValue
    attributes[c.consumer] = endpoints[1] as unknown as JsonValue
  }
  return { ref: { ...ref }, typeId: flow.typeId, name: flow.name, attributes }
}
export function validateBundleMembers(
  members: readonly ObjectRef[],
  objects: Pick<ReadonlyMap<string, RepositoryObject>, 'get'>,
  c: IntegrationFlowCapability,
  a: ObjectRef,
  b: ObjectRef,
) {
  return members.map((ref) => {
    const flow = objects.get(JSON.stringify(ref)) ?? objects.get(flowRefKey(ref))
    return {
      ref,
      state: !flow ? 'missing' : isFlowEligibleForBundle(flow, c, a, b) ? 'valid' : 'incompatible',
    } as { ref: ObjectRef; state: 'missing' | 'valid' | 'incompatible' }
  })
}

export interface FlowQuery {
  endpointA: ObjectRef
  endpointB: ObjectRef
  scope?: 'PAIR' | 'ALL'
  text?: string
  filters?: Record<string, string>
  direction?: 'ANY' | 'A_TO_B' | 'B_TO_A'
  membership?: 'ALL' | 'INCLUDED' | 'EXCLUDED'
  members?: ObjectRef[]
  offset?: number
  limit?: number
  sort?: string
  descending?: boolean
}
export interface FlowRow {
  flow: RepositoryObject
  eligible: boolean
  direction: 'A_TO_B' | 'B_TO_A' | 'OTHER'
  values: Record<string, string>
}
export interface FlowPage {
  items: FlowRow[]
  total: number
  totalEligible: number
  offset: number
  members: {
    ref: ObjectRef
    state: 'valid' | 'incompatible' | 'missing'
    flow?: RepositoryObject
  }[]
  capabilities: IntegrationFlowCapability[]
}
