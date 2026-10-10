import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const p='packages/extension-service/tests/filesystem.windows.test.ts';const original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const tail=String.raw`

async function instrumentedNative(f: Fixture, label: string, transform: (source: string) => string, run: (shadow: {
  child: ChildProcessWithoutNullStreams
  send: (operation: string, fields?: object) => Promise<Record<string, any>>
  observed: Promise<void>
  kill: () => Promise<void>
  stderr: () => string
}) => Promise<void>) {
  const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_INSTRUMENTED_OWNER')
  const production = await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url), 'utf8')
  const source = transform(production), sourceFile = path.join(base, 'fault-helper.cs'), exe = path.join(base, 'fault-helper.exe')
  await fs.writeFile(sourceFile, source, { flag: 'wx' })
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const args = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + exe, sourceFile]
  const build = spawnSync(compiler, args, { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(build.error).toBeUndefined(); expect(build.status, build.stdout + build.stderr).toBe(0)
  const child = spawn(exe, [], { windowsHide: true, stdio: 'pipe' })
  const closed = new Promise<number | null>(resolve => child.once('close', result => resolve(result)))
  let errors = '', output = '', requestId = 0, resolveObserved: () => void = () => {}, pending: { resolve: (reply: Record<string, any>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null
  const session = randomUUID(), marker = new Promise<void>(resolve => { resolveObserved = resolve })
  const observed = Promise.race([marker, closed.then(() => { throw Error('FAULT_HELPER_EARLY_CLOSE ' + errors) })])
  // A close is expected in refusal fixtures; consume only this unused observation rejection.
  void observed.catch(() => {})
  child.stderr.on('data', (bytes: Buffer) => {
    errors += bytes.toString('utf8')
    if (errors.length > 4096) { child.kill(); return }
    if (errors.includes('FR_FIXTURE:effect-window')) resolveObserved()
  })
  const rejectPending = (error: Error) => {
    if (pending) { clearTimeout(pending.timer); const current = pending; pending = null; current.reject(error) }
  }
  child.once('error', error => rejectPending(error))
  child.once('close', () => rejectPending(Error('FAULT_HELPER_CLOSED')))
  child.stdout.on('data', (bytes: Buffer) => {
    output += bytes.toString('utf8')
    if (output.length > 131072) { rejectPending(Error('FAULT_REPLY_LIMIT')); child.kill(); return }
    const end = output.indexOf('\n')
    if (end >= 0 && pending) {
      const current = pending; pending = null; clearTimeout(current.timer)
      try { current.resolve(JSON.parse(output.slice(0, end))) } catch (error) { current.reject(Error(String(error))) }
      output = output.slice(end + 1)
    }
  })
  const send = (operation: string, fields: object = {}) => new Promise<Record<string, any>>((resolve, reject) => {
    if (pending || child.exitCode !== null || child.signalCode !== null) { reject(Error('FAULT_HELPER_UNUSABLE')); return }
    pending = { resolve, reject, timer: setTimeout(() => { rejectPending(Error('FAULT_REPLY_TIMEOUT')); child.kill() }, 5000) }
    child.stdin.write(JSON.stringify({ version: 1, session, generation: 1, requestId: ++requestId, deadlineMs: 10000, operation, ...fields }) + '\n')
  })
  const kill = async () => { if (child.exitCode === null && child.signalCode === null) expect(child.kill()).toBe(true); await closed }
  try {
    await run({ child, send, observed, kill, stderr: () => errors })
    expect(await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url), 'utf8')).toBe(production)
    console.log(JSON.stringify({ proof: 'INSTRUMENTED_FIXTURE_ONLY_NOT_RUNTIME_CAPABILITY', label, productionSourceSha256: sha(Buffer.from(production)), fixtureSourceSha256: sha(Buffer.from(source)), compiler, compilerArgs: args, productionUnchanged: true }))
  } finally {
    await kill()
  }
}
function exactNativeTransform(source: string, anchor: string, replacement: string) {
  expect(source.split(anchor)).toHaveLength(2)
  return source.replace(anchor, replacement)
}
const effectBarrier = 'Console.Error.WriteLine("FR_FIXTURE:effect-window");while(true){System.Threading.Thread.Sleep(1);}'

describe('P02FS003/004: controlled actual kill windows and injected failure disposition', () => {
  for (const point of ['before-rename', 'after-rename', 'after-flush', 'before-ack'] as const) it('reconciles bytes after real process kill at ' + point + ' without treating a lost reply as ACK', () => fixture(async f => {
    const transform = (source: string) => {
      if (point === 'before-rename') return exactNativeTransform(source, 'Effect=true;IoStatus ios;int status=NtSetInformationFile', effectBarrier + 'Effect=true;IoStatus ios;int status=NtSetInformationFile')
      if (point === 'after-rename') return exactNativeTransform(source, 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);', effectBarrier + 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);')
      if (point === 'after-flush') return exactNativeTransform(source, 'OpenBudget-=w.Max;result.Add("sha256",w.Hash);break;', 'OpenBudget-=w.Max;' + effectBarrier + 'result.Add("sha256",w.Hash);break;')
      return exactNativeTransform(source, 'Console.WriteLine(reply);NextId++;', 'if(operation=="replace"){' + effectBarrier + '}Console.WriteLine(reply);NextId++;')
    }
    const bytes = Buffer.from('retained-process-window')
    await instrumentedNative(f, point, transform, async shadow => {
      expect((await shadow.send('bind', { root: f.root })).status).toBe('ACK')
      const opened = await shadow.send('write-open', { path: ['pending'], maxBytes: bytes.length })
      expect(opened.status).toBe('ACK')
      expect((await shadow.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
      expect((await shadow.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
      // Attach rejection assertion before deliberately killing a pending reply.
      const reply = shadow.send('replace', { handle: opened.handle, parent: [], name: 'final', sha256: sha(bytes) })
      const rejected = expect(reply).rejects.toThrow('FAULT_HELPER_CLOSED')
      await shadow.observed
      await shadow.kill(); await rejected
      const name = point === 'before-rename' ? 'pending' : 'final'
      expect((await fs.readdir(f.root)).sort()).toEqual(['.coordinator.lock', name])
      expect(await fs.readFile(path.join(f.root, name))).toEqual(bytes)
      await fixture(async reopened => {
        expect((await reopened.send('bind', { root: f.root })).status).toBe('ACK')
        const read = await reopened.send('read', { path: [name], offset: 0, length: 65536 })
        expect(read.status).toBe('ACK'); expect(Buffer.from(read.data, 'base64')).toEqual(bytes)
        expect((await reopened.send('dispose')).status).toBe('ACK')
      })
      await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    })
  }))
  it('reports UNKNOWN after an injected post-rename flush failure and preserves exact published bytes', () => fixture(async f => {
    const transform = (source: string) => exactNativeTransform(source, 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);Flush(w.Handle);', 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);throw new Win32Exception(995);Flush(w.Handle);')
    // The fixture substitutes the flush call with a throwing private helper to retain compiler flow analysis.
    const checkedTransform = (source: string) => exactNativeTransform(source, 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);Flush(w.Handle);', 'w.Name=name;Seek(w.Handle,0);Write(w.Handle,bytes);FixtureFlushFailure();Flush(w.Handle);').replace('  static void Flush(IntPtr h)', '  static void FixtureFlushFailure(){throw new Win32Exception(995);}\n  static void Flush(IntPtr h)')
    expect(typeof transform).toBe('function')
    const bytes = Buffer.from('published-not-acknowledged')
    await instrumentedNative(f, 'injected-flush-failure-not-OS-fault', checkedTransform, async shadow => {
      expect((await shadow.send('bind', { root: f.root })).status).toBe('ACK')
      const opened = await shadow.send('write-open', { path: ['pending'], maxBytes: bytes.length })
      expect(opened.status).toBe('ACK')
      expect((await shadow.send('write-chunk', { handle: opened.handle, offset: 0, data: bytes.toString('base64') })).status).toBe('ACK')
      expect((await shadow.send('write-close', { handle: opened.handle, sha256: sha(bytes) })).status).toBe('ACK')
      expect(await shadow.send('replace', { handle: opened.handle, parent: [], name: 'final', sha256: sha(bytes) })).toMatchObject({ status: 'UNKNOWN', code: 'WIN32_995' })
      await expectNativeExit(shadow.child, 2)
      expect((await fs.readdir(f.root)).sort()).toEqual(['.coordinator.lock', 'final'])
      expect(await fs.readFile(path.join(f.root, 'final'))).toEqual(bytes)
    })
  }))
  for (const [name, mutation, code] of [
    ['file ID', 'Chain[0].Original.IdLow^=1;', 'BOUND_IDENTITY_CHANGED'],
    ['final path', 'Chain[0].Final+="wrong";', 'UNSAFE_OBJECT_IDENTITY'],
    ['volume serial', 'Serial^=1;', 'BOUND_VOLUME_CHANGED'],
  ] as const) it('invalidates a session after controlled ' + name + ' evidence drift before effects', () => fixture(async f => {
    const transform = (source: string) => exactNativeTransform(source, 'if(!Bound)Refuse("ROOT_NOT_BOUND");if(operation!="dispose")VerifyBinding();', 'if(!Bound)Refuse("ROOT_NOT_BOUND");if(operation=="mkdir"){' + mutation + '}if(operation!="dispose")VerifyBinding();')
    await instrumentedNative(f, 'injected-' + name + '-not-OS-mutation', transform, async shadow => {
      expect((await shadow.send('bind', { root: f.root })).status).toBe('ACK')
      expect(await shadow.send('mkdir', { path: ['never-created'] })).toMatchObject({ status: 'REFUSED', code })
      await expectNativeExit(shadow.child, 2)
      expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
      await fs.rename(f.root, f.root + '-released'); await fs.rename(f.root + '-released', f.root)
    })
  }))
})
`;fs.appendFileSync(p,tail);assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const d=m.base+'/evidence/p02-native-fault-window-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
