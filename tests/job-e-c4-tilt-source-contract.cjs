/* JOB-E/C4 | exact packed painter eight-substitution source integrity contract.
 * No eval, no external dependencies, no public Pages, no deployment.
 */
'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const base='aa28f789a003ff4043932dfcf9a0262c1039f228';
const path='studio-recovery-20261124/index.html';
const original=cp.execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
const actual=fs.readFileSync(path,'utf8');
function packed(html){
 const m=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
 assert.ok(m,'Original unique packed source missing');
 assert.equal((html.match(/atob\('[A-Za-z0-9+/=]+'\)/g)||[]).length,1);
 assert.equal(html.split(m[1]).length,2,'Expected exactly one literal packed payload');
 return {b64:m[1],src:Buffer.from(m[1],'base64').toString('latin1')};
}
const start=packed(original),finish=packed(actual);
const replacements=[
 ['scriptBegin(e,t,n,r,i=`Stroke`,a){',
  'scriptBegin(e,t,n,r,i=`Stroke`,a,tx=0,ty=0){'],
 ['this.queue.push({x:t,y:n,p:X(r,.02,1),t:performance.now(),tx:0,ty:0})',
  'this.queue.push({x:t,y:n,p:X(r,.02,1),t:performance.now(),tx:tx,ty:ty})'],
 ['scriptMove(e,t,n,r){',
  'scriptMove(e,t,n,r,tx=0,ty=0){'],
 ['this.queue.push({x:e,y:t,p:X(n,.02,1),t:r,tx:0,ty:0})',
  'this.queue.push({x:e,y:t,p:X(n,.02,1),t:r,tx:tx,ty:ty})'],
 ['this.engine.scriptBegin(`brush`,e.x/720,1-e.y/1280,e.pressure,!1)',
  'this.engine.scriptBegin(`brush`,e.x/720,1-e.y/1280,e.pressure,!1,void 0,e.tiltX||0,e.tiltY||0)'],
 ['this.engine.scriptMove(e.x/720,1-e.y/1280,e.pressure,performance.now())',
  'this.engine.scriptMove(e.x/720,1-e.y/1280,e.pressure,performance.now(),e.tiltX||0,e.tiltY||0)'],
 ['f.begin({...t,pressure:e.pressure||.6})',
  'f.begin({...t,pressure:e.pressure||.6,tiltX:e.tiltX||0,tiltY:e.tiltY||0})'],
 ['f.move({...t,pressure:e.pressure||.6})',
  'f.move({...t,pressure:e.pressure||.6,tiltX:e.tiltX||0,tiltY:e.tiltY||0})']
];
let expected=start.src;
for(const [before,after]of replacements){
 assert.equal(expected.split(before).length,2,'Original anchor missing or duplicated: '+before);
 expected=expected.replace(before,after);
}
assert.equal(finish.src,expected,'Packed native painter changed beyond 8 precise tilt substitutions');
assert.equal(actual.replace(finish.b64,start.b64),original,
 'HTML wrapper changed outside packed native source');
assert.equal(Buffer.from(finish.src,'latin1').toString('base64'),finish.b64,
 'Packed source encoding not byte-exact');
console.log('ZGEN_JOB_E_TILT_REPAIR_EXACT_EIGHT_SOURCE_EDITS_PASS',JSON.stringify({
 base,packedEdits:replacements.length,
 originalPainterBytes:start.src.length,amendedPainterBytes:finish.src.length,
 rawHTMLUnchangedOutsidePackedScript:true,
 noOtherProductCodeChanged:true,
 ownerSPenPending:true,releaseHeld:true
}));
