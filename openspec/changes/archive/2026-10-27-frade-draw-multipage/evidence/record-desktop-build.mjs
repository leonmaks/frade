import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256, desktopOutputs, evidenceOwner } from '../../../../tests/ui-contract/drawing-pages-current.mjs'
const root = process.cwd(), run = evidenceOwner + 'current-execution/desktop-build-' + new Date().toISOString().replaceAll(/[:.]/g, '-')
if (existsSync(run)) throw Error('IMMUTABLE_RUN_EXISTS')
mkdirSync(run, { recursive: true })
const before = currentInputs(root), startedAt = new Date().toISOString()
writeFileSync(run + '/before.json', JSON.stringify(before, null, 2)+'\n')
const args = ['-NoProfile','-NonInteractive','-Command','pnpm --filter @frade/desktop build']
const child = spawn('powershell.exe',args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']})
const out=[],err=[]
child.stdout.on('data',chunk=>out.push(chunk));child.stderr.on('data',chunk=>err.push(chunk))
const exitCode=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
writeFileSync(run+'/stdout.txt',Buffer.concat(out));writeFileSync(run+'/stderr.txt',Buffer.concat(err))
const after=currentInputs(root)
writeFileSync(run+'/after.json',JSON.stringify(after,null,2)+'\n')
const artifact=file=>({file,sha256:sha256(readFileSync(file))})
const record={role:'desktop-build',args,startedAt,finishedAt:new Date().toISOString(),exitCode,sourceSetBefore:sourceSetSha256(before),sourceSetAfter:sourceSetSha256(after),before:artifact(run+'/before.json'),after:artifact(run+'/after.json'),outputs:exitCode===0?desktopOutputs(root):[]}
writeFileSync(run+'/record.json',JSON.stringify(record,null,2)+'\n')
if(exitCode!==0||record.sourceSetBefore!==record.sourceSetAfter)throw Error('BUILD_FAILED_OR_SOURCE_CHANGED:'+run)
writeFileSync(evidenceOwner+'build-selection.json',JSON.stringify({record:artifact(run+'/record.json'),stdout:artifact(run+'/stdout.txt'),stderr:artifact(run+'/stderr.txt')},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',run,sourceFiles:before.length,outputs:record.outputs.length,durationMs:Date.parse(record.finishedAt)-Date.parse(startedAt)}))
