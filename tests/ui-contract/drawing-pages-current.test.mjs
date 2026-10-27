import test from 'node:test'
import assert from 'node:assert/strict'
import {
  reportCases,
  validateExecution,
  verifyInputBytes,
  currentInputFiles,
  safeBytes,
} from './drawing-pages-current.mjs'
import { publicationByteForms } from './drawing-pages-adoption.mjs'
import { mkdtemp, mkdir, readFile, writeFile, realpath, stat, unlink, rm, rename, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { generateDrawioEditor } from '../../scripts/ui/drawio-editor-style.mjs'

test('current safe reads observe changed bytes and reject a newly linked Unicode ancestor', async () => {
  const parent = await realpath(tmpdir())
  const directory = await realpath(await mkdtemp(join(parent, 'frade-current-safe-')))
  try {
    const folder = join(directory, 'nested space Ω'), retained = join(directory, 'retained')
    await mkdir(folder)
    const file = 'nested space Ω/source.txt'
    await writeFile(join(directory, file), 'before')
    assert.equal(safeBytes(directory, file).toString(), 'before')
    await writeFile(join(directory, file), 'after')
    assert.equal(safeBytes(directory, file).toString(), 'after')
    assert.throws(() => safeBytes(directory, '../outside'), /CURRENT_UNSAFE_PATH/)
    await rename(folder, retained)
    await symlink(retained, folder, process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => safeBytes(directory, file), /CURRENT_UNSAFE_LINK/)
  } finally {
    if (await realpath(directory) !== directory || dirname(directory) !== parent || !directory.startsWith(join(parent, 'frade-current-safe-')))
      throw Error('Unverified safe-read fixture cleanup')
    await rm(directory, {recursive:true, force:true})
  }
})

const checkoutRule = 'packages/ui-workspace/tokens/.gitattributes'
const generatedInventory = 'packages/ui-workspace/tokens/drawio-editor-source.json'
const checkoutRoot = fileURLToPath(new URL('../../', import.meta.url))
test('current source closure binds the exact generated inventory checkout rule', () => {
  assert.ok(currentInputFiles(checkoutRoot).includes(checkoutRule))
})
for (const autocrlf of ['true', 'false']) {
  test(
    'generated inventory checkout preserves exact LF with core.autocrlf=' + autocrlf,
    async () => {
      const attributes = await readFile(join(checkoutRoot, checkoutRule))
      assert.equal(
        attributes.toString().replaceAll('\r\n', '\n'),
        'drawio-editor-source.json text eol=lf\n',
      )
      const { output } = await generateDrawioEditor()
      const expected = Buffer.from(output[generatedInventory])
      const parent = await realpath(tmpdir())
      const directory = await realpath(await mkdtemp(join(parent, 'frade-draw-pages-checkout-')))
      const identity = await stat(directory, { bigint: true })
      const environment = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
      )
      environment.GIT_CONFIG_NOSYSTEM = '1'
      environment.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null'
      const git = (args) => {
        const result = spawnSync(
          'git',
          [
            '-C',
            directory,
            '-c',
            'core.fsmonitor=false',
            '-c',
            'core.attributesfile=' + environment.GIT_CONFIG_GLOBAL,
            ...args,
          ],
          { env: environment, encoding: 'utf8' },
        )
        if (result.error) throw result.error
        assert.equal(result.status, 0, result.stderr)
        return result.stdout
      }
      try {
        await mkdir(dirname(join(directory, checkoutRule)), { recursive: true })
        await writeFile(join(directory, checkoutRule), attributes)
        await writeFile(join(directory, generatedInventory), expected)
        git(['init', '--quiet'])
        git(['config', 'core.autocrlf', autocrlf])
        git(['add', '--', checkoutRule, generatedInventory])
        await unlink(join(directory, generatedInventory))
        git(['checkout-index', '--all', '--force'])
        assert.deepEqual(await readFile(join(directory, generatedInventory)), expected)
        assert.match(git(['check-attr', 'eol', '--', generatedInventory]), /: eol: lf\r?\n$/)
        assert.match(
          git(['check-attr', 'eol', '--', 'packages/ui-workspace/tokens/unrelated.json']),
          /: eol: unspecified\r?\n$/,
        )
      } finally {
        const current = await stat(directory, { bigint: true })
        if (
          (await realpath(directory)) !== directory ||
          dirname(directory) !== parent ||
          !directory.includes('frade-draw-pages-checkout-') ||
          current.dev !== identity.dev ||
          current.ino !== identity.ino
        )
          throw Error('UNVERIFIED_CHECKOUT_FIXTURE_CLEANUP')
        await rm(directory, { recursive: true, force: true })
      }
    },
  )
}
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
