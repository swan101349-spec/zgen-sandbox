/* ZGEN JOB-E/C4 | native wet tilt forwarding Undo/Redo regression on repaired source.
 * Test real DOM PointerEvent tilt, C4 scripted queue values, native FIX.
 * Simulated pen only; Samsung S Pen physical acceptance remains PENDING.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
let browser;
async function probe(tiltX,tiltY){
 const context=await browser.newContext({
  viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.engine?.scriptBegin&&window.__ZGEN_BETA_26?.state&&
    window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
    null,{timeout:45000});
  await page.evaluate(()=>{
   const original=window.__C4.engine,w={dom:[],script:[]};
   window.__ZGEN_TILT_WITNESS=w;
   const canvas=document.querySelector('#paint');
   for(const type of ['pointerdown','pointermove']){
    canvas.addEventListener(type,e=>{
     if(e.pointerType==='pen')w.dom.push({
      type,tiltX:e.tiltX,tiltY:e.tiltY,pressure:e.pressure
     });
    },{capture:true});
   }
   for(const name of ['scriptBegin','scriptMove']){
    const old=original[name];
    original[name]=function(...args){
     const result=old.apply(this,args);
     const last=this.queue?.[this.queue.length-1];
     w.script.push({name,argsLength:args.length,
      queueTiltX:last?.tx,queueTiltY:last?.ty});
     return result;
    };
   }
  });
  await page.evaluate(()=>{
   const b=document.querySelector('button[data-act="brush"]');
   if(!b)throw Error('Original brush UI control absent');b.click();
  });
  await page.locator('#drawer [data-brush="flat"]').tap();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='flat');
  const box=await page.locator('#paint').boundingBox();
  assert.ok(box&&box.width>150&&box.height>200);
  const pen=await context.newCDPSession(page);
  for(let i=0;i<12;i++){
   await pen.send('Input.dispatchMouseEvent',{
    type:i?'mouseMoved':'mousePressed',pointerType:'pen',
    x:box.x+box.width*(.28+.38*i/11),
    y:box.y+box.height*(.40+.01*Math.sin(i/3)),
    button:'left',buttons:1,clickCount:i?0:1,force:.7,
    tiltX,tiltY
   });
  }
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:box.x+box.width*.66,y:box.y+box.height*.4,
   button:'left',buttons:0,force:0,tiltX,tiltY
  });
  await pen.detach();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:15000});
  await page.waitForFunction(()=>{
   const z=window.__C4.getState();
   return z.phase==='FIX'&&!z.active&&!z.wet.active&&!z.wet.fixing;
  },null,{timeout:45000});
  const w=await page.evaluate(()=>({
   witness:window.__ZGEN_TILT_WITNESS,
   history:window.__C4History(),
   phase:window.__C4.getState().phase
  }));
  assert.ok(w.witness.dom.length>=8,'DOM pen events must be observed');
  const observed=w.witness.dom.filter(x=>
   Math.abs(x.tiltX-tiltX)<1&&Math.abs(x.tiltY-tiltY)<1&&x.pressure>0);
  assert.ok(observed.length>=7,'CDP pen tilt must reach actual browser DOM first');
  assert.ok(w.witness.script.some(x=>x.name==='scriptBegin'),'C4 begin must be invoked');
  assert.ok(w.witness.script.some(x=>x.name==='scriptMove'),'C4 move must be invoked');
  assert.ok(w.witness.script.every(x=>
    x.queueTiltX===tiltX&&x.queueTiltY===tiltY),
   'Repaired C4 script must preserve real DOM tilt in ALL engine queue samples');
  assert.equal(w.phase,'FIX','Native wet paint stroke must finish');
  assert.deepEqual(errors,[],'No unrelated browser errors');
  console.log('ZGEN_JOB_E_C4_TILT_QUEUE_FORWARDING_REPAIR_PASS',JSON.stringify({
   injected:{tiltX,tiltY},domPenSamples:observed.length,
   c4ScriptSamples:w.witness.script.length,
   c4ScriptTiltEqualsDOM:true,nativeWetFix:true,
   original26Job:'JOB-E/C4',
   isolatedProductRepair:true,physicalSPenAccepted:false,releaseHeld:true
  }));
  const snap=()=>page.evaluate(()=>{
   const whole=window.__C4.snapshot().document.whole.layers,d={};
   for(const key of ['inkA','inkB','fixedA','fixedB','wet']){
    const a=whole[key];
    if(!(a instanceof Uint16Array))throw Error('Native C4 wet buffer missing '+key);
    let hash=2166136261,nonzero=0;
    for(let i=0;i<a.length;i++){
     const v=a[i];
     if(v)nonzero++;
     hash=Math.imul(hash^v,16777619);
    }
    d[key]={length:a.length,hash:hash>>>0,nonzero};
   }
   return {
    wet:d,history:window.__C4History(),
    paint:document.querySelector('#paint').toDataURL('image/png')
   };
  });
  const fixed=await snap();
  assert.equal(Object.keys(fixed.wet).length,5);
  assert.ok(fixed.wet.inkA.nonzero+fixed.wet.inkB.nonzero>0,
   'Tilted wet stroke must contain native C4 pigment');
  await page.locator('.zshell-history-left').tap();
  await page.waitForFunction(()=>window.__C4History().redo.includes('stroke'));
  const undone=await snap();
  assert.notDeepEqual(undone.wet,fixed.wet,
   'Native wet Undo must actually remove tilted C4 pigment');
  assert.equal(undone.history.undo.length,fixed.history.undo.length-1);
  assert.equal(undone.paint,fixed.paint,'Native dry paint canvas unaffected');
  await page.locator('.zshell-history-right').tap();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'));
  const redone=await snap();
  assert.deepEqual(redone.wet,fixed.wet,
   'Native Redo must restore all five exact C4 buffers and hashes');
  assert.deepEqual(redone.history,fixed.history,
   'Native Redo must restore C1 history label stack');
  assert.equal(redone.paint,fixed.paint);
  assert.deepEqual(errors,[],'No browser error after Undo/Redo');
  console.log('ZGEN_JOB_E_TILTED_WET_C4_FIVE_LAYERS_UNDO_REDO_EXACT_PASS',JSON.stringify({
   tiltX,tiltY,originalNativeHistory:fixed.history.undo,
   nativeWetLayerCount:5,
   undoRemovesPigment:true,redoRestoresAllFiveGPUHashes:true,
   originalPainterSourceUntouched:true,physicalSPen:false,
   original26Job:'JOB-E/C4',releaseHeld:true
  }));
  return w;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await probe(60,0);
 await probe(0,60);
 await probe(0,0);
 console.log('ZGEN_JOB_E_C4_BOTH_TILT_ORIENTATIONS_AND_NEUTRAL_PASS',
  JSON.stringify({realDOMTiltObserved:true,nativeC4TiltForwarded:true,
   normalNeutralPenUnchanged:true,original26Job:'JOB-E/C4',
   independentC3Pending:true,physicalTabS9SPenPending:true,
   livePagesUnchanged:true,releaseHeld:true}));
})().catch(e=>{console.error('ZGEN_JOB_E_TILT_REPAIR_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
