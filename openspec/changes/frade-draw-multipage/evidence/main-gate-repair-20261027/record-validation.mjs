import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
import { own } from './audit.mjs'
const tag=process.argv[2],dir=own+'verification-'+tag
if(!/^[a-z0-9-]+$/.test(tag)||fs.existsSync(dir))throw Error('IMMUTABLE_VERIFICATION_EXISTS')
fs.mkdirSync(dir)
const files=['proposal.md','design.md','tasks.md','specs/diagram-pages/spec.md'].map(x=>'openspec/changes/frade-draw-multipage/'+x).concat([own+'plan.md',own+'eol-plan.md'])
const snapshot=()=>files.map(file=>({file,sha256:sha256(fs.readFileSync(file))})),before=snapshot(),commands=[]
for(const [name,command] of [['strict','openspec validate frade-draw-multipage --strict'],['status','openspec status --change frade-draw-multipage --json'],['apply','openspec instructions apply --change frade-draw-multipage --json']]){
 const startedAt=new Date().toISOString(),r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,maxBuffer:8e6})
 if(r.error)throw r.error
 const out=dir+'/'+name+'-stdout.txt',err=dir+'/'+name+'-stderr.txt';fs.writeFileSync(out,r.stdout);fs.writeFileSync(err,r.stderr)
 commands.push({command,startedAt,finishedAt:new Date().toISOString(),actualExit:r.status,stdout:{file:out,sha256:sha256(fs.readFileSync(out))},stderr:{file:err,sha256:sha256(fs.readFileSync(err))}})
}
const after=snapshot(),record={createdAt:new Date().toISOString(),before,after,unchanged:JSON.stringify(before)===JSON.stringify(after),commands,status:commands.every(x=>x.actualExit===0)&&JSON.stringify(before)===JSON.stringify(after)?'PASS':'FAIL'}
fs.writeFileSync(dir+'/record.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,dir}));if(record.status!=='PASS')process.exit(1)
