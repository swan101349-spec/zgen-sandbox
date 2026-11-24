/* Exact byte-diff guard: new history only, no shader / painter / saved-art changes. */
'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const base='e7ea29c7aa850db3cc8b7cbc50495bf21bb8feb6';
const file='studio-recovery-20261124/index.html';
const oldHTML=execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
const newHTML=fs.readFileSync(file,'utf8');
function packed(html){
  let m=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
  assert(m,'Native packed painting source must exist');
  return {base64:m[1],js:Buffer.from(m[1],'base64').toString('utf8')};
}
const before=packed(oldHTML),after=packed(newHTML);
assert.equal(newHTML,oldHTML.replace(before.base64,after.base64),
  'Original HTML, CSS, script-loader and other modules must remain untouched');
assert.doesNotThrow(()=>new Function(after.js),'Updated painting source must parse as JavaScript');
const originalHistory=/function __zgenHistoryBytes\(e\)[\s\S]*?(?=function w\(e\))/;
const newHistory=/function __zgenTilePack\(c,previous\)[\s\S]*?(?=function w\(e\))/;
const originalSnapshot='function b(){return{paint:i.getImageData(0,0,720,e),reference:a.getImageData(0,0,720,e),wet:f.snapshot()}}';
const newSnapshot='function b(){let previous=l[l.length-1]||u[u.length-1];return{paint:__zgenTilePack(i,previous?.paint),reference:__zgenTilePack(a,previous?.reference),wet:__zgenWetReuse(f.snapshot(),previous?.wet)}}';
const originalAPI='window.__C4History=()=>({undo:l.map(e=>e.kind),redo:u.map(e=>e.kind)});';
const newAPI='window.__C4History=()=>({undo:l.map(e=>e.kind),redo:u.map(e=>e.kind)});window.__C4HistoryMetrics=()=>({undo:l.length,redo:u.length,estimatedBytes:__zgenHistoryUsage(),memoryLimitBytes:134217728,maxSteps:60,tileSize:64});';
assert(originalHistory.test(before.js));assert(newHistory.test(after.js));
assert.equal(before.js.split(originalSnapshot).length,2,'Expected original full-bitmap snapshot');
assert.equal(after.js.split(newSnapshot).length,2,'Exactly one revised tile snapshot');
assert.equal(before.js.split(originalAPI).length,2,'Expected original history API');
assert.equal(after.js.split(newAPI).length,2,'History metrics is additive');
function strip(s,history,snapshot,api){
  return s.replace(history,'[NATIVE-HISTORY]').replace(snapshot,'[SNAPSHOT]')
    .replace(api,'[HISTORY-API]');
}
assert.equal(
  strip(after.js,newHistory,newSnapshot,newAPI),
  strip(before.js,originalHistory,originalSnapshot,originalAPI),
  'Only native history / storage and read-only metrics may change'
);
for(const required of [
  'function __zgenTilePack(', 'function __zgenTileRestore(',
  'function __zgenWetReuse(', 'function __zgenHistoryUsage(',
  'function __zgenTrimHistory(', '134217728','stack.length>60',
  'snapshot.wet?.document?.whole?.layers'
])assert(after.js.includes(required),'Missing memory-safe history invariant: '+required);
for(const bad of ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'location.reload('])
  assert(!after.js.slice(after.js.indexOf('function __zgenTilePack('),
    after.js.indexOf('function w(e){')).includes(bad),'Unsafe history mutation: '+bad);
console.log('ZGEN_TILED_SOURCE_PASS '+JSON.stringify({
  base,originalPainterUntouched:true,onlyHistoryCodeChanged:true,
  tileSize:64,maximumSteps:60,budgetMiB:128,projectSaveBridgeUntouched:true
}));
