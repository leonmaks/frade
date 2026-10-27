import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256, evidenceOwner as e } from '../../../../tests/ui-contract/drawing-pages-current.mjs'

const root = process.cwd(), sourceSet = sourceSetSha256(currentInputs(root)), startedAt = new Date().toISOString()
const previous = JSON.parse(fs.readFileSync(e + 'candidate-02-before-feedback-repair/' + e + 'source-adoption-manifest.json'))
const current = currentInputs(root)
const allowed = new Set(['packages/draw/src/editor/drawingSession.ts', 'packages/draw/tests/spike/drawing-session.spec.ts'])
const changes = current.filter(file => previous.currentInputs.find(old => old.file === file.file)?.sha256 !== file.sha256).map(x => x.file)
if (current.length !== previous.currentInputs.length || changes.length !== 2 || changes.some(file => !allowed.has(file))) throw Error('UNAUTHORIZED_REPAIR_SOURCE_CHANGE:' + JSON.stringify(changes))
const selection = [], completed = []
const progress = (status, extra = {}) => fs.writeFileSync(e + 'feedback-runtime-batch-progress.json', JSON.stringify({ status, startedAt, updatedAt: new Date().toISOString(), sourceSet, changes, completed, selection, ...extra }, null, 2) + '\n')
async function command(role, script) {
  console.log(JSON.stringify({ stage: 'START', role, at: new Date().toISOString() }))
  const child = spawn(process.execPath, [e + script, ...(role === 'desktop-build' ? [] : [role])], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk; process.stdout.write(chunk) })
  child.stderr.on('data', chunk => { stderr += chunk; process.stderr.write(chunk) })
  const exit = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done) })
  fs.writeFileSync(e + 'feedback-launch-' + role + '-stdout.txt', stdout)
  fs.writeFileSync(e + 'feedback-launch-' + role + '-stderr.txt', stderr)
  if (exit !== 0) throw Error('REPAIR_ROLE_FAILED:' + role + ':' + exit)
  const passes = stdout.trim().split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)] } catch { return [] } }).filter(item => item.status === 'PASS')
  if (passes.length !== 1) throw Error('AMBIGUOUS_PASS:' + role)
  const run = passes[0].run
  if (!run.startsWith(e + 'current-execution/' + role + '-')) throw Error('FOREIGN_ROLE:' + role)
  const record = JSON.parse(fs.readFileSync(run + '/record.json'))
  if (record.exitCode !== 0 || record.sourceSetBefore !== sourceSet || record.sourceSetAfter !== sourceSet) throw Error('STALE_ROLE:' + role)
  if (role !== 'desktop-build') selection.push(run)
  completed.push(role); progress('RUNNING')
  return run
}
function copyArtifacts(source, destination, include, execution) {
  if (fs.existsSync(destination)) throw Error('IMMUTABLE_ARTIFACT_EXISTS')
  const files = []
  const walk = dir => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) walk(file)
    else if (!item.name.startsWith('.') && include(file)) {
      const relative = path.relative(source, file).replaceAll('\\', '/'), target = destination + '/' + relative, raw = fs.readFileSync(file)
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, raw)
      files.push({ source: file.replaceAll('\\', '/'), file: target, sha256: sha256(raw), bytes: raw.length })
    }
  } }
  walk(source)
  fs.writeFileSync(destination + '/index.json', JSON.stringify({ execution, copiedAt: new Date().toISOString(), files }, null, 2) + '\n')
}
progress('RUNNING')
try {
  await Promise.all([
    command('draw-unit', 'record-current-execution.mjs'),
    command('runtime-unit', 'record-current-execution.mjs'),
    command('workspace-direct', 'record-current-execution.mjs'),
    command('desktop-build', 'record-desktop-build.mjs'),
  ])
  for (const role of ['draw-visual', 'desktop-diagrams', 'desktop-presentation', 'desktop-performance']) {
    const run = await command(role, 'record-current-execution.mjs')
    if (role === 'draw-visual') copyArtifacts('packages/draw/test-results', e + 'current-rendered-feedback-20261027', file => file.includes('drawing-pages-parity'), run)
    if (role === 'desktop-performance') copyArtifacts('apps/desktop/test-results', e + 'performance-feedback-20261027', () => true, run)
  }
  if (sourceSetSha256(currentInputs(root)) !== sourceSet || completed.length !== 8 || selection.length !== 7) throw Error('REPAIR_FINAL_CLOSURE')
  selection.sort((a, b) => ['draw-unit', 'runtime-unit', 'workspace-direct', 'draw-visual', 'desktop-diagrams', 'desktop-presentation', 'desktop-performance'].indexOf(JSON.parse(fs.readFileSync(a + '/record.json')).role) - ['draw-unit', 'runtime-unit', 'workspace-direct', 'draw-visual', 'desktop-diagrams', 'desktop-presentation', 'desktop-performance'].indexOf(JSON.parse(fs.readFileSync(b + '/record.json')).role))
  fs.writeFileSync(e + 'execution-selection.json', JSON.stringify(selection, null, 2) + '\n')
  progress('PASS')
  console.log(JSON.stringify({ status: 'PASS', sourceSet, roles: completed.length, selection }))
} catch (error) { progress('FAIL', { error: String(error) }); throw error }
