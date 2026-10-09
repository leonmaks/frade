
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),file='apps/desktop/tests/e2e/ui-contract-theme.spec.ts';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),sourceFiles=[file,'apps/desktop/src/main/drawio-theme-bridge.ts','apps/desktop/out/main/index.cjs'],snapshot=()=>Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(p))]));
const original=fs.readFileSync(path.join(dir,'original-test-source.bin')),tail=fs.readFileSync(path.join(dir,'diagnostic-tail.txt')),candidate=Buffer.concat([original,tail]);
assert(fs.readFileSync(file).equals(original),'Unexpected E2E source drift before diagnostic');
const sourceBefore=snapshot(),command=[process.execPath,'E:/Program Files/nodejs/node_modules/corepack/dist/pnpm.js','--filter','@frade/desktop','exec','playwright','test','tests/e2e/ui-contract-theme.spec.ts','--grep','P01-HOVER-DIAGNOSTIC expanded real viewport text and media raster light comfortable$','--reporter=json','--output='+path.join(dir,'artifacts')];
const receipt={startedAtUtc:new Date().toISOString(),scope:'TEMPORARY_PASSIVE_DIAGNOSTIC_NOT_GATE',command,sourceBefore,diagnosticCandidateSha256:hash(candidate),originalPrefixExact:true,status:'RUNNING'};
fs.writeFileSync(path.join(dir,'runtime-command.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
let result;
try{
  fs.writeFileSync(file,candidate);
  const out=fs.openSync(path.join(dir,'runtime.stdout.json'),'wx'),err=fs.openSync(path.join(dir,'runtime.stderr.txt'),'wx');
  console.log(JSON.stringify({status:'RUNNING_PASSIVE_DIAGNOSTIC',dir}));
  try{result=spawnSync(command[0],command.slice(1),{cwd:root,env:process.env,stdio:['ignore',out,err],windowsHide:true})}finally{fs.closeSync(out);fs.closeSync(err)}
}finally{
  const beforeRestore=fs.readFileSync(file);assert(beforeRestore.equals(candidate),'Unexpected concurrent E2E write; refuse destructive restoration');
  fs.writeFileSync(file,original);
  Object.assign(receipt,{finishedAtUtc:new Date().toISOString(),exitCode:result?.status,signal:result?.signal,error:result?.error?.message,sourceAfter:snapshot(),tailRemoved:true});
  receipt.sourceRestoredExactly=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);
  receipt.status=result?.status===0&&receipt.sourceRestoredExactly?'DIAGNOSTIC_PASS':'DIAGNOSTIC_FAIL';
  fs.writeFileSync(path.join(dir,'runtime-command.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}
process.exitCode=result?.status??2;
