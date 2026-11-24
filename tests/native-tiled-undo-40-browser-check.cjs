/* Owner C3 | bounded native dry-paint Undo, exact real Chromium strokes.
 * Synthetic isolated browser profile. Never loads or modifies owner artwork.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-tiled-history-'));
const STROKES=40;
let browser;
const picture=()=>({paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  dimensions:[document.querySelector('#paint').width,document.querySelector('#paint').height],
  history:window.__C4History()});
(async()=>{
  browser=await chromium.launchPersistentContext(profile,{
    headless:true,viewport:{width:390,height:844},hasTouch:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=browser.pages()[0]||await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_BETA_26&&window.__C4History&&
    window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
    null,{timeout:45000});
  // Import a synthetic original reference through the NATIVE input, then use an
  // isolated reload to start 40 dry strokes on a reference-bearing painting.
  // Never touches or publishes the artist's private 24 illustrations.
  const referenceData=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const a=c.getContext('2d');a.strokeStyle='#303038';a.lineWidth=3;
    a.beginPath();a.arc(64,66,35,.2,5.7);a.moveTo(28,45);a.lineTo(41,19);
    a.lineTo(56,35);a.moveTo(73,35);a.lineTo(89,19);a.lineTo(102,46);
    a.stroke();return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file').setInputFiles({name:'synthetic-ink-reference.png',
    mimeType:'image/png',buffer:Buffer.from(referenceData,'base64')});
  await page.waitForFunction(()=>{
    const c=document.querySelector('#reference');
    const d=c.getContext('2d').getImageData(0,0,720,1280).data;
    for(let i=3;i<d.length;i+=4)if(d[i])return true;
    return false;
  },null,{timeout:15000});
  const referenceBeforeReload=await page.evaluate(()=>document.querySelector('#reference').toDataURL('image/png'));
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
    'Synthetic reference checkpoint stored before the 40-step history test');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__C4HistoryMetrics,
    null,{timeout:45000});
  const before=await page.evaluate(picture);
  assert.equal(before.reference,referenceBeforeReload,
    'Original native synthetic tracing reference must survive initial reload');
  assert.deepEqual(before.dimensions,[720,1280],'Native 720×1280 paper unchanged');
  assert.deepEqual(before.history,{undo:[],redo:[]},'A fresh ephemeral profile starts empty');
  await page.evaluate(()=>document.querySelector('[data-brush="graphite"]').click());
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
  // Set a real small brush so every line and Undo is distinguishable.
  await page.locator('.zshell-adjust-handle').click();
  await page.locator('[data-size-preset="XS"]').click();
  await page.locator('.zshell-adjust-handle').click();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),3);

  const box=await page.locator('#paint').boundingBox();
  assert(box&&box.width>100&&box.height>150,'Real paper must be visible');
  const saved=[before.paint];
  for(let n=0;n<STROKES;n++){
    const y=box.y+box.height*(.14+n*.017);
    await page.mouse.move(box.x+box.width*.28,y);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.64,y+box.height*.008,{steps:8});
    await page.mouse.up();
    const state=await page.evaluate(picture);
    assert.notEqual(state.paint,saved[n],'Stroke '+(n+1)+' must add real pixels');
    assert.equal(state.reference,before.reference,'Mark must not erase tracing reference');
    assert.deepEqual(state.dimensions,[720,1280],'No destructive backing resize');
    assert.equal(state.history.undo.length,n+1,'History must retain every new stroke');
    assert.equal(state.history.redo.length,0,'A new mark must invalidate only Redo');
    saved.push(state.paint);
  }
  const thirtyPlus=await page.evaluate(()=>window.__C4HistoryMetrics());
  assert.equal(thirtyPlus.undo,STROKES,'40 native historical states must be retained');
  assert.ok(thirtyPlus.estimatedBytes<=thirtyPlus.memoryLimitBytes,
    'Shared history must remain under 128 MiB: '+JSON.stringify(thirtyPlus));
  assert.equal(thirtyPlus.maxSteps,60,'60 maximum low-memory Undo steps');
  assert.equal(thirtyPlus.tileSize,64,'64px shared dirty tile size');
  // Actual visible arrow controls delegate to the unchanged native history owner.
  for(let n=STROKES;n>0;n--){
    await page.locator('.zshell-history-left').click();
    const state=await page.evaluate(picture);
    assert.equal(state.paint,saved[n-1],'Undo '+(STROKES-n+1)+' must restore exact previous pixels');
    assert.equal(state.history.undo.length,n-1,'Native Undo count');
    assert.equal(state.history.redo.length,STROKES-n+1,'Native Redo count');
  }
  for(let n=1;n<=STROKES;n++){
    await page.locator('.zshell-history-right').click();
    const state=await page.evaluate(picture);
    assert.equal(state.paint,saved[n],'Redo '+n+' must restore exact later pixels');
    assert.equal(state.history.undo.length,n);
    assert.equal(state.history.redo.length,STROKES-n);
  }
  assert.equal(await page.locator('#zshell-adjust-panel').evaluate(e=>e.hidden),true,
    'History clicks do not unexpectedly open adjustments');
  const finished=await page.evaluate(picture);
  assert.equal(finished.reference,before.reference);
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
    'Synthetic painted artwork checkpoint must be flushed safely');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  const reopened=await page.evaluate(picture);
  assert.equal(reopened.paint,finished.paint,'Painted pixels survive page reload');
  assert.equal(reopened.reference,finished.reference,'Tracing reference survives page reload');
  assert.deepEqual(reopened.dimensions,[720,1280]);
  // History need not survive reload: only the artwork reload guarantee is tested.
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('ZGEN_TILED_HISTORY_PASS '+JSON.stringify({
    realGraphiteStrokes:STROKES,undo:STROKES,redo:STROKES,
    pixelExact:true,referencePreserved:true,reloadPreserved:true,
    nativeCanvas:[720,1280],memoryUsageBytes:thirtyPlus.estimatedBytes,
    memoryLimitBytes:thirtyPlus.memoryLimitBytes,referenceImported:true,actualHardwareTested:false
  }));
})().catch(e=>{console.error('ZGEN_TILED_HISTORY_FAIL',e);process.exitCode=1})
.finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
