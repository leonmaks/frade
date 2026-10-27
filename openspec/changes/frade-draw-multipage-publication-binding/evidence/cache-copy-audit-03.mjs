import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
const root=fs.realpathSync(process.cwd()),clean=fs.realpathSync(path.join(root,'.worktrees/multipage-publication-clean-3'))
const mainRequire=createRequire(path.join(root,'apps/desktop/package.json')),cleanRequire=createRequire(path.join(clean,'apps/desktop/package.json'))
const sourcePackage=mainRequire.resolve('electron/package.json'),targetPackage=cleanRequire.resolve('electron/package.json')
if(JSON.parse(fs.readFileSync(sourcePackage)).version!=='44.4.5'||!fs.readFileSync(sourcePackage).equals(fs.readFileSync(targetPackage)))throw Error('ELECTRON_PACKAGE_MISMATCH')
const from=path.join(path.dirname(sourcePackage),'dist'),to=path.join(path.dirname(targetPackage),'dist')
if(!path.dirname(to).startsWith(clean+path.sep)||!to.endsWith(path.sep+'electron'+path.sep+'dist'))throw Error('UNSAFE_RUNTIME_TARGET')
const hash=f=>{const fd=fs.openSync(f,'r'),b=Buffer.alloc(1024*1024),h=createHash('sha256');try{for(let n;(n=fs.readSync(fd,b))>0;)h.update(b.subarray(0,n))}finally{fs.closeSync(fd)}return h.digest('hex')}
function inventory(directory){const rows=[];const visit=folder=>{for(const e of fs.readdirSync(path.join(directory,folder),{withFileTypes:true})){const f=folder?folder+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('RUNTIME_CACHE_LINK');if(e.isDirectory())visit(f);else rows.push({file:f,bytes:fs.statSync(path.join(directory,f)).size,sha256:hash(path.join(directory,f))})}};visit('');return rows.sort((a,b)=>a.file.localeCompare(b.file,'en'))}
const before=inventory(from),copied=!fs.existsSync(to)
if(copied)fs.cpSync(from,to,{recursive:true,errorOnExist:true,force:false})
const after=inventory(to)
if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(before)!==JSON.stringify(inventory(from)))throw Error('RUNTIME_CACHE_TRANSFER_DRIFT')
const metadata=path.join(path.dirname(sourcePackage),'path.txt'),destMetadata=path.join(path.dirname(targetPackage),'path.txt')
if(fs.existsSync(metadata)){if(fs.existsSync(destMetadata)){if(!fs.readFileSync(metadata).equals(fs.readFileSync(destMetadata)))throw Error('ELECTRON_PATH_METADATA_MISMATCH')}else fs.copyFileSync(metadata,destMetadata,fs.constants.COPYFILE_EXCL)}
const workspace=[]
for(const base of ['packages','apps'])for(const d of fs.readdirSync(path.join(clean,base),{withFileTypes:true})){if(!d.isDirectory())continue;const folder=path.join(clean,base,d.name),manifest=path.join(folder,'package.json');if(!fs.existsSync(manifest))continue;const meta=JSON.parse(fs.readFileSync(manifest));for(const [name,value]of Object.entries({...meta.dependencies,...meta.devDependencies})){if(!String(value).startsWith('workspace:'))continue;const resolved=fs.realpathSync(path.join(folder,'node_modules',name));if(JSON.parse(fs.readFileSync(path.join(resolved,'package.json'))).name!==name)throw Error('WORKSPACE_PACKAGE_NAME');if(!resolved.startsWith(clean+path.sep))throw Error('FOREIGN_WORKSPACE_DEPENDENCY:'+name);workspace.push({owner:base+'/'+d.name,name,resolved})}}
const binary=fs.realpathSync(path.join(to,'electron.exe'))
if(!binary.startsWith(clean+path.sep))throw Error('FOREIGN_ELECTRON')
const report={at:new Date().toISOString(),version:'44.4.5',sourcePackage,targetPackage,from,to,copied,sourceAndDestinationInventoryIdentical:true,files:after,binary,binarySha256:hash(binary),workspaceReferences:workspace,foreignWorkspaceReferences:0}
fs.writeFileSync('openspec/changes/frade-draw-multipage-publication-binding/evidence/clean-runtime-installation-03.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({copied,files:after.length,binarySha256:report.binarySha256,workspaceReferences:workspace.length}))
