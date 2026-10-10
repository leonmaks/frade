import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp));const actors=[['nt-rename','postbind-nt-ancestor.actor.cs'],['reparse','postbind-reparse.actor.cs']];fs.mkdirSync('packages/extension-service/tests/fixtures',{recursive:true});for(const [kind,name] of actors){let source=fs.readFileSync(m.afterFreezeNativeDiagnosticsDir+'/'+name,'utf8');assert(source.includes('[DllImport("kernel32.dll")] static extern bool CloseHandle'));source=source.replace('[DllImport("kernel32.dll")] static extern bool CloseHandle','[DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle').replace('finally{CloseHandle(h);}','finally{if(!CloseHandle(h))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}');fs.writeFileSync('packages/extension-service/tests/fixtures/windows-'+kind+'-actor.cs',source,{flag:'wx'});}
const file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(before.subarray(0,original.length).equals(original));const added=String.raw`

import { spawnSync } from 'node:child_process'

async function actualMutationActor(f: Fixture, kind: 'nt-rename' | 'reparse') {
  const base = await fs.realpath(path.dirname(f.root))
  const temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_ACTOR_OWNER')
  const source = fileURLToPath(new URL('./fixtures/windows-' + kind + '-actor.cs', import.meta.url))
  const output = path.join(base, kind + '-actor.exe')
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const args = ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + output, source]
  const built = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(built.error).toBeUndefined()
  expect(built.status, built.stdout + built.stderr).toBe(0)
  return async (target: string) => {
    const resolved = await fs.realpath(target)
    if (resolved.toLowerCase() !== base.toLowerCase() && !resolved.toLowerCase().startsWith(base.toLowerCase() + path.sep)) throw Error('UNSAFE_ACTOR_TARGET')
    const operated = spawnSync(output, kind === 'reparse' ? [resolved, f.outside] : [resolved], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(operated.error).toBeUndefined()
    expect(operated.status, operated.stdout + operated.stderr).toBe(0)
    const result = JSON.parse(operated.stdout) as { stage: string; success: boolean; error: number; restoreError?: number; deleteError?: number; reparseRemoved?: boolean }
    if (result.restoreError !== undefined) expect(result.restoreError).toBe(0)
    if (result.deleteError !== undefined) expect(result.deleteError).toBe(0)
    return result
  }
}

describe('P02FS001: actual direct NT/FSCTL attacks with genuine setup proof', () => {
  for (const kind of ['nt-rename', 'reparse'] as const) {
    for (const targetKind of ['outer', 'root', 'child'] as const) {
      it('confines effects after actual ' + kind + ' attempt on ' + targetKind, () => fixture(async f => {
        const attack = await actualMutationActor(f, kind)
        // Same actor succeeds on this ordinary unbound empty root and restores it.
        // An unavailable/broken actor setup cannot be counted as attack refusal PASS.
        const positive = await attack(f.root)
        expect(positive.success).toBe(true); expect(positive.error).toBe(0)
        expect(positive.reparseRemoved).toBe(true)
        expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
        expect((await f.send('mkdir', { path: ['checked'] })).status).toBe('ACK')
        const target = targetKind === 'outer' ? path.dirname(f.root) : targetKind === 'root' ? f.root : path.join(f.root, 'checked')
        const rejected = await attack(target)
        expect(rejected.success).toBe(false)
        if (targetKind === 'outer') {
          expect(rejected.stage).toBe(kind === 'nt-rename' ? 'nt-same-parent-ancestor-rename' : 'set-reparse')
          expect(rejected.error).toBe(kind === 'nt-rename' ? 5 : 145)
        } else {
          expect(rejected.stage).toBe(kind === 'nt-rename' ? 'open-delete' : 'open')
          expect(rejected.error).toBe(32)
        }
        const opened = await f.send('write-open', { path: ['checked', 'safe.bin'], maxBytes: 0 })
        expect(opened.status).toBe('ACK')
        expect((await f.send('write-close', { handle: opened.handle, sha256: sha(Buffer.alloc(0)), retainForPublication: false })).status).toBe('ACK')
        expect((await f.send('dispose')).status).toBe('ACK')
        expect(await fs.readFile(path.join(f.root, 'checked', 'safe.bin'))).toEqual(Buffer.alloc(0))
        expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
        expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
      }))
    }
  }
})
`;
fs.writeFileSync(file,Buffer.concat([before,Buffer.from(added)]));assert(fs.readFileSync(file).subarray(0,original.length).equals(original));fs.copyFileSync(process.argv[1],m.nativeCanonicalCodecRepairDir+'/add-actual-mutation-actors.mjs',fs.constants.COPYFILE_EXCL);console.log('Six actual native mutation tests added; each proves unbound actor success and bounded owned scope; no production changes');
