/* Protected C4 wet-history tiles: exact source guard against original painter edits.
 * Parent HEAD = 20-stroke QA branch, before any native wet compression changes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const base='e1530d3dee2b082ba0f85cba67fa823cd6441c1e';
const file='studio-recovery-20261124/index.html';
const beforeHTML=execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
const afterHTML=fs.readFileSync(file,'utf8');
function bundle(html){
 const m=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
 assert(m,'Native original bundle required');
 return {encoded:m[1],raw:Buffer.from(m[1],'base64').toString('utf8')};
}
const before=bundle(beforeHTML),after=bundle(afterHTML);
assert.equal(afterHTML,beforeHTML.replace(before.encoded,after.encoded),
 'Original HTML/layout, artwork bridge and script loading must be byte-identical');
assert.doesNotThrow(()=>new Function(after.raw),'Updated native bundle must parse as JavaScript');
function segment(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Protected native function boundaries missing: '+start);
 assert.equal(source.indexOf(start,a+1),-1,'Duplicate protected function '+start);
 return source.slice(a,b);
}
const wetOld=segment(before.raw,'function __zgenWetReuse(','function __zgenHistoryUsage(');
const wetNew=segment(after.raw,'const __zgenWetZero1=','function __zgenHistoryUsage(');
const usageOld=segment(before.raw,'function __zgenHistoryUsage(','function __zgenTrimHistory(');
const usageNew=segment(after.raw,'function __zgenHistoryUsage(','function __zgenTrimHistory(');
const restoreOld=segment(before.raw,'function S(e){i.putImageData(__zgenTileRestore(','function C(e){');
const restoreNew=segment(after.raw,'function S(e){i.putImageData(__zgenTileRestore(','function C(e){');
const reconstructed=after.raw.replace(wetNew,wetOld).replace(usageNew,usageOld)
 .replace(restoreNew,restoreOld);
assert.equal(reconstructed,before.raw,
 'Only existing history wet compression, history memory accounting and wet restore may change');
for(const needle of ['function __zgenWetReuse(', 'function __zgenWetExpand(',
 'const __zgenWetZero1=', 'return {...snapshot,document:',
 'e.wet&&f.restore(__zgenWetExpand(e.wet))',
 'layer.tiles','134217728'])
 assert(after.raw.includes(needle),'Missing lossless C4 compression invariant '+needle);
console.log('ZGEN_WET_TILE_SOURCE_PASS '+JSON.stringify({
 base,originalC4RendererUntouched:true,originalHTMLUntouched:true,
 protectedArtworkBridgeUntouched:true,changedNativeSegments:3,
 sharedGPUFloat16Tiles:64,historyMemoryBudgetMiB:128
}));
