/* ZGEN original S0 JOB-E/C4 | native C4 pressure/diameter response from
 * REAL DOM PointerEvent pressure (CDP pen .20 and .85), constant UI size45.
 * A pressure QA fixture is NOT a Samsung S Pen or tilt hardware acceptance.
 * Every mark and pigmented C4 snapshot is real browser engine evidence.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const heads=['round','mop','flat','rigger','sponge'];
const testedBrush=process.env.ZGEN_BRUSH||'round';
assert.ok(heads.includes(testedBrush),'Unknown wet brush');
const pressureLevels=[.20,.85];
const fixedDiameter=45;
let browser;
async function run(brush,pressure){
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__C4?.snapshot&&
   window.__ZGEN_BETA_26?.state&&window.__ZGEN_ART_RECOVERY?.status().ready &&
   !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
  await page.evaluate(()=>{
   const water=document.querySelector('button[data-act="water"]');
   if(!water)throw Error('Native Water & Material control missing');
   water.click();
  });
  await page.locator('#drawer input[data-setting="size"]').waitFor({state:'visible',timeout:10000});
  await page.evaluate(size=>{
   const input=document.querySelector('#drawer input[data-setting="size"]');
   if(!input)throw Error('Actual numeric diameter control missing');
   input.value=String(size);
   input.dispatchEvent(new Event('input',{bubbles:true}));
  },fixedDiameter);
  await page.waitForFunction(x=>window.__ZGEN_BETA_26.state().size===x,fixedDiameter);
  await page.evaluate(()=>{
   const b=document.querySelector('button[data-act="brush"]');
   if(!b)throw Error('Native brush control missing');
   b.click();
  });
  await page.locator('#drawer [data-brush="'+brush+'"]').tap();
  await page.waitForFunction(b=>window.__ZGEN_BETA_26.state().brush===b,brush);
  await page.evaluate(()=>{
   const canvas=document.querySelector('#paint');
   window.__ZGEN_JOB_E_OBSERVED_PEN=[];
   for(const name of ['pointerdown','pointermove']){
    canvas.addEventListener(name,e=>{
     if(e.pointerType==='pen'&&e.pressure>0)
      window.__ZGEN_JOB_E_OBSERVED_PEN.push({
       type:name,pressure:e.pressure,tiltX:e.tiltX,tiltY:e.tiltY
      });
    },{capture:true});
   }
  });
  const box=await page.locator('#paint').boundingBox();
  assert.ok(box&&box.width>150&&box.height>220,'Real paper reachable');
  const pen=await context.newCDPSession(page);
  for(let i=0;i<15;i++){
   await pen.send('Input.dispatchMouseEvent',{
    type:i?'mouseMoved':'mousePressed',pointerType:'pen',
    x:box.x+box.width*(.18+.6*i/14),
    y:box.y+box.height*(.40+Math.sin(i/14*Math.PI)*.025),
    button:'left',buttons:1,clickCount:i?0:1,force:pressure
   });
  }
  await pen.send('Input.dispatchMouseEvent',{
   type:'mouseReleased',pointerType:'pen',
   x:box.x+box.width*.78,y:box.y+box.height*.40,button:'left',buttons:0,force:0
  });
  await pen.detach();
  await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:15000});
  await page.waitForFunction(()=>{
   const st=window.__C4.getState();
   return st.phase==='FIX'&&!st.active&&!st.wet.active&&!st.wet.fixing;
  },null,{timeout:55000});
  const measurements=await page.evaluate(()=>{
   const w=window.__C4.snapshot().document.whole,keys=Object.keys(w.layers).sort();
   if(keys.join(',')!=='fixedA,fixedB,inkA,inkB,wet')
     throw Error('Missing any of five original C4 wet layers');
   const layers={};
   for(const [name,arr] of Object.entries(w.layers)){
    if(!(arr instanceof Uint16Array))throw Error('Non-native GPU C4 half-float layer '+name);
    let n=0;for(let i=0;i<arr.length;i++)if(arr[i])n++;
    layers[name]=n;
   }
   const r=w.rect;
   if(!r)throw Error('Wet brush did not define a native bounded crop');
   const observed=(window.__ZGEN_JOB_E_OBSERVED_PEN||[]).map(x=>x.pressure);
   if(observed.length<4)throw Error('Native DOM did not observe enough pen-pressure samples');
   return {
    brush:window.__ZGEN_BETA_26.state().brush,
    size:window.__ZGEN_BETA_26.state().size,
    observedPenEvents:observed.length,
    observedPressure:observed.reduce((a,b)=>a+b,0)/observed.length,
    rect:{width:r.x1-r.x0,height:r.y1-r.y0,
      area:(r.x1-r.x0)*(r.y1-r.y0)},
    pigment:layers.inkA+layers.inkB+layers.fixedA+layers.fixedB,
    nativeWetLayers:Object.keys(layers).length,phase:window.__C4.getState().phase
   };
  });
  assert.equal(measurements.size,fixedDiameter);
  assert.ok(Math.abs(measurements.observedPressure-pressure)<.06,
   'Real DOM PointerEvent pressure must match injected pen force');
  assert.equal(measurements.brush,brush);
  assert.equal(measurements.phase,'FIX');
  assert.ok(measurements.pigment>0,'Authentic C4 wet pigment required');
  assert.ok(measurements.rect.area>0);
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log('ZGEN_JOB_E_NATIVE_WET_PEN_PRESSURE_SAMPLE_PASS',JSON.stringify({
   ...measurements,requestedPressure:pressure,
   pointerType:'simulated-pen',physicalSPen:false
  }));
  return measurements;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports={};
 const low=await run(testedBrush,pressureLevels[0]);
 const high=await run(testedBrush,pressureLevels[1]);
 const report={
  brush:testedBrush,fixedDiameter,
  lowPressure:low.observedPressure,highPressure:high.observedPressure,
  lowPigment:low.pigment,highPigment:high.pigment,
  lowArea:low.rect.area,highArea:high.rect.area,
  pigmentRatio:Math.round(100*high.pigment/low.pigment)/100,
  areaRatio:Math.round(100*high.rect.area/low.rect.area)/100
 };
 assert.ok(high.pigment>low.pigment,
  'Higher real pen-pressure must yield more native pigment for '+testedBrush);
 assert.ok(high.rect.area>low.rect.area,
  'Higher real pen-pressure must increase native wet footprint for '+testedBrush);
 console.log('ZGEN_JOB_E_NATIVE_PRESSURE_SENSITIVE_WET_PIGMENT_PASS',JSON.stringify(report));
 console.log('ZGEN_JOB_E_PRESSURE_SCOPE_CLASSIFIED_PASS',JSON.stringify({
  original26Job:'JOB-E/C4',head:testedBrush,
  actualDOMPressureObserved:true,physicalSamsungPen:false,tiltUnverified:true,
  allNamedXSXLSizeProfilesUnverified:true,noOwnerArt:true,releaseHeld:true
 }));
})().catch(e=>{console.error('ZGEN_JOB_E_SIZE_EXTREMES_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
