import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import * as review from '../../scripts/directions/review.mjs'

const report = 'GATE_STATUS: FAIL\n'
const hash = (x) => createHash('sha256').update(x).digest('hex')
const exec = promisify(execFile)
const sharedId = '2026-10-03T12-34-56-789Z-12345678-1234-1234-1234-123456789abc'
const proxyWarning =
  'wsl: A localhost proxy configuration was detected but not mirrored into WSL. WSL in NAT mode does not support localhost proxies.\r\n'
const linuxPath = (path) =>
  /^[A-Za-z]:[\\/]/.test(path)
    ? `/mnt/${path[0].toLowerCase()}${path.slice(2).replaceAll('\\', '/')}`
    : path
const sharedRecord = (run) => ({
  run: join(run, 'output'),
  packet: join(run, 'prepared', 'packet'),
  exitCode: 0,
  timedOut: false,
  candidateUnchanged: true,
  packetUnchanged: true,
  cli: {
    launcher: 'wsl.exe',
    version: '0.159.3',
    args: ['-d', 'Ubuntu-22.04_E', '-C', linuxPath(join(run, 'prepared', 'packet'))],
  },
})

test('completed shared root binds exact record, packet and single UUID probe', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'review-bound-run-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const common = join(root, 'common')
  const run = join(common, 'frade-workflow', 'runs', sharedId)
  await mkdir(join(run, 'output'), { recursive: true })
  await mkdir(join(run, 'prepared', 'packet'), { recursive: true })
  const record = sharedRecord(run)
  await writeFile(join(run, 'output', 'record.json'), JSON.stringify(record))
  const calls = []
  const harness = review.createSharedProbeTestHarness(async (argv) => {
    calls.push(argv)
    return {
      pid: 4321,
      exit: 1,
      stdout: '',
      stderr: proxyWarning.replace(/./g, '$&\0'),
      signal: null,
      killed: false,
    }
  })
  const proof = await review.probeSharedReviewer(common, run, record, harness)
  assert.equal(proof.stopped, true)
  assert.equal(proof.runId, sharedId)
  assert.equal(proof.probes.length, 1)
  assert.deepEqual(calls[0], [
    '-d',
    'Ubuntu-22.04_E',
    '--exec',
    '/usr/bin/pgrep',
    '-af',
    '--',
    sharedId,
  ])
  assert.equal(proof.probes[0].stderr, proxyWarning.replace(/./g, '$&\0'))
  assert.equal(proof.probes[0].pid, 4321)
  assert.equal(proof.probes[0].exit, 1)
  assert.equal(
    calls.some((argv) => argv.join(' ').includes('linux-runtime')),
    false,
  )
  for (const bad of [
    { ...record, run },
    { ...record, packet: join(run, 'prepared', 'other') },
    {
      ...record,
      cli: {
        ...record.cli,
        args: ['-C', join(run, 'prepared', 'other')],
      },
    },
  ]) {
    assert.equal((await review.probeSharedReviewer(common, run, bad, harness)).stopped, false)
  }
  assert.equal(calls.length, 1)
  const wrong = join(common, 'frade-workflow', 'runs', 'runs')
  await mkdir(wrong)
  assert.equal(
    (await review.probeSharedReviewer(common, wrong, sharedRecord(wrong), harness)).stopped,
    false,
  )
  assert.equal(calls.length, 1)
  const linkedId = sharedId.replace(/.$/, 'd')
  const outside = join(root, 'outside')
  await mkdir(outside)
  const linked = join(common, 'frade-workflow', 'runs', linkedId)
  await symlink(outside, linked, process.platform === 'win32' ? 'junction' : 'dir')
  assert.equal(
    (await review.probeSharedReviewer(common, linked, sharedRecord(linked), harness)).stopped,
    false,
  )
  assert.equal(calls.length, 1)
})

test('live, unavailable and unexpected WSL probe receipts block', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'review-probe-block-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const common = join(root, 'common'),
    run = join(common, 'frade-workflow', 'runs', sharedId)
  await mkdir(run, { recursive: true })
  const record = sharedRecord(run)
  await mkdir(join(run, 'output'))
  await mkdir(join(run, 'prepared', 'packet'), { recursive: true })
  await writeFile(join(run, 'output', 'record.json'), JSON.stringify(record))
  const cases = [
    {
      pid: 42,
      exit: 0,
      stdout: '42 codex exec ' + sharedId + '\n',
      stderr: '',
      signal: null,
      killed: false,
    },
    {
      pid: 42,
      exit: 'ENOENT',
      stdout: '',
      stderr: '',
      signal: null,
      killed: false,
    },
    {
      pid: 42,
      exit: 1,
      stdout: '',
      stderr: 'unrelated warning',
      signal: null,
      killed: false,
    },
    {
      pid: 42,
      exit: 1,
      stdout: '',
      stderr: proxyWarning,
      signal: 'SIGTERM',
      killed: true,
    },
    { exit: 1, stdout: '', stderr: '', signal: null, killed: false },
  ]
  for (const receipt of cases) {
    const harness = review.createSharedProbeTestHarness(async () => receipt)
    const proof = await review.probeSharedReviewer(common, run, record, harness)
    assert.equal(proof.stopped, false, JSON.stringify(receipt))
    assert.deepEqual(proof.probes[0], {
      argv: ['-d', 'Ubuntu-22.04_E', '--exec', '/usr/bin/pgrep', '-af', '--', sharedId],
      ...receipt,
    })
  }
})
const head = [{ type: 'thread.started', thread_id: 'thread-1' }, { type: 'turn.started' }]
const tail = [
  {
    type: 'item.completed',
    item: { id: 'message-1', type: 'agent_message', text: report.trim() },
  },
  { type: 'turn.completed' },
]
const command = (exit_code = 0) => [
  {
    type: 'item.started',
    item: {
      id: 'command-1',
      type: 'command_execution',
      command: 'false',
      status: 'in_progress',
    },
  },
  {
    type: 'item.completed',
    item: {
      id: 'command-1',
      type: 'command_execution',
      command: 'false',
      status: 'completed',
      exit_code,
    },
  },
]
const check = (items, verdict = report) =>
  review.verifyRawReview({
    events: [...head, ...items, ...tail].map((x) => JSON.stringify(x)).join('\n') + '\n',
    report: verdict,
    exit: 0,
  })

test('CLI 0.159.3 read-only terminal PASS and FAIL messages and completed negative command remain valid', () => {
  assert.equal(check(command(1)).status, 'FAIL')
  assert.equal(
    check([
      {
        type: 'item.completed',
        item: {
          id: 'reason-1',
          type: 'reasoning',
          text: 'Read-only assessment.',
        },
      },
      ...command(0),
    ]).status,
    'FAIL',
  )
  for (const status of ['PASS', 'FAIL']) {
    const text = `GATE_STATUS: ${status}\n`
    const events = [
      ...head,
      {
        type: 'item.completed',
        item: { id: 'message-1', type: 'agent_message', text: text.trim() },
      },
      { type: 'turn.completed' },
    ]
    assert.equal(
      review.verifyRawReview({
        events: events.map((x) => JSON.stringify(x)).join('\n') + '\n',
        report: text,
        exit: 0,
      }).status,
      status,
    )
  }
})

test('CLI 0.159.3 completed error item blocks independently', () => {
  assert.equal(
    check([
      {
        type: 'item.completed',
        item: { id: 'error-1', type: 'error', text: 'failed' },
      },
    ]).status,
    'BLOCKED',
  )
})

test('CLI 0.159.3 command completed with in_progress status and null exit blocks independently', () => {
  const bad = command()
  bad[1] = {
    ...bad[1],
    item: { ...bad[1].item, status: 'in_progress', exit_code: null },
  }
  assert.equal(check(bad).status, 'BLOCKED')
})

test('CLI 0.159.3 terminal command missing status or integer exit blocks', () => {
  for (const mutation of [{ status: undefined }, { exit_code: undefined }, { exit_code: '0' }]) {
    const bad = command()
    bad[1] = { ...bad[1], item: { ...bad[1].item, ...mutation } }
    assert.equal(check(bad).status, 'BLOCKED', JSON.stringify(mutation))
  }
})

test('production failure path has no snapshot-only freeze release', async () => {
  const source = await readFile(
    process.env.REVIEW_TERMINAL_SOURCE_ASSERTION ??
      new URL('../../scripts/directions/review.mjs', import.meta.url),
    'utf8',
  )
  const production = source.slice(source.indexOf('export async function runProductionReview'))
  assert.equal(
    /if\s*\(unchanged\)\s*await rm\(locked\.lock\)/.test(production),
    false,
    'snapshot-only catch release',
  )
  assert.equal(
    production.includes('releaseReviewFreeze('),
    true,
    'production uses tested release gate',
  )
})

test('CLI 0.159.3 unknown, write, contradictory and unmatched item states block', () => {
  for (const item of [
    { id: 'x', type: 'unknown', status: 'completed' },
    { id: 'x', type: 'file_change', status: 'completed' },
    { id: 'x', type: 'reasoning', status: 'in_progress', text: 'pending' },
    { id: 'x', type: 'agent_message', status: 'failed', text: 'bad' },
  ])
    assert.equal(check([{ type: 'item.completed', item }]).status, 'BLOCKED', JSON.stringify(item))
  for (const status of ['', 'unknown', 'failed', null]) {
    const bad = command()
    bad[1] = { ...bad[1], item: { ...bad[1].item, status } }
    assert.equal(check(bad).status, 'BLOCKED', String(status))
  }
  const bad = command()
  bad[1] = { ...bad[1], item: { ...bad[1].item, id: 'other' } }
  assert.equal(check(bad).status, 'BLOCKED')
})

test('nested pinned arg0 utility links retain exactly four metadata exclusions', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'review-terminal-links-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const common = join(root, 'common'),
    shared = join(common, 'frade-workflow/runs/shared')
  const arg0 = join(shared, 'offline-home/tmp/arg0/codex-arg0qIhidS')
  const run = join(root, 'wrapper')
  await mkdir(arg0, { recursive: true })
  await mkdir(join(shared, 'output'))
  await mkdir(run)
  await writeFile(join(arg0, '.lock'), '')
  await writeFile(join(shared, 'output/record.json'), '{}')
  const fixtureTarget =
    process.platform === 'win32'
      ? join(root, 'PINNED-CODEX-RUNTIME-FIXTURE')
      : '/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/linux-runtime/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex'
  if (process.platform === 'win32') await mkdir(fixtureTarget)
  for (const name of ['applypatch', 'apply_patch', 'codex-execve-wrapper', 'codex-linux-sandbox'])
    await symlink(
      fixtureTarget,
      join(arg0, name),
      process.platform === 'win32' ? 'junction' : 'file',
    )
  const pin =
    process.platform === 'win32' ? review.createRawCaptureTestPin(fixtureTarget) : undefined
  const captured = await review.captureSharedRaw(common, shared, run, pin)
  assert.equal(captured.exclusions.length, 4)
  assert.equal(
    captured.artifacts.some((x) => x.path.endsWith('/.lock')),
    true,
  )
  assert.equal(await readFile(join(captured.root, 'output/record.json'), 'utf8'), '{}')
  await symlink(
    fixtureTarget,
    join(shared, 'output/unknown'),
    process.platform === 'win32' ? 'junction' : 'file',
  )
  const second = join(root, 'second')
  await mkdir(second)
  await assert.rejects(
    review.captureSharedRaw(common, shared, second, pin),
    /REVIEW_SHARED_RUN_LINK/,
  )
})

for (const variant of [
  'missing-cardinality',
  'wrong-name',
  'wrong-depth',
  'wrong-target',
  'duplicate-directory',
]) {
  test(`nested arg0 ${variant} link metadata blocks`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'review-terminal-bad-link-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const common = join(root, 'common'),
      shared = join(common, 'frade-workflow/runs/shared')
    const arg0 = join(shared, 'offline-home/tmp/arg0'),
      nested = join(arg0, 'codex-arg0qIhidS')
    const run = join(root, 'wrapper')
    await mkdir(nested, { recursive: true })
    await mkdir(run)
    const target =
      process.platform === 'win32'
        ? join(root, 'PINNED-CODEX-RUNTIME-FIXTURE')
        : '/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/linux-runtime/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex'
    if (process.platform === 'win32') await mkdir(target)
    if (process.platform === 'win32' && variant === 'wrong-target') await mkdir(`${target}-wrong`)
    const pin = process.platform === 'win32' ? review.createRawCaptureTestPin(target) : undefined
    const link = async (where, name, dest = target) =>
      symlink(dest, join(where, name), process.platform === 'win32' ? 'junction' : 'file')
    const names = ['applypatch', 'apply_patch', 'codex-execve-wrapper', 'codex-linux-sandbox']
    for (const name of variant === 'missing-cardinality' ? names.slice(0, 3) : names)
      await link(
        nested,
        name,
        variant === 'wrong-target' && name === 'applypatch' ? `${target}-wrong` : target,
      )
    if (variant === 'wrong-name') await link(nested, 'unapproved')
    if (variant === 'wrong-depth') await link(arg0, 'unapproved')
    if (variant === 'duplicate-directory') {
      const other = join(arg0, 'codex-arg0AaBbCc')
      await mkdir(other)
      await link(other, 'applypatch')
    }
    await assert.rejects(
      review.captureSharedRaw(common, shared, run, pin),
      /REVIEW_SHARED_RUN_LINK/,
    )
  })
}

test('failed raw retention and live reviewer subprocess keep freeze; stopped complete run releases', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'review-terminal-life-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const lock = join(root, 'freeze.json'),
    run = join(root, 'run')
  const ownerRoot = join(root, 'owner')
  await mkdir(ownerRoot)
  await exec('git', ['init', '-b', 'review-terminal'], { cwd: ownerRoot })
  await writeFile(join(ownerRoot, 'source.txt'), 'immutable')
  await exec('git', ['add', '.'], { cwd: ownerRoot })
  await exec(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-m',
      'fixture',
    ],
    { cwd: ownerRoot },
  )
  const snapshotSha256 = (await review.snapshotCandidate(ownerRoot)).digest
  const binding = {
    lock,
    run,
    ownerRoot,
    snapshotSha256,
    branch: 'review-terminal',
  }
  await mkdir(run)
  await writeFile(
    lock,
    JSON.stringify({
      run,
      owner: ownerRoot,
      snapshotSha256,
      branch: 'review-terminal',
    }),
  )
  const copied = join(run, 'shared-raw')
  await mkdir(join(copied, 'output'), { recursive: true })
  const sharedCommon = join(root, 'common')
  const sharedRun = join(sharedCommon, 'frade-workflow', 'runs', sharedId)
  await mkdir(join(sharedRun, 'output'), { recursive: true })
  await mkdir(join(sharedRun, 'prepared', 'packet'), { recursive: true })
  const record = {
    ...sharedRecord(sharedRun),
    status: 'FAIL',
    gateStatus: 'FAIL',
    resultSha256: hash(report),
  }
  const receipt = {
    status: 'FAIL',
    resultSha256: hash(report),
    candidateUnchanged: true,
    packetUnchanged: true,
  }
  await writeFile(join(sharedRun, 'output', 'record.json'), JSON.stringify(record))
  const unavailable = await review.probeSharedReviewer(
    sharedCommon,
    sharedRun,
    record,
    review.createSharedProbeTestHarness(async () => ({
      pid: 42,
      exit: 'ENOENT',
      stdout: '',
      stderr: '',
      signal: null,
      killed: false,
    })),
  )
  const stopped = await review.probeSharedReviewer(
    sharedCommon,
    sharedRun,
    record,
    review.createSharedProbeTestHarness(async () => ({
      pid: 42,
      exit: 1,
      stdout: '',
      stderr: proxyWarning,
      signal: null,
      killed: false,
    })),
  )
  assert.equal(unavailable.stopped, false)
  assert.equal(stopped.stopped, true)
  const completeEvents = [...head, ...tail].map((event) => JSON.stringify(event)).join('\n') + '\n'
  const raw = {}
  for (const [key, name, contents] of [
    ['events', 'events.jsonl', completeEvents],
    ['report', 'result.md', report],
    ['stderr', 'stderr.txt', ''],
    ['exit', 'exit.json', '{"exit":0,"timedOut":false}\n'],
  ]) {
    const path = join(run, name)
    await writeFile(path, contents)
    raw[key] = {
      path,
      bytes: Buffer.byteLength(contents),
      sha256: hash(contents),
    }
  }
  const copiedFiles = [
    ['output/events.jsonl', completeEvents],
    ['output/result.md', report],
    ['output/stderr.txt', ''],
    ['output/record.json', JSON.stringify(record)],
    ['receipt.json', JSON.stringify(receipt)],
  ]
  const artifacts = [],
    exclusions = []
  for (const [path, contents] of copiedFiles) {
    await writeFile(join(copied, path), contents)
    artifacts.push({
      path,
      bytes: Buffer.byteLength(contents),
      sha256: hash(contents),
    })
  }
  await writeFile(join(run, 'shared-raw-index.json'), JSON.stringify(artifacts))
  await writeFile(join(run, 'shared-runtime-exclusions.json'), JSON.stringify({ exclusions }))
  const captured = {
    root: copied,
    sourceRun: sharedRun,
    artifacts,
    exclusions,
    digest: hash(JSON.stringify({ artifacts, exclusions })),
  }
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'])
  t.after(() => child.kill())
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: { stopped: true },
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: await review.probeLocalProcess(child.pid),
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).run, run)
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured: { ...captured, sourceRun: join(root, 'other-run') },
        termination: stopped,
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).run, run)
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: unavailable,
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).run, run)
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, 50)
  await new Promise((resolve) => child.once('close', resolve))
  clearTimeout(timer)
  assert.equal(timedOut, true)
  await writeFile(raw.exit.path, '{"exit":0,"timedOut":true}\n')
  raw.exit = {
    ...raw.exit,
    bytes: Buffer.byteLength('{"exit":0,"timedOut":true}\n'),
    sha256: hash('{"exit":0,"timedOut":true}\n'),
  }
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: await review.probeLocalProcess(child.pid),
      })
    ).status,
    'BLOCKED',
  )
  await writeFile(raw.exit.path, '{"exit":0,"timedOut":false}\n')
  raw.exit = {
    ...raw.exit,
    bytes: Buffer.byteLength('{"exit":0,"timedOut":false}\n'),
    sha256: hash('{"exit":0,"timedOut":false}\n'),
  }
  await writeFile(join(copied, 'output/record.json'), 'broken')
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: await review.probeLocalProcess(child.pid),
      })
    ).status,
    'BLOCKED',
  )
  await writeFile(join(copied, 'output/record.json'), JSON.stringify(record))
  const replaceCaptured = async (path, contents) => {
    await writeFile(join(copied, path), contents)
    const item = artifacts.find((artifact) => artifact.path === path)
    item.bytes = Buffer.byteLength(contents)
    item.sha256 = hash(contents)
    captured.digest = hash(JSON.stringify({ artifacts, exclusions }))
    await writeFile(join(run, 'shared-raw-index.json'), JSON.stringify(artifacts))
  }
  await writeFile(raw.events.path, '{}\n')
  raw.events = {
    ...raw.events,
    bytes: Buffer.byteLength('{}\n'),
    sha256: hash('{}\n'),
  }
  await replaceCaptured('output/events.jsonl', '{}\n')
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: stopped,
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).run, run)
  await writeFile(raw.events.path, completeEvents)
  raw.events = {
    ...raw.events,
    bytes: Buffer.byteLength(completeEvents),
    sha256: hash(completeEvents),
  }
  await replaceCaptured('output/events.jsonl', completeEvents)
  await replaceCaptured('receipt.json', JSON.stringify({ ...receipt, packetUnchanged: false }))
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: stopped,
      })
    ).status,
    'BLOCKED',
  )
  assert.equal(JSON.parse(await readFile(lock, 'utf8')).run, run)
  await replaceCaptured('receipt.json', JSON.stringify(receipt))
  await writeFile(join(ownerRoot, 'source.txt'), 'changed')
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: stopped,
      })
    ).status,
    'BLOCKED',
  )
  await writeFile(join(ownerRoot, 'source.txt'), 'immutable')
  assert.equal(
    (
      await review.releaseReviewFreeze({
        ...binding,
        raw,
        captured,
        termination: stopped,
      })
    ).status,
    'RELEASED',
  )
})
