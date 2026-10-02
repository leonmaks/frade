import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fixture, invoke } from './bootstrap.test.mjs'
import { safeOwnerPath } from '../../scripts/directions/contracts.mjs'

const git = (cwd, ...args) => {
  const run = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' })
  assert.equal(run.status, 0, `${args.join(' ')}: ${run.stderr}`)
  return run.stdout.trim()
}

test('I23-01 Git common exception is limited to final .git component', () => {
  assert.equal(safeOwnerPath('C:/repo/.git', { gitCommon: true }), true)
  assert.equal(safeOwnerPath('C:/repo/.git'), false)
  assert.equal(safeOwnerPath('C:/repo/.git/owner', { gitCommon: true }), false)
  assert.equal(safeOwnerPath('/repo/.git', { gitCommon: true }), true)
  assert.equal(safeOwnerPath('/repo/.git'), false)
  assert.equal(safeOwnerPath('/repo/../.git', { gitCommon: true }), false)
})

test('I23-01 native separators normalize only on Windows request boundary', async () => {
  const f = fixture()
  f.authorize()
  for (const key of ['sourceRoot', 'gitCommon', 'workspaceParent'])
    f.request[key] = f.request[key].replaceAll('/', '\\')
  f.save()
  const result = await invoke(f.root, 'plan', f.requestFile)
  if (process.platform === 'win32') assert.equal(result.status, 0, JSON.stringify(result.body))
  else assert.equal(result.status, 2)
})

test('I23-02 registered secondary source creates under matching common', async () => {
  const f = fixture()
  const secondary = join(f.base, 'secondary')
  git(f.root, 'worktree', 'add', '--detach', secondary, f.baseline)
  f.request.sourceRoot = secondary.replaceAll('\\', '/')
  f.save()
  f.authorize()
  const planned = await invoke(secondary, 'plan', f.requestFile)
  assert.equal(planned.status, 0, JSON.stringify(planned.body))
  const created = await invoke(secondary, 'create', f.requestFile)
  assert.equal(created.status, 0, JSON.stringify(created.body))
  assert.equal(
    git(created.body.worktree, 'rev-parse', '--git-common-dir').replaceAll('\\', '/'),
    f.common,
  )
})

test('I23-02 whole foreign repository switch is rejected before source access', async () => {
  const f = fixture()
  f.authorize()
  const foreign = join(f.base, 'foreign')
  mkdirSync(foreign)
  git(foreign, 'init', '-q')
  f.request.sourceRoot = foreign.replaceAll('\\', '/')
  f.request.gitCommon = join(foreign, '.git').replaceAll('\\', '/')
  f.save()
  const result = await invoke(foreign, 'create', f.requestFile)
  assert.equal(result.status, 2)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
  const { trustedBootstrapFixtureContext } = await import('../../scripts/directions/bootstrap.mjs')
  const trustedContext = await trustedBootstrapFixtureContext(f.common, {
    status: 'AVAILABLE',
    release: f.request.policy.release,
    policyVersion: 'fixture-1',
    policy: join(
      f.common,
      'frade-workflow/releases',
      f.request.policy.release,
      'docs/engineering/agent-workflow.md',
    ),
  })
  f.request.gitCommon = f.common
  f.save()
  const switched = await invoke(foreign, 'create', f.requestFile, { trustedContext })
  assert.equal(switched.status, 2)
  assert.match(switched.body.detail, /FOREIGN_GIT_COMMON/)
})

test('I23-06 an unverified release cannot authorize creation', async () => {
  const f = fixture()
  f.authorize()
  const modules = ['cli.mjs', 'bootstrap.mjs', 'contracts.mjs']
  const fixtureModules = join(f.root, 'scripts/directions')
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
  mkdirSync(fixtureModules, { recursive: true })
  for (const name of modules) {
    const source = fileURLToPath(new URL(`../../scripts/directions/${name}`, import.meta.url))
    const copied = join(fixtureModules, name)
    assert.equal(lstatSync(source).isFile(), true, name)
    copyFileSync(source, copied)
    assert.equal(lstatSync(copied).isFile(), true, name)
    assert.equal(sha256(readFileSync(copied)), sha256(readFileSync(source)), name)
  }
  const cli = join(
    f.common,
    'frade-workflow/releases',
    f.request.policy.release,
    'scripts/agent-review/cli.mjs',
  )
  writeFileSync(cli, 'console.log("AVAILABLE")\n')
  const worktreesBefore = git(f.root, 'worktree', 'list', '--porcelain')
  const fixtureCli = join(fixtureModules, 'cli.mjs')
  const args = [fixtureCli, 'create', f.requestFile]
  const run = spawnSync(process.execPath, args, {
    cwd: f.root,
    encoding: 'utf8',
  })
  let stdout = run.stdout
  let status = run.status
  if (run.error?.code === 'EPERM' && process.platform !== 'win32') {
    assert.equal(run.error.path, process.execPath)
    assert.deepEqual(run.error.spawnargs, args)
    // The Linux sandbox denies nested Node processes. Evaluate the same copied CLI instead.
    const previous = {
      argv: process.argv,
      cwd: process.cwd(),
      exitCode: process.exitCode,
      write: process.stdout.write,
    }
    stdout = ''
    try {
      process.argv = [process.execPath, fixtureCli, 'create', f.requestFile]
      process.chdir(f.root)
      process.exitCode = undefined
      process.stdout.write = (chunk) => {
        if (typeof chunk === 'string' && chunk.startsWith('{"ok":')) {
          stdout += chunk
          return true
        }
        return previous.write.call(process.stdout, chunk)
      }
      await import(pathToFileURL(fixtureCli).href)
      status = process.exitCode ?? 0
    } finally {
      process.stdout.write = previous.write
      process.exitCode = previous.exitCode
      process.chdir(previous.cwd)
      process.argv = previous.argv
    }
  } else {
    assert.equal(run.error, undefined)
    assert.ok(run.pid > 0)
  }
  const outcomeLines = stdout.trim().split(/\r?\n/).filter((line) => line.startsWith('{"ok":'))
  assert.equal(outcomeLines.length, 1, stdout)
  const body = JSON.parse(outcomeLines[0])
  assert.equal(status, 2)
  assert.equal(body.code, 'NOT_CONFIGURED')
  assert.equal(body.detail, 'CONTROL_NOT_CONFIGURED')
  assert.equal(existsSync(join(f.common, 'frade-workflow/intents')), false)
  assert.equal(existsSync(join(f.common, 'frade-workflow/intents', `${f.request.id}.json`)), false)
  assert.equal(git(f.root, 'worktree', 'list', '--porcelain'), worktreesBefore)
  assert.equal(existsSync(join(f.parent, f.request.id)), false)
})

test('I23-03 seed declares exact capability and strict draft obligation', async () => {
  const f = fixture()
  f.authorize()
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  const change = join(result.body.worktree, 'openspec/changes', f.request.id)
  assert.equal(existsSync(join(change, 'specs', f.request.id, 'spec.md')), true)
  const spec = readFileSync(join(change, 'specs', f.request.id, 'spec.md'), 'utf8')
  assert.match(spec, /\bSHALL\b/)
  assert.match(spec, /#### Scenario:/)
  assert.match(readFileSync(join(change, 'proposal.md'), 'utf8'), /## Capabilities/)
  assert.equal(existsSync(join(change, 'specs/direction/spec.md')), false)
})

test('I23-04 Git worktree checkout cannot run hooks or smudge filter', async () => {
  const f = fixture()
  f.authorize()
  const hook = join(f.base, 'hook-ran')
  const smudge = join(f.base, 'smudge-ran')
  writeFileSync(join(f.common, 'hooks/post-checkout'), `#!/bin/sh\nprintf hook > '${hook}'\n`, {
    mode: 0o755,
  })
  writeFileSync(join(f.root, '.gitattributes'), 'product.txt filter=unsafe\n')
  git(f.root, 'config', 'filter.unsafe.smudge', `sh -c "printf smudge > '${smudge}'; cat"`)
  git(f.root, 'add', '.gitattributes')
  git(f.root, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'foreign checkout attributes')
  f.request.baseline = git(f.root, 'rev-parse', 'HEAD')
  f.save()
  f.authorize()
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 2)
  assert.match(result.body.detail, /UNSAFE_CHECKOUT_FILTER/)
  assert.equal(existsSync(hook), false)
  assert.equal(existsSync(smudge), false)
})

test('I23-04 safe checkout creates owner without running post-checkout hook', async () => {
  const f = fixture()
  f.authorize()
  const sentinel = join(f.base, 'hook-ran')
  writeFileSync(join(f.common, 'hooks/post-checkout'), `#!/bin/sh\nprintf hook > '${sentinel}'\n`, {
    mode: 0o755,
  })
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  assert.equal(existsSync(sentinel), false)
})

test('I23-05 check rejects nonexistent and unrelated baseline commits', async () => {
  const f = fixture()
  f.authorize()
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  const path = join(
    result.body.worktree,
    'docs/engineering/directions',
    f.request.id,
    'direction.json',
  )
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  manifest.originalBaseline = '0'.repeat(40)
  writeFileSync(path, `${JSON.stringify(manifest)}\n`)
  assert.equal((await invoke(f.root, 'check', path)).status, 2)
  const unrelated = git(
    f.root,
    'commit-tree',
    git(f.root, 'rev-parse', 'HEAD^{tree}'),
    '-m',
    'unrelated',
  )
  manifest.originalBaseline = unrelated
  writeFileSync(path, `${JSON.stringify(manifest)}\n`)
  assert.equal((await invoke(f.root, 'check', path)).status, 2)
})

test('I23-05 check rejects linked manifest parent', async () => {
  const f = fixture()
  f.authorize()
  const result = await invoke(f.root, 'create', f.requestFile)
  assert.equal(result.status, 0, JSON.stringify(result.body))
  const docs = join(result.body.worktree, 'docs')
  const outside = join(f.base, 'saved-docs')
  renameSync(docs, outside)
  symlinkSync(outside, docs, process.platform === 'win32' ? 'junction' : 'dir')
  const path = join(docs, 'engineering/directions', f.request.id, 'direction.json')
  assert.equal((await invoke(f.root, 'check', path)).status, 2)
})
