import {test,expect,_electron as electron} from 'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/apps/desktop/node_modules/@playwright/test/index.mjs';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {makeAtlas,prove,pixels,decodePng,contrast,sha,identities} from './engine.mjs';
const resources=JSON.parse(await readFile(new URL('./original-resources.json',import.meta.url),'utf8')).sources;
const backplates=[[0,0,0],[255,255,255],[32,35,41],[245,246,248]],opacities=[1,.65,.75];
test('P01 V5 complete-raster same-Electron affirmative and rejecting controls',async({},info)=>{
 test.setTimeout(300000);const profile=await mkdtemp(join(tmpdir(),'frade-upper-v5-'));
 const app=await electron.launch({args:['C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-v5-controls-20261002T195924Z/reference-main.cjs'],env:{...process.env,FRADE_UPPER_V5_PROFILE:profile}});
 const summaries:any[]=[];let atlasCount=0;
 try{
 const version=await app.evaluate(()=>process.versions);expect(version.electron).toBe('44.4.5');const page=await app.firstWindow();
 for(let resourceIndex=0;resourceIndex<resources.length;resourceIndex++)for(const back of backplates)for(const opacity of opacities){
  const source=resources[resourceIndex],name='r'+resourceIndex+'-b'+back.join('_')+'-q'+opacity;
  const observed=await page.evaluate(async({url,back,opacity,version})=>{
   const rgb=(a:number[])=>'rgb('+a.join(',')+')';document.body.replaceChildren();document.body.style.cssText='margin:0;padding:0;background-color:'+rgb(back);document.documentElement.style.backgroundColor=rgb(back);
   const nodes:any[]=[];for(let c=0;c<256;c++){
    const x=(c%16)*80,y=Math.floor(c/16)*48;
    const add=(probe:boolean)=>{const n=document.createElement('div');n.className='target'+(probe?' probe':'');n.style.cssText='left:'+(x+(probe?40:0))+'px;top:'+y+'px;background-color:'+rgb(back)+';opacity:'+opacity+';--ink:'+rgb([c,c,c])+';--image:url("'+url+'")';document.body.append(n);return n;};nodes.push({c,a:add(false),b:add(true)});
   }
   const img=new Image();img.src=url;await img.decode();await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
   const rect=(n:HTMLElement)=>{const s=getComputedStyle(n,'::before'),r=n.getBoundingClientRect();return {x:r.x+parseFloat(s.left),y:r.y+parseFloat(s.top),width:parseFloat(s.width),height:parseFloat(s.height)};};
   return {url,back,opacity,dpr:devicePixelRatio,fonts:document.fonts.status,electron:version,tiles:nodes.map(({c,a,b})=>({c,source:[c,c,c],glyph:rect(a),probe:rect(b)}))};
  },{url:source.url,back,opacity,version:version.electron});
  const rawAtlas=await page.screenshot({path:info.outputPath(name+'-atlas.png')}),atlas=makeAtlas(decodePng(rawAtlas),observed);atlasCount++;
  await writeFile(info.outputPath(name+'-atlas.json'),JSON.stringify({screenshotSha256:sha(rawAtlas),atlas},null,2));
  const below=atlas.tiles.filter((t:any)=>contrast(t.fullCoverage,back)<3).at(-1)?.c,above=atlas.tiles.find((t:any)=>contrast(t.fullCoverage,back)>=3)?.c;
  const colors=[[0,0,0],[255,255,255],[230,233,239],[32,35,41],[21,187,93],[207,39,168],[148,148,148],[149,149,149],...(below===undefined?[]:[[below,below,below]]),...(above===undefined?[]:[[above,above,above]])];
  for(let colorIndex=0;colorIndex<colors.length;colorIndex++){
   const foreground=colors[colorIndex],caseName=name+'-c'+colorIndex;
   const record=await page.evaluate(async({source,back,opacity,foreground,version})=>{
    const rgb=(a:number[])=>'rgb('+a.join(',')+')';document.body.replaceChildren();
    const target=document.createElement('button');target.id='control';target.className='target';target.style.cssText='appearance:none;margin:0;border-radius:0;left:40px;top:40px;background-color:'+rgb(back)+';opacity:'+opacity+';--ink:'+rgb(foreground)+';--image:url("'+source.url+'")';target.setAttribute('aria-label','Reference original mask');document.body.append(target);
    const probe=target.cloneNode() as HTMLElement;probe.id='opaque-probe';probe.className='target probe';probe.style.left='100px';document.body.append(probe);
    const img=new Image();img.src=source.url;await img.decode();const raster=(n:number)=>{const c=document.createElement('canvas');c.width=c.height=n;c.getContext('2d')!.drawImage(img,0,0,n,n);return Array.from(c.getContext('2d')!.getImageData(0,0,n,n).data);};
    await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const s=getComputedStyle(target),p=getComputedStyle(target,'::before'),r=target.getBoundingClientRect(),pr=probe.getBoundingClientRect(),values=(c:string)=>(c.match(/[\d.]+/g)||[]).map(Number);
    const chain=[];for(let n=target.parentElement;n;n=n.parentElement){const q=getComputedStyle(n);chain.push({opacity:Number(q.opacity),filter:q.filter,transform:q.transform,blend:q.mixBlendMode,backdropFilter:q.backdropFilter,shadow:q.boxShadow,backgroundImage:q.backgroundImage});}
    const match=p.maskImage.match(/^url\("(.*)"\)$/),after=getComputedStyle(target,'::after'),x=r.x+parseFloat(p.left),y=r.y+parseFloat(p.top);
    return {purpose:'REFERENCE_CONTROL',connected:target.isConnected,dpr:devicePixelRatio,fonts:document.fonts.status,electron:version,url:source.url,resource:{bytes:source.bytes,naturalRgba:raster(24),paintRgba:raster(18)},capability:{proven:true,enabled:!target.disabled},back,foreground,opacity:Number(s.opacity),targetBack:values(s.backgroundColor),parentBack:values(getComputedStyle(document.body).backgroundColor),filter:s.filter,transform:s.transform,blend:s.mixBlendMode,backdropFilter:s.backdropFilter,shadow:s.boxShadow,backgroundImage:s.backgroundImage,chain,interference:target.children.length!==0||!['none','normal'].includes(after.content),unobscured:document.elementFromPoint(x+9,y+9)===target,pseudo:{x,y,width:parseFloat(p.width),height:parseFloat(p.height),maskUrl:match?.[1],opacity:Number(p.opacity),filter:p.filter,transform:p.transform,blend:p.mixBlendMode,backgroundImage:p.backgroundImage,maskSize:p.maskSize,maskRepeat:p.maskRepeat,maskPosition:p.maskPosition},probe:{x:pr.x+5,y:pr.y+5}};
   },{source,back,opacity,foreground,version:version.electron});
   const raw=await page.screenshot({path:info.outputPath(caseName+'.png')}),screen=decodePng(raw),result=prove(record,screen,atlas),solid=pixels(screen,record.probe.x,record.probe.y);
   expect(solid.every(p=>JSON.stringify(p)===JSON.stringify(solid[0])),caseName).toBe(true);
   const observedRatio=contrast(solid[0],back),expected=observedRatio>=3?'PASS':'FAIL';
   await writeFile(info.outputPath(caseName+'.json'),JSON.stringify({caseName,sourceSha256:atlas.sourceSha256,record,screenshotSha256:sha(raw),observedSolid:solid[0],observedRatio,result},null,2));
   expect(result.status,caseName+': '+JSON.stringify({reason:result.reason,reasons:result.reasons,candidates:result.candidates,min:result.min,max:result.max,observedRatio})).toBe(expected);
   expect(result.canonicalMember,caseName).toBe(true);expect(result.candidates.every((s:number[],i:number)=>s.includes(foreground[i])),caseName).toBe(true);
   expect(result.possibilities.some((p:any)=>JSON.stringify(p.effective)===JSON.stringify(solid[0])),caseName).toBe(true);
   expect(result.min).toBeLessThanOrEqual(observedRatio);expect(result.max).toBeGreaterThanOrEqual(observedRatio);
   if(back.every(v=>v===0)&&foreground.every(v=>v===0))expect(observedRatio).toBe(1);
   if(opacity===1&&back.every(v=>v===255)&&foreground.every(v=>v===0))expect(observedRatio).toBe(21);
   summaries.push({caseName,status:result.status,min:result.min,max:result.max,actualOpaqueReferenceRatio:observedRatio});
   if(resourceIndex===0&&back.every(v=>v===0)&&opacity===1&&foreground.every(v=>v===255)){
    const negative:any[]=[];const cases:[string,(r:any)=>void][]=[['unknown-capability',r=>r.capability.enabled=null],['disabled',r=>r.capability.enabled=false],['missing-resource',r=>delete r.resource],['wrong-resource',r=>r.url=resources[1].url],['wrong-mask-url',r=>r.pseudo.maskUrl=resources[1].url],['fractional-origin',r=>r.pseudo.x+=.5],['wrong-origin',r=>r.pseudo.x+=1],['wrong-dpr',r=>r.dpr=2],['opacity',r=>r.opacity=.3],['filter',r=>r.filter='blur(1px)'],['blend',r=>r.blend='multiply'],['gradient',r=>r.backgroundImage='linear-gradient(black,white)'],['occlusion',r=>r.unobscured=false],['empty-mask',r=>r.resource.paintRgba.fill(0)],['no-intrinsic-opaque',r=>r.resource.naturalRgba=r.resource.naturalRgba.map((v:number,i:number)=>i%4===3&&v===255?254:v)],['wrong-canonical-source',r=>r.foreground=[0,0,0]],['unverified-app-inference',r=>r.purpose='APPLICATION']];
    for(const [label,edit]of cases){const altered=structuredClone(record);edit(altered);const outcome=prove(altered,screen,atlas);negative.push({label,syntheticMetadataCounterexample:true,record:altered,result:outcome});expect(outcome.status,label).toBe(label==='disabled'?'EXCLUDED_PROVEN_DISABLED':'NOT_MEASURED');}
    const mutated={...screen,pixels:Buffer.from(screen.pixels)},at=((record.pseudo.y+9)*screen.width+record.pseudo.x+9)*screen.channels;mutated.pixels[at]=128;const outcome=prove(record,mutated,atlas);expect(outcome.status,'contradicted actual channel').toBe('NOT_MEASURED');await writeFile(info.outputPath('contradicted-screen.synthetic-pixels.bin'),mutated.pixels);negative.push({label:'contradicted-screenshot',syntheticPixelCounterexample:true,result:outcome});
    await writeFile(info.outputPath('negative-controls.json'),JSON.stringify({rawScreenshotSha256:sha(raw),sourceRecord:record,negative},null,2));
   }
  }
 }
 await writeFile(info.outputPath('reference-results.json'),JSON.stringify({status:'PASS',atUtc:new Date().toISOString(),version,atlasCount,cases:summaries.length,negativeControls:18,rows:summaries,scope:'Reference harness only; application inference deliberately NOT_IMPLEMENTED. Controls beyond recorded set remain pending.'},null,2));
 }finally{await app.close();}
});
