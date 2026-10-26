import { expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const change = 'frade-light-diagram-editor'
const prefix = 'openspec/changes/' + change + '/'
const manifestPath = prefix + 'evidence/upstream-bdd-bindings-20261026/bindings-reference-popup.json'
const manifestSha256 = 'ca574b2b7065eb509ab3d887aa9b30e4195d1a79aac9c5ef3b5f3a8a938b438c'
const ids = Array.from({ length: 9 }, (_, i) => 'LDE-' + String(i + 1).padStart(3, '0'))
const digest = (raw: Buffer) => createHash('sha256').update(raw).digest('hex')
type Pin = { file: string; sha256: string; publishedSha256?: string }
type Binding = { id: string; cases: { report: string; title: string }[] }
type Manifest = { inputs: Pin[]; reports: Record<string, Pin & { format: 'playwright' | 'vitest' | 'tap' }>; bindings: Binding[] }
type Case = { title: string; passed: boolean }
function demand(value: unknown, error: string): asserts value {
  if (!value) throw Error(error)
}
function safeFile(file: string): Buffer {
  demand(!file.includes('\\') && !file.split('/').some(part => part === '..' || part === '.' || !part), 'UNSAFE_PATH')
  let physical = file
  if (file.startsWith(prefix)) {
    const suffix = file.slice(prefix.length)
    const archive = resolve(root, 'openspec/changes/archive')
    const candidates = [prefix + suffix, ...readdirSync(archive).filter(name => /^\d{4}-\d{2}-\d{2}-frade-light-diagram-editor$/.test(name)).map(name => 'openspec/changes/archive/' + name + '/' + suffix)].filter(name => existsSync(resolve(root, name)))
    demand(candidates.length === 1, 'EVIDENCE_LOCATION')
    physical = candidates[0]
  }
  let current = root
  for (const part of physical.split('/')) {
    current = resolve(current, part)
    demand(!lstatSync(current).isSymbolicLink(), 'UNSAFE_LINK')
  }
  demand(!relative(root, realpathSync(current)).startsWith('..') && lstatSync(current).isFile(), 'UNSAFE_FILE')
  return readFileSync(current)
}
function reportCases(format: string, raw: Buffer): Case[] {
  if (format === 'tap') {
    const text = raw.toString()
    demand(!/^not ok /m.test(text) && /^# fail 0\r?$/m.test(text) && /^# skipped 0\r?$/m.test(text), 'FAILED_TAP')
    return [...text.matchAll(/^ok \d+ - (.+)\r?$/gm)].map(m => ({ title: m[1].replace(/\r$/, ''), passed: true }))
  }
  const report = JSON.parse(raw.toString())
  if (format === 'vitest') return report.testResults.flatMap((suite: { assertionResults: { fullName: string; status: string }[] }) => suite.assertionResults.map(test => ({ title: test.fullName, passed: test.status === 'passed' })))
  const cases: Case[] = []
  const walk = (suite: { specs?: { title: string; tests: { status: string; results: { status: string; errors?: unknown[] }[] }[] }[]; suites?: typeof suite[] }) => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests) cases.push({ title: spec.title, passed: test.status === 'expected' && test.results.length === 1 && test.results[0].status === 'passed' && !test.results[0].errors?.length })
    for (const child of suite.suites ?? []) walk(child)
  }
  walk(report)
  return cases
}
function verify(read = safeFile) {
  const raw = read(manifestPath)
  demand(digest(raw) === manifestSha256, 'MANIFEST_HASH')
  const manifest: Manifest = JSON.parse(raw.toString())
  demand(JSON.stringify(manifest.bindings.map(b => b.id)) === JSON.stringify(ids), 'BDD_IDS')
  for (const pin of manifest.inputs) {
    const actual = digest(read(pin.file))
    demand(actual === pin.sha256 || actual === pin.publishedSha256, 'INPUT_HASH')
  }
  const reports = new Map<string, Case[]>()
  for (const [id, pin] of Object.entries(manifest.reports)) {
    const report = read(pin.file)
    demand(digest(report) === pin.sha256, 'REPORT_HASH')
    reports.set(id, reportCases(pin.format, report))
  }
  return { manifest, reports }
}
let cached: ReturnType<typeof verify> | undefined
for (const id of ids) it(id + ' exact-source executable evidence binding', () => {
  cached ??= verify()
  const feature = safeFile(prefix + 'bdd/light-diagram-editor.feature').toString()
  expect([...feature.matchAll(/@(LDE-\d{3})/g)].map(m => m[1])).toEqual(ids)
  const binding = cached.manifest.bindings.find(b => b.id === id)!
  expect(binding.cases.length).toBeGreaterThan(0)
  for (const wanted of binding.cases) {
    const cases = cached.reports.get(wanted.report)!.filter(c => c.title === wanted.title)
    expect(cases, wanted.title).toHaveLength(1)
    expect(cases[0].passed, wanted.title).toBe(true)
  }
})
it('LDE binding rejects source and report tampering without editing evidence', () => {
  const { manifest } = verify()
  for (const target of [manifest.inputs[0].file, Object.values(manifest.reports)[0].file]) expect(() => verify(file => file === target ? Buffer.concat([safeFile(file), Buffer.from('\nmutation')]) : safeFile(file))).toThrow(target === manifest.inputs[0].file ? 'INPUT_HASH' : 'REPORT_HASH')
  expect(() => verify(file => file === manifestPath ? Buffer.from('{}') : safeFile(file))).toThrow('MANIFEST_HASH')
})

it('LDE source publication accepts only the predeclared checkout and committed byte forms', () => {
  const variantPath = prefix + 'evidence/upstream-source-publication-portability-20261026/variants.json'
  const variants: { file: string; publishedBase64: string }[] = JSON.parse(safeFile(variantPath).toString()).variants
  const published = new Map(variants.map(v => [v.file, Buffer.from(v.publishedBase64, 'base64')]))
  expect(() => verify(file => published.get(file) ?? safeFile(file))).not.toThrow()
  const target = variants.find(v => v.file.endsWith('DiagramView.tsx'))!
  const original = safeFile(target.file)
  const third = Buffer.from(original.toString().replace('\r\n', '\n'))
  expect(digest(third)).not.toBe(digest(original))
  expect(digest(third)).not.toBe(digest(published.get(target.file)!))
  expect(() => verify(file => file === target.file ? third : safeFile(file))).toThrow('INPUT_HASH')
  expect(() => verify(file => file === target.file ? Buffer.concat([published.get(file)!, Buffer.from('\nexport const unauthorized = true\n')]) : safeFile(file))).toThrow('INPUT_HASH')
})
