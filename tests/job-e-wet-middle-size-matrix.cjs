/* ZGEN original S0 JOB-E/C4 | intermediate native wet size/geometry calibration.
 * One original C4 wet head per independent GitHub matrix job, 3 numeric sizes.
 * This does NOT certify official named XS/S/M/L/XL presets, pen tilt or device.
 * Every mark and pigmented C4 snapshot is real browser engine evidence.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const heads=['round','mop','flat','rigger','sponge'];
const testedBrush=process.env.ZGEN_BRUSH||'round';
assert.ok(heads.includes(testedBrush),'Unrecognized C4 wet head');
const sizes=[25,45,60];
let browser;
async function run(brush,size){
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
  },size);
  await page.waitForFunction(x=>window.__ZGEN_BETA_26.state().size===x,size);
  await page.evaluate(()=>{
   const b=document.querySelector('button[data-act="brush"]');
   if(!b)throw Error('Native brush control missing');
   b.click();
  });
  await page.locator('#drawer [data-brush="'+brush+'"]').tap();
  await page.waitForFunction(b=>window.__ZGEN_BETA_26.state().brush===b,brush);
  const box=await page.locator('#paint').boundingBox();
  assert.ok(box&&box.width>150&&box.height>220,'Real paper reachable');
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
   return {
    brush:window.__ZGEN_BETA_26.state().brush,
    size:window.__ZGEN_BETA_26.state().size,
    rect:{width:r.x1-r.x0,height:r.y1-r.y0,
      area:(r.x1-r.x0)*(r.y1-r.y0)},
    pigment:layers.inkA+layers.inkB+layers.fixedA+layers.fixedB,
    nativeWetLayers:Object.keys(layers).length,phase:window.__C4.getState().phase
   };
  });
  assert.equal(measurements.size,size);
  assert.equal(measurements.brush,brush);
  assert.equal(measurements.phase,'FIX');
  assert.ok(measurements.pigment>0,'Authentic C4 wet pigment required');
  assert.ok(measurements.rect.area>0);
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log('ZGEN_JOB_E_NATIVE_WET_UI_DIAMETER_PIXEL_PASS',JSON.stringify({
   ...measurements,pointerType:'simulated-pen',physicalSPen:false
  }));
  return measurements;
 }finally{await context.close();}
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports={};
 const samples=[];
 for(const size of sizes)samples.push(await run(testedBrush,size));
 for(let i=1;i<samples.length;i++){
  const small=samples[i-1],large=samples[i];
  assert.ok(large.pigment>small.pigment,
   'Intermediate size must increase actual C4 pigment coverage for '+testedBrush+' '+small.size+'->'+large.size);
  assert.ok(large.rect.area>small.rect.area,
   'Intermediate size must increase C4 crop area for '+testedBrush+' '+small.size+'->'+large.size);
 }
 reports[testedBrush]=samples.map(({size,pigment,rect})=>({size,pigment,cropArea:rect.area}));
 console.log('ZGEN_JOB_E_INTERMEDIATE_NATIVE_WET_SIZE_MONOTONIC_PASS',JSON.stringify({
  brush:testedBrush,samples:reports[testedBrush],
  realNativeWetMarks:3,nativeFiveBuffers:true,
  genuineFixLifecycle:true,
  namedXSXLProfilesAccepted:false,physicalSPen:false,pressureTilt:false,
  original26Job:'JOB-E/C4',releaseHeld:true
 }));
})().catch(e=>{console.error('ZGEN_JOB_E_SIZE_EXTREMES_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
