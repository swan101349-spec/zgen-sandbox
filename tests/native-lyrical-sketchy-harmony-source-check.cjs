/* Original lyrical renderer guard: only Sketchy and Harmony output may differ.
 * In particular, all pointer handling, native Undo/Redo, C4, 24 Rascal
 * cropped originals, and the artwork recovery bridge are unchanged.
 */
'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const base='1f3ae66c6aa6cda1faa1e523e3838c7eec84474a';
const path='studio-recovery-20261124/lyrical-pencil-one.js';
const before=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
const after=fs.readFileSync(path,'utf8');
const beginning="  if(opts.mode==='sketchy'){";
const afterSketchy="  }else if(opts.mode==='shader'){";
const beginningHarmony="  }else if(opts.mode==='harmony'&&stroke?.points.length>5){";
const afterHarmony="  ctx.restore();";
function isolate(s){
  const a=s.indexOf(beginning),b=s.indexOf(afterSketchy,a);
  assert(a>=0&&b>a,'Sketchy rendering boundaries are missing');
  const c=s.indexOf(beginningHarmony,b),d=s.indexOf(afterHarmony,c);
  assert(c>=0&&d>c,'Harmony rendering boundaries are missing');
  return s.slice(0,a)+'[ORIGINAL-SKETCHY-MODE]'+s.slice(b,c)+
     '[ORIGINAL-HARMONY-MODE]'+s.slice(d);
}
assert.equal(isolate(before),isolate(after),
  'Only original Sketchy and Harmony visual marks may be modified');
assert.doesNotThrow(()=>new Function(after),'Native renderer must remain valid JS');
for(const term of ['stroke.points','Math.hypot','now.pressure','ctx.quadraticCurveTo',
    "opts.mode==='sketchy'","opts.mode==='harmony'","function begin(","function move(","function end("]){
  assert(after.includes(term),'Missing original lyrical pressure/curve contract: '+term);
}
const files=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'})
  .trim().split('\n');
const allowed=new Set([
  path,
  'tests/native-lyrical-sketchy-harmony-browser-check.cjs',
  'tests/native-lyrical-sketchy-harmony-source-check.cjs',
  '.github/workflows/native-lyrical-sketchy-harmony-qa.yml'
]);
for(const file of files)assert(allowed.has(file),'Protected artwork/painter touched: '+file);
assert(files.every(f=>!f.endsWith('.png')),'Original Rascal PNGs must not change');
console.log('ZGEN_SKETCHY_HARMONY_SOURCE_PASS '+JSON.stringify({
  protectedParent:base,onlyTwoVariantRenderersChanged:true,
  originalNativePointerAndUndoUntouched:true,
  originalRascal24Untouched:true,
  originalWetEngineUntouched:true,
  savedArtworkBridgeUntouched:true
}));
