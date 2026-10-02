import {test,expect,_electron as electron} from 'C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/apps/desktop/node_modules/@playwright/test/index.mjs';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {decodePng,pixels,sha} from '../p01-upper-three-v6-controls-20261002T204114Z/engine.mjs';
const sources=JSON.parse(await readFile(new URL('./original-resources.json',import.meta.url),'utf8')).sources;
test('V6 independent empty probe composition diagnostic',async({},info)=>{
 const profile=await mkdtemp(join(tmpdir(),'frade-upper-v6-rca-')),app=await electron.launch({args:['C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-v6-empty-rca-20261002T205518Z/reference-main.cjs'],env:{...process.env,FRADE_UPPER_V6_PROFILE:profile}});
 try{const page=await app.firstWindow();await page.locator('body[data-frade-v5-reference="1"]').waitFor({state:'attached'});
 const record=await page.evaluate(async(url)=>{
  document.body.replaceChildren();document.body.style.cssText='margin:0;background:rgb(245,246,248)';document.documentElement.style.background='rgb(245,246,248)';
  const svg=(path:string)=>'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">'+path+'</svg>');
  const solid=svg('<path fill="black" d="M0 0h18v18H0z"/>'),empty=svg('<path fill="black" fill-opacity="0" d="M0 0h18v18H0z"/>');
  const cases=[['original',''],['empty-css','--image:none;--ink:transparent'],['empty-mask','--image:url("'+empty+'")'],['empty-original-mask-transparent-color','--ink:transparent'],['original-same-color','--ink:rgb(245,246,248)'],['full-mask','--image:url("'+solid+'")'],['full-no-mask','--image:none'],['empty-isolate','--image:none;--ink:transparent;isolation:isolate'],['empty-force-layer','--image:none;--ink:transparent;will-change:opacity']];
  const nodes=cases.map(([label,extra],i)=>{const n=document.createElement('div');n.className='target';n.style.cssText='left:'+(20+i*80)+'px;top:40px;background:rgb(245,246,248);opacity:.75;--image:url("'+url+'");--ink:black;'+extra;document.body.append(n);return {label,n};});
  const image=new Image();image.src=url;await image.decode();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return {dpr:devicePixelRatio,rows:nodes.map(({label,n})=>({label,x:n.getBoundingClientRect().x+5,y:45,css:n.getAttribute('style'),pseudo:{mask:getComputedStyle(n,'::before').maskImage,color:getComputedStyle(n,'::before').backgroundColor},opacity:getComputedStyle(n).opacity}))};
 },sources[0].url);
 const raw=await page.screenshot({path:info.outputPath('diagnostic.png')}),screen=decodePng(raw);const rows=record.rows.map(r=>({...r,pixels:pixels(screen,r.x,r.y),distinct:[...new Set(pixels(screen,r.x,r.y).map(x=>JSON.stringify(x)))]}));await writeFile(info.outputPath('diagnostic.json'),JSON.stringify({record,screenshotSha256:sha(raw),rows}));expect(record.dpr).toBe(1);
 }finally{await app.close();}
});