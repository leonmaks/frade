import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { sha256, sourceSetSha256, currentInputs, executionRoles } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
import { audit, own } from './audit.mjs'
const e='openspec/changes/frade-draw-multipage/evidence/',root=process.cwd(),sourceSet=audit().sourceSet,completed=[],selection=[],startedAt=new Date().toISOString(),progressFile=own+'runtime-progress-eol.json'
const resume=['resume-isolated','resume-performance-after-rca'].includes(process.argv[2])
if(fs.existsSync(progressFile)){
 if(!resume)throw Error('EXPLICIT_RESUME_REQUIRED')
 const previous=JSON.parse(fs.readFileSync(progressFile))
 const performance=process.argv[2]==='resume-performance-after-rca'
 if(previous.status!=='FAIL'||previous.sourceSet!==sourceSet||previous.completed.length!==(performance?7:6)||previous.error!==(performance?'Error: ROLE_FAILED:desktop-performance:1':'Error: ROLE_FAILED:desktop-presentation:1'))throw Error('UNAPPROVED_RESUME')
 if(performance){const marker=own+'performance-rca-confirmation-authorisation.json';if(fs.existsSync(marker))throw Error('BOUNDED_PERFORMANCE_RETRY_ALREADY_USED');fs.writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),sourceSet,attempt:1,meaning:'One unchanged full3-case confirmation after preserved two failures, eight-request CPU/IPC profiling, and observed external load change44.78/37.49 to29.73%; no threshold/workload/test/settings changes'},null,2)+'\n')}
 for(const run of previous.selection){const r=JSON.parse(fs.readFileSync(run+'/record.json'));if(r.exitCode!==0||r.sourceSetBefore!==sourceSet||r.sourceSetAfter!==sourceSet)throw Error('RESUME_SOURCE_DRIFT')}
 const buildRef=JSON.parse(fs.readFileSync(e+'build-selection.json')).record,raw=fs.readFileSync(buildRef.file),build=JSON.parse(raw)
 if(sha256(raw)!==buildRef.sha256||build.exitCode!==0||build.sourceSetBefore!==sourceSet||build.sourceSetAfter!==sourceSet)throw Error('RESUME_BUILD_DRIFT')
 completed.push(...previous.completed);selection.push(...previous.selection)
}
const progress=(status,extra={})=>fs.writeFileSync(progressFile,JSON.stringify({status,startedAt,updatedAt:new Date().toISOString(),sourceSet,completed,selection,...extra},null,2)+'\n')
async function command(role){
 console.log(JSON.stringify({stage:'START',role,at:new Date().toISOString()}))
 const script=e+(role==='desktop-build'?'record-desktop-build.mjs':'record-current-execution.mjs'),child=spawn(process.execPath,[script,...(role==='desktop-build'?[]:[role])],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']}),out=[],err=[]
 child.stdout.on('data',x=>{out.push(x);process.stdout.write(x)});child.stderr.on('data',x=>{err.push(x);process.stderr.write(x)})
 const exit=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
 const stdout=Buffer.concat(out).toString();fs.writeFileSync(own+'eol-launch-'+role+'-stdout.txt',stdout);fs.writeFileSync(own+'eol-launch-'+role+'-stderr.txt',Buffer.concat(err))
 if(exit!==0)throw Error('ROLE_FAILED:'+role+':'+exit)
 const passes=stdout.trim().split(/\r?\n/).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}}).filter(x=>x.status==='PASS')
 if(passes.length!==1||!passes[0].run.startsWith(e+'current-execution/'+role+'-'))throw Error('AMBIGUOUS_OR_FOREIGN_ROLE')
 const run=passes[0].run,record=JSON.parse(fs.readFileSync(run+'/record.json'))
 if(record.exitCode!==0||record.sourceSetBefore!==sourceSet||record.sourceSetAfter!==sourceSet)throw Error('STALE_RUNTIME')
 completed.push(role);if(role!=='desktop-build')selection.push(run);progress('RUNNING');return run
}
function artifacts(source,destination,include,execution){
 if(fs.existsSync(destination))throw Error('IMMUTABLE_ARTIFACTS_EXIST');const files=[]
 function walk(folder){for(const d of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,d.name);if(d.isDirectory())walk(f);else if(!d.name.startsWith('.')&&include(f)){const raw=fs.readFileSync(f),to=destination+'/'+path.relative(source,f).replaceAll('\\','/');fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,raw);files.push({file:to,sha256:sha256(raw),bytes:raw.length})}}}
 walk(source);fs.writeFileSync(destination+'/index.json',JSON.stringify({execution,files},null,2)+'\n')
}
progress('RUNNING')
try{
 for(const role of ['desktop-build','draw-unit','runtime-unit','workspace-direct','draw-visual','desktop-diagrams','desktop-presentation','desktop-performance']){
  if(completed.includes(role))continue
  const run=await command(role)
  if(role==='draw-visual')artifacts('packages/draw/test-results',own+'rendered-eol',f=>f.includes('drawing-pages-parity'),run)
  if(role==='desktop-diagrams')artifacts('apps/desktop/test-results',own+'desktop-native-eol',f=>f.endsWith('.png')&&f.includes('native-multipage'),run)
  if(role==='desktop-performance')artifacts('apps/desktop/test-results',own+'performance-eol',()=>true,run)
 }
 if(completed.length!==8||selection.length!==7||sourceSetSha256(currentInputs(root))!==sourceSet)throw Error('INCOMPLETE_BATCH')
 selection.sort((a,b)=>executionRoles.indexOf(JSON.parse(fs.readFileSync(a+'/record.json')).role)-executionRoles.indexOf(JSON.parse(fs.readFileSync(b+'/record.json')).role))
 fs.writeFileSync(e+'execution-selection.json',JSON.stringify(selection,null,2)+'\n');progress('PASS',{preservation:audit()});console.log(JSON.stringify({status:'PASS',sourceSet,roles:completed.length,selection}))
}catch(error){progress('FAIL',{error:String(error)});throw error}
