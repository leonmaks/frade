import fs from 'node:fs';import assert from 'node:assert/strict';assert.equal(process.cwd().replaceAll('\\','/'),'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade');const m=JSON.parse(fs.readFileSync('C:/Users/NVISEN/AppData/Local/Temp/frade-ui-p02-current.json'));const cs=String.raw`using System;using System.IO;using System.Collections.Generic;using System.Web.Script.Serialization;using System.Diagnostics;
class MalformedReply {static int Main(){var json=new JavaScriptSerializer();var clock=Stopwatch.StartNew();string line=Console.ReadLine();if(line==null)return 2;var request=json.Deserialize<Dictionary<string,object>>(line);string mode=Path.GetFileName((string)request["root"]);if(mode=="helper-exit")return 2;var reply=new Dictionary<string,object>{{"version",1},{"requestId",request["requestId"]},{"session",request["session"]},{"generation",request["generation"]},{"clockMs",clock.ElapsedMilliseconds},{"status","ACK"}};switch(mode){case "wrong-version":reply["version"]=2;break;case "wrong-session":reply["session"]="00000000-0000-0000-0000-000000000000";break;case "wrong-generation":reply["generation"]=2;break;case "wrong-request":reply["requestId"]=2;break;case "negative-clock":reply["clockMs"]=-1;break;case "fractional-clock":reply["clockMs"]=0.5;break;case "unknown-field":reply["extra"]=true;break;case "invalid-utf8":using(var output=Console.OpenStandardOutput()){output.WriteByte(255);output.WriteByte(10);output.Flush();}Console.ReadLine();return 0;}string body=json.Serialize(reply);if(mode=="noncanonical-body")body+=" ";Console.Write(body+"\n");Console.ReadLine();return 0;}}
`;fs.writeFileSync('packages/extension-service/tests/fixtures/windows-malformed-reply-helper.cs',cs,{flag:'wx'});const test='packages/extension-service/tests/filesystem.transport.test.ts';let s=fs.readFileSync(test,'utf8');s=s.replace("import { createHash } from 'node:crypto'","import { createHash } from 'node:crypto'\nimport { spawnSync } from 'node:child_process'\nimport { fileURLToPath } from 'node:url'");s+=String.raw`

async function malformedReplyFixture(mode: string, run: (options: Parameters<typeof WindowsFilesystemTransport.connect>[0]) => Promise<void>) {
  const parent = await fs.realpath(os.tmpdir()), base = await fs.mkdtemp(path.join(parent, 'frade-p02-reply-fixture-'))
  const root = path.join(base, mode), distribution = path.join(base, 'distribution'), source = fileURLToPath(new URL('./fixtures/windows-malformed-reply-helper.cs', import.meta.url))
  const cleanup = async () => {
    if (path.dirname(base).toLowerCase() !== parent.toLowerCase() || !path.basename(base).startsWith('frade-p02-reply-fixture-')) throw Error('UNSAFE_REPLY_FIXTURE_CLEANUP')
    await fs.rm(base, { recursive: true })
  }
  try {
    await fs.mkdir(root); await fs.mkdir(distribution)
    const executable = path.join(distribution, 'frade-filesystem.exe'), compiler = path.join(process.env.WINDIR ?? '', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')
    const built = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/warnaserror+', '/reference:System.Web.Extensions.dll', '/out:' + executable, source], { encoding: 'utf8', windowsHide: true, timeout: 10000 })
    expect(built.error).toBeUndefined(); expect(built.status, built.stdout + built.stderr).toBe(0)
    const sourceSha256 = sha(await fs.readFile(source)), bytes = await fs.readFile(executable)
    await fs.writeFile(path.join(distribution, 'integrity.json'), JSON.stringify({ schemaVersion: 1, protocol: 1, platform: 'windows-x64', source: 'native/windows-filesystem.cs', executable: 'frade-filesystem.exe', sourceSha256, executableSha256: sha(bytes), executableBytes: bytes.length, runtimeCapabilities: 'NOT_VERIFIED', publisherTrust: 'NOT_ASSERTED' }))
    await run({ installationRoot: root, distributionDirectory: distribution, sourceSha256, generation: 1 })
    expect(await fs.readdir(root)).toEqual([])
  } finally { await cleanup() }
}
describe('P02FS004: actual first-party malformed-reply child fixtures, not native security capability', () => {
  for (const mode of ['wrong-version', 'wrong-session', 'wrong-generation', 'wrong-request', 'negative-clock', 'fractional-clock', 'unknown-field', 'noncanonical-body', 'invalid-utf8', 'helper-exit']) it('invalidates malformed ' + mode + ' instead of accepting a bind', () => malformedReplyFixture(mode, async options => {
    await expect(WindowsFilesystemTransport.connect(options)).rejects.toThrow(mode === 'helper-exit' ? 'FILESYSTEM_HELPER_CLOSED' : 'INVALID_FILESYSTEM_REPLY')
  }))
})
`;fs.writeFileSync(test,s);const d=m.base+'/evidence/p02-host-malformed-reply-fixtures-'+new Date().toISOString().replace(/[-:.]/g,'');fs.mkdirSync(d);fs.writeFileSync(d+'/proof-boundary.json',JSON.stringify({atUtc:new Date().toISOString(),scope:'P02 host closed reply matching actual isolated first-party compiled child processes; malformed data/early death before accepted bind',distinction:'Fake response helpers are transport error fixtures, NOT native filesystem security/backend/capability verification. Genuine real native transport tests stay separately.',productionChanged:false,capabilities:'NOT_VERIFIED'},null,2)+'\n',{flag:'wx'});fs.copyFileSync(process.argv[1],d+'/add-fixtures.mjs',fs.constants.COPYFILE_EXCL);console.log(d);
