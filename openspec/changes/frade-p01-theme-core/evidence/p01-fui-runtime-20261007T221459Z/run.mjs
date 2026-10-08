
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),file='apps/desktop/tests/e2e/ui-contract-theme.spec.ts';
const sourceHash=sha(file),sourceFiles=[file,'apps/desktop/src/main/drawio-theme-bridge.ts','apps/desktop/out/main/index.cjs'],snapshot=()=>Object.fromEntries(sourceFiles.map(p=>[p,sha(p)]));
if(sourceHash!=='7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43')throw Error('Original E2E source must be restored before FUI');
const command=[process.execPath,'E:/Program Files/nodejs/node_modules/corepack/dist/pnpm.js','--filter','@frade/desktop','exec','playwright','test','tests/e2e/ui-contract-theme.spec.ts','--grep','P01-FUI|P01 real frame chord','--reporter=json','--output='+path.join(dir,'desktop-artifacts')];
const receipt={command,startedAtUtc:new Date().toISOString(),source:{file,sha256:sourceHash},sourceBefore:snapshot(),status:'RUNNING'};
fs.copyFileSync(file,path.join(dir,'source-before.ts'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(dir,'command.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const out=fs.openSync(path.join(dir,'runtime.stdout.json'),'wx'),err=fs.openSync(path.join(dir,'runtime.stderr.txt'),'wx');
console.log(JSON.stringify({status:'RUNNING',dir}));
const result=spawnSync(command[0],command.slice(1),{cwd:process.cwd(),env:process.env,windowsHide:true,stdio:['ignore',out,err]});fs.closeSync(out);fs.closeSync(err);
Object.assign(receipt,{finishedAtUtc:new Date().toISOString(),exitCode:result.status,signal:result.signal,error:result.error?.message,sourceAfterSha256:sha(file),sourceAfter:snapshot()});
receipt.sourceUnchanged=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);
receipt.status=result.status===0&&receipt.sourceUnchanged?'PASS':'FAIL';
fs.writeFileSync(path.join(dir,'command.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));process.exitCode=result.status??2;
