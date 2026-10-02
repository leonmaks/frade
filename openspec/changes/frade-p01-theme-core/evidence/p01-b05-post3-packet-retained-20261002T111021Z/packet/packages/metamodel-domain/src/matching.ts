import type { ModelAnalysis, ObjectReference, TypeRule } from './types'
export const objectKey = (ref: ObjectReference): string =>
  JSON.stringify([ref.repositoryId, ref.objectId])
export function isSubtype(analysis: ModelAnalysis, type: string, ancestor: string): boolean {
  return (
    analysis.objectTypes.has(type) &&
    analysis.objectTypes.has(ancestor) &&
    (type === ancestor || analysis.objectTypes.get(type)!.ancestors.includes(ancestor))
  )
}
export function matches(
  analysis: ModelAnalysis | undefined,
  rule: TypeRule,
  type: string,
): boolean {
  if (analysis && !analysis.objectTypes.has(type)) return false
  return rule.typeIds.some(
    (id) =>
      id === type ||
      (rule.includeSubtypes && analysis !== undefined && isSubtype(analysis, type, id)),
  )
}
