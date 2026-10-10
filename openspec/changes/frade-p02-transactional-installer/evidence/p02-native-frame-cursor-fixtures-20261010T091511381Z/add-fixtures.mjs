import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const status='# P02 current batch — native61 GREEN\n\n'+new Date().toISOString()+': native61 PASS, typecheck/lint PASS; original9 prefix unchanged. New 19 tests prove actual chunk/offset/hash/reservation/exclusive-leaf/conflicting-target/different-parent boundaries and real helper kill/reopen at open/sealed/published. No journal recovery/power-loss/deployment capability claim; NOT_VERIFIED. Tasks3/9;2.2 IN_PROGRESS. Fresh PRE PASS remains approved plan, cumulativePOST NOT_RUN. Checkpoint42 f0cbd92d313e347fa4784a9c2841bd3570832283 and seal986492058741ce700df24dffb6c7cd71a4ebdfbc pushed/remoteSHAverified; current61 fixtures/evidence publicationPENDING. Next: raw malformed frames/cursor tests, native fault/identity/deploy proof, then staging/journal/IPC/UI/fullverification. No human action needed now. Rightpanel queued, visibility unconfirmed.\n\n## Previous projection\n\n';fs.writeFileSync(m.status,status+fs.readFileSync(m.status,'utf8'));const p='packages/extension-service/tests/filesystem.windows.test.ts';const original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const tail=String.raw`

async function actualMalformedFrame(f: Fixture, frame: Buffer, expected: { code?: string; errorType?: string }) {
  const child = spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  let output = ''
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  try {
    const reply = new Promise<Record<string, any>>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(Error('FRAME_FIXTURE_TIMEOUT')) }, 5000)
      child.once('error', error => { clearTimeout(timer); reject(error) })
      child.stdout.on('data', (bytes: Buffer) => {
        output += bytes.toString('utf8')
        if (output.length > 131072) { clearTimeout(timer); child.kill(); reject(Error('FRAME_REPLY_LIMIT')); return }
        const end = output.indexOf('\n')
        if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(output.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
      })
    })
    child.stdin.end(frame)
    expect(await reply).toMatchObject({ status: 'REFUSED', ...expected })
    expect(await closed).toBe(2)
    expect(await fs.readdir(f.root)).toEqual([])
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
  }
}

describe('P02FS004: actual native frame and cursor limits', () => {
  it('refuses a frame beyond the actual 128KiB byte limit before binding', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.concat([Buffer.alloc(131073, 32), Buffer.from('\n')]), { code: 'FRAME_LIMIT' })
  }))
  it('refuses a truncated frame at real stdin EOF without any root effect', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.from('{"version":1'), { code: 'TRUNCATED_FRAME' })
  }))
  it('refuses malformed UTF8 rather than replacing invalid bytes', () => fixture(async f => {
    await actualMalformedFrame(f, Buffer.from([0xc3, 0x28, 0x0a]), { errorType: 'DecoderFallbackException' })
  }))
  const envelopes = [
    ['string generation', { generation: '1' }],
    ['fractional generation', { generation: 1.5 }],
    ['unsafe request number', { requestId: 9007199254740992 }],
    ['future deadline', { deadlineMs: 60000 }],
    ['unbound operation', { operation: 'mkdir', path: ['wrong'] }],
  ] as const
  for (const [name, fields] of envelopes) it('refuses ' + name + ' before binding effects', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: f.root, ...fields }) + '\n'
    await actualMalformedFrame(f, Buffer.from(frame), {})
  }))
  it('paginates actual ordinary identities and invalidates the exhausted cursor', () => fixture(async f => {
    const names = Array.from({ length: 130 }, (_, i) => 'item-' + String(i).padStart(3, '0'))
    await Promise.all(names.map(name => fs.writeFile(path.join(f.root, name), name, { flag: 'wx' })))
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const first = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(first.status).toBe('ACK'); expect(first.entries).toHaveLength(128)
    expect(first.cursor).toMatch(/^[a-f0-9]{32}$/)
    const second = await f.send('list', { path: [], limit: 128, cursor: first.cursor })
    expect(second.status).toBe('ACK'); expect(second.entries).toHaveLength(3); expect(second.cursor).toBeNull()
    const rows = [...first.entries, ...second.entries]
    expect(rows.map((row: { name: string }) => row.name).sort()).toEqual(['.coordinator.lock', ...names])
    expect(new Set(rows.map((row: { identity: string }) => row.identity)).size).toBe(131)
    expect(await f.send('list', { path: [], limit: 128, cursor: first.cursor })).toMatchObject({ status: 'REFUSED', code: 'STALE_CURSOR' })
    await expectNativeExit(f.process, 2)
    for (const name of names) expect(await fs.readFile(path.join(f.root, name), 'utf8')).toBe(name)
  }))
  it('refuses a foreign cursor before returning directory contents', () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect(await f.send('list', { path: [], limit: 128, cursor: '0'.repeat(32) })).toMatchObject({ status: 'REFUSED', code: 'STALE_CURSOR' })
    await expectNativeExit(f.process, 2)
    expect(await fs.readdir(f.root)).toEqual(['.coordinator.lock'])
  }))
  it('refuses an excessive read before returning file bytes', () => fixture(async f => {
    await fs.writeFile(path.join(f.root, 'ordinary'), 'original')
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    expect((await f.send('read', { path: ['ordinary'], offset: 0, length: 65537 })).status).toBe('REFUSED')
    await expectNativeExit(f.process, 2)
    expect(await fs.readFile(path.join(f.root, 'ordinary'), 'utf8')).toBe('original')
  }))
})
`;fs.appendFileSync(p,tail);assert(fs.readFileSync(p).subarray(0,original.length).equals(original));const d=m.base+'/evidence/p02-native-frame-cursor-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
