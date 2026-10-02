import {test,expect,_electron as electron} from 'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/apps/desktop/node_modules/@playwright/test/index.mjs';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {makeAtlas,prove,pixels,decodePng,contrast,sha,identities} from './engine.mjs';
const resources=JSON.parse(await readFile(new URL('./original-resources.json',import.meta.url),'utf8')).sources;
const pairs=[[[0,0,0],[0,0,0]],[[255,255,255],[255,255,255]],[[32,35,41],[32,35,41]],[[245,246,248],[245,246,248]],[[43,48,57],[32,35,41]],[[232,235,240],[245,246,248]],[[0,0,0],[255,255,255]],[[255,255,255],[0,0,0]]],opacities=[1,.65,.75];
test('P01 V6 complete-raster same-Electron affirmative and rejecting controls',async({},info)=>{
 test.setTimeout(300000);const profile=await mkdtemp(join(tmpdir(),'frade-upper-v5-'));
 const app=await electron.launch({args:['C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-v6-controls-v3-20261002T205922Z/reference-main.cjs'],env:{...process.env,FRADE_UPPER_V6_PROFILE:profile}});
 const summaries:any[]=[];let atlasCount=0;
 try{
 const version=await app.evaluate(()=>process.versions);expect(version.electron).toBe('44.4.5');const page=await app.firstWindow();await page.locator("body[data-frade-v5-reference=\"1\"]").waitFor({state:"attached"});
 for(let resourceIndex=0;resourceIndex<resources.length;resourceIndex++)for(let pairIndex=0;pairIndex<pairs.length;pairIndex++)for(const opacity of opacities){
  const [back,under]=pairs[pairIndex],source=resources[resourceIndex],name='r'+resourceIndex+'-p'+pairIndex+'-q'+opacity;
  const observed=await page.evaluate(async({url,back,under,opacity,version})=>{
   const rgb=(a:number[])=>'rgb('+a.join(',')+')';document.body.replaceChildren();document.body.style.cssText='margin:0;padding:0;background-color:'+rgb(under);document.documentElement.style.backgroundColor=rgb(under);
   const nodes:any[]=[];for(let c=0;c<256;c++){
    const x=(c%16)*96,y=Math.floor(c/16)*48;
    const add=(kind:string)=>{const n=document.createElement('div');n.className='target '+kind;n.style.cssText='left:'+(x+(kind==='probe'?32:kind==='empty'?64:0))+'px;top:'+y+'px;background-color:'+rgb(back)+';opacity:'+opacity+';--ink:'+rgb([c,c,c])+';--image:url("'+url+'")';document.body.append(n);return n;};nodes.push({c,a:add(''),b:add('probe'),e:add('empty')});
   }
   const img=new Image();img.src=url;await img.decode();await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
   const rect=(n:HTMLElement)=>{const s=getComputedStyle(n,'::before'),r=n.getBoundingClientRect();return {x:r.x+parseFloat(s.left),y:r.y+parseFloat(s.top),width:parseFloat(s.width),height:parseFloat(s.height)};};
   const outer=document.createElement('div');outer.style.cssText='position:absolute;left:1555px;top:10px;width:18px;height:18px;background-color:'+rgb(under);document.body.append(outer);return {url,back,under,opacity,underProbe:{x:1555,y:10,width:18,height:18},dpr:devicePixelRatio,fonts:document.fonts.status,electron:version,tiles:nodes.map(({c,a,b,e})=>({c,source:[c,c,c],glyph:rect(a),probe:rect(b),empty:rect(e)}))};
  },{url:source.url,back,under,opacity,version:version.electron});
  const rawAtlas=await page.screenshot({path:info.outputPath(name+'-atlas.png')}),atlas=makeAtlas(decodePng(rawAtlas),observed);atlasCount++;
  await writeFile(info.outputPath(name+'-atlas.json'),JSON.stringify({screenshotSha256:sha(rawAtlas),atlas}));
  const below=atlas.tiles.filter((t:any)=>contrast(t.fullCoverage,atlas.effectiveBack)<3).sort((a:any,b:any)=>contrast(b.fullCoverage,atlas.effectiveBack)-contrast(a.fullCoverage,atlas.effectiveBack))[0]?.c,above=atlas.tiles.filter((t:any)=>contrast(t.fullCoverage,atlas.effectiveBack)>=3).sort((a:any,b:any)=>contrast(a.fullCoverage,atlas.effectiveBack)-contrast(b.fullCoverage,atlas.effectiveBack))[0]?.c;
  const colors=[[0,0,0],[255,255,255],[230,233,239],[32,35,41],[21,187,93],[207,39,168],[148,148,148],[149,149,149],...(below===undefined?[]:[[below,below,below]]),...(above===undefined?[]:[[above,above,above]])];
  for(let colorIndex=0;colorIndex<colors.length;colorIndex++){
   const foreground=colors[colorIndex],caseName=name+'-c'+colorIndex;
   const record=await page.evaluate(async({source,back,under,opacity,foreground,version})=>{
    const rgb=(a:number[])=>'rgb('+a.join(',')+')';document.body.replaceChildren();
    const target=document.createElement('button');target.id='control';target.className='target';target.style.cssText='appearance:none;margin:0;border-radius:0;left:40px;top:40px;background-color:'+rgb(back)+';opacity:'+opacity+';--ink:'+rgb(foreground)+';--image:url("'+source.url+'")';target.setAttribute('aria-label','Reference original mask');document.body.append(target);
    const probe=target.cloneNode() as HTMLElement;probe.id='opaque-probe';probe.className='target probe';probe.style.left='100px';document.body.append(probe);const empty=target.cloneNode() as HTMLElement;empty.id='empty-probe';empty.className='target empty';empty.style.left='160px';document.body.append(empty);
    const img=new Image();img.src=source.url;await img.decode();const raster=(n:number)=>{const c=document.createElement('canvas');c.width=c.height=n;c.getContext('2d')!.drawImage(img,0,0,n,n);return Array.from(c.getContext('2d')!.getImageData(0,0,n,n).data);};
    await document.fonts.ready;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const s=getComputedStyle(target),p=getComputedStyle(target,'::before'),r=target.getBoundingClientRect(),pr=probe.getBoundingClientRect(),values=(c:string)=>(c.match(/[\d.]+/g)||[]).map(Number);
    const chain=[];for(let n=target.parentElement;n;n=n.parentElement){const q=getComputedStyle(n);chain.push({opacity:Number(q.opacity),filter:q.filter,transform:q.transform,blend:q.mixBlendMode,backdropFilter:q.backdropFilter,shadow:q.boxShadow,backgroundImage:q.backgroundImage});}
    const match=p.maskImage.match(/^url\("(.*)"\)$/),after=getComputedStyle(target,'::after'),x=r.x+parseFloat(p.left),y=r.y+parseFloat(p.top);
    return {purpose:'REFERENCE_CONTROL',connected:target.isConnected,dpr:devicePixelRatio,fonts:document.fonts.status,electron:version,url:source.url,resource:{bytes:source.bytes,naturalRgba:raster(24),paintRgba:raster(18)},capability:{proven:true,enabled:!target.disabled},back,under,foreground,opacity:Number(s.opacity),targetBack:values(s.backgroundColor),parentBack:values(getComputedStyle(document.body).backgroundColor),filter:s.filter,transform:s.transform,blend:s.mixBlendMode,backdropFilter:s.backdropFilter,shadow:s.boxShadow,backgroundImage:s.backgroundImage,clipPath:s.clipPath,chain,interference:target.children.length!==0||!['none','normal'].includes(after.content),unobscured:document.elementFromPoint(x+9,y+9)===target,pseudo:{x,y,width:parseFloat(p.width),height:parseFloat(p.height),maskUrl:match?.[1],opacity:Number(p.opacity),filter:p.filter,transform:p.transform,blend:p.mixBlendMode,backgroundImage:p.backgroundImage,maskSize:p.maskSize,maskRepeat:p.maskRepeat,maskPosition:p.maskPosition},probe:{x:pr.x+5,y:pr.y+5},emptyProbe:{x:empty.getBoundingClientRect().x+5,y:empty.getBoundingClientRect().y+5}};
   },{source,back,under,opacity,foreground,version:version.electron});
   const raw=await page.screenshot({path:info.outputPath(caseName+'.png')}),screen=decodePng(raw),result=prove(record,screen,atlas),solid=pixels(screen,record.probe.x,record.probe.y);
   expect(solid.every(p=>JSON.stringify(p)===JSON.stringify(solid[0])),caseName).toBe(true);
   const emptyPixels=pixels(screen,record.emptyProbe.x,record.emptyProbe.y);expect(emptyPixels.every(p=>JSON.stringify(p)===JSON.stringify(atlas.effectiveBack))).toBe(true);const observedRatio=contrast(solid[0],emptyPixels[0]),expected=observedRatio>=3?'PASS':'FAIL';
   await writeFile(info.outputPath(caseName+'.json'),JSON.stringify({caseName,sourceSha256:atlas.sourceSha256,record,screenshotSha256:sha(raw),observedSolid:solid[0],observedBackground:emptyPixels[0],observedRatio,result}));
   if(colorIndex>=8&&result.status==='NOT_MEASURED'){
    // V6 explicitly requires rejection when all compatible colors straddle 3:1.
    // The independent opaque reference still has to be enclosed by the exact bound.
    expect(result.reason,caseName).toBe('STRADDLING_BOUND');expect(result.min,caseName).toBeLessThan(3);expect(result.max,caseName).toBeGreaterThanOrEqual(3);
   }else{expect(result.status,caseName+': '+JSON.stringify({reason:result.reason,reasons:result.reasons,candidates:result.candidates,min:result.min,max:result.max,observedRatio})).toBe(expected);}
   expect(result.canonicalMember,caseName).toBe(true);expect(result.candidates.every((s:number[],i:number)=>s.includes(foreground[i])),caseName).toBe(true);
   expect(result.possibilities.some((p:any)=>JSON.stringify(p.effective)===JSON.stringify(solid[0])),caseName).toBe(true);
   expect(result.min).toBeLessThanOrEqual(observedRatio);expect(result.max).toBeGreaterThanOrEqual(observedRatio);
   if(back.every(v=>v===0)&&foreground.every(v=>v===0))expect(observedRatio).toBe(1);
   if(opacity===1&&back.every(v=>v===255)&&foreground.every(v=>v===0))expect(observedRatio).toBe(21);
   summaries.push({caseName,status:result.status,min:result.min,max:result.max,actualOpaqueReferenceRatio:observedRatio,canonicalMembership:result.canonicalMember,thresholdControl:colorIndex>=8});
   if(resourceIndex===0&&pairIndex===7&&opacity===.75&&colorIndex===0){
    expect(result.status).toBe('PASS');const paired:any[]=[];
    for(const [label,otherName]of [['collapsed-underlying-to-target','r0-p1-q0.75'],['collapsed-target-to-underlying','r0-p0-q0.75'],['swapped-target-and-underlying','r0-p6-q0.75'],['wrong-q','r0-p7-q1']]){
     const other=JSON.parse(await readFile(info.outputPath(otherName+'-atlas.json'),'utf8'));const outcome=prove(record,screen,other.atlas);expect(outcome.status,label).toBe('NOT_MEASURED');paired.push({label,kind:'WRONG_ACTUAL_REFERENCE',reference:otherName,referenceScreenshotSha256:other.screenshotSha256,outcome});
    }
    for(const [label,edit]of [['wrong-target-metadata',(r:any)=>{r.back=[0,0,0];r.targetBack=[0,0,0];}],['wrong-underlying-metadata',(r:any)=>{r.under=[255,255,255];r.parentBack=[255,255,255];}],['swapped-metadata',(r:any)=>{[r.back,r.under]=[r.under,r.back];[r.targetBack,r.parentBack]=[r.parentBack,r.targetBack];}],['wrong-q-metadata',(r:any)=>{r.opacity=1;}] ] as [string,(r:any)=>void][]){
     const altered=structuredClone(record);edit(altered);const outcome=prove(altered,screen,atlas);expect(outcome.status,label).toBe('NOT_MEASURED');paired.push({label,kind:'SYNTHETIC_METADATA',record:altered,outcome});
    }
    await writeFile(info.outputPath('paired-parameter-negative-controls.json'),JSON.stringify({originalScreenshotSha256:sha(raw),originalResult:result,paired}));
   }
   if(resourceIndex===0&&pairIndex===0&&opacity===1&&foreground.every(v=>v===255)){
    const negative:any[]=[];const cases:[string,(r:any)=>void][]=[['unknown-capability',r=>r.capability.enabled=null],['disabled',r=>r.capability.enabled=false],['missing-resource',r=>delete r.resource],['wrong-resource',r=>r.url=resources[1].url],['wrong-mask-url',r=>r.pseudo.maskUrl=resources[1].url],['fractional-origin',r=>r.pseudo.x+=.5],['wrong-origin',r=>r.pseudo.x+=1],['wrong-dpr',r=>r.dpr=2],['opacity',r=>r.opacity=.3],['filter',r=>r.filter='blur(1px)'],['blend',r=>r.blend='multiply'],['gradient',r=>r.backgroundImage='linear-gradient(black,white)'],['occlusion',r=>r.unobscured=false],['empty-mask',r=>r.resource.paintRgba.fill(0)],['no-intrinsic-opaque',r=>r.resource.naturalRgba=r.resource.naturalRgba.map((v:number,i:number)=>i%4===3&&v===255?254:v)],['wrong-canonical-source',r=>r.foreground=[0,0,0]],['unverified-app-inference',r=>r.purpose='APPLICATION']];
    for(const [label,edit]of cases){const altered=structuredClone(record);edit(altered);const outcome=prove(altered,screen,atlas);negative.push({label,syntheticMetadataCounterexample:true,record:altered,result:outcome});expect(outcome.status,label).toBe(label==='disabled'?'EXCLUDED_PROVEN_DISABLED':'NOT_MEASURED');}
    const mutated={...screen,pixels:Buffer.from(screen.pixels)},at=((record.pseudo.y+9)*screen.width+record.pseudo.x+9)*screen.channels;mutated.pixels[at]=128;const outcome=prove(record,mutated,atlas);expect(outcome.status,'contradicted actual channel').toBe('NOT_MEASURED');await writeFile(info.outputPath('contradicted-screen.synthetic-pixels.bin'),mutated.pixels);negative.push({label:'contradicted-screenshot',syntheticPixelCounterexample:true,result:outcome});
    await writeFile(info.outputPath('negative-controls.json'),JSON.stringify({rawScreenshotSha256:sha(raw),sourceRecord:record,negative},null,2));
    const actualNegative:any[]=[];
    const domCases=[['disabled-low-contrast','EXCLUDED_PROVEN_DISABLED'],['enabled-low-contrast','FAIL'],['actual-filter','NOT_MEASURED'],['actual-blend','NOT_MEASURED'],['actual-gradient','NOT_MEASURED'],['actual-shadow','NOT_MEASURED'],['actual-clipping','NOT_MEASURED'],['actual-occlusion','NOT_MEASURED'],['actual-fractional-origin','NOT_MEASURED'],['actual-opacity','NOT_MEASURED'],['actual-ancestor-opacity','NOT_MEASURED'],['actual-missing-mask','NOT_MEASURED'],['actual-mutated-mask','NOT_MEASURED'],['actual-dpr','NOT_MEASURED']];
    const originalStyle=await page.locator('#control').getAttribute('style');
    for(const [label,expected]of domCases){
     await app.evaluate(({BrowserWindow},zoom)=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(zoom),label==='actual-dpr'?1.25:1);
     const observation=await page.evaluate(async({label,originalStyle,original})=>{
      const node=document.getElementById('control') as HTMLButtonElement;node.setAttribute('style',originalStyle!);node.disabled=false;document.body.style.opacity='1';document.getElementById('occluder')?.remove();
      if(label.endsWith('low-contrast')){node.style.setProperty('--ink','rgb(0,0,0)');node.disabled=label.startsWith('disabled');}
      if(label==='actual-filter')node.style.filter='blur(1px)';if(label==='actual-blend')node.style.mixBlendMode='multiply';if(label==='actual-gradient')node.style.backgroundImage='linear-gradient(black, white)';if(label==='actual-shadow')node.style.boxShadow='inset 0 0 8px white';if(label==='actual-clipping')node.style.clipPath='inset(0 14px 0 0)';if(label==='actual-fractional-origin')node.style.left='40.5px';if(label==='actual-opacity')node.style.opacity='.3';if(label==='actual-ancestor-opacity')document.body.style.opacity='.8';if(label==='actual-missing-mask')node.style.setProperty('--image','none');
      if(label==='actual-mutated-mask'){const source=atob(original.url.split(',')[1]).replace('<path','<path opacity=".5"');node.style.setProperty('--image','url("data:image/svg+xml;base64,'+btoa(source)+'")');}
      if(label==='actual-occlusion'){const overlay=document.createElement('div');overlay.id='occluder';overlay.style.cssText='position:absolute;left:40px;top:40px;width:28px;height:28px;background:red;z-index:999';document.body.append(overlay);}
      await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));const style=getComputedStyle(node),pseudo=getComputedStyle(node,'::before'),r=node.getBoundingClientRect(),x=r.x+parseFloat(pseudo.left),y=r.y+parseFloat(pseudo.top),match=pseudo.maskImage.match(/^url\("(.*)"\)$/),record=structuredClone(original);record.capability={proven:true,enabled:!node.disabled};record.foreground=(pseudo.backgroundColor.match(/[\d.]+/g)||[]).map(Number);record.dpr=devicePixelRatio;record.opacity=Number(style.opacity);record.filter=style.filter;record.blend=style.mixBlendMode;record.shadow=style.boxShadow;record.backgroundImage=style.backgroundImage;record.clipPath=style.clipPath;record.pseudo={...record.pseudo,x,y,maskUrl:match?.[1]};record.unobscured=document.elementFromPoint(x+9,y+9)===node;record.chain=record.chain.map((c:any,i:number)=>i===0?{...c,opacity:Number(getComputedStyle(document.body).opacity)}:c);return {record,actualDisabled:node.disabled,actualStyle:node.getAttribute('style'),actualDpr:devicePixelRatio};
     },{label,originalStyle,original:record});
     const png=await page.screenshot({path:info.outputPath(label+'.png')}),outcome=prove(observation.record,decodePng(png),atlas);actualNegative.push({label,expected,observation,screenshotSha256:sha(png),outcome});expect(outcome.status,label+JSON.stringify(outcome.reasons)).toBe(expected);
    }
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));
    await page.evaluate((style)=>{const n=document.getElementById('control') as HTMLButtonElement;n.setAttribute('style',style!);n.disabled=false;document.body.style.opacity='1';document.getElementById('occluder')?.remove();},originalStyle);
    await writeFile(info.outputPath('actual-negative-controls.json'),JSON.stringify({actual:actualNegative}));
    const synthetic:any[]=[];
    const blank={...screen,pixels:Buffer.alloc(screen.pixels.length)};if(blank.channels===4)for(let i=3;i<blank.pixels.length;i+=4)blank.pixels[i]=255;
    const blankResult=prove(record,blank,atlas);expect(blankResult.status,'canonical CSS with blank screenshot').toBe('FAIL');synthetic.push({label:'blank-wrong-screenshot',kind:'SYNTHETIC_PIXELS',result:blankResult});await writeFile(info.outputPath('blank.synthetic-pixels.bin'),blank.pixels);
    const actualPixels=pixels(screen,record.pseudo.x,record.pseudo.y),ambiguous=structuredClone(atlas);for(const tile of ambiguous.tiles)tile.glyph=structuredClone(actualPixels);const ambiguousResult=prove(record,screen,ambiguous);expect(ambiguousResult.status).toBe('NOT_MEASURED');expect(ambiguousResult.reasons).toContain('UNINFORMATIVE_COMPATIBLE_SET');synthetic.push({label:'all-source-candidates-ambiguous',kind:'SYNTHETIC_ATLAS_AGGREGATION',result:ambiguousResult});
    const straddling=structuredClone(atlas);for(const tile of straddling.tiles)tile.glyph=actualPixels.map(()=>[1,2,3]);for(const c of[0,255]){straddling.tiles[c].glyph=structuredClone(actualPixels);straddling.tiles[c].fullCoverage=c===0?[80,80,80]:[100,100,100];}
    const crossing=prove(record,screen,straddling);expect(crossing.status).toBe('NOT_MEASURED');expect(crossing.reason).toBe('STRADDLING_BOUND');expect(crossing.min).toBeLessThan(3);expect(crossing.max).toBeGreaterThanOrEqual(3);expect(crossing.canonicalMember).toBe(true);synthetic.push({label:'all-compatible-cartesian-straddles-threshold',kind:'SYNTHETIC_ATLAS_AGGREGATION',result:crossing});
    await writeFile(info.outputPath('additional-synthetic-controls.json'),JSON.stringify({rawScreenshotSha256:sha(raw),synthetic}));

   }
  }
 }
 await writeFile(info.outputPath('reference-results.json'),JSON.stringify({pairedParameterNegativeControls:8,actualNegativeControls:14,additionalSyntheticControls:3,status:'PASS',atUtc:new Date().toISOString(),version,atlasCount,cases:summaries.length,negativeControls:18,rows:summaries,scope:'Reference harness only; application inference deliberately NOT_IMPLEMENTED. All predeclared reference controls executed; application inference remains a separate required implementation.'},null,2));
 }finally{await app.close();}
});
