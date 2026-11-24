/* One-expression integrity audit of protected packed painter. */
'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {execFileSync}=require('node:child_process');
const base='9c03b04890715d03503ff2457eef8e77fb31ca2f';
const path='studio-recovery-20261124/index.html';
const before=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
const after=readFileSync(path,'utf8');
const packed=html=>{
  const result=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
  assert(result,'Native bundled script exists');return result[1];
};
const original=packed(before),revised=packed(after);
const oldRaw=Buffer.from(original,'base64').toString('utf8');
const newRaw=Buffer.from(revised,'base64').toString('utf8');
const target='i.fillStyle=a===`ink`?`#151b1f`:`#44484f`';
const replacement='i.fillStyle=a===`ink`?`#151b1f`:c.color';
assert.equal(oldRaw.split(target).length,2,'Exactly one original graphite fillStyle');
assert.equal(newRaw,oldRaw.replace(target,replacement),
 'Protected painting source must change by exactly one graphite color expression');
assert.equal(after,before.replace(original,revised),
 'No surrounding HTML, reference, history, CSS or JS edits permitted');
console.log('ZGEN_PROTECTED_GRAPHITE_ONLY_PASS '+JSON.stringify({
 originalBytes:Buffer.byteLength(oldRaw),newBytes:Buffer.byteLength(newRaw),
 graphiteOnlyColorChange:true,otherBundleAndHTMLUnchanged:true
}));
