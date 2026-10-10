import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { WindowsFilesystemTransport } from '../src/filesystem/windows'
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
async function ownedTransport(run: (f: { root: string; distribution: string; sourceSha256: string; connect: () => Promise<WindowsFilesystemTransport> }) => Promise<void>) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('WINDOWS_TRANSPORT_NOT_RUN_UNSUPPORTED_HOST')
  const parent = await fs.realpath(os.tmpdir()), base = await fs.mkdtemp(path.join(parent, 'frade-p02-transport-'))
  const root = path.join(base, 'extensions'), distribution = path.join(base, 'distribution')
  const sourceSha256 = sha(await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url)))
  await fs.mkdir(root); await fs.mkdir(distribution)
  for (const name of ['frade-filesystem.exe', 'integrity.json']) await fs.copyFile(new URL('../dist/native/' + name, import.meta.url), path.join(distribution, name))
  const owned: WindowsFilesystemTransport[] = []
  const connect = async () => { const transport = await WindowsFilesystemTransport.connect({ installationRoot: root, distributionDirectory: distribution, sourceSha256, generation: 1 }); owned.push(transport); return transport }
  const cleanup = async () => {
    for (const transport of owned) await transport.dispose()
    if (path.dirname(base).toLowerCase() !== parent.toLowerCase() || !path.basename(base).startsWith('frade-p02-transport-')) throw Error('UNSAFE_TRANSPORT_CLEANUP')
    await fs.rm(base, { recursive: true })
  }
  try { await run({ root, distribution, sourceSha256, connect }) } finally { await cleanup() }
}
describe('P02FS004/005: actual verified-asset closed host transport, no installer capability claim', () => {
  it('negotiates native clock/session capabilities without promoting NOT_VERIFIED and releases on dispose', () => ownedTransport(async f => {
    const port = await f.connect(), result = await port.request({ operation: 'capabilities' })
    expect(result.status).toBe('ACK')
    expect(result.capabilities).toMatchObject({ protocol: 1, platform: 'windows-x64', filesystem: 'NTFS', runtimeProof: 'NOT_VERIFIED', unconditionalPowerLoss: 'NOT_PROVEN' })
    await port.dispose(); expect(port.closed).toBe(true)
    await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    await expect(port.request({ operation: 'capabilities' })).rejects.toThrow('FILESYSTEM_SESSION_CLOSED')
  }))
  it('serializes actual bounded writes, seal, publication and exact readback over owned stdio', () => ownedTransport(async f => {
    const port = await f.connect(), bytes = Buffer.from('transport-owned-record')
    const opened = await port.request({ operation: 'write-open', path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await port.request({ operation: 'write-chunk', handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await port.request({ operation: 'write-close', handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    expect((await port.request({ operation: 'replace', handle: opened.handle, parent: [], name: 'final', sha256: sha(bytes) })).status).toBe('ACK')
    const read = await port.request({ operation: 'read', path: ['final'], offset: 0, length: 65536 })
    expect(Buffer.from(read.data, 'base64')).toEqual(bytes)
    await port.dispose(); expect(await fs.readFile(path.join(f.root, 'final'))).toEqual(bytes)
  }))
  for (const drift of ['source', 'executable', 'protocol', 'platform', 'bytes'] as const) it('refuses ' + drift + ' asset drift before root binding effects', () => ownedTransport(async f => {
    const metadataFile = path.join(f.distribution, 'integrity.json'), metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'))
    if (drift === 'executable') await fs.appendFile(path.join(f.distribution, 'frade-filesystem.exe'), 'drift')
    else {
      if (drift === 'source') metadata.sourceSha256 = '0'.repeat(64)
      if (drift === 'protocol') metadata.protocol = 2
      if (drift === 'platform') metadata.platform = 'windows-arm64'
      if (drift === 'bytes') metadata.executableBytes += 1
      await fs.writeFile(metadataFile, JSON.stringify(metadata))
    }
    await expect(f.connect()).rejects.toThrow('NATIVE_BUILD_DRIFT')
    expect(await fs.readdir(f.root)).toEqual([])
  }))
  it('refuses an invalid path locally and closes the session without a child effect', () => ownedTransport(async f => {
    const port = await f.connect()
    await expect(port.request({ operation: 'mkdir', path: ['..'] })).rejects.toThrow('INVALID_FILESYSTEM_COMMAND')
    expect(port.closed).toBe(true); await port.dispose()
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('rejects concurrent admission instead of queueing a second mutation', () => ownedTransport(async f => {
    const port = await f.connect(), first = port.request({ operation: 'mkdir', path: ['first'] })
    const firstRefusal = expect(first).rejects.toThrow('CONCURRENT_FILESYSTEM_COMMAND')
    await expect(port.request({ operation: 'mkdir', path: ['second'] })).rejects.toThrow('CONCURRENT_FILESYSTEM_COMMAND')
    await firstRefusal; await port.dispose()
    expect(port.closed).toBe(true); expect((await fs.readdir(f.root)).includes('second')).toBe(false)
  }))
})


async function malformedReplyFixture(mode: string, run: (options: Parameters<typeof WindowsFilesystemTransport.connect>[0]) => Promise<void>) {
  const parent = await fs.realpath(os.tmpdir()), base = await fs.mkdtemp(path.join(parent, 'frade-p02-reply-fixture-'))
  const root = path.join(base, mode), distribution = path.join(base, 'distribution'), source = fileURLToPath(new URL('./fixtures/windows-malformed-reply-helper.cs', import.meta.url))
  const cleanup = async () => {
    if (path.dirname(base).toLowerCase() !== parent.toLowerCase() || !path.basename(base).startsWith('frade-p02-reply-fixture-')) throw Error('UNSAFE_REPLY_FIXTURE_CLEANUP')
    await fs.rm(base, { recursive: true })
  }
  try {
    await fs.mkdir(root); await fs.mkdir(distribution)
    const executable = path.join(distribution, 'frade-filesystem.exe'), compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
    const built = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + executable, source], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
    const sourceSha256 = sha(await fs.readFile(source)), bytes = await fs.readFile(executable)
    await fs.writeFile(path.join(distribution, 'integrity.json'), JSON.stringify({ schemaVersion: 1, protocol: 1, platform: 'windows-x64', source: 'native/windows-filesystem.cs', executable: 'frade-filesystem.exe', sourceSha256, executableSha256: sha(bytes), executableBytes: bytes.length, runtimeCapabilities: 'NOT_VERIFIED', publisherTrust: 'NOT_ASSERTED' }))
    await run({ installationRoot: root, distributionDirectory: distribution, sourceSha256, generation: 1 })
    expect(await fs.readdir(root)).toEqual([])
  } finally { await cleanup() }
}
describe('P02FS004: actual first-party malformed-reply child fixtures, not native security capability', () => {
  for (const mode of ['wrong-version', 'wrong-session', 'wrong-generation', 'wrong-request', 'negative-clock', 'fractional-clock', 'unknown-field', 'noncanonical-body', 'invalid-utf8', 'helper-exit']) it('invalidates malformed ' + mode + ' instead of accepting a bind', () => malformedReplyFixture(mode, async options => {
    await expect(WindowsFilesystemTransport.connect(options)).rejects.toThrow(mode === 'helper-exit' ? 'FILESYSTEM_HELPER_CLOSED' : 'INVALID_FILESYSTEM_REPLY')
  }))
})


for (const mode of ['deadline-clock', 'oversized-frame', 'double-cr']) it('refuses ' + mode + ' as a reply outside the admitted operation contract', () => malformedReplyFixture(mode, async options => {
  let accepted: WindowsFilesystemTransport | null = null
  try {
    const attempt = WindowsFilesystemTransport.connect(options).then(port => { accepted = port; return port })
    await expect(attempt).rejects.toThrow('INVALID_FILESYSTEM_REPLY')
  } finally {
    // If an invalid bind was accepted, the fixture's one-reply helper exits on the dispose request.
    // Assert that release outcome rather than suppressing the error or leaking the process on RED.
    if (accepted) await expect((accepted as WindowsFilesystemTransport).dispose()).rejects.toThrow('FILESYSTEM_HELPER_CLOSED')
  }
}))
