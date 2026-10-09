import { checkConstraint, type Constraint } from '@frade/metamodel-domain'
import { canonical, freeze } from './common'
export interface ConstraintType {
  readonly id: string
  readonly rule: Constraint
}
export async function compileConstraintTypes(
  types: readonly ConstraintType[],
  sha256: (text: string) => Promise<string>,
) {
  const seen = new Set<string>()
  for (const type of types) {
    if (seen.has(type.id) || !type.id || checkConstraint(type.rule).length)
      throw Error('Invalid constraint type ' + type.id)
    seen.add(type.id)
  }
  const canonicalTypes = JSON.parse(
    canonical([...types].sort((a, b) => a.id.localeCompare(b.id))),
  ) as ConstraintType[]
  const fingerprint = await sha256(canonical(canonicalTypes))
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw Error('Invalid fingerprint')
  return freeze({ types: canonicalTypes, fingerprint })
}
