import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const p='packages/extension-service/tests/fixtures/windows-malformed-reply-helper.cs';let s=fs.readFileSync(p,'utf8');assert(s.includes('case "wrong-version":'));s=s.replace('case "wrong-version":','case "deadline-clock":reply["clockMs"]=request["deadlineMs"];break;case "wrong-version":');s=s.replace('if(mode=="noncanonical-body")body+=" ";','if(mode=="noncanonical-body")body+=" ";if(mode=="oversized-frame")body=new string((char)32,131073);if(mode=="double-cr")body+="\\r\\r";');fs.writeFileSync(p,s);const t='packages/extension-service/tests/filesystem.transport.test.ts';s=fs.readFileSync(t,'utf8');s+=String.raw`

for (const mode of ['deadline-clock', 'oversized-frame', 'double-cr']) it('refuses ' + mode + ' as a reply outside the admitted operation contract', () => malformedReplyFixture(mode, async options => {
  let accepted: WindowsFilesystemTransport | null = null
  try {
    const attempt = WindowsFilesystemTransport.connect(options).then(port => { accepted = port; return port })
    await expect(attempt).rejects.toThrow('INVALID_FILESYSTEM_REPLY')
  } finally {
    // If an invalid bind was accepted, the fixture's one-reply helper exits on the dispose request.
    // Assert that release outcome rather than suppressing the error or leaking the process on RED.
    if (accepted) await expect((accepted as WindowsFilesystemTransport).dispose()).rejects.toThrow('FILESYSTEM_HELPER_CLOSED')
  }
}))
`;fs.writeFileSync(t,s);const d=m.base+'/evidence/p02-host-reply-deadline-red-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
