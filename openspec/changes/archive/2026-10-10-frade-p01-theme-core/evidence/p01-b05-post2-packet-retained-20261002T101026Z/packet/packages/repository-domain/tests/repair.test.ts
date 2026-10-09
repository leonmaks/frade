import { expect, it } from 'vitest'
import { checkDiagnosticRepair, type Issue } from '../src'
const issue: Issue = {
  code: 'INVALID_VALUE',
  message: 'Invalid value',
  path: ['attributes', 'status'],
  ref: { repositoryId: 'R', objectId: 'A' },
  details: { value: 'old', rulePath: ['enum'], severity: 'error' },
}
it('KA-005 compares diagnostic evidence as a multiset and preserves strict mode', () => {
  expect(checkDiagnosticRepair([issue], [{ ...issue, message: 'Translated' }], 'repair').ok).toBe(
    true,
  )
  expect(checkDiagnosticRepair([issue], [], 'repair').ok).toBe(true)
  expect(checkDiagnosticRepair([issue], [issue, issue], 'repair').ok).toBe(false)
  expect(checkDiagnosticRepair([issue, issue], [issue], 'repair').ok).toBe(true)
  expect(checkDiagnosticRepair([issue], [issue], 'strict').ok).toBe(false)
  expect(checkDiagnosticRepair([issue], [], 'strict').ok).toBe(true)
})
it.each([
  { ...issue, details: { ...issue.details, value: 'other' } },
  { ...issue, details: { ...issue.details, rulePath: ['other-rule'] } },
  { ...issue, details: { ...issue.details, severity: 'fatal' } },
  { ...issue, ref: { repositoryId: 'R', objectId: 'B' } },
  { ...issue, path: ['attributes', 'other'] },
  { ...issue, code: 'OTHER' },
])('KA-005 cannot reuse previous diagnostics for changed evidence', (prospective) => {
  expect(checkDiagnosticRepair([issue], [prospective], 'repair')).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_FAILED', issues: [prospective] },
  })
})
