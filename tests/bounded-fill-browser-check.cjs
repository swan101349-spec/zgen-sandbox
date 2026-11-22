'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const url='http://127.0.0.1:8765/shell-v2.html';
const browserErrors=[];
(async()=>{
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:780},hasTouch:true,isMobile:true});
 page.on('pageerror',e=>browserErrors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.__ZGEN_FILL?.identifyRegion && !!window.__ZGEN_FILL_BRIDGE && !!window.__ZGEN_BETA_26?.state,{timeout:20000});
 await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
 const pixels=async()=>page.evaluate(()=>{
   const ctx=document.querySelector('#paint').getContext('2d',{willReadFrequently:true});
   const ref=document.querySelector('#reference').getContext('2d',{willReadFrequently:true});
   const px=(c,x,y)=>Array.from(c.getImageData(x,y,1,1).data);
   return {center:px(ctx,360,640),outer:px(ctx,100,100),graphite:px(ref,240,640),paintCorner:px(ctx,240,640)};
 });
 // A blank drawing cannot be flooded. A refusal must not allocate Undo.
 let blank=await page.evaluate(()=>window.__ZGEN_FILL.identifyRegion(
   document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280),
   document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280),360,640));
 assert.equal(blank.ok,false,'blank-page Fill refuses');
 const blankBefore=await pixels();
 // Create a real dark graphite line on the original reference layer.
 await page.evaluate(()=>{
   const c=document.querySelector('#reference').getContext('2d');
   c.strokeStyle='rgba(53,57,62,1)';c.lineWidth=5;
   c.strokeRect(240,470,240,340);
 });
 const refBefore=await pixels();
 assert.ok(refBefore.graphite[3]>200,'dark reference line exists');
 const pt=await page.evaluate(()=>{
   const el=document.querySelector('#board');
   const rect=el.getBoundingClientRect();
   return {x:rect.left+rect.width*.5,y:rect.top+rect.height*.5};
 });
 await page.locator('#zshell-left .zshell-handle').click();
 await page.locator('.zgen-fill-toggle').click();
 assert.equal(await page.locator('.zgen-fill-toggle').getAttribute('aria-pressed'),'true','Fill mode enabled');
 // Actual Android-style touch events, not a direct internal method call.
 await page.touchscreen.tap(pt.x,pt.y);
 await page.waitForTimeout(100);
 const filled=await pixels();
 assert.ok(filled.center[3]>7 && filled.center[3]<120,
   'center has translucent watercolor, not opaque flood: '+JSON.stringify(filled.center));
 assert.deepEqual(filled.outer,blankBefore.outer,'outside of reference shape remains unchanged');
 assert.deepEqual(filled.graphite,refBefore.graphite,'graphite underlay itself unaltered');
 assert.equal(filled.paintCorner[3],0,'fill does not paint over graphite boundary');
 // Coverage and strength sliders are truly contextual (and affect pixels).
 await page.locator('.zshell-adjust-handle').click();
 const keys=await page.locator('#zshell-adjust-panel input[data-setting]').evaluateAll(xs=>xs.map(x=>x.dataset.setting));
 assert.deepEqual(keys,['coverage','soft','strength'],'Fill uses exactly 3 contextual sliders');
 const presets=await page.locator('#zshell-adjust-panel [data-size-preset]').count();
 assert.equal(presets,0,'irrelevant brush diameter presets hidden in Fill');
 await page.locator('#zshell-adjust-panel input[data-setting=strength]').evaluate(el=>{
   el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.equal(await page.evaluate(()=>window.__ZGEN_BRUSH_CONTROLS.fillSettings.strength),90,'real Fill strength setting wired');
 await page.locator('.zshell-adjust-close').click();
 await page.touchscreen.tap(pt.x,pt.y);
 await page.waitForTimeout(100);
 const stronger=await pixels();
 assert.ok(stronger.center[3]>filled.center[3]+9,'increasing strength deposits more transparent pigment');
 assert.deepEqual(stronger.outer,filled.outer,'outside still clean after stronger wash');
 // Real engine undo, redo: compare both reference and paint pixels.
 await page.locator('#zshell-right .zshell-handle').click();
 await page.locator('#canvas-rail button[data-act=undo]').click();
 const undone=await pixels();
 assert.deepEqual(undone.center,filled.center,'Undo removes ONLY second wash');
 await page.locator('#zshell-right .zshell-handle').click();
 await page.locator('#canvas-rail button[data-act=redo]').click();
 const redone=await pixels();
 assert.deepEqual(redone.center,stronger.center,'Redo restores second wash');
 assert.deepEqual(redone.graphite,refBefore.graphite,'graphite stays after history navigation');
 // Existing exporter must include real fill pixels and reference outlines.
 await page.locator('#zshell-right .zshell-handle').click();
 const wait=page.waitForEvent('download',{timeout:12000});
 await page.locator('#zshell-right-panel .actions button[data-act=export]').click();
 const dl=await wait,png=fs.readFileSync(await dl.path());
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1280);
 const pngResult=await page.evaluate(async b64=>{
   const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();
   const c=document.createElement('canvas');c.width=720;c.height=1280;
   const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
   const sample=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
   return {inside:sample(360,640),outline:sample(240,640),outside:sample(100,100)};
 },png.toString('base64'));
 assert.notDeepEqual(pngResult.inside,pngResult.outside,'PNG contains colored wash');
 assert.ok(pngResult.outline[0]<pngResult.outside[0]-30,'PNG keeps dark graphite boundary visible');
 // An open outline must reject instead of leaking to the rest of the sheet.
 await page.evaluate(()=>{
   const c=document.querySelector('#reference').getContext('2d');
   c.clearRect(477,570,9,130);
 });
 const beforeLeak=await pixels();
 const rejected=await page.evaluate(({x,y})=>window.__ZGEN_FILL.applyAt(x,y),pt);
 assert.equal(rejected.ok,false,'open outline refuses Fill');
 assert.deepEqual((await pixels()).center,beforeLeak.center,'failed open-mask fill preserves art');
 // Normal brush selection switches Fill off.
 await page.locator('#zshell-left .zshell-handle').click();
 await page.locator('#drawing-rail button[data-brush=graphite]').click();
 assert.equal(await page.evaluate(()=>window.__ZGEN_FILL.active),false,'native brush deactivates Fill');
 assert.deepEqual(browserErrors,[],'no uncaught browser errors');
 console.log('PASS: native closed-reference Fill, light wash, 3 contextual sliders, strength response, boundary rejection, two real Undo/Redo states, graphite remains, exported PNG contains fill, normal brushes restored.');
}finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
