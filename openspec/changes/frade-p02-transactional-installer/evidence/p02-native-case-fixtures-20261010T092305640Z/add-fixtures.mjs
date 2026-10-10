import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),r=m.base+'/evidence',n=fs.readdirSync(r).filter(n=>n.startsWith('p02-case-mode-owned-probe-'));assert.equal(n.length,1);const probe=JSON.parse(fs.readFileSync(r+'/'+n[0]+'/probe.json'));assert.equal(probe.enable.exit,0);assert.equal(probe.disable.exit,0);fs.copyFileSync(r+'/'+n[0]+'/case-actor.cs','packages/extension-service/tests/fixtures/windows-case-mode-actor.cs',fs.constants.COPYFILE_EXCL);const p='packages/extension-service/tests/filesystem.windows.test.ts',original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const tail=String.raw`

async function actualCaseModeActor(f: Fixture) {
  const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_CASE_OWNER')
  const source = new URL('./fixtures/windows-case-mode-actor.cs', import.meta.url), exe = path.join(base, 'case-actor.exe')
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const compiled = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + exe, fileURLToPath(source)], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(compiled.error).toBeUndefined(); expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0)
  return async (target: string, enabled: boolean) => {
    const actual = await fs.realpath(target), relative = path.relative(base, actual)
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('UNSAFE_CASE_TARGET')
    const result = spawnSync(exe, [actual, enabled ? '1' : '0'], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
    expect(result.error).toBeUndefined(); expect(result.stderr).toBe(''); expect([0, 2]).toContain(result.status)
    const reply = JSON.parse(result.stdout.trim()) as { success: boolean; error: number; before?: number; after?: number; stage: string }
    expect(result.status).toBe(reply.success ? 0 : 2)
    return reply
  }
}

describe('P02FS001: genuine NTFS per-directory case mode, no global setting changes', () => {
  for (const location of ['outer', 'root', 'child'] as const) it('refuses an actual preexisting case-sensitive ' + location, () => fixture(async f => {
    const child = path.join(f.root, 'checked')
    if (location === 'child') await fs.mkdir(child)
    const target = location === 'outer' ? path.dirname(f.root) : location === 'root' ? f.root : child
    const actor = await actualCaseModeActor(f)
    expect(await actor(target, true)).toMatchObject({ success: true, before: 0, after: 1 })
    try {
      if (location === 'child') {
        expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
        expect(await f.send('list', { path: ['checked'], limit: 128, cursor: null })).toMatchObject({ status: 'REFUSED', code: 'CASE_SENSITIVE_DIRECTORY' })
      } else expect(await f.send('bind', { root: f.root })).toMatchObject({ status: 'REFUSED', code: 'CASE_SENSITIVE_DIRECTORY' })
      await expectNativeExit(f.process, 2)
      expect((await fs.readdir(f.root)).filter(name => name !== '.coordinator.lock')).toEqual(location === 'child' ? ['checked'] : [])
    } finally {
      expect(await actor(target, false)).toMatchObject({ success: true, before: 1, after: 0 })
    }
  }))
  for (const location of ['outer', 'root', 'child'] as const) it('refuses or confines a genuine post-bind case-mode mutation on ' + location, () => fixture(async f => {
    const child = path.join(f.root, 'checked'); await fs.mkdir(child)
    const target = location === 'outer' ? path.dirname(f.root) : location === 'root' ? f.root : child
    const actor = await actualCaseModeActor(f)
    expect(await actor(target, true)).toMatchObject({ success: true, before: 0, after: 1 })
    expect(await actor(target, false)).toMatchObject({ success: true, before: 1, after: 0 })
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('list', { path: ['checked'], limit: 128, cursor: null })).status).toBe('ACK')
    const attack = await actor(target, true)
    try {
      const result = await f.send('mkdir', { path: ['checked', 'after-attack'] })
      if (attack.success) {
        expect(attack).toMatchObject({ before: 0, after: 1 })
        expect(result).toMatchObject({ status: 'REFUSED', code: 'CASE_SENSITIVE_DIRECTORY' })
        await expectNativeExit(f.process, 2)
        expect(await fs.readdir(child)).toEqual([])
      } else {
        expect(attack.error).not.toBe(0)
        expect(result.status).toBe('ACK')
        expect((await f.send('dispose')).status).toBe('ACK')
        await expectNativeExit(f.process, 0)
        expect(await fs.readdir(child)).toEqual(['after-attack'])
      }
      expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
      expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
      console.log(JSON.stringify({ proof: 'ACTUAL_NTFS_CASE_MODE_ATTACK_WITH_GENUINE_UNBOUND_SETUP', location, attack, nativeDisposition: result.status }))
    } finally {
      expect((await actor(target, false)).success).toBe(true)
    }
  }))
})
`;fs.appendFileSync(p,tail);assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const d=r+'/p02-native-case-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.writeFileSync(d+'/authority.json',JSON.stringify({atUtc:new Date().toISOString(),genuineSetupProbe:r+'/'+n[0]+'/probe.json',primarySources:probe.primarySources,scope:'P02FS001 exact owned Temp per-directory NTFS case flags; no global settings/elevation/drive mapping',productionChanged:false,capabilities:'NOT_VERIFIED'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
