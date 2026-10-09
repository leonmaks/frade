import { inflateSync } from 'node:zlib';
export function decodePng(bytes) {
  let width=0,height=0,channels=0; const blocks=[];
  for(let at=8;at<bytes.length;){const size=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+size);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);channels=data[9]===6?4:data[9]===2?3:0;if(data[8]!==8||data[12]!==0||!channels)throw Error('Unsupported PNG layout');}if(type==='IDAT')blocks.push(data);at+=size+12;}
  const input=inflateSync(Buffer.concat(blocks)),stride=width*channels,out=Buffer.alloc(stride*height);let at=0;
  for(let y=0;y<height;y++){const filter=input[at++];for(let x=0;x<stride;x++){const i=y*stride+x,left=x>=channels?out[i-channels]:0,up=y>0?out[i-stride]:0,diagonal=y>0&&x>=channels?out[i-stride-channels]:0;let predictor=0;if(filter===1)predictor=left;else if(filter===2)predictor=up;else if(filter===3)predictor=Math.floor((left+up)/2);else if(filter===4){const p=left+up-diagonal,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-diagonal);predictor=a<=b&&a<=c?left:b<=c?up:diagonal;}else if(filter!==0)throw Error('Unsupported PNG filter');out[i]=(input[at++]+predictor)&255;}}
  return {width,height,channels,pixels:out};
}
export function contrast(a,b){const luminance=rgb=>rgb.map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;}).reduce((n,x,i)=>n+x*[0.2126,0.7152,0.0722][i],0);const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
export function measure({asset,screen,x,y,enabled,reasons=[]}) {
  const blocked=[...reasons];if(typeof enabled!=='boolean')blocked.push('UNKNOWN_ENABLED_STATE');if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+asset.width>screen.width||y+asset.height>screen.height)blocked.push('UNPROVEN_PLACEMENT_OR_CLIPPING');
  if(blocked.length)return {status:'NOT_MEASURED',reasons:blocked};
  const core=[],backdrop=[];const alpha=(xx,yy)=>asset.rgba[(yy*asset.width+xx)*4+3];
  const rgb=(xx,yy)=>{const i=((y+yy)*screen.width+x+xx)*screen.channels;if(screen.channels===4&&screen.pixels[i+3]!==255)throw Error('Nonopaque screenshot');return [...screen.pixels.subarray(i,i+3)];};
  for(let yy=1;yy<asset.height-1;yy++)for(let xx=1;xx<asset.width-1;xx++){const a=[alpha(xx,yy),alpha(xx-1,yy),alpha(xx+1,yy),alpha(xx,yy-1),alpha(xx,yy+1)];if(a.every(v=>v===255))core.push({x:xx,y:yy,rgb:rgb(xx,yy)});if(a.every(v=>v===0))backdrop.push({x:xx,y:yy,rgb:rgb(xx,yy)});}
  if(!core.length||!backdrop.length)return {status:'NOT_MEASURED',reasons:['ZERO_CORE_OR_BACKDROP'],core,backdrop};const back=backdrop[0].rgb;if(backdrop.some(p=>p.rgb.some((v,i)=>v!==back[i])))return {status:'NOT_MEASURED',reasons:['NONUNIFORM_BACKDROP'],core,backdrop};
  const pixels=core.map(p=>({...p,contrast:contrast(p.rgb,back)})),min=Math.min(...pixels.map(p=>p.contrast));return {status:!enabled?'EXCLUDED_PROVEN_DISABLED':min>=3?'PASS':'FAIL',enabled,min,max:Math.max(...pixels.map(p=>p.contrast)),core:pixels,backdrop,threshold:3};
}
