/* S0 original JOB-M/C2 (and JOB-N) wet checkpoint diagnosis.
 * Disposable Chromium IndexedDB only. Simulated pen wet stroke; observe
 * automatic post-stroke snapshot, manual FIX flush, safe reload restoration.
 * DO NOT touch artist-owned project, PNG export, served Pages or WordPress.
 */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:8765/studio-recovery-20261124/';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const ready=()=>page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__C4?.snapshot,
    null,{timeout:45000});
 await ready();
 const state=()=>page.evaluate(()=>{
  const q=window.__ZGEN_ART_RECOVERY.status(),wet=window.__C4.getState();
  const layers=window.__C4.snapshot()?.document?.whole?.layers||{},h={};
  for(const [key,arr] of Object.entries(layers)){
   let hash=2166136261,nonzero=0;
   for(let i=0;i<arr.length;i++){hash=Math.imul(hash^arr[i],16777619);if(arr[i])nonzero++;}
   h[key]={hash:hash>>>0,nonzero,length:arr.length};
  }
  return {recovery:q,wet:{phase:wet.phase,active:wet.active,dirty:wet.dirty,
   hostActive:wet.wet.active,hostFixing:wet.wet.fixing},wetHash:h,
   paint:document.querySelector('#paint').toDataURL(),
   reference:document.querySelector('#reference').toDataURL(),
   referenceOpacity:document.querySelector('#reference').style.opacity,
   history:window.__C4History(),statusText:document.querySelector('#status')?.textContent};
 });
 const init=await state();
 assert.equal(init.recovery.savedAt,null,'Fresh disposable browser must have no checkpoint');
 await page.evaluate(()=>{
  const ctx=document.querySelector('#reference').getContext('2d');
  ctx.strokeStyle='rgba(45,44,43,1)';ctx.lineWidth=6;ctx.strokeRect(260,460,200,350);
 });
 const left=page.locator('#zshell-left .zshell-handle');
 await left.tap();await page.locator('#zshell-left-panel button[data-act="brush"]').tap();
 await page.locator('#drawer [data-brush="round"]').tap();
 await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
 const b=await page.locator('#paint').boundingBox();assert.ok(b&&b.width>100&&b.height>200);
 const pen=await context.newCDPSession(page);
 for(let i=0;i<12;i++)await pen.send('Input.dispatchMouseEvent',{
  type:i?'mouseMoved':'mousePressed',pointerType:'pen',
  x:b.x+b.width*(.18+.40*i/11),y:b.y+b.height*.21,
  button:'left',buttons:1,clickCount:i?0:1,force:.7});
 await pen.send('Input.dispatchMouseEvent',{
  type:'mouseReleased',pointerType:'pen',x:b.x+b.width*.58,y:b.y+b.height*.21,
  button:'left',buttons:0,force:0});
 await pen.detach();
 await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:12000});
 const early=await state();
 // No manual Dry, undo, save, hidden-tab event or brush change before observing
 // the original automatic 150ms/1900ms retry behavior.
 await page.waitForFunction(()=>window.__C4.getState().phase==='FIX',null,{timeout:45000});
 await page.waitForTimeout(4500);
 const automatic=await state();
 const autoSaved=automatic.recovery.savedAt!==null;
 console.log('ZGEN_JOB_M_AUTOSAVE_AFTER_SETTLE_DIAGNOSTIC',JSON.stringify({
  initialSavedAt:init.recovery.savedAt,
  early:{phase:early.wet.phase,active:early.wet.active,lastError:early.recovery.lastError},
  afterFix:{phase:automatic.wet.phase,active:automatic.wet.active,
   hostActive:automatic.wet.hostActive,hostFixing:automatic.wet.hostFixing,
   savedAt:automatic.recovery.savedAt,lastError:automatic.recovery.lastError,
   status:automatic.statusText},
  autoSaved,existingWetLayers:Object.keys(automatic.wetHash).length,
  simulatedPenOnly:true,ownerDevicePass:false
 }));
 assert.equal(automatic.wet.phase,'FIX','Auto lifecycle must finish');
 assert.equal(automatic.wet.active,false,'No active stroke before manual capture');
 assert.equal(automatic.wet.hostFixing,false,'No active GPU fixer before manual capture');
 assert.equal(Object.keys(automatic.wetHash).length,5,'All C4 arrays available');
 assert.ok(automatic.history.undo.includes('stroke'),'Real wet stroke history must exist');
 // Explicit flush is *diagnostic only*, never replace an automatic PASS claim.
 const manualOk=await page.evaluate(async()=>await window.__ZGEN_ART_RECOVERY.flush());
 const afterManual=await state();
 console.log('ZGEN_JOB_M_EXPLICIT_POSTFIX_FLUSH_DIAGNOSTIC',JSON.stringify({
  manualOk,savedAt:afterManual.recovery.savedAt,lastError:afterManual.recovery.lastError,
  automaticCheckpointObserved:autoSaved}));
 assert.equal(manualOk,true,'Safe manual flush should succeed after native FIX');
 assert.ok(afterManual.recovery.savedAt!==null,'Native IndexedDB checkpoint must commit');
 const beforeReload=await state();
 await page.reload({waitUntil:'domcontentloaded'});
 await ready();
 const reopened=await state();
 assert.equal(reopened.recovery.blocked,false,'Reopen must not block intact checkpoint');
 assert.deepEqual(reopened.wetHash,beforeReload.wetHash,
  'All five native wet layers must survive browser reload');
 assert.equal(reopened.reference,beforeReload.reference,
  'Synthetic reference layer must survive safe reload');
 assert.equal(reopened.paint,beforeReload.paint,
  'Dry painting layer must survive safe reload');
 assert.equal(reopened.referenceOpacity,beforeReload.referenceOpacity,
  'Reference opacity must survive safe reload');
 assert.deepEqual(errors,[],'No page script exceptions');
 console.log('ZGEN_JOB_M_MANUAL_CHECKPOINT_RELOAD_PASS',JSON.stringify({
  fiveWetLayersPreserved:true,syntheticReferencePreserved:true,
  paintLayerPreserved:true,noBrowserErrors:true,
  autoSaveWithoutManualAction:autoSaved,physicalDevicePass:false,
  noRealOwnerFilesTouched:true}));
 if(!autoSaved){
  console.error('ZGEN_JOB_M_AUTOMATIC_POSTFIX_RECOVERY_FAIL',JSON.stringify({
   reason:'No automatic checkpoint after completed FIX within controlled observation',
   manualFlushWorks:true,reopenFromExplicitCheckpointWorks:true}));
  process.exitCode=1;
 }else console.log('ZGEN_JOB_M_AUTOMATIC_POSTFIX_RECOVERY_PASS');
 await context.close();
})().catch(e=>{console.error('ZGEN_JOB_M_RECOVERY_DIAGNOSTIC_ERROR',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
