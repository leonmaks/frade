import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
const root=process.cwd()
const base='98f387f96b51b0ad139e3507c376ff1c3e8dec09'
const rel='openspec/changes/frade-standard-workflow'
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const read=p=>fs.readFileSync(path.join(root,p))
const git=args=>execFileSync('git',['-c','core.longpaths=true',...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trim()
const assert=(ok,message)=>{if(!ok)throw Error(message)}
const audit=JSON.parse(read(rel+'/evidence/repository-audit.json'))
assert(audit.packageCount===20&&new Set(audit.packages.map(p=>p.name)).size===20,'PACKAGE_INVENTORY')
for(const p of audit.packages)assert(sha(read(p.path))===p.sha256,'PACKAGE_DRIFT:'+p.path)
for(const p of audit.transfer)assert(sha(read(p.destination))===p.sha256,'POLICY_DRIFT:'+p.destination)
assert(git(['branch','--show-current'])==='codex/frade-standard-workflow','OWNER_BRANCH')
const specs=['engineering-direction-lifecycle','engineering-role-dispatch','engineering-progress-publication']
const requirements=[],scenarios=[]
for(const cap of specs){
 const text=read(rel+'/specs/'+cap+'/spec.md').toString('utf8')
 for(const m of text.matchAll(/^### Requirement: (.+)$/gm))requirements.push(m[1])
 for(const m of text.matchAll(/^#### Scenario: (.+)$/gm))scenarios.push(m[1])
}
assert(requirements.length===18&&new Set(requirements).size===18,'REQUIREMENT_ACCOUNTING')
assert(scenarios.length===46&&new Set(scenarios).size===scenarios.length,'SCENARIO_ACCOUNTING')
const trace=JSON.parse(read(rel+'/traceability.json'))
assert(trace.requirements.length===requirements.length,'TRACE_REQUIREMENTS')
assert(trace.requirements.every(r=>requirements.includes(r.title)&&r.taskIds.length>0&&r.testStatus==='NOT_IMPLEMENTED'),'TRACE_ACCOUNTING')
assert(trace.scenarios.length===scenarios.length&&trace.scenarios.every(s=>scenarios.includes(s.title)&&s.taskIds.length>0&&s.actualEvidence==='NOT_RUN'),'TRACE_SCENARIOS')
const taskText=read(rel+'/tasks.md').toString('utf8')
const tasks=[...taskText.matchAll(/^- \[([ x])\] (\d+\.\d+) /gm)]
assert(tasks.length===18&&new Set(tasks.map(t=>t[2])).size===18,'TASK_ACCOUNTING')
const ids=new Set(tasks.map(t=>t[2]))
assert(trace.requirements.every(r=>r.taskIds.every(id=>ids.has(id)))&&trace.scenarios.every(s=>s.taskIds.every(id=>ids.has(id))),'UNDECLARED_TASK')
const manifest=JSON.parse(read(rel+'/drafts/direction-manifest.example.json'))
assert(manifest.stages[0].roleAssignments.every(a=>/^[a-z0-9-]+$/.test(a.model)&&['high','xhigh'].includes(a.effort)),'AMBIGUOUS_ROLE')
assert(manifest.stages[0].roleAuthority.hash===sha(read(rel+'/design.md')),'MODEL_SOURCE_HASH')
assert(JSON.stringify(manifest.scope.closure.specDestinations)===JSON.stringify(specs.map(s=>'openspec/specs/'+s+'/spec.md')),'CLOSURE_SPEC_SCOPE')
assert(manifest.scope.closure.enabled===false&&manifest.scope.closure.archiveOwner==='frade-standard-workflow'&&manifest.scope.closure.archiveDestination==='openspec/changes/archive/<actual-archive-date>-frade-standard-workflow/**','CLOSURE_PHASE_OWNER')
const status=read('docs/engineering/BRANCH-STATUS.md').toString('utf8')
const sections=[...status.matchAll(/^## (\d+)\. (.+)$/gm)]
assert(sections.length===8&&sections.every((s,i)=>Number(s[1])===i+1),'STATUS_SECTION_ORDER')
const template=read(rel+'/drafts/status-template.md').toString('utf8')
assert(sections.map(s=>s[2]).join('|')===[...template.matchAll(/^## (\d+)\. (.+)$/gm)].map(s=>s[2]).join('|'),'STATUS_TEMPLATE_DRIFT')
const changed=[...git(['diff','--name-only',base]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean)
assert(changed.every(p=>p==='docs/engineering/BRANCH-STATUS.md'||p.startsWith(rel+'/')),'UNAUTHORIZED_CHANGED_PATH')
const productDiff=git(['diff',base,'--','packages','apps','pnpm-lock.yaml','scripts/routing-v2-architecture-gate.mjs','docs/routing-v2','AGENTS.md','package.json','.github'])
assert(productDiff==='','PRODUCT_OR_CONTROL_DRIFT')
const trackedDocs=git(['ls-files','--',rel,'docs/engineering/BRANCH-STATUS.md']).split('\n')
const untrackedDocs=git(['ls-files','--others','--exclude-standard']).split('\n')
const files=[...new Set([...trackedDocs,...untrackedDocs])].filter(p=>p&&(p.startsWith(rel+'/')||p==='docs/engineering/BRANCH-STATUS.md'))
for(const file of files.filter(p=>p.endsWith('.md')&&!p.startsWith(rel+'/evidence/reviews/'))){
 const text=read(file).toString('utf8')
 for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const target=m[1].replace(/^<|>$/g,'').split('#')[0]
  if(!target||/^(https?:|codex:)/.test(target))continue
  assert(fs.existsSync(path.resolve(path.dirname(path.join(root,file)),target)),'BROKEN_LOCAL_LINK:'+file+':'+target)
 }
}
console.log(JSON.stringify({status:'PASS',scope:'PLANNING_ONLY',branch:git(['branch','--show-current']),base,packages:audit.packageCount,requirements:requirements.length,scenarios:scenarios.length,tasks:tasks.length,tasksComplete:tasks.filter(t=>t[1]==='x').length,statusSections:8,markdownFilesChecked:files.filter(p=>p.endsWith('.md')&&!p.startsWith(rel+'/evidence/reviews/')).length,rawReviewLinks:'Preserved immutable packet references; verified by transfer hashes, excluded from authored local-link scan',productTreeUnchanged:true,modelSourceHash:manifest.stages[0].roleAuthority.hash,changedPaths:changed,evidenceNote:'Declarations/consistency only; product/control behavioral tests NOT_RUN'},null,2))
