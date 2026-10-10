import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),at=new Date().toISOString(),dir=m.base+'/evidence/p02-native-extended-guard-protocol-red-'+at.replace(/[-:.]/g,'');assert.equal(sha(before),'7dce6193dc7cedb7b12077945a5c040a669cab1c75cfbfbdfdc29304a7f56526');fs.mkdirSync(dir);fs.writeFileSync(dir+'/original-native9.test.txt',before,{flag:'wx'});const added=String.raw`

// Additional actual backend contract coverage; the original nine assertions above are unchanged.
describe('P02FS001/002/004: actual guard ownership and native protocol boundaries', () => {
  it('retains the exclusive coordinator lease after owned-object enumeration', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('ACK')
    await fixture(async second => {
      expect((await second.send('bind', { root: f.root })).status).toBe('REFUSED')
    })
    expect((await f.send('capabilities')).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('enumerates an exact retained pending file without releasing its publication handle', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const opened = await f.send('write-open', { path: ['pending.json'], maxBytes: 0 })
    expect(opened.status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    const listed = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(listed.status).toBe('ACK')
    expect(listed.entries.map((e: { name: string }) => e.name).sort()).toEqual(['.coordinator.lock', 'pending.json'])
    expect((await f.send('replace', { handle: opened.handle, parent: [], name: 'final.json', sha256: sha(Buffer.alloc(0)) })).status).toBe('ACK')
    expect(await fs.readFile(path.join(f.root, 'final.json'))).toEqual(Buffer.alloc(0))
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('refuses deletion of the exact held root lease without deleting its ordinary file', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const reply = await f.send('remove', { path: ['.coordinator.lock'], kind: 'file' })
    expect(reply.status).toBe('REFUSED'); expect(reply.code).toBe('OWNED_OBJECT_PROTECTED')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('does not trust a forged hardlinked lease name at binding', () => fixture(async f => {
    await fs.link(path.join(f.outside, 'sentinel'), path.join(f.root, '.coordinator.lock'))
    expect((await f.send('bind', { root: f.root })).status).toBe('REFUSED')
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
  }))
  it('rejects a reparse outer ancestor before creating the missing installation root', () => fixture(async f => {
    const alias = path.join(path.dirname(f.root), 'outer-alias')
    await fs.symlink(f.outside, alias, 'junction')
    expect((await f.send('bind', { root: path.join(alias, 'extensions') })).status).toBe('REFUSED')
    expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
  }))
  it('bootstraps only a missing last root using the fully checked parent', () => fixture(async f => {
    const missing = path.join(f.root, 'authorized-root')
    expect((await f.send('bind', { root: missing })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(missing)).toEqual(['.coordinator.lock'])
  }))
  it('refuses a missing outer ancestor without creating directories', () => fixture(async f => {
    expect((await f.send('bind', { root: path.join(f.root, 'missing-outer', 'extensions') })).status).toBe('REFUSED')
    expect(await fs.readdir(f.root)).toEqual([])
  }))
  it('refuses unknown hardlinks in enumeration without changing outside bytes', () => fixture(async f => {
    await fs.link(path.join(f.outside, 'sentinel'), path.join(f.root, 'untrusted-link'))
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: [], limit: 128, cursor: null })).status).toBe('REFUSED')
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
  }))
  const invalid = [
    ['session', { session: '00000000-0000-0000-0000-000000000000' }],
    ['generation', { generation: 2 }],
    ['replayed request', { requestId: 1 }],
    ['expired deadline', { deadlineMs: 0 }],
    ['version', { version: 2 }],
    ['unknown field', { extra: true }],
    ['traversal', { path: ['..'] }],
    ['stream path', { path: ['file:stream'] }],
    ['reserved name', { path: ['NUL'] }],
    ['excessive depth', { path: Array.from({ length: 33 }, () => 'dir') }],
  ] as const
  for (const [name, fields] of invalid) it('refuses native ' + name + ' before a directory effect', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['must-not-exist'], ...fields })).status).toBe('REFUSED')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('accepts valid portable component data containing apostrophe and ampersand', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const name = "O'Brien & workshop"
    expect((await f.send('mkdir', { path: [name] })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock', name])
  }))
})
`;
fs.writeFileSync(file,Buffer.concat([before,Buffer.from(added)]));assert(fs.readFileSync(file).subarray(0,before.length).equals(before));fs.copyFileSync(process.argv[1],dir+'/add-extended-regressions.mjs',fs.constants.COPYFILE_EXCL);fs.writeFileSync(dir+'/test-intent.json',JSON.stringify({atUtc:at,status:'NOT_RUN',originalNative9PrefixByteIdentical:sha(before),testSourceSha256:sha(fs.readFileSync(file)),scope:'Actual lease exclusivity after listing/retained pending-file identity and publication/lease deletion+forgery/missing/reparse ancestors/native session-gen-sequence-deadline-schema-path boundaries/valid closed-protocol component data',productionUnchanged:sha(fs.readFileSync('packages/extension-service/native/windows-filesystem.cs')),capabilities:'NOT_VERIFIED',failingCasePolicy:'Meaningful assertion failure is a blocker; no weakening/skips/waiver',remaining:'DirectNT/FSCTL race and overlapping window, real flush/death/recovery/deploy remain required'},null,2)+'\n',{flag:'wx'});m.nativeExtendedGuardProtocolRedDir=dir;m.phase='NATIVE_EXTENDED_GUARD_PROTOCOL_TESTS_PENDING';fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir,originalNative9PrefixUnchanged:true}));
