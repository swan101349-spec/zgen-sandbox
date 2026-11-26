/* ZGEN original JOB-K/C1 | exact two added wet-history changes over
 * validated PR49 tilt repair. No other engine or painter mutation allowed.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process');
const base='946b742e38283e29db08d2d5d298ef11b524aa46';
const name='studio-recovery-20261124/index.html';
const original=cp.execFileSync('git',['show',base+':'+name],{encoding:'utf8'});
const changed=fs.readFileSync(name,'utf8');
function parse(html){
 const m=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
 assert.ok(m);
 assert.equal((html.match(/atob\('[A-Za-z0-9+/=]+'\)/g)||[]).length,1);
 assert.equal(html.split(m[1]).length,2);
 return {payload:m[1],js:Buffer.from(m[1],'base64').toString('latin1')};
}
const old=parse(original),now=parse(changed);
const patch=[
 [
 'this.autoDryArmed&&this.phase===`FLOW`&&performance.now()>=this.due&&this.fix()',
 'this.autoDryArmed&&this.phase===`FLOW`&&performance.now()>=this.due&&this.fix(!0)'
 ],
 [
 'fix(){if(this.paused)throw Error(`C4_STOP_ACTIVE`);this.phase===`SETTLE`||this.phase===`FIX`||this.active||(this.beforeFix(),this.autoDryArmed=!1,this.phase=`SETTLE`,this.engine.fix())}',
 'fix(e=!1){if(this.paused)throw Error(`C4_STOP_ACTIVE`);this.phase===`SETTLE`||this.phase===`FIX`||this.active||(e||this.beforeFix(),this.autoDryArmed=!1,this.phase=`SETTLE`,this.engine.fix())}'
 ]
];
let expected=old.js;
for(const [before,after] of patch){
 assert.equal(expected.split(before).length,2,'Expected one original native C4 history marker');
 expected=expected.replace(before,after);
}
assert.equal(now.js,expected,'Unexpected packed painter code changed outside two JOB-K edits');
assert.equal(changed.replace(now.payload,old.payload),original,
 'Painter HTML wrapper changed outside one packed script');
assert.equal(Buffer.from(now.js,'latin1').toString('base64'),now.payload,
 'Packed JS not byte identical');
console.log('ZGEN_JOB_K_AUTOFIX_SINGLE_UNDO_EXACT_TWO_EDITS_PASS',JSON.stringify({
 inheritedTiltRepairSHA:base,additionalEdits:patch.length,
 oldBytes:old.js.length,newBytes:now.js.length,
 automaticFixNoExtraHistory:true,explicitDryCheckpointPreserved:true,
 nonHistoryPainterCodeByteIdentical:true,physicalSPenPending:true,
 releaseHeld:true
}));
