import { readFileSync } from 'node:fs'
import {
  safeBytes,
  currentInputFiles,
  bootstrapPin,
  evidenceOwner,
  executionRoles,
  sha256,
  verifyInputBytes,
} from './drawing-pages-current.mjs'

export const publicationEvidence =
  'docs/engineering/evidence/frade-draw-multipage-publication-20261027'
export const publicationProducer = 'scripts/ui/drawing-pages-publication-run.mjs'
export const legacyPublicationManifest =
  'openspec/changes/archive/2026-10-27-frade-draw-multipage/evidence/source-adoption-manifest.json'
const demand = (value, code) => {
  if (!value) throw Error(code)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const digest = (value) => /^[a-f0-9]{64}$/.test(value)
const caseCatalogRaw = readFileSync(new URL('./presentation-staging-cases.json', import.meta.url))
demand(sha256(caseCatalogRaw) === '271f51c1618b1e1b5303fb70aeabe5d64a8c606f2bd3ffd55f5c25e12386f2a5', 'PUBLICATION_CASE_CATALOG')
const caseCatalog = JSON.parse(caseCatalogRaw)
demand(caseCatalog.version === 1 && caseCatalog.role === 'workspace-direct' && caseCatalog.cases.length === 22, 'PUBLICATION_CASE_CATALOG')
export const publicationAddedCases = Object.freeze(caseCatalog.cases.map(item => Object.freeze({ ...item })))
const additionalKey = item => item.file + '\0' + item.title
const addedCaseKeys = new Set(publicationAddedCases.map(additionalKey))
demand(addedCaseKeys.size === 22, 'PUBLICATION_CASE_CATALOG')
export const publicationPhysical = (profile, file) => {
  demand(['clean', 'working'].includes(profile), 'PUBLICATION_PROFILE_NAME')
  return file.startsWith(evidenceOwner)
    ? publicationEvidence + '/profiles/' + profile + '/' + file.slice(evidenceOwner.length)
    : file
}
export function parsePinnedPublicationManifest(raw, expected) {
  demand(digest(expected) && sha256(raw) === expected, 'PUBLICATION_MANIFEST_HASH')
  const value = JSON.parse(raw)
  demand(
    Array.isArray(value.currentInputs) && value.currentInputs.length > 0,
    'PUBLICATION_PROFILE_SCHEMA',
  )
  return value
}
export function selectPublicationProfile(files, profiles) {
  demand(
    new Set(files).size === files.length && same(files, [...files].sort()),
    'PUBLICATION_PROFILE_CLOSURE',
  )
  const matches = profiles.filter((profile) => {
    demand(['clean', 'working'].includes(profile.name), 'PUBLICATION_PROFILE_NAME')
    const names = profile.manifest.currentInputs.map((x) => x.file)
    demand(
      new Set(names).size === names.length && same(names, [...names].sort()),
      'PUBLICATION_PROFILE_SCHEMA',
    )
    return same(files, names)
  })
  demand(matches.length > 0, 'PUBLICATION_PROFILE_CLOSURE')
  demand(matches.length === 1, 'PUBLICATION_PROFILE_AMBIGUOUS')
  const selected = matches[0]
  for (const input of selected.manifest.currentInputs)
    verifyInputBytes(input, selected.read(input.file))
  return selected
}
export const verifyPublicationInput = verifyInputBytes
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function publicationExecutionSpec(role, plan) {
  const perf = (item) =>
    item.file === 'ui-contract-theme-performance.spec.ts' || item.title.includes('p95')
  const selected = plan.cases.filter((item) =>
    role === 'desktop-performance' ? perf(item) : !perf(item),
  )
  const roles = {
    'desktop-build': {
      cwd: '',
      runner: 'build',
      args: ['-NoProfile', '-NonInteractive', '-Command', 'pnpm --filter @frade/desktop build'],
    },
    'draw-unit': { cwd: 'packages/draw', runner: 'vitest', args: ['run'] },
    'runtime-unit': { cwd: 'packages/runtime-node', runner: 'vitest', args: ['run'] },
    'workspace-direct': {
      cwd: 'packages/ui-workspace',
      runner: 'vitest',
      args: ['run', '--exclude', 'tests/ui-contract/light-diagram-editor.bdd.test.tsx'],
    },
    'draw-visual': { cwd: 'packages/draw', runner: 'playwright', args: ['test', '--workers=4'] },
    'desktop-diagrams': {
      cwd: 'apps/desktop',
      runner: 'playwright',
      args: [
        'test',
        'tests/e2e/diagrams.spec.ts',
        'tests/e2e/drawing-pages-parking.spec.ts',
        '--workers=1',
      ],
    },
    'desktop-presentation': {
      cwd: 'apps/desktop',
      runner: 'playwright',
      args: [
        'test',
        ...new Set(selected.map((x) => 'tests/e2e/' + x.file)),
        '--workers=1',
        '--grep',
        '(?:' + selected.map((x) => escaped(x.title)).join('|') + ')$',
      ],
    },
    'desktop-performance': {
      cwd: 'apps/desktop',
      runner: 'playwright',
      args: [
        'test',
        ...new Set(selected.map((x) => 'tests/e2e/' + x.file)),
        '--workers=1',
        '--grep',
        '(?:' + selected.map((x) => escaped(x.title)).join('|') + ')$',
      ],
    },
  }
  demand(Object.hasOwn(roles, role), 'PUBLICATION_ROLE')
  return roles[role]
}
export function publicationInvocation(role, plan, control, reportFile) {
  const spec = publicationExecutionSpec(role, plan),
    root = control.snapshotRoot
  if (role === 'desktop-build')
    return { executable: control.runtime.shell.path, args: spec.args, cwd: root }
  const script =
    spec.cwd +
    '/node_modules/' +
    (spec.runner === 'vitest' ? 'vitest/vitest.mjs' : '@playwright/test/cli.js')
  const args = [root + '/' + script, ...spec.args, '--reporter=json']
  if (spec.runner === 'vitest')
    args.push('--outputFile=' + root + '/' + publicationPhysical(control.profile, reportFile))
  return { executable: control.runtime.node.path, args, cwd: root + '/' + spec.cwd }
}
export const publicationEnvironmentKeys = [
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'COMSPEC',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'PNPM_HOME',
  'PLAYWRIGHT_BROWSERS_PATH',
  'CI',
  'TZ',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'ELECTRON_OVERRIDE_DIST_PATH',
  'FRADE_DRAW_E2E_PORT',
]
export function verifyPublicationControls(manifest, read, legacy) {
  const control = manifest.publicationControl
  demand(
    control?.version === 1 && ['clean', 'working'].includes(control.profile),
    'PUBLICATION_CONTROL_SCHEMA',
  )
  const root = control.snapshotRoot
  demand(
    typeof root === 'string' &&
      /^(?:[A-Za-z]:\/|\/)/.test(root) &&
      !root.includes('\\') &&
      !root.split('/').includes('..'),
    'PUBLICATION_ROOT',
  )
  demand(
    control.producer?.file === publicationProducer && digest(control.producer.sha256),
    'PUBLICATION_PRODUCER',
  )
  const producer = manifest.currentInputs.find((x) => x.file === publicationProducer)
  demand(producer && producer.sha256 === control.producer.sha256, 'PUBLICATION_PRODUCER')
  for (const name of ['node', 'shell', 'electron'])
    demand(
      typeof control.runtime?.[name]?.path === 'string' && digest(control.runtime[name].sha256),
      'PUBLICATION_RUNTIME',
    )
  demand(/^v24\./.test(control.runtime.node.version), 'PUBLICATION_RUNTIME')
  demand(
    control.runtime.electron.version === '44.4.5' &&
      control.runtime.electron.path.startsWith(root + '/') &&
      control.runtime.electron.path.endsWith('/electron/dist/electron.exe'),
    'PUBLICATION_ELECTRON',
  )
  const env = control.environment
  demand(
    env &&
      Object.keys(env).every((key) => publicationEnvironmentKeys.includes(key)) &&
      Object.values(env).every((value) => typeof value === 'string') &&
      !!env.PATH &&
      !!env.SYSTEMROOT &&
      env.ELECTRON_OVERRIDE_DIST_PATH === root + '/apps/desktop/node_modules/electron/dist' &&
      env.FRADE_DRAW_E2E_PORT === '5187',
    'PUBLICATION_ENVIRONMENT',
  )
  const records = [
    { role: 'desktop-build', record: manifest.desktopBuild.record },
    ...manifest.executions,
  ]
  demand(
    same(records.map((x) => x.role).sort(), ['desktop-build', ...executionRoles].sort()),
    'PUBLICATION_ROLES',
  )
  const plan = JSON.parse(read(evidenceOwner + 'presentation-execution-plan.json'))
  for (const execution of records) {
    const raw = read(execution.record.file)
    demand(sha256(raw) === execution.record.sha256, 'PUBLICATION_RECORD_HASH')
    const record = JSON.parse(raw),
      role = execution.role
    demand(record.role === role && same(record.producer, control.producer), 'PUBLICATION_PRODUCER')
    demand(
      same(record.runtimeBefore, control.runtime) && same(record.runtimeAfter, control.runtime),
      'PUBLICATION_RUNTIME',
    )
    demand(same(record.environment, env), 'PUBLICATION_ENVIRONMENT')
    const reportFile = execution.record.file.slice(0, -'record.json'.length) + 'report.json'
    demand(
      same(record.invocation, publicationInvocation(role, plan, control, reportFile)),
      'PUBLICATION_INVOCATION',
    )
    for (const phase of ['before', 'after']) {
      const bytes = read(record[phase].file)
      demand(sha256(bytes) === record[phase].sha256, 'PUBLICATION_OBSERVATION_HASH')
      const observed = JSON.parse(bytes).filter((x) => x.file === publicationProducer)
      demand(
        observed.length === 1 && observed[0].sha256 === control.producer.sha256,
        'PUBLICATION_PRODUCER',
      )
    }
  }
  const key = (x) => x.file.replaceAll('\\', '/').split('/').at(-1) + '\0' + x.title
  for (const previous of legacy.executions) {
    const current = manifest.executions.find((x) => x.role === previous.role),
      keys = new Set(current.cases.map(key))
    demand(keys.size === current.cases.length, 'PUBLICATION_NEW_CASE_SCOPE')
    demand(
      previous.cases.every((item) => keys.has(key(item))),
      'PUBLICATION_HISTORICAL_CASE',
    )
    const old = new Set(previous.cases.map(key)),
      added = current.cases.filter((item) => !old.has(key(item)))
    if (previous.role !== 'workspace-direct') demand(added.length === 0, 'PUBLICATION_NEW_CASE_SCOPE')
    else {
      const prefix = control.snapshotRoot.replaceAll('\\', '/') + '/'
      const actual = added.map(item => {
        const file = item.file.replaceAll('\\', '/')
        demand(file.startsWith(prefix), 'PUBLICATION_NEW_CASE_SCOPE')
        return additionalKey({file: file.slice(prefix.length), title: item.title})
      })
      demand(actual.length === 22 && new Set(actual).size === 22 &&
        actual.every(value => addedCaseKeys.has(value)), 'PUBLICATION_NEW_CASE_SCOPE')
    }
  }
  return records.length
}
export function readDrawingPagesPublication(root) {
  const pinText = safeBytes(root, bootstrapPin).toString()
  const legacyPins = [
    ...pinText.matchAll(/drawingPagesAdoptionManifestSha256\s*=\s*'([a-f0-9]{64})'/g),
  ]
  demand(legacyPins.length === 1, 'PUBLICATION_LEGACY_PIN')
  const legacyRaw = safeBytes(root, legacyPublicationManifest)
  demand(sha256(legacyRaw) === legacyPins[0][1], 'PUBLICATION_LEGACY_PIN')
  const legacy = JSON.parse(legacyRaw)
  const profiles = ['clean', 'working'].map((name) => {
    const symbol =
      name === 'clean'
        ? 'drawingPagesCleanPublicationManifestSha256'
        : 'drawingPagesWorkingPublicationManifestSha256'
    const pins = [...pinText.matchAll(new RegExp(symbol + "\\s*=\\s*'([a-f0-9]{64})'", 'g'))]
    demand(pins.length === 1, 'PUBLICATION_PIN')
    const raw = safeBytes(
      root,
      publicationEvidence + '/profiles/' + name + '/source-adoption-manifest.json',
    )
    return {
      name,
      manifest: parsePinnedPublicationManifest(raw, pins[0][1]),
      read: (file) => safeBytes(root, publicationPhysical(name, file)),
    }
  })
  const selected = selectPublicationProfile(currentInputFiles(root), profiles)
  demand(
    selected.manifest.historicalOrigin?.file === legacyPublicationManifest &&
      selected.manifest.historicalOrigin.sha256 === sha256(legacyRaw),
    'PUBLICATION_ORIGIN_LINEAGE',
  )
  demand(selected.manifest.publicationControl.profile === selected.name, 'PUBLICATION_PROFILE_NAME')
  verifyPublicationControls(selected.manifest, selected.read, legacy)
  return selected
}
