import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp));const actor=String.raw`using System;using System.Runtime.InteropServices;using System.Web.Script.Serialization;
[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
class Writer {
[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string p,uint a,uint s,IntPtr d,uint c,uint f,IntPtr t);
[DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr h);
static int Main(string[] args){if(args.Length!=1)return 3;IntPtr h=CreateFileW(args[0],0x40000000,7,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);var json=new JavaScriptSerializer();if(h==new IntPtr(-1)){Console.WriteLine(json.Serialize(new {stage="writer-open",success=false,error=Marshal.GetLastWin32Error()}));return 2;}try{Console.WriteLine(json.Serialize(new {stage="writer-held",success=true,error=0}));Console.ReadLine();}finally{if(!CloseHandle(h))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}return 0;}}
`;
fs.writeFileSync('packages/extension-service/tests/fixtures/windows-preexisting-writer-actor.cs',actor,{flag:'wx'});const file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(before.subarray(0,original.length).equals(original));const added=String.raw`

describe('P02FS001: preexisting writer refusal before guarded binding effects', () => {
  for (const targetKind of ['outer', 'root'] as const) it('refuses an incompatible writer on ' + targetKind + ' and releases a failed bind', () => fixture(async f => {
    const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
    if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_WRITER_OWNER')
    const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
    const source = fileURLToPath(new URL('./fixtures/windows-preexisting-writer-actor.cs', import.meta.url)), output = path.join(base, 'writer-actor.exe')
    const built = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + output, source], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
    const target = targetKind === 'outer' ? base : f.root
    const writer = spawn(output, [target], { windowsHide: true, stdio: 'pipe' })
    const writerClosed = new Promise<number | null>(resolve => writer.once('close', code => resolve(code)))
    const helperClosed = new Promise<number | null>(resolve => f.process.once('close', code => resolve(code)))
    try {
      const ready = await new Promise<{ stage: string; success: boolean; error: number }>((resolve, reject) => {
        let text = ''
        const timer = setTimeout(() => { writer.kill(); reject(Error('WRITER_SETUP_TIMEOUT')) }, 5000)
        writer.once('error', error => { clearTimeout(timer); reject(error) })
        writer.stdout.on('data', (bytes: Buffer) => {
          text += bytes.toString('utf8')
          if (text.length > 4096) { clearTimeout(timer); writer.kill(); reject(Error('WRITER_SETUP_LIMIT')); return }
          const end = text.indexOf('\n')
          if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(text.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
        })
      })
      expect(ready).toEqual({ stage: 'writer-held', success: true, error: 0 })
      const bound = await f.send('bind', { root: f.root })
      expect(bound.status).toBe('REFUSED'); expect(bound.code).toBe('WIN32_32')
      expect(await helperClosed).toBe(2)
      expect(await fs.readdir(f.root)).toEqual([])
      writer.stdin.end('\n')
      expect(await writerClosed).toBe(0)
      const moved = path.join(base, 'root-after-refusal')
      await fs.rename(f.root, moved); await fs.rename(moved, f.root)
      expect(await fs.readdir(f.outside)).toEqual(['sentinel'])
    } finally {
      if (writer.exitCode === null && writer.signalCode === null) { writer.kill(); await writerClosed }
    }
  }))
})
`;
fs.writeFileSync(file,Buffer.concat([before,Buffer.from(added)]));assert(fs.readFileSync(file).subarray(0,original.length).equals(original));fs.copyFileSync(process.argv[1],m.nativeCanonicalCodecRepairDir+'/add-preexisting-writer-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log('Two genuine preexisting writer and failed-bind-release fixtures added; original9 byte-identical');
