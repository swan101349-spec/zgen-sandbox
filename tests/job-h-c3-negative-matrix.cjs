/* Original S0 JOB-H / C4 / C3 independent-path negative matrix.
 * Two isolated responsive viewports. Tests native STOP, dirty wet, actual
 * SETTLE and FIX, safe Fill pixels, exact history and 5 GPU wet layers.
 * Automated second QA path, NOT independent agent sign-off or physical S Pen.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
let browser;
const viewports=[{width:390,height:844},{width:800,height:1100}];
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.getState&&window.__ZGEN_FILL?.identifyRegion&&
   window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  const paint=page.locator('#paint');
  const tap=async()=>{
   const b=await paint.boundingBox();assert.ok(b&&b.width>100&&b.height>200);
   const x=b.x+b.width/2,y=b.y+b.height/2;
   assert.equal(await page.evaluate(pt=>document.elementFromPoint(pt.x,pt.y)?.id,{x,y}),'paint',
    'Actual painting paper must be touch-reachable');
   await page.touchscreen.tap(x,y);await page.waitForTimeout(120);
  };
  const snap=()=>page.evaluate(()=>{
   const paint=document.querySelector('#paint');
   const history=window.__C4History(),wet=window.__C4.getState(),stopped=window.__ZGEN_BETA_26.state().stopped;
   const layers=window.__C4.snapshot()?.document?.whole?.layers||{},hashes={};
   for(const [key,array] of Object.entries(layers)){
    let h=2166136261,nonzero=0;
    for(let n=0;n<array.length;n++){h=Math.imul(h^array[n],16777619);if(array[n])nonzero++;}
    hashes[key]={hash:h>>>0,nonzero,length:array.length};
   }
   return {paint:paint.toDataURL(),center:[...paint.getContext('2d').getImageData(360,640,1,1).data],
    history,wet:{phase:wet.phase,dirty:wet.dirty,active:wet.active,hostActive:wet.wet.active,hostFixing:wet.wet.fixing},
    stopped,hashes,status:document.querySelector('#status')?.textContent};
  });
  const button=(act)=>page.evaluate(act=>{
   const btn=document.querySelector('.actions [data-act="'+act+'"]');
   if(!btn)throw Error('Missing native control: '+act);btn.click();
  },act);
  const left=page.locator('#zshell-left .zshell-handle');
  await left.tap();
  await page.locator('#zshell-left-panel button[data-act="brush"]').tap();
  await page.locator('#drawer [data-brush="round"]').tap();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
  const b=await paint.boundingBox(),pen=await context.newCDPSession(page);
  for(let i=0;i<12;i++) await pen.send('Input.dispatchMouseEvent',{
   type:i?'mouseMoved':'mousePressed',pointerType:'pen',
   x:b.x+b.width*(.25+.45*i/11),y:b.y+b.height*.24,
   button:'left',buttons:1,clickCount:i?0:1,force:.65});
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:b.x+b.width*.70,y:b.y+b.height*.24,button:'left',buttons:0,force:0});
  await pen.detach();
  await page.waitForFunction(()=>window.__C4History().undo.some(x=>x==='stroke'),null,{timeout:10000});
  await page.evaluate(()=>{
   const ctx=document.querySelector('#reference').getContext('2d');
   ctx.strokeStyle='rgba(53,57,62,1)';ctx.lineWidth=5;ctx.strokeRect(240,470,240,340);
  });
  await left.tap();await page.locator('.zgen-fill-toggle').tap();
  assert.equal(await page.locator('.zgen-fill-toggle').getAttribute('aria-pressed'),'true');
  const pre=await snap();
  assert.equal(pre.wet.dirty,true);
  assert.equal(pre.history.undo.filter(x=>x==='fill').length,0);
  await button('stop');await tap();
  const underStop=await snap();
  assert.equal(underStop.stopped,true);
  assert.equal(underStop.paint,pre.paint,'STOP cannot add Fill pigment');
  assert.equal(underStop.history.undo.filter(x=>x==='fill').length,0);
  await button('go');await tap();
  const wetBlocked=await snap();
  assert.equal(wetBlocked.stopped,false);
  assert.equal(wetBlocked.wet.dirty,true);
  assert.equal(wetBlocked.paint,pre.paint,'Wet C4 guard prevents premature Fill');
  assert.equal(wetBlocked.history.undo.filter(x=>x==='fill').length,0);
  console.log('ZGEN_C3_MATRIX_STOP_WET_REFUSAL_PASS',JSON.stringify({
   viewport,stop:true,wetGuard:true,phase:wetBlocked.wet.phase,
   nativeHistory:wetBlocked.history.undo}));
  // Explicit user Dry command. Do not fake completion by resetting dirty or phase.
  await page.evaluate(()=>{
   const more=document.querySelector('[data-act="more"]');
   if(!more)throw Error('Tools panel absent');more.click();
   const dry=document.querySelector('#drawer [data-act="dry"]');
   if(!dry)throw Error('Manual Dry Wash absent');dry.click();
  });
  const immediate=await snap();
  assert.ok(['SETTLE','FIX'].includes(immediate.wet.phase),'Native lifecycle phase');
  let settleRefusalObserved=false;
  if(immediate.wet.phase==='SETTLE'){
   const beforeSettle=await snap();
   await tap();const afterSettle=await snap();
   if(afterSettle.wet.phase==='SETTLE'){
    assert.equal(afterSettle.paint,beforeSettle.paint,'No Fill during SETTLE');
    assert.equal(afterSettle.history.undo.filter(x=>x==='fill').length,0);
    settleRefusalObserved=true;
   }
  }
  await page.waitForFunction(()=>window.__C4.getState().phase==='FIX',null,{timeout:45000});
  const fixed=await snap();
  assert.equal(fixed.wet.hostActive,false);
  assert.equal(fixed.wet.hostFixing,false);
  assert.equal(fixed.wet.dirty,true,'Historical dirty state must remain');
  assert.equal(Object.keys(fixed.hashes).length,5,'All C4 wet-layer hashes required');
  await button('stop');await tap();
  const stoppedFixed=await snap();
  assert.equal(stoppedFixed.stopped,true);
  assert.equal(stoppedFixed.paint,fixed.paint,'STOP refusal must still work after FIX');
  assert.deepEqual(stoppedFixed.hashes,fixed.hashes);
  assert.equal(stoppedFixed.history.undo.filter(x=>x==='fill').length,0);
  await button('go');await tap();
  const accepted=await snap();
  assert.equal(accepted.stopped,false);
  assert.ok(accepted.center[3]>0,'Fill must deposit real pigment after FIX');
  assert.notEqual(accepted.paint,fixed.paint,'Fill must change painter pixels');
  assert.equal(accepted.history.undo.filter(x=>x==='fill').length,1);
  assert.deepEqual(accepted.hashes,fixed.hashes,'Fill must preserve all fixed wet layers');
  await page.locator('.zshell-history-left').tap();
  const undo=await snap();
  assert.equal(undo.paint,fixed.paint,'Undo exact pixels');
  assert.deepEqual(undo.hashes,fixed.hashes);
  await page.locator('.zshell-history-right').tap();
  const redo=await snap();
  assert.equal(redo.paint,accepted.paint,'Redo exact pixels');
  assert.deepEqual(redo.hashes,fixed.hashes);
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log('ZGEN_C3_JOB_H_TWO_VIEWPORT_NEGATIVE_MATRIX_PASS',JSON.stringify({
   viewport,realPenSimulated:true,physicalSpen:false,stopBeforeFix:true,
   dirtyWetRefusal:true,settleRefusalObserved,stopAfterFix:true,
   manualDry:true,phaseBeforeDry:pre.wet.phase,phaseAfterDry:fixed.wet.phase,
   dirtyFlagRetained:fixed.wet.dirty,
   fixedWetLayerCount:Object.keys(fixed.hashes).length,
   postFixFillPixelAlpha:accepted.center[3],undoRedoExact:true,
   noAutodownloadTestedHere:true,releaseHeld:true}));
  await context.close();
 }
})().catch(err=>{console.error('ZGEN_C3_JOB_H_TWO_VIEWPORT_MATRIX_FAIL',err);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
