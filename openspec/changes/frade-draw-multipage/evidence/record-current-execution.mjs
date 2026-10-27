import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256, reportCases, evidenceOwner, desktopOutputs } from '../../../../tests/ui-contract/drawing-pages-current.mjs'
const root = process.cwd(), role = process.argv[2]
const plan = JSON.parse(readFileSync(evidenceOwner + 'presentation-execution-plan.json'))
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const perf = item => item.file === 'ui-contract-theme-performance.spec.ts' || item.title.includes('p95')
const selected = role === 'desktop-performance' ? plan.cases.filter(perf) : plan.cases.filter(item => !perf(item))
const roles = {
  'draw-unit': { cwd: 'packages/draw', runner: 'vitest', args: ['run'] },
  'runtime-unit': { cwd: 'packages/runtime-node', runner: 'vitest', args: ['run'] },
  'workspace-direct': { cwd: 'packages/ui-workspace', runner: 'vitest', args: ['run', '--exclude', 'tests/ui-contract/light-diagram-editor.bdd.test.tsx'] },
  'draw-visual': { cwd: 'packages/draw', runner: 'playwright', args: ['test', '--workers=4'] },
  'desktop-diagrams': { cwd: 'apps/desktop', runner: 'playwright', args: ['test', 'tests/e2e/diagrams.spec.ts', 'tests/e2e/drawing-pages-parking.spec.ts', '--workers=1'] },
  'desktop-presentation': { cwd: 'apps/desktop', runner: 'playwright', args: ['test', ...new Set(selected.map(x => 'tests/e2e/' + x.file)), '--workers=1', '--grep', '(?:' + selected.map(x => escaped(x.title)).join('|') + ')$'] },
  'desktop-performance': { cwd: 'apps/desktop', runner: 'playwright', args: ['test', ...new Set(selected.map(x => 'tests/e2e/' + x.file)), '--workers=1', '--grep', '(?:' + selected.map(x => escaped(x.title)).join('|') + ')$'] },
}
const config = roles[role]
if (!config) throw Error('UNKNOWN_ROLE')
const run = evidenceOwner + 'current-execution/' + role + '-' + new Date().toISOString().replaceAll(/[:.]/g, '-')
if (existsSync(run)) throw Error('IMMUTABLE_RUN_EXISTS')
mkdirSync(run, { recursive: true })
const reportFile = run + '/report.json', beforeFile = run + '/before.json', afterFile = run + '/after.json'
const before = currentInputs(root)
let buildSha256, bundlesBefore
if (role.startsWith('desktop-')) {
 const selection = JSON.parse(readFileSync(evidenceOwner+'build-selection.json')), raw=readFileSync(selection.record.file), build=JSON.parse(raw)
 if(sha256(raw)!==selection.record.sha256||build.sourceSetBefore!==sourceSetSha256(before)||build.sourceSetAfter!==sourceSetSha256(before)||build.exitCode!==0)throw Error('STALE_DESKTOP_BUILD')
 buildSha256=sha256(raw);bundlesBefore=sha256(JSON.stringify(desktopOutputs(root)))
 if(bundlesBefore!==sha256(JSON.stringify(build.outputs)))throw Error('DESKTOP_BUILD_OUTPUT_CHANGED')
}
writeFileSync(beforeFile, JSON.stringify(before, null, 2) + '\n')
const startedAt = new Date().toISOString()
const args = [...config.args, '--reporter=json']
if (config.runner === 'vitest') args.push('--outputFile=' + resolve(root, reportFile))
const script = config.cwd + '/node_modules/' + (config.runner === 'vitest' ? 'vitest/vitest.mjs' : '@playwright/test/cli.js')
const env = { ...process.env, ELECTRON_OVERRIDE_DIST_PATH: 'E:/dev/codex/frade/apps/desktop/node_modules/electron/dist', FRADE_DRAW_E2E_PORT: '5187' }
console.log(JSON.stringify({ role, run, startedAt, sourceFiles: before.length, cwd: config.cwd, runner: config.runner }))
const child = spawn(process.execPath, [resolve(root, script), ...args], { cwd: resolve(root, config.cwd), env, windowsHide: true, stdio: ['ignore','pipe','pipe'] })
const stdout = [], stderr = []
child.stdout.on('data', chunk => stdout.push(chunk)); child.stderr.on('data', chunk => stderr.push(chunk))
const exitCode = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done) })
const out = Buffer.concat(stdout), err = Buffer.concat(stderr)
writeFileSync(run + '/stdout.txt', out); writeFileSync(run + '/stderr.txt', err)
if (config.runner === 'playwright') writeFileSync(reportFile, out)
const after = currentInputs(root)
writeFileSync(afterFile, JSON.stringify(after, null, 2) + '\n')
const artifact = file => ({ file, sha256: sha256(readFileSync(file)) })
const record = { role, runner: config.runner, cwd: config.cwd, executable: process.execPath, nodeVersion: process.version, args: [script, ...args], startedAt, finishedAt: new Date().toISOString(), exitCode, sourceSetBefore: sourceSetSha256(before), sourceSetAfter: sourceSetSha256(after), before: artifact(beforeFile), after: artifact(afterFile), report: existsSync(reportFile) ? artifact(reportFile) : null, stdout: artifact(run + '/stdout.txt'), stderr: artifact(run + '/stderr.txt') }
if(role.startsWith('desktop-'))Object.assign(record,{buildSha256,bundlesBefore,bundlesAfter:sha256(JSON.stringify(desktopOutputs(root)))})
writeFileSync(run + '/record.json', JSON.stringify(record, null, 2) + '\n')
if (exitCode !== 0 || record.sourceSetBefore !== record.sourceSetAfter) { console.log(JSON.stringify({ status: 'FAIL', run, exitCode, sourceStable: record.sourceSetBefore === record.sourceSetAfter })); process.exit(1) }
const cases = reportCases(config.runner, JSON.parse(readFileSync(reportFile)))
if (role === 'desktop-presentation' || role === 'desktop-performance') {
 const key = x => basename(x.file) + '\0' + x.title
 if (JSON.stringify(cases.map(key).sort()) !== JSON.stringify(selected.map(key).sort())) throw Error('EXECUTED_PLAN_CASE_SET')
}
writeFileSync(run + '/execution.json', JSON.stringify({ role, record: artifact(run + '/record.json'), report: artifact(reportFile), stdout: artifact(run + '/stdout.txt'), stderr: artifact(run + '/stderr.txt'), cases }, null, 2) + '\n')
console.log(JSON.stringify({ status: 'PASS', role, run, tests: cases.length, durationMs: Date.parse(record.finishedAt) - Date.parse(startedAt) }))
