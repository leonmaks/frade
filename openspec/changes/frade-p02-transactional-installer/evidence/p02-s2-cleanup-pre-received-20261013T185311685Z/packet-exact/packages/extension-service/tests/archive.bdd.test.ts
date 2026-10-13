import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { validatePackage } from '../src/archive'
import { zipFixture, originalFixtureEntries, zip64End, crc32 } from './zip-fixture'
const fixtureRoot = new URL('./fixtures/', import.meta.url)
const original = readFileSync(new URL('original-input.frade-extension', fixtureRoot))
const compatible = readFileSync(new URL('compatible-light-dark.frade-extension', fixtureRoot))
const entries = originalFixtureEntries(compatible)
const tokenData = JSON.parse(
  readFileSync(new URL('../../ui-workspace/tokens/tokens.json', import.meta.url), 'utf8'),
)
const options = {
  appVersion: '0.1.0',
  apiVersion: '1.0.0',
  themeRoles: Object.keys(tokenData.themes.light),
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
async function reject(bytes: Uint8Array, code: string) {
  const before = hash(bytes),
    result = await validatePackage(bytes, options)
  expect(result.status).toBe('REJECTED')
  if (result.status === 'REJECTED') expect(result.diagnostic.code).toBe(code)
  expect(hash(bytes)).toBe(before)
}
function manifestChange(mutator: (manifest: any) => void) {
  return zipFixture(
    entries.map((entry) => {
      if (entry.name !== 'package.json') return entry
      const value = JSON.parse(Buffer.from(entry.data).toString())
      mutator(value)
      return { ...entry, data: JSON.stringify(value) }
    }),
  )
}
describe('P02PKG001/002: immutable original and explicit Light+Dark derivation', () => {
  it('keeps exact original sample and rejects actual Frade1.x engines', async () => {
    expect(hash(original)).toBe('e6372222207f180fdd5f759f4cbd654f295ce11e91bc6a9e86e1d766b9f04475')
    await reject(original, 'ENGINE_INCOMPATIBLE')
  })
  it('accepts both themes together without mutating input or claiming publisher trust', async () => {
    const before = hash(compatible),
      result = await validatePackage(compatible, options)
    expect(result.status).toBe('VALID')
    if (result.status !== 'VALID') throw Error('Compatible fixture rejected')
    expect(result.id).toBe('frade.workshop-themes')
    expect(result.sha256).toBe(before)
    expect(result.themes.map((theme) => [theme.id, theme.kind])).toEqual([
      ['frade.workshop-themes/workshop-light', 'light'],
      ['frade.workshop-themes/workshop-dark', 'dark'],
    ])
    expect(result.files.size).toBe(3)
    expect(hash(compatible)).toBe(before)
  })
})
describe('P02PKG004: path/link/name attack corpus', () => {
  it.each([
    '../escape',
    '/absolute',
    'C:/drive',
    '//server/share',
    'a\\b',
    'a/../b',
    'a/./b',
    'a//b',
    'a/',
    'a:stream',
    'nul',
    'con.txt',
    'aux',
    'lpt9.txt',
    'trailing.',
    'trailing ',
    'a/COM1.txt',
    'zero\0name',
  ])(
    'rejects unsafe file path %s',
    async (name) => await reject(zipFixture([...entries, { name, data: 'attack' }]), 'UNSAFE_PATH'),
  )
  it('rejects case-insensitive duplicates', async () =>
    await reject(zipFixture([...entries, { name: 'PACKAGE.JSON', data: '{}' }]), 'DUPLICATE_PATH'))
  it('rejects a file that shadows an entry ancestor', async () =>
    await reject(zipFixture([...entries, { name: 'themes', data: 'attack' }]), 'PATH_CONFLICT'))
  it.each([0o120777, 0o020600, 0o060600])(
    'rejects symlink/device mode %s',
    async (mode) =>
      await reject(
        zipFixture([...entries, { name: 'link', data: 'outside', mode }]),
        'UNSAFE_ENTRY',
      ),
  )
})
describe('P02PKG003: enforced resource boundaries', () => {
  it('rejects actual compressed bytes above50MiB', async () =>
    await reject(Buffer.alloc(50 * 1024 * 1024 + 1), 'ARCHIVE_LIMIT'))
  it('rejects expansion ratio over100', async () =>
    await reject(
      zipFixture([...entries, { name: 'bomb', data: Buffer.alloc(128 * 1024), method: 8 }]),
      'EXPANSION_RATIO',
    ))
  it('rejects10001entries', async () =>
    await reject(
      zipFixture(Array.from({ length: 10001 }, (_, i) => ({ name: 'file' + i, data: '' }))),
      'ENTRY_LIMIT',
    ))
  it('rejects path depth33', async () =>
    await reject(
      zipFixture([...entries, { name: Array(33).fill('part').join('/'), data: 'x' }]),
      'PATH_DEPTH',
    ))
})
describe('P02PKG005: identity/schema/real semver/no execution', () => {
  it.each([
    [
      'publisher',
      (m: any) => {
        m.publisher = '../outside'
      },
    ],
    [
      'unknown contribution',
      (m: any) => {
        m.contributes.commands = []
      },
    ],
    [
      'browser script',
      (m: any) => {
        m.browser = 'main.js'
      },
    ],
    [
      'native script',
      (m: any) => {
        m.main = 'main.js'
      },
    ],
    [
      'capability',
      (m: any) => {
        m.capabilities = ['repository.read']
      },
    ],
    [
      'duplicate theme',
      (m: any) => {
        m.contributes.themes.push(m.contributes.themes[0])
      },
    ],
    [
      'invalid semver',
      (m: any) => {
        m.version = '01.0.0'
      },
    ],
    [
      'invalid range',
      (m: any) => {
        m.engines.frade = 'nonsense'
      },
    ],
  ])(
    'rejects manifest %s',
    async (_label, mutator) => await reject(manifestChange(mutator), 'INVALID_MANIFEST'),
  )
  it('uses real bounded compatible semver ranges', async () => {
    const result = await validatePackage(
      manifestChange((m) => {
        m.engines.frade = '^0.1.0'
        m.engines.fradeApi = '>=1.0.0 <1.1.0'
      }),
      options,
    )
    expect(result.status).toBe('VALID')
  })
  it('does not include prerelease runtime through an ordinary range', async () => {
    const result = await validatePackage(compatible, { ...options, appVersion: '0.1.1-beta.1' })
    expect(result.status).toBe('REJECTED')
    if (result.status === 'REJECTED') expect(result.diagnostic.code).toBe('ENGINE_INCOMPATIBLE')
  })
  it.each([
    ['unknown role', { kind: 'light', colors: { 'unknown.role': '#123456' } }],
    ['unsafe color', { kind: 'light', colors: { 'surface.base': 'url(https://example.invalid)' } }],
    ['arbitrary CSS', { kind: 'light', colors: {}, css: 'body{}' }],
    ['kind disagreement', { kind: 'dark', colors: {} }],
  ])(
    'rejects native theme %s',
    async (_label, data) =>
      await reject(
        zipFixture(
          entries.map((entry) =>
            entry.name === 'themes/light.json' ? { ...entry, data: JSON.stringify(data) } : entry,
          ),
        ),
        'INVALID_THEME',
      ),
  )
})
describe('P02PKG006: ZIP integrity and transport metadata', () => {
  it('rejects truncated directory', async () =>
    await reject(compatible.subarray(0, compatible.length - 10), 'INVALID_ARCHIVE'))
  it('rejects CRC corruption', async () =>
    await reject(
      zipFixture(entries.map((entry, i) => (i === 0 ? { ...entry, crc: 0 } : entry))),
      'CRC_MISMATCH',
    ))
  it('rejects local/central filename disagreement', async () =>
    await reject(
      zipFixture(
        entries.map((entry, i) => (i === 0 ? { ...entry, localName: 'PACKAGE.JSON' } : entry)),
      ),
      'HEADER_MISMATCH',
    ))
  it('rejects encrypted data', async () =>
    await reject(
      zipFixture(entries.map((entry, i) => (i === 0 ? { ...entry, flags: 0x801 } : entry))),
      'UNSUPPORTED_ARCHIVE',
    ))
  it('rejects unsupported compression', async () =>
    await reject(
      zipFixture(entries.map((entry, i) => (i === 0 ? { ...entry, method: 99 } : entry))),
      'UNSUPPORTED_ARCHIVE',
    ))
  it('rejects header under-reported bytes', async () =>
    await reject(
      zipFixture(entries.map((entry, i) => (i === 0 ? { ...entry, declaredSize: 1 } : entry))),
      'SIZE_MISMATCH',
    ))
})

describe('P02PKG003/006: expanded payload and local-header effects', () => {
  it('rejects actual201MiB expanded payload within compressed/ratio limits', async () => {
    const data = Buffer.alloc(201 * 1024 * 1024)
    let state = 0x51cafe
    for (let i = 0; i < data.length; i += 16) {
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      data[i] = state & 255
    }
    const archive = zipFixture([...entries, { name: 'large.bin', data, method: 8 }])
    expect(archive.length).toBeLessThan(50 * 1024 * 1024)
    expect(data.length / (archive.length - compatible.length)).toBeLessThan(100)
    await reject(archive, 'EXPANDED_LIMIT')
  }, 60000)
  it('rejects multi-volume EOCD', async () => {
    const b = Buffer.from(compatible)
    b.writeUInt16LE(1, b.length - 18)
    await reject(b, 'UNSUPPORTED_ARCHIVE')
  })
  it('rejects conflicting local CRC before decoding', async () => {
    const b = Buffer.from(compatible)
    b.writeUInt32LE(0, 14)
    await reject(b, 'HEADER_MISMATCH')
  })
  it('rejects aliasing local-header entry offsets', async () => {
    const b = zipFixture(entries)
    const central = b.readUInt32LE(b.length - 6)
    const second = central + 46 + b.readUInt16LE(central + 28)
    b.writeUInt32LE(0, second + 42)
    await reject(b, 'HEADER_MISMATCH')
  })
})

describe('P02PKG006: supported descriptor and bounded ZIP64', () => {
  it('fixture CRC matches the standard independent known vector', () =>
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926))
  it('accepts valid streamed descriptors for both themes', async () =>
    expect(
      (
        await validatePackage(
          zipFixture(entries.map((entry) => ({ ...entry, method: 8, descriptor: true }))),
          options,
        )
      ).status,
    ).toBe('VALID'))
  it('rejects missing descriptor', async () =>
    await reject(
      zipFixture(entries.map((entry, i) => (i === 0 ? { ...entry, flags: 0x808 } : entry))),
      'HEADER_MISMATCH',
    ))
  it('accepts a bounded ZIP64 end record', async () =>
    expect((await validatePackage(zip64End(compatible), options)).status).toBe('VALID'))
  it('rejects unsafe integer ZIP64 locator', async () => {
    const b = zip64End(compatible)
    b.writeBigUInt64LE(9007199254740993n, b.length - 34)
    await reject(b, 'INVALID_ARCHIVE')
  })
  it('owns one immutable snapshot before asynchronous parser access', async () => {
    const bytes = Buffer.from(compatible),
      promise = validatePackage(bytes, options)
    bytes.fill(0)
    const result = await promise
    expect(result.status).toBe('VALID')
    if (result.status === 'VALID') expect(result.sha256).toBe(hash(compatible))
  })
})
