import { describe, it, expect } from 'vitest'
import {
  classifyFlowDirection,
  isFlowEligibleForBundle,
  setBundleMembers,
  reverseIntegrationFlow,
  cloneIntegrationFlow,
  validateBundleMembers,
} from '../src/integration-flows'
import type { RepositoryObject, ObjectRef, Revision } from '../src/types'
const ref = (id: string, repo = 'r'): ObjectRef => ({ repositoryId: repo, objectId: id })
const A = ref('A'),
  B = ref('B'),
  C = ref('C'),
  D = ref('D')
const capability = {
  typeId: 'example:Flow',
  source: 'producer',
  consumer: 'receiver',
  search: ['description', 'technology'],
  columns: [{ field: 'description', label: 'Описание' }],
  nonCloneable: ['audit', 'generated'],
  editable: ['producer', 'receiver', 'description', 'technology', 'custom'],
  idPatterns: ['^F[0-9]+$'],
}
const flow = (id = 'F1', source = A, consumer = B): RepositoryObject => ({
  ref: ref(id),
  typeId: capability.typeId,
  name: id,
  revision: 'v1' as Revision,
  attributes: {
    producer: source as any,
    receiver: consumer as any,
    description: 'Business payload',
    technology: ['HTTP'],
    custom: { a: 1 },
    audit: 'private',
    generated: 'technical',
  },
})
describe('canonical integration flow invariants', () => {
  it.each([
    [A, B, true, 'A_TO_B'],
    [B, A, true, 'B_TO_A'],
    [A, C, false, 'OTHER'],
    [C, B, false, 'OTHER'],
    [C, D, false, 'OTHER'],
    [A, A, false, 'OTHER'],
    [ref('A', 'other'), B, false, 'OTHER'],
  ])('exact unordered endpoints %j %j', (source, consumer, eligible, direction) => {
    const f = flow('F1', source as ObjectRef, consumer as ObjectRef)
    expect(isFlowEligibleForBundle(f, capability, A, B)).toBe(eligible)
    expect(classifyFlowDirection(f, capability, A, B)).toBe(direction)
  })
  it('does not expand parents or confuse repositories', () => {
    expect(isFlowEligibleForBundle(flow('F1', A, ref('B.child')), capability, A, B)).toBe(false)
  })
  it('canonical membership preserves refs and deduplicates idempotently', () => {
    const f = ref('F1')
    expect(setBundleMembers([f, f, ref('F1', 'other')])).toEqual([f, ref('F1', 'other')])
    expect(setBundleMembers([f], ref('F2'), false)).toEqual([f])
    expect(setBundleMembers([f], f, false)).toEqual([])
    expect(setBundleMembers([], f, true)).toEqual([f])
    expect(setBundleMembers([f], f, true)).toEqual([f])
    expect(setBundleMembers(JSON.parse(JSON.stringify([f])))).toEqual([f])
  })
  it('reverse preserves identity revision and all other attributes without mutation', () => {
    const f = flow(),
      rev = reverseIntegrationFlow(f, capability)
    expect(rev.ref).toEqual(f.ref)
    expect(rev.revision).toBe(f.revision)
    expect(rev.attributes).toEqual({ ...f.attributes, producer: B, receiver: A })
    expect(f.attributes.producer).toEqual(A)
  })
  it('clone strips identity/version/audit/generated and configured fields', () => {
    const f = flow(),
      draft = cloneIntegrationFlow(f, capability, ref('F9'))
    expect(draft.ref).toEqual(ref('F9'))
    expect(draft).not.toHaveProperty('revision')
    expect(draft.attributes).toEqual({
      producer: A,
      receiver: B,
      description: 'Business payload',
      technology: ['HTTP'],
      custom: { a: 1 },
    })
    expect(
      cloneIntegrationFlow(flow('F5', C, D), capability, ref('F8'), [A, B]).attributes.producer,
    ).toEqual(A)
    expect(() => cloneIntegrationFlow(f, capability, f.ref)).toThrow()
  })
  it('validates mixed missing/incompatible/wrong-type refs without discarding them', () => {
    const f = flow(),
      g = flow('F2', A, C),
      wrong = { ...flow('F3'), typeId: 'Other' }
    expect(
      validateBundleMembers(
        [f.ref, g.ref, ref('missing'), wrong.ref],
        new Map([f, g, wrong].map((o) => [JSON.stringify(o.ref), o])),
        capability,
        A,
        B,
      ),
    ).toEqual([
      { ref: f.ref, state: 'valid' },
      { ref: g.ref, state: 'incompatible' },
      { ref: ref('missing'), state: 'missing' },
      { ref: wrong.ref, state: 'incompatible' },
    ])
  })
})
