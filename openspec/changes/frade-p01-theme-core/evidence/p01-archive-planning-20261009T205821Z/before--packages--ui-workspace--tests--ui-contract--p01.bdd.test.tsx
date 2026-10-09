import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { builtinTokens } from '../../src/design/generated/tokens'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { contrastPairs, contrastRatio } from '../../src/design/theme/contrast'
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const feature = readFileSync(resolve(root, 'docs/ui/bdd/p01-theme-core.feature'), 'utf8')
const cases = [...feature.matchAll(/@P01-RES-(\d+)[^\n]*\n\s*Scenario: ([^\n]+)/g)].map(m => ({ id: 'P01-RES-' + m[1], name: m[2] }))
const selection = { mode: 'light' as const, density: 'compact' as const, preferred: { ...BUILTIN_IDS } }
const story = (id: string, run: () => void) => {
  const scenario = cases.find(c => c.id === id)
  if (!scenario) throw new Error('Missing durable BDD scenario ' + id)
  it(id + ' ' + scenario.name, run)
}
story('P01-RES-001', () => {
  const registry = createThemeRegistry()
  for (const mode of ['light', 'dark', 'high-contrast'] as const) {
    const snapshot = resolveTheme({ registry, selection: { ...selection, mode } })
    expect(snapshot.colors).toEqual(builtinTokens.themes[mode])
    expect(Object.keys(snapshot.colors)).toHaveLength(31)
    for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(snapshot.colors[fg], snapshot.colors[bg])).toBeGreaterThanOrEqual(minimum)
  }
})
story('P01-RES-002', () => {
  const snapshot = resolveTheme({ registry: createThemeRegistry(), selection: { ...selection, density: 'comfortable' }, environment: { colorScheme: 'dark' } })
  expect(snapshot.kind).toBe('light')
  expect(snapshot.density).toBe('comfortable')
  expect(builtinTokens.density[snapshot.density]['size.row']).toBe('36px')
})
story('P01-RES-003', () => {
  const registry = createThemeRegistry(), overrides = { global: { 'diagram.grid': '#111111' }, byTheme: { [BUILTIN_IDS.light]: { 'diagram.grid': '#222222' } }, workspace: { 'diagram.grid': '#333333', 'unrecognized.role': '#123456' }, workspaceEnabled: false }
  expect(resolveTheme({ registry, selection, overrides }).colors['diagram.grid']).toBe('#222222')
  const snapshot = resolveTheme({ registry, selection, overrides: { ...overrides, workspaceEnabled: true } })
  expect(snapshot.colors['diagram.grid']).toBe('#333333')
  expect(snapshot.issues.map(x => x.code)).toContain('UNKNOWN_ROLE')
  expect(Object.keys(snapshot.colors)).toHaveLength(31)
})
story('P01-RES-004', () => {
  const descriptor = { id: 'bdd.workshop/low', label: 'Low', kind: 'light', colors: { 'text.primary': '#FFFFFF' } }, before = JSON.stringify(descriptor), registry = createThemeRegistry([descriptor])
  const input = { registry, selection: { ...selection, preferred: { ...BUILTIN_IDS, light: descriptor.id } } }
  const snapshot = resolveTheme(input)
  expect(snapshot.status).toBe('REPAIRED')
  expect(snapshot.compatibility.repaired).toContain('text.primary')
  expect(resolveTheme(input)).toEqual(snapshot)
  expect(JSON.stringify(descriptor)).toBe(before)
  for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(snapshot.colors[fg], snapshot.colors[bg])).toBeGreaterThanOrEqual(minimum)
})
story('P01-RES-005', () => {
  const overrides = { global: { 'diagram.grid': '#123456' } }, before = JSON.stringify(overrides)
  const snapshot = resolveTheme({ registry: createThemeRegistry(), selection, overrides, environment: { colorScheme: 'dark', forcedColors: true } })
  expect(snapshot.effectiveColors['surface.base']).toBe('Canvas')
  expect(snapshot.effectiveColors['text.primary']).toBe('CanvasText')
  expect(snapshot.effectiveColors['focus.ring']).toBe('Highlight')
  expect(snapshot.colors['diagram.grid']).toBe('#123456')
  expect(JSON.stringify(overrides)).toBe(before)
})
it('P01 traceability fails closed on missing IDs, stale assertion hashes or premature runtime claims', () => {
  const registry = JSON.parse(readFileSync(resolve(root, 'docs/ui/decisions/p01-theme-traceability.json'), 'utf8'))
  expect(registry.bindings.map((b: { id: string }) => b.id)).toEqual(cases.map(c => c.id))
  for (const binding of registry.bindings) {
    expect(binding.scope).toBe('PURE_RESOLVER_BDD')
    const source = readFileSync(resolve(root, binding.assertion.file))
    expect(createHash('sha256').update(source).digest('hex')).toBe(binding.assertion.sha256)
    expect(source.toString()).toContain("story('" + binding.id + "'")
  }
  for (const boundary of registry.pendingRuntime) expect(boundary.status).toBe('NOT_RUN')
  const property = readFileSync(resolve(root, registry.propertyAssertion.file))
  expect(createHash('sha256').update(property).digest('hex')).toBe(registry.propertyAssertion.sha256)
  expect(registry.propertyAssertion.seed).toBe(20260930)
  expect(registry.propertyAssertion.runs).toBe(200)
})


// Separate actual FUI projection. Foundation and pendingRuntime declarations above stay exact.
import ts from 'typescript'
type FuiPin = { file: string; sha256: string }
type FuiBinding = { example: string; scope: string; assertion: FuiPin & { callbackPrefix: string; callbackSha256: string }; cases: string[]; execution: { command: FuiPin; report: FuiPin } }
type FuiReportSuite = { suites?: FuiReportSuite[]; specs?: { title: string; file: string; tests: { status: string; results: { status: string; errors?: unknown[] }[] }[] }[] }
const fuiSourceFile = 'apps/desktop/tests/e2e/ui-contract-theme.spec.ts'
const fuiExplicitTitle = 'P01 real frame chord, Settings, System media and preview window-close preserve dirty KA and durable ownership'
const fuiRequired = [
  ...['light', 'dark', 'high-contrast'].map(mode => ({ example: 'FUI-005/' + mode, prefix: 'P01-FUI005 ', cases: ['native', 'frame'].map(kind => 'P01-FUI005 ' + mode + ' ' + kind) })),
  { example: 'FUI-006', prefix: 'P01-FUI006 ', cases: ['native', 'frame'].map(kind => 'P01-FUI006 ' + kind) },
  { example: 'FUI-007', prefix: 'P01-FUI007 ', cases: ['P01-FUI007 required frame preparation refuses direct durable commit'] },
  { example: 'FUI-008', prefix: fuiExplicitTitle, cases: [fuiExplicitTitle] },
  { example: 'FUI-009', prefix: 'P01-FUI009 ', cases: ['native', 'frame'].map(kind => 'P01-FUI009 dark comfortable selected and restored ' + kind) },
]
const fuiDigest = (raw: Buffer | string) => createHash('sha256').update(raw).digest('hex')
const fuiRead = (file: string) => readFileSync(resolve(root, file))
const fuiDemand = (condition: unknown, code: string) => { if (!condition) throw new Error(code) }
function checkFuiBindings(bindings: FuiBinding[], read: (file: string) => Buffer = fuiRead) {
  fuiDemand(Array.isArray(bindings) && bindings.length === 7, 'EXAMPLE_SET')
  fuiDemand(JSON.stringify(bindings.map(binding => binding.example)) === JSON.stringify(fuiRequired.map(row => row.example)), 'EXAMPLE_SET')
  const source = read(fuiSourceFile), sourceHash = fuiDigest(source)
  const ast = ts.createSourceFile(fuiSourceFile, source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const callbacks: { titleExpression: string; callback: string }[] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test' && node.arguments[1] && ts.isArrowFunction(node.arguments[1]))
      callbacks.push({ titleExpression: node.arguments[0].getText(ast), callback: node.arguments[1].getText(ast) })
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const pin = (entry: FuiPin) => {
    fuiDemand(/^openspec\/changes\/frade-p01-theme-core\/evidence\/p01-fui-runtime-[0-9TZ]+\/(command\.json|runtime\.stdout\.json)$/.test(entry.file), 'EVIDENCE_PATH')
    const raw = read(entry.file); fuiDemand(fuiDigest(raw) === entry.sha256, 'EVIDENCE_HASH'); return JSON.parse(raw.toString())
  }
  const names: string[] = []
  for (const [index, binding] of bindings.entries()) {
    const wanted = fuiRequired[index]
    fuiDemand(binding.scope === 'ACTUAL_ELECTRON_RUNTIME', 'SCOPE')
    fuiDemand(binding.assertion.file === fuiSourceFile && binding.assertion.sha256 === sourceHash, 'SOURCE_HASH')
    fuiDemand(binding.assertion.callbackPrefix === wanted.prefix, 'CALLBACK_ID')
    const callback = callbacks.filter(item => item.titleExpression.includes(wanted.prefix))
    fuiDemand(callback.length === 1 && fuiDigest(callback[0].callback) === binding.assertion.callbackSha256, 'CALLBACK_HASH')
    fuiDemand(JSON.stringify(binding.cases) === JSON.stringify(wanted.cases), 'CASE_SET')
    names.push(...binding.cases)
    const command = pin(binding.execution.command), report = pin(binding.execution.report)
    fuiDemand(binding.execution.command.file.replace('/command.json', '') === binding.execution.report.file.replace('/runtime.stdout.json', ''), 'RUN_PAIR')
    fuiDemand(command.exitCode === 0 && command.status === 'PASS' && command.source.file === fuiSourceFile && command.source.sha256 === sourceHash && command.sourceAfterSha256 === sourceHash, 'EXECUTION')
    fuiDemand(Number.isFinite(Date.parse(command.startedAtUtc)) && Date.parse(command.finishedAtUtc) >= Date.parse(command.startedAtUtc), 'RUN_TIME')
    fuiDemand(Array.isArray(command.command) && command.command.join('|').includes('--filter|@frade/desktop|exec|playwright|test|tests/e2e/ui-contract-theme.spec.ts|--grep|P01-FUI|P01 real frame chord|--reporter=json|--output='), 'COMMAND')
    fuiDemand(report.stats.expected === 12 && report.stats.unexpected === 0 && report.stats.skipped === 0 && report.stats.flaky === 0 && (report.errors ?? []).length === 0, 'RESULT_TOTALS')
    const records: NonNullable<FuiReportSuite['specs']> = []
    const walk = (suite: FuiReportSuite) => { records.push(...suite.specs ?? []); for (const child of suite.suites ?? []) walk(child) }
    for (const suite of report.suites as FuiReportSuite[]) walk(suite)
    fuiDemand(records.length === 12 && new Set(records.map(record => record.title)).size === 12, 'RESULT_SET')
    for (const title of binding.cases) {
      const record = records.filter(record => record.title === title)
      fuiDemand(record.length === 1 && record[0].file.endsWith('ui-contract-theme.spec.ts') && record[0].tests.length === 1, 'RESULT_CASE')
      const test = record[0].tests[0]
      fuiDemand(test.status === 'expected' && test.results.length === 1 && test.results[0].status === 'passed' && (test.results[0].errors ?? []).length === 0, 'RESULT_STATUS')
    }
  }
  fuiDemand(names.length === 12 && new Set(names).size === 12, 'ALLOCATIONS')
}
const fuiControlRun = "openspec/changes/frade-p01-theme-core/evidence/p01-fui-runtime-20261007T221459Z"
const fuiControl = () => JSON.parse(fuiRead(fuiControlRun + '/control-valid-bindings.json').toString()) as FuiBinding[]
it('P01 FUI actual fullRuntimeBindings require all seven examples independently of pending declarations', () => {
  const registry = JSON.parse(fuiRead('docs/ui/decisions/p01-theme-traceability.json').toString())
  checkFuiBindings(registry.fullRuntimeBindings)
})
it('P01 FUI valid actual source and named execution packet passes integrity only', () => { checkFuiBindings(fuiControl()) })
for (const defect of ['missing-example', 'duplicate-example', 'stale-source', 'stale-callback', 'dropped-assertion', 'wrong-case', 'missing-kind', 'wrong-scope', 'unapproved-file', 'escaping-evidence', 'stale-evidence', 'forged-success', 'failed-record', 'wrong-record'] as const)
  it('P01 FUI negative control rejects ' + defect, () => {
    const bindings = fuiControl(), overrides = new Map<string, Buffer>(), first = bindings[0]
    const alterEvidence = (pin: FuiPin, mutate: (value: any) => void) => {
      const value = JSON.parse(fuiRead(pin.file).toString()); mutate(value)
      const raw = Buffer.from(JSON.stringify(value)); overrides.set(pin.file, raw)
      // Deliberately update all raw pins to prove semantic execution checks, not just stale hashes.
      for (const binding of bindings) for (const candidate of [binding.execution.command, binding.execution.report]) if (candidate.file === pin.file) candidate.sha256 = fuiDigest(raw)
    }
    if (defect === 'missing-example') bindings.pop()
    if (defect === 'duplicate-example') bindings[1] = structuredClone(first)
    if (defect === 'stale-source') first.assertion.sha256 = '0'.repeat(64)
    if (defect === 'stale-callback') first.assertion.callbackSha256 = '0'.repeat(64)
    if (defect === 'dropped-assertion') {
      const raw = Buffer.from(fuiRead(fuiSourceFile).toString().replace('expect(await fuiSemantics(f, kind)).toEqual(before)', 'void before'))
      overrides.set(fuiSourceFile, raw)
      for (const binding of bindings) binding.assertion.sha256 = fuiDigest(raw)
    }
    if (defect === 'wrong-case') first.cases[0] = 'Unexecuted theme case'
    if (defect === 'missing-kind') first.cases.pop()
    if (defect === 'wrong-scope') first.scope = 'PURE_RESOLVER_BDD'
    if (defect === 'unapproved-file') first.assertion.file = 'unapproved.ts'
    if (defect === 'escaping-evidence') first.execution.report.file = '../credentials.json'
    if (defect === 'stale-evidence') first.execution.report.sha256 = '0'.repeat(64)
    if (defect === 'forged-success') alterEvidence(first.execution.command, command => { command.exitCode = 1 })
    if (defect === 'failed-record' || defect === 'wrong-record') alterEvidence(first.execution.report, report => {
      const walk = (suite: FuiReportSuite): void => { for (const record of suite.specs ?? []) if (record.title === first.cases[0]) {
        if (defect === 'wrong-record') record.title = 'Unexecuted case'; else record.tests[0].results[0].status = 'failed'
      }; for (const child of suite.suites ?? []) walk(child) }
      report.suites.forEach(walk)
    })
    expect(() => checkFuiBindings(bindings, file => overrides.get(file) ?? fuiRead(file))).toThrow()
  })
