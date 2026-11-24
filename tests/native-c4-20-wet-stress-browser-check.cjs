/* ZGenArtStudio Pro | 20 real wet watercolor strokes with protected native history
 * QA-only: synthetic browser profile, original C4 engine and same Three-Shell painter.
 * Checks full wet Undo / Redo, memory, original graphite + tracing, IndexedDB reopen.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-c4-20-wet-stress-'));
const WET_STROKES=20;
let browser;
const capture=()=>{
 const snap=window.__C4.snapshot();
 const layers=snap.document?.whole?.layers||{},fingerprints={};
 for(const [key,array] of Object.entries(layers)){
   let hash=2166136261,nonzero=0;
   for(let i=0;i<array.length;i++){
     hash=Math.imul(hash^array[i],16777619);
     if(array[i])nonzero++;
   }
   fingerprints[key]={len:array.length,nonzero,hash:hash>>>0};
 }
 return {
   wet:fingerprints,
   paint:document.querySelector('#paint').toDataURL('image/png'),
   reference:document.querySelector('#reference').toDataURL('image/png'),
   dims:[document.querySelector('#paint').width,document.querySelector('#paint').height],
   history:window.__C4History(),metrics:window.__C4HistoryMetrics(),
   wetPhase:snap.phase,wetDirty:snap.dirty
 };
};
(async()=>{
 browser=await chromium.launchPersistentContext(profile,{
   headless:true,viewport:{width:390,height:844},hasTouch:true,
   args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 });
 const page=browser.pages()[0]||await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__C4?.snapshot&&window.__C4HistoryMetrics&&
   window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
   null,{timeout:45000});
 const bound=await page.locator('#paint').boundingBox();
 assert.ok(bound&&bound.width>100&&bound.height>150,'Existing Three-Shell paper visible');
 const draw=async (index, yFraction) => {
   const y=bound.y+bound.height*yFraction;
   const left=bound.x+bound.width*(.21+(index%4)*.018);
   const right=bound.x+bound.width*(.66+(index%3)*.028);
   await page.mouse.move(left,y);
   await page.mouse.down();
   await page.mouse.move(right,y+bound.height*.008,{steps:8});
   await page.mouse.up();
 };
 // Dry 2B graphite baseline confirms wet Undo cannot erase existing drawing.
 await page.evaluate(()=>document.querySelector('[data-brush="graphite"]').click());
 await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
 await draw(0,.14);
 const base=await page.evaluate(capture);
 assert.equal(base.history.undo.length,1,'Native baseline graphite stroke must be in history');
 assert.deepEqual(base.dims,[720,1280],'Native paper size unchanged');
 const brush=async name=>{
   await page.evaluate(()=>document.querySelector('button[data-act="brush"]').click());
   await page.waitForFunction(name=>!document.querySelector('#drawer')?.hidden&&
     document.querySelector('#drawer [data-brush="'+name+'"]'),name,{timeout:10000});
   await page.evaluate(name=>document.querySelector('#drawer [data-brush="'+name+'"]').click(),name);
   await page.waitForFunction(name=>window.__ZGEN_BETA_26.state().brush===name,name,{timeout:10000});
 };
 await brush('round');
 const begun=Date.now();
 for(let i=0;i<WET_STROKES;i++){
   if(i===10)await brush('mop');
   await draw(i,.22+i*.031);
   const history=await page.evaluate(()=>window.__C4History());
   assert.equal(history.redo.length,0,'New wet stroke must invalidate redo');
   assert.ok(history.undo.length>0,'Native history must remain responsive');
 }
 // Freeze C4 evolution before checking pixel-perfect wet state and history.
 await page.evaluate(()=>document.querySelector('[data-act="stop"]').click());
 const final=await page.evaluate(capture);
 assert.equal(final.metrics.maxSteps,60,'Tiled Undo engine is still active');
 assert.equal(final.metrics.tileSize,64,'Shared 64px tiles active');
 assert.ok(final.metrics.estimatedBytes<=final.metrics.memoryLimitBytes,
   'Wet history exceeds 128 MiB budget: '+JSON.stringify(final.metrics));
 assert.ok(final.history.undo.length>=WET_STROKES+1,
   '20 watercolor strokes must remain undoable under the stated memory budget: '+JSON.stringify(final.metrics));
 assert.equal(final.wetDirty,true,'Real C4 watercolor pigment is dirty');
 assert.ok(Object.values(final.wet).some(x=>x.nonzero>0),'Wet GPU layers must contain real pigment');
 assert.equal(final.paint,base.paint,'Wet strokes must not destroy preexisting graphite');
 assert.equal(final.reference,base.reference,'Wet strokes must not change tracing reference');
 for(let i=0;i<WET_STROKES;i++){
   await page.locator('.zshell-history-left').click();
 }
 const reversed=await page.evaluate(capture);
 assert.equal(reversed.history.undo.length,1,'All 20 wet marks should be removed');
 assert.equal(reversed.history.redo.length,WET_STROKES,'20 wet marks available for redo');
 assert.deepEqual(reversed.wet,base.wet,'All native C4 wet GPU arrays restore exact graphite baseline');
 assert.equal(reversed.paint,base.paint,'Existing graphite must survive full watercolor Undo');
 assert.equal(reversed.reference,base.reference,'Reference remains after full watercolor Undo');
 for(let i=0;i<WET_STROKES;i++){
   await page.locator('.zshell-history-right').click();
 }
 const restored=await page.evaluate(capture);
 assert.equal(restored.history.undo.length,WET_STROKES+1,'All 20 wet strokes redone');
 assert.deepEqual(restored.wet,final.wet,'Full wet arrays restored byte-exactly after 20 redo');
 assert.equal(restored.paint,base.paint,'Dry graphite intact after 20 redo');
 assert.equal(restored.reference,base.reference,'Trace intact after 20 redo');
 assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
   'Existing atomic artwork bridge must commit mixed-media project');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__C4?.snapshot&&window.__ZGEN_ART_RECOVERY?.status().ready&&
   !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
 const reopened=await page.evaluate(capture);
 assert.equal(reopened.paint,base.paint,'Graphite survives browser reload');
 assert.equal(reopened.reference,base.reference,'Reference survives browser reload');
 assert.ok(Object.values(reopened.wet).some(x=>x.nonzero>0),
   'Restored C4 pigment remains after reload');
 assert.deepEqual(reopened.dims,[720,1280]);
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('ZGEN_C4_20_WET_STRESS_PASS '+JSON.stringify({
   realWatercolorStrokes:WET_STROKES,round:10,mop:10,
   allWetUndo:WET_STROKES,allWetRedo:WET_STROKES,
   originalGraphitePreserved:true,wetGPUArraysExact:true,referencePreserved:true,
   wetReload:true,graphiteReload:true,
   historyBytes:final.metrics.estimatedBytes,historyMemoryBudget:final.metrics.memoryLimitBytes,
   historyCapacity:final.metrics.maxSteps,workMs:Date.now()-begun,
   physicalTabletPass:false
 }));
})().catch(error=>{console.error('ZGEN_C4_20_WET_STRESS_FAIL',error);process.exitCode=1})
 .finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
