import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256, evidenceOwner as e, verifyDrawingPagesCurrent } from '../../../../tests/ui-contract/drawing-pages-current.mjs'

const root = process.cwd(), command = 'pnpm check', output = e + 'root-check-execution-02.json'
if (fs.existsSync(output)) throw Error('IMMUTABLE_ROOT_RUN_EXISTS')
const manifestRaw = fs.readFileSync(e + 'source-adoption-manifest.json'), manifest = JSON.parse(manifestRaw)
verifyDrawingPagesCurrent(root, manifest)
const before = currentInputs(root), startedAt = new Date().toISOString()
const environment = { ELECTRON_OVERRIDE_DIST_PATH: 'E:/dev/codex/frade/apps/desktop/node_modules/electron/dist' }
const child = spawn('cmd.exe', ['/d', '/s', '/c', command], { cwd: root, env: { ...process.env, ...environment }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const stdout = [], stderr = []
child.stdout.on('data', chunk => stdout.push(chunk)); child.stderr.on('data', chunk => stderr.push(chunk))
const exit = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done) })
const after = currentInputs(root)
fs.writeFileSync(e + 'root-check-02-stdout.txt', Buffer.concat(stdout))
fs.writeFileSync(e + 'root-check-02-stderr.txt', Buffer.concat(stderr))
const artifact = file => ({ file, sha256: sha256(fs.readFileSync(file)) })
const record = { command, cwd: root, environment, startedAt, finishedAt: new Date().toISOString(), actualExit: exit, stdout: artifact(e + 'root-check-02-stdout.txt'), stderr: artifact(e + 'root-check-02-stderr.txt'), manifest: { file: e + 'source-adoption-manifest.json', sha256: sha256(manifestRaw) }, sourceSetBefore: sourceSetSha256(before), sourceSetAfter: sourceSetSha256(after), status: exit === 0 && sourceSetSha256(before) === sourceSetSha256(after) ? 'PASS' : 'FAIL', meaning: 'Actual fresh aggregate execution after explicit POST05 source revalidation; expected rejection FAIL output inside negative controls is not a gate failure. Previous root record preserved in candidate-01-before-post05-repair.' }
fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n')
if (record.status !== 'PASS') { console.log(JSON.stringify(record)); process.exit(1) }
fs.copyFileSync(output, e + 'root-check-execution.json')
console.log(JSON.stringify(record))
