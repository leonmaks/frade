import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const fixturePolicy = {
  stage: 'existing-control-fixture',
  phase: 'PRE',
  model: 'gpt-6-astra',
  reasoningEffort: 'xhigh',
}
const baseline = process.env.FRADE_REVIEW_BASELINE === 'v3'
const legacy = await import('../../scripts/agent-review/transport/policy.mjs')
const api = baseline
  ? { strictReceipt: legacy.parseVerdict, discover: async () => ({ root: legacy.CANDIDATE }) }
  : await import('../../scripts/agent-review/core.mjs')
const stream = await fs.readFile(new URL('./fixtures/valid-cli.jsonl', import.meta.url), 'utf8')
const complete =
  JSON.stringify({ type: 'thread.started', thread_id: 'test-thread' }) +
  '\n' +
  JSON.stringify({ type: 'turn.started' }) +
  '\n' +
  JSON.stringify({ type: 'turn.completed' }) +
  '\n'
test('actual successful CLI stream and one-line PASS/FAIL are accepted', () => {
  assert.equal(api.strictReceipt(stream, 'GATE_STATUS: PASS\n', 0).gateStatus, 'PASS')
  assert.equal(api.strictReceipt(complete, 'GATE_STATUS: FAIL\n', 0).gateStatus, 'FAIL')
})
test('split-line verdict is rejected', () =>
  assert.throws(() => api.strictReceipt(complete, 'GATE_STATUS:\nPASS\n', 0)))
test('completed turn followed by incomplete turn is rejected', () =>
  assert.throws(() =>
    api.strictReceipt(
      complete + JSON.stringify({ type: 'turn.started' }) + '\n',
      'GATE_STATUS: PASS\n',
      0,
    ),
  ))
test('errors, duplicate verdict, nonzero, trailing item and missing thread fail closed', () => {
  for (const [s, r, c] of [
    [complete, 'GATE_STATUS: PASS\nGATE_STATUS: FAIL\n', 0],
    [complete, 'GATE_STATUS: PASS\n', 2],
    [complete + JSON.stringify({ type: 'error' }), 'GATE_STATUS: PASS\n', 0],
    [complete + JSON.stringify({ type: 'item.completed' }), 'GATE_STATUS: PASS\n', 0],
    [JSON.stringify({ type: 'turn.completed' }), 'GATE_STATUS: PASS\n', 0],
  ])
    assert.throws(() => api.strictReceipt(s, r, c))
})
test('registered worktree is discovered and unrelated repository with same origin rejected', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frade-workflow-test-'))
  try {
    const primary = path.join(temp, 'primary'),
      other = path.join(temp, 'routing'),
      foreign = path.join(temp, 'foreign')
    await fs.mkdir(primary)
    await fs.mkdir(foreign)
    const git = (cwd, ...args) =>
      execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' })
    git(primary, 'init')
    git(
      primary,
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--allow-empty',
      '-m',
      'fixture',
    )
    git(primary, 'remote', 'add', 'origin', 'git@example.invalid:frade.git')
    git(primary, 'worktree', 'add', '-b', 'codex/routing', other)
    git(foreign, 'init')
    git(foreign, 'remote', 'add', 'origin', 'git@example.invalid:frade.git')
    const common = path.join(primary, '.git')
    assert.equal((await api.discover(other, common)).root, await fs.realpath(other))
    await assert.rejects(() => api.discover(foreign, common), /UNRELATED/)
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
})

test('generated instance prepares exact registered owner, keeps original bytes and isolates controls', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frade-instance-test-'))
  try {
    const source = path.join(temp, 'source'),
      run = path.join(temp, 'run')
    await fs.mkdir(source)
    await fs.mkdir(run)
    execFileSync('git', ['init', '-b', 'codex/quoted-owner'], { cwd: source, stdio: 'pipe' })
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '--allow-empty',
        '-m',
        'fixture',
      ],
      { cwd: source, stdio: 'pipe' },
    )
    await fs.writeFile(path.join(source, 'one.txt'), 'raw\r\nbytes\n')
    const root = path.resolve('scripts/agent-review/../..'),
      owner = { root: await fs.realpath(source), branch: 'codex/quoted-owner' }
    const original = await fs.readFile(path.join(root, 'scripts/agent-review/transport/policy.mjs'))
    const generated = await api.instance(
      { root, digest: 'fixture' },
      owner,
      run,
      'one.txt',
      fixturePolicy,
    )
    assert.deepEqual(
      await fs.readFile(path.join(root, 'scripts/agent-review/transport/policy.mjs')),
      original,
    )
    const policy = await import(
      (await import('node:url')).pathToFileURL(path.join(generated, 'policy.mjs'))
    )
    assert.equal(policy.CANDIDATE, owner.root)
    assert.ok(policy.configs().includes('project_doc_max_bytes=0'))
    assert.ok(policy.configs().includes('project_doc_fallback_filenames=[]'))
    assert.match(
      await fs.readFile(path.join(generated, 'invoke-review.mjs'), 'utf8'),
      /--ignore-rules/,
    )
    const request = {
      phase: 'PRE',
      scope: 'fixture scope',
      paths: ['one.txt'],
      prepared: path.join(run, 'prepared'),
    }
    const req = path.join(run, 'request.json')
    await fs.writeFile(req, JSON.stringify(request))
    const result = await api.execute(
      process.execPath,
      [path.join(generated, 'prepare-review.mjs'), req],
      source,
    )
    assert.equal(result.exit, 0, result.err)
    const manifest = JSON.parse(
      await fs.readFile(path.join(request.prepared, 'packet/REVIEW-PACKET-MANIFEST.json'), 'utf8'),
    )
    assert.equal(manifest.candidate.branch, owner.branch)
    assert.equal(manifest.authorization, 'one.txt')
    assert.doesNotMatch(manifest.selection, /UI worktree/)
    assert.deepEqual(
      await fs.readFile(path.join(request.prepared, 'packet/one.txt')),
      await fs.readFile(path.join(source, 'one.txt')),
    )
    assert.throws(() => api.replaceOnce('a a', 'a', 'b'), /COUNT/)
    assert.throws(() => api.replaceOnce('x', 'a', 'b'), /COUNT/)
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
})

test('hidden existing mounts prove denial; missing host targets cannot count as isolation proof', () => {
  const rows = ['allowed', 'source', 'common', 'other', 'auth', 'settings'].map((name) => ({
    name,
    read: name === 'allowed',
    error: name === 'allowed' ? undefined : 'ENOENT',
  }))
  const measured = { rows, write: false, network: { denied: true }, status: 'PASS' }
  const existence = Object.fromEntries(
    rows.filter((r) => r.name !== 'allowed').map((r) => [r.name, true]),
  )
  assert.equal(api.validateProbe(measured, existence), true)
  assert.throws(() => api.validateProbe(measured, { ...existence, auth: false }))
  assert.throws(() => api.validateProbe({ ...measured, write: true }, existence))
  assert.throws(() => api.validateProbe({ ...measured, network: { denied: false } }, existence))
  assert.throws(() =>
    api.validateProbe(
      { ...measured, rows: [...rows, { name: 'extra', read: false, error: 'ENOENT' }] },
      existence,
    ),
  )
})

test('publication cannot accept a replaced report even when all public file hashes match', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frade-publish-test-'))
  try {
    const proof = path.join(temp, 'proof'),
      packet = path.join(temp, 'packet')
    await fs.mkdir(proof)
    await fs.mkdir(packet)
    const root = path.resolve('.'),
      release = await api.bundle(root),
      files = [
        ...release.manifest.files,
        { path: 'scripts/agent-review/bundle.json', sha256: release.digest },
      ]
    for (const f of files) {
      const target = path.join(packet, f.path)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(path.join(root, f.path), target)
    }
    const manifest = { phase: 'POST', candidate: { branch: 'codex/fixture' }, artifacts: files }
    const bytes = Buffer.from(JSON.stringify(manifest))
    await fs.writeFile(path.join(packet, 'REVIEW-PACKET-MANIFEST.json'), bytes)
    await fs.writeFile(path.join(proof, 'events.jsonl'), complete)
    await fs.writeFile(path.join(proof, 'result.md'), 'GATE_STATUS: PASS\n')
    const origins = JSON.parse(
      await fs.readFile(path.join(root, 'scripts/agent-review/transport/provenance.json'), 'utf8'),
    )
    const record = {
      run: proof,
      phase: 'POST',
      status: 'PASS',
      exitCode: 0,
      candidate: root,
      candidateUnchanged: true,
      packetUnchanged: true,
      packet,
      packetManifestSha256: api.sha(bytes),
      resultSha256: api.sha('original report before tamper'),
      toolchain: origins.entries
        .filter((e) => e.path.endsWith('.mjs'))
        .map((e) => ({ path: e.path, sha256: e.sha256 })),
    }
    await fs.writeFile(path.join(proof, 'record.json'), JSON.stringify(record))
    const { publish } = await import('../../scripts/agent-review/publish.mjs')
    await assert.rejects(
      () =>
        publish(
          release,
          { root, common: path.join(temp, 'common'), branch: 'codex/fixture' },
          proof,
        ),
      /RESULT_DRIFT/,
    )
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
})

test('legal dollar refs and paths survive literal generated-instance preparation', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frade-dollar-refs-'))
  try {
    const root = path.resolve('.')
    for (const [index, branch] of [
      'codex/$&',
      'codex/$$',
      "codex/$'",
      'codex/$`',
      'codex/"owner',
    ].entries()) {
      const source = path.join(temp, 'source$&-' + index),
        run = path.join(temp, 'run-' + index)
      await fs.mkdir(source)
      await fs.mkdir(run)
      execFileSync('git', ['check-ref-format', '--branch', branch], { stdio: 'pipe' })
      execFileSync('git', ['init', '-b', 'codex/fixture-base'], { cwd: source, stdio: 'pipe' })
      execFileSync(
        'git',
        [
          '-c',
          'user.name=Fixture',
          '-c',
          'user.email=fixture@example.invalid',
          'commit',
          '--allow-empty',
          '-m',
          'fixture',
        ],
        { cwd: source, stdio: 'pipe' },
      )
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: source,
        encoding: 'utf8',
      }).trim()
      // Packed refs preserve valid Git names that Windows cannot store as loose filenames.
      await fs.writeFile(
        path.join(source, '.git/packed-refs'),
        '# pack-refs with: peeled\n' + commit + ' refs/heads/' + branch + '\n',
      )
      execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/' + branch], {
        cwd: source,
        stdio: 'pipe',
      })
      const authority = 'one$&.txt'
      await fs.writeFile(path.join(source, authority), 'raw literal owner\n')
      const owner = { root: await fs.realpath(source), branch },
        generated = await api.instance(
          { root, digest: 'fixture' },
          owner,
          run,
          authority,
          fixturePolicy,
        )
      const request = {
        phase: 'PRE',
        scope: 'literal dollar fixture',
        paths: [authority],
        prepared: path.join(run, 'prepared'),
      }
      const input = path.join(run, 'request.json')
      await fs.writeFile(input, JSON.stringify(request))
      const result = await api.execute(
        process.execPath,
        [path.join(generated, 'prepare-review.mjs'), input],
        source,
      )
      assert.equal(result.exit, 0, result.err)
      const manifest = JSON.parse(
        await fs.readFile(
          path.join(request.prepared, 'packet/REVIEW-PACKET-MANIFEST.json'),
          'utf8',
        ),
      )
      assert.equal(manifest.candidate.branch, branch)
      assert.equal(manifest.authorization, authority)
    }
  } finally {
    await fs.rm(temp, { recursive: true, force: true })
  }
})
