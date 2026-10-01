import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
const require=createRequire(path.resolve("apps/desktop/package.json"));
const {chromium}=require("@playwright/test");
const mode=process.argv.at(-1);
const input=" _input/frade-ui-style-guide-v1";
const source=fs.readFileSync(path.join(input,"tokens.css"),"utf8");
const data=JSON.parse(fs.readFileSync(path.join(input,"tokens.json"),"utf8"));
const before=":root:not([data-frade-theme]), [data-frade-theme=\"system\"]";
const after=":root:where(:not([data-frade-theme])), [data-frade-theme=\"system\"]";
if(source.split(before).length!==2) throw new Error("Expected exactly one source selector");
const css=mode==="candidate"?source.replace(before,after):source;
const forced=Object.fromEntries(Object.keys(data.themes.light).map(k=>[k,k.startsWith("surface.")||k.endsWith("Bg")||["diagram.canvas","diagram.nodeBg"].includes(k)?"Canvas":"CanvasText"]));
Object.assign(forced,{"action.primary":"Highlight","action.primaryHover":"Highlight","action.onPrimary":"HighlightText","selection.bg":"Highlight","selection.fg":"HighlightText","selection.indicator":"Highlight","focus.ring":"Highlight","diagram.selection":"Highlight"});
const hashes=()=>Object.fromEntries(["tokens.css","tokens.json","generate-tokens.py","check-tokens.py"].map(f=>[f,createHash("sha256").update(fs.readFileSync(path.join(input,f))).digest("hex")]));
const originalHashes=hashes();
const report={kind:"read-only PRE-01 reproduction and in-memory candidate evaluation",mode,utc:new Date().toISOString(),selectorChange:{before,after},inputHashes:originalHashes,results:[],roleAssertions:0};
let browser;
try {
 browser=await chromium.launch({headless:true});
 report.browserVersion=browser.version();
 const page=await browser.newPage();
 const states=mode==="source-red"?[{scheme:"dark",forced:true,theme:null}]:
  ["light","dark"].flatMap(scheme=>[false,true].flatMap(fc=>[null,"system","light","dark","high-contrast"].map(theme=>({scheme,forced:fc,theme}))));
 for(const state of states){
  await page.emulateMedia({colorScheme:state.scheme,forcedColors:state.forced?"active":"none"});
  await page.setContent("<!doctype html><html><head></head><body><div id=\"inherit\"></div></body></html>");
  await page.addStyleTag({content:css});
  const actual=await page.evaluate(({theme,roles})=>{
   if(theme!==null)document.documentElement.setAttribute("data-frade-theme",theme);
   const read=el=>Object.fromEntries(roles.map(k=>[k,getComputedStyle(el).getPropertyValue("--frade-"+k.replaceAll(".","-").replaceAll("_","-")).trim()]));
   return {root:read(document.documentElement),inherited:read(document.querySelector("#inherit")),dark:matchMedia("(prefers-color-scheme: dark)").matches,forced:matchMedia("(forced-colors: active)").matches};
  },{theme:state.theme,roles:Object.keys(data.themes.light)});
  const palette=state.theme===null||state.theme==="system"?state.scheme:state.theme;
  const expected=state.forced?forced:data.themes[palette];
  const mismatches=[];
  for(const [role,wanted] of Object.entries(expected)){
   for(const target of ["root","inherited"]){
    report.roleAssertions++;
    if(actual[target][role]!==wanted)mismatches.push({target,role,actual:actual[target][role],expected:wanted});
   }
  }
  report.results.push({state,media:{dark:actual.dark,forced:actual.forced},mismatches});
 }
 if(JSON.stringify(originalHashes)!==JSON.stringify(hashes()))throw new Error("Input changed");
 report.inputUnchanged=true;
 report.mismatches=report.results.reduce((n,r)=>n+r.mismatches.length,0);
 report.status=report.mismatches?"FAIL":"PASS";
 console.log(JSON.stringify(report));
 if(report.mismatches)process.exitCode=1;
} catch(error){
 report.status="ENVIRONMENT_OR_PROBE_ERROR";report.error=String(error);console.log(JSON.stringify(report));process.exitCode=2;
} finally{if(browser)await browser.close();}
