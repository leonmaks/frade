import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p01-archive-current.json')),dir=m.implDir,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(dir+'/fs-red.stdout.txt','utf8'),report=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));assert.equal(report.numFailedTests,21);assert.equal(report.numPassedTests,0);assert.equal(JSON.parse(fs.readFileSync(dir+'/fs-red-execution.json')).exitCode,1);fs.writeFileSync(dir+'/red-summary.json',JSON.stringify({atUtc:new Date().toISOString(),classification:'INTEGRATION_EVIDENCE_PATH',failed:21,passed:0,originalCasesExcludedByTargetedSelector:22,fixtureRootIgnoredByOldOneArgumentReader:true,oldExternalArchiveProof:'Existing exact original read expression already produced ENOENT after isolated fixture archive; preserved separately.',meaningfulDiscrimination:'Fixture uses original command bytes plus distinct valid JSON whitespace; must not read actual worktree instead.',cases:report.testResults.flatMap(t=>t.assertionResults).filter(t=>t.fullName.includes('P01-ARCHIVE-FS')).map(t=>({name:t.fullName,status:t.status})),helperChangedBeforeRed:false},null,2)+'\n',{flag:'wx'});
const source=fs.readFileSync(m.originalSource,'utf8'),eol=source.includes('\r\n')?'\r\n':'\n',oldImport="import { readFileSync } from 'node:fs'",newImport="import { lstatSync, readFileSync, realpathSync } from 'node:fs'",oldHelper='const fuiRead = (file: string) => readFileSync(resolve(root, file))';assert.equal(source.split(oldImport).length,2);assert.equal(source.split(oldHelper).length,2);fs.writeFileSync(dir+'/bdd-red.tsx',source,{flag:'wx'});
const helper=`const fuiRead = (file: string, evidenceRoot = root) => {
  if (!file.startsWith('openspec/changes/')) return readFileSync(resolve(root, file))
  const match = /^openspec\\/changes\\/frade-p01-theme-core\\/evidence\\/(p01-fui-runtime-[0-9TZ]+\\/(?:command\\.json|runtime\\.stdout\\.json|control-valid-bindings\\.json))$/.exec(file)
  if (!match) throw new Error('FUI_LOCATION_PATH')
  const anchor = resolve(evidenceRoot)
  const samePath = (left: string, right: string) => process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
  const inspect = (physical: string) => {
    const anchorStat = lstatSync(anchor, { throwIfNoEntry: false })
    if (!anchorStat || anchorStat.isSymbolicLink() || !anchorStat.isDirectory() || !samePath(realpathSync(anchor), anchor)) throw new Error('FUI_LOCATION_UNSAFE')
    let current = anchor
    const parts = physical.split('/')
    for (const [index, part] of parts.entries()) {
      current = resolve(current, part)
      const stat = lstatSync(current, { throwIfNoEntry: false })
      if (!stat) return undefined
      const validType = index === parts.length - 1 ? stat.isFile() : stat.isDirectory()
      if (stat.isSymbolicLink() || !validType || !samePath(realpathSync(current), current)) throw new Error('FUI_LOCATION_UNSAFE')
    }
    return current
  }
  const physical = [
    'openspec/changes/frade-p01-theme-core/evidence/' + match[1],
    'openspec/changes/archive/2026-10-10-frade-p01-theme-core/evidence/' + match[1],
  ]
  const locations = physical.map(inspect).filter((value): value is string => value !== undefined)
  if (!locations.length) throw new Error('FUI_LOCATION_MISSING')
  if (locations.length !== 1) throw new Error('FUI_LOCATION_DUPLICATE')
  const bytes = readFileSync(locations[0])
  const after = physical.map(inspect).filter((value): value is string => value !== undefined)
  if (JSON.stringify(after) !== JSON.stringify(locations)) throw new Error('FUI_LOCATION_UNSAFE')
  return bytes
}`.replace(/\r?\n/g,eol);
const after=source.replace(oldImport,newImport).replace(oldHelper,helper);fs.writeFileSync(m.originalSource,after);const tail=fs.readFileSync(dir+'/appended-tests.txt','utf8'),reverse=after.slice(0,-tail.length).replace(newImport,oldImport).replace(helper,oldHelper);assert.equal(sha(Buffer.from(reverse)),m.sourceBeforeSha256);fs.writeFileSync(dir+'/helper-delta.json',JSON.stringify({atUtc:new Date().toISOString(),source:m.originalSource,sourceBeforeSha256:m.sourceBeforeSha256,sourceRedSha256:sha(Buffer.from(source)),sourceAfterSha256:sha(Buffer.from(after)),oldImport,newImport,oldHelper,newHelper:helper,appendixSha256:sha(Buffer.from(tail)),reverseSha256:sha(Buffer.from(reverse)),reverseEntireOldSourceExact:true,originalCallbacksAssertionsFuiLiteralCheckBindingsExact:true,onlyReadOnlyImportsAndHelperAndAppendedTests:true,registryNotYetRenewed:true},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],dir+'/repair-helper.mjs',fs.constants.COPYFILE_EXCL);console.log(JSON.stringify({status:'TEST_ONLY_HELPER_IMPLEMENTED_AFTER_21_RED',sourceAfterSha256:sha(Buffer.from(after)),reverseEntireOldSourceExact:true}));
