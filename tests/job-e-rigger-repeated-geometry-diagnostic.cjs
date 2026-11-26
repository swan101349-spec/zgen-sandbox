/* ZGEN original S0 JOB-E/C4 | Rigger geometry anomaly diagnostic.
 * Preserve original red 45->60 size area test. This is data collection,
 * not acceptance. Repeats identical simulated input to classify variability.
 * Every mark and pigmented C4 snapshot is real browser engine evidence.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const testedBrush='rigger';
const sizes=[45,60];
const repetitions=3;
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
   const width=r.x1-r.x0,height=r.y1-r.y0;
   const a=w.layers.inkA,b=w.layers.inkB;
   if(a.length!==width*height*4||b.length!==width*height*4)
     throw Error('Native C4 layer cannot be indexed using crop dimensions');
   let xMin=width,yMin=height,xMax=-1,yMax=-1,painted=0;
   for(let p=0;p<width*height;p++){
    const q=p*4;
    if(a[q]||a[q+1]||a[q+2]||a[q+3]||
       b[q]||b[q+1]||b[q+2]||b[q+3]){
      const x=p%width,y=Math.floor(p/width);
      if(x<xMin)xMin=x;if(x>xMax)xMax=x;
      if(y<yMin)yMin=y;if(y>yMax)yMax=y;
      painted++;
    }
   }
   if(!painted)throw Error('No actual C4 pigmented pixels in native layer');
   return {
    pigmentPixels:painted,
    pigmentBounds:{width:xMax-xMin+1,height:yMax-yMin+1,
      area:(xMax-xMin+1)*(yMax-yMin+1)},
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
 const trials=[];
 for(let rep=0;rep<repetitions;rep++){
  const samples=[];
  for(const size of sizes)samples.push(await run(testedBrush,size));
  const smaller=samples[0],larger=samples[1];
  trials.push({
   repeat:rep+1,
   smaller:{size:smaller.size,pigment:smaller.pigment,
    cropArea:smaller.rect.area,pigmentedPixelCount:smaller.pigmentPixels,
    pixelBoundingArea:smaller.pigmentBounds.area},
   larger:{size:larger.size,pigment:larger.pigment,
    cropArea:larger.rect.area,pigmentedPixelCount:larger.pigmentPixels,
    pixelBoundingArea:larger.pigmentBounds.area},
   pigmentMonotonic:larger.pigment>smaller.pigment,
   cropAreaMonotonic:larger.rect.area>smaller.rect.area,
   pigmentedPixelMonotonic:larger.pigmentPixels>smaller.pigmentPixels,
   actualPigmentBoundingBoxMonotonic:
    larger.pigmentBounds.area>smaller.pigmentBounds.area
  });
 }
 const nonMonotonic=trials.filter(t=>!t.cropAreaMonotonic).length;
 console.log('ZGEN_JOB_E_RIGGER_GEOMETRY_REPEATED_DIAGNOSTIC_NOT_ACCEPTANCE',JSON.stringify({
  originalJob:'JOB-E/C4',brush:testedBrush,repetitions,
  originalMiddleSizeRun:45812427778,originalRiggerJob:139883418852,
  originalRed45To60Preserved:true,cropNonMonotonicPairs:nonMonotonic,
  trials,remainingRisk:'Rigger middle-size area may be non-monotonic',
  productCodeUnchanged:true,physicalSPenPending:true,releaseHeld:true
 }));
})().catch(e=>{console.error('ZGEN_JOB_E_SIZE_EXTREMES_QA_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close()});
