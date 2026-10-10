import fs from 'node:fs';import assert from 'node:assert/strict';const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json')),p='packages/extension-service/tests/filesystem.windows.test.ts',dir=m.nativeSourceParentPlanningDir;let s=fs.readFileSync(p,'utf8');fs.writeFileSync(dir+'/before-cleanup-lint-test.ts',s,{flag:'wx'});
const old=String.raw`    const resolved = await fs.realpath(temp)
    if (path.dirname(resolved).toLowerCase() !== tempParent.toLowerCase() || !path.basename(resolved).startsWith('frade-p02-native-')) throw new Error('UNSAFE_FIXTURE_CLEANUP')
    await fs.rm(resolved, { recursive: true })`;
assert(s.includes(old));s=s.replace(old,'    await removeOwnedFixture(temp, tempParent)');const marker='async function fixture(run: (f: Fixture) => Promise<void>) {';assert(s.includes(marker));s=s.replace(marker,String.raw`async function removeOwnedFixture(temp: string, tempParent: string) {
  const resolved = await fs.realpath(temp)
  if (path.dirname(resolved).toLowerCase() !== tempParent.toLowerCase() ||
    !path.basename(resolved).startsWith('frade-p02-native-')) throw new Error('UNSAFE_FIXTURE_CLEANUP')
  await fs.rm(resolved, { recursive: true })
}
`+marker);fs.writeFileSync(p,s);fs.writeFileSync(dir+'/cleanup-lint-rca.json',JSON.stringify({atUtc:new Date().toISOString(),classification:'INTEGRATION',cause:'Existing no-unsafe-finally forbids direct ThrowStatement in native fixture finally block.',repair:'Extract same checked absolute own-Temp cleanup into a named function; all containment conditions and behavior assertions remain exact.',productionChanged:false},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/repair-cleanup-lint.mjs',fs.constants.COPYFILE_EXCL);
