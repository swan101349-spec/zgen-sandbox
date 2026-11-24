/* Original gallery integration guard: public repo must NOT gain private art.
 * Original paints, physics, history, CSS, native imported reference and browser
 * persistence are byte-identical to wet-tile parent; only add the 24-gallery
 * script loader and gallery controller, with authentic source sheet asset gate.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const base='f71bfc095b89771b3c46d63fe248f3bab538083f';
const file='studio-recovery-20261124/index.html';
const old=execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
const now=fs.readFileSync(file,'utf8');
const suffix='<script src="./artist-feedback.js"></script></body></html>';
const newSuffix='<script src="./artist-feedback.js"></script><script src="./original-artwork-gallery.js"></script></body></html>';
assert.equal(now,old.replace(suffix,newSuffix),
 'Original Three-Shell HTML, painter engine, native assets and recovery must be byte-identical except the loader');
const gallery=fs.readFileSync('studio-recovery-20261124/original-artwork-gallery.js','utf8');
assert.doesNotThrow(()=>new Function(gallery),'Gallery JS parses');
const names=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n');
const allowed=new Set([
 'studio-recovery-20261124/index.html','studio-recovery-20261124/original-artwork-gallery.js',
 'tests/native-original-gallery24-browser-check.cjs',
 'tests/native-original-gallery24-source-check.cjs',
 '.github/workflows/native-original-gallery24-qa.yml']);
for(const name of names)assert(allowed.has(name),'An unauthorized source/artwork asset changed: '+name);
assert(!names.some(s=>s.includes('ghost-sheets')||s.endsWith('.png')),
 'Private artist sheets MUST NOT be committed in public GitHub repository');
for(const s of ['Ms. Rascal + Rascal Cat','Original Sketchbook','1448','1086',
 'document.querySelector','getElementById','file.dispatchEvent',
 'reference','window.__ZGEN_ORIGINAL24_GATE','PRIVATE_ASSETS_NOT_PRESENT',
 'zshell-bottom-panel'])
  assert(gallery.includes(s),'Lost original-gallery behavior / privacy gate: '+s);
for(const unsafe of ['localStorage.clear','indexedDB.deleteDatabase',
 'document.getElementById(\'paint\').width=','paint.width=720','clearRect(0,0,720,1280)'])
  assert(!gallery.includes(unsafe),'Risky painter mutation detected: '+unsafe);
console.log('ZGEN_ORIGINAL24_SOURCE_PASS '+JSON.stringify({
  baseline:base,originalPainterUnchanged:true,originalC4Unchanged:true,
  originalRecoveryBridgeUnchanged:true,publicOriginalBinaryFiles:0,
  gallerySameShell:true,authenticSheetGate:true
}));
