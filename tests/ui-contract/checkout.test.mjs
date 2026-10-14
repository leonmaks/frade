import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root } from '../../scripts/ui/tokens.mjs'

const expectedPaths = [
  'docs/ui/Frade-UI-Style-Guide.md',
  'docs/ui/QA-Checklist.md',
  'docs/ui/Themes-and-Plugins-Spec.md',
  'packages/ui-workspace/tokens/tokens.json',
  'packages/ui-workspace/tokens/theme.schema.json',
  'tests/ui-contract/fixtures/upstream.tokens.css',
  'packages/ui-workspace/src/design/generated/tokens.css',
  'packages/ui-workspace/src/design/generated/tokens.ts',
]
const expectedAttributes = expectedPaths.map((path) => path + ' text eol=lf').join('\n') + '\n'

test('UI-CHECKOUT:required-root-configuration', async () => {
  let configuration = ''
  try {
    configuration = await readFile(resolve(root, '.gitattributes'), 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  assert.equal(
    configuration.replaceAll('\r\n', '\n'),
    expectedAttributes,
    'FOUNDATION-EOL-01: exact eight rules must exist before claiming checkout compliance',
  )
})

const { validateAttributes, runCheckoutControls, assertTemporaryIdentity } =
  await import('../../scripts/ui/checkout.mjs')
const { rm, mkdtemp, realpath, stat } = await import('node:fs/promises')
const { tmpdir } = await import('node:os')

test('UI-CHECKOUT:closed-rule-scope', () => {
  assert.deepEqual(validateAttributes(expectedAttributes), expectedAttributes.trim().split('\n'))
  assert.deepEqual(
    validateAttributes(expectedAttributes.replaceAll('\n', '\r\n')),
    expectedAttributes.trim().split('\n'),
  )
  for (const invalid of [
    undefined,
    '',
    expectedAttributes.split('\n').slice(1).join('\n'),
    expectedAttributes + '*.css text eol=lf\n',
    expectedAttributes + '.gitattributes text eol=lf\n',
    expectedAttributes.replace('eol=lf', 'eol=crlf'),
    expectedAttributes.replace(expectedPaths[0], 'docs/ui/*'),
  ]) {
    assert.throws(() => validateAttributes(invalid), /eight accepted|Missing root/)
  }
})

let checkoutReport
async function report() {
  checkoutReport ??= runCheckoutControls({ attributes: expectedAttributes })
  return checkoutReport
}

test('UI-CHECKOUT:physical-drift', async () => {
  const result = await report()
  assert.equal(result.controls[0].actualExit, 1)
  assert.deepEqual(
    result.controls[0].artifacts.map((a) => a.path),
    expectedPaths,
  )
  assert.ok(result.controls[0].artifacts.every((a) => a.crlfCount > 0))
  assert.equal(result.sourceUnchanged, true)
  assert.equal(result.removed, true)
  await assert.rejects(readFile(resolve(result.temporaryRoot, '.git/config')), /ENOENT/)
})

test('UI-CHECKOUT:raw-lf-preservation', async () => {
  const result = await report()
  const anchors = [
    {
      path: 'docs/ui/Frade-UI-Style-Guide.md',
      sha256: '6fe886be979a32d87c94f29f65ee3abdbc2acf86dd4c12fdfc4d00022139b109',
      crlfCount: 0,
    },
    {
      path: 'docs/ui/QA-Checklist.md',
      sha256: '22fb9287d6740a2613dac07e5ef656aa6edcc9e6e1eb4be5bb5bff3f042b0f9b',
      crlfCount: 0,
    },
    {
      path: 'docs/ui/Themes-and-Plugins-Spec.md',
      sha256: 'f8fb35e715dd7e0c420768b855e991c96244279b637e6d4db5eb061514ec3e81',
      crlfCount: 0,
    },
    {
      path: 'packages/ui-workspace/tokens/tokens.json',
      sha256: 'd02e342cd54dc98807778fcdf10e386080f5b97a5c0a8dc1245b0ee9191e2764',
      crlfCount: 0,
    },
    {
      path: 'packages/ui-workspace/tokens/theme.schema.json',
      sha256: 'd0967fe506f13bbc506e48d92a8ff68c07cdcdcc119b6a15862c65b89d28d9f3',
      crlfCount: 0,
    },
    {
      path: 'tests/ui-contract/fixtures/upstream.tokens.css',
      sha256: '11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29',
      crlfCount: 0,
    },
    {
      path: 'packages/ui-workspace/src/design/generated/tokens.css',
      sha256: '6a6b47b12f5090a66231ee2541387ada31a2435d76f245c6631ad4285ac784a4',
      crlfCount: 0,
    },
    {
      path: 'packages/ui-workspace/src/design/generated/tokens.ts',
      sha256: 'fbe1ced2cbb112f8073de4a5f8c612811ef087165514304f3820862c929fb63e',
      crlfCount: 0,
    },
  ]
  assert.equal(result.controls[1].actualExit, 0)
  assert.equal(result.controls[1].namedContrastChecks, 102)
  assert.deepEqual(
    result.controls[1].artifacts.map((a) => ({
      path: a.path,
      sha256: a.sha256,
      crlfCount: a.crlfCount,
    })),
    anchors,
  )
  assert.equal(result.removed, true)
})

test('UI-CHECKOUT:unavailable-git-and-cleanup-failure', async () => {
  const missingGit = () => ({
    status: null,
    error: Object.assign(Error('Git unavailable'), { code: 'ENOENT' }),
  })
  await assert.rejects(
    runCheckoutControls({ attributes: expectedAttributes, spawn: missingGit }),
    /Git unavailable/,
  )
  await assert.rejects(
    runCheckoutControls({
      attributes: expectedAttributes,
      remove: async (path, options) => {
        await rm(path, options)
        throw Error('Injected cleanup failure')
      },
    }),
    /Injected cleanup failure/,
  )
  await assert.rejects(
    runCheckoutControls({
      attributes: expectedAttributes,
      spawn: missingGit,
      remove: async (path, options) => {
        await rm(path, options)
        throw Error('Injected cleanup failure')
      },
    }),
    (error) => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.errors.length, 2)
      assert.match(String(error.errors[0]), /Git unavailable/)
      assert.match(String(error.errors[1]), /Injected cleanup failure/)
      return true
    },
  )
})

test('UI-CHECKOUT:refuse-unverified-or-replaced-root', async () => {
  await assert.rejects(
    assertTemporaryIdentity(root, await stat(root, { bigint: true })),
    /Unverified temporary/,
  )
  const directory = await realpath(await mkdtemp(resolve(tmpdir(), 'frade-ui-checkout-')))
  const identity = await stat(directory, { bigint: true })
  try {
    await assert.rejects(
      assertTemporaryIdentity(directory, { ...identity, ino: identity.ino + 1n }),
      /identity changed/,
    )
  } finally {
    await assertTemporaryIdentity(directory, identity)
    await rm(directory, { recursive: true })
  }
})
