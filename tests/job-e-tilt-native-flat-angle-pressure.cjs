/* JOB-E/C4: native Flat nib angle responds to real DOM simulated pen tilt
 * following source-pinned repair PR49, and neutral pressure remains intact.
 * Independent QA-only test: no main, no Pages, no real S Pen or owner art.
 */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
let browser;
async function probe(tiltX,tiltY,pressure){
 const context=await browser.newContext({
  viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.engine?.brushAngle&&
   window.__ZGEN_BETA_26?.state&&window.__ZGEN_ART_RECOVERY?.status().ready&&
   !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  await page.evaluate(()=>{
   const brush=document.querySelector('button[data-act="brush"]');
   if(!brush)throw Error('Native brush UI missing');brush.click();
  });
  await page.locator('#drawer [data-brush="flat"]').tap();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='flat');
  await page.evaluate(()=>{
   const original=window.__C4.engine,old=original.brushAngle;
   const w={dom:[],samples:0,sum:0,min:Infinity,max:-Infinity};
   window.__ZGEN_TILT_ANGLE_WITNESS=w;
   const canvas=document.querySelector('#paint');
   for(const type of ['pointerdown','pointermove']){
    canvas.addEventListener(type,e=>{
     if(e.pointerType==='pen')w.dom.push({
      tiltX:e.tiltX,tiltY:e.tiltY,pressure:e.pressure
     });
    },{capture:true});
   }
   original.brushAngle=function(...args){
    const theta=old.apply(this,args);
    w.samples++;
    w.sum+=theta;
    w.min=Math.min(w.min,theta);
    w.max=Math.max(w.max,theta);
    return theta;
   };
  });
  const box=await page.locator('#paint').boundingBox();
  assert.ok(box&&box.width>150&&box.height>200);
  const pen=await context.newCDPSession(page);
  for(let i=0;i<12;i++){
   await pen.send('Input.dispatchMouseEvent',{
    type:i?'mouseMoved':'mousePressed',pointerType:'pen',
    x:box.x+box.width*(.48+.07*i/11),
    y:box.y+box.height*(.43+.002*Math.sin(i/3)),
    button:'left',buttons:1,clickCount:i?0:1,
    force:pressure,tiltX,tiltY
   });
  }
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:box.x+box.width*.55,y:box.y+box.height*.43,
   button:'left',buttons:0,force:0,tiltX,tiltY
  });
  await pen.detach();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:10000});
  await page.waitForFunction(()=>{
   const st=window.__C4.getState();
   return st.phase==='FIX'&&!st.active&&!st.wet.active&&!st.wet.fixing;
  },null,{timeout:45000});
  const report=await page.evaluate(()=>{
   const w=window.__ZGEN_TILT_ANGLE_WITNESS,
    whole=window.__C4.snapshot().document.whole,
    inkA=whole.layers.inkA,inkB=whole.layers.inkB;
   if(!(inkA instanceof Uint16Array&&inkB instanceof Uint16Array))
    throw Error('Native GPU half float pigment arrays missing');
   let pigment=0;for(const arr of [inkA,inkB]){
    for(let i=0;i<arr.length;i++)if(arr[i])pigment++;
   }
   return {
    angles:w.samples,angleMeanRadians:w.sum/Math.max(1,w.samples),
    angleMin:w.min,angleMax:w.max,
    penEvents:w.dom,pigment,
    nativeHistory:window.__C4History().undo.slice(),
    phase:window.__C4.getState().phase
   };
  });
  assert.ok(report.angles>8,'Native Flat brush nib did not compute angle repeatedly');
  assert.ok(report.penEvents.length>=8,'Real DOM did not observe actual simulated pen');
  assert.ok(report.penEvents.filter(e=>
    e.tiltX===tiltX&&e.tiltY===tiltY&&Math.abs(e.pressure-pressure)<.06
   ).length>=8,'Tilt AND pressure need to reach genuine DOM');
  const target=tiltX?0:tiltY?-Math.PI/2:40*Math.PI/180;
  assert.ok(Math.abs(report.angleMeanRadians-target)<.17,
   'Native C4 Flat brush actual nib angle must match azimuth/neutral preset');
  assert.ok(report.pigment>0,'Actual GPU native wet pigment pixels required');
  assert.equal(report.phase,'FIX');
  assert.deepEqual(errors,[],'Browser runtime JS must be error-free');
  const compact={
   tiltX,tiltY,pressure,observedDomEvents:report.penEvents.length,
   nativeComputedNibAngles:report.angles,
   meanAngleDegrees:Math.round(100*report.angleMeanRadians*180/Math.PI)/100,
   expectedAngleDegrees:Math.round(100*target*180/Math.PI)/100,
   pigmentedHalfFloatValues:report.pigment,
   realC4NativeWetFix:true,physicalSpen:false
  };
  console.log('ZGEN_JOB_E_ACTUAL_NATIVE_FLAT_TILT_NIB_ANGLE_PASS',JSON.stringify(compact));
  return compact;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const horizontal=await probe(60,0,.7),
   vertical=await probe(0,60,.7),
   neutral=await probe(0,0,.7);
 assert.ok(horizontal.meanAngleDegrees>vertical.meanAngleDegrees+65,
   'Real wet Flat orientation must rotate substantially when stylus azimuth changes');
 assert.ok(neutral.meanAngleDegrees>horizontal.meanAngleDegrees+25,
   'Neutral pen must retain historical preset 40-degree Flat angle');
 const low=await probe(0,0,.20),high=await probe(0,0,.85);
 assert.ok(high.pigmentedHalfFloatValues>low.pigmentedHalfFloatValues,
   'Tilt repair must preserve Flat pen-pressure pigment scaling');
 console.log('ZGEN_JOB_E_TILT_REPAIR_INDEPENDENT_ANGLE_AND_PRESSURE_PASS',JSON.stringify({
  sourceRepairSHA:'946b742e38283e29db08d2d5d298ef11b524aa46',
  xAngle:horizontal.meanAngleDegrees,
  yAngle:vertical.meanAngleDegrees,
  neutralAngle:neutral.meanAngleDegrees,
  pressureLowPigment:low.pigmentedHalfFloatValues,
  pressureHighPigment:high.pigmentedHalfFloatValues,
  penInput:'simulated DOM',physicalGalaxyTabS9:'PENDING',
  independentC3:'PENDING',noLivePagesChanged:true,releaseHeld:true
 }));
})().catch(e=>{console.error('ZGEN_JOB_E_TILT_REPAIR_ANGLE_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
