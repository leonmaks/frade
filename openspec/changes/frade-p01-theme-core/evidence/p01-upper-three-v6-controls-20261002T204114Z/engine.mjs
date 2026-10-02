import {createHash} from 'node:crypto';
import {decodePng,contrast} from '../p01-cumulative-audit-20261002T142714Z/runtime-diagnostic/measurement.mjs';
import {dataUriBytes} from '../p01-cumulative-audit-20261002T142714Z/runtime-diagnostic/data-uri.mjs';
export {decodePng,contrast};
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const identities=new Set(['0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a','4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24','e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a']);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const not=(...reasons)=>({status:'NOT_MEASURED',reasons});
export function pixels(screen,x,y,size=18){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+size>screen.width||y+size>screen.height)throw Error('CLIPPED_OR_FRACTIONAL_RASTER');
 const out=[];for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){const at=((y+yy)*screen.width+x+xx)*screen.channels;if(screen.channels===4&&screen.pixels[at+3]!==255)throw Error('NONOPAQUE_SCREEN');out.push([...screen.pixels.subarray(at,at+3)]);}return out;
}
export function makeAtlas(screen,observed){
 if(observed.dpr!==1||observed.fonts!=='loaded'||observed.electron!=='44.4.5'||observed.tiles.length!==256)throw Error('UNSUPPORTED_ATLAS_RUNTIME');
 const sourceSha256=sha(dataUriBytes(observed.url));if(!identities.has(sourceSha256))throw Error('UNTRUSTED_ATLAS_SOURCE');
 if(![1,.65,.75].includes(observed.opacity))throw Error('UNSUPPORTED_ATLAS_OPACITY');
 const underPixels=pixels(screen,observed.underProbe.x,observed.underProbe.y);if(!underPixels.every(p=>eq(p,observed.under)))throw Error('UNPROVEN_UNDERLYING_PATCH');
 const tiles=observed.tiles.map((t,c)=>{if(t.c!==c||!eq(t.source,[c,c,c])||t.glyph.width!==18||t.glyph.height!==18||t.probe.width!==18||t.probe.height!==18)throw Error('INVALID_ATLAS_TILE');const glyph=pixels(screen,t.glyph.x,t.glyph.y),probe=pixels(screen,t.probe.x,t.probe.y),empty=pixels(screen,t.empty.x,t.empty.y);if(!empty.every(p=>eq(p,empty[0])))throw Error("NONUNIFORM_EFFECTIVE_TARGET_PATCH");if(!probe.every(p=>eq(p,probe[0])))throw Error('NONUNIFORM_FULL_COVERAGE_PROBE');return {c,glyph,probe,empty,fullCoverage:probe[0],effectiveBack:empty[0],coordinates:{glyph:t.glyph,probe:t.probe,empty:t.empty}};});
 if(!tiles.every(t=>eq(t.effectiveBack,tiles[0].effectiveBack)))throw Error('BACKGROUND_VARIES_WITH_SOURCE');
 if(tiles[0].glyph.every((p,i)=>eq(p,tiles[255].glyph[i])))throw Error('UNINFORMATIVE_ATLAS');
 return {sourceSha256,url:observed.url,opacity:observed.opacity,back:observed.back,under:observed.under,effectiveBack:tiles[0].effectiveBack,underPixels,dpr:observed.dpr,electron:observed.electron,tiles,observation:observed};
}
export function prove(record,screen,atlas){
 if(record.purpose!=='REFERENCE_CONTROL')return not('APPLICATION_VALIDATION_NOT_YET_IMPLEMENTED');
 if(record.capability?.proven!==true||typeof record.capability.enabled!=='boolean')return not('UNKNOWN_CAPABILITY');
 if(!record.capability.enabled)return {status:'EXCLUDED_PROVEN_DISABLED',reasons:['ACTUAL_DISABLED_CONTROL']};
 if(!record.connected||record.dpr!==1||record.fonts!=='loaded'||record.electron!=='44.4.5')return not('UNSUPPORTED_RUNTIME');
 if(!record.url||!record.resource)return not('MISSING_RESOURCE');
 let source;try{source=dataUriBytes(record.url);}catch{return not('INVALID_RESOURCE');}
 if(!identities.has(sha(source))||sha(source)!==atlas.sourceSha256||!eq([...source],record.resource.bytes)||record.url!==record.pseudo.maskUrl)return not('RESOURCE_IDENTITY_MISMATCH');
 const alpha=record.resource.naturalRgba.filter((_,i)=>i%4===3),paintAlpha=record.resource.paintRgba.filter((_,i)=>i%4===3);
 if(!alpha.includes(255)||!paintAlpha.some(x=>x>0)||paintAlpha.length!==324)return not('EMPTY_OR_NO_INTRINSIC_OPAQUE_MASK');
 if(![1,.65,.75].includes(record.opacity)||record.opacity!==atlas.opacity||!eq(record.back,atlas.back))return not('UNSUPPORTED_COMPOSITION');
 if(!record.chain.every(x=>x.opacity===1&&x.filter==='none'&&x.transform==='none'&&x.blend==='normal'&&x.backdropFilter==='none'&&x.shadow==='none'&&x.backgroundImage==='none'))return not('ANCESTOR_COMPOSITION');
 if(record.filter!=='none'||record.transform!=='none'||record.blend!=='normal'||record.backdropFilter!=='none'||record.shadow!=='none'||record.backgroundImage!=='none'||record.clipPath!=='none'||record.interference||!record.unobscured)return not('TARGET_COMPOSITION_OR_OCCLUSION');
 if(record.pseudo.width!==18||record.pseudo.height!==18||record.pseudo.opacity!==1||record.pseudo.filter!=='none'||record.pseudo.transform!=='none'||record.pseudo.blend!=='normal'||record.pseudo.backgroundImage!=='none'||record.pseudo.maskSize!=='contain'||record.pseudo.maskRepeat!=='no-repeat'||record.pseudo.maskPosition!=='50% 50%')return not('PSEUDO_GEOMETRY_OR_COMPOSITION');
 if(!eq(record.targetBack,atlas.back)||!eq(record.parentBack,atlas.under)||record.targetBack.length!==3||record.parentBack.length!==3)return not('UNPROVEN_PAIRED_OPAQUE_BACKPLATE');
 let actual;try{actual=pixels(screen,record.pseudo.x,record.pseudo.y);}catch(e){return not(String(e.message));}
 const backdrop=actual.filter((_,i)=>paintAlpha[i]===0);if(!backdrop.length||!backdrop.every(p=>eq(p,atlas.effectiveBack)))return not('NONUNIFORM_OBSERVED_BACKDROP');
 const candidates=[0,1,2].map(channel=>atlas.tiles.filter(t=>t.glyph.every((p,i)=>p[channel]===actual[i][channel])).map(t=>t.c));
 if(candidates.some(s=>!s.length))return {...not('EMPTY_COMPATIBLE_SET'),candidates,actual};
 if(candidates.some(s=>s.length===256))return {...not('UNINFORMATIVE_COMPATIBLE_SET'),candidates,actual};
 const possibilities=[];let min=Infinity,max=-Infinity;
 for(const r of candidates[0])for(const g of candidates[1])for(const b of candidates[2]){const effective=[atlas.tiles[r].fullCoverage[0],atlas.tiles[g].fullCoverage[1],atlas.tiles[b].fullCoverage[2]],ratio=contrast(effective,atlas.effectiveBack);possibilities.push({source:[r,g,b],effective,ratio});min=Math.min(min,ratio);max=Math.max(max,ratio);}
 const canonicalMember=record.foreground.length===3&&record.foreground.every((c,i)=>candidates[i].includes(c));
 const status=max<3?'FAIL':min>=3&&canonicalMember?'PASS':'NOT_MEASURED';
 return {status,reason:status==='NOT_MEASURED'?(canonicalMember?'STRADDLING_BOUND':'CANONICAL_SOURCE_NOT_COMPATIBLE'):undefined,min,max,canonicalMember,sourceSha256:atlas.sourceSha256,target:atlas.back,underlying:atlas.under,effectiveBackground:atlas.effectiveBack,actual,candidates,possibilities,threshold:3,measure:'effective full-coverage paint bound; not an observed antialias pixel minimum'};
}
