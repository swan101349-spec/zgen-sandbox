/* Protected source gate for Lyrical Pencil #1. No replacement app, art or storage.
 * Compare original packed source and allow ONLY native pointer route, native brush
 * name/selection; original C4 engine, Undo/Redo and image persistence are frozen.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const base='75b02267c284f19bd7a7456831e9e7c44f2f9dc8';
const loc='studio-recovery-20261124/';
const original=execFileSync('git',['show',base+':'+loc+'index.html'],{encoding:'utf8'});
const after=fs.readFileSync(loc+'index.html','utf8');
const b64=s=>{
 const match=s.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
 assert(match,'Original single native packed source must exist');
 return match[1];
};
const oldEncoded=b64(original),newEncoded=b64(after);
const a=Buffer.from(oldEncoded,'base64').toString('utf8');
const b=Buffer.from(newEncoded,'base64').toString('utf8');
assert.doesNotThrow(()=>new Function(b),'Native original painter plus pencil must parse');
const loader='<script src="./lyrical-pencil-one.js"></script>';
assert.equal(after,original.replace(oldEncoded,newEncoded)
  .replace('<script src="./original-artwork-gallery.js"></script></body></html>',
    '<script src="./original-artwork-gallery.js"></script>'+loader+'</body></html>'),
 'Original HTML, watercolor canvas, painting startup and art-recovery loader must match');
function masked(source){
 return source
  .replace('graphite:`2B Graphite`,lyrical:`Lyrical Pencil #1`,eraser:',
    'graphite:`2B Graphite`,eraser:')
  .replace(/function te\(e\)\{if\(c\.paused\)[\s\S]*?(?=function N\(\)\{_=``)/,
    '[NATIVE-POINTER-OWNERSHIP]')
  .replace(/function ae\(e\)\{s\[e\][\s\S]*?(?=function oe\(e\))/,
    '[BRUSH-SELECTION]');
}
assert.equal(masked(b),masked(a),
 'Original WebGL2 C4, saved art, history, shader, assets and painter must be byte-identical outside native brush and pointer integration');
const native=b.slice(b.indexOf('function te(e){if(c.paused)'),b.indexOf('function N(){_=``'));
for(const required of [
 'if(c.brush===`lyrical`)', 'x(`lyrical`)', 'engine.begin(pos,e,i,c)',
 'window.__ZGEN_LYRICAL_ONE?.move(t,e,i,c)',
 'window.__ZGEN_LYRICAL_ONE?.end(i)',
 'window.__ZGEN_LYRICAL_ONE?.cancel()',
 'snap=l.pop();snap&&S(snap)',
 'n.addEventListener(`pointerdown`,te)',
 'n.addEventListener(`pointermove`,ne)'
])assert(native.includes(required),'Lyrical native transaction/cancel invariant missing: '+required);
const lyrical=fs.readFileSync(loc+'lyrical-pencil-one.js','utf8');
assert.doesNotThrow(()=>new Function(lyrical),'Recovered JS geometry parses');
for(const bad of ['createElement(\'canvas\')','createElement("canvas")',
 '.addEventListener(\'pointer','.addEventListener("pointer',
 'localStorage.clear','indexedDB.deleteDatabase','getImageData(0,0,720,1280)'])
 assert(!lyrical.includes(bad),'Second painter/unsafe artwork access detected: '+bad);
for(const required of ['function parameters(', 'function render(', 'function begin(',
 'function move(', 'function cancel(', 'tiltX','pressure','flare',
 'harmony','sketchy','shader','getOptions','measure'])
 assert(lyrical.includes(required),'Recovered original kinetic mode missing: '+required);
const baseCss=execFileSync('git',['show',base+':'+loc+'three-shell.css'],{encoding:'utf8'});
const newCss=fs.readFileSync(loc+'three-shell.css','utf8');
assert(newCss.startsWith(baseCss),'Original Three-Shell CSS must be append-only');
const shell=fs.readFileSync(loc+'three-shell.js','utf8');
assert(shell.includes("drawing,'")||shell.includes("left.panel.append(drawing)"));
for(const q of ["dataset.brush='lyrical'","['ink','graphite','lyrical']",
 'select.dataset.lyrical=name',"data-graphite-tone",
 "selectNativeColor(graphiteTone)"])assert(shell.includes(q),'Original compact settings integration missing: '+q);
const names=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n');
const allowed=new Set([
 loc+'index.html',loc+'three-shell.css',loc+'three-shell.js',
 loc+'lyrical-pencil-one.js',
 'tests/native-lyrical1-pressure-flare-browser-check.cjs',
 'tests/native-lyrical1-source-check.cjs',
 '.github/workflows/native-lyrical1-qa.yml'
]);
for(const name of names)assert(allowed.has(name),'Unauthorized original art or painter file changed: '+name);
assert(!names.some(x=>x.endsWith('.png')),'No changes to owner-approved original Rascal files');
console.log('ZGEN_LYRICAL1_SOURCE_PASS '+JSON.stringify({
 originalWebGL2AndC4Protected:true,originalArtBridgeProtected:true,
 original24RascalPNGUnchanged:true,
 originalNativeUndoOwner:true,singleOriginal720x1280Canvas:true,
 newPointerOwners:0,updatedBrushMode:'lyrical'
}));
