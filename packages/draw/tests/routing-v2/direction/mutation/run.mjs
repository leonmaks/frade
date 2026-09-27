import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { directionModuleAlias, directionResolvePlugin } from './resolve.mjs'

const root = path.resolve(fileURLToPath(new URL('../../../../../../', import.meta.url)))
const sourceRoot = path.join(root, 'packages/draw/src/routing/orthogonal/direction')
const testConfig = 'tests/routing-v2/direction/vitest.config.ts'
const relativeSourceRoot = 'packages/draw/src/routing/orthogonal/direction'
const requireFromDraw = createRequire(path.join(root, 'packages/draw/package.json'))
const ts = requireFromDraw('typescript')
const comparatorPairs = new Map([
  ['<', ['<=']],
  ['<=', ['<']],
  ['>', ['>=']],
  ['>=', ['>']],
  ['===', ['!==']],
  ['!==', ['===']],
  ['==', ['!=']],
  ['!=', ['==']],
  ['&&', ['||']],
  ['||', ['&&']],
])
const vitestTimeoutDiagnostic =
  /\b(?:Test|Hook) timed out\b|\bExceeded timeout\b/i

export function mutationScore(outcomes) {
  const counted = outcomes.filter((item) =>
    ['killed', 'survived', 'timeout'].includes(item.outcome),
  )
  if (!counted.length) throw new Error('Mutation score needs a non-empty executable denominator')
  const killed = counted.filter((item) => item.outcome === 'killed').length
  return { killed, denominator: counted.length, score: (100 * killed) / counted.length }
}

export function classifyRun(result) {
  const output = [result.stdout, result.stderr, ...failureMessages(result.testReport), ...runErrorMessages(result.runAudit)]
    .filter(Boolean)
    .join('\n')
  if (result.runAudit?.unhandledErrors?.length)
    throw new Error('Mutation harness Vitest run reported unhandled errors:\n' + JSON.stringify(result.runAudit.unhandledErrors, null, 2) + '\n' + output)
  if (/\b(?:EPERM|EACCES|Unexpected worker exit|Failed to start worker)\b|SSR directory|Unhandled Errors|Unhandled Error/i.test(output))
    throw new Error('Mutation harness infrastructure failure:\n' + output)
  if (/Failed to load config|Cannot find (?:package|module)|No test files found|Unable to resolve|Failed to load url|Failed to resolve import|Error during setup/i.test(output))
    throw new Error('Mutation harness infrastructure failure:\n' + output)
  // Inspect available fatal evidence before every outcome, including a spawn
  // timeout whose child may not have completed either reporter.
  assertKnownFailureKinds(result.runAudit, output, result.mutantSourceRoot)
  if (result.error?.code === 'ETIMEDOUT') return 'timeout'
  if (result.error)
    throw new Error('Mutation harness process failure: ' + result.error.message + '\n' + output)
  if (result.signal)
    throw new Error('Mutation harness child exited by unexpected signal ' + result.signal + '\n' + output)
  const testTimedOut = vitestTimeoutDiagnostic.test(output)
  if (testTimedOut) {
    if (result.status !== 1)
      throw new Error('Mutation harness test-timeout text accompanied an unexpected child status:\n' + output)
    assertValidRunAudit(result.runAudit, output)
    assertValidTestReport(result.testReport, output)
    const failedAssertions = result.testReport.testResults.flatMap((suite) =>
      suite.assertionResults.filter((test) => test.status === 'failed'),
    )
    if (
      result.runAudit.reason !== 'failed' ||
      (failedAssertions.length === 0 && !structuredRunErrors(result.runAudit).some((error) => vitestTimeoutDiagnostic.test(error.message)))
    )
      throw new Error('Mutation harness timeout diagnostic is not backed by a failed Vitest assertion run:\n' + output)
    return 'timeout'
  }

  assertValidRunAudit(result.runAudit, output)
  if (result.status !== 0 && result.status !== 1)
    throw new Error('Mutation harness child exited with unexpected status ' + result.status + ':\n' + output)

  const report = result.testReport
  assertValidTestReport(report, output)
  const auditTests = result.runAudit.modules.flatMap((module) => module.tests)
  if (
    auditTests.length !== report.numTotalTests ||
    auditTests.some((test) => !['passed', 'failed'].includes(test.state)) ||
    auditTests.filter((test) => test.state === 'failed').length !== report.numFailedTests ||
    auditTests.some((test) => test.state === 'passed' && test.errors.length > 0)
  )
    throw new Error('Mutation harness inconsistent/incomplete structured test results:\n' + output)
  if (result.status === 0) {
    if (
      !report.success ||
      report.numFailedTests !== 0 ||
      report.numFailedTestSuites !== 0 ||
      result.runAudit.reason !== 'passed'
    )
      throw new Error('Mutation harness inconsistent successful child report:\n' + output)
    return 'survived'
  }
  if (result.runAudit.reason !== 'failed')
    throw new Error('Mutation harness nonzero child exit is inconsistent with run completion reason:\n' + output)

  const failures = report.testResults.flatMap((suite) => suite.assertionResults.filter((test) => test.status === 'failed'))
  const missingFailureMessages = failures.some((test) => !test.failureMessages?.length)
  const missingAssertionErrors = auditTests.some((test) => test.state === 'failed' && test.errors.length === 0)
  const suiteOnlyFailure = report.testResults.some(
    (suite) => suite.status === 'failed' && !suite.assertionResults.some((test) => test.status === 'failed'),
  )
  if (
    failures.length === 0 ||
    failures.length !== report.numFailedTests ||
    missingFailureMessages ||
    missingAssertionErrors ||
    suiteOnlyFailure ||
    result.runAudit.modules.some((module) => module.errors.length > 0 || module.suites.some((suite) => suite.errors.length > 0)) ||
    report.numFailedTestSuites === 0
  )
    throw new Error('Mutation harness cannot attribute nonzero exit to failed test assertions:\n' + output)
  return 'killed'
}

function runErrorMessages(audit) {
  return [...(audit?.unhandledErrors ?? []), ...structuredRunErrors(audit)]
    .flatMap((error) => [error.type, error.name, error.message, error.stack])
}

function structuredRunErrors(audit) {
  return audit?.modules?.flatMap((module) => [
    ...(module.errors ?? []),
    ...(module.suites?.flatMap((suite) => suite.errors ?? []) ?? []),
    ...(module.tests?.flatMap((test) => test.errors ?? []) ?? []),
  ]) ?? []
}

function isKnownDomainFailure(error, mutantSourceRoot) {
  if (
    typeof mutantSourceRoot !== 'string' || !mutantSourceRoot ||
    error.name !== 'Error' || error.type !== 'Error' ||
    error.message !== 'resolveDirections: selected direction must belong to its mask'
  ) return false
  const firstFrame = error.stack?.split(/\r?\n/)[1]?.replaceAll('\\', '/')
  const origin = firstFrame?.match(/^\s+at evidence \((.*):\d+:\d+\)$/)?.[1]
  return origin === mutantSourceRoot.replaceAll('\\', '/').replace(/\/$/, '') + '/resolve.ts'
}

function isVitestTimeoutError(error) {
  if (error.type !== 'Error' || error.name !== 'Error' || typeof error.message !== 'string')
    return false
  for (const [kind, subject, setting] of [
    ['Test', 'test', 'testTimeout'],
    ['Hook', 'hook', 'hookTimeout'],
  ]) {
    const prefix = kind + ' timed out in '
    const suffix = 'ms.\nIf this is a long-running ' + subject +
      ', pass a timeout value as the last argument or configure it globally with "' + setting + '".'
    if (error.message.startsWith(prefix) && error.message.endsWith(suffix) &&
        error.message.length > prefix.length + suffix.length)
      return true
  }
  return false
}

function assertKnownFailureKinds(audit, output, mutantSourceRoot) {
  const unknownErrors = structuredRunErrors(audit).filter((error) =>
    !(error.name === 'AssertionError' && error.type === 'AssertionError') &&
    !isVitestTimeoutError(error) &&
    !isKnownDomainFailure(error, mutantSourceRoot),
  )
  if (unknownErrors.length)
    throw new Error('Mutation harness unknown structured failure; refusing kill:\n' + JSON.stringify(unknownErrors, null, 2) + '\n' + output)
}

function assertValidRunAudit(audit, output = '') {
  if (
    !audit ||
    audit.schemaVersion !== 2 ||
    !['passed', 'failed', 'interrupted'].includes(audit.reason) ||
    !Array.isArray(audit.unhandledErrors) ||
    !Array.isArray(audit.modules) ||
    audit.modules.length === 0 ||
    audit.modules.some((module) =>
      !['passed', 'failed', 'skipped', 'pending', 'queued'].includes(module.state) ||
      !Array.isArray(module.errors) ||
      !Array.isArray(module.suites) ||
      !Array.isArray(module.tests) ||
      module.suites.some((suite) => !Array.isArray(suite.errors)) ||
      module.tests.some((test) => !Array.isArray(test.errors) || typeof test.id !== 'string' || !['passed', 'failed', 'skipped', 'pending'].includes(test.state)),
    )
  )
    throw new Error('Mutation harness missing/invalid structured Vitest run audit:\n' + output)
  if (audit.reason === 'interrupted')
    throw new Error('Mutation harness Vitest run was interrupted:\n' + JSON.stringify(audit, null, 2) + '\n' + output)
  const tests = audit.modules.flatMap((module) => module.tests)
  const errors = [...audit.unhandledErrors, ...structuredRunErrors(audit)]
  if (errors.some((error) => !error || typeof error.message !== 'string' || typeof error.type !== 'string'))
    throw new Error('Mutation harness invalid structured error details:\n' + output)
  if (new Set(tests.map((test) => test.id)).size !== tests.length)
    throw new Error('Mutation harness duplicate structured test IDs:\n' + output)
}

function failureMessages(report) {
  return report?.testResults?.flatMap((suite) =>
    suite.assertionResults?.flatMap((test) => test.failureMessages ?? []),
  ) ?? []
}

function assertValidTestReport(report, output = '') {
  const validCount = (value) => Number.isInteger(value) && value >= 0
  if (
    !report ||
    !Array.isArray(report.testResults) ||
    !validCount(report.numTotalTests) ||
    !validCount(report.numFailedTests) ||
    !validCount(report.numFailedTestSuites) ||
    report.numTotalTests === 0 ||
    report.testResults.length === 0
  )
    throw new Error('Mutation harness missing/invalid Vitest JSON report; refusing classification:\n' + output)
  const tests = report.testResults.flatMap((suite) => suite.assertionResults ?? [])
  if (
    tests.length !== report.numTotalTests ||
    tests.filter((test) => test.status === 'failed').length !== report.numFailedTests ||
    report.numFailedTestSuites > report.numTotalTestSuites
  )
    throw new Error('Mutation harness inconsistent Vitest JSON counts; refusing classification:\n' + output)
}

function readTestReport(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

function readRunAudit(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

export function collectMutationCandidates(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const candidates = []
  const add = (node, start, end, replacement, category) => {
    candidates.push({
      file,
      start,
      end,
      before: source.slice(start, end),
      after: replacement,
      category,
    })
  }
  const visit = (node) => {
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.getText(ast)
      for (const alternative of comparatorPairs.get(operator) ?? []) {
        add(
          node.operatorToken,
          node.operatorToken.getStart(ast),
          node.operatorToken.end,
          alternative,
          ['&&', '||'].includes(operator) ? 'logical-operator' : 'comparison-operator',
        )
      }
    }
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
      const start = node.getStart(ast)
      add(node, start, start + 1, '', 'boolean-negation')
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Direction'
    ) {
      const opposite = { WEST: 'EAST', EAST: 'WEST', NORTH: 'SOUTH', SOUTH: 'NORTH' }[
        node.name.text
      ]
      if (opposite)
        add(node.name, node.name.getStart(ast), node.name.end, opposite, 'cardinal-opposite')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return candidates
}

function applyCandidate(original, candidate) {
  return original.slice(0, candidate.start) + candidate.after + original.slice(candidate.end)
}
function transpileDiagnostics(source, file) {
  return (
    ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).diagnostics ?? []
  )
}
function copyLowerLayerSources(repositoryRoutingRoot, isolatedRoutingRoot) {
  for (const layer of ['model', 'geometry', 'terminal', 'perimeter']) {
    const source = path.join(repositoryRoutingRoot, layer)
    const target = path.join(isolatedRoutingRoot, layer)
    fs.cpSync(source, target, { recursive: true, errorOnExist: true })
  }
}

function testCommand(
  env,
  reportFile,
  timeout = 120_000,
  testFiles = ['tests/routing-v2/direction/unit'],
) {
  const auditFile = reportFile + '.run-audit.json'
  const childEnvironment = { ...env, FRADE_VITEST_AUDIT_FILE: auditFile }
  const result = spawnSync(
    process.execPath,
    [
      requireFromDraw.resolve('vitest/vitest.mjs'),
      'run',
      '--config',
      testConfig,
      '--reporter=dot',
      '--reporter=json',
      '--reporter=' + path.join(path.dirname(fileURLToPath(import.meta.url)), 'audit-reporter.mjs'),
      '--outputFile.json=' + reportFile,
      ...testFiles,
    ],
    {
      cwd: path.join(root, 'packages/draw'),
      env: childEnvironment,
      encoding: 'utf8',
      timeout,
      windowsHide: true,
    },
  )
  return {
    ...result,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    testReport: readTestReport(reportFile),
    runAudit: readRunAudit(auditFile),
    mutantSourceRoot: env.FRADE_DIRECTION_MUTANT_ROOT ?? null,
  }
}

function childAudit(result) {
  return {
    status: result.status,
    signal: result.signal,
    error: result.error ? { code: result.error.code, message: result.error.message } : null,
    stdout: result.stdout,
    stderr: result.stderr,
    testReport: result.testReport ?? null,
    runAudit: result.runAudit ?? null,
    mutantSourceRoot: result.mutantSourceRoot ?? null,
  }
}

function saveChildAudit(directory, name, result, outcome) {
  const childPath = path.join(directory, name + '.json')
  fs.writeFileSync(childPath, JSON.stringify({ outcome, child: childAudit(result) }, null, 2) + '\n')
  return childPath
}

function assertSelfTest(condition, label) {
  if (!condition) throw new Error('Mutation harness self-test failed: ' + label)
}
function selfTest() {
  const fixture =
    'a < b; a <= b; a > b; a >= b; a == b; a === b; a != b; a !== b; ' +
    'a && b; a || b; !!enabled; Direction.WEST; Direction.NORTH; Direction.EAST; Direction.SOUTH'
  const candidates = collectMutationCandidates(fixture, 'fixture.ts')
  const inventory = new Set(
    candidates.map((candidate) => candidate.before + '->' + candidate.after),
  )
  for (const pair of [
    '<-><=',
    '<=-><',
    '>->>=',
    '>=->>',
    '==->!=',
    '===->!==',
    '!=->==',
    '!==->===',
    '&&->||',
    '||->&&',
  ])
    assertSelfTest(inventory.has(pair), 'operator inventory ' + pair)
  assertSelfTest(
    candidates.some((x) => x.category === 'boolean-negation'),
    'negation inventory',
  )
  for (const pair of ['WEST->EAST', 'NORTH->SOUTH', 'EAST->WEST', 'SOUTH->NORTH'])
    assertSelfTest(inventory.has(pair), 'cardinal inventory ' + pair)
  const transformed = applyCandidate(
    fixture,
    candidates.find((x) => x.category === 'comparison-operator'),
  )
  assertSelfTest(
    transformed !== fixture && !transpileDiagnostics(transformed, 'fixture.ts').length,
    'mutant transform compiles',
  )
  assertSelfTest(
    mutationScore([{ outcome: 'killed' }, { outcome: 'survived' }, { outcome: 'timeout' }])
      .score ===
      100 / 3,
    'score denominator',
  )
  const assertionFailureReport = {
    success: false,
    numTotalTests: 1,
    numFailedTests: 1,
    numFailedTestSuites: 1,
    testResults: [{
      status: 'failed',
      assertionResults: [{ status: 'failed', failureMessages: ['AssertionError: expected east, got west'] }],
    }],
  }
  const passingReport = {
    success: true,
    numTotalTests: 1,
    numFailedTests: 0,
    numFailedTestSuites: 0,
    testResults: [{ status: 'passed', assertionResults: [{ status: 'passed', failureMessages: [] }] }],
  }
  const passingRunAudit = {
    schemaVersion: 2,
    reason: 'passed',
    unhandledErrors: [],
    modules: [{ moduleId: 'fixture.test.ts', state: 'passed', ok: true, errors: [], suites: [], tests: [{ id: 'fixture_0', state: 'passed', errors: [] }] }],
  }
  const failingRunAudit = {
    ...passingRunAudit,
    reason: 'failed',
    modules: [{ moduleId: 'fixture.test.ts', state: 'failed', ok: false, errors: [], suites: [], tests: [{ id: 'fixture_0', state: 'failed', errors: [{ name: 'AssertionError', type: 'AssertionError', message: 'expected east, got west', stack: 'assertion stack' }] }] }],
  }
  const unhandledRunAudit = {
    ...failingRunAudit,
    unhandledErrors: [{ type: 'Unhandled Error', name: 'Error', message: 'worker crashed', stack: 'worker stack' }],
  }
  const domainRunAudit = structuredClone(failingRunAudit)
  domainRunAudit.modules[0].tests[0].errors = [{
    type: 'Error', name: 'Error', message: 'resolveDirections: selected direction must belong to its mask',
    stack: 'Error: resolveDirections: selected direction must belong to its mask\n    at evidence (E:/isolated-direction/resolve.ts:55:13)',
  }]
  assertSelfTest(
    classifyRun({ status: 1, testReport: assertionFailureReport, runAudit: domainRunAudit, mutantSourceRoot: 'E:/isolated-direction' }) === 'killed',
    'known domain invariant from the isolated resolver is a semantic kill',
  )
  for (const mutantSourceRoot of [undefined, 'E:/another-isolated-direction']) {
    let aborted = false
    try { classifyRun({ status: 1, testReport: assertionFailureReport, runAudit: domainRunAudit, mutantSourceRoot }) }
    catch (error) { aborted = /unknown structured failure/.test(error.message) }
    assertSelfTest(aborted, 'domain-looking error without the actual isolated origin aborts')
  }
  const forgedDomainRunAudit = structuredClone(domainRunAudit)
  forgedDomainRunAudit.modules[0].tests[0].errors[0].stack = 'Error: invariant\n    at worker (E:/isolated-direction/worker.ts:1:1)\n    at evidence (E:/isolated-direction/resolve.ts:55:13)'
  let forgedDomainAborted = false
  try { classifyRun({ status: 1, testReport: assertionFailureReport, runAudit: forgedDomainRunAudit, mutantSourceRoot: 'E:/isolated-direction' }) }
  catch (error) { forgedDomainAborted = /unknown structured failure/.test(error.message) }
  assertSelfTest(forgedDomainAborted, 'only the first stack frame can establish known domain origin')
  const timeoutReport = {
    ...assertionFailureReport,
    testResults: [{
      status: 'failed',
      assertionResults: [{ status: 'failed', failureMessages: ['Error: Test timed out in 5000ms'] }],
    }],
  }
  assertSelfTest(
    classifyRun({ status: 1, stdout: 'AssertionError: expected east, got west', testReport: assertionFailureReport, runAudit: failingRunAudit }) === 'killed',
    'reported assertion failure kills',
  )
  assertSelfTest(classifyRun({ status: 0, testReport: passingReport, runAudit: passingRunAudit }) === 'survived', 'reported pass survives')
  assertSelfTest(
    classifyRun({ error: { code: 'ETIMEDOUT', message: 'child timed out' }, signal: 'SIGTERM' }) === 'timeout',
    'spawn timeout is not a kill',
  )
  for (const location of ['test', 'suite', 'module', 'global']) {
    for (const diagnostic of ['', 'Test timed out in 1e-7ms.']) {
      for (const spawnTimeout of [false, true]) {
        const audit = structuredClone(failingRunAudit)
        const unknown = { type: 'TypeError', name: 'TypeError', message: 'unknown composed child failure' }
        if (location === 'test') audit.modules[0].tests[0].errors.push(unknown)
        if (location === 'suite') audit.modules[0].suites.push({ errors: [unknown] })
        if (location === 'module') audit.modules[0].errors.push(unknown)
        if (location === 'global') audit.unhandledErrors.push(unknown)
        let aborted = false
        try {
          classifyRun({
            status: 1, stderr: diagnostic, testReport: assertionFailureReport, runAudit: audit,
            ...(spawnTimeout ? { error: { code: 'ETIMEDOUT', message: 'child timed out' }, signal: 'SIGTERM' } : {}),
          })
        } catch (error) { aborted = /unknown structured failure|reported unhandled errors/.test(error.message) }
        assertSelfTest(aborted, `unknown ${location} error aborts: diagnostic=${Boolean(diagnostic)}, spawnTimeout=${spawnTimeout}`)
      }
    }
  }
  for (const runAudit of [
    { modules: [] },
    { modules: [{ errors: [], suites: [], tests: [] }] },
    failingRunAudit,
  ]) {
    assertSelfTest(
      classifyRun({ error: { code: 'ETIMEDOUT', message: 'child timed out' }, signal: 'SIGTERM', runAudit }) === 'timeout',
      'ordinary spawn timeout tolerates partial or completed known-only audit',
    )
  }
  for (const location of ['test', 'suite', 'module', 'global']) {
    const unknown = { type: 'TypeError', name: 'TypeError', message: 'unknown partial child failure' }
    const audit = location === 'global' ? { unhandledErrors: [unknown] } : {
      modules: [location === 'test' ? { tests: [{ errors: [unknown] }] }
        : location === 'suite' ? { suites: [{ errors: [unknown] }] } : { errors: [unknown] }],
    }
    let aborted = false
    try { classifyRun({ error: { code: 'ETIMEDOUT', message: 'child timed out' }, runAudit: audit }) }
    catch (error) { aborted = /unknown structured failure|reported unhandled errors/.test(error.message) }
    assertSelfTest(aborted, 'unknown available evidence aborts even in partial audit: ' + location)
  }
  for (const unknown of [
    { type: 'TypeError', name: 'TypeError', message: 'adapter failure while handling: Test timed out in 5ms.' },
    { type: 'Error', name: 'Error', message: 'adapter failure while handling: Test timed out in 5ms.' },
    { type: 'TypeError', name: 'AssertionError', message: 'adapter failure while handling: Test timed out in 5ms.' },
    { type: 'AssertionError', name: 'TypeError', message: 'adapter failure while handling: Test timed out in 5ms.' },
  ]) {
    for (const location of ['test', 'suite', 'module', 'global']) {
      for (const partial of [false, true]) {
        for (const spawnTimeout of [false, true]) {
          for (const diagnostic of ['', 'Hook timed out in 5ms.']) {
            const audit = structuredClone(failingRunAudit)
            if (location === 'test') audit.modules[0].tests[0].errors.push(unknown)
            if (location === 'suite') audit.modules[0].suites.push({ errors: [unknown] })
            if (location === 'module') audit.modules[0].errors.push(unknown)
            if (location === 'global') audit.unhandledErrors.push(unknown)
            if (partial) {
              audit.reason = undefined
              audit.modules[0].state = undefined
              audit.modules[0].tests[0].id = undefined
            }
            let aborted = false
            try {
              classifyRun({
                status: 1,
                stderr: diagnostic,
                testReport: partial ? undefined : assertionFailureReport,
                runAudit: audit,
                ...(spawnTimeout ? { error: { code: 'ETIMEDOUT', message: 'child timed out' }, signal: 'SIGTERM' } : {}),
              })
            } catch (error) { aborted = /unknown structured failure|reported unhandled errors/.test(error.message) }
            assertSelfTest(aborted, `embedded-timeout unknown ${unknown.type}/${unknown.name} at ${location}; partial=${partial}, spawn=${spawnTimeout}, diagnostic=${Boolean(diagnostic)}`)
          }
        }
      }
    }
  }
  assertSelfTest(
    classifyRun({ status: 1, stderr: ' FAIL case: Test timed out in 5000ms', testReport: timeoutReport, runAudit: failingRunAudit }) === 'timeout',
    'Vitest test timeout is not a kill',
  )
  for (const diagnostic of [
    'Hook timed out in 5ms.',
    'Test timed out in 0.5ms.',
    'Test timed out in 1e-7ms.',
    'Hook timed out in 1e+21ms.',
  ]) {
    const diagnosticReport = {
      ...assertionFailureReport,
      testResults: [{
        status: 'failed',
        assertionResults: [{ status: 'failed', failureMessages: [diagnostic] }],
      }],
    }
    assertSelfTest(
      classifyRun({
        status: 1,
        stderr: diagnostic,
        testReport: diagnosticReport,
        runAudit: failingRunAudit,
      }) === 'timeout',
      'Vitest timeout diagnostic is never a kill: ' + diagnostic,
    )
  }
  const vitestRequire = createRequire(requireFromDraw.resolve('vitest/package.json'))
  const installedRunner = path.join(path.dirname(vitestRequire.resolve('@vitest/runner/package.json')), 'dist/chunk-hooks.js')
  const installedSource = fs.readFileSync(installedRunner, 'utf8')
  const producerSource = installedSource.slice(installedSource.indexOf('function makeTimeoutError('), installedSource.indexOf('const fileContexts'))
  const makeTimeoutError = new Function(producerSource + ';return makeTimeoutError;')()
  for (const isHook of [false, true]) {
    for (const duration of [Number.MIN_VALUE, 1e-7, 0.5, 5, 1e21, Number.MAX_VALUE]) {
      const error = makeTimeoutError(isHook, duration)
      const audit = structuredClone(failingRunAudit)
      audit.modules[0].tests[0].errors = [{ type: error.name, name: error.name, message: error.message, stack: error.stack }]
      assertSelfTest(
        classifyRun({ status: 1, testReport: assertionFailureReport, runAudit: audit }) === 'timeout',
        'actual installed Vitest timeout producer, structured message only: ' + error.message.split('\n')[0],
      )
    }
  }
  for (const error of [
    { type: 'Error', name: 'Error', message: 'unknown runtime failure' },
    { type: 'TypeError', name: 'TypeError', message: 'Cannot read properties of undefined' },
    { type: 'Error', name: 'Error', message: 'AssertionError: deceptive text is not structured assertion evidence' },
  ]) {
    const audit = structuredClone(failingRunAudit)
    audit.modules[0].tests[0].errors.push(error)
    for (const diagnostic of ['', 'Test timed out in 1e-7ms.']) {
      let aborted = false
      try { classifyRun({ status: 1, stderr: diagnostic, testReport: assertionFailureReport, runAudit: audit }) }
      catch (failure) { aborted = /unknown structured failure/.test(failure.message) }
      assertSelfTest(aborted, 'unknown structured error aborts even beside assertions/timeout: ' + error.name)
    }
  }
  for (const change of [
    (audit) => { audit.schemaVersion = 1 },
    (audit) => { audit.modules[0].tests[0].errors = [] },
    (audit) => { audit.modules[0].tests[0].errors = [{ name: 'AssertionError', type: 'AssertionError' }] },
    (audit) => { audit.modules[0].errors.push({ name: 'AssertionError', type: 'AssertionError', message: 'suite-only error' }) },
    (audit) => { audit.modules[0].tests.push(structuredClone(audit.modules[0].tests[0])) },
  ]) {
    const audit = structuredClone(failingRunAudit)
    change(audit)
    let aborted = false
    try { classifyRun({ status: 1, testReport: assertionFailureReport, runAudit: audit }) }
    catch { aborted = true }
    assertSelfTest(aborted, 'missing, malformed, duplicate or non-test assertion evidence aborts')
  }
  let unsupportedTimeoutAborted = false
  try {
    classifyRun({
      status: 1,
      stderr: 'Hook timed out in 5ms.',
      testReport: passingReport,
      runAudit: passingRunAudit,
    })
  } catch {
    unsupportedTimeoutAborted = true
  }
  assertSelfTest(unsupportedTimeoutAborted, 'timeout diagnostic without failed Vitest assertions aborts')
  for (const stderr of [
    'Error: EPERM: operation not permitted, mkdir SSR directory; no tests executed',
    'Error: Unexpected worker exit',
    'Error: Failed to start worker',
  ]) {
    let aborted = false
    try {
      classifyRun({ status: 1, stderr })
    } catch (error) {
      aborted = /infrastructure failure/.test(error.message)
    }
    assertSelfTest(aborted, 'infrastructure child exit aborts: ' + stderr)
  }
  let unclassifiedFailedChildAborted = false
  try {
    classifyRun({ status: 1, stderr: 'worker exited without test report' })
  } catch {
    unclassifiedFailedChildAborted = true
  }
  assertSelfTest(unclassifiedFailedChildAborted, 'unrecognized failed child does not become a kill')
  for (const [label, child] of [
    ['unexpected process status beside assertions', { status: 42, stdout: 'assertion failure', testReport: assertionFailureReport, runAudit: failingRunAudit }],
    ['unhandled reporter error beside assertions', { status: 1, stderr: 'assertion failure', testReport: assertionFailureReport, runAudit: unhandledRunAudit }],
    ['unhandled text beside assertions', { status: 1, stderr: 'assertion failure\nUnhandled Errors\nUnhandled Error', testReport: assertionFailureReport, runAudit: failingRunAudit }],
    ['permission error has precedence over test timeout', { status: 1, stderr: 'EPERM while creating SSR directory\nTest timed out in 5000ms', testReport: assertionFailureReport, runAudit: failingRunAudit }],
  ]) {
    let aborted = false
    try {
      classifyRun(child)
    } catch {
      aborted = true
    }
    assertSelfTest(aborted, label)
  }
  let infrastructureFailed = false
  try {
    classifyRun({ status: 1, stderr: 'Cannot find package vitest' })
  } catch {
    infrastructureFailed = true
  }
  assertSelfTest(infrastructureFailed, 'infrastructure errors abort')
  for (const message of [
    'Cannot find module DirectionResolver',
    'Failed to load url direction/index.ts',
    'Failed to resolve import direction',
    'No test files found',
  ]) {
    let rejected = false
    try {
      classifyRun({ status: 1, stderr: message })
    } catch {
      rejected = true
    }
    assertSelfTest(rejected, 'infrastructure failure cannot count as killed: ' + message)
  }

  let emptyScoreRejected = false
  try {
    mutationScore([])
  } catch {
    emptyScoreRejected = true
  }
  assertSelfTest(emptyScoreRejected, 'empty score rejection')
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-r03-mutant-selftest-'))
  try {
    const reporterAuditPath = path.join(temporary, 'reporter-control.json')
    const reporterModuleUrl = new URL('./audit-reporter.mjs', import.meta.url).href
    const reporterProbe =
      `import Reporter from ${JSON.stringify(reporterModuleUrl)}; ` +
      `process.env.FRADE_VITEST_AUDIT_FILE=${JSON.stringify(reporterAuditPath)}; ` +
      `new Reporter().onTestRunEnd([{moduleId:'fixture.test.ts',state:()=> 'failed',ok:()=>false,errors:()=>[],children:{allSuites:()=>[],allTests:()=>[{id:'fixture_0',fullName:'control',result:()=>({state:'failed',errors:[{name:'AssertionError',message:'assertion detail',stack:'assertion stack'}]})}]}}], ` +
      `[{type:'Unhandled Error',name:'Error',message:'worker crashed',stack:'worker stack'}], 'failed')`
    execFileSync(process.execPath, ['--input-type=module', '-e', reporterProbe], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const reporterAudit = JSON.parse(fs.readFileSync(reporterAuditPath, 'utf8'))
    assertSelfTest(
      reporterAudit.schemaVersion === 2 &&
        reporterAudit.reason === 'failed' &&
        reporterAudit.unhandledErrors[0]?.type === 'Unhandled Error' &&
        reporterAudit.unhandledErrors[0]?.message === 'worker crashed' &&
        reporterAudit.modules[0]?.state === 'failed' &&
        reporterAudit.modules[0]?.tests[0]?.errors[0]?.name === 'AssertionError' &&
        reporterAudit.modules[0]?.tests[0]?.errors[0]?.message === 'assertion detail',
      'custom reporter preserves run reason, global errors, module state and typed test errors',
    )
    const embeddedReporterAuditPath = path.join(temporary, 'embedded-timeout-reporter-control.json')
    const embeddedMessage = 'adapter failure while handling: Test timed out in 5ms.'
    const embeddedReporterProbe =
      `import Reporter from ${JSON.stringify(reporterModuleUrl)}; ` +
      `process.env.FRADE_VITEST_AUDIT_FILE=${JSON.stringify(embeddedReporterAuditPath)}; ` +
      `const failure=new TypeError(${JSON.stringify(embeddedMessage)}); ` +
      `new Reporter().onTestRunEnd([{moduleId:'fixture.test.ts',state:()=> 'failed',ok:()=>false,errors:()=>[failure],` +
      `children:{allSuites:()=>[{id:'fixture_suite',fullName:'control',errors:()=>[failure]}],` +
      `allTests:()=>[{id:'fixture_0',fullName:'control',result:()=>({state:'failed',errors:[failure]})}]}}], [failure], 'failed')`
    execFileSync(process.execPath, ['--input-type=module', '-e', embeddedReporterProbe], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const embeddedAudit = JSON.parse(fs.readFileSync(embeddedReporterAuditPath, 'utf8'))
    const embeddedErrors = [
      embeddedAudit.unhandledErrors[0],
      embeddedAudit.modules[0]?.errors[0],
      embeddedAudit.modules[0]?.suites[0]?.errors[0],
      embeddedAudit.modules[0]?.tests[0]?.errors[0],
    ]
    assertSelfTest(
      embeddedAudit.schemaVersion === 2 && embeddedErrors.every((error) =>
        error?.type === 'TypeError' && error.name === 'TypeError' && error.message === embeddedMessage),
      'actual schema-2 reporter preserves unknown TypeError and embedded timeout text at every location',
    )
    for (const location of ['test', 'suite', 'module', 'global']) {
      const audit = structuredClone(embeddedAudit)
      audit.unhandledErrors = []
      audit.modules[0].errors = []
      audit.modules[0].suites[0].errors = []
      audit.modules[0].tests[0].errors = [{
        type: 'AssertionError', name: 'AssertionError', message: 'expected east, got west',
      }]
      if (location === 'test') audit.modules[0].tests[0].errors.push(embeddedErrors[3])
      if (location === 'suite') audit.modules[0].suites[0].errors.push(embeddedErrors[2])
      if (location === 'module') audit.modules[0].errors.push(embeddedErrors[1])
      if (location === 'global') audit.unhandledErrors.push(embeddedErrors[0])
      let aborted = false
      try {
        classifyRun({
          status: 1,
          stderr: 'Hook timed out in 5ms.',
          error: { code: 'ETIMEDOUT', message: 'child timed out' },
          signal: 'SIGTERM',
          testReport: assertionFailureReport,
          runAudit: audit,
        })
      } catch (error) { aborted = /unknown structured failure|reported unhandled errors/.test(error.message) }
      assertSelfTest(aborted, 'reporter-preserved TypeError aborts beside timeout and assertions: ' + location)
    }

    const originalRouting = path.join(temporary, 'original')
    const isolatedRouting = path.join(temporary, 'isolated')
    for (const layer of ['model', 'geometry', 'terminal', 'perimeter']) {
      fs.mkdirSync(path.join(originalRouting, layer), { recursive: true })
      fs.writeFileSync(
        path.join(originalRouting, layer, 'index.ts'),
        'export const source = true\n',
      )
    }
    copyLowerLayerSources(originalRouting, isolatedRouting)
    for (const layer of ['model', 'geometry', 'terminal', 'perimeter'])
      assertSelfTest(
        fs.readFileSync(path.join(isolatedRouting, layer, 'index.ts'), 'utf8') ===
          'export const source = true\n',
        'isolated read-only lower-layer copy ' + layer,
      )
    const sentinel = path.join(temporary, 'index.ts')
    fs.writeFileSync(sentinel, 'export const mutantSentinel = true\n')
    const redirected = directionModuleAlias(
      '../../../../src/routing/orthogonal/direction',
      temporary,
    )
    assertSelfTest(
      redirected === sentinel && fs.readFileSync(redirected, 'utf8').includes('mutantSentinel'),
      'Vitest resolve target points to the altered module tree',
    )
    const plugin = directionResolvePlugin(temporary)
    const importer = path.win32.join(
      'E:\\repo',
      'packages',
      'draw',
      'tests',
      'routing-v2',
      'direction',
      'unit',
      'case.test.ts',
    )
    assertSelfTest(
      plugin.resolveId('../../../../src/routing/orthogonal/direction', importer) === sentinel,
      'direction-local Windows imports are redirected by the configured plugin',
    )
    assertSelfTest(
      plugin.resolveId('../../../../src/routing/model', importer) === null,
      'lower-layer imports are not redirected',
    )
    assertSelfTest(
      plugin.resolveId(
        '../../../../src/routing/orthogonal/direction',
        'E:\\repo\\elsewhere\\consumer.ts',
      ) === null,
      'imports outside direction tests are not redirected',
    )

    const probe = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mutation-probe.test.ts')
    if (fs.existsSync(probe)) throw new Error('Mutation probe path already exists')
    const relativeProbe = path.posix.join(
      'tests/routing-v2/direction/mutation',
      path.basename(probe),
    )
    try {
      const sourceText =
        "import { expect, it } from 'vitest'\nimport { choose, mutantLoaded } from '../../../../src/routing/orthogonal/direction'\nit('loads the isolated mutant', () => { expect(mutantLoaded).toBe(true); expect(choose(0)).toBe('east') })\n"
      fs.writeFileSync(probe, sourceText)
      fs.writeFileSync(
        sentinel,
        "export const mutantLoaded = true\nexport const choose = (value: number) => value <= 0 ? 'west' : 'east'\n",
      )
      const environment = { ...process.env, FRADE_DIRECTION_MUTANT_ROOT: temporary }
      const killedRun = testCommand(environment, path.join(temporary, 'killed.json'), 30_000, [relativeProbe])
      assertSelfTest(
        classifyRun(killedRun) === 'killed',
        'known comparator mutant is killed by Vitest',
      )
      assertSelfTest(
        killedRun.runAudit?.schemaVersion === 2 &&
          killedRun.runAudit.reason === 'failed' &&
          killedRun.runAudit.unhandledErrors.length === 0,
        'custom reporter captures failed assertion completion without global errors',
      )

      fs.writeFileSync(probe, sourceText.replace('choose(0)', 'choose(1)'))
      const survivingRun = testCommand(environment, path.join(temporary, 'surviving.json'), 30_000, [relativeProbe])
      assertSelfTest(
        classifyRun(survivingRun) === 'survived',
        'known comparator mutant survives the control input',
      )
      assertSelfTest(
        survivingRun.runAudit?.schemaVersion === 2 &&
          survivingRun.runAudit.reason === 'passed' &&
          survivingRun.runAudit.unhandledErrors.length === 0,
        'custom reporter captures successful run completion',
      )
      assertSelfTest(
        mutationScore([{ outcome: classifyRun(killedRun) }, { outcome: classifyRun(survivingRun) }])
          .score === 50,
        'known killed/surviving Vitest mutation score',
      )
      for (const [label, source] of [
        ['test timeout', "import { it } from 'vitest'\nit('timeout', async () => { await new Promise(() => {}) }, 1e-7)\n"],
        ['hook timeout', "import { beforeEach, it } from 'vitest'\nbeforeEach(async () => { await new Promise(() => {}) }, 0.5)\nit('hook timeout', () => {})\n"],
        ['suite hook timeout', "import { beforeAll, it } from 'vitest'\nbeforeAll(async () => { await new Promise(() => {}) }, 5)\nit('suite hook timeout', () => {})\n"],
      ]) {
        fs.writeFileSync(probe, source)
        const child = testCommand(environment, path.join(temporary, label.replaceAll(' ', '-') + '.json'), 30_000, [relativeProbe])
        assertSelfTest(classifyRun(child) === 'timeout', 'actual Vitest ' + label + ' is not a kill')
        const structuredOnly = { ...child, stdout: '', stderr: '', testReport: structuredClone(child.testReport) }
        for (const suite of structuredOnly.testReport.testResults)
          for (const test of suite.assertionResults) test.failureMessages = test.status === 'failed' ? ['STACK_TRACE_ERROR'] : []
        assertSelfTest(classifyRun(structuredOnly) === 'timeout', 'typed reporter alone preserves actual Vitest ' + label)
      }
      fs.writeFileSync(probe, "import { it } from 'vitest'\nit('unknown error', () => { throw new Error('unrecognized child failure') })\n")
      const unknownRun = testCommand(environment, path.join(temporary, 'unknown.json'), 30_000, [relativeProbe])
      let unknownAborted = false
      try { classifyRun(unknownRun) }
      catch (error) { unknownAborted = /unknown structured failure/.test(error.message) }
      assertSelfTest(unknownAborted, 'actual Vitest generic runtime error aborts instead of killing')
      fs.writeFileSync(path.join(temporary, 'resolve.ts'), "export const mutantLoaded = true\nexport function evidence() { throw new Error('resolveDirections: selected direction must belong to its mask') }\nexport const choose = evidence\n")
      fs.writeFileSync(sentinel, "export { choose, mutantLoaded } from './resolve'\n")
      fs.writeFileSync(probe, sourceText)
      const domainRun = testCommand(environment, path.join(temporary, 'domain-invariant.json'), 30_000, [relativeProbe])
      assertSelfTest(classifyRun(domainRun) === 'killed', 'actual isolated domain invariant violation kills')
      let unboundDomainAborted = false
      try { classifyRun({ ...domainRun, mutantSourceRoot: null }) }
      catch (error) { unboundDomainAborted = /unknown structured failure/.test(error.message) }
      assertSelfTest(unboundDomainAborted, 'actual domain error without trusted runner origin aborts')
    assertSelfTest(
      mutationScore([{ outcome: 'killed' }, { outcome: 'timeout' }]).score === 50,
      'timeout remains in denominator but never increments kills',
    )
    } finally {
      const expectedProbe = path.resolve(probe)
      const expectedDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
      if (
        path.dirname(expectedProbe) !== expectedDirectory ||
        path.basename(expectedProbe) !== 'mutation-probe.test.ts'
      ) {
        process.exitCode = 1
        console.error('Unsafe mutation probe cleanup target:', expectedProbe)
      } else {
        fs.rmSync(expectedProbe, { force: true })
      }
    }
  } finally {
    const resolved = path.resolve(temporary)
    const safeTarget =
      path.dirname(resolved) === path.resolve(os.tmpdir()) &&
      path.basename(resolved).startsWith('frade-r03-mutant-selftest-')
    if (!safeTarget) {
      process.exitCode = 1
      console.error('Unsafe self-test cleanup target:', resolved)
    } else {
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  console.log('R03_MUTATION_HARNESS_SELF_TEST: PASS')
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest()
  if (!fs.existsSync(sourceRoot))
    throw new Error(
      'DirectionResolver source is absent; mutation execution begins after implementation',
    )
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(sourceRoot)
  const originals = new Map(
    files.map((file) => [path.relative(sourceRoot, file), fs.readFileSync(file, 'utf8')]),
  )
  const inventory = [...originals].flatMap(([file, source]) =>
    collectMutationCandidates(source, file),
  )
  if (!inventory.length) throw new Error('DirectionResolver mutation inventory is empty')
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-r03-mutants-'))
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid
  const childResultsDirectory = path.join(
    root,
    'openspec/changes/routing-v2-03-direction-resolver/evidence/mutation-child-results-' + runId,
  )
  fs.mkdirSync(childResultsDirectory, { recursive: false })
  const childResultEvidence = (file) => path.relative(root, file).replaceAll(path.sep, '/')
  const outcomes = []
  let baselineChildResultSha256
  try {
    const baseline = testCommand(process.env, path.join(temporary, 'baseline-vitest.json'))
    let baselineOutcome
    try {
      baselineOutcome = classifyRun(baseline)
    } catch (error) {
      const saved = saveChildAudit(childResultsDirectory, '000-baseline', baseline, 'aborted')
      throw new Error('Unmutated unit/reference baseline could not be classified; audit=' + childResultEvidence(saved) + '\n' + error.message)
    }
    const baselineEvidence = saveChildAudit(childResultsDirectory, '000-baseline', baseline, baselineOutcome)
    baselineChildResultSha256 = createHash('sha256').update(fs.readFileSync(baselineEvidence)).digest('hex')
    if (baselineOutcome !== 'survived')
      throw new Error('Unmutated unit/reference suite must pass before mutation testing; audit=' + childResultEvidence(baselineEvidence))

    const isolatedRoutingRoot = path.join(temporary, 'packages/draw/src/routing')
    copyLowerLayerSources(path.join(root, 'packages/draw/src/routing'), isolatedRoutingRoot)
    for (const candidate of inventory) {
      const index = outcomes.length + 1
      const evidenceName = String(index).padStart(3, '0') + '-' + candidate.file.replace(/[^a-zA-Z0-9.-]/g, '_') + '-' + candidate.start
      const diagnostics = transpileDiagnostics(
        applyCandidate(originals.get(candidate.file), candidate),
        candidate.file,
      )
      if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
        const entry = { ...candidate, outcome: 'compiler-invalid', diagnostics: diagnostics.map((d) => ({
          code: d.code,
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        })) }
        const childFile = path.join(childResultsDirectory, evidenceName + '.json')
        fs.writeFileSync(childFile, JSON.stringify({ ...entry, child: null }, null, 2) + '\n')
        outcomes.push({
          ...entry,
          childResult: childResultEvidence(childFile),
          childResultSha256: createHash('sha256').update(fs.readFileSync(childFile)).digest('hex'),
        })
        continue
      }
      const mutantRoot = path.join(temporary, relativeSourceRoot)
      fs.cpSync(sourceRoot, mutantRoot, { recursive: true })
      const original = originals.get(candidate.file)
      fs.writeFileSync(path.join(mutantRoot, candidate.file), applyCandidate(original, candidate))
      const program = ts.createProgram([path.join(mutantRoot, 'index.ts')], {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      })
      const semanticErrors = ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.category === ts.DiagnosticCategory.Error)
      let outcome
      if (semanticErrors.length) {
        outcome = 'compiler-invalid'
      } else {
        const environment = { ...process.env, FRADE_DIRECTION_MUTANT_ROOT: mutantRoot }
        const child = testCommand(environment, path.join(temporary, evidenceName + '-vitest.json'))
        try {
          outcome = classifyRun(child)
        } catch (error) {
          const childFile = saveChildAudit(childResultsDirectory, evidenceName, child, 'aborted')
          throw new Error('Mutant child classification aborted; audit=' + childResultEvidence(childFile) + '\n' + error.message)
        }
        const childFile = saveChildAudit(childResultsDirectory, evidenceName, child, outcome)
        const childHash = createHash('sha256').update(fs.readFileSync(childFile)).digest('hex')
        outcomes.push({
          ...candidate,
          outcome,
          childResult: childResultEvidence(childFile),
          childResultSha256: childHash,
        })
      }
      if (semanticErrors.length) {
        const entry = {
          ...candidate,
          outcome,
          diagnostics: semanticErrors.map((d) => ({
            code: d.code,
            message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
          })),
        }
        const childFile = path.join(childResultsDirectory, evidenceName + '.json')
        fs.writeFileSync(childFile, JSON.stringify({ ...entry, child: null }, null, 2) + '\n')
        outcomes.push({
          ...entry,
          childResult: childResultEvidence(childFile),
          childResultSha256: createHash('sha256').update(fs.readFileSync(childFile)).digest('hex'),
        })
      }
      console.error(
        'R03_MUTANT ' +
          outcomes.length +
          '/' +
          inventory.length +
          ': ' +
          candidate.file +
          ':' +
          candidate.start +
          ' ' +
          candidate.before +
          ' -> ' +
          candidate.after +
          ' ' +
          outcome,
      )
      fs.rmSync(mutantRoot, { recursive: true, force: true })
    }
  } finally {
    const resolved = path.resolve(temporary)
    const safeTarget =
      path.dirname(resolved) === path.resolve(os.tmpdir()) &&
      path.basename(resolved).startsWith('frade-r03-mutants-')
    if (!safeTarget) {
      process.exitCode = 1
      console.error('Unsafe mutation cleanup target:', resolved)
    } else {
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  const counted = mutationScore(outcomes)
  const compilerInvalid = outcomes.filter((x) => x.outcome === 'compiler-invalid').length
  const report = {
    schemaVersion: 2,
    childAuditSchemaVersion: 2,
    command: 'node packages/draw/tests/routing-v2/direction/mutation/run.mjs',
    childResultsDirectory: childResultEvidence(childResultsDirectory),
    baselineChildResult: childResultEvidence(path.join(childResultsDirectory, '000-baseline.json')),
    baselineChildResultSha256,
    inventory: inventory.length,
    categories: Object.fromEntries(
      [...new Set(inventory.map((x) => x.category))].map((category) => [
        category,
        inventory.filter((x) => x.category === category).length,
      ]),
    ),
    killed: counted.killed,
    denominator: counted.denominator,
    score: counted.score,
    survived: outcomes.filter((x) => x.outcome === 'survived').length,
    timeouts: outcomes.filter((x) => x.outcome === 'timeout').length,
    compilerInvalid,
    mutants: outcomes,
  }
  const reportFile = path.join(path.dirname(childResultsDirectory), 'mutation-results-' + runId + '.json')
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n')
  console.error('R03_MUTATION_REPORT: ' + childResultEvidence(reportFile))
  console.log(JSON.stringify(report, null, 2))
  if (counted.score < 90) process.exitCode = 1
}
main()
