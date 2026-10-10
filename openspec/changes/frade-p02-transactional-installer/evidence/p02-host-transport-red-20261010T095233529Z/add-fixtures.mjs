import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const code=String.raw`import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
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
`;fs.writeFileSync('packages/extension-service/tests/filesystem.transport.test.ts',code,{flag:'wx'});const d=m.base+'/evidence/p02-host-transport-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
