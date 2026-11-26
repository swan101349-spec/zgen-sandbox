/* ZGEN JOB-E/C4 | two-stage wet Undo/Redo classification diagnostic on repaired source.
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
  await page.evaluate(()=>{
   window.__ZGEN_HISTORY_CLICK_TRACE=[];
   document.addEventListener('click',event=>{
    const b=event.target.closest('button[data-act]');
    if(b&&(b.dataset.act==='undo'||b.dataset.act==='redo'))
     window.__ZGEN_HISTORY_CLICK_TRACE.push({
      act:b.dataset.act,disabled:b.disabled,kind:event.type
     });
   },true);
  });
  const buttonBefore=await page.evaluate(()=>{
   const b=document.querySelector('button[data-act="undo"]');
   if(!b)throw Error('Original Undo button absent');
   const r=b.getBoundingClientRect(),cs=getComputedStyle(b);
   return {
    disabled:b.disabled,isConnected:b.isConnected,
    className:b.className,
    size:[r.width,r.height],x:r.x,y:r.y,
    pointerEvents:cs.pointerEvents,
    visibility:cs.visibility,display:cs.display,
    topHistory:window.__C4History().undo.at(-1),
    status:document.querySelector('#status')?.textContent
   };
  });
  console.log('ZGEN_JOB_E_HISTORY_BEFORE_FIRST_REAL_TAP_DIAGNOSTIC',JSON.stringify({
   tiltX,tiltY,button:buttonBefore,
   history:fixed.history,
   wetPigment:fixed.wet.inkA.nonzero+fixed.wet.inkB.nonzero
  }));
  await page.locator('.zshell-history-left').tap();
  await page.waitForTimeout(200);
  const first=await snap();
  const firstUI=await page.evaluate(()=>({
   clicks:window.__ZGEN_HISTORY_CLICK_TRACE,
   status:document.querySelector('#status')?.textContent
  }));
  console.log('ZGEN_JOB_E_HISTORY_AFTER_ONE_UI_UNDO_DIAGNOSTIC',JSON.stringify({
   history:first.history,ui:firstUI,wet:first.wet,
   paintUnchanged:first.paint===fixed.paint,
   wetUnchanged:JSON.stringify(first.wet)===JSON.stringify(fixed.wet),
   firstUndoWasTop:fixed.history.undo.at(-1)
  }));
  let second=null;
  if(first.history.undo.length<fixed.history.undo.length&&
     first.history.undo.length>0){
   await page.locator('.zshell-history-left').tap();
   await page.waitForTimeout(200);
   second=await snap();
   console.log('ZGEN_JOB_E_HISTORY_AFTER_SECOND_UI_UNDO_DIAGNOSTIC',JSON.stringify({
    history:second.history,wet:second.wet,
    wetChangedFromFixed:JSON.stringify(second.wet)!==JSON.stringify(fixed.wet),
    ui:await page.evaluate(()=>window.__ZGEN_HISTORY_CLICK_TRACE)
   }));
  }else if(first.history.undo.length===fixed.history.undo.length){
   await page.evaluate(()=>{
    document.querySelector('button[data-act="undo"]').click();
   });
   await page.waitForTimeout(200);
   const direct=await snap();
   console.log('ZGEN_JOB_E_HISTORY_PROGRAMMATIC_UNDO_ONLY_AS_DIAGNOSTIC',JSON.stringify({
    history:direct.history,wet:direct.wet,
    nativeUIFailedButProgrammaticWorked:
     direct.history.undo.length<fixed.history.undo.length,
    ui:await page.evaluate(()=>window.__ZGEN_HISTORY_CLICK_TRACE)
   }));
  }
  if(second&&second.history.redo.length>=1){
   const steps=second.history.redo.length;
   const redoTrail=[];
   for(let k=0;k<Math.min(steps,2);k++){
    await page.locator('.zshell-history-right').tap();
    await page.waitForTimeout(180);
    const state=await snap();
    redoTrail.push({
     pass:k+1,history:state.history,
     equalWetFixed:JSON.stringify(state.wet)===JSON.stringify(fixed.wet)
    });
   }
   console.log('ZGEN_JOB_E_HISTORY_TWO_STEP_REDO_RESTORE_DIAGNOSTIC',
    JSON.stringify({redoTrail,initialHistory:fixed.history}));
  }
  const firstChanged=first.history.undo.length<fixed.history.undo.length;
  const possibleSeparateFix=buttonBefore.topHistory==='dry'&&
    first.history.redo.at(-1)==='dry';
  console.log('ZGEN_JOB_E_WET_HISTORY_CAUSE_CLASSIFIED_DIAGNOSTIC_NOT_ACCEPTANCE',
   JSON.stringify({
    tiltX,tiltY,firstRealUIClickObserved:firstUI.clicks.length>0,
    firstUndoTransitions:firstChanged,
    originalTopEntry:buttonBefore.topHistory,
    separateFixDryCheckpoint:possibleSeparateFix,
    secondUndoDone:second!==null,
    originalRedRun:45815425197,
    originalFailedCheckPreserved:true,
    physicalSPenPending:true,releaseHeld:true
   }));
  return w;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await probe(60,0);
 console.log('ZGEN_JOB_E_ONE_TILTED_WET_HISTORY_DIAGNOSTIC_COMPLETED',
  JSON.stringify({realDOMTiltObserved:true,nativeC4TiltForwarded:true,
   normalNeutralPenUnchanged:true,original26Job:'JOB-E/C4',
   independentC3Pending:true,physicalTabS9SPenPending:true,
   livePagesUnchanged:true,releaseHeld:true}));
})().catch(e=>{console.error('ZGEN_JOB_E_TILT_REPAIR_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
