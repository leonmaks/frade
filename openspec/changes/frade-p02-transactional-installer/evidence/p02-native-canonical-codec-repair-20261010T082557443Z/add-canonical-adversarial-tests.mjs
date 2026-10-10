import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),original=fs.readFileSync(m.nativeExtendedGuardProtocolRedDir+'/original-native9.test.txt');assert(before.subarray(0,original.length).equals(original));const added=String.raw`

async function rawNativeRefusal(f: Fixture, frame: string) {
  const child = spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  let text = ''
  const closed = new Promise<number | null>(resolve => child.once('close', code => resolve(code)))
  try {
    const reply = new Promise<Record<string, any>>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(Error('RAW_FIXTURE_TIMEOUT')) }, 5000)
      child.once('error', error => { clearTimeout(timer); reject(error) })
      child.stdout.on('data', (bytes: Buffer) => {
        text += bytes.toString('utf8')
        if (text.length > 131072) { clearTimeout(timer); child.kill(); reject(Error('RAW_REPLY_LIMIT')); return }
        const end = text.indexOf('\n')
        if (end >= 0) { clearTimeout(timer); try { resolve(JSON.parse(text.slice(0, end))) } catch (error) { reject(Error(String(error))) } }
      })
    })
    child.stdin.end(frame + '\n')
    expect((await reply).status).toBe('REFUSED')
    expect(await closed).toBe(2)
    expect(await fs.readdir(f.root)).toEqual([])
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed }
  }
}

describe('P02FS004: canonical encoding keeps valid data and exact lexical rejection', () => {
  for (const code of [0x2028, 0x2029]) it('accepts normalized line-separator data U+' + code.toString(16), () => fixture(async f => {
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const name = 'atelier-' + String.fromCharCode(code)
    expect((await f.send('mkdir', { path: [name] })).status).toBe('ACK')
    const listed = await f.send('list', { path: [], limit: 128, cursor: null })
    expect(listed.status).toBe('ACK')
    expect(listed.entries.map((entry: { name: string }) => entry.name)).toContain(name)
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
  it('preserves an escaped root backslash followed by literal u0027', () => fixture(async f => {
    const parent = path.join(f.root, 'u0027')
    await fs.mkdir(parent)
    const root = path.join(parent, 'installed')
    expect((await f.send('bind', { root })).status).toBe('ACK')
    expect((await f.send('dispose')).status).toBe('ACK')
    expect(await fs.readdir(parent)).toEqual(['installed'])
  }))
  it('still rejects duplicate native envelope keys before binding effects', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: f.root })
    await rawNativeRefusal(f, frame.replace('"version":1', '"version":1,"version":1'))
  }))
  it('still rejects alternate escaped apostrophe encoding before bootstrap', () => fixture(async f => {
    const frame = JSON.stringify({ version: 1, session: randomUUID(), generation: 1, requestId: 1, deadlineMs: 10000, operation: 'bind', root: path.join(f.root, "O'Brien") })
    await rawNativeRefusal(f, frame.replace("'", String.fromCharCode(92) + 'u0027'))
  }))
})
`;
fs.writeFileSync(file,Buffer.concat([before,Buffer.from(added)]));assert(fs.readFileSync(file).subarray(0,original.length).equals(original));fs.copyFileSync(process.argv[1],m.nativeCanonicalCodecRepairDir+'/add-canonical-adversarial-tests.mjs',fs.constants.COPYFILE_EXCL);console.log('Five meaningful actual canonical native tests added; original9 prefix unchanged');
