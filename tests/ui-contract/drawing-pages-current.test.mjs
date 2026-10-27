import test from 'node:test'
import assert from 'node:assert/strict'
import { reportCases, validateExecution, verifyInputBytes } from './drawing-pages-current.mjs'
import { publicationByteForms } from './drawing-pages-adoption.mjs'
const report = () => ({
  success: true,
  numTotalTests: 1,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  testResults: [
    {
      name: '/tests/source.test.ts',
      assertionResults: [{ fullName: 'source invariant', status: 'passed' }],
    },
  ],
})
const record = () => ({
  exitCode: 0,
  runner: 'vitest',
  sourceSetBefore: 'current',
  sourceSetAfter: 'current',
  startedAt: '2026-10-27T00:00:00Z',
  finishedAt: '2026-10-27T00:00:01Z',
})
const expected = [{ file: 'source.test.ts', title: 'source invariant' }]
test('closed current binding accepts an actual successful complete case set and exact publication forms', () => {
  assert.equal(validateExecution(record(), report(), 'current', expected).length, 1)
  const bytes = Buffer.from('one\ntwo\n'),
    entry = { file: 'source.ts', ...publicationByteForms(bytes) }
  verifyInputBytes(entry, bytes)
  verifyInputBytes(entry, Buffer.from('one\r\ntwo\r\n'))
})
test('closed current binding rejects historical inputs, source changes during execution and nonzero exits', () => {
  for (const mutation of [
    { sourceSetBefore: 'historical' },
    { sourceSetAfter: 'changed' },
    { exitCode: 1 },
  ])
    assert.throws(
      () => validateExecution({ ...record(), ...mutation }, report(), 'current', expected),
      /CURRENT_EXECUTION_INPUTS/,
    )
})
test('closed current binding rejects lost named cases even if aggregate success is retained', () => {
  assert.throws(
    () =>
      validateExecution(record(), report(), 'current', [
        ...expected,
        { file: 'source.test.ts', title: 'missing invariant' },
      ]),
    /CURRENT_NAMED_CASE_SET/,
  )
})
test('closed current binding rejects skipped, failed and fabricated empty unit reports', () => {
  for (const mutation of [
    { numPendingTests: 1 },
    { numFailedTests: 1 },
    { numTotalTests: 0 },
    { success: false },
  ])
    assert.throws(
      () => reportCases('vitest', { ...report(), ...mutation }),
      /CURRENT_VITEST_FAILURE/,
    )
  const value = report()
  value.testResults[0].assertionResults[0].status = 'pending'
  assert.throws(() => reportCases('vitest', value), /CURRENT_CASE_NOT_PASSED/)
})
test('closed current binding rejects browser retries, flaky/skip results and missing executions', () => {
  const browser = {
    errors: [],
    stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 },
    suites: [
      {
        specs: [
          {
            file: 'ui.spec.ts',
            title: 'keyboard',
            ok: true,
            tests: [
              { status: 'expected', expectedStatus: 'passed', results: [{ status: 'passed' }] },
            ],
          },
        ],
      },
    ],
  }
  assert.equal(reportCases('playwright', browser).length, 1)
  for (const key of ['skipped', 'unexpected', 'flaky'])
    assert.throws(
      () => reportCases('playwright', { ...browser, stats: { ...browser.stats, [key]: 1 } }),
      /CURRENT_PLAYWRIGHT_FAILURE/,
    )
  const retry = structuredClone(browser)
  retry.suites[0].specs[0].tests[0].results.push({ status: 'passed' })
  assert.throws(() => reportCases('playwright', retry), /CURRENT_CASE_NOT_PASSED/)
  assert.throws(
    () => reportCases('playwright', { ...browser, suites: [] }),
    /CURRENT_PLAYWRIGHT_COUNT/,
  )
})
test('closed current binding rejects unknown mixed EOL and semantic edits despite canonical resemblance', () => {
  const entry = { file: 'source.ts', ...publicationByteForms(Buffer.from('one\ntwo\n')) }
  for (const bytes of [Buffer.from('one\r\ntwo\n'), Buffer.from('one\nchanged\n')])
    assert.throws(() => verifyInputBytes(entry, bytes), /CURRENT_SOURCE_HASH/)
})
