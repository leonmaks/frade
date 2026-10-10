import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),p='packages/extension-service/tests/filesystem.windows.test.ts',s=fs.readFileSync(p,'utf8');const begin=s.indexOf("describe('P02FS001: preexisting writer refusal"),end=s.indexOf("\n\n\nit('retains the complete",begin);assert(begin>0&&end>begin);let tail=s.slice(begin,end).replaceAll('writer','deleter').replaceAll('WRITER','DELETER');const source=fs.readFileSync('packages/extension-service/tests/fixtures/windows-preexisting-writer-actor.cs','utf8').replace('0x40000000','0x10000').replaceAll('Writer','Deleter').replaceAll('writer','deleter');fs.writeFileSync('packages/extension-service/tests/fixtures/windows-preexisting-deleter-actor.cs',source,{flag:'wx'});tail+=String.raw`

it('attempts all remaining handle releases after a real invalid-handle close failure in an instrumented fixture', () => fixture(async f => {
  const transform = (source: string) => exactNativeTransform(source, 'case "dispose": Keys(v);Release();Bound=false;break;', 'case "dispose": Keys(v);Check(CloseHandle(Lease));Release();Bound=false;break;')
  await instrumentedNative(f, 'deliberately-closed-lease-real-WIN32_6', transform, async shadow => {
    expect((await shadow.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await shadow.send('mkdir', { path: ['held'] })).status).toBe('ACK')
    const one = await shadow.send('write-open', { path: ['held', 'one'], maxBytes: 0 })
    const two = await shadow.send('write-open', { path: ['held', 'two'], maxBytes: 0 })
    expect(one.status).toBe('ACK'); expect(two.status).toBe('ACK')
    expect(await shadow.send('dispose')).toMatchObject({ status: 'REFUSED', code: 'WIN32_6' })
    await expectNativeExit(shadow.child, 2)
    // Actual exclusive file opens and root rename after failure prove release, not just cleared dictionaries.
    const handles = await Promise.all(['one', 'two'].map(name => fs.open(path.join(f.root, 'held', name), 'r+')))
    await Promise.all(handles.map(handle => handle.close()))
    await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    expect((await fs.readdir(path.join(f.root, 'held'))).sort()).toEqual(['one', 'two'])
  })
}))
`;fs.appendFileSync(p,'\n\n'+tail);const original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const d=m.base+'/evidence/p02-native-deleter-close-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
