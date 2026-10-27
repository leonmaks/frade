import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, desktopOutputs } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
const root=process.cwd(), role=process.argv[2]
const commands={build:{cwd:root,cmd:'pnpm --filter @frade/desktop build'},diagrams:{cwd:resolve(root,'apps/desktop'),cmd:'pnpm exec playwright test tests/e2e/diagrams.spec.ts tests/e2e/drawing-pages-parking.spec.ts --workers=1 --reporter=json'},general:{cwd:root,cmd:'pnpm check'}}
const command=commands[role];if(!command)throw Error('UNKNOWN_ROLE')
const dir=resolve(import.meta.dirname,role+'-'+new Date().toISOString().replaceAll(/[:.]/g,'-'));mkdirSync(dir)
const before=currentInputs(root), startedAt=new Date().toISOString()
writeFileSync(dir+'/before.json',JSON.stringify(before,null,2)+'\n')
const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',command.cmd],{cwd:command.cwd,env:{...process.env,ELECTRON_OVERRIDE_DIST_PATH:resolve(root,'apps/desktop/node_modules/electron/dist')},windowsHide:true,stdio:['ignore','pipe','pipe']})
const out=[],err=[];child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x))
console.log(JSON.stringify({role,dir,startedAt,command}))
const exitCode=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
writeFileSync(dir+'/stdout.txt',Buffer.concat(out));writeFileSync(dir+'/stderr.txt',Buffer.concat(err))
const after=currentInputs(root);writeFileSync(dir+'/after.json',JSON.stringify(after,null,2)+'\n')
const record={role,command,startedAt,finishedAt:new Date().toISOString(),exitCode,sourceBefore:sourceSetSha256(before),sourceAfter:sourceSetSha256(after),sourceFileCount:before.length,...(role==='build'&&exitCode===0?{outputs:desktopOutputs(root)}:{})}
writeFileSync(dir+'/record.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));if(exitCode||record.sourceBefore!==record.sourceAfter)process.exit(1)
