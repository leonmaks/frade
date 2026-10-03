import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
export const COMMON = 'E:/dev/codex/frade/.git'
export const sha = (value) => createHash('sha256').update(value).digest('hex')
const git = (cwd, args) =>
  execFileSync('git', ['-c', 'core.longpaths=true', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
export async function discover(cwd, expectedCommon = COMMON) {
  let root, common
  try {
    root = await fs.realpath(git(cwd, ['rev-parse', '--show-toplevel']).trim())
    common = await fs.realpath(
      git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim(),
    )
  } catch {
    throw Error('UNRELATED_REPOSITORY')
  }
  if (common !== (await fs.realpath(expectedCommon))) throw Error('UNRELATED_REPOSITORY')
  const inventory = git(root, ['worktree', 'list', '--porcelain', '-z'])
    .split('\0')
    .filter((s) => s.startsWith('worktree '))
    .map((s) => s.slice(9))
  const registered = await Promise.all(inventory.map((p) => fs.realpath(p)))
  if (!registered.includes(root)) throw Error('UNREGISTERED_WORKTREE')
  const branch = git(root, ['branch', '--show-current']).trim()
  if (!branch) throw Error('DETACHED_WORKTREE')
  return { root, common, branch, registered, head: git(root, ['rev-parse', 'HEAD']).trim() }
}
export function strictReceipt(eventsText, report, exitCode) {
  if (exitCode !== 0) throw Error('TRANSPORT_NOT_CLEAN')
  const events = eventsText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((s) => JSON.parse(s))
  if (
    events[0]?.type !== 'thread.started' ||
    !events[0].thread_id ||
    events.filter((e) => e.type === 'thread.started').length !== 1
  )
    throw Error('MISSING_THREAD')
  if (
    events.at(-1)?.type !== 'turn.completed' ||
    events.some((e) => ['error', 'turn.failed'].includes(e.type))
  )
    throw Error('INCOMPLETE_EVENT_STREAM')
  let active = false,
    completed = 0
  const explicitStarts = events.some((e) => e.type === 'turn.started')
  for (const event of events.slice(1)) {
    if (event.type === 'turn.started') {
      if (active) throw Error('INVALID_TURN_ORDER')
      active = true
    }
    if (event.type === 'turn.completed') {
      if (explicitStarts && !active) throw Error('INVALID_TURN_ORDER')
      active = false
      completed++
    }
  }
  if (active || !completed || (!explicitStarts && completed !== 1))
    throw Error('INCOMPLETE_EVENT_STREAM')
  const lines = report.replace(/\\+_/g, '_').split(/\r?\n/)
  const verdicts = lines
    .map((l) => /^[ \t]*GATE_STATUS:[ \t]*(PASS|FAIL)[ \t]*$/.exec(l))
    .filter(Boolean)
  const markers = lines.filter((l) => l.includes('GATE_STATUS:'))
  if (verdicts.length !== 1 || markers.length !== 1) throw Error('AMBIGUOUS_GATE')
  return { gateStatus: verdicts[0][1], threadId: events[0].thread_id }
}
export function replaceOnce(source, old, replacement) {
  if (source.split(old).length !== 2) throw Error('TEMPLATE_REPLACEMENT_COUNT')
  return source.replace(old, () => replacement)
}
export async function bundle(root) {
  const file = path.join(root, 'scripts/agent-review/bundle.json')
  const bytes = await fs.readFile(file),
    manifest = JSON.parse(bytes)
  if (manifest.common !== COMMON || manifest.version !== 1) throw Error('INVALID_BUNDLE')
  for (const item of manifest.files) {
    if (path.isAbsolute(item.path) || item.path.includes('..') || item.path.includes('\\'))
      throw Error('INVALID_BUNDLE_PATH')
    const p = path.join(root, item.path)
    if ((await fs.realpath(p)) !== path.resolve(p) || sha(await fs.readFile(p)) !== item.sha256)
      throw Error('BUNDLE_DRIFT:' + item.path)
  }
  return { root, manifest, digest: sha(bytes) }
}
function validatePolicyParameters(selection) {
  if (!selection) throw Error('MISSING_REVIEW_POLICY')
  if (
    typeof selection.stage !== 'string' ||
    !selection.stage.trim() ||
    !['PRE', 'POST'].includes(selection.phase) ||
    typeof selection.model !== 'string' ||
    !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(selection.model) ||
    !['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(
      selection.reasoningEffort,
    )
  )
    throw Error('INVALID_REVIEW_POLICY')
  return selection
}
export async function selectReviewPolicy(release, owner, input) {
  const selection = validatePolicyParameters(input.reviewPolicy)
  if (selection.phase !== input.phase) throw Error('POLICY_PHASE_MISMATCH')
  const source = selection.source
  if (
    !source ||
    typeof source.path !== 'string' ||
    !Array.isArray(input.paths) ||
    !input.paths.includes(source.path) ||
    typeof source.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(source.sha256) ||
    typeof source.excerpt !== 'string' ||
    !source.excerpt.trim()
  )
    throw Error('MISSING_PLAN_POLICY_SOURCE')
  const original = path.join(release.root, 'scripts/agent-review/transport')
  const integrity = await import(pathToFileURL(path.join(original, 'integrity.mjs')))
  const policy = await import(pathToFileURL(path.join(original, 'policy.mjs')))
  policy.assertAllowedArtifact(source.path, Buffer.alloc(0))
  const bytes = await integrity.rawFile(owner.root, source.path)
  policy.assertAllowedArtifact(source.path, bytes)
  verifyPlanSource(bytes, source)
  // Approval interpretation stays with the owner and independent reviewer.
  return structuredClone(selection)
}
export function verifyPlanSource(bytes, source) {
  if (sha(bytes) !== source.sha256 || !bytes.toString('utf8').includes(source.excerpt))
    throw Error('PLAN_POLICY_DRIFT')
  return true
}
export function verifyRequestedPolicy(record, selection) {
  validatePolicyParameters(selection)
  const args = record.cli?.args
  if (
    record.phase !== selection.phase ||
    record.requestedModel !== selection.model ||
    record.requestedEffort !== selection.reasoningEffort ||
    !Array.isArray(args) ||
    args.some((a) => typeof a !== 'string')
  )
    throw Error('INVOKED_POLICY_MISMATCH')
  const models = []
  const configs = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--model' || arg === '-m') models.push(args[++i])
    else if (arg.startsWith('--model=')) models.push(arg.slice('--model='.length))
    else if (arg.startsWith('-m') && arg.length > 2) models.push(arg.slice(2).replace(/^=/, ''))
    else if (arg === '-c' || arg === '--config') configs.push(args[++i])
    else if (arg.startsWith('--config=')) configs.push(arg.slice('--config='.length))
    else if (arg.startsWith('-c') && arg.length > 2) configs.push(arg.slice(2).replace(/^=/, ''))
  }
  const efforts = []
  for (const config of configs) {
    // Generated configs have bare keys. Reject quoted/escaped aliases rather than
    // silently miss a TOML key that changes the selected model or effort.
    const key = typeof config === 'string' && /^([a-z_][a-z0-9_.]*)\s*=/.exec(config)
    if (!key || key[1] === 'model' || key[1].startsWith('model_reasoning_effort.'))
      throw Error('INVOKED_POLICY_MISMATCH')
    if (key[1] === 'model_reasoning_effort') efforts.push(config)
  }
  if (
    models.length !== 1 ||
    models[0] !== selection.model ||
    efforts.length !== 1 ||
    efforts[0] !== 'model_reasoning_effort=' + JSON.stringify(selection.reasoningEffort)
  )
    throw Error('INVOKED_POLICY_MISMATCH')
  return true
}
export async function instance(release, owner, run, authority, reviewPolicy) {
  validatePolicyParameters(reviewPolicy)
  const directory = path.join(run, 'instance')
  await fs.mkdir(directory)
  const originals = path.join(release.root, 'scripts/agent-review/transport')
  const provenance = JSON.parse(await fs.readFile(path.join(originals, 'provenance.json'), 'utf8'))
  const mutations = []
  const edit = (file, text, old, replacement) => {
    mutations.push({ file, oldSha256: sha(old), newSha256: sha(replacement) })
    return replaceOnce(text, old, replacement)
  }
  for (const name of [
    'integrity.mjs',
    'policy.mjs',
    'prepare-review.mjs',
    'invoke-review.mjs',
    'transport.test.mjs',
  ]) {
    const original = await fs.readFile(path.join(originals, name)),
      item = provenance.entries.find((x) => x.path === name)
    // Enforce exact origin bytes in addition to the reviewed bundle hashes.
    if (!item || item.sha256 !== sha(original)) throw Error('ORIGIN_DRIFT')
    let text = original.toString('utf8')
    if (name === 'policy.mjs') {
      text = edit(
        name,
        text,
        "export const CANDIDATE='C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade';",
        'export const CANDIDATE=' + JSON.stringify(owner.root) + ';',
      )
      text = edit(
        name,
        text,
        "export const PROCESS_ROOT='C:/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z';",
        'export const PROCESS_ROOT=' + JSON.stringify(run) + ';',
      )
      text = edit(
        name,
        text,
        '\'model_reasoning_effort="xhigh"\'',
        [
          'project_doc_max_bytes=0',
          'project_doc_fallback_filenames=[]',
          'model_reasoning_effort=' + JSON.stringify(reviewPolicy.reasoningEffort),
        ]
          .map((value) => JSON.stringify(value))
          .join(','),
      )
    }
    if (name === 'prepare-review.mjs') {
      text = edit(
        name,
        text,
        "before.identity.branch!=='codex/frade-ui-design-contract'",
        'before.identity.branch!==' + JSON.stringify(owner.branch),
      )
      text = edit(
        name,
        text,
        "selection:'Explicit bounded source paths from the authorized UI worktree; omitted inputs are a review completeness blocker, not a waiver.'",
        "selection:'Explicit bounded paths from current registered Frade worktree; omitted inputs are a review blocker, not a waiver.'",
      )
    }
    if (['prepare-review.mjs', 'invoke-review.mjs'].includes(name))
      text = edit(
        name,
        text,
        "authorization:'openspec/changes/frade-p01-theme-core/decisions/p01-review-packet-authorization-20261001T061101Z.json'",
        'authorization:' + JSON.stringify(authority),
      )
    if (name === 'invoke-review.mjs') {
      text = edit(
        name,
        text,
        "requestedModel:'gpt-6-astra'",
        'requestedModel:' + JSON.stringify(reviewPolicy.model),
      )
      text = edit(
        name,
        text,
        "requestedEffort:'xhigh'",
        'requestedEffort:' + JSON.stringify(reviewPolicy.reasoningEffort),
      )
      text = edit(
        name,
        text,
        "'--model','gpt-6-astra'",
        "'--model'," + JSON.stringify(reviewPolicy.model),
      )
      text = edit(
        name,
        text,
        "'--ignore-user-config','--ephemeral'",
        "'--ignore-user-config','--ignore-rules','--ephemeral'",
      )
    }
    if (name === 'transport.test.mjs')
      text = edit(
        name,
        text,
        String.raw`assert.match(policy,/model_reasoning_effort="xhigh"/);`,
        'assert.ok(configs().includes(' +
          JSON.stringify('model_reasoning_effort=' + JSON.stringify(reviewPolicy.reasoningEffort)) +
          '));',
      )
    await fs.writeFile(path.join(directory, name), text, { flag: 'wx' })
  }
  await fs.writeFile(
    path.join(run, 'instance-provenance.json'),
    JSON.stringify({ release: release.digest, owner, reviewPolicy, mutations }, null, 2) + '\n',
    { flag: 'wx' },
  )
  return directory
}
export async function execute(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.longpaths',
      GIT_CONFIG_VALUE_0: 'true',
    },
  })
  let out = '',
    err = ''
  child.stdout.on('data', (b) => (out += b))
  child.stderr.on('data', (b) => (err += b))
  const exit = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
  return { command, args, cwd, exit, out, err }
}
export function validateProbe(measured, existence) {
  const names = ['allowed', 'source', 'common', 'other', 'auth', 'settings']
  if (
    measured.status !== 'PASS' ||
    measured.write ||
    !measured.network?.denied ||
    measured.rows?.length !== names.length ||
    new Set(measured.rows.map((r) => r.name)).size !== names.length
  )
    throw Error('INVALID_PROBE')
  for (const name of names) {
    const row = measured.rows.find((r) => r.name === name)
    if (!row || row.read !== (name === 'allowed')) throw Error('READ_CONFINEMENT_NOT_VERIFIED')
    if (
      name !== 'allowed' &&
      (!existence[name] || !['EACCES', 'EPERM', 'ENOENT'].includes(row.error))
    )
      throw Error('HOST_TARGET_NOT_PROVEN_OR_NOT_DENIED')
  }
  return true
}
export async function probe(release, owner, run, directory) {
  const policy = await import(pathToFileURL(path.join(directory, 'policy.mjs')))
  const packet = path.join(run, 'probe-packet'),
    offline = path.join(run, 'offline-home')
  await fs.mkdir(packet)
  await fs.mkdir(offline)
  await fs.writeFile(path.join(packet, 'allowed.txt'), 'frade-probe-allowed\n', { flag: 'wx' })
  const other = owner.registered.find((p) => p !== owner.root)
  if (!other) throw Error('MISSING_OTHER_WORKTREE_PROBE')
  const denied = {
    source: policy.linux(path.join(owner.root, 'AGENTS.md')),
    common: policy.linux(path.join(owner.common, 'HEAD')),
    other: policy.linux(path.join(other, 'AGENTS.md')),
    auth: '/mnt/c/Users/NVISEN/.codex/auth.json',
    settings: '/mnt/c/Users/NVISEN/.codex/config.toml',
  }
  const existence = {}
  for (const [name, linuxPath] of Object.entries(denied)) {
    const host = linuxPath.slice(5, 6).toUpperCase() + ':' + linuxPath.slice(6)
    existence[name] = (await fs.stat(host)).isFile()
  }
  const code = `const fs=require('fs'),net=require('net');const paths={allowed:process.cwd()+'/allowed.txt',...${JSON.stringify(denied)}};const rows=Object.entries(paths).map(([name,p])=>{try{fs.readFileSync(p);return {name,read:true}}catch(e){return {name,read:false,error:e.code}}});let write=false;try{fs.writeFileSync('forbidden.txt','x');write=true}catch{};const s=net.connect({host:'1.1.1.1',port:443});s.on('connect',()=>{console.log(JSON.stringify({rows,write,network:{denied:false},status:'FAIL'}));s.destroy()});s.on('error',e=>console.log(JSON.stringify({rows,write,network:{denied:['EPERM','EACCES'].includes(e.code)},status:!write&&rows.every(r=>r.read===(r.name==='allowed')&&(r.read||['EACCES','EPERM','ENOENT'].includes(r.error)))&&['EPERM','EACCES'].includes(e.code)?'PASS':'FAIL'})));s.setTimeout(3000,()=>{console.log(JSON.stringify({rows,write,network:{denied:false},status:'FAIL'}));s.destroy()});`
  await fs.writeFile(path.join(packet, 'probe.cjs'), code, { flag: 'wx' })
  const base = [
    '-d',
    'Ubuntu-22.04_E',
    '--exec',
    '/usr/bin/env',
    'CODEX_HOME=' + policy.linux(offline),
    policy.RUNTIME + '/node_modules/.bin/codex',
  ]
  const version = await execute('wsl.exe', [...base, '--version'], owner.root)
  if (version.exit !== 0 || version.out.trim() !== 'codex-cli 0.159.3')
    throw Error('UNSUPPORTED_CLI_VERSION')
  const result = await execute(
    'wsl.exe',
    [
      ...base,
      'sandbox',
      ...policy.configs().flatMap((c) => ['-c', c]),
      '-P',
      'frade-review',
      '--include-managed-config',
      '-C',
      policy.linux(packet),
      '/usr/bin/node',
      policy.linux(path.join(packet, 'probe.cjs')),
    ],
    owner.root,
  )
  await fs.writeFile(
    path.join(directory, 'offline-probe-b.json'),
    JSON.stringify({ atUtc: new Date().toISOString(), version, existence, ...result }, null, 2) +
      '\n',
    { flag: 'wx' },
  )
  const start = result.out.indexOf('{"rows":')
  if (
    result.exit !== 0 ||
    start < 0 ||
    !validateProbe(JSON.parse(result.out.slice(start)), existence)
  )
    throw Error('READ_CONFINEMENT_NOT_VERIFIED')
  return {
    run,
    owner: owner.root,
    status: 'PASS',
    configs: policy.configs(),
    probeSha256: sha(await fs.readFile(path.join(directory, 'offline-probe-b.json'))),
  }
}
export async function newRun(owner) {
  const run = path.join(
    owner.common,
    'frade-workflow',
    'runs',
    new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID(),
  )
  await fs.mkdir(run, { recursive: true })
  return run
}
export async function review(release, owner, input) {
  if (
    !['PRE', 'POST'].includes(input.phase) ||
    !input.scope ||
    !input.change ||
    !Array.isArray(input.paths) ||
    !input.prompt ||
    !input.policyArtifact
  )
    throw Error('INVALID_REQUEST')
  if (!input.paths.includes(input.policyArtifact)) throw Error('MISSING_POLICY_ARTIFACT')
  const selectedPolicy = await selectReviewPolicy(release, owner, input)
  const integrity = await import(
    pathToFileURL(path.join(release.root, 'scripts/agent-review/transport/integrity.mjs'))
  )
  const policyBytes = await integrity.rawFile(owner.root, input.policyArtifact)
  if (sha(policyBytes) !== release.manifest.policySha256) throw Error('POLICY_ADOPTION_DRIFT')
  const run = await newRun(owner),
    directory = await instance(release, owner, run, input.policyArtifact, selectedPolicy)
  try {
    await fs.writeFile(path.join(run, 'input.json'), JSON.stringify(input, null, 2) + '\n', {
      flag: 'wx',
    })
    await probe(release, owner, run, directory)
    const request = {
      phase: input.phase,
      scope: input.scope,
      paths: input.paths,
      prepared: path.join(run, 'prepared'),
      prompt: path.join(run, 'prompt.md'),
      run: path.join(run, 'output'),
    }
    const policyPrompt =
      '\n\nApproved owning stage selection (verify semantic plan approval; metadata is not approval):\n' +
      JSON.stringify(selectedPolicy, null, 2) +
      '\n'
    await fs.writeFile(request.prompt, input.prompt + policyPrompt, { flag: 'wx' })
    const requestFile = path.join(run, 'request.json')
    await fs.writeFile(requestFile, JSON.stringify(request, null, 2) + '\n', { flag: 'wx' })
    const before = await bundle(release.root),
      inputHash = sha(JSON.stringify(input))
    const prepared = await execute(
      process.execPath,
      [path.join(directory, 'prepare-review.mjs'), requestFile],
      owner.root,
    )
    await fs.writeFile(
      path.join(run, 'prepare-execution.json'),
      JSON.stringify(prepared, null, 2) + '\n',
      { flag: 'wx' },
    )
    if (prepared.exit !== 0) throw Error('PREPARE_BLOCKED:' + run)
    verifyPlanSource(
      await integrity.rawFile(path.join(request.prepared, 'packet'), selectedPolicy.source.path),
      selectedPolicy.source,
    )
    const invoked = await execute(
      process.execPath,
      [path.join(directory, 'invoke-review.mjs'), requestFile],
      owner.root,
    )
    await fs.writeFile(
      path.join(run, 'invoke-execution.json'),
      JSON.stringify(invoked, null, 2) + '\n',
      { flag: 'wx' },
    )
    let receipt = {
      atUtc: new Date().toISOString(),
      run,
      owner,
      change: input.change,
      phase: input.phase,
      scope: input.scope,
      status: 'BLOCKED',
      release: release.digest,
      inputSha256: inputHash,
      reviewPolicy: selectedPolicy,
      requestedModel: selectedPolicy.model,
      requestedEffort: selectedPolicy.reasoningEffort,
      actualBackend: 'NOT_CONFIRMED',
      actualEffort: 'NOT_CONFIRMED',
    }
    try {
      const record = JSON.parse(await fs.readFile(path.join(request.run, 'record.json'), 'utf8'))
      verifyRequestedPolicy(record, selectedPolicy)
      if (sha(await fs.readFile(path.join(request.run, 'result.md'))) !== record.resultSha256)
        throw Error('REVIEW_RESULT_DRIFT')
      const verdict = strictReceipt(
        await fs.readFile(path.join(request.run, 'events.jsonl'), 'utf8'),
        await fs.readFile(path.join(request.run, 'result.md'), 'utf8'),
        record.exitCode,
      )
      if (
        !record.candidateUnchanged ||
        !record.packetUnchanged ||
        record.status !== verdict.gateStatus ||
        record.error ||
        invoked.exit !== (verdict.gateStatus === 'PASS' ? 0 : 1) ||
        (await bundle(release.root)).digest !== before.digest
      )
        throw Error('INTEGRITY_NOT_VERIFIED')
      receipt = {
        ...receipt,
        ...verdict,
        status: verdict.gateStatus,
        resultSha256: record.resultSha256,
        candidateUnchanged: true,
        packetUnchanged: true,
      }
    } catch (e) {
      receipt.error = String(e)
    }
    await fs.writeFile(path.join(run, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', {
      flag: 'wx',
    })
    return receipt
  } catch (e) {
    const receipt = {
      atUtc: new Date().toISOString(),
      run,
      owner,
      change: input.change,
      phase: input.phase,
      scope: input.scope,
      status: 'BLOCKED',
      error: String(e),
      release: release.digest,
      reviewPolicy: selectedPolicy,
      requestedModel: selectedPolicy.model,
      requestedEffort: selectedPolicy.reasoningEffort,
      actualBackend: 'NOT_CONFIRMED',
      actualEffort: 'NOT_CONFIRMED',
    }
    await fs.writeFile(path.join(run, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', {
      flag: 'wx',
    })
    return receipt
  }
}
