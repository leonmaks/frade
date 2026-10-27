import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import { currentInputFiles, sha256, verifyDrawingPagesCurrent } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
const e='openspec/changes/frade-draw-multipage/evidence/',own=e+'main-gate-repair-20261027/',phase=process.argv[2],attempt=process.argv[3]??'01',eol=process.argv[4]==='eol'
if(!['PRE','POST'].includes(phase))throw Error('PHASE')
const original=JSON.parse(fs.readFileSync('.worktrees/requests/draw-pages-POST-08.json'))
const paths=new Set(original.paths)
const walk=folder=>{for(const d of fs.readdirSync(folder,{withFileTypes:true})){const f=folder+'/'+d.name;if(d.isDirectory()&&/^(pre|post)-\d/.test(d.name)){for(const suffix of ['receipt.json','output/result.md','output/record.json','instance-provenance.json'])if(fs.existsSync(f+'/'+suffix))paths.add(f+'/'+suffix)}else if(d.isDirectory())walk(f);else paths.add(f)}}
walk(own.replace(/\/$/,''))
for(const f of currentInputFiles(process.cwd()))paths.add(f)
for(const f of ['packages/draw/src/routing/AGENTS.md',e+'post-08-20261027T070744Z/receipt.json',e+'post-08-20261027T070744Z/result.md',e+'main-integration-20261027/report.md',e+'main-integration-20261027/lde-input-diagnostic.json',e+'main-integration-20261027/ellipse-checkout-diagnostic.json'])paths.add(f)
walk(e+'main-integration-20261027/general-2026-10-27T08-00-32-601Z')
const required=new Map()
function requireFile(file,category,expected){
 const raw=fs.readFileSync(file),hash=sha256(raw)
 if(expected&&hash!==expected)throw Error('REQUIRED_HASH:'+file)
 paths.add(file);required.set(file,{file,category,sha256:hash})
}
if(phase==='POST'||eol){
 const manifest=JSON.parse(fs.readFileSync(e+'source-adoption-manifest.json'));verifyDrawingPagesCurrent(process.cwd(),manifest)
 for(const input of manifest.currentInputs)requireFile(input.file,'current-source',input.sha256)
 for(const entry of manifest.entries)requireFile(entry.originalFile,'historical-origin',entry.originalSha256)
 for(const ref of Object.values(manifest.desktopBuild))requireFile(ref.file,'current-build',ref.sha256)
 const build=JSON.parse(fs.readFileSync(manifest.desktopBuild.record.file))
 for(const ref of [build.before,build.after])requireFile(ref.file,'current-build-inputs',ref.sha256)
 for(const execution of manifest.executions){
  for(const key of ['record','report','stdout','stderr'])requireFile(execution[key].file,'current-execution',execution[key].sha256)
  const record=JSON.parse(fs.readFileSync(execution.record.file))
  for(const ref of [record.before,record.after])requireFile(ref.file,'current-execution-inputs',ref.sha256)
  requireFile(execution.record.file.replace(/record\.json$/,'execution.json'),'current-named-cases')
 }
 for(const file of fs.readdirSync(e+'current-execution').filter(x=>['workspace-direct-2026-10-27T09-06-47-588Z','desktop-presentation-2026-10-27T09-51-25-638Z','desktop-performance-2026-10-27T10-10-23-169Z'].includes(x))){
  for(const name of ['record.json','report.json','before.json','after.json','stdout.txt','stderr.txt'])requireFile(e+'current-execution/'+file+'/'+name,'preserved-failed-run')
 }
}
const eligible=new Set(cp.execFileSync('git',['--no-optional-locks','-c','core.longpaths=true','-c','core.fsmonitor=false','ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32e6}).split('\0').filter(Boolean))
function validate(selected){for(const ref of required.values())if(!selected.has(ref.file))throw Error('MISSING_REQUIRED:'+ref.file);for(const file of selected)if(!eligible.has(file))throw Error('IGNORED_OR_FOREIGN:'+file)}
validate(paths)
const negativeDependencies=[]
for(const file of required.keys()){const omitted=new Set(paths);omitted.delete(file);try{validate(omitted);throw Error('ACCEPTED_REQUIRED_DELETION:'+file)}catch(error){if(!String(error).includes('MISSING_REQUIRED:'))throw error;negativeDependencies.push(file)}}
const plan=own+(eol?'eol-plan.md':'plan.md'),source=fs.readFileSync(plan),scope=eol?'Permanent exact generated-inventory LF checkout rule, real-Git true/false regression, explicit control input binding and fresh current revalidation; preserve all17 origins and user bytes, unchanged generator comparison/root attributes. Cumulative original main repair remains in scope.':'Main consumer exact3-origin/11-assertion repair, preservation of current dirty/untracked bytes, fresh complete current-source/runtime bindings, native footer branding removal as explicitly requested. No routing/vendor/archived-proof edits or weaker assertions.'
const refs=[...paths].sort().map(file=>{if(file.includes('\\')||path.isAbsolute(file)||file.split('/').includes('..')||!fs.statSync(file).isFile())throw Error('UNSAFE_FILE:'+file);return {file,sha256:sha256(fs.readFileSync(file))}})
const proof=own+'review-'+phase.toLowerCase()+'-'+attempt+'-packet.json';if(fs.existsSync(proof))throw Error('IMMUTABLE_PACKET_EXISTS');fs.writeFileSync(proof,JSON.stringify({phase,scope,selected:refs,required:[...required.values()],negativeDependenciesRejected:negativeDependencies},null,2)+'\n');paths.add(proof)
const prompt=phase==='PRE'&&eol?`Review the focused permanent checkout repair PLAN in ${plan} before its control edits. The initial repair already has independent PRE02 PASS and current886 runtime cases PASS; actual root now shows all11 unchanged LDE tests PASS but fails the unchanged exact generator on one derived inventory's CRLF checkout. Inspect read-only generator-eol-diagnostic.json and current generator to verify data/all other outputs identical. Review exactly one nested LF attribute, added explicit source input and real-Git autocrlf=true/false RED/GREEN; no root8 attributes or generator/pin/assertion weakening. All17 origins and user bytes must stay unchanged, parent4a... preserved, full actual source set/build/roles rerun because the control input changes. Human authorization is quoted exactly in plan. Existing main source, complete current runtime records, first root FAIL and earlier approvals are supplied; new EOL controls are not implemented yet. Return exactly one standalone GATE_STATUS: PASS or GATE_STATUS: FAIL.`:phase==='PRE'?`Review the validated main repair PLAN before production/control edits. Authority is the explicit human request quoted in ${plan}; earlier supplier checkpoints are preserved, not current main PASS. Examine exact three-origin reconstruction, unchanged11 LDE assertions, bounded root lockfile admission, individual mixed-EOL pin, original14 origin preservation, fresh main closure, bootstrap, user preservation and branding exception. Current failures are intentionally unrepaired. User57 untracked routing files remain untouched. Return exactly one standalone GATE_STATUS: PASS or GATE_STATUS: FAIL.`:`Review final main repair cumulatively against both plan.md and eol-plan.md, PRE02/PRE03, unchanged11 LDE assertions and prior contracts. Inspect exact current source,17 original/adopted entries, preserved parents, all7 actual current execution records/build, real-Git checkout regressions, actual root PASS, strict/implementation verification, all user-byte stability, rendered absence of branding, mutation/deletion negatives and independently trusted bootstrap. Historical runtime PASS is not current proof. Main user inputs remain deliberately unstaged/untracked, exactly preserved. Require exactly one standalone GATE_STATUS: PASS or GATE_STATUS: FAIL with actionable blockers; requested sol/high, actual backend not attested.`
const request={phase,change:'frade-draw-multipage',scope,reviewPolicy:{stage:'frade-draw-multipage/'+(eol?'main-generated-inventory-checkout':'main-gate-repair'),phase,model:'gpt-6-sol',reasoningEffort:'high',source:{path:plan,sha256:sha256(source),excerpt:'PRE: gpt-6-sol / high; POST: gpt-6-sol / high'}},policyArtifact:original.policyArtifact,paths:[...paths].sort(),prompt}
const target=path.resolve('.worktrees/requests/main-gate-repair-'+phase+'.json');fs.writeFileSync(target,JSON.stringify(request,null,2)+'\n');console.log(JSON.stringify({phase,request:target,selected:request.paths.length,planSha256:request.reviewPolicy.source.sha256}))
