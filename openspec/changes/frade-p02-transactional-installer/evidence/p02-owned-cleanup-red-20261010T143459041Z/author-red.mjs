import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';const root='C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade';assert.equal(process.cwd().replaceAll('\\','/'),root);const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),b=m.base,at=new Date().toISOString(),d=b+'/evidence/p02-owned-cleanup-red-'+at.replace(/[-:.]/g,''),sha=x=>crypto.createHash('sha256').update(x).digest('hex');assert.equal(m.bootstrapScheme.PRE,'PASS');fs.mkdirSync(d);const original=['packages/extension-service/tests/filesystem.windows.test.ts','packages/extension-service/tests/filesystem.protocol.test.ts','packages/extension-service/tests/filesystem.transport.test.ts'];for(const p of original)fs.copyFileSync(p,d+'/'+p.split('/').at(-1)+'.original.txt');fs.writeFileSync(d+'/baseline.json',JSON.stringify({atUtc:at,head:m.head,PRE:m.bootstrapScheme.receivedDir,PREsha:m.bootstrapScheme.reportSha256,original:original.map(path=>({path,sha256:sha(fs.readFileSync(path))})),nativeSha256:sha(fs.readFileSync('packages/extension-service/native/windows-filesystem.cs')),classification:'ABSTRACTION_BOUNDARY',strategy:'C+G, targeted two-file RED/GREEN, then full current native/service tests after coherent slice. No duplicate full suite per edit; all original assertions/closure remain.'},null,2)+'\n');
const p='packages/extension-service/tests/filesystem.protocol.test.ts';fs.appendFileSync(p,`\n\ndescribe('P02-BOOTSTRAP-OWNED-CLEANUP-01: exact optional removal guards', () => {\n  for (const fields of [\n    { expectedIdentity: 'a'.repeat(24) }, { emptyOnly: true },\n    { expectedIdentity: 'a'.repeat(24), emptyOnly: true },\n  ]) it('admits directory cleanup with known guard fields ' + JSON.stringify(fields), () => {\n    const gate = bound(), value = command('remove', { path: ['probe'], kind: 'directory', ...fields }, 2)\n    expect(gate.accept(frame(value), 10)).toEqual(value)\n    expect(gate.complete(2, true)).toBe(true)\n    expect(gate.closed).toBe(false)\n  })\n  it('admits exact-identity file deletion', () => {\n    const gate = bound(), value = command('remove', { path: ['probe', 'owner.json'], kind: 'file', expectedIdentity: 'f'.repeat(24) }, 2)\n    expect(gate.accept(frame(value), 10)).toEqual(value)\n    expect(gate.complete(2, true)).toBe(true)\n  })\n  for (const fields of [\n    { expectedIdentity: null }, { expectedIdentity: 24 }, { expectedIdentity: '' },\n    { expectedIdentity: 'a'.repeat(23) }, { expectedIdentity: 'a'.repeat(25) }, { expectedIdentity: 'A'.repeat(24) },\n    { emptyOnly: false }, { emptyOnly: null }, { emptyOnly: 1 }, { emptyOnly: 'true' },\n    { emptyOnly: true, kind: 'file' }, { expectedIdentity: 'a'.repeat(24), extra: true },\n  ]) it('rejects invalid guard before any effect ' + JSON.stringify(fields), () =>\n    refused(command('remove', { path: ['probe'], kind: 'directory', ...fields }, 2), true))\n})\n`);
let header=fs.readFileSync(original[0],'utf8').split("describe('P02FS001–004")[0].replace("import { createPresentationSettings } from '../../../apps/desktop/src/main/presentation-settings'\n",'').replace("import { createPresentationSettings } from '../../../apps/desktop/src/main/presentation-settings'\r\n",'');header=header.replace("const executable =", "import { WindowsFilesystemTransport } from '../src/filesystem/windows'\nconst executable =");
const tests=`
describe('P02 owned bootstrap cleanup: actual identity and empty-only guards', () => {
  const identity = async (f: Fixture, parent: string[], name: string) => {
    const r = await f.send('list', { path: parent, limit: 128, cursor: null })
    expect(r.status).toBe('ACK'); const row = r.entries.find((e: any) => e.name === name)
    expect(row.identity).toMatch(/^[a-f0-9]{24}$/); return row.identity as string
  }
  it('deletes only the exact ordinary file and exact empty held directory', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['probe'] })).status).toBe('ACK')
    const bytes = Buffer.from('owner-proof'), opened = await f.send('write-open', { path: ['probe', 'owner.json'], maxBytes: bytes.length })
    expect(opened.status).toBe('ACK'); expect((await f.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
    expect((await f.send('write-close', { handle: opened.handle, sha256: sha(bytes), retainForPublication: false })).status).toBe('ACK')
    const fileId = await identity(f, ['probe'], 'owner.json'), dirId = await identity(f, [], 'probe')
    expect((await f.send('remove', { path: ['probe', 'owner.json'], kind: 'file', expectedIdentity: fileId })).status).toBe('ACK')
    expect(await fs.readdir(path.join(f.root, 'probe'))).toEqual([])
    expect((await f.send('remove', { path: ['probe'], kind: 'directory', expectedIdentity: dirId, emptyOnly: true })).status).toBe('ACK')
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('preserves genuinely new unknown child instead of recursive cleanup', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('mkdir', { path: ['probe'] })).status).toBe('ACK')
    const dirId = await identity(f, [], 'probe')
    await fs.writeFile(path.join(f.root, 'probe', 'unknown'), 'unowned-exact-bytes', { flag: 'wx' })
    expect(await fs.readFile(path.join(f.root, 'probe', 'unknown'), 'utf8')).toBe('unowned-exact-bytes')
    const r = await f.send('remove', { path: ['probe'], kind: 'directory', expectedIdentity: dirId, emptyOnly: true })
    expect(['REFUSED', 'UNKNOWN']).toContain(r.status); expect(r.code).not.toBe('INVALID_SCHEMA')
    expect(await fs.readFile(path.join(f.root, 'probe', 'unknown'), 'utf8')).toBe('unowned-exact-bytes')
    expect(await fs.readdir(path.join(f.root, 'probe'))).toEqual(['unknown'])
  }))
  it('refuses a genuinely changed same-path ordinary object using captured identity', () => fixture(async f => {
    await fs.writeFile(path.join(f.root, 'target'), 'original', { flag: 'wx' })
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const oldId = await identity(f, [], 'target'), closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
    expect((await f.send('dispose')).status).toBe('ACK'); await closed
    await fs.rename(path.join(f.root, 'target'), path.join(f.root, 'retained-original'))
    await fs.writeFile(path.join(f.root, 'target'), 'replacement', { flag: 'wx' })
    const port = await WindowsFilesystemTransport.connect({ installationRoot: f.root, distributionDirectory: fileURLToPath(new URL('../dist/native/', import.meta.url)), sourceSha256: sha(await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url))), generation: 2 })
    try {
      const rows = await port.request({ operation: 'list', path: [], limit: 128, cursor: null })
      expect(rows.entries.find((e: any) => e.name === 'target').identity).not.toBe(oldId)
      await expect(port.request({ operation: 'remove', path: ['target'], kind: 'file', expectedIdentity: oldId } as any)).rejects.toThrow('TARGET_IDENTITY_MISMATCH')
      expect(await fs.readFile(path.join(f.root, 'target'), 'utf8')).toBe('replacement')
      expect(await fs.readFile(path.join(f.root, 'retained-original'), 'utf8')).toBe('original')
    } finally { await port.dispose() }
  }))
  for (const fields of [ { expectedIdentity: 'A'.repeat(24) }, { expectedIdentity: 'a'.repeat(23) }, { emptyOnly: false }, { emptyOnly: true, kind: 'file' }, { expectedIdentity: 'a'.repeat(24), extra: true } ])
    it('rejects invalid native guard fields before child effects ' + JSON.stringify(fields), () => fixture(async f => {
      await fs.mkdir(path.join(f.root, 'probe')); await fs.writeFile(path.join(f.root, 'probe', 'sentinel'), 'unchanged')
      expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
      expect((await f.send('remove', { path: ['probe'], kind: 'directory', ...fields })).status).toBe('REFUSED')
      expect(await fs.readFile(path.join(f.root, 'probe', 'sentinel'), 'utf8')).toBe('unchanged')
    }))
})
`;fs.writeFileSync('packages/extension-service/tests/filesystem.cleanup.test.ts',header+tests,{flag:'wx'});fs.copyFileSync(process.argv[1],d+'/author-red.mjs');const status=`# Frade UI Design Contract — P02 S1 meaningful RED\n\nОбновлено ${at}; owner codex/frade-ui-design-contract, ${root}; common E:/dev/codex/frade/.git. Guide1.0; baseline/origin ниже сохранены. Tasks3/9,2.2IN_PROGRESS.\n\nS0 PRE PASS ${m.bootstrapScheme.reportSha256}, exact cleanup scope принят. Записаны новые behavioral guard cases; RED NOT_RUN, production native/host/factory/Main не изменены. C+G: targeted feedback → coherent full regression. Remaining factory/Main/deployment/journal/UI/verify/POST/archive открыты; READY_FOR_VERIFY:NO; noP03.\n\nHEAD ${m.head} published/verified; S1 checkpoint PENDING. Status открыт справа queued/visibility unconfirmed. Next: actual two-file RED, затем guarded production только после сохранения failure.\n\n## Предыдущие записи\n\n`;fs.writeFileSync(m.status,status+fs.readFileSync(m.status,'utf8'));m.cleanupRedDir=d;m.phase='P02_S1_GUARDS_RED_NOT_RUN';fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir:d,newTest:'filesystem.cleanup.test.ts',productionChanged:false,PRE:'PASS'}));
