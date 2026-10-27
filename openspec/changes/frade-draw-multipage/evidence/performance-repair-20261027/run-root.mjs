import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, sha256, verifyDrawingPagesCurrent, desktopOutputs } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
import { audit, own } from './audit.mjs'
const e='openspec/changes/frade-draw-multipage/evidence/',root=process.cwd(),beforeAudit=audit(),manifestFile=e+'source-adoption-manifest.json',raw=fs.readFileSync(manifestFile),manifest=JSON.parse(raw)
verifyDrawingPagesCurrent(root,manifest)
const dir=own+'root-'+new Date().toISOString().replaceAll(/[:.]/g,'-');fs.mkdirSync(dir)
const before=currentInputs(root),outputsBefore=desktopOutputs(root),startedAt=new Date().toISOString()
fs.writeFileSync(dir+'/before.json',JSON.stringify(before,null,2)+'\n')
const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command','pnpm check'],{cwd:root,env:{...process.env,ELECTRON_OVERRIDE_DIST_PATH:path.resolve('apps/desktop/node_modules/electron/dist')},windowsHide:true,stdio:['ignore','pipe','pipe']}),out=[],err=[]
child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));console.log(JSON.stringify({status:'RUNNING',dir,command:'pnpm check',sourceSet:manifest.sourceSetSha256}))
const actualExit=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
fs.writeFileSync(dir+'/stdout.txt',Buffer.concat(out));fs.writeFileSync(dir+'/stderr.txt',Buffer.concat(err))
const after=currentInputs(root),outputsAfter=desktopOutputs(root)
fs.writeFileSync(dir+'/after.json',JSON.stringify(after,null,2)+'\n')
const artifact=file=>({file,sha256:sha256(fs.readFileSync(file))})
const record={command:'pnpm check',cwd:root,startedAt,finishedAt:new Date().toISOString(),actualExit,sourceSetBefore:sourceSetSha256(before),sourceSetAfter:sourceSetSha256(after),manifest:{file:manifestFile,sha256:sha256(raw)},before:artifact(dir+'/before.json'),after:artifact(dir+'/after.json'),stdout:artifact(dir+'/stdout.txt'),stderr:artifact(dir+'/stderr.txt'),outputsBefore,outputsAfter,buildOutputsUnchanged:JSON.stringify(outputsBefore)===JSON.stringify(outputsAfter),status:actualExit===0&&sourceSetSha256(before)===sourceSetSha256(after)?'PASS':'FAIL',preservationBefore:beforeAudit,preservationAfter:audit()}
fs.writeFileSync(dir+'/record.json',JSON.stringify(record,null,2)+'\n');fs.writeFileSync(own+'root-selection.json',JSON.stringify(artifact(dir+'/record.json'),null,2)+'\n');console.log(JSON.stringify({...record,preservationBefore:undefined,preservationAfter:undefined,outputsBefore:undefined,outputsAfter:undefined}));if(record.status!=='PASS')process.exit(1)
