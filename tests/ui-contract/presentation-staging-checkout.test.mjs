import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = fileURLToPath(new URL('../../', import.meta.url))
const pins = [
  {file:'packages/ui-workspace/tests/ui-contract/presentation-staging-adoption.json',sha256:'eef8c989136106b41029ce82e0f0ee89d7627056da6e62f27355ef0b5b1f4c7b'},
  {file:'tests/ui-contract/presentation-staging-cases.json',sha256:'3926794a759715b4d4b7cce189704bafb4243a3aea12bd5e28b7a5ad715b0ed2'},
]
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
for (const autocrlf of [false,true]) test('staging metadata raw pins survive real Git checkout autocrlf='+autocrlf,()=>{
  const parent=fs.realpathSync(tmpdir()),directory=fs.realpathSync(fs.mkdtempSync(join(parent,'frade-staging-checkout-'))),identity=fs.statSync(directory,{bigint:true})
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')))
  env.GIT_CONFIG_NOSYSTEM='1';env.GIT_CONFIG_GLOBAL=process.platform==='win32'?'NUL':'/dev/null'
  const git=args=>execFileSync('git',['-c','core.fsmonitor=false','-c','core.attributesfile='+env.GIT_CONFIG_GLOBAL,...args],{cwd:directory,env,encoding:'utf8',stdio:['ignore','pipe','pipe']})
  const put=(file,bytes)=>{const dest=join(directory,file);fs.mkdirSync(dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)}
  try{
    git(['init','--quiet']);git(['config','core.autocrlf',String(autocrlf)])
    put('.gitattributes',fs.readFileSync(join(root,'.gitattributes')))
    const files=['.gitattributes']
    for(const pin of pins){
      const raw=fs.readFileSync(join(root,pin.file));assert.equal(sha(raw),pin.sha256)
      put(pin.file,raw);files.push(pin.file)
      const rule=dirname(pin.file)+'/.gitattributes'
      if(fs.existsSync(join(root,rule))){
        const rawRule=fs.readFileSync(join(root,rule))
        assert.deepEqual(rawRule,Buffer.from(pin.file.split('/').at(-1)+' text eol=lf\n'))
        put(rule,rawRule);files.push(rule)
      }
      const outside=dirname(pin.file)+'/unrelated.json';put(outside,'{}\n');files.push(outside)
    }
    git(['add','--',...files])
    for(const pin of pins)fs.unlinkSync(join(directory,pin.file))
    git(['checkout-index','--all','--force'])
    for(const pin of pins){
      assert.equal(sha(fs.readFileSync(join(directory,pin.file))),pin.sha256)
      const rule=dirname(pin.file)+'/.gitattributes'
      assert.equal(fs.readFileSync(join(directory,rule),'utf8').replaceAll('\r\n','\n'),pin.file.split('/').at(-1)+' text eol=lf\n')
      assert.match(git(['check-attr','eol','--',pin.file]),/: eol: lf\r?\n$/)
      assert.match(git(['check-attr','eol','--',dirname(pin.file)+'/unrelated.json']),/: eol: unspecified\r?\n$/)
    }
  }finally{
    const current=fs.statSync(directory,{bigint:true})
    assert.ok(fs.realpathSync(directory)===directory&&dirname(directory)===parent&&directory.includes('frade-staging-checkout-')&&current.ino===identity.ino&&current.dev===identity.dev,'UNVERIFIED_STAGING_CHECKOUT_CLEANUP')
    fs.rmSync(directory,{recursive:true,force:true})
  }
})
