import fs from 'node:fs';import assert from 'node:assert/strict';const mp='C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json',m=JSON.parse(fs.readFileSync(mp)),file='packages/extension-service/tests/filesystem.windows.test.ts',before=fs.readFileSync(file),dir=m.base+'/evidence/p02-native-owned-handles-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(dir);fs.writeFileSync(dir+'/filesystem.windows.before.ts',before,{flag:'wx'});let s=before.toString();assert(s.endsWith('})\n'));const append=fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-native-list-cleanup-next-red-append.txt','utf8').replace(/^\uFEFF/,'');s=s.slice(0,-3)+append+String.raw`
  it('does not block owned sibling rename under an outer ancestor outside install/userData', () => fixture(async f => {
    const tempParent = await fs.realpath(os.tmpdir())
    const source = path.join(tempParent, 'frade-p02-owned-native-sibling-' + randomUUID() + '.tmp')
    const target = source + '.moved', bytes = Buffer.from('owned-sibling-original')
    await fs.writeFile(source, bytes, { flag: 'wx' })
    try {
      expect((await f.send('bind', { root: f.root })).status).toBe('ACK')
      let renameError: unknown
      try { await fs.rename(source, target) } catch (error) { renameError = error }
      if (renameError) expect(await fs.readFile(source)).toEqual(bytes)
      expect(renameError).toBeUndefined()
      expect(await fs.readFile(target)).toEqual(bytes)
      expect((await f.send('dispose')).status).toBe('ACK')
    } finally {
      if (f.process.exitCode === null && f.process.signalCode === null) {
        const closed = new Promise<void>(resolve => f.process.once('close', () => resolve()))
        f.process.kill(); await closed
      }
      for (const owned of [source, target]) {
        if (path.dirname(owned).toLowerCase() !== tempParent.toLowerCase() ||
          !path.basename(owned).startsWith('frade-p02-owned-native-sibling-')) throw Error('UNSAFE_SIBLING_CLEANUP')
        try { await fs.unlink(owned) } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
    }
  }))
})
`;fs.writeFileSync(file,s);fs.writeFileSync(dir+'/filesystem.windows.red.ts',s,{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/add-red.mjs',fs.constants.COPYFILE_EXCL);m.nativeOwnedHandlesRedDir=dir;fs.writeFileSync(mp,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({dir,original5:'UNCHANGED',new:'Three owned-list/cleanup tests plus actual outer sibling rename; no native production change'}));
