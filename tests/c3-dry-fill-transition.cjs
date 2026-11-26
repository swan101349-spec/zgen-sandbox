/* C3-style independent functional probe on separate QA branch.
 * Disposable Chromium, native C4 wet input and original Dry Wash handler.
 * This does not certify a second AI agent or a physical S Pen test.
 */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__C4?.getState&&window.__ZGEN_FILL?.applyAt&&window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
 const paint=page.locator('#paint'),left=page.locator('#zshell-left .zshell-handle');
 await left.tap();await page.locator('#zshell-left-panel button[data-act="brush"]').tap();
 await page.locator('#drawer [data-brush="round"]').tap();
 await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
 const b=await paint.boundingBox();assert.ok(b&&b.width>100&&b.height>220);
 const pen=await ctx.newCDPSession(page);
 for(let i=0;i<12;i++)await pen.send('Input.dispatchMouseEvent',{
   type:i?'mouseMoved':'mousePressed',pointerType:'pen',
   x:b.x+b.width*(.25+.45*i/11),y:b.y+b.height*.25,
   button:'left',buttons:1,clickCount:i?0:1,force:.65});
 await pen.send('Input.dispatchMouseEvent',{type:'mouseReleased',pointerType:'pen',
   x:b.x+b.width*.7,y:b.y+b.height*.25,button:'left',buttons:0,force:0});
 await pen.detach();
 await page.waitForFunction(()=>window.__C4History().undo.length===1,null,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__C4.getState().dirty),true);
 await page.evaluate(()=>{
  const c=document.querySelector('#reference').getContext('2d');
  c.strokeStyle='rgba(53,57,62,1)';c.lineWidth=5;c.strokeRect(240,470,240,340);
 });
 await left.tap();await page.locator('.zgen-fill-toggle').tap();
 const touch=async()=>{
  const box=await paint.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,{x,y}),'paint');
  await page.touchscreen.tap(x,y);await page.waitForTimeout(130);
 };
 const snap=()=>page.evaluate(()=>({
  paint:document.querySelector('#paint').toDataURL(),
  history:window.__C4History(),
  wet:window.__C4.getState(),
  painter:window.__ZGEN_BETA_26.state(),
  status:document.querySelector('#status')?.textContent,
  center:[...document.querySelector('#paint').getContext('2d').getImageData(360,640,1,1).data]
 }));
 const before=await snap();
 await page.evaluate(()=>document.querySelector('.actions [data-act="stop"]').click());
 await touch();const stopped=await snap();
 assert.equal(stopped.painter.stopped,true,'Native STOP flag must be latched');
 console.log('ZGEN_C3_STOP_STATE_DIAGNOSTIC',JSON.stringify({status:stopped.status,stopped:stopped.painter.stopped,wet:stopped.wet.dirty}));
 assert.equal(stopped.paint,before.paint);assert.deepEqual(stopped.history,before.history);
 await page.evaluate(()=>document.querySelector('.actions [data-act="go"]').click());
 await touch();const wetBlocked=await snap();
 assert.equal(wetBlocked.painter.stopped,false,'GO must release STOP');
 assert.equal(wetBlocked.wet.dirty,true,'Real dirty wet state still present');
 console.log('ZGEN_C3_WET_GUARD_DIAGNOSTIC',JSON.stringify({status:wetBlocked.status,stopped:wetBlocked.painter.stopped,wetDirty:wetBlocked.wet.dirty}));
 assert.equal(wetBlocked.paint,before.paint,'wet guard changed no dry-paint pixels');
 const postStop=wetBlocked.history.undo.slice(before.history.undo.length);
 assert.ok(postStop.every(x=>x==='dry'),'Only native automatic Dry Wash history is permitted after GO');
 assert.equal(wetBlocked.history.undo.filter(x=>x==='fill').length,0,'Wet guard must never insert a Fill step');
 assert.deepEqual(wetBlocked.history.redo,before.history.redo,'Wet guard preserves redo');
 console.log('ZGEN_C3_AUTODRY_HISTORY_ACCOUNTED',JSON.stringify({added:postStop,history:wetBlocked.history}));
 console.log('ZGEN_C3_NATIVE_STOP_WET_GATES_PASS',JSON.stringify({
  beforeHistory:before.history,stopStatus:stopped.status,wetStatus:wetBlocked.status,
  actualWetDirty:wetBlocked.wet.dirty}));
 // Activate existing native Tools and Dry Wash, never mutate C4 internal state.
 await page.evaluate(()=>{
  const more=document.querySelector('[data-act="more"]');
  if(!more)throw Error('Tools handler missing');more.click();
  const dry=document.querySelector('#drawer [data-act="dry"]');
  if(!dry)throw Error('Native Dry Wash command missing');dry.click();
 });
 await page.waitForTimeout(2500);
 const afterDry=await snap();await touch();const afterAttempt=await snap();
 const accepted=afterAttempt.paint!==afterDry.paint&&
  afterAttempt.history.undo.length===afterDry.history.undo.length+1;
 const evidence={
  before:{dirty:before.wet.dirty,phase:before.wet.phase,history:before.history},
  afterDry:{dirty:afterDry.wet.dirty,phase:afterDry.wet.phase,status:afterDry.status},
  afterFill:{dirty:afterAttempt.wet.dirty,phase:afterAttempt.wet.phase,
   status:afterAttempt.status,history:afterAttempt.history,center:afterAttempt.center},
  mixedWetThenDryThenFillAccepted:accepted,sourceModified:false,
  ownerDevicePass:false,browserErrors:errors};
 console.log('ZGEN_C3_NATIVE_DRY_TRANSITION_DIAGNOSTIC',JSON.stringify(evidence));
 assert.deepEqual(errors,[]);
 if(!accepted){
  console.error('ZGEN_C3_MIXED_DRY_FILL_BLOCKED_CONTRACT',JSON.stringify(evidence));
  process.exitCode=1;
 }else console.log('ZGEN_C3_MIXED_DRY_FILL_BROWSER_ACCEPTANCE_PASS',JSON.stringify(evidence));
 await ctx.close();
})().catch(e=>{console.error('ZGEN_C3_DRY_FILL_DIAGNOSTIC_ERROR',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
