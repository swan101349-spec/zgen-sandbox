/* ZGEN original JOB-K/C1 | EXPLICIT native Dry remains a separate C1 action.
 * One simulated wet pen stroke then actual Dry Wash menu tap; Undo/Redo twice.
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
  const phaseBefore=await page.evaluate(()=>{
   const before=window.__C4.getState();
   if(before.phase!=='FLOW'||before.active||!before.dirty)
    throw Error('Manual Dry UI must be invoked during live FLOW');
   const more=document.querySelector('[data-act="more"]');
   if(!more)throw Error('Original Tools menu missing');more.click();
   return before.phase;
  });
  await page.locator('#drawer [data-act="dry"]').tap();
  const manual=await page.evaluate(phaseBefore=>({phaseBefore,
   history:window.__C4History(),phaseAfter:window.__C4.getState().phase}),phaseBefore);
  assert.equal(manual.phaseBefore,'FLOW');
  assert.equal(manual.phaseAfter,'SETTLE');
  assert.deepEqual(manual.history,{undo:['stroke','dry'],redo:[]},
   'Actual Dry Wash menu must preserve separate Dry history entry');
  console.log('ZGEN_JOB_K_ACTUAL_UI_DRY_RETURNS_SEPARATE_HISTORY_ENTRY_PASS',
   JSON.stringify({tiltX,tiltY,...manual}));
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
  console.log('ZGEN_JOB_K_ACTUAL_UI_DRY_TILT_QUEUE_PASS',JSON.stringify({
   injected:{tiltX,tiltY},domPenSamples:observed.length,
   c4ScriptSamples:w.witness.script.length,
   c4ScriptTiltEqualsDOM:true,nativeWetFix:true,
   original26Job:'JOB-K/C1',
   qaOnly:true,physicalSPenAccepted:false,releaseHeld:true
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
  assert.deepEqual(fixed.history,{undo:['stroke','dry'],redo:[]},
   'Artist-triggered Dry must have separate history label after FIX');
  assert.ok(fixed.wet.inkA.nonzero+fixed.wet.inkB.nonzero>0,
   'A manually dried real wet stroke contains C4 pigment');
  await page.locator('.zshell-history-left').tap();
  await page.waitForFunction(()=>window.__C4History().redo.includes('dry'),null,{timeout:8000});
  const once=await snap();
  assert.deepEqual(once.history,{undo:['stroke'],redo:['dry']},
   'First Undo must reverse explicitly requested Dry');
  assert.ok(once.wet.inkA.nonzero+once.wet.inkB.nonzero>0,
   'First Undo must retain underlying painted wet stroke');
  await page.locator('.zshell-history-left').tap();
  await page.waitForFunction(()=>window.__C4History().redo.includes('stroke'),null,{timeout:8000});
  const twice=await snap();
  assert.deepEqual(twice.history,{undo:[],redo:['dry','stroke']},
   'Second Undo should erase wet stroke under deliberate Dry action');
  assert.equal(twice.wet.inkA.nonzero+twice.wet.inkB.nonzero,0,
   'Second Undo truly removes all wet pigment');
  await page.locator('.zshell-history-right').tap();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:8000});
  const again=await snap();
  assert.deepEqual(again.history,{undo:['stroke'],redo:['dry']});
  await page.locator('.zshell-history-right').tap();
  await page.waitForFunction(()=>window.__C4History().redo.length===0,null,{timeout:8000});
  const restored=await snap();
  assert.deepEqual(restored.history,fixed.history);
  assert.deepEqual(restored.wet,fixed.wet,
   'Two native Redos restore 5 exact C4 arrays after deliberate Dry');
  assert.equal(restored.paint,fixed.paint);
  assert.deepEqual(errors,[]);
  console.log('ZGEN_JOB_K_ACTUAL_UI_DRY_TWO_UI_UNDOS_REDOS_EXACT_PASS',JSON.stringify({
   tiltX,tiltY,manualInvocation:'actual Dry Wash menu touch before automatic FIX',
   userVisibleManualDryUndoLabel:once.history.redo.at(-1),
   afterFirstUndo:once.history,
   afterSecondUndo:twice.history,
   afterTwoRedo:restored.history,
   allFiveNativeC4WetHashesExact:true,
   realOwnerArtTouched:false,physicalSPenPending:true,releaseHeld:true
  }));
  return w;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await probe(60,0);
 console.log('ZGEN_JOB_K_ACTUAL_UI_DRY_NATIVE_HISTORY_PRESERVED_PASS',
  JSON.stringify({realDOMTiltObserved:true,nativeC4TiltForwarded:true,
   neutralPenTested:false,original26Job:'JOB-K/C1',
   independentC3Pending:true,physicalTabS9SPenPending:true,
   livePagesUnchanged:true,releaseHeld:true}));
})().catch(e=>{console.error('ZGEN_JOB_K_ACTUAL_UI_DRY_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
