import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { currentInputs, sourceSetSha256 } from '../../../../../tests/ui-contract/drawing-pages-current.mjs'
const root=process.cwd(),role=process.argv[2],brand=role.endsWith('brand'),dir=path.join(import.meta.dirname,role+'-'+new Date().toISOString().replaceAll(/[:.]/g,'-'))
if(!/^(red|green)-(origin|brand)$/.test(role))throw Error('ROLE')
fs.mkdirSync(dir);const before=currentInputs(root),cwd=path.resolve(brand?'packages/draw':'packages/ui-workspace'),script=path.join(cwd,'node_modules',brand?'@playwright/test/cli.js':'vitest/vitest.mjs'),report=dir+'/report.json'
const args=brand?['test','tests/spike/drawing-pages-parity.spec.ts','--grep','native footer omits external branding','--reporter=json']:['run','tests/ui-contract/drawing-pages-origin.test.ts','--reporter=json','--outputFile='+report]
const startedAt=new Date().toISOString(),child=spawn(process.execPath,[script,...args],{cwd,env:{...process.env,FRADE_DRAW_E2E_PORT:'5187'},windowsHide:true,stdio:['ignore','pipe','pipe']}),out=[],err=[]
child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x))
const exitCode=await new Promise((done,reject)=>{child.on('error',reject);child.on('close',done)})
fs.writeFileSync(dir+'/stdout.txt',Buffer.concat(out));fs.writeFileSync(dir+'/stderr.txt',Buffer.concat(err));if(brand)fs.writeFileSync(report,Buffer.concat(out))
const record={role,startedAt,finishedAt:new Date().toISOString(),executable:process.execPath,args:[script,...args],cwd,exitCode,sourceBefore:sourceSetSha256(before),sourceAfter:sourceSetSha256(currentInputs(root))}
fs.writeFileSync(dir+'/record.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({...record,dir}));if(exitCode)process.exit(1)
