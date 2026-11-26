/* Original S0 JOB-E/C4: real six-head sampled brush footprint evidence.
 * Round/Mop/Flat/Rigger/Sponge use real C4 wet engine and native FIX.
 * Clay Roller is a DRY Canvas2D head, not a C4 wet brush: test separately.
 * Disposable Chromium and simulated pen input, no device/public deployment.
 * This is a bounded geometry-characterization check, not every size profile.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const wetBrushes=['round','mop','flat','rigger','sponge'];
const dryBrush='roller';
let browser;
function summarize(){
 const snapshot=window.__C4.snapshot();
 const whole=snapshot?.document?.whole;
 if(!whole?.layers)throw Error('Native C4 whole wet-layer snapshot missing');
 const stats={},names=Object.keys(whole.layers).sort();
 if(names.join(',')!=='fixedA,fixedB,inkA,inkB,wet')throw Error('Expected five C4 GPU layers');
 for(const [key,arr] of Object.entries(whole.layers)){
  if(!(arr instanceof Uint16Array))throw Error('Expected C4 wet half-float GPU layer '+key);
  let nonzero=0,hash=2166136261;
  for(let i=0;i<arr.length;i++){
   const v=arr[i];
   if(v!==0)nonzero++;
   hash=Math.imul(hash^v,16777619);
  }
  stats[key]={length:arr.length,nonzero,hash:hash>>>0};
 }
 const inkChanged=['fixedA','fixedB','inkA','inkB']
   .reduce((sum,k)=>sum+stats[k].nonzero,0);
 const r=whole.rect||null;
 const rect=r?{x0:r.x0,y0:r.y0,x1:r.x1,y1:r.y1,
  width:r.x1-r.x0,height:r.y1-r.y0,
  area:(r.x1-r.x0)*(r.y1-r.y0)}:null;
 return {rect,stats,inkChanged,phase:window.__C4.getState().phase,
  active:window.__C4.getState().active,
  nativeHistory:window.__C4History().undo.slice(),
  brush:window.__ZGEN_BETA_26.state().brush};
}
async function mark(brush,wet){
 const context=await browser.newContext({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.snapshot&&window.__ZGEN_BETA_26?.state&&
   window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY?.status().blocked,
   null,{timeout:45000});
  const starting=await page.evaluate(()=>({
    png:document.querySelector('#paint').toDataURL('image/png')
  }));
  await page.evaluate(()=>{
   const b=document.querySelector('button[data-act="brush"]');
   if(!b)throw Error('Original brush control absent');b.click();
  });
  const select=page.locator('#drawer [data-brush="'+brush+'"]');
  await select.waitFor({state:'visible',timeout:10000});
  await select.tap();
  await page.waitForFunction(b=>window.__ZGEN_BETA_26.state().brush===b,brush,{timeout:7000});
  const box=await page.locator('#paint').boundingBox();
  assert.ok(box&&box.width>150&&box.height>220,'True 9:16 canvas visible and reachable');
  const pen=await context.newCDPSession(page);
  for(let i=0;i<15;i++){
   await pen.send('Input.dispatchMouseEvent',{
    type:i?'mouseMoved':'mousePressed',pointerType:'pen',
    x:box.x+box.width*(.18+.6*i/14),
    y:box.y+box.height*(.40+Math.sin(i/14*Math.PI)*.025),
    button:'left',buttons:1,clickCount:i?0:1,force:.67
   });
  }
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:box.x+box.width*.78,y:box.y+box.height*.40,
   button:'left',buttons:0,force:0
  });
  await pen.detach();
  const expected=wet?'stroke':'roller';
  await page.waitForFunction(x=>window.__C4History().undo.includes(x),expected,{timeout:16000});
  if(wet){
   await page.waitForFunction(()=>{
    const w=window.__C4.getState();
    return w.phase==='FIX'&&!w.active&&!w.wet.active&&!w.wet.fixing;
   },null,{timeout:50000});
   const data=await page.evaluate(summarize);
   assert.equal(data.brush,brush);
   assert.equal(data.phase,'FIX');
   assert.ok(data.inkChanged>0,'Native C4 brush must deposit true pigment');
   assert.ok(data.rect&&data.rect.area>0,'Native wet pigmented brush has real bounded geometry');
   assert.equal(data.nativeHistory.includes('stroke'),true);
   assert.deepEqual(errors,[],'No native browser JS error');
   console.log('ZGEN_JOB_E_NATIVE_WET_HEAD_PIXEL_EVIDENCE_PASS',JSON.stringify({
    brush,rect:data.rect,nonzeroPigmentValues:data.inkChanged,
    layerNonzero:Object.fromEntries(Object.entries(data.stats).map(([k,v])=>[k,v.nonzero])),
    currentPhase:data.phase,noOwnerData:true
   }));
   return {brush,rect:data.rect,ink:data.inkChanged,stats:data.stats};
  }
  const after=await page.evaluate(()=>({
    png:document.querySelector('#paint').toDataURL('image/png'),
    history:window.__C4History(),
    brush:window.__ZGEN_BETA_26.state().brush
  }));
  assert.equal(after.brush,'roller');
  assert.notEqual(after.png,starting.png,'Dry clay roller must mark real paint pixels');
  assert.ok(after.history.undo.includes('roller'),'Dry roller has native history');
  await page.locator('.zshell-history-left').tap();
  const undo=await page.evaluate(()=>({
    png:document.querySelector('#paint').toDataURL('image/png'),
    history:window.__C4History()
  }));
  assert.equal(undo.png,starting.png,'Clay roller native Undo restores exact canvas');
  await page.locator('.zshell-history-right').tap();
  const redo=await page.evaluate(()=>document.querySelector('#paint').toDataURL('image/png'));
  assert.equal(redo,after.png,'Clay roller native Redo restores exact artwork');
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('ZGEN_JOB_E_CLAY_ROLLER_DRY_NATIVE_HISTORY_PASS',JSON.stringify({
   brush:'roller',medium:'dry Canvas2D',nativeC4WetHead:false,
   realPaintPixels:true,exactUndoRedo:true,physicalSPen:false
  }));
  return {brush:'roller',dry:true,historyPass:true};
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const samples=[];
 for(const brush of wetBrushes)samples.push(await mark(brush,true));
 samples.push(await mark(dryBrush,false));
 const kinds=samples.filter(v=>!v.dry);
 const signatures=new Set(kinds.map(v=>[
  v.rect.width,v.rect.height,v.rect.area,v.ink
 ].join(':')));
 assert.ok(signatures.size>=4,'Five wet heads must produce at least four distinct native geometry/coverage signatures');
 const byName=Object.fromEntries(kinds.map(v=>[v.brush,v]));
 assert.notDeepEqual(byName.rigger.rect,byName.mop.rect,
  'Rigger thin liner and broad Mop must not share exact native crop');
 assert.notEqual(byName.flat.ink,byName.sponge.ink,
  'Flat and Sponge must have different deposited native pigment populations');
 console.log('ZGEN_JOB_E_FIVE_DISTINCT_C4_WET_HEAD_GEOMETRY_PASS',JSON.stringify({
  names:wetBrushes,distinctNativeSignatures:signatures.size,
  mopVsRiggerDistinct:true,flatVsSpongePigmentDistinct:true,
  nativeWetLayers:5,deviceApproval:false,allSizeProfilesAccepted:false
 }));
 console.log('ZGEN_JOB_E_SIX_BRUSH_SCOPE_CLASSIFIED_PASS',JSON.stringify({
  wetBrushes,dryHead:'Clay Roller',dryMedium:'Canvas2D',
  original26Job:'JOB-E/C4',sizeMatrixPending:true,
  ownerTabS9SpenPending:true,livePagesUntouched:true,releaseHeld:true
 }));
})().catch(e=>{console.error('ZGEN_JOB_E_SIX_HEAD_BROWSER_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
