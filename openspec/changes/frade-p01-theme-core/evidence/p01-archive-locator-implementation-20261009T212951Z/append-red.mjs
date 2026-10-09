import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const p='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p01-archive-current.json',m=JSON.parse(fs.readFileSync(p)),pre=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p01-archive-review-received-current.json')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),at=new Date().toISOString(),dir=m.base+'/evidence/p01-archive-locator-implementation-'+at.replaceAll('-','').replaceAll(':','').replace(/\.\d+Z$/,'Z');assert.equal(pre.status,'PASS');assert.equal(sha(fs.readFileSync(m.originalSource)),m.sourceBeforeSha256);fs.mkdirSync(dir);fs.copyFileSync(m.originalSource,dir+'/bdd-before.tsx',fs.constants.COPYFILE_EXCL);fs.copyFileSync(m.traceability,dir+'/registry-before.json',fs.constants.COPYFILE_EXCL);fs.copyFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p01-link-capability-elevated-20261010.json',dir+'/host-link-capability.json',fs.constants.COPYFILE_EXCL);const pins=['apps/desktop/src/main/drawio-theme-bridge.ts','apps/desktop/tests/unit/drawio-theme.test.ts','apps/desktop/tests/e2e/ui-contract-theme.spec.ts','apps/desktop/out/main/index.cjs','packages/drawio-desktop/public/js/app.min.js'].filter(f=>fs.existsSync(f)).map(path=>({path,bytes:fs.statSync(path).size,sha256:sha(fs.readFileSync(path))}));fs.writeFileSync(dir+'/preservation-before.json',JSON.stringify({atUtc:at,pins,pre:pre.dir,sourceSha256:m.sourceBeforeSha256,registrySha256:sha(fs.readFileSync(m.traceability)),productionChange:false},null,2)+'\n',{flag:'wx'});
const appendix=`
// P01-ARCHIVE-EVIDENCE-LOCATOR-01: isolated filesystem oracles; no runtime success fabrication.
type ArchiveLocationFixture = { root: string; outside: string; fs: typeof import('node:fs'); logical: string; active: string; archived: string; bytes: Buffer; put: (physical: string) => void }
async function withArchiveLocationFixture(run: (fixture: ArchiveLocationFixture) => void | Promise<void>) {
  const fs = await import('node:fs'), paths = await import('node:path'), os = await import('node:os')
  const parent = fs.realpathSync(os.tmpdir()), owned = fs.mkdtempSync(resolve(parent, 'frade-p01-archive-test-'))
  const fixtureRoot = resolve(owned, 'root'), outside = resolve(owned, 'outside')
  fs.mkdirSync(fixtureRoot); fs.mkdirSync(outside)
  const logical = fuiControlRun + '/command.json'
  const active = logical, archived = logical.replace('openspec/changes/frade-p01-theme-core/', 'openspec/changes/archive/2026-10-10-frade-p01-theme-core/')
  // Distinct valid JSON whitespace proves that the reader used this fixture, not the actual worktree.
  const bytes = Buffer.concat([readFileSync(resolve(root, logical)), Buffer.from('\\n\\n')])
  const put = (physical: string) => { const target = resolve(fixtureRoot, physical); fs.mkdirSync(paths.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes) }
  try { await run({ root: fixtureRoot, outside, fs, logical, active, archived, bytes, put }) }
  finally {
    expect(paths.dirname(owned)).toBe(parent)
    expect(paths.basename(owned).startsWith('frade-p01-archive-test-')).toBe(true)
    expect(fs.lstatSync(owned).isSymbolicLink()).toBe(false)
    expect(fs.realpathSync(owned)).toBe(owned)
    fs.rmSync(owned, { recursive: true })
    expect(fs.existsSync(owned)).toBe(false)
  }
}
const readArchiveFixture = (logical: string, fixtureRoot: string) => (fuiRead as (file: string, fixtureRoot: string) => Buffer)(logical, fixtureRoot)
for (const location of ['active', 'archived'] as const)
  for (const filename of ['command.json', 'runtime.stdout.json', 'control-valid-bindings.json'])
    it('P01-ARCHIVE-FS-001 ' + location + ' preserves exact fixture bytes for ' + filename, () => withArchiveLocationFixture(f => {
      const logical = f.logical.replace('/command.json', '/' + filename), physical = f[location].replace('/command.json', '/' + filename)
      f.put(physical)
      expect(readArchiveFixture(logical, f.root)).toEqual(f.bytes)
    }))
it('P01-ARCHIVE-FS-002 missing evidence fails explicitly', () => withArchiveLocationFixture(f => {
  expect(() => readArchiveFixture(f.logical, f.root)).toThrow('FUI_LOCATION_MISSING')
}))
it('P01-ARCHIVE-FS-003 duplicate locations fail even for identical bytes', () => withArchiveLocationFixture(f => {
  f.put(f.active); f.put(f.archived)
  expect(() => readArchiveFixture(f.logical, f.root)).toThrow('FUI_LOCATION_DUPLICATE')
}))
for (const invalid of ['../command.json', 'command.json/child', 'runtime.other.json', '..\\\\command.json', 'control-valid-bindings.json/..'])
  it('P01-ARCHIVE-FS-004 rejects unapproved evidence suffix ' + invalid, () => withArchiveLocationFixture(f => {
    f.put(f.active)
    expect(() => readArchiveFixture(f.logical.replace('command.json', invalid), f.root)).toThrow('FUI_LOCATION_PATH')
  }))
it('P01-ARCHIVE-FS-005 physical archive path is not a permitted logical ID', () => withArchiveLocationFixture(f => {
  f.put(f.archived)
  expect(() => readArchiveFixture(f.archived, f.root)).toThrow('FUI_LOCATION_PATH')
}))
it('P01-ARCHIVE-FS-006 rejects unsupported runtime directory', () => withArchiveLocationFixture(f => {
  f.put(f.active)
  expect(() => readArchiveFixture(f.logical.replace('p01-fui-runtime-', 'p01-other-runtime-'), f.root)).toThrow('FUI_LOCATION_PATH')
}))
it('P01-ARCHIVE-FS-007 regular-file evidence required', () => withArchiveLocationFixture(f => {
  f.fs.mkdirSync(resolve(f.root, f.active), { recursive: true })
  expect(() => readArchiveFixture(f.logical, f.root)).toThrow('FUI_LOCATION_UNSAFE')
}))
for (const location of ['active', 'archived'] as const)
  for (const position of ['leaf', 'ancestor'] as const)
    it('P01-ARCHIVE-FS-008 rejects actual ' + position + ' link in ' + location + ' location', async () => withArchiveLocationFixture(async f => {
      const paths = await import('node:path'), physical = resolve(f.root, f[location])
      const link = position === 'leaf' ? physical : paths.dirname(physical)
      f.fs.mkdirSync(paths.dirname(link), { recursive: true })
      const type = process.platform === 'win32' ? 'junction' : position === 'leaf' ? 'file' : 'dir'
      const target = type === 'file' ? resolve(f.outside, 'command.json') : f.outside
      f.fs.writeFileSync(resolve(f.outside, 'command.json'), f.bytes)
      f.fs.symlinkSync(target, link, type)
      expect(f.fs.lstatSync(link).isSymbolicLink()).toBe(true)
      expect(() => readArchiveFixture(f.logical, f.root)).toThrow('FUI_LOCATION_UNSAFE')
    }))
it('P01-ARCHIVE-FS-009 rejects linked fixture root and escaped realpath', () => withArchiveLocationFixture(f => {
  const linked = resolve(f.outside, 'linked-root')
  f.fs.symlinkSync(f.root, linked, process.platform === 'win32' ? 'junction' : 'dir')
  expect(f.fs.lstatSync(linked).isSymbolicLink()).toBe(true)
  expect(() => readArchiveFixture(f.logical, linked)).toThrow('FUI_LOCATION_UNSAFE')
}))
`;
const old=fs.readFileSync(m.originalSource,'utf8'),eol=old.includes('\r\n')?'\r\n':'\n',tail=appendix.replace(/\r?\n/g,eol);fs.writeFileSync(dir+'/appended-tests.txt',tail,{flag:'wx'});fs.writeFileSync(m.originalSource,old+tail);assert.equal(sha(Buffer.from(fs.readFileSync(m.originalSource,'utf8').slice(0,-tail.length))),m.sourceBeforeSha256);fs.copyFileSync(process.argv[1],dir+'/append-red.mjs',fs.constants.COPYFILE_EXCL);m.implDir=dir;m.preReceived=pre.dir;fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');const c=JSON.parse(fs.readFileSync(m.context));c.phase='P01_ARCHIVE_PRE_PASS_FILESYSTEM_RED_REQUIRED';c.archiveReadiness.pre={status:'PASS',path:pre.dir,reportSha256:pre.reportSha256};c.archiveReadiness.implementation='REGRESSION_TESTS_APPENDED_BEFORE_HELPER_FIX';c.archiveReadiness.implementationEvidence=dir;fs.writeFileSync(m.context,JSON.stringify(c,null,2)+'\n');let s=fs.readFileSync(m.status,'utf8').replace('# P01:9/10; archive PRE_RUNNING; candidate frozen','# P01:9/10; archive PRE_PASS; filesystem RED_REQUIRED').replace('PRE_RUNNING; candidate frozen','PRE_PASS; filesystem RED_REQUIRED').replace('PRE_RUNNING; READY_FOR_ARCHIVE','PRE_PASS; READY_FOR_ARCHIVE');fs.writeFileSync(m.status,s);console.log(JSON.stringify({status:'MEANINGFUL_FS_TESTS_APPENDED_HELPER_UNCHANGED',dir,sourceBeforeSha256:m.sourceBeforeSha256,pins:pins.length,pre:'PASS'}));
