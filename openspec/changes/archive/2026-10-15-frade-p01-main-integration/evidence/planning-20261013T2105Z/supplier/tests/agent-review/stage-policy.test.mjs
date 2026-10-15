import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import * as api from '../../scripts/agent-review/core.mjs'

const releaseRoot = path.resolve('.')
async function fixture(model = 'gpt-6-sol', reasoningEffort = 'high', phase = 'PRE') {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frade-stage-policy-'))
  const root = path.join(temp, 'source')
  await fs.mkdir(root)
  const excerpt = `| fixture-stage | ${phase} | ${model} | ${reasoningEffort} |`
  const bytes = Buffer.from('# Approved fixture plan\r\n' + excerpt + '\r\n')
  await fs.writeFile(path.join(root, 'plan.md'), bytes)
  const owner = { root: await fs.realpath(root), branch: 'codex/stage-fixture' }
  const input = {
    change: 'fixture-change',
    phase,
    paths: ['plan.md'],
    reviewPolicy: {
      stage: 'fixture-stage',
      phase,
      model,
      reasoningEffort,
      source: { path: 'plan.md', sha256: api.sha(bytes), excerpt },
    },
  }
  return { temp, owner, input, release: { root: releaseRoot, digest: 'fixture-release' } }
}

test('generated command and metadata honor both stage assignments without editing templates', async () => {
  const original = await fs.readFile(
    path.join(releaseRoot, 'scripts/agent-review/transport/invoke-review.mjs'),
  )
  for (const [model, effort] of [
    ['gpt-6-sol', 'high'],
    ['gpt-6-astra', 'xhigh'],
  ]) {
    const f = await fixture(model, effort)
    try {
      const run = path.join(f.temp, 'run')
      await fs.mkdir(run)
      const directory = await api.instance(f.release, f.owner, run, 'plan.md', f.input.reviewPolicy)
      const policy = await import(pathToFileURL(path.join(directory, 'policy.mjs')))
      assert.ok(
        policy.configs().includes(`model_reasoning_effort=${JSON.stringify(effort)}`),
        model,
      )
      const code = await fs.readFile(path.join(directory, 'invoke-review.mjs'), 'utf8')
      const expression = /const args=(\[[^\n]*?\]);record.cli=/.exec(code)
      assert.ok(expression, 'actual generated launcher args exist')
      const args = vm.runInNewContext(
        expression[1],
        {
          RUNTIME: '/public-runtime',
          configs: policy.configs,
          linux: (p) => p,
          record: { packet: '/packet' },
          resolve: path.resolve,
          run,
        },
        { timeout: 1000 },
      )
      assert.equal(args[args.indexOf('--model') + 1], model)
      assert.equal(args.filter((a) => a === '--model').length, 1)
      assert.equal(args.filter((a) => /^model_reasoning_effort\s*=/.test(a)).length, 1)
      const metadata = /requestedModel:([^,]+),requestedEffort:([^,]+)/.exec(code)
      assert.ok(metadata)
      const recorded = vm.runInNewContext(
        `({requestedModel:${metadata[1]},requestedEffort:${metadata[2]}})`,
      )
      assert.equal(recorded.requestedModel, model)
      assert.equal(recorded.requestedEffort, effort)
      const provenance = JSON.parse(
        await fs.readFile(path.join(run, 'instance-provenance.json'), 'utf8'),
      )
      assert.deepEqual(provenance.reviewPolicy, f.input.reviewPolicy)
      for (const name of [
        'policy.mjs',
        'invoke-review.mjs',
        'prepare-review.mjs',
        'transport.test.mjs',
      ]) {
        execFileSync(process.execPath, ['--check', path.join(directory, name)], { stdio: 'pipe' })
      }
      execFileSync('git', ['init', '-b', f.owner.branch], { cwd: f.owner.root, stdio: 'pipe' })
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
        { cwd: f.owner.root, stdio: 'pipe' },
      )
      const request = {
        phase: 'PRE',
        scope: 'fixture approved stage',
        paths: ['plan.md'],
        prepared: path.join(run, 'prepared'),
      }
      const requestFile = path.join(run, 'request.json')
      await fs.writeFile(requestFile, JSON.stringify(request))
      const prepared = await api.execute(
        process.execPath,
        [path.join(directory, 'prepare-review.mjs'), requestFile],
        f.owner.root,
      )
      assert.equal(prepared.exit, 0, prepared.err)
      assert.deepEqual(
        await fs.readFile(path.join(request.prepared, 'packet/plan.md')),
        await fs.readFile(path.join(f.owner.root, 'plan.md')),
      )
    } finally {
      await fs.rm(f.temp, { recursive: true, force: true })
    }
  }
  assert.deepEqual(
    await fs.readFile(path.join(releaseRoot, 'scripts/agent-review/transport/invoke-review.mjs')),
    original,
  )
})

test('exact plan provenance selects each phase assignment and rejects omissions or drift', async () => {
  for (const phase of ['PRE', 'POST']) {
    const f = await fixture('gpt-6-sol', 'high', phase)
    try {
      const selected = await api.selectReviewPolicy(f.release, f.owner, f.input)
      assert.equal(selected.model, 'gpt-6-sol')
      assert.equal(selected.reasoningEffort, 'high')
      assert.equal(selected.phase, phase)
      assert.equal(selected.source.sha256, f.input.reviewPolicy.source.sha256)
      const copies = [
        { ...f.input, reviewPolicy: undefined },
        { ...f.input, reviewPolicy: { ...f.input.reviewPolicy, stage: '' } },
        { ...f.input, reviewPolicy: { ...f.input.reviewPolicy, model: '' } },
        { ...f.input, reviewPolicy: { ...f.input.reviewPolicy, model: 'gpt-6-sol";exit(0)' } },
        { ...f.input, reviewPolicy: { ...f.input.reviewPolicy, reasoningEffort: '' } },
        { ...f.input, reviewPolicy: { ...f.input.reviewPolicy, reasoningEffort: 'high/xhigh' } },
        {
          ...f.input,
          reviewPolicy: { ...f.input.reviewPolicy, phase: phase === 'PRE' ? 'POST' : 'PRE' },
        },
        { ...f.input, paths: [] },
        {
          ...f.input,
          reviewPolicy: {
            ...f.input.reviewPolicy,
            source: { ...f.input.reviewPolicy.source, sha256: '0'.repeat(64) },
          },
        },
        {
          ...f.input,
          reviewPolicy: {
            ...f.input.reviewPolicy,
            source: { ...f.input.reviewPolicy.source, excerpt: 'absent assignment' },
          },
        },
        {
          ...f.input,
          reviewPolicy: {
            ...f.input.reviewPolicy,
            source: { ...f.input.reviewPolicy.source, excerpt: '' },
          },
        },
      ]
      for (const input of copies)
        await assert.rejects(() => api.selectReviewPolicy(f.release, f.owner, input), /POLICY|PLAN/)
      await fs.appendFile(path.join(f.owner.root, 'plan.md'), '\nplan changed\n')
      await assert.rejects(() => api.selectReviewPolicy(f.release, f.owner, f.input), /PLAN/)
    } finally {
      await fs.rm(f.temp, { recursive: true, force: true })
    }
  }
})

test('receipt rejects mismatched actual model, effort, role and duplicate overrides', () => {
  const policy = {
    stage: 'fixture-stage',
    phase: 'PRE',
    model: 'gpt-6-sol',
    reasoningEffort: 'high',
  }
  const args = ['--model', 'gpt-6-sol', '-c', 'model_reasoning_effort="high"']
  const record = {
    phase: 'PRE',
    requestedModel: policy.model,
    requestedEffort: policy.reasoningEffort,
    cli: { args },
  }
  assert.equal(api.verifyRequestedPolicy(record, policy), true)
  for (const bad of [
    { ...record, requestedModel: 'gpt-6-astra' },
    { ...record, requestedEffort: 'xhigh' },
    { ...record, phase: 'POST' },
    { ...record, cli: { args: ['--model', 'gpt-6-astra', '-c', 'model_reasoning_effort="high"'] } },
    { ...record, cli: { args: ['--model', 'gpt-6-sol', '-c', 'model_reasoning_effort="xhigh"'] } },
    { ...record, cli: { args: [...args, '--model', 'gpt-6-sol'] } },
    { ...record, cli: { args: [...args, '-c', 'model_reasoning_effort = "high"'] } },
    { ...record, cli: { args: ['--model', 'gpt-6-sol', 'model_reasoning_effort="high"'] } },
  ])
    assert.throws(() => api.verifyRequestedPolicy(bad, policy), /POLICY/)
})

test('missing stage selection cannot silently generate a default instance', async () => {
  const f = await fixture()
  try {
    const run = path.join(f.temp, 'run')
    await fs.mkdir(run)
    await assert.rejects(() => api.instance(f.release, f.owner, run, 'plan.md'), /POLICY/)
    assert.deepEqual(await fs.readdir(run), [], 'no instance produced before policy validation')
  } finally {
    await fs.rm(f.temp, { recursive: true, force: true })
  }
})

test('prepared plan is bound to the earlier selected hash even if it changes before preparation', async () => {
  const f = await fixture()
  try {
    const selected = await api.selectReviewPolicy(f.release, f.owner, f.input)
    const run = path.join(f.temp, 'run')
    await fs.mkdir(run)
    const directory = await api.instance(f.release, f.owner, run, 'plan.md', selected)
    execFileSync('git', ['init', '-b', f.owner.branch], { cwd: f.owner.root, stdio: 'pipe' })
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
      { cwd: f.owner.root, stdio: 'pipe' },
    )
    const source = path.join(f.owner.root, 'plan.md')
    const original = await fs.readFile(source)
    await fs.appendFile(source, '\nChanged after selection, before source freeze\n')
    const request = {
      phase: 'PRE',
      scope: 'fixture approved stage',
      paths: ['plan.md'],
      prepared: path.join(run, 'prepared'),
    }
    const requestFile = path.join(run, 'request.json')
    await fs.writeFile(requestFile, JSON.stringify(request))
    const prepared = await api.execute(
      process.execPath,
      [path.join(directory, 'prepare-review.mjs'), requestFile],
      f.owner.root,
    )
    assert.equal(prepared.exit, 0, prepared.err)
    const packet = await fs.readFile(path.join(request.prepared, 'packet/plan.md'))
    assert.notDeepEqual(
      packet,
      original,
      'new candidate is internally consistent but its selection is stale',
    )
    assert.throws(() => api.verifyPlanSource(packet, selected.source), /PLAN_POLICY_DRIFT/)
    assert.equal(api.verifyPlanSource(original, selected.source), true)
  } finally {
    await fs.rm(f.temp, { recursive: true, force: true })
  }
})

test('POST-B01 supported config/model spellings cannot hide duplicate or conflicting overrides', () => {
  const selection = { stage: 'fixture', phase: 'POST', model: 'gpt-6-sol', reasoningEffort: 'high' }
  const args = ['--model', 'gpt-6-sol', '-c', 'model_reasoning_effort="high"']
  const record = (actual) => ({
    phase: 'POST',
    requestedModel: selection.model,
    requestedEffort: selection.reasoningEffort,
    cli: { args: actual },
  })
  for (const extra of [
    ['--config=model_reasoning_effort="xhigh"'],
    ['--config=model_reasoning_effort="high"'],
    ['--config', 'model_reasoning_effort="xhigh"'],
    ['-cmodel_reasoning_effort="xhigh"'],
    ['-c=model_reasoning_effort="xhigh"'],
    ['-c', '"model_reasoning_effort"="xhigh"'],
    ['-c', '"model_reasoning_effor\\u0074"="xhigh"'],
    ['-mgpt-6-astra'],
    ['-m=gpt-6-astra'],
    ['-c', 'model="gpt-6-astra"'],
  ])
    assert.throws(
      () => api.verifyRequestedPolicy(record([...args, ...extra]), selection),
      /INVOKED_POLICY_MISMATCH/,
    )
  for (const actual of [
    ['--model=gpt-6-sol', '--config=model_reasoning_effort="high"'],
    ['-m', 'gpt-6-sol', '--config', 'model_reasoning_effort="high"'],
    ['-mgpt-6-sol', '-cmodel_reasoning_effort="high"'],
    ['-m=gpt-6-sol', '-c=model_reasoning_effort="high"'],
  ])
    assert.equal(api.verifyRequestedPolicy(record(actual), selection), true)
})
