#!/usr/bin/env node
/* S0/Lucy READ-ONLY GitHub Actions supervisor for the current P0 five-size beta.
 * This is a deterministic independent CI process, NOT a remote AI agent.
 * Deliberately no network, auth tokens, source mutation, merge or deploy. */
'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const path=require('node:path');
const BASE='b455994ee50c08f54e0bc84de2813ab94a1af3c7';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8',timeout:25000}).trim();
const head=git('rev-parse','HEAD');
const allowed=new Set([
  'three-shell.js','three-shell.css',
  'tests/three-shell-browser-check.cjs','tests/current-phone-root-browser-check.cjs',
  'tests/p0-supervisor-readonly.cjs','.github/workflows/p0-s0-lucy-supervision.yml'
]);
const changed=git('diff','--name-only',BASE,head).split('\n').filter(Boolean);
const forbidden=changed.filter(f=>!allowed.has(f));
assert.deepEqual(forbidden,[], 'LUCY: nonapproved files changed across original green beta baseline');
// Source fingerprint, not a pasted hash; compare unchanged exact contents at the trusted baseline.
const critical=['index.html','shell-v2.html','bounded-fill.js'];
const sourceHashes={};
for(const file of critical){
  const current=fs.readFileSync(file);
  const base=cp.execFileSync('git',['show',BASE+':'+file],{timeout:25000});
  assert.equal(sha(current),sha(base),'LUCY: protected painter or core file modified: '+file);
  sourceHashes[file]=sha(current);
}
const shell=fs.readFileSync('three-shell.js','utf8');
const test=fs.readFileSync('tests/three-shell-browser-check.cjs','utf8');
for(const term of [
  'sizePresets={XS:3,S:10,M:22,L:45,XL:80}',
  'const toolSizes=Object.create(null)',
  'setNativeToolSize(',
  'setPreset(name)',
  'stepSize(direction)',
  'window.__ZGEN_BRUSH_CONTROLS',
  'queueMicrotask(syncSelectedBrush)'
])assert.ok(shell.includes(term),'LUCY: missing intended size-control hook: '+term);
for(const term of [
  "for(const medium of ['ink','round'])",
  'P0_REAL_BRUSH_SIZE',
  'P0_PER_TOOL_SIZE_MEMORY',
  'Indian Ink must start at practical fine XS',
  '#c4-wet'
])assert.ok(test.includes(term),'C3 acceptance test missing: '+term);
assert.ok(shell.includes("if(!fillActive)adjustPanel.append(presets,advanced)"),
  'C5: Fill must not show inert XS-XL brush-size buttons');
assert.ok(!shell.includes('getUserMedia(')&&!shell.includes('SpeechRecognition('),
  'LUCY: no microphone should be enabled during this scope');
const receipt={
  schema:'zgen.s0-lucy.review.v1',
  head,base:BASE,
  scope:'P0 five-size controls, no painter edit',
  execution:'GitHub Actions Node.js deterministic S0/Lucy-style checker',
  independent_ai_agent_executed:false,
  release:'HELD',
  source_scope:'PASS',
  genuine_marking_and_ink_default:'NOT_EVALUATED_BY_THIS_CHECK',
  current_browser_C3:'REQUIRES_SEPARATE_EXACT_SHA_GREEN',
  owner_galaxy_tab_s9:'UNTESTED',
  changed_files:changed,
  protected_source_sha256:sourceHashes,
  next:'Independent C3 real marks and default-size verification, then JAMES physical sign-off'
};
fs.mkdirSync('supervisor-evidence',{recursive:true});
fs.writeFileSync(path.join('supervisor-evidence','p0-s0-lucy-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('S0_LUCY_SOURCE_SCOPE_GREEN | release HELD | head '+head);
console.log('NO REMOTE AI CARPENTER/INDEPENDENT LUCY MODEL CLAIMED');
console.log(JSON.stringify({changed_files:changed,protected:sourceHashes}));
