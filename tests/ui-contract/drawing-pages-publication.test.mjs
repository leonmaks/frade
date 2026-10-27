import test from 'node:test'
import assert from 'node:assert/strict'
import { publicationByteForms } from './drawing-pages-adoption.mjs'
import { evidenceOwner, executionRoles, sha256 } from './drawing-pages-current.mjs'
import {
  selectPublicationProfile,
  parsePinnedPublicationManifest,
  verifyPublicationControls,
  publicationInvocation,
  publicationProducer,
} from './drawing-pages-publication.mjs'

function profiles() {
  const a = 'packages/draw/src/a.ts',
    b = 'packages/draw/src/b.ts'
  const clean = Buffer.from('committed source\n'),
    working = Buffer.from('working source\n')
  const profile = (name, entries) => ({
    name,
    manifest: {
      currentInputs: entries.map(([file, bytes]) => ({ file, ...publicationByteForms(bytes) })),
    },
    read: (file) => entries.find((x) => x[0] === file)[1],
  })
  return {
    a,
    b,
    clean,
    working,
    values: [
      profile('clean', [[a, clean]]),
      profile('working', [
        [a, working],
        [b, working],
      ]),
    ],
  }
}
test('publication chooses the entire clean or working closure and validates its actual bytes', () => {
  const f = profiles()
  assert.equal(selectPublicationProfile([f.a], f.values).name, 'clean')
  assert.equal(selectPublicationProfile([f.a, f.b], f.values).name, 'working')
})
test('publication rejects unknown, missing, duplicate, reordered and blended input closures', () => {
  const f = profiles()
  for (const files of [[], [f.a, 'unknown.ts'], [f.a, f.a], [f.b, f.a]])
    assert.throws(() => selectPublicationProfile(files, f.values), /PUBLICATION_PROFILE/)
  f.values[1].read = (file) => (file === f.a ? f.clean : f.working)
  assert.throws(() => selectPublicationProfile([f.a, f.b], f.values), /CURRENT_SOURCE_HASH/)
})
test('publication rejects ambiguous profiles and source byte or mixed-EOL drift', () => {
  const f = profiles()
  assert.throws(
    () => selectPublicationProfile([f.a], [f.values[0], { ...f.values[0], name: 'working' }]),
    /PUBLICATION_PROFILE_AMBIGUOUS/,
  )
  for (const bytes of [Buffer.from('changed\n'), Buffer.from('committed source\r\nextra\n')]) {
    f.values[0].read = () => bytes
    assert.throws(() => selectPublicationProfile([f.a], f.values), /CURRENT_SOURCE_HASH/)
  }
})
test('publication pin rejects changed manifest bytes and cannot accept an unpinned alternate profile', () => {
  const raw = Buffer.from(JSON.stringify(profiles().values[0].manifest))
  assert.deepEqual(parsePinnedPublicationManifest(raw, sha256(raw)), JSON.parse(raw))
  assert.throws(
    () => parsePinnedPublicationManifest(Buffer.concat([raw, Buffer.from(' ')]), sha256(raw)),
    /PUBLICATION_MANIFEST_HASH/,
  )
  assert.throws(
    () => parsePinnedPublicationManifest(raw, '0'.repeat(64)),
    /PUBLICATION_MANIFEST_HASH/,
  )
})

function controls() {
  const store = new Map(),
    root = 'E:/snapshot',
    producerBytes = Buffer.from('reviewed producer\n')
  const runtime = {
    node: { path: 'C:/node/node.exe', sha256: 'a'.repeat(64), version: 'v24.18.0' },
    shell: {
      path: 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      sha256: 'b'.repeat(64),
    },
    electron: {
      path: root + '/node_modules/.pnpm/electron/node_modules/electron/dist/electron.exe',
      sha256: 'c'.repeat(64),
      version: '44.4.5',
    },
  }
  const control = {
    version: 1,
    profile: 'clean',
    snapshotRoot: root,
    producer: { file: publicationProducer, sha256: sha256(producerBytes) },
    runtime,
    environment: {
      PATH: 'C:/tools',
      SYSTEMROOT: 'C:/Windows',
      ELECTRON_OVERRIDE_DIST_PATH: root + '/apps/desktop/node_modules/electron/dist',
      FRADE_DRAW_E2E_PORT: '5187',
    },
  }
  const put = (file, object) => {
    const raw = Buffer.from(JSON.stringify(object))
    store.set(file, raw)
    return { file, sha256: sha256(raw) }
  }
  const plan = {
    cases: [
      { file: 'ui-contract-theme.spec.ts', title: 'opacity' },
      { file: 'ui-contract-theme-performance.spec.ts', title: 'p95' },
    ],
  }
  put(evidenceOwner + 'presentation-execution-plan.json', plan)
  const manifest = {
    currentInputs: [{ file: publicationProducer, ...publicationByteForms(producerBytes) }],
    publicationControl: control,
    executions: [],
  }
  const records = []
  for (const role of ['desktop-build', ...executionRoles]) {
    const run = evidenceOwner + 'current-execution/' + role + '-fixture'
    const observed = [{ file: publicationProducer, ...publicationByteForms(producerBytes) }]
    const record = {
      role,
      producer: control.producer,
      runtimeBefore: structuredClone(runtime),
      runtimeAfter: structuredClone(runtime),
      environment: structuredClone(control.environment),
      invocation: publicationInvocation(role, plan, control, run + '/report.json'),
      before: put(run + '/before.json', observed),
      after: put(run + '/after.json', observed),
    }
    const artifact = put(run + '/record.json', record)
    records.push({ role, record, artifact })
    if (role === 'desktop-build') manifest.desktopBuild = { record: artifact }
    else
      manifest.executions.push({
        role,
        record: artifact,
        cases: [{ file: 'invariant.test.ts', title: role + ' original case' }],
      })
  }
  const legacy = { executions: structuredClone(manifest.executions) }
  return {
    manifest,
    legacy,
    store,
    records,
    read: (file) => store.get(file),
    rewrite() {
      for (const x of records) {
        x.artifact.sha256 = put(x.artifact.file, x.record).sha256
      }
    },
  }
}
test('publication controls accept a complete source-bound invocation set', () => {
  const f = controls()
  assert.equal(verifyPublicationControls(f.manifest, f.read, f.legacy), 8)
})
test('publication controls reject changed commands even after record hashes are recomputed', () => {
  for (const mutate of [
    (r) => r.invocation.args.push('--testNamePattern=only easy case'),
    (r) => {
      r.invocation.cwd = 'E:/other-worktree'
    },
    (r) => {
      r.invocation.executable = 'C:/unreviewed.exe'
    },
  ]) {
    const f = controls()
    mutate(f.records[1].record)
    f.rewrite()
    assert.throws(
      () => verifyPublicationControls(f.manifest, f.read, f.legacy),
      /PUBLICATION_INVOCATION/,
    )
  }
})
test('publication controls reject changed or secret environment, outside-snapshot Electron and binary drift', () => {
  const env = controls()
  env.records[1].record.environment.PATH = 'C:/other'
  env.rewrite()
  assert.throws(
    () => verifyPublicationControls(env.manifest, env.read, env.legacy),
    /PUBLICATION_ENVIRONMENT/,
  )
  const secret = controls()
  secret.manifest.publicationControl.environment.SECRET_TOKEN = 'forbidden'
  assert.throws(
    () => verifyPublicationControls(secret.manifest, secret.read, secret.legacy),
    /PUBLICATION_ENVIRONMENT/,
  )
  const outside = controls()
  outside.manifest.publicationControl.runtime.electron.path =
    'E:/main/node_modules/electron/dist/electron.exe'
  assert.throws(
    () => verifyPublicationControls(outside.manifest, outside.read, outside.legacy),
    /PUBLICATION_ELECTRON/,
  )
  const binary = controls()
  binary.records[1].record.runtimeAfter.electron.sha256 = 'd'.repeat(64)
  binary.rewrite()
  assert.throws(
    () => verifyPublicationControls(binary.manifest, binary.read, binary.legacy),
    /PUBLICATION_RUNTIME/,
  )
})
test('publication controls reject producer substitution and lost historical cases', () => {
  const producer = controls()
  producer.records[1].record.producer = { file: publicationProducer, sha256: 'e'.repeat(64) }
  producer.rewrite()
  assert.throws(
    () => verifyPublicationControls(producer.manifest, producer.read, producer.legacy),
    /PUBLICATION_PRODUCER/,
  )
  const lost = controls()
  lost.manifest.executions[0].cases = []
  assert.throws(
    () => verifyPublicationControls(lost.manifest, lost.read, lost.legacy),
    /PUBLICATION_HISTORICAL_CASE/,
  )
})
