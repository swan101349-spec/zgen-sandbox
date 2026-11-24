/* Source integrity: only two native history functions may change in packed painter.
 * Every other original watercolor, graphite, import and project byte is frozen.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const originalCommit='4fc2b41bbce64f874b9f061dea122c5afb251030';
const file='studio-recovery-20261124/index.html';
const oldHTML=execFileSync('git',['show',originalCommit+':'+file],{encoding:'utf8'});
const newHTML=fs.readFileSync(file,'utf8');
function raw(html){
  const match=html.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
  assert(match,'Original native painting bundle must be present');
  return {encoded:match[1],decoded:Buffer.from(match[1],'base64').toString('utf8')};
}
const old=raw(oldHTML),now=raw(newHTML);
const fromX='function x(e=`dry`){l.length>=7&&l.shift(),l.push({...b(),kind:e}),u.length=0,y()}';
const fromC='function C(e){if(!e.length)return;let t=e===l?u:l,n=e.pop();t.length>=7&&t.shift(),t.push({...b(),kind:n.kind}),S(n),v((e===l?`Undone `:`Redone `)+n.kind+`.`)}';
const toX='function __zgenHistoryBytes(e){let n=e.paint.data.byteLength+e.reference.data.byteLength,t=e.wet?.whole?.layers;if(t)for(let s of Object.values(t))n+=s?.byteLength||0;return n}function __zgenTrimHistory(e){let n=0;for(let t of e)n+=__zgenHistoryBytes(t);while(e.length>1&&(e.length>12||n>100663296))n-=__zgenHistoryBytes(e.shift())}function x(e=`dry`){l.push({...b(),kind:e}),__zgenTrimHistory(l),u.length=0,y()}';
const toC='function C(e){if(!e.length)return;let t=e===l?u:l,n=e.pop();t.push({...b(),kind:n.kind}),__zgenTrimHistory(t),S(n),v((e===l?`Undone `:`Redone `)+n.kind+`.`)}';
assert.equal(old.decoded.split(fromX).length,2,'One original snapshot function');
assert.equal(old.decoded.split(fromC).length,2,'One original Undo/Redo function');
assert.equal(now.decoded,old.decoded.replace(fromX,toX).replace(fromC,toC),
  'Only two known and audited native history replacements are allowed');
assert.equal(newHTML,oldHTML.replace(old.encoded,now.encoded),
  'Original HTML, layout, gallery, original painting module wrapper and scripts untouched');
assert.ok(!/localStorage\.clear|indexedDB\.deleteDatabase/.test(toX+toC),
  'No user artwork/storage destruction');
console.log('ZGEN_BOUNDED_HISTORY_SOURCE_PASS '+JSON.stringify({
  sourceBase:originalCommit,onlyNativeHistoryChanged:true,
  steps:12,budgetMiB:96,originalPaperUnchanged:true,
  originalGraphiteWatercolorAssetsUnchanged:true
}));
