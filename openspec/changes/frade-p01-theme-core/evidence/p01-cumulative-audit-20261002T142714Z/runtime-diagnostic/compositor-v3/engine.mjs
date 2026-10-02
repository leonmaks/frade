import {measure,decodePng} from '../measurement.mjs';export {decodePng};
const cssRgb=s=>{const a=s?.match(/[0-9.]+/g)?.map(Number);if(!a||a.length<3)return null;return {rgb:a.slice(0,3),alpha:a.length===4?a[3]:1};};
export function interpret(record,frame,screen,claimedOrigin){
  const reasons=[],s=record.style,r=record.rect,resource=record.resource;
  if(!record.visible)reasons.push('HIDDEN');if(typeof record.capability.enabled!=='boolean')reasons.push('UNKNOWN_CAPABILITY');
  if(!resource?.paintRgba||resource.paintWidth!==18||resource.paintHeight!==18)reasons.push('MISSING_PAINT_SPACE_MASK');
  if(s.backgroundSize!=='18px auto'||s.backgroundPosition!=='50% 50%'||s.backgroundRepeat!=='no-repeat'||s.backgroundOrigin!=='padding-box'||!['border-box','padding-box'].includes(s.backgroundClip))reasons.push('UNSUPPORTED_PLACEMENT_STYLE');
  for(const c of record.chain){const v=c.style;if(v.filter!=='none'||v.transform!=='none'||v.maskImage!=='none'||v.backdropFilter!=='none'||v.mixBlendMode!=='normal'||v.boxShadow!=='none')reasons.push('UNSUPPORTED_COMPOSITION');}
  if(record.chain.slice(1).some(c=>c.style.opacity!=='1')||!['1','0.65'].includes(s.opacity))reasons.push('UNSUPPORTED_OPACITY_CHAIN');
  if(record.descendants?.length)reasons.push('DESCENDANT_PAINT_NOT_MEASURED');
  for(const p of Object.values(record.pseudos||{}))if(!['none','normal',undefined].includes(p.content))reasons.push('PSEUDO_PAINT_NOT_MEASURED');
  const border=s.border?.map(parseFloat),x=frame.x+r.x+(border?.[3]||0)+(r.width-(border?.[3]||0)-(border?.[1]||0)-18)/2,y=frame.y+r.y+(border?.[0]||0)+(r.height-(border?.[0]||0)-(border?.[2]||0)-18)/2;
  if(!Number.isInteger(x)||!Number.isInteger(y))reasons.push('FRACTIONAL_ORIGIN');if(claimedOrigin&&(claimedOrigin.x!==x||claimedOrigin.y!==y))reasons.push('CLAIMED_ORIGIN_MISMATCH');
  if(x<frame.x||y<frame.y||x+18>frame.x+frame.width||y+18>frame.y+frame.height||x<frame.x+r.x||y<frame.y+r.y||x+18>frame.x+r.x+r.width||y+18>frame.y+r.y+r.height)reasons.push('CLIPPED');
  let base=null,ancestor=-1;for(let i=1;i<record.chain.length;i++){const c=record.chain[i],b=cssRgb(c.style.backgroundColor);if(c.style.backgroundImage!=='none')reasons.push('ANCESTOR_IMAGE_BACKGROUND');if(b?.alpha===1&&c.style.opacity==='1'){base=b.rgb;ancestor=i;break;}}
  if(!base)reasons.push('UNPROVEN_OPAQUE_BACKPLATE');let composed=base;if(base){for(let i=ancestor-1;i>=0;i--){const v=record.chain[i].style,b=cssRgb(v.backgroundColor);if(!b){reasons.push('UNKNOWN_BACKGROUND_COLOR');break;}const alpha=b.alpha,opacity=Number(v.opacity),prior=composed;const painted=prior.map((n,j)=>b.rgb[j]*alpha+n*(1-alpha));composed=painted.map((n,j)=>n*opacity+prior[j]*(1-opacity));}}
  const result=resource?.paintRgba?measure({asset:{width:18,height:18,rgba:Buffer.from(resource.paintRgba)},screen,x,y,enabled:record.capability.enabled,reasons:[...new Set(reasons)]}):{status:'NOT_MEASURED',reasons:[...new Set(reasons)]};
  if(result.backdrop?.length&&composed){const expected=composed.map(Math.round);if(result.backdrop.some(p=>p.rgb.some((n,j)=>n!==expected[j])))return {status:'NOT_MEASURED',reasons:['BACKDROP_COMPOSITION_MISMATCH'],original:result,placement:{x,y},expectedBackplate:expected};}
  return {...result,placement:{x,y},expectedBackplate:composed?.map(Math.round),backplateAncestor:ancestor};
}
