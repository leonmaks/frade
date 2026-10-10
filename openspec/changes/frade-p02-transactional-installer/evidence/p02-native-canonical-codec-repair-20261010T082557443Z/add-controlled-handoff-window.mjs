import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(before.subarray(0,original.length).equals(original));const added=String.raw`

it('retains the complete original guard set through missing-root and overlapping handoff windows', () => fixture(async f => {
  const base = await fs.realpath(path.dirname(f.root)), temp = await fs.realpath(os.tmpdir())
  if (path.dirname(base).toLowerCase() !== temp.toLowerCase() || !path.basename(base).startsWith('frade-p02-native-')) throw Error('UNSAFE_WINDOW_OWNER')
  const rename = await actualMutationActor(f, 'nt-rename'), reparse = await actualMutationActor(f, 'reparse')
  expect((await rename(f.root)).success).toBe(true)
  expect((await reparse(f.root)).success).toBe(true)
  const production = await fs.readFile(new URL('../native/windows-filesystem.cs', import.meta.url), 'utf8')
  const phases = ['before-root-create', 'full-bound', 'replacement-set-overlap', 'settled'] as const
  const prefix = path.join(base, 'window-marker-')
  const helperSource = path.join(base, 'window-helper.cs'), helperExe = path.join(base, 'window-helper.exe')
  const barrier = '  static void FixtureBarrier(string phase) {Console.Error.WriteLine("FR_FIXTURE:"+phase);while(!File.Exists(@"' + prefix.replaceAll('"', '""') + '"+phase)){if(Clock.ElapsedMilliseconds>8000)Refuse("FIXTURE_WINDOW_TIMEOUT");System.Threading.Thread.Sleep(1);}}\n'
  let instrumented = production
  const change = (anchor: string, replacement: string) => {
    expect(instrumented.split(anchor)).toHaveLength(2)
    instrumented = instrumented.replace(anchor, replacement)
  }
  change('  static void HandoffOuter(string[] parts) {', barrier + '  static void HandoffOuter(string[] parts) {')
  change('VerifyBinding();int count=Chain.Count-1;', 'VerifyBinding();int count=Chain.Count-1;FixtureBarrier("full-bound");')
  change('Same(Chain[i].Original,Identity(PendingOuter[i],true,Chain[i].Final));VerifyBinding();', 'Same(Chain[i].Original,Identity(PendingOuter[i],true,Chain[i].Final));VerifyBinding();FixtureBarrier("replacement-set-overlap");')
  change('RedundantOuter.RemoveAt(i);}VerifyBinding();', 'RedundantOuter.RemoveAt(i);}VerifyBinding();FixtureBarrier("settled");')
  change('next=Relative(h,parts[i],true,2,false,false);', 'FixtureBarrier("before-root-create");next=Relative(h,parts[i],true,2,false,false);')
  await fs.writeFile(helperSource, instrumented, { flag: 'wx' })
  const compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
  const buildArgs = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + helperExe, helperSource]
  const built = spawnSync(compiler, buildArgs, { encoding: 'utf8', windowsHide: true, timeout: 10000 })
  expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
  const child = spawn(helperExe, [], { windowsHide: true, stdio: 'pipe' })
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  const waiting = new Map<string, () => void>(), ready = new Map(phases.map(phase => [phase, new Promise<void>(resolve => waiting.set(phase, resolve))]))
  let errors = '', output = '', pending: ((reply: Record<string, any>) => void) | null = null, requestId = 0
  const session = randomUUID()
  child.stderr.on('data', (bytes: Buffer) => {
    errors += bytes.toString('utf8')
    if (errors.length > 4096) { child.kill(); return }
    for (const phase of phases) if (errors.includes('FR_FIXTURE:' + phase + '\n') || errors.includes('FR_FIXTURE:' + phase + '\r\n')) waiting.get(phase)?.()
  })
  child.stdout.on('data', (bytes: Buffer) => {
    output += bytes.toString('utf8')
    if (output.length > 131072) { child.kill(); return }
    const end = output.indexOf('\n')
    if (end >= 0 && pending) { const callback = pending; pending = null; callback(JSON.parse(output.slice(0, end))); output = output.slice(end + 1) }
  })
  const send = (operation: string, fields: object = {}) => new Promise<Record<string, any>>(resolve => {
    if (pending) throw Error('WINDOW_PENDING_REQUEST')
    pending = resolve
    child.stdin.write(JSON.stringify({ version: 1, session, generation: 1, requestId: ++requestId, deadlineMs: 10000, operation, ...fields }) + '\n')
  })
  const observations: object[] = []
  try {
    const root = path.join(f.root, 'window-installed'), bind = send('bind', { root })
    for (const phase of phases) {
      await Promise.race([ready.get(phase), closed.then(() => { throw Error('WINDOW_HELPER_EARLY_CLOSE ' + errors) })])
      const nt = await rename(f.root), fsctl = await reparse(f.root)
      expect(nt.success).toBe(false); expect(fsctl.success).toBe(false)
      if (phase !== 'settled') {
        expect(nt.stage).toBe('open-delete'); expect(nt.error).toBe(32)
        expect(fsctl.stage).toBe('open'); expect(fsctl.error).toBe(32)
      } else {
        expect(nt.stage).toBe('nt-same-parent-ancestor-rename'); expect(nt.error).toBe(5)
        expect(fsctl.stage).toBe('set-reparse'); expect(fsctl.error).toBe(145)
      }
      observations.push({ phase, nt, fsctl })
      await fs.writeFile(prefix + phase, 'continue', { flag: 'wx' })
    }
    expect((await bind).status).toBe('ACK')
    expect((await send('dispose')).status).toBe('ACK')
    expect(await closed).toBe(0)
    expect(await fs.readdir(root)).toEqual(['.coordinator.lock'])
    expect(await fs.readFile(path.join(f.outside, 'sentinel'), 'utf8')).toBe('outside-original')
    console.log(JSON.stringify({ proof: 'INSTRUMENTED_FIXTURE_ONLY_NOT_RUNTIME_CAPABILITY', productionSourceSha256: sha(Buffer.from(production)), fixtureSourceSha256: sha(Buffer.from(instrumented)), compiler, buildArgs, phaseObservations: observations, originalNativeProductionUnchanged: true }))
  } finally {
    for (const phase of phases) {
      try { await fs.writeFile(prefix + phase, 'close', { flag: 'wx' }) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
    }
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
  }
}))
`;
fs.writeFileSync(file,Buffer.concat([before,Buffer.from(added)]));assert(fs.readFileSync(file).subarray(0,original.length).equals(original));fs.copyFileSync(process.argv[1],m.nativeCanonicalCodecRepairDir+'/add-controlled-handoff-window.mjs',fs.constants.COPYFILE_EXCL);console.log('Controlled window fixture added: original production unchanged; no public hook/new root/API');
