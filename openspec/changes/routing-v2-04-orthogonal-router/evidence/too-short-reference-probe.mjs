import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const vendor = 'apps/desktop/vendor/drawio/mxgraph/src/view/mxEdgeStyle.js';
const bytes = fs.readFileSync(vendor);
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, '8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d');
class Point { constructor(x,y) { this.x=x; this.y=y; } clone() { return new Point(this.x,this.y); } }
class Cell { constructor(x,y,width,height) { Object.assign(this,{x,y,width,height,style:{portConstraint:'north'}}); } clone() { return new Cell(this.x,this.y,this.width,this.height); } setRect(x,y,width,height) { Object.assign(this,{x,y,width,height}); } }
let portConstraintReads = 0;
const context = vm.createContext({
 mxPoint: Point,
 mxConstants: {
  STYLE_SOURCE_JETTY_SIZE:'sourceJettySize', STYLE_TARGET_JETTY_SIZE:'targetJettySize',
  STYLE_JETTY_SIZE:'jettySize', STYLE_STARTARROW:'startArrow', STYLE_ENDARROW:'endArrow',
  STYLE_STARTSIZE:'startSize', STYLE_ENDSIZE:'endSize', DEFAULT_MARKERSIZE:6, NONE:'none',
  DIRECTION_MASK_ALL:15, DIRECTION_MASK_NORTH:2
 },
 mxUtils: {
  getValue:(style,key,fallback)=>style[key] == null ? fallback : style[key],
  getNumber:(style,key,fallback)=>style[key] == null ? fallback : Number(style[key]),
  getPortConstraints:()=>{ portConstraintReads++; return 2; }
 }
});
vm.runInContext(bytes.toString('utf8'), context, {filename:vendor});
const source=new Cell(0,0,10,10), target=new Cell(15,0,10,10);
const p0=new Point(5,0), pe=new Point(20,0);
const state={absolutePoints:[p0,pe],style:{jettySize:10},view:{scale:1,graph:{}}};
let segmentFallbackCalls=0;
const original=context.mxEdgeStyle.SegmentConnector;
context.mxEdgeStyle.SegmentConnector=function(...args) { segmentFallbackCalls++; return original.apply(this,args); };
const intermediates=[];
context.mxEdgeStyle.OrthConnector(state,source,target,null,intermediates);
assert.equal(segmentFallbackCalls,1);
assert.equal(portConstraintReads,0);
assert.equal(intermediates.length,0);
const route=[p0,...intermediates,pe].map(p=>({x:p.x,y:p.y}));
assert.deepEqual(route,[{x:5,y:0},{x:20,y:0}]);
console.log(JSON.stringify({
 vendor,sha256,
 source:{x:0,y:0,width:10,height:10,allowedDirections:['north'],fixedPoint:route[0]},
 target:{x:15,y:0,width:10,height:10,allowedDirections:['north'],fixedPoint:route[1]},
 sourceJetty:10,targetJetty:10,distance:15,totalJetty:20,
 segmentFallbackCalls,portConstraintReads,route,
 actualSourceOutward:'east',actualTargetOutward:'west',
 requiredSourceOutward:'north',requiredTargetOutward:'north',
 finding:'SPEC_CONFLICT: exact no-hint draw.io too-short fallback violates required direction constraints'
},null,2));
