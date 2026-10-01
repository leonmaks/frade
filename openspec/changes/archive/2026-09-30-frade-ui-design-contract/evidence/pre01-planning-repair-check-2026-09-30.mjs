import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
const sha=b=>createHash("sha256").update(b).digest("hex");
const ch="openspec/changes/frade-ui-design-contract";
const snapshot=JSON.parse(fs.readFileSync(ch+"/evidence/pre01-planning-before-2026-09-30.json","utf8"));
const oldManifest=JSON.parse(fs.readFileSync(ch+"/evidence/wb001-pre-review-manifest-2026-09-30.json","utf8"));
const edited=new Set(snapshot.before.map(x=>x.path));
let untouched=0;
for(const a of oldManifest.artifacts)if(!edited.has(a.path)){assert.equal(sha(fs.readFileSync(a.path)),a.sha256,a.path);untouched++;}
for(const a of snapshot.before){
 const old=Buffer.from(a.priorBase64,"base64");
 assert.equal(sha(old),a.priorSha256,a.path+" snapshot");
 assert.equal(a.priorSha256,oldManifest.artifacts.find(x=>x.path===a.path).sha256,a.path+" historical binding");
}
const require=createRequire(path.resolve("packages/draw/package.json"));
const {Parser,AstBuilder,GherkinClassicTokenMatcher}=require("@cucumber/gherkin");
const {IdGenerator}=require("@cucumber/messages");
const bdd=fs.readFileSync(ch+"/bdd/ui-contracts.feature","utf8");
const document=new Parser(new AstBuilder(IdGenerator.incrementing()),new GherkinClassicTokenMatcher()).parse(bdd);
const outlines=document.feature.children.flatMap(c=>c.scenario?[c.scenario]:[]).filter(s=>s.tags.some(t=>t.name==="@pre01"));
assert.equal(outlines.length,2);
let examples=0;
for(const s of outlines){
 assert(s.tags.some(t=>t.name==="@foundation"));
 assert.deepEqual(s.examples[0].tableHeader.cells.map(c=>c.value),["scheme","theme"]);
 const actual=s.examples[0].tableBody.map(r=>r.cells.map(c=>c.value).join("/"));
 const expected=["light","dark"].flatMap(scheme=>["absent","system","light","dark","high-contrast"].map(theme=>scheme+"/"+theme));
 assert.deepEqual(actual,expected);
 examples+=actual.length;
}
assert.equal(examples,20);
const oldBdd=Buffer.from(snapshot.before.find(x=>x.path===ch+"/bdd/ui-contracts.feature").priorBase64,"base64").toString("utf8").replaceAll("\r\n","\n");
const removed=bdd.replace(/  @foundation @pre01\n[\s\S]*?(?=  @p01\n  Scenario Outline: Theme switching)/,"");
assert.equal(removed,oldBdd,"Existing BDD remains intact");
const decision=fs.readFileSync(ch+"/decisions/visual-contract.md","utf8");
const block=decision.match(/^> Workbench SHALL[\s\S]*?(?=\n\nAuthority and ownership:)/m)[0];
assert.equal(sha(Buffer.from(block)),"6e96a420d5bcc7e9165d2992f5bca4ec7cbfc37778e4d8acd193d07dab66ca9e");
const css=fs.readFileSync(" _input/frade-ui-style-guide-v1/tokens.css","utf8");
const before=':root:not([data-frade-theme]), [data-frade-theme="system"]';
const after=':root:where(:not([data-frade-theme])), [data-frade-theme="system"]';
assert.equal(css.split(before).length-1,1);
const ctx=JSON.parse(fs.readFileSync(ch+"/execution-context.json","utf8"));
assert.equal(ctx.independentUiPreStatus,"FAIL");
assert.equal(ctx.repeatIndependentUiPreStatus,"NOT_RUN");
assert.equal(ctx.cssAdoptionRevision,1);
assert.equal(ctx.routingImplementationPrerequisite,false);
assert.equal(ctx.routingRepairPrerequisite,false);
assert.equal(ctx.routingPreApprovalPrerequisite,false);
const tasks=fs.readFileSync(ch+"/tasks.md","utf8");
const checked=(tasks.match(/^- \[x\]/gm)||[]).length;
const total=(tasks.match(/^- \[[x ]\]/gm)||[]).length;
assert.equal(checked,3);assert.equal(total,17);
assert(!fs.existsSync("apps/desktop/tests/e2e/ui-contract-token-cascade.spec.ts"),"No production test added before PRE");
console.log(JSON.stringify({status:"PASS",unchangedHistoricalArtifacts:untouched,acceptedPlanningChanges:edited.size,snapshotPayloadsVerified:snapshot.before.length,bddSyntax:"PASS",newFoundationOutlines:outlines.length,newExamples:examples,priorBddScenarios:"UNCHANGED",wb001AcceptedText:"UNCHANGED",sourceCssSha256:sha(Buffer.from(css)),candidateCssSha256:sha(Buffer.from(css.replace(before,after))),candidateSelectorOccurrences:1,tasks:{checked,total},independentPre:"FAIL",repeatPre:"NOT_RUN",productionImplementation:false}));
