import { mkdtemp, mkdir, readFile, writeFile, unlink, rm, realpath, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, relative, sep, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { root } from './tokens.mjs'

// Accepted FOUNDATION-EOL-01 v1.0 raw-byte anchors; changes need contract review.
export const protectedArtifacts = [
  [
    'docs/ui/Frade-UI-Style-Guide.md',
    '6fe886be979a32d87c94f29f65ee3abdbc2acf86dd4c12fdfc4d00022139b109',
  ],
  ['docs/ui/QA-Checklist.md', '22fb9287d6740a2613dac07e5ef656aa6edcc9e6e1eb4be5bb5bff3f042b0f9b'],
  [
    'docs/ui/Themes-and-Plugins-Spec.md',
    'f8fb35e715dd7e0c420768b855e991c96244279b637e6d4db5eb061514ec3e81',
  ],
  [
    'packages/ui-workspace/tokens/tokens.json',
    'd02e342cd54dc98807778fcdf10e386080f5b97a5c0a8dc1245b0ee9191e2764',
  ],
  [
    'packages/ui-workspace/tokens/theme.schema.json',
    'd0967fe506f13bbc506e48d92a8ff68c07cdcdcc119b6a15862c65b89d28d9f3',
  ],
  [
    'tests/ui-contract/fixtures/upstream.tokens.css',
    '11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29',
  ],
  [
    'packages/ui-workspace/src/design/generated/tokens.css',
    '6a6b47b12f5090a66231ee2541387ada31a2435d76f245c6631ad4285ac784a4',
  ],
  [
    'packages/ui-workspace/src/design/generated/tokens.ts',
    'fbe1ced2cbb112f8073de4a5f8c612811ef087165514304f3820862c929fb63e',
  ],
]
const acceptedRules = protectedArtifacts.map(([path]) => path + ' text eol=lf')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const describeBytes = (path, bytes) => ({
  path,
  sha256: sha(bytes),
  bytes: bytes.length,
  crlfCount: bytes.toString('utf8').split('\r\n').length - 1,
})

export function validateAttributes(configuration) {
  if (typeof configuration !== 'string') throw Error('Missing root .gitattributes')
  const normalized = configuration.replaceAll('\r\n', '\n')
  const lines = normalized.endsWith('\n')
    ? normalized.slice(0, -1).split('\n')
    : normalized.split('\n')
  if (lines.length !== 8 || lines.some((line, i) => line !== acceptedRules[i]))
    throw Error('Root .gitattributes must contain exactly the eight accepted logical entries')
  return lines
}

export async function assertTemporaryIdentity(directory, identity) {
  const canonicalTemp = await realpath(tmpdir()),
    canonicalRoot = await realpath(directory)
  const within = relative(canonicalTemp, canonicalRoot)
  if (
    !within.startsWith('frade-ui-checkout-') ||
    within.includes(sep) ||
    isAbsolute(within) ||
    within.startsWith('..')
  )
    throw Error('Unverified temporary checkout root')
  const current = await stat(canonicalRoot, { bigint: true })
  if (canonicalRoot !== directory || current.dev !== identity.dev || current.ino !== identity.ino)
    throw Error('Temporary checkout root identity changed; refusing access/removal')
}

// Dependency injection exercises unavailable Git and cleanup errors; the CLI uses real defaults.
export async function runCheckoutControls({ attributes, spawn = spawnSync, remove = rm } = {}) {
  const configuration = attributes ?? (await readFile(resolve(root, '.gitattributes'), 'utf8'))
  validateAttributes(configuration)
  const original = new Map()
  for (const [path, expected] of protectedArtifacts) {
    const bytes = await readFile(resolve(root, path))
    if (sha(bytes) !== expected || bytes.includes(Buffer.from('\r\n')))
      throw Error('Protected artifact raw bytes changed: ' + path)
    original.set(path, bytes)
  }
  const directory = await mkdtemp(resolve(tmpdir(), 'frade-ui-checkout-'))
  const temporaryRoot = await realpath(directory),
    identity = await stat(temporaryRoot, { bigint: true })
  let failure,
    removed = false
  const commands = [],
    controls = []
  const verify = () => assertTemporaryIdentity(temporaryRoot, identity)
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  )
  environment.GIT_CONFIG_NOSYSTEM = '1'
  const fixedPath = (path) => {
    const target = resolve(temporaryRoot, path),
      within = relative(temporaryRoot, target)
    if (isAbsolute(within) || within.startsWith('..') || !within)
      throw Error('Unsafe fixture target')
    return target
  }
  const put = async (path, bytes) => {
    await verify()
    const target = fixedPath(path)
    await mkdir(dirname(target), { recursive: true })
    const parent = await realpath(dirname(target)),
      within = relative(temporaryRoot, parent)
    if (isAbsolute(within) || within.startsWith('..'))
      throw Error('Fixture parent escaped temporary root')
    await writeFile(target, bytes)
  }
  const git = async (args) => {
    await verify()
    const result = spawn('git', ['-C', temporaryRoot, ...args], {
      env: environment,
      encoding: 'utf8',
    })
    commands.push({
      command: 'git',
      args,
      actualExit: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    })
    if (result.error) throw result.error
    if (result.status !== 0)
      throw Error('Temporary Git command failed: ' + args.join(' ') + ': ' + result.stderr)
    return result.stdout
  }
  const freshCheckout = async (paths) => {
    for (const path of paths) {
      await verify()
      await unlink(fixedPath(path))
    }
    await git(['checkout-index', '--all', '--force'])
  }
  const inspect = async (name) => {
    const artifacts = []
    for (const [path] of protectedArtifacts)
      artifacts.push(describeBytes(path, await readFile(fixedPath(path))))
    const result = spawn(
      process.execPath,
      [resolve(root, 'scripts/ui/tokens.mjs'), '--root', temporaryRoot],
      { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    )
    if (result.error) throw result.error
    const output = result.stdout.trim() ? JSON.parse(result.stdout) : { namedContrastChecks: null }
    const control = {
      name,
      actualExit: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      namedContrastChecks: output.namedContrastChecks,
      artifacts,
    }
    controls.push(control)
    return control
  }
  try {
    await verify()
    await put('.empty-attributes', '')
    await git(['init', '--quiet'])
    await git(['config', '--local', 'core.autocrlf', 'true'])
    await git(['config', '--local', 'core.safecrlf', 'false'])
    await git(['config', '--local', 'core.attributesFile', fixedPath('.empty-attributes')])
    for (const [path, bytes] of original) await put(path, bytes)
    const paths = protectedArtifacts.map(([path]) => path)
    await git(['add', '--', ...paths])
    await freshCheckout(paths)
    const negative = await inspect('no attributes: physical CRLF drift')
    if (
      negative.actualExit !== 1 ||
      !negative.stderr.includes('Immutable upstream CSS fixture drift') ||
      !negative.artifacts.every((a) => a.crlfCount > 0 && a.sha256 !== sha(original.get(a.path)))
    )
      throw Error('Missing-attributes control did not reproduce physical drift / token CLI exit 1')
    // Root configuration deliberately uses CRLF; no ninth self-rule is required.
    await put('.gitattributes', acceptedRules.join('\r\n') + '\r\n')
    await git(['add', '--', '.gitattributes'])
    await freshCheckout([...paths, '.gitattributes'])
    validateAttributes(await readFile(fixedPath('.gitattributes'), 'utf8'))
    const positive = await inspect('accepted eight rules: raw LF preservation')
    if (
      positive.actualExit !== 0 ||
      positive.namedContrastChecks !== 102 ||
      !positive.artifacts.every((a) => a.crlfCount === 0 && a.sha256 === sha(original.get(a.path)))
    )
      throw Error('Accepted-attributes checkout changed raw bytes / token CLI result')
  } catch (error) {
    failure = error
  } finally {
    try {
      await verify()
      await remove(temporaryRoot, { recursive: true })
      removed = true
    } catch (error) {
      failure = failure
        ? new AggregateError([failure, error], 'Checkout and cleanup failed')
        : error
    }
  }
  for (const [path, bytes] of original) {
    if (!bytes.equals(await readFile(resolve(root, path)))) {
      const error = Error('Canonical source mutated during checkout control: ' + path)
      failure = failure
        ? new AggregateError([failure, error], 'Checkout and source integrity failed')
        : error
    }
  }
  if (failure) throw failure
  return {
    status: 'PASS',
    platform: process.platform,
    temporaryRoot,
    removed,
    sourceUnchanged: true,
    protectedArtifacts: protectedArtifacts.length,
    controls,
    commands,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await runCheckoutControls()))
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
