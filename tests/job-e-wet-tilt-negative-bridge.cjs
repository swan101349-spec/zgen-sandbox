/* ZGEN JOB-E/C4 | NEGATIVE: check real DOM stylus tilt forwarding.
 * Instrument C4 SCRIPT INPUT in disposable Chromium; do not modify source.
 * A green workflow means the MISSING tilt bridge was detected, NOT a tilt PASS.
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
  assert.ok(w.witness.script.every(x=>x.queueTiltX===0&&x.queueTiltY===0),
   'Expected unresolved C4 script input tilt-forwarding defect');
  assert.equal(w.phase,'FIX','Native wet paint stroke must finish');
  assert.deepEqual(errors,[],'No unrelated browser errors');
  console.log('ZGEN_JOB_E_STYLUS_TILT_C4_QUEUE_NEGATIVE_CONFIRMED',JSON.stringify({
   injected:{tiltX,tiltY},domPenSamples:observed.length,
   c4ScriptSamples:w.witness.script.length,
   c4ScriptTiltAlwaysZero:true,
   reportedStatus:'FAIL_UNSUPPORTED_TILT_FORWARDING',
   original26Job:'JOB-E/C4',sourceModified:false,
   ownerSPenAccepted:false,releaseHeld:true
  }));
  return w;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await probe(60,0);
 await probe(0,60);
 console.log('ZGEN_JOB_E_TILT_NEGATIVE_CONTRACT_REPRODUCED_NOT_A_FEATURE_PASS',
  JSON.stringify({realDOMTiltObserved:true,nativeC4TiltForwarded:false,
   original26Job:'JOB-E/C4',repairRequiredBeforeTiltAcceptance:true,
   independentC3Pending:true,ownerTabS9SPenPending:true,
   livePagesUnchanged:true,releaseHeld:true}));
})().catch(e=>{console.error('ZGEN_JOB_E_TILT_NEGATIVE_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
