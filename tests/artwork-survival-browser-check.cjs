/* C3-style isolated P0 browser check.
 * Synthetic artwork only. No owner PNG, live deployment, or storage clearing.
 * Exact original index and painting module remain untouched.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');

const source=fs.readFileSync('index.html','utf8');
assert.equal(source,fs.readFileSync('shell-v2.html','utf8'),
  'Root painting source must remain byte-identical to original three-shell candidate.');
assert.equal(execFileSync('git',['hash-object','index.html'],{encoding:'utf8'}).trim(),
  '8f5138325cb537a146cd2a5909e29126d624aaac',
  'Original painter blob must be preserved, not rebuilt.');
assert.match(fs.readFileSync('three-shell.js','utf8'),/artwork-survival\.js/,
  'Additive survival helper not wired.');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-p0-artwork-'));
const shots='three-shell-browser-qa';
fs.mkdirSync(shots,{recursive:true});
let context;
(async()=>{
  const opts={headless:true,viewport:{width:390,height:844},hasTouch:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
  context=await chromium.launchPersistentContext(profile,opts);
  const page=context.pages()[0]||await context.newPage();
  const errors=[],downloads=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('download',d=>downloads.push(d.suggestedFilename()));
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
    window.__ZGEN_BETA_26?.referenceCanvas&&window.__C4?.snapshot,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.status().blocked),false,
    'Recovery did not initialize on clean first launch.');
  // Import a synthetic full-size PNG through the ACTUAL #file input handler.
  await page.evaluate(async()=>{
    const image=document.createElement('canvas');
    image.width=720;image.height=1280;
    const ctx=image.getContext('2d');
    ctx.fillStyle='#fefcf0';ctx.fillRect(0,0,720,1280);
    ctx.fillStyle='#1886c6';ctx.fillRect(300,500,80,80);
    const blob=await new Promise(ok=>image.toBlob(ok,'image/png'));
    const file=new File([blob],'synthetic-reference.png',{type:'image/png'});
    const selection=new DataTransfer();selection.items.add(file);
    const input=document.getElementById('file');
    input.files=selection.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Reference imported.'),{timeout:10000});
  const original=await page.evaluate(()=>{
    const ref=document.getElementById('reference');
    const rgba=Array.from(ref.getContext('2d').getImageData(340,540,1,1).data);
    return rgba;
  });
  assert.ok(original[2]>150&&original[3]===255,
    'Actual imported reference must contain synthetic blue pixel.');
  // Overlay an artist's dry mark and publish the same completed-pointer event.
  await page.evaluate(()=>{
    const paint=document.getElementById('paint');
    const ctx=paint.getContext('2d');
    ctx.fillStyle='#b02031';ctx.fillRect(20,20,18,18);
    paint.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:4}));
  });
  // Allow queued capture, then verify an atomic named recovery record persisted.
  await page.waitForFunction(()=>!!window.__ZGEN_ART_RECOVERY.status().savedAt,{timeout:25000});
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
    'Synthetic artwork could not be persisted to IndexedDB.');
  const before=await page.evaluate(()=>{
    const pix=id=>Array.from(document.getElementById(id).getContext('2d')
      .getImageData(id==='paint'?28:340,id==='paint'?28:540,1,1).data);
    return {paint:pix('paint'),reference:pix('reference'),
      wetVersion:window.__C4.snapshot().version,
      dimensions:[document.getElementById('paint').width,document.getElementById('paint').height]};
  });
  await page.screenshot({path:path.join(shots,'p0-before-reload.png')});
  assert.ok(before.paint[0]>130&&before.paint[3]===255,'Artist dry mark is real.');
  assert.equal(before.wetVersion,'c4-webgl2/1','Native C4 must still be live.');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.status().blocked),false,
    'Existing saved artwork could not reopen.');
  const after=await page.evaluate(()=>{
    const pix=id=>Array.from(document.getElementById(id).getContext('2d')
      .getImageData(id==='paint'?28:340,id==='paint'?28:540,1,1).data);
    return {paint:pix('paint'),reference:pix('reference'),
      wetVersion:window.__C4.snapshot().version,
      dimensions:[document.getElementById('paint').width,document.getElementById('paint').height]};
  });
  assert.deepEqual(after,before,
    'Imported reference, paint, wet engine version and backing must survive reload.');
  await page.screenshot({path:path.join(shots,'p0-reopened-same-tab.png')});
  await context.close();context=null;
  // Reopen the full browser session with the same Android-like user profile.
  context=await chromium.launchPersistentContext(profile,opts);
  const reopened=context.pages()[0]||await context.newPage();
  reopened.on('pageerror',e=>errors.push(e.message));
  reopened.on('download',d=>downloads.push(d.suggestedFilename()));
  await reopened.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  await reopened.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready,{timeout:30000});
  const session=await reopened.evaluate(()=>{
    const pix=id=>Array.from(document.getElementById(id).getContext('2d')
      .getImageData(id==='paint'?28:340,id==='paint'?28:540,1,1).data);
    return {paint:pix('paint'),reference:pix('reference'),
      wetVersion:window.__C4.snapshot().version,
      dimensions:[document.getElementById('paint').width,document.getElementById('paint').height]};
  });
  assert.deepEqual(session,before,'Both artwork layers must survive browser close/reopen.');
  assert.deepEqual(errors,[],'No uncaught errors during original engine + helper startup.');
  assert.deepEqual(downloads,[],'Never auto-download user art during recovery.');
  await reopened.screenshot({path:path.join(shots,'p0-reopened-new-session.png')});
  console.log('ZGEN_ARTWORK_RECOVERY_PASS '+JSON.stringify({
    originalPainterBlobPreserved:true,importReferenceSurvives:true,
    dryPaintSurvives:true,nativeC4Restores:true,browserSessionReopen:true,
    downloads:0,errors:0,devicePenOwnerPass:false}));
})().catch(e=>{console.error('ZGEN_ARTWORK_RECOVERY_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});});
