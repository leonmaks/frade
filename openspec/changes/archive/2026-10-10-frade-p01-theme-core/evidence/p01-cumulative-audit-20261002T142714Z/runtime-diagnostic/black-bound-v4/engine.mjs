import {createHash} from 'node:crypto';
import {interpret,decodePng} from '../compositor-v3/engine.mjs';
import {contrast} from '../measurement.mjs';
import {dataUriBytes} from '../data-uri.mjs';
export {decodePng};
const sha=b=>createHash('sha256').update(b).digest('hex');
// Deliberately closed XML subset. Unknown SVG/XML is unmeasured, never guessed.
export function staticBlackSvg(bytes){
 const s=Buffer.from(bytes).toString('utf8');if(!Buffer.from(s).equals(Buffer.from(bytes))||/[&!?]/.test(s))return false;
 const tags=s.match(/<[^>]+>/g);if(!tags||s.replace(/<[^>]+>/g,'').trim())return false;const stack=[];let roots=0;
 for(const raw of tags){const close=raw.match(/^<\/(svg)>$/);if(close){if(stack.pop()!==close[1])return false;continue;}
 const m=raw.match(/^<(svg|path|rect)(\s[^<>]*?)?\s*(\/?)>$/);if(!m)return false;const tag=m[1],attrs=m[2]||'',self=m[3]==='/';if(tag==='svg'){if(stack.length||++roots!==1||self)return false;}else if(stack.join('/')!=='svg'||!self)return false;
 const map=new Map();let rest=attrs;while(rest.trim()){const a=rest.match(/^\s+([A-Za-z][A-Za-z0-9-]*)="([^"<>]*)"/);if(!a||map.has(a[1]))return false;map.set(a[1],a[2]);rest=rest.slice(a[0].length);}
 const allowed=tag==='svg'?['xmlns','width','height','viewBox','fill']:tag==='path'?['d','fill']:['x','y','width','height','rx','ry','fill'];for(const [k,v] of map){if(!allowed.includes(k))return false;if(k==='xmlns'){if(v!=='http://www.w3.org/2000/svg')return false;}else if(k==='fill'){if(!['black','#000','#000000','none'].includes(v))return false;}else if(k==='d'){if(!/^[MmZzLlHhVvCcSsQqTtAa0-9.,+\-\s]+$/.test(v))return false;}else if(!/^[0-9.+\-\s]+(?:px)?$/.test(v))return false;}
 if(tag==='svg'){if(map.get('xmlns')!=='http://www.w3.org/2000/svg')return false;stack.push(tag);}if(tag==='path'&&!map.has('d'))return false;
 }return roots===1&&stack.length===0;
}
const solid=s=>{const m=s?.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);return m?m.slice(1).map(Number):null;};
export function proveBlackBound(record,frame,screen,meta,claimedOrigin){
 const fail=reasons=>({status:'NOT_MEASURED',reasons:[...new Set(reasons)]});const reasons=[];if(meta?.dpr!==1||meta?.fonts!=='loaded')reasons.push('UNPROVEN_DPR_OR_FONTS');if(record.connected!==true||!record.visible)reasons.push('NOT_CONNECTED_VISIBLE');if(typeof record.capability?.enabled!=='boolean')reasons.push('UNKNOWN_CAPABILITY');const r=record.resource;
 if(!r?.bytes||!r.rgba||r.width!==24||r.height!==24||r.rgba.length!==24*24*4||!r.paintRgba||r.paintWidth!==18||r.paintHeight!==18||r.paintRgba.length!==18*18*4)return fail([...reasons,'MISSING_RESOURCE']);
 const raw=Buffer.from(r.bytes);let actual;try{actual=Buffer.from(dataUriBytes(r.url));}catch{return fail([...reasons,'UNSUPPORTED_RESOURCE_URL']);}if(!raw.equals(actual))reasons.push('RESOURCE_URI_BYTES_MISMATCH');if(record.style.backgroundImage!=='url("'+r.url+'")')reasons.push('RESOURCE_STYLE_URL_MISMATCH');if(!staticBlackSvg(raw))reasons.push('UNSUPPORTED_STATIC_SOURCE');
 const natural=[],paint=[];let opaque=0;for(let i=0;i<r.rgba.length;i+=4)if(r.rgba[i+3]){natural.push({x:(i/4)%24,y:Math.floor(i/4/24),rgba:r.rgba.slice(i,i+4)});if(r.rgba[i]||r.rgba[i+1]||r.rgba[i+2])reasons.push('NONBLACK_INTRINSIC_SOURCE');if(r.rgba[i+3]===255)opaque++;}for(let i=0;i<r.paintRgba.length;i+=4)if(r.paintRgba[i+3]){paint.push({x:(i/4)%18,y:Math.floor(i/4/18),rgba:r.paintRgba.slice(i,i+4)});if(r.paintRgba[i]||r.paintRgba[i+1]||r.paintRgba[i+2])reasons.push('NONBLACK_PAINT_SOURCE');}if(!opaque)reasons.push('NO_INTRINSIC_OPAQUE_SAMPLE');if(!paint.length)reasons.push('EMPTY_PAINT_SUPPORT');if(reasons.length)return fail(reasons);
 const old=interpret(record,frame,screen,claimedOrigin);if(old.reasons?.some(s=>s!=='ZERO_CORE_OR_BACKDROP'))return fail(['V3_PRECONDITION_REJECTED',...old.reasons]);if(!old.backdrop?.length||!old.placement||!old.expectedBackplate||old.backplateAncestor<1)return fail(['UNPROVEN_BACKDROP']);
 const b=solid(record.style.backgroundColor),ancestor=solid(record.chain[old.backplateAncestor]?.style.backgroundColor);if(!b||!ancestor||b.some((n,i)=>n!==ancestor[i]||n!==old.expectedBackplate[i])||old.backdrop.some(p=>p.rgb.some((n,i)=>n!==b[i])))return fail(['NONIDENTICAL_OPAQUE_TARGET_AND_BACKPLATE']);
 const support=[];for(const p of paint){const x=old.placement.x+p.x,y=old.placement.y+p.y,i=(y*screen.width+x)*screen.channels;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=screen.width||y>=screen.height)return fail(['INVALID_MAPPED_SUPPORT']);const rgb=[...screen.pixels.subarray(i,i+3)];if(rgb.length!==3||(screen.channels===4&&screen.pixels[i+3]!==255)||rgb.some((n,j)=>n<0||n>b[j]))return fail(['SCREENSHOT_OUTSIDE_PROVED_RANGE']);support.push({...p,screenX:x,screenY:y,rgb});}
 const upperBound=contrast([0,0,0],b);return {status:record.capability.enabled===false?'EXCLUDED_PROVEN_DISABLED':upperBound<3?'FAIL_CONTRAST_UPPER_BOUND':'NOT_MEASURED',reason:upperBound>=3?'UPPER_BOUND_CANNOT_PROVE_VIOLATION':undefined,proof:'All supported channels in [0,b]; monotone relative luminance; not a measured minimum or nominal AA foreground',upperBound,threshold:3,enabled:record.capability.enabled,backplate:b,placement:old.placement,oldCoreCount:old.core?.length||0,naturalOpaqueSamples:opaque,naturalSupport:natural,paintSupport:support,backdrop:old.backdrop,sourceSha256:sha(raw),naturalRgbaSha256:sha(Buffer.from(r.rgba)),paintRgbaSha256:sha(Buffer.from(r.paintRgba))};
}

