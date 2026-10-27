import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { publicationByteForms, canonicalPublicationBytes } from './drawing-pages-adoption.mjs'

export const evidenceOwner = 'openspec/changes/frade-draw-multipage/evidence/'
export const bootstrapPin = 'packages/ui-workspace/tests/ui-contract/drawing-pages-adoption-pin.ts'
export const executionRoles = [
  'draw-unit',
  'runtime-unit',
  'workspace-direct',
  'draw-visual',
  'desktop-diagrams',
  'desktop-presentation',
  'desktop-performance',
]
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (value, error) => {
  if (!value) throw Error(error)
}
export function safeBytes(root, file) {
  demand(
    typeof file === 'string' &&
      !file.includes('\\') &&
      !file.includes(':') &&
      !file.startsWith('/') &&
      file.split('/').every((p) => p && p !== '.' && p !== '..'),
    'CURRENT_UNSAFE_PATH',
  )
  let path = root
  for (const part of file.split('/')) {
    path = resolve(path, part)
    demand(!lstatSync(path).isSymbolicLink(), 'CURRENT_UNSAFE_LINK')
  }
  demand(realpathSync(path).startsWith(realpathSync(root) + sep), 'CURRENT_PATH_ESCAPE')
  return readFileSync(path)
}
/** Exact authored/runtime/test closure, excluding only the separately reviewed bootstrap pin. */
export function currentInputFiles(root) {
  const files = []
  const visit = (folder) => {
    for (const entry of readdirSync(resolve(root, folder), { withFileTypes: true })) {
      const file = folder + '/' + entry.name
      demand(!entry.isSymbolicLink(), 'CURRENT_UNSAFE_LINK')
      if (entry.isDirectory()) visit(file)
      else if (
        /\.(?:[cm]?[jt]sx?|mts|cts|json|css|html|feature|ya?ml|svg|snap)$/.test(file) &&
        file !== bootstrapPin
      )
        files.push(file)
    }
  }
  for (const entry of readdirSync(resolve(root, 'packages'), { withFileTypes: true }))
    if (entry.isDirectory()) {
      const folder = 'packages/' + entry.name
      for (const name of readdirSync(resolve(root, folder))) {
        if (name === 'src' || name === 'tests' || name === 'tokens') visit(folder + '/' + name)
        else if (
          /^(?:package\.json|[^/]+\.html|(?:tsconfig|vite|vitest|playwright|eslint)[^/]*\.(?:json|[cm]?[jt]s))$/.test(
            name,
          )
        )
          files.push(folder + '/' + name)
      }
    }
  for (const folder of [
    'apps/desktop/src',
    'apps/desktop/tests',
    'scripts',
    'tests/contract',
    'tests/ui-contract',
  ])
    visit(folder)
  for (const name of readdirSync(resolve(root, 'apps/desktop')))
    if (
      /^(?:package\.json|(?:tsconfig|vite|vitest|playwright|eslint)[^/]*\.(?:json|[cm]?[jt]s))$/.test(
        name,
      )
    )
      files.push('apps/desktop/' + name)
  files.push(
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'turbo.json',
    'eslint.config.js',
    'tsconfig.base.json',
    '.gitattributes',
    'packages/draw/src/editor/generated/.gitattributes',
    'packages/ui-workspace/tokens/.gitattributes',
    'apps/desktop/vendor/drawio-manifest.json',
    'docs/ui/decisions/legacy-colors.json',
    evidenceOwner + 'presentation-execution-plan.json',
  )
  const inventory = JSON.parse(
    safeBytes(root, 'packages/ui-workspace/tokens/drawio-editor-source.json'),
  )
  for (const input of inventory.inputs) files.push(input.path)
  return [...new Set(files)].sort()
}
export function desktopOutputs(root) {
  const outputs = []
  const visit = (folder) => {
    for (const entry of readdirSync(resolve(root, folder), { withFileTypes: true })) {
      const file = folder + '/' + entry.name
      demand(!entry.isSymbolicLink(), 'CURRENT_BUILD_LINK')
      if (entry.isDirectory()) visit(file)
      else outputs.push({ file, sha256: sha256(safeBytes(root, file)) })
    }
  }
  visit('apps/desktop/out')
  demand(outputs.length > 0, 'CURRENT_BUILD_EMPTY')
  return outputs.sort((a, b) => a.file.localeCompare(b.file, 'en'))
}
export function currentInputs(root) {
  return currentInputFiles(root).map((file) => ({
    file,
    ...publicationByteForms(safeBytes(root, file)),
  }))
}
export function sourceSetSha256(inputs) {
  return sha256(
    JSON.stringify(
      inputs
        .map((x) => ({ file: x.file, sha256: x.canonicalSha256 }))
        .sort((a, b) => a.file.localeCompare(b.file, 'en')),
    ),
  )
}
export function verifyInputBytes(entry, bytes) {
  demand(
    [entry.sha256, entry.canonicalSha256, entry.checkoutSha256].includes(sha256(bytes)),
    'CURRENT_SOURCE_HASH:' + entry.file,
  )
  demand(
    sha256(canonicalPublicationBytes(bytes)) === entry.canonicalSha256,
    'CURRENT_PUBLICATION_EQUIVALENCE:' + entry.file,
  )
}
export function reportCases(runner, report) {
  if (runner === 'vitest') {
    demand(
      report.success === true &&
        report.numTotalTests > 0 &&
        report.numPassedTests === report.numTotalTests &&
        report.numFailedTests === 0 &&
        report.numPendingTests === 0 &&
        !(report.numTodoTests ?? 0),
      'CURRENT_VITEST_FAILURE',
    )
    const cases = report.testResults.flatMap((suite) =>
      suite.assertionResults.map((item) => {
        demand(item.status === 'passed', 'CURRENT_CASE_NOT_PASSED')
        return { file: suite.name.replaceAll('\\', '/'), title: item.fullName }
      }),
    )
    demand(cases.length === report.numTotalTests, 'CURRENT_VITEST_COUNT')
    return cases
  }
  demand(
    runner === 'playwright' &&
      !(report.errors ?? []).length &&
      report.stats.expected > 0 &&
      report.stats.skipped === 0 &&
      report.stats.unexpected === 0 &&
      report.stats.flaky === 0,
    'CURRENT_PLAYWRIGHT_FAILURE',
  )
  const cases = []
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      demand(spec.ok === true && spec.tests.length === 1, 'CURRENT_SPEC_NOT_PASSED')
      const test = spec.tests[0]
      demand(
        test.status === 'expected' &&
          test.expectedStatus === 'passed' &&
          test.results.length === 1 &&
          test.results[0].status === 'passed',
        'CURRENT_CASE_NOT_PASSED',
      )
      cases.push({ file: spec.file.replaceAll('\\', '/'), title: spec.title })
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const suite of report.suites) walk(suite)
  demand(cases.length === report.stats.expected, 'CURRENT_PLAYWRIGHT_COUNT')
  return cases
}
const caseKey = (item) => item.file.split('/').at(-1) + '\0' + item.title
export function validateExecution(record, report, expectedSourceSet, expectedCases) {
  demand(
    record.exitCode === 0 &&
      record.sourceSetBefore === expectedSourceSet &&
      record.sourceSetAfter === expectedSourceSet,
    'CURRENT_EXECUTION_INPUTS',
  )
  demand(
    record.startedAt &&
      record.finishedAt &&
      Date.parse(record.finishedAt) >= Date.parse(record.startedAt),
    'CURRENT_EXECUTION_TIME',
  )
  const cases = reportCases(record.runner, report),
    keys = cases.map(caseKey).sort()
  demand(new Set(keys).size === keys.length, 'CURRENT_DUPLICATE_CASE')
  demand(
    JSON.stringify(keys) === JSON.stringify(expectedCases.map(caseKey).sort()),
    'CURRENT_NAMED_CASE_SET',
  )
  return cases
}
function verifyObservedInputs(record, inputs, sourceSet, read) {
  for (const phase of ['before', 'after']) {
    const artifact = record[phase]
    demand(
      artifact?.file.startsWith(evidenceOwner + 'current-execution/'),
      'CURRENT_OBSERVED_INPUT_PATH',
    )
    const raw = read(artifact.file)
    demand(sha256(raw) === artifact.sha256, 'CURRENT_OBSERVED_INPUT_HASH')
    const observed = JSON.parse(raw)
    demand(sourceSetSha256(observed) === sourceSet, 'CURRENT_OBSERVED_SOURCE_SET')
    demand(
      JSON.stringify(observed.map((x) => x.file)) === JSON.stringify(inputs.map((x) => x.file)),
      'CURRENT_OBSERVED_CLOSURE',
    )
    for (let i = 0; i < observed.length; i++)
      demand(
        [inputs[i].sha256, inputs[i].canonicalSha256, inputs[i].checkoutSha256].includes(
          observed[i].sha256,
        ),
        'CURRENT_OBSERVED_RAW_HASH',
      )
  }
}
export function verifyDrawingPagesCurrent(root, manifest, read = (file) => safeBytes(root, file)) {
  demand(
    manifest.version === 1 &&
      manifest.change === 'frade-draw-multipage' &&
      manifest.baseline === 'e54cf0c1e4e70ed833398c673ea3140b6f10469e',
    'CURRENT_MANIFEST_SCHEMA',
  )
  demand(
    JSON.stringify(manifest.currentInputs.map((x) => x.file)) ===
      JSON.stringify(currentInputFiles(root)),
    'CURRENT_CLOSURE_SET',
  )
  for (const entry of manifest.currentInputs) verifyInputBytes(entry, read(entry.file))
  const sourceSet = sourceSetSha256(manifest.currentInputs)
  demand(sourceSet === manifest.sourceSetSha256, 'CURRENT_SOURCE_SET')
  for (const artifact of Object.values(manifest.desktopBuild)) {
    demand(artifact.file.startsWith(evidenceOwner + 'current-execution/'), 'CURRENT_BUILD_PATH')
    demand(sha256(read(artifact.file)) === artifact.sha256, 'CURRENT_BUILD_HASH')
  }
  const build = JSON.parse(read(manifest.desktopBuild.record.file))
  demand(
    build.role === 'desktop-build' &&
      build.exitCode === 0 &&
      build.sourceSetBefore === sourceSet &&
      build.sourceSetAfter === sourceSet &&
      build.outputs.length > 0,
    'CURRENT_BUILD_INPUTS',
  )
  verifyObservedInputs(build, manifest.currentInputs, sourceSet, read)
  const bundleSet = sha256(JSON.stringify(build.outputs))
  demand(
    JSON.stringify(manifest.executions.map((x) => x.role).sort()) ===
      JSON.stringify([...executionRoles].sort()),
    'CURRENT_EXECUTION_ROLES',
  )
  const all = []
  for (const execution of manifest.executions) {
    for (const artifact of ['record', 'report', 'stdout', 'stderr']) {
      demand(
        execution[artifact].file.startsWith(evidenceOwner + 'current-execution/'),
        'CURRENT_REPORT_PATH',
      )
      demand(
        sha256(read(execution[artifact].file)) === execution[artifact].sha256,
        'CURRENT_REPORT_HASH',
      )
    }
    const record = JSON.parse(read(execution.record.file)),
      report = JSON.parse(read(execution.report.file))
    demand(record.role === execution.role, 'CURRENT_RECORD_ROLE')
    if (execution.role.startsWith('desktop-'))
      demand(
        record.buildSha256 === manifest.desktopBuild.record.sha256 &&
          record.bundlesBefore === bundleSet &&
          record.bundlesAfter === bundleSet,
        'CURRENT_BUILT_EXECUTION',
      )
    verifyObservedInputs(record, manifest.currentInputs, sourceSet, read)
    all.push(...validateExecution(record, report, sourceSet, execution.cases))
  }
  const plan = JSON.parse(read(evidenceOwner + 'presentation-execution-plan.json'))
  const presentation = manifest.executions
    .filter((x) => x.role === 'desktop-presentation' || x.role === 'desktop-performance')
    .flatMap((x) => x.cases)
    .map(caseKey)
    .sort()
  demand(
    JSON.stringify(presentation) === JSON.stringify(plan.cases.map(caseKey).sort()) &&
      presentation.length === 50,
    'CURRENT_PRESENTATION_PLAN',
  )
  return {
    status: 'PASS',
    sourceFiles: manifest.currentInputs.length,
    executions: manifest.executions.length,
    tests: all.length,
    presentationCases: presentation.length,
  }
}
