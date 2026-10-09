import { canonicalJson } from './codec'
import { failure, success, type Issue, type JsonValue, type Result } from './types'
/** Value/rule evidence is part of identity. Error code and path alone are insufficient. */
export function checkDiagnosticRepair(
  baseline: readonly Issue[],
  prospective: readonly Issue[],
  mode: 'strict' | 'repair',
): Result<true> {
  if (mode === 'strict')
    return prospective.length ? failure('VALIDATION_FAILED', prospective) : success(true)
  const key = (issue: Issue) =>
    canonicalJson({
      code: issue.code,
      path: issue.path,
      ref: issue.ref ?? null,
      details: issue.details ?? {},
    } as unknown as JsonValue)
  const counts = new Map<string, number>()
  for (const issue of baseline) {
    const k = key(issue)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const added: Issue[] = []
  for (const issue of prospective) {
    const k = key(issue),
      n = counts.get(k) ?? 0
    if (n) counts.set(k, n - 1)
    else added.push(issue)
  }
  return added.length ? failure('VALIDATION_FAILED', added) : success(true)
}
