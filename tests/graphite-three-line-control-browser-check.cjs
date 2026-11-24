/* Existing 3-line graphite pencil controls | independent real-pixel Chromium QA.
 * Runs only in a synthetic browser profile. Do not use owner artworks or reset storage.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-pencil-control-'));
let context;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  context=await chromium.launchPersistentContext(profile,{
    headless:true,viewport:{width:390,height:844},hasTouch:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  const page=context.pages()[0]||await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_BETA_26 &&
    window.__ZGEN_ART_RECOVERY?.status().ready && !window.__ZGEN_ART_RECOVERY.status().blocked,
    {timeout:30000});
  const original=await page.locator('#chip').evaluate(x=>getComputedStyle(x).backgroundColor);
  assert.ok(original,'Original watercolor selection must exist before pencil');
  await page.evaluate(()=>document.querySelector('[data-brush="graphite"]').click());
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
  await page.waitForFunction(()=>window.__ZGEN_BRUSH_CONTROLS.graphiteShade==='#787878');
  await page.locator('.zshell-adjust-handle').click();
  assert.equal(await page.locator('#zshell-adjust-panel').evaluate(x=>x.hidden),false);
  assert.equal(await page.locator('#zshell-adjust-panel input[type="range"]').count(),3,
    'Pencils retain EXACTLY three prominent contextual controls');
  assert.equal(await page.locator('[data-graphite-tone]').count(),3);
  assert.equal(await page.locator('[data-size-preset]').count(),5);
  assert.deepEqual(await page.locator('[data-size-preset]').allTextContents(),
    ['XS3','S10','M22','L45','XL80'],'Native size measurement visible inside 3-line panel');
  await page.locator('[data-size-preset="XS"]').click();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),3);
  await page.locator('[data-size-preset="S"]').click();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),10);
  await page.locator('[data-size-preset="M"]').click();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),22);
  const strokes=[];
  for(const [label,hex] of [['Graphite','#787878'],['Dark','#383838'],['Black','#080808']]){
    await page.locator('[data-graphite-tone="'+hex+'"]').click();
    await page.waitForFunction(target=>window.__ZGEN_BRUSH_CONTROLS.graphiteShade===target,
      hex,{timeout:5000});
    assert.equal(await page.locator('[data-graphite-tone][aria-pressed=true]').count(),1);
    assert.equal(await page.locator('[data-graphite-tone="'+hex+'"]').getAttribute('aria-pressed'),'true');
    // Native hit-test: same canvas trajectory for each native graphite shade.
    const frame=await page.locator('#paint').boundingBox();
    assert.ok(frame&&frame.width>100&&frame.height>150);
    await page.mouse.move(frame.x+frame.width*.27,frame.y+frame.height*.32);
    await page.mouse.down();
    await page.mouse.move(frame.x+frame.width*.71,frame.y+frame.height*.39,{steps:14});
    await page.mouse.up();
    await wait(120);
    const summary=await page.evaluate(()=>{
      const canvas=document.querySelector('#paint');
      const data=canvas.getContext('2d',{willReadFrequently:true})
        .getImageData(0,0,canvas.width,canvas.height).data;
      let n=0,light=0;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]<10)continue;
        n++;light+=(data[i]+data[i+1]+data[i+2])/3;
      }
      return {count:n,mean:n?light/n:0};
    });
    assert.ok(summary.count>20,label+' must make a REAL graphite mark');
    strokes.push({label,hex,...summary});
    await page.locator('.zshell-history-left').click();
    const left=await page.evaluate(()=>{
      const src=document.querySelector('#paint').getContext('2d')
        .getImageData(0,0,720,1280).data;
      let found=0;for(let i=3;i<src.length;i+=4)if(src[i]>0)found++;
      return found;
    });
    assert.equal(left,0,'Native Undo must clear synthetic mark before next shade');
    // Undo does not change the selected shade or reset the adjustment panel dimensions.
    if(await page.locator('#zshell-adjust-panel').evaluate(x=>x.hidden)){
      await page.locator('.zshell-adjust-handle').click();
    }
  }
  assert.ok(strokes[0].mean>strokes[1].mean+10 &&
    strokes[1].mean>strokes[2].mean+10,
    'Native colored pencil pixels must get progressively DARKER: '+JSON.stringify(strokes));
  // Pencil shade is independent of preselected watercolor palette color.
  await page.evaluate(()=>document.querySelector('[data-brush="round"]').click());
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
  await page.waitForFunction(color=>getComputedStyle(document.querySelector('#chip')).backgroundColor===color,
    original,{timeout:5000});
  await page.evaluate(()=>document.querySelector('[data-brush="graphite"]').click());
  await page.waitForFunction(()=>window.__ZGEN_BRUSH_CONTROLS.graphiteShade==='#080808');
  // Never let the controls alter the original backing art or corrupt its checkpoint.
  const dimensions=await page.evaluate(()=>[document.querySelector('#paint').width,
    document.querySelector('#paint').height]);
  assert.deepEqual(dimensions,[720,1280]);
  const state=await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.status());
  assert.equal(state.blocked,false);
  assert.deepEqual(errors,[],'No browser page errors');
  console.log('ZGEN_GRAPHITE_THREELINE_PASS '+JSON.stringify({
    threeRealNativeTones:true,pencilPixelBrightness:strokes,
    sizes:[3,10,22,45,80],watercolorColorPreserved:true,
    sizeSliders:3,artworkDimensions:dimensions,physicalDevicePass:false
  }));
})().catch(error=>{console.error('ZGEN_GRAPHITE_THREELINE_FAIL',error);process.exitCode=1})
  .finally(async()=>{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true})});
