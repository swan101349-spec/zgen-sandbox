/* ZGEN original JOB-K/C1 | automatic C4 FIX is invisible to C1 history;
 * Test three rapid wet strokes before auto-FIX, then UI history and exact final recovery.
 * Simulated pen only; Samsung S Pen physical acceptance remains PENDING.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
let browser;
async function probe(){
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
  const states=[await snap()];
  for(const [y,pressure,tiltX,tiltY] of [[.30,.35,60,0],[.45,.7,0,60],[.60,.9,0,0]]){
  await page.evaluate(()=>{window.__ZGEN_TILT_WITNESS.dom.length=0;window.__ZGEN_TILT_WITNESS.script.length=0;});
  const pen=await context.newCDPSession(page);
  for(let i=0;i<12;i++){
   await pen.send('Input.dispatchMouseEvent',{
    type:i?'mouseMoved':'mousePressed',pointerType:'pen',
    x:box.x+box.width*(.28+.38*i/11),
    y:box.y+box.height*(y+.01*Math.sin(i/3)),
    button:'left',buttons:1,clickCount:i?0:1,force:pressure,
    tiltX,tiltY
   });
  }
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:box.x+box.width*.66,y:box.y+box.height*y,
   button:'left',buttons:0,force:0,tiltX,tiltY
  });
  await pen.detach();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:15000});
  if(states.length<3){
   const phase=await page.evaluate(()=>window.__C4.getState().phase);
   assert.notEqual(phase,'FIX','Rapid sequence accidentally waited for auto-FIX');
  }else{
   await page.waitForFunction(()=>{
    const z=window.__C4.getState();
    return z.phase==='FIX'&&!z.active&&!z.wet.active&&!z.wet.fixing;
   },null,{timeout:45000});
  }

  const witness=await page.evaluate(()=>window.__ZGEN_TILT_WITNESS);
  assert.ok(witness.dom.length>=8);
  assert.ok(witness.dom.every(e=>Math.abs(e.pressure-pressure)<.02&&e.tiltX===tiltX&&e.tiltY===tiltY));
  assert.ok(witness.script.length>=8&&witness.script.every(e=>e.queueTiltX===tiltX&&e.queueTiltY===tiltY));
  const current=await snap();
  assert.deepEqual(current.history,{undo:Array(states.length).fill('stroke'),redo:[]});
  assert.notDeepEqual(current.wet,states.at(-1).wet);
  states.push(current);
  }
  // Intermediate wet states continue evolving; compare captured history states across
  // repeated restoration, rather than racing a pre-pointer snapshot against simulation.
  const restored=[];
  for(let cycle=0;cycle<2;cycle++){
   for(let n=2;n>=0;n--){
    await page.locator('.zshell-history-left').tap();
    await page.waitForFunction(n=>window.__C4History().undo.length===n,n,{timeout:8000});
    const s=await snap();
    assert.deepEqual(s.history,{undo:Array(n).fill('stroke'),redo:Array(3-n).fill('stroke')});
    if(n===0){assert.deepEqual(s.wet,states[0].wet);assert.equal(s.paint,states[0].paint);}
    if(cycle===0)restored[n]=s;
    else {assert.deepEqual(s.wet,restored[n].wet);assert.equal(s.paint,restored[n].paint);}
   }
   for(let n=1;n<=3;n++){
    await page.locator('.zshell-history-right').tap();
    await page.waitForFunction(n=>window.__C4History().undo.length===n,n,{timeout:8000});
    const s=await snap();
    assert.deepEqual(s.history,{undo:Array(n).fill('stroke'),redo:Array(3-n).fill('stroke')});
    const expected=n===3?states[3]:restored[n];
    assert.deepEqual(s.wet,expected.wet);assert.equal(s.paint,expected.paint);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('ZGEN_JOB_K_THREE_RAPID_WET_STROKES_HISTORY_PASS',JSON.stringify({strokes:3,undo:6,redo:6,allFiveLayerHashesCompared:true,rapidOverlappingWetStrokesTested:true,physicalSPenPending:true}));
 }finally{await context.close();}
}
(async()=>{browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});await probe();})().catch(e=>{console.error('ZGEN_JOB_K_MULTI_WET_HISTORY_FAIL',e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close()});
