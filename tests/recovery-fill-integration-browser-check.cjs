/* Original JOB-E/G/K bounded Fill integration on Recovery Three-Shell.
 * QA-only on an ephemeral Chromium profile, synthetic reference fixture.
 * Native visible touch controls and native C4 wet state/history.
 * Does not certify physical S Pen or claim Fill is a C4 GPU water simulation.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
let browser;
function capture(){
 const canvas=document.querySelector('#paint'),ref=document.querySelector('#reference');
 const snap=window.__C4.snapshot(),wet={};
 for(const [name,array] of Object.entries(snap.document?.whole?.layers||{})){
  let hash=2166136261,nonzero=0;
  for(let i=0;i<array.length;i++){hash=Math.imul(hash^array[i],16777619);if(array[i])nonzero++;}
  wet[name]={hash:hash>>>0,nonzero,length:array.length};
 }
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
 return {paint:canvas.toDataURL(),reference:ref.toDataURL(),wet,
  center:pixel(360,640),outside:pixel(100,100),boundary:pixel(240,640),
  history:window.__C4History(),backing:[canvas.width,canvas.height]};
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:800,height:1100}]){
  let context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1});
  let page=await context.newPage();const errors=[],downloads=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('download',d=>downloads.push(d));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_FILL?.identifyRegion&&window.__ZGEN_FILL_BRIDGE&&
   window.__C4?.snapshot&&window.__C4History&&window.__ZGEN_ART_RECOVERY?.status().ready&&
   !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  let left=page.locator('#zshell-left .zshell-handle');
  let fill=page.locator('.zgen-fill-toggle'),adjust=page.locator('.zshell-adjust-handle');
  const openFill=async()=>{
   if(await fill.getAttribute('aria-pressed')!=='true'){
    await left.tap();await fill.tap();
   }
   assert.equal(await fill.getAttribute('aria-pressed'),'true');
   assert.equal(await left.getAttribute('aria-expanded'),'false','Fill selection closes brush overlay');
  };
  const point=async()=>{
   const b=await page.locator('#paint').boundingBox();
   assert.ok(b&&b.width>100&&b.height>200);
   return {x:b.x+b.width*.5,y:b.y+b.height*.5};
  };
  const tapPaper=async()=>{
   const p=await point();
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'paint',
    'Actual paper must receive touch; no control overlay may intercept');
   await page.touchscreen.tap(p.x,p.y);
   await page.waitForTimeout(120);
  };
  const blank=await page.evaluate(capture);
  await openFill();await tapPaper();
  const blankAfter=await page.evaluate(capture);
  assert.equal(blankAfter.paint,blank.paint,'Blank paper touch refuses without pigment');
  assert.deepEqual(blankAfter.history,blank.history,'Blank refusal adds no native history');
  assert.match(await page.locator('#status').textContent(),/outline|closed/i);

  // Establish real native C4 wet pigment before applying dry bounded Fill.
  await left.tap();
  await page.locator('#zshell-left-panel button[data-act="brush"]').tap();
  await page.waitForFunction(()=>!document.querySelector('#drawer')?.hidden&&
   document.querySelector('#drawer [data-brush="round"]'),null,{timeout:10000});
  await page.locator('#drawer [data-brush="round"]').tap();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
  const bounds=await page.locator('#paint').boundingBox();
  const cdp=await context.newCDPSession(page);
  for(let i=0;i<12;i++){
   await cdp.send('Input.dispatchMouseEvent',{type:i?'mouseMoved':'mousePressed',
    pointerType:'pen',x:bounds.x+bounds.width*(.25+.45*i/11),y:bounds.y+bounds.height*.25,
    button:'left',buttons:1,clickCount:i?0:1,force:.65});
  }
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',pointerType:'pen',
   x:bounds.x+bounds.width*.7,y:bounds.y+bounds.height*.25,button:'left',buttons:0,force:0});
  await cdp.detach();
  await page.waitForFunction(()=>window.__C4History().undo.length===1,null,{timeout:10000});
  await page.evaluate(()=>document.querySelector('[data-act="stop"]').click()); // hidden legacy header: native handler, not touch claim
  // Only the outline is a deterministic fixture, not an artwork import claim.
  await page.evaluate(()=>{
   const c=document.querySelector('#reference').getContext('2d');
   c.strokeStyle='rgba(53,57,62,1)';c.lineWidth=5;c.strokeRect(240,470,240,340);
  });
  let before=await page.evaluate(capture);
  assert.ok(Object.values(before.wet).some(x=>x.nonzero>0),'Native C4 wet baseline must exist');
  await openFill();
  await adjust.tap();
  assert.deepEqual(await page.locator('#zshell-adjust-panel input[data-setting]').evaluateAll(
   xs=>xs.map(x=>x.dataset.setting)),['coverage','soft','strength']);
  assert.equal(await page.locator('#zshell-adjust-panel [data-size-preset]').count(),0);
  const slider=key=>page.locator('#zshell-adjust-panel input[data-setting="'+key+'"]');
  await slider('coverage').focus();await slider('coverage').press('End');
  await slider('strength').focus();await slider('strength').press('Home');
  await adjust.tap();
  await tapPaper();
  const stopped=await page.evaluate(capture);
  const stopDiagnostics=await page.evaluate(()=>({
    status:document.querySelector('#status')?.textContent,
    fillActive:window.__ZGEN_FILL?.active,
    fillSettings:window.__ZGEN_BRUSH_CONTROLS?.fillSettings,
    painterStopped:window.__ZGEN_BETA_26?.state()?.stopped,
    wetDirty:window.__C4?.getState()?.dirty
  }));
  console.log('ZGEN_FILL_STOP_REFUSAL_DIAGNOSTIC '+JSON.stringify({
    viewport,center:stopped.center,historyBefore:before.history.undo.length,
    historyAfter:stopped.history.undo.length,...stopDiagnostics
  }));
  assert.equal(stopDiagnostics.painterStopped,true,'Native STOP is engaged');
  assert.equal(stopDiagnostics.fillActive,true,'User activated real Fill control');
  assert.match(stopDiagnostics.status,/Painting is STOPPED; press GO/i);
  assert.equal(stopped.paint,before.paint,'STOP refuses Fill without altering canvas');
  assert.deepEqual(stopped.history,before.history,'STOP refusal adds no native history');
  await page.evaluate(()=>document.querySelector('[data-act="go"]').click()); // hidden legacy header: native handler, not touch claim
  await tapPaper();
  const wetBlocked=await page.evaluate(capture);
  const wetStatus=await page.locator('#status').textContent();
  assert.match(wetStatus,/Dry Wash before Fill/i,'GO retains wet-safety refusal');
  assert.equal(wetBlocked.paint,before.paint,'Wet C4 safety gate changes no paint pixels');
  assert.deepEqual(wetBlocked.history,before.history,'Wet refusal adds no native history');
  assert.ok(Object.values(wetBlocked.wet).some(x=>x.nonzero>0),
    'Native C4 wet evidence remains present after both safety refusals');
  console.log('ZGEN_RECOVERY_FILL_STOP_AND_WET_REFUSAL_PASS '+JSON.stringify({
    viewport,stopRefused:true,wetRefused:true,noHistoryMutation:true,
    noPainterSourceModification:true,mixedFillAccepted:false
  }));

  // Separate disposable context: positive Fill contract on CLEAN C4 state.
  // New context prevents the legitimate saved wet artwork from being reloaded.
  // Never remove STOP or wet-dirty guards to manufacture a mixed wet PASS.
  await context.close();
  context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('download',d=>downloads.push(d));
  left=page.locator('#zshell-left .zshell-handle');
  fill=page.locator('.zgen-fill-toggle');adjust=page.locator('.zshell-adjust-handle');
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_FILL?.identifyRegion&&window.__ZGEN_FILL_BRIDGE&&
    window.__C4?.snapshot&&window.__C4History&&window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  await page.evaluate(()=>{
    const ctx=document.querySelector('#reference').getContext('2d');
    ctx.strokeStyle='rgba(53,57,62,1)';ctx.lineWidth=5;
    ctx.strokeRect(240,470,240,340);
  });
  before=await page.evaluate(capture);
  assert.equal(before.history.undo.length,0,'Fresh isolated positive test has no wet history');
  await openFill();
  await adjust.tap();
  assert.deepEqual(await page.locator('#zshell-adjust-panel input[data-setting]').evaluateAll(
    xs=>xs.map(x=>x.dataset.setting)),['coverage','soft','strength']);
  await slider('coverage').focus();await slider('coverage').press('End');
  await slider('strength').focus();await slider('strength').press('Home');
  for(let n=0;n<20;n++) await slider('strength').press('ArrowRight');
  assert.equal(await slider('strength').inputValue(),'20','Low-strength UI is 20%, not zero');
  await adjust.tap();
  await tapPaper();
  const low=await page.evaluate(capture);
  console.log('ZGEN_FILL_CLEAN_LOW_STRENGTH_DIAGNOSTIC '+JSON.stringify({
    viewport,center:low.center,outside:low.outside,
    historyBefore:before.history.undo.length,historyAfter:low.history.undo.length,
    strength:20,status:await page.locator('#status').textContent()
  }));
  assert.ok(low.center[3]>0&&low.center[3]<120,
    'Native clean-region low-strength Fill makes translucent pigment');
  assert.equal(low.reference,before.reference,'Reference bytes unchanged');
  assert.deepEqual(low.wet,before.wet,'Clean Fill does not create unintended wet state');
  assert.deepEqual(low.outside,before.outside,'No outside fill');
  assert.deepEqual(low.boundary,before.boundary,'Fill stays off outline wall');
  assert.equal(low.history.undo.length,before.history.undo.length+1,'One native Fill history step');
  await adjust.tap();await slider('strength').focus();await slider('strength').press('End');
  await adjust.tap();await tapPaper();
  const high=await page.evaluate(capture);
  assert.ok(high.center[3]>low.center[3]+9,'Native strength slider changes actual wash alpha');
  assert.deepEqual(high.wet,before.wet,'Stronger clean Fill does not modify C4 wet state');
  await page.locator('.zshell-history-left').tap();
  const undone=await page.evaluate(capture);
  assert.equal(undone.paint,low.paint,'Native Undo removes exactly stronger wash');
  assert.deepEqual(undone.wet,before.wet,'Undo preserves clean C4 wet state');
  await page.locator('.zshell-history-right').tap();
  const redone=await page.evaluate(capture);
  assert.equal(redone.paint,high.paint,'Native Redo restores complete Fill bytes');
  assert.equal(redone.reference,before.reference);
  assert.deepEqual(redone.wet,before.wet);

  // The original bounded mask algorithm's coverage and edge contract remains distinct.
  const controls=await page.evaluate(()=>{
   const f=window.__ZGEN_FILL,ctx=document.querySelector('#paint').getContext('2d');
   const r=document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280);
   const p=ctx.createImageData(720,1280),region=f.identifyRegion(r,p,360,640);
   if(!region.ok)return {error:region.reason};
   const patch=o=>f.makePatch(region,p,'#356d95',o);
   const count=a=>{let n=0;for(let i=3;i<a.data.length;i+=4)if(a.data[i]>4)n++;return n;};
   const a=patch({coverage:10,soft:0,strength:50}),b=patch({coverage:90,soft:0,strength:50});
   const sharp=patch({coverage:100,soft:0,strength:50}),soft=patch({coverage:100,soft:100,strength:50});
   let edgeDelta=0;
   for(let i=3;i<sharp.data.length;i+=4)edgeDelta=Math.max(edgeDelta,sharp.data[i]-soft.data[i]);
   return {low:count(a),high:count(b),edgeDelta};
  });
  assert.ok(!controls.error,JSON.stringify(controls));
  assert.ok(controls.high>controls.low*4,'Coverage affects deposited pixel count');
  assert.ok(controls.edgeDelta>3,'Soft edge changes bounded edge pigment');

  // Native explicit export, without re-running owner's proven PNG-retention lifecycle.
  assert.equal(downloads.length,0,'No automatic download from painting/history');
  await page.locator('#zshell-right .zshell-handle').tap();
  const download=page.waitForEvent('download',{timeout:15000});
  await page.locator('#zshell-right-panel .actions button[data-act="export"]').tap();
  const d=await download,bytes=fs.readFileSync(await d.path());
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(bytes.readUInt32BE(16),720);assert.equal(bytes.readUInt32BE(20),1280);
  const exported=await page.evaluate(async b64=>{
   const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();
   const c=document.createElement('canvas');c.width=720;c.height=1280;
   const x=c.getContext('2d');x.drawImage(image,0,0);
   const px=(a,b)=>Array.from(x.getImageData(a,b,1,1).data);
   return {inside:px(360,640),outside:px(100,100),outline:px(240,640)};
  },bytes.toString('base64'));
  assert.notDeepEqual(exported.inside,exported.outside,'Export includes Fill pigment');
  assert.ok(exported.outline[0]<exported.outside[0]-30,'Export keeps graphite outline');

  await page.evaluate(()=>{
   window.__ZGEN_THREE_SHELL.closeAll();
   const c=document.querySelector('#reference').getContext('2d');c.clearRect(477,570,9,130);
  });
  const openBefore=await page.evaluate(capture);
  await tapPaper();
  const openAfter=await page.evaluate(capture);
  assert.equal(openAfter.paint,openBefore.paint,'Open outline refuses real touch without new paint');
  assert.deepEqual(openAfter.wet,openBefore.wet,'Open refusal preserves wet');
  assert.deepEqual(openAfter.history,openBefore.history,'Open refusal adds no history');
  assert.match(await page.locator('#status').textContent(),/open|large|edge/i);
  await left.tap();await page.locator('#drawing-rail button[data-brush="graphite"]').tap();
  assert.equal(await page.evaluate(()=>window.__ZGEN_FILL.active),false,'Normal brush exits Fill');
  assert.deepEqual((await page.evaluate(capture)).backing,[720,1280]);
  assert.deepEqual(errors,[],'No page errors');
  console.log('ZGEN_RECOVERY_FILL_CLEAN_REGION_PASS '+JSON.stringify({
   viewport,route:'studio-recovery-20261124/',closedTouch:true,blankTouchRefused:true,
   openTouchRefused:true,translucent:true,nativeStrengthChangesPixels:true,
   coverageAndSoftMask:true,nativeUndoRedoExact:true,wetRefusalPreservesWet:true,mixedC4WetFillAccepted:false,
   referencePreserved:true,explicitPNG:true,autoDownload:false,
   ownerDevicePass:false,liveDeployed:false,fillIsNativeC4WetSimulation:false}));
  await context.close();
 }
})().catch(e=>{console.error('ZGEN_RECOVERY_FILL_INTEGRATION_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close();});
