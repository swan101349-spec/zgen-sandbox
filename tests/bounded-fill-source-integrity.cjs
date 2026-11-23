'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
function source(path){
  const html=fs.readFileSync(path,'utf8');
  const match=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
  assert.ok(match, path+': painter source bundle present');
  return Buffer.from(match[1],'base64').toString('latin1');
}
const crypto=require('node:crypto');
const original=fs.readFileSync('original-engine.html');
const originalGitBlob=crypto.createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex');
assert.equal(originalGitBlob,'6442ad3869b3692878c4f49f0dce92f4ff001948','original artist painter file must match prior main Git blob');
const untouched=source('original-engine.html');
const adapted=source('shell-v2.html');
const start=adapted.indexOf('window.__ZGEN_FILL_BRIDGE=');
const end=adapted.indexOf('window.__ZGEN_BETA_26=',start);
assert.ok(start>0&&end>start,'one narrow fill bridge before original painter public hook');
const bridge=adapted.slice(start,end);
assert.ok(bridge.includes('x("fill")'),'fill registration calls native history');
assert.ok(bridge.includes('i.putImageData(patch,x0,y0)'),'fill writes to native 2D paint layer');
assert.equal(adapted.slice(0,start)+adapted.slice(end),untouched,
  'all 114,233 original packed painter bytes must match exactly after removing bridge');
assert.equal(untouched.length,114233,'original painting source reference length');
assert.ok(fs.readFileSync('shell-v2.html','utf8').includes('src="./bounded-fill.js"'));
console.log('PASS: original 114,233 painter bytes exactly preserved; only a '+bridge.length+'-byte additive Undo-aware bridge; new fill adapter is external.');
