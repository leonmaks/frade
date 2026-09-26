import type {
  Diagnostic,
  ModelAnalysis,
  Path,
  ProspectiveSnapshot,
  Result,
  ValidationObject,
  ValidationRelation,
} from './types'
import { cardinality, DefinitionReader } from './definitions'
import { clone, compare, diagnostic, inspectJson, record, result } from './diagnostics'
import { matches, objectKey } from './matching'
import { validateAttributes } from './attributes'
export function relationEligibility(
  analysis: ModelAnalysis,
  relationId: string,
  source: string,
  target: string,
): Result<{ eligible: boolean; scope: 'types-only' }> {
  const r = analysis.relationTypes.get(relationId)
  if (!r || !analysis.objectTypes.has(source) || !analysis.objectTypes.has(target))
    return result({ eligible: false, scope: 'types-only' }, [
      diagnostic('UNKNOWN_TYPE', [], 'Unknown relation or endpoint type', relationId),
    ])
  const forward = matches(analysis, r.source, source) && matches(analysis, r.target, target)
  const reverse =
    r.direction === 'undirected' &&
    matches(analysis, r.source, target) &&
    matches(analysis, r.target, source)
  return result({ eligible: forward || reverse, scope: 'types-only' }, [])
}
function shape(input: unknown): Diagnostic[] {
  const safety = inspectJson(input)
  if (safety.length) return safety
  const reader = new DefinitionReader()
  const reference = (v: unknown, p: Path, relation = false) => {
    const key = relation ? 'relationId' : 'objectId'
    if (!reader.object(v, p, ['repositoryId', key])) return
    for (const k of ['repositoryId', key])
      if (typeof v[k] !== 'string' || !(v[k] as string).trim())
        reader.add([...p, k], 'Expected nonempty identity')
  }
  if (reader.object(input, [], ['objects', 'relations'])) {
    reader.array(input.objects, ['objects'], (v, p) => {
      if (!reader.object(v, p, ['ref', 'typeId', 'attributes'])) return
      reference(v.ref, [...p, 'ref'])
      reader.id(v.typeId, [...p, 'typeId'])
      if (!record(v.attributes)) reader.add([...p, 'attributes'], 'Expected attribute map')
    })
    reader.array(input.relations, ['relations'], (v, p) => {
      if (!reader.object(v, p, ['ref', 'typeId', 'source', 'target', 'attributes'])) return
      reference(v.ref, [...p, 'ref'], true)
      reference(v.source, [...p, 'source'])
      reference(v.target, [...p, 'target'])
      reader.id(v.typeId, [...p, 'typeId'])
      if (!record(v.attributes)) reader.add([...p, 'attributes'], 'Expected attribute map')
    })
  }
  return reader.diagnostics
}
const relationKey = (r: ValidationRelation) =>
  JSON.stringify([r.ref.repositoryId, r.ref.relationId])
/** The caller must supply the complete prospective state. This function does not authorize or commit writes. */
export function validateSnapshot(
  analysis: ModelAnalysis,
  input: ProspectiveSnapshot,
): Result<ProspectiveSnapshot> {
  const structural = shape(input)
  if (structural.length) return result(input, structural)
  const errors: Diagnostic[] = []
  const add = (entity: string, path: Path, code: Diagnostic['code'], message: string) =>
    errors.push(diagnostic(code, path, message, entity))
  const objects = new Map<string, ValidationObject>(),
    targets = new Map<string, string>()
  for (const obj of [...input.objects].sort((a, b) =>
    compare(objectKey(a.ref), objectKey(b.ref)),
  )) {
    const id = objectKey(obj.ref)
    if (objects.has(id)) add(id, ['ref'], 'DUPLICATE_ID', 'Duplicate object identity')
    else {
      objects.set(id, obj)
      targets.set(id, obj.typeId)
    }
  }
  const context = { analysis, targets }
  for (const [id, obj] of objects) {
    const type = analysis.objectTypes.get(obj.typeId)
    if (!type) {
      add(id, ['typeId'], 'UNKNOWN_TYPE', 'Unknown object type')
      continue
    }
    if (type.abstract) add(id, ['typeId'], 'ABSTRACT_TYPE', 'Abstract type cannot be instantiated')
    for (const d of validateAttributes(type.attributes, obj.attributes, context).diagnostics)
      errors.push({ ...d, path: ['attributes', ...d.path], entityId: id })
  }
  const seen = new Set<string>(),
    pairs = new Set<string>()
  const counts = new Map<
    string,
    Map<string, { source: number; target: number; incident: number }>
  >()
  const count = (type: string, object: string) => {
    if (!counts.has(type)) counts.set(type, new Map())
    const map = counts.get(type)!
    if (!map.has(object)) map.set(object, { source: 0, target: 0, incident: 0 })
    return map.get(object)!
  }
  for (const edge of [...input.relations].sort((a, b) => compare(relationKey(a), relationKey(b)))) {
    const id = relationKey(edge),
      before = errors.length
    if (seen.has(id)) {
      add(id, ['ref'], 'DUPLICATE_ID', 'Duplicate relation identity')
      continue
    }
    seen.add(id)
    const r = analysis.relationTypes.get(edge.typeId)
    if (!r) {
      add(id, ['typeId'], 'UNKNOWN_TYPE', 'Unknown relation type')
      continue
    }
    const s = objectKey(edge.source),
      t = objectKey(edge.target),
      source = objects.get(s),
      target = objects.get(t)
    if (!source) add(id, ['source'], 'MISSING_ENDPOINT', 'Missing source')
    if (!target) add(id, ['target'], 'MISSING_ENDPOINT', 'Missing target')
    if (s === t && !r.allowSelfReference)
      add(id, ['target'], 'SELF_REFERENCE', 'Self-reference is forbidden')
    if (source && target) {
      const eligible = relationEligibility(analysis, r.id, source.typeId, target.typeId)
      if (!eligible.ok || !eligible.value.eligible)
        add(id, [], 'FORBIDDEN_PAIR', 'Endpoint types are not permitted')
    }
    for (const d of validateAttributes(r.attributes, edge.attributes, context).diagnostics)
      errors.push({ ...d, path: ['attributes', ...d.path], entityId: id })
    const ends = r.direction === 'undirected' ? [s, t].sort(compare) : [s, t]
    const pair = JSON.stringify([r.id, ...ends])
    if (r.duplicates !== 'allow' && pairs.has(pair))
      add(id, [], 'DUPLICATE_RELATION', 'Repeated relation type and pair')
    // Invalid edges neither reserve a pair nor satisfy a lower cardinality bound.
    if (errors.length !== before) continue
    pairs.add(pair)
    count(r.id, s).source++
    count(r.id, t).target++
    count(r.id, s).incident++
    if (t !== s) count(r.id, t).incident++
  }
  for (const r of analysis.relationTypes.values())
    for (const [id, obj] of objects) {
      // Do not allocate a relation-type × object matrix for zero-degree objects.
      const c = counts.get(r.id)?.get(id) ?? { source: 0, target: 0, incident: 0 }
      const check = (amount: number, which: 'source' | 'target' | 'incident') => {
        const bounds = cardinality(which === 'target' ? r.targetCardinality : r.sourceCardinality)
        if (amount < bounds.min || (bounds.max !== null && amount > bounds.max))
          add(
            id,
            ['relations', r.id, which],
            'CARDINALITY',
            'Relation count outside declared bounds',
          )
      }
      if (r.direction === 'undirected') {
        if (matches(analysis, r.source, obj.typeId) || matches(analysis, r.target, obj.typeId))
          check(c.incident, 'incident')
      } else {
        if (matches(analysis, r.source, obj.typeId)) check(c.source, 'source')
        if (matches(analysis, r.target, obj.typeId)) check(c.target, 'target')
      }
    }
  return result(clone(input), errors)
}
