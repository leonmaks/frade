import {
  validateAttributes,
  relationEligibility,
  isSubtype,
  objectKey,
  type TypeRule,
} from '@frade/metamodel-domain'
import {
  failure,
  success,
  type Entity,
  type EntityKind,
  type ModelAnalysis,
  type ObjectRef,
  type Result,
} from './types'
import type { RepositoryPolicy } from './policies'
/** Scratch facts may be disk-backed. They are derived from one pinned authoritative view. */
export interface StreamingFacts {
  entities(kind: EntityKind): Iterable<Entity>
  targets: Pick<ReadonlyMap<string, string>, 'get'>
  resetFacts(): void
  addEdge(type: string, source: string, target: string, directed: boolean, unique: boolean): boolean
  degrees(
    type: string,
  ): Iterable<{ ref: ObjectRef; typeId: string; source: number; target: number; incident: number }>
  checkpoint(): Promise<void>
  hasCycle(type: string, cancelled: () => boolean): Promise<Result<boolean>>
}
export async function validateStreaming(
  analysis: ModelAnalysis,
  facts: StreamingFacts,
  cancelled: () => boolean = () => false,
  policy?: RepositoryPolicy,
): Promise<Result<true>> {
  const bad = (entity: Entity, code: string, path: readonly (string | number)[] = []) =>
    failure('VALIDATION_FAILED', [{ code, message: code, ref: entity.ref, path }])
  let visited = 0
  facts.resetFacts()
  for (const kind of ['object', 'relation'] as const)
    for (const entity of facts.entities(kind)) {
      if ((++visited & 1023) === 0) {
        await facts.checkpoint()
        if (cancelled()) return failure('CANCELLED')
      }
      const type = (kind === 'object' ? analysis.objectTypes : analysis.relationTypes).get(
        entity.typeId,
      )
      if (!type) return bad(entity, 'UNKNOWN_TYPE', ['typeId'])
      if ('abstract' in type && type.abstract) return bad(entity, 'ABSTRACT_TYPE', ['typeId'])
      const attrs = validateAttributes(type.attributes, entity.attributes, {
        analysis,
        targets: facts.targets,
      })
      if (!attrs.ok)
        return failure(
          'VALIDATION_FAILED',
          attrs.diagnostics.slice(0, 100).map((d) => ({
            code: d.code,
            message: d.message,
            path: ['attributes', ...d.path],
            ref: entity.ref,
          })),
        )
      if (kind === 'relation' && 'source' in entity) {
        const r = analysis.relationTypes.get(entity.typeId)!,
          s = objectKey(entity.source),
          t = objectKey(entity.target),
          source = facts.targets.get(s),
          target = facts.targets.get(t)
        if (!source || !target) return bad(entity, 'MISSING_ENDPOINT')
        if (s === t && !r.allowSelfReference) return bad(entity, 'SELF_REFERENCE')
        const eligible = relationEligibility(analysis, r.id, source, target)
        if (!eligible.ok || !eligible.value.eligible) return bad(entity, 'FORBIDDEN_PAIR')
        if (!facts.addEdge(r.id, s, t, r.direction !== 'undirected', r.duplicates !== 'allow'))
          return bad(entity, 'DUPLICATE_RELATION')
      }
    }
  const matches = (rule: TypeRule, id: string) =>
    rule.typeIds.some((target) =>
      rule.includeSubtypes ? isSubtype(analysis, id, target) : id === target,
    )
  for (const r of analysis.relationTypes.values())
    for (const row of facts.degrees(r.id)) {
      if ((++visited & 1023) === 0) {
        await facts.checkpoint()
        if (cancelled()) return failure('CANCELLED')
      }
      const cases =
        r.direction === 'undirected'
          ? [
              [
                matches(r.source, row.typeId) || matches(r.target, row.typeId),
                row.incident,
                r.sourceCardinality,
                'incident',
              ] as const,
            ]
          : [
              [matches(r.source, row.typeId), row.source, r.sourceCardinality, 'source'] as const,
              [matches(r.target, row.typeId), row.target, r.targetCardinality, 'target'] as const,
            ]
      for (const [applies, count, bounds, direction] of cases)
        if (
          applies &&
          (count < (bounds?.min ?? 0) ||
            (bounds?.max !== null && bounds?.max !== undefined && count > bounds.max))
        )
          return failure('VALIDATION_FAILED', [
            {
              code: 'CARDINALITY',
              message: 'Relation count outside declared bounds',
              ref: row.ref,
              path: ['relations', r.id, direction],
            },
          ])
    }
  for (const [type, rule] of Object.entries(policy?.relationTypes ?? {}))
    if (rule.acyclic) {
      const cyclic = await facts.hasCycle(type, cancelled)
      if (!cyclic.ok) return cyclic
      if (cyclic.value)
        return failure('VALIDATION_FAILED', [
          {
            code: 'RELATION_CYCLE',
            message: 'Relation type forbids cycles',
            path: ['relationTypes', type],
          },
        ])
    }
  return cancelled() ? failure('CANCELLED') : success(true)
}
