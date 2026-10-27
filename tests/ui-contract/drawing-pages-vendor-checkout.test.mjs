import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../../', import.meta.url))
const rule = 'apps/desktop/vendor/.gitattributes'
const asset = 'apps/desktop/vendor/drawio/img/lib/azure2/azure_ecosystem/Applens.svg'
const bytes = fs.readFileSync(resolve(root, asset))
const manifest = JSON.parse(
  fs.readFileSync(resolve(root, 'apps/desktop/vendor/drawio-manifest.json')),
)
const expected = manifest.assets.find(
  (x) => x.path === asset.slice('apps/desktop/vendor/drawio/'.length),
)
const blob = (value) =>
  createHash('sha1')
    .update('blob ' + value.length + '\0')
    .update(value)
    .digest('hex')

function checkout(autocrlf, attributes, inspect, fixtureAsset = asset, fixtureBytes = bytes) {
  const parent = fs.realpathSync(tmpdir()),
    directory = fs.realpathSync(fs.mkdtempSync(join(parent, 'frade-vendor-checkout-')))
  const identity = fs.statSync(directory, { bigint: true })
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  )
  env.GIT_CONFIG_NOSYSTEM = '1'
  env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null'
  const git = (args) =>
    execFileSync(
      'git',
      ['-c', 'core.fsmonitor=false', '-c', 'core.attributesfile=' + env.GIT_CONFIG_GLOBAL, ...args],
      { cwd: directory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  const put = (file, raw) => {
    fs.mkdirSync(dirname(join(directory, file)), { recursive: true })
    fs.writeFileSync(join(directory, file), raw)
  }
  try {
    git(['init', '--quiet'])
    git(['config', 'core.autocrlf', String(autocrlf)])
    put(rule, attributes)
    put(fixtureAsset, fixtureBytes)
    put('apps/desktop/outside.txt', 'outside\n')
    git(['add', '--', rule, fixtureAsset, 'apps/desktop/outside.txt'])
    fs.unlinkSync(join(directory, fixtureAsset))
    fs.unlinkSync(join(directory, 'apps/desktop/outside.txt'))
    git(['checkout-index', '--all', '--force'])
    inspect({ read: (file) => fs.readFileSync(join(directory, file)), git })
  } finally {
    const current = fs.statSync(directory, { bigint: true })
    if (
      fs.realpathSync(directory) !== directory ||
      dirname(directory) !== parent ||
      !directory.includes('frade-vendor-checkout-') ||
      identity.ino !== current.ino ||
      identity.dev !== current.dev
    )
      throw Error('UNVERIFIED_VENDOR_CHECKOUT_CLEANUP')
    fs.rmSync(directory, { recursive: true, force: true })
  }
}
test('vendor checkout negative control reproduces pinned resource corruption without an attribute rule', () => {
  assert.equal(blob(bytes), expected.sha)
  checkout(true, '', ({ read }) => {
    assert.notEqual(blob(read(asset)), expected.sha)
    assert.notEqual(read(asset).length, expected.size)
  })
})
for (const autocrlf of [false, true])
  test('vendor raw-byte pins survive actual Git checkout, autocrlf=' + autocrlf, () => {
    const attributes = fs.existsSync(resolve(root, rule))
      ? fs.readFileSync(resolve(root, rule))
      : Buffer.from('')
    checkout(autocrlf, attributes, ({ read, git }) => {
      assert.deepEqual(read(asset), bytes)
      assert.equal(blob(read(asset)), expected.sha)
      assert.equal(read(asset).length, expected.size)
      assert.equal(attributes.toString().replaceAll('\r\n', '\n'), 'drawio/** -text\n')
      assert.match(git(['check-attr', 'text', '--', asset]), /: text: unset\r?\n$/)
      assert.match(
        git(['check-attr', 'text', '--', 'apps/desktop/outside.txt']),
        /: text: unspecified\r?\n$/,
      )
      assert.equal(
        read('apps/desktop/outside.txt').toString(),
        autocrlf ? 'outside\r\n' : 'outside\n',
      )
    })
  })

for (const autocrlf of [false, true])
  test('vendor original CRLF resource survives Git add and checkout, autocrlf=' + autocrlf, () => {
    const crlfAsset = 'apps/desktop/vendor/drawio/images/google-drive-logo.svg'
    const original = fs.readFileSync(resolve(root, crlfAsset))
    const pinned = manifest.assets.find((x) => x.path === 'images/google-drive-logo.svg')
    assert.equal(blob(original), pinned.sha)
    const attributes = fs.existsSync(resolve(root, rule))
      ? fs.readFileSync(resolve(root, rule))
      : Buffer.from('')
    checkout(
      autocrlf,
      attributes,
      ({ read }) => {
        assert.deepEqual(read(crlfAsset), original)
        assert.equal(blob(read(crlfAsset)), pinned.sha)
        assert.equal(read(crlfAsset).length, pinned.size)
      },
      crlfAsset,
      original,
    )
  })
