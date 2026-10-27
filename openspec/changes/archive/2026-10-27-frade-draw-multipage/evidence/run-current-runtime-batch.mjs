import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256, evidenceOwner, reportCases } from '../../../../tests/ui-contract/drawing-pages-current.mjs'
const root=process.cwd(), sourceSet=sourceSetSha256(currentInputs(root))
const selection=[
 evidenceOwner+'current-execution/draw-unit-2026-10-27T03-59-42-261Z',
 evidenceOwner+'current-execution/runtime-unit-2026-10-27T04-00-05-735Z',
 evidenceOwner+'current-execution/workspace-direct-2026-10-27T03-59-48-556Z',
]
function check(run){
 if(!run.startsWith(evidenceOwner+'current-execution/'))throw Error('FOREIGN_RUN')
 const execution=JSON.parse(readFileSync(run+'/execution.json')),record=JSON.parse(readFileSync(execution.record.file))
 if(record.exitCode!==0||record.sourceSetBefore!==sourceSet||record.sourceSetAfter!==sourceSet)throw Error('STALE_OR_FAILED_RUN:'+run)
 reportCases(record.runner,JSON.parse(readFileSync(execution.report.file)))
 return execution.role
}
for(const run of selection)check(run)
const startedAt=new Date().toISOString(), completed=selection.map(check)
const progress=(status,extra={})=>writeFileSync(evidenceOwner+'runtime-batch-progress.json',JSON.stringify({status,startedAt,updatedAt:new Date().toISOString(),sourceSet,completed,selection,...extra},null,2)+'\n')
progress('RUNNING')
for(const role of ['draw-visual','desktop-diagrams','desktop-presentation','desktop-performance']){
 console.log(JSON.stringify({stage:'START',role,at:new Date().toISOString()}))
 const child=spawn(process.execPath,[evidenceOwner+'record-current-execution.mjs',role],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']})
 let stdout=''
 child.stdout.on('data',chunk=>{stdout+=chunk;process.stdout.write(chunk)})
 child.stderr.on('data',chunk=>process.stderr.write(chunk))
 const code=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
 if(code!==0){progress('FAIL',{failedRole:role,exitCode:code});process.exit(1)}
 const records=stdout.trim().split(/\r?\n/).flatMap(line=>{try{return[JSON.parse(line)]}catch{return[]}})
 const pass=records.filter(row=>row.status==='PASS'&&row.role===role).at(-1)
 if(!pass||check(pass.run)!==role)throw Error('MISSING_EXACT_PASS:'+role)
 selection.push(pass.run);completed.push(role);progress('RUNNING')
}
if(sourceSetSha256(currentInputs(root))!==sourceSet)throw Error('SOURCE_CHANGED_DURING_BATCH')
if(completed.length!==7||new Set(completed).size!==7)throw Error('INCOMPLETE_EXECUTIONS')
writeFileSync(evidenceOwner+'execution-selection.json',JSON.stringify(selection,null,2)+'\n')
progress('PASS')
console.log(JSON.stringify({status:'PASS',roles:completed.length,sourceSet,selection}))
