import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),dir=m.base+'/evidence/p02-main-persistence-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(dir);fs.writeFileSync(dir+'/filesystem.windows.before.ts',before,{flag:'wx'});let s=before.toString();assert(s.endsWith('})\n'));s=s.replace("const executable =", "import { createPresentationSettings } from '../../../apps/desktop/src/main/presentation-settings'\nconst executable =");s=s.slice(0,-3)+String.raw`  it('keeps actual Main persistence, readback, restart and compensation working while native root is bound', () => fixture(async f => {
    const userData = path.dirname(f.root), sessionId = 'window-1'
    const store = createPresentationSettings({ userData, sessionId, windowId: 5 })
    const initial = await store.initialize()
    const choice = (mode: 'light' | 'dark', density: 'compact' | 'comfortable') => ({
      mode, density, preferred: { light: 'frade.builtin/light', dark: 'frade.builtin/dark', 'high-contrast': 'frade.builtin/high-contrast' },
    })
    const context = (index: number, generation: number) => ({
      version: 1 as const, sessionId, requestId: 'window-1/intent-' + index,
      generation, transactionId: 'window-1/intent-' + index, revision: index,
      membership: 1, phase: 'apply' as const,
    })
    const firstIntent = await store.announceIntent('window-1/intent-1')
    const previous = await store.persist(context(1, firstIntent.generation), choice('dark', 'compact'), initial.durable.revision)
    expect(previous.status).toBe('ACK')
    if (previous.status !== 'ACK') throw Error(previous.message)
    const target = path.join(userData, 'presentation-settings.json')
    const previousBytes = await fs.readFile(target)
    expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
    const nextIntent = await store.announceIntent('window-1/intent-2')
    const phase = context(2, nextIntent.generation)
    const committed = await store.persist(phase, choice('light', 'comfortable'), previous.durable.revision)
    if (committed.status !== 'ACK') expect(await fs.readFile(target)).toEqual(previousBytes)
    expect(committed.status).toBe('ACK')
    if (committed.status !== 'ACK') throw Error(committed.message)
    expect(JSON.parse(await fs.readFile(target, 'utf8'))).toEqual(committed.durable)
    const restart = createPresentationSettings({ userData, sessionId: 'window-2', windowId: 5 })
    expect((await restart.initialize()).durable).toEqual(committed.durable)
    const restored = await store.reconcile({ ...phase, phase: 'rollback' }, previous.durable)
    expect(restored.selection).toEqual(previous.durable.selection)
    expect(restored.revision).toBeGreaterThan(committed.durable.revision)
    expect(JSON.parse(await fs.readFile(target, 'utf8'))).toEqual(restored)
    expect((await f.send('dispose')).status).toBe('ACK')
  }))
})
`;
fs.writeFileSync(file,s);fs.writeFileSync(dir+'/filesystem.windows.red.ts',s,{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/add-red.mjs',fs.constants.COPYFILE_EXCL);m.mainPersistenceRedDir=dir;fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir,existingAssertions:'UNCHANGED',newRegression:'Actual Main facade using its defaultFiles, not an injected mock'}));
