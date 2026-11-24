/* ZGenArtStudio Pro | synthetic watercolor C4 wet-history + graphite-preservation QA
 * This is a real Chromium pointer test, not a simulated renderer or artist project.
 * Uses an isolated temporary browser profile, no changes to user artwork or live GitHub Pages.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-c4-wet-undo-'));
let browser;
const capture=()=>{
  const snap=window.__C4.snapshot(),layers=snap.document?.whole?.layers||{};
  const out={};
  for(const [name,array] of Object.entries(layers)){
    let hash=2166136261,nonzero=0;
    for(let i=0;i<array.length;i++){hash=Math.imul(hash^array[i],16777619);if(array[i])nonzero++}
    out[name]={length:array.length,nonzero,hash:hash>>>0};
  }
  return {
    layers:out,rect:snap.document.whole.rect,dirty:snap.dirty,phase:snap.phase,
    graphite:document.querySelector('#paint').toDataURL('image/png'),
    reference:document.querySelector('#reference').toDataURL('image/png'),
    history:window.__C4History(),metrics:window.__C4HistoryMetrics(),
    canvas:[document.querySelector('#paint').width,document.querySelector('#paint').height]
  };
};
(async()=>{
  browser=await chromium.launchPersistentContext(profile,{
    headless:true,viewport:{width:390,height:844},hasTouch:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=browser.pages()[0]||await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.snapshot&&window.__C4HistoryMetrics&&
    window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
    null,{timeout:45000});
  const board=await page.locator('#paint').boundingBox();
  assert.ok(board&&board.width>100&&board.height>150,'Artist native canvas visible');
  const trace=async (fy,x1=.3,x2=.68)=>{
    const y=board.y+board.height*fy;
    await page.mouse.move(board.x+board.width*x1,y);
    await page.mouse.down();
    await page.mouse.move(board.x+board.width*x2,y+board.height*.012,{steps:12});
    await page.mouse.up();
  };
  await page.evaluate(()=>document.querySelector('[data-brush=graphite]').click());
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
  await trace(.22);
  const base=await page.evaluate(capture);
  assert.equal(base.history.undo.length,1,'Real native graphite baseline stroke recorded');
  assert.deepEqual(base.canvas,[720,1280]);
  await page.evaluate(()=>document.querySelector('[data-brush=round]').click());
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
  for(const y of [.39,.51,.63])await trace(y,.27,.73);
  await page.evaluate(()=>document.querySelector('[data-act=stop]').click());
  const final=await page.evaluate(capture);
  assert.equal(final.history.undo.length,4,
    'Three watercolor brush strokes must extend history on same native canvas');
  assert.equal(final.metrics.maxSteps,60,'Deeper history must remain active for watercolor');
  assert.ok(final.metrics.estimatedBytes<=final.metrics.memoryLimitBytes,
    'Wet state included in shared history RAM budget');
  assert.equal(final.dirty,true,'Actual C4 watercolor engine must retain wet painted state');
  assert.ok(Object.values(final.layers).some(x=>x.nonzero>0),
    'Real C4 watercolor must modify GPU pigment pixels');
  for(let n=0;n<3;n++)await page.locator('.zshell-history-left').click();
  const undone=await page.evaluate(capture);
  assert.equal(undone.history.undo.length,1,'Only one graphite stroke remains after undoing three wet marks');
  assert.equal(undone.graphite,base.graphite,'Graphite baseline preserved after wet Undo');
  assert.equal(undone.reference,base.reference,'Reference layer cannot be destroyed by wet Undo');
  assert.deepEqual(undone.layers,base.layers,'All C4 wet pigment arrays restore exactly to pre-watercolor');
  for(let n=0;n<3;n++)await page.locator('.zshell-history-right').click();
  const redone=await page.evaluate(capture);
  assert.equal(redone.history.undo.length,4,'Native watercolor Redo returns all strokes');
  assert.equal(redone.graphite,base.graphite,'Graphite baseline preserved after wet Redo');
  assert.deepEqual(redone.layers,final.layers,'C4 wet GPU pigment arrays restore exactly after Redo');
  assert.equal(redone.reference,base.reference,'Reference unchanged after redo');
  const flushed=await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush());
  assert.equal(flushed,true,'Combined graphite and native C4 wet project checkpoint committed');
  assert.deepEqual(errors,[],'No page errors');
  console.log('ZGEN_C4_WET_HISTORY_PASS '+JSON.stringify({
    dryGraphiteBaseline:1,wetWatercolorStrokes:3,undoWet:3,redoWet:3,
    wetArraysRestoreExact:true,graphiteIntact:true,referenceIntact:true,
    maxSteps:redone.metrics.maxSteps,memoryUsageBytes:redone.metrics.estimatedBytes,
    budgetBytes:redone.metrics.memoryLimitBytes,
    nativeCanvas:redone.canvas,checkpointCommitted:true,physicalDevicePass:false
  }));
})().catch(error=>{console.error('ZGEN_C4_WET_HISTORY_FAIL',error);process.exitCode=1})
  .finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
