import fs from 'node:fs';import assert from 'node:assert/strict';const root='C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade';assert.equal(process.cwd().replaceAll('\\','/'),root);const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const p='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(p),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(before.subarray(0,original.length).equals(original));const tail=String.raw`

async function expectNativeExit(child: ChildProcessWithoutNullStreams, code: number) {
  if (child.exitCode !== null) { expect(child.exitCode).toBe(code); return }
  const actual = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('EXPECTED_NATIVE_EXIT_TIMEOUT')), 5000)
    child.once('close', result => { clearTimeout(timer); resolve(result) })
  })
  expect(actual).toBe(code)
}

describe('P02FS002/004: actual chunk, resource, publication and process-death boundaries', () => {
  const malformedChunks = [
    ['wrong offset', { offset: 1, data: 'YQ==' }, 'INVALID_WRITE_OFFSET'],
    ['empty bytes', { offset: 0, data: '' }, 'INVALID_CHUNK'],
    ['noncanonical base64', { offset: 0, data: 'YR==' }, 'WRITE_LIMIT'],
    ['invalid base64', { offset: 0, data: '!not-base64' }, 'INVALID_CHUNK'],
    ['per-file overflow', { offset: 0, data: Buffer.from('ab').toString('base64') }, 'WRITE_LIMIT'],
    ['chunk overflow', { offset: 0, data: Buffer.alloc(65537).toString('base64') }, 'WRITE_LIMIT'],
  ] as const
  for (const [name, fields, code] of malformedChunks) it('refuses ' + name + ' without a file-byte effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: name === 'chunk overflow' ? 65537 : 1 })
    expect(opened.status).toBe('ACK')
    const refused = await f.send('write-chunk', { handle: opened.handle, ...fields })
    expect(refused.status).toBe('REFUSED'); expect(refused.code).toBe(code)
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  it('accepts exactly 64KiB chunks and contiguous offsets with exact final hash/readback', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const first = Buffer.alloc(65536, 37), last = Buffer.from('last'), bytes = Buffer.concat([first, last])
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect(await f.send('write-chunk', { handle: opened.handle, offset: 0, data: first.toString('base64') })).toMatchObject({ status: 'ACK', offset: first.length })
    expect(await f.send('write-chunk', { handle: opened.handle, offset: first.length, data: last.toString('base64') })).toMatchObject({ status: 'ACK', offset: bytes.length })
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes), retainForPublication: false })).status).toBe('ACK')
    const read = await f.send('read', { path: ['pending'], offset: first.length, length: last.length })
    expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(last)
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
  }))
  it('refuses aggregate reserved byte overflow before creating another leaf', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('write-open', { path: ['reserved'], maxBytes: 209715200 })).status).toBe('ACK')
    expect(await f.send('write-open', { path: ['overflow'], maxBytes: 1 })).toMatchObject({ status: 'REFUSED', code: 'WRITE_RESOURCE_LIMIT' })
    await expectNativeExit(f.process, 2)
    expect((await fs.readdir(f.root)).sort()).toEqual(['.coordinator.lock', 'reserved'])
    expect(await fs.readFile(path.join(f.root, 'reserved'))).toEqual(Buffer.alloc(0))
  }))
  it('refuses a wrong closing hash and releases the existing ordinary bytes', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = Buffer.from('original'), opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect(await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.from('wrong')) })).toMatchObject({ status: 'REFUSED', code: 'HASH_MISMATCH' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
    await fs.rename(path.join(f.root, 'pending'), path.join(f.root, 'released'))
    expect(await fs.readFile(path.join(f.root, 'released'))).toEqual(bytes)
  }))
  it('refuses writing a sealed held file without changing the sealed bytes', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: 1 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await f.send('write-chunk', { handle: opened.handle, offset: 0, data: 'YQ==' })).toMatchObject({ status: 'REFUSED', code: 'INVALID_WRITE_OFFSET' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  it('refuses an exclusive write over an existing ordinary leaf', () => fixture(async f => {
    const existing = path.join(f.root, 'existing'), bytes = Buffer.from('keep-original')
    await fs.writeFile(existing, bytes)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('write-open', { path: ['existing'], maxBytes: 1 })).status).toBe('REFUSED')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(existing)).toEqual(bytes)
  }))
  for (const kind of ['ordinary', 'directory', 'junction', 'hardlink'] as const) it('does not overwrite an existing ' + kind + ' publication target', () => fixture(async f => {
    const target = path.join(f.root, 'target'), old = Buffer.from('old-target')
    if (kind === 'ordinary') await fs.writeFile(target, old)
    if (kind === 'directory') { await fs.mkdir(target); await fs.writeFile(path.join(target, 'sentinel'), old) }
    if (kind === 'junction') await fs.symlink(f.outside, target, 'junction')
    if (kind === 'hardlink') await fs.link(path.join(f.outside, 'sentinel'), target)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = Buffer.from('new-source'), opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'target', sha256: sha(bytes) })).status).toBe('UNKNOWN')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(bytes)
    if (kind === 'ordinary') expect(await fs.readFile(target)).toEqual(old)
    if (kind === 'directory') expect(await fs.readFile(path.join(target, 'sentinel'))).toEqual(old)
    if (kind === 'junction') expect((await fs.lstat(target)).isSymbolicLink()).toBe(true)
    if (kind === 'hardlink') expect(await fs.readFile(target, 'utf8')).toBe('outside-original')
  }))
  it('refuses a different publication parent before an NT rename effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['different'] })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: 0 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await f.send('replace', { handle: opened.handle, parent: ['different'], name: 'target', sha256: sha(Buffer.alloc(0)) })).toMatchObject({ status: 'REFUSED', code: 'INVALID_PUBLICATION' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readdir(path.join(f.root, 'different'))).toEqual([])
    expect(await fs.readFile(path.join(f.root, 'pending'))).toEqual(Buffer.alloc(0))
  }))
  for (const point of ['open', 'sealed', 'published'] as const) it('reopens exact guarded bytes and root after real helper kill at ' + point, () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const bytes = point === 'open' ? Buffer.alloc(0) : Buffer.from('survives-process-death')
    const opened = await f.send('write-open', { path: ['pending'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK')
    if (point !== 'open') {
      expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
      expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
    }
    if (point === 'published') expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'final', sha256: sha(bytes) })).status).toBe('ACK')
    const closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
    expect(f.process.kill()).toBe(true); await closed
    const name = point === 'published' ? 'final' : 'pending'
    expect(await fs.readFile(path.join(f.root, name))).toEqual(bytes)
    await fixture(async next => {
      expect((await next.send('bind', { root: f.root })).status).toBe('ACK')
      const read = await next.send('read', { path: [name], offset: 0, length: 65536 })
      expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(bytes)
      expect((await next.send('dispose')).status).toBe('ACK')
    })
    await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    expect(await fs.readFile(path.join(f.root, name))).toEqual(bytes)
  }))
})
`;fs.appendFileSync(p,tail);assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const d=m.base+'/evidence/p02-native-chunk-publication-death-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.writeFileSync(d+'/fixture-contract.json',JSON.stringify({atUtc:new Date().toISOString(),scope:'existing accepted P02FS002/004 native private protocol actual byte/resource/publication/process-death tests',original9PrefixUnchanged:true,productionChanged:false,capabilities:'NOT_VERIFIED',notProven:'lost ACK/flush fault/hardware power loss/journal recovery/deployment remain open'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
