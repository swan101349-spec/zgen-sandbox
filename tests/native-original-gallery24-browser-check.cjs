/* ZGen original Rascal24 integration | native Three-Shell browser QA.
 * PUBLIC branch contains no private artist images. This test supplies synthetic
 * colored 4x3 tile sheets only, and verifies real reference-import behavior.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-gallery24-synthetic-'));
let browser;
function fixture(sheet){
  let cells='';
  for(let n=0;n<12;n++){
    const col=n%4,row=Math.floor(n/4);
    const rr=sheet==='rascal'?130+n*9:20+n*9;
    const gg=sheet==='rascal'?38+n*4:95+n*6;
    const bb=sheet==='rascal'?80+n*5:160+n*5;
    cells+='<rect x="'+col*362+'" y="'+row*362+
      '" width="362" height="362" fill="rgb('+rr+','+gg+','+bb+')"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1448" height="1086" viewBox="0 0 1448 1086">'+cells+'</svg>';
}
function actualColor(sheet,index){
  return sheet==='rascal'
    ?[130+index*9,38+index*4,80+index*5]
    :[20+index*9,95+index*6,160+index*5];
}
async function runView(browser,viewport,label){
 const context=await browser.newContext({viewport,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/ghost-sheets/*.png',route=>{
   const url=route.request().url();
   const sheet=url.endsWith('/rascal.png')?'rascal':'graphite';
   return route.fulfill({status:200,contentType:'image/svg+xml',body:fixture(sheet)});
 });
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 try{
   await page.waitForFunction(()=>window.__ZGEN_ORIGINAL24?.installed===24&&
     window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
     null,{timeout:20000});
 }catch(e){
   const diagnostic=await page.evaluate(()=>({
     nativeReady:!!window.__ZGEN_BETA_26,
     shellReady:!!document.querySelector('#zshell-bottom-panel'),
     galleryReady:!!window.__ZGEN_ORIGINAL24,
     galleryGate:window.__ZGEN_ORIGINAL24_GATE||null,
     galleryRoot:!!document.querySelector('#zgen-original-gallery24'),
     recovery:window.__ZGEN_ART_RECOVERY?.status?.()||null,
     images:[...document.images].filter(x=>x.src.includes('/ghost-sheets/')).map(x=>({
       url:x.currentSrc,loaded:x.complete,width:x.naturalWidth,height:x.naturalHeight
     })),
     state:document.readyState
   }));
   throw new Error('Gallery startup: '+JSON.stringify(diagnostic)+
     '; uncaught: '+JSON.stringify(errors)+'; '+e.message);
 }
 const shell=await page.evaluate(()=>({size:[document.querySelector('#paint').width,
   document.querySelector('#paint').height],images:window.__ZGEN_ORIGINAL24.installed,
   canvasText:document.querySelector('#board').textContent}));
 assert.deepEqual(shell.size,[720,1280],'Original paint backing unchanged');
 assert.equal(shell.images,24);
 const board=await page.locator('#paint').boundingBox();
 assert(board&&board.width>60,'Native paper visible on '+label);
 await page.evaluate(()=>document.querySelector('[data-brush="graphite"]').click());
 await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
 await page.mouse.move(board.x+board.width*.3,board.y+board.height*.23);
 await page.mouse.down();
 await page.mouse.move(board.x+board.width*.66,board.y+board.height*.24,{steps:9});
 await page.mouse.up();
 const paintBefore=await page.evaluate(()=>document.querySelector('#paint').toDataURL('image/png'));
 const wetBefore=await page.evaluate(()=>window.__C4.snapshot().document?.whole?.rect);
 const r=await page.locator('#zshell-bottom .zshell-handle');
 await r.click();
 const toggle=page.locator('#zgen-original24-toggle');await toggle.click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'true','Compact native drawer controls gallery');
 assert.equal(await page.locator('#zgen-original24-grid .zgen-original24-tile').count(),24);
 assert.equal(await page.locator('#zgen-original24-grid strong').count(),2,'Two original families');
 const labels=await page.locator('#zgen-original24-grid .zgen-original24-tile').evaluateAll(
   xs=>xs.map(x=>x.getAttribute('aria-label')));
 assert.equal(new Set(labels).size,24,'24 distinct original references');
 assert(labels[0].includes('Original Sketchbook 01'));
 assert(labels[23].includes('Ms. Rascal + Rascal Cat 12'));
 const expected=await page.locator('#zgen-original24-grid .zgen-original24-tile').evaluateAll(
   xs=>new Set(xs.map(x=>x.style.backgroundImage+'|'+x.style.backgroundPosition)).size);
 assert.equal(expected,24,'All 24 thumbnail crop positions distinct');
 const search=page.locator('#zgen-original24-body input[type=search]');
 await search.fill('rascal');
 assert.equal(await page.locator('#zgen-original24-grid .zgen-original24-tile').count(),12);
 await search.fill('');
 const bigger=page.locator('[data-tile-size="1"]');
 await bigger.click();
 const biggerSize=await page.locator('#zgen-original24-grid').evaluate(
   el=>parseInt(el.style.getPropertyValue('--tile')));
 assert(biggerSize>58,'Compact thumbnails expand when requested');
 const first=page.locator('#zgen-original24-grid .zgen-original24-tile').first();
 await first.click();
 await page.waitForFunction(expected=>{
   const rgba=document.querySelector('#reference').getContext('2d')
     .getImageData(360,640,1,1).data;
   return rgba[3]>240&&expected.every((value,index)=>rgba[index]===value);
 },actualColor('graphite',0),{timeout:12000});
 const refFirst=await page.evaluate(()=>document.querySelector('#reference').toDataURL('image/png'));
 assert.notEqual(refFirst.length,0);
 assert.equal(await page.evaluate(()=>document.querySelector('#paint').toDataURL('image/png')),
   paintBefore,'Reference import must not alter existing artist paint');
 assert.deepEqual(await page.evaluate(()=>window.__C4.snapshot().document?.whole?.rect),
   wetBefore,'Reference import must not alter C4 watercolor document');
 // Gallery must ask before replacing an existing reference.
 if(await page.locator('#zshell-bottom-panel').evaluate(el=>el.hidden))await r.click();
 if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 page.once('dialog',async dialog=>{assert(dialog.message().includes('Replace the tracing reference'));await dialog.accept()});
 await page.locator('#zgen-original24-grid .zgen-original24-tile').last().click();
 await page.waitForFunction(expected=>{
   const rgba=document.querySelector('#reference').getContext('2d')
     .getImageData(360,640,1,1).data;
   return rgba[3]>240&&expected.every((value,index)=>rgba[index]===value);
 },actualColor('rascal',11),{timeout:12000});
 assert.equal(await page.evaluate(()=>document.querySelector('#paint').toDataURL('image/png')),
   paintBefore,'Rascal reference may not erase painting');
 const after=await page.evaluate(()=>window.__C4History());
 assert(after.undo.length>=3,'Graphite mark and both genuine native reference imports have history');
 // Native GUI Undo must revert only the latest reference; Redo must return Rascal.
 await page.locator('.zshell-history-left').click();
 await page.waitForFunction(expected=>{
   const rgba=document.querySelector('#reference').getContext('2d')
     .getImageData(360,640,1,1).data;
   return rgba[3]>240&&expected.every((value,index)=>rgba[index]===value);
 },actualColor('graphite',0),{timeout:12000});
 await page.locator('.zshell-history-right').click();
 await page.waitForFunction(expected=>{
   const rgba=document.querySelector('#reference').getContext('2d')
     .getImageData(360,640,1,1).data;
   return rgba[3]>240&&expected.every((value,index)=>rgba[index]===value);
 },actualColor('rascal',11),{timeout:12000});
 assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true,
   'Original atomic artwork survival bridge must save native imported reference');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
   !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_ORIGINAL24?.installed===24,
   null,{timeout:60000});
 const restored=await page.evaluate(()=>({
   paint:document.querySelector('#paint').toDataURL('image/png'),
   rgba:[...document.querySelector('#reference').getContext('2d')
     .getImageData(360,640,1,1).data],
   size:[document.querySelector('#paint').width,document.querySelector('#paint').height]
 }));
 assert.equal(restored.paint,paintBefore,'Artist graphite survives full browser reload');
 assert.deepEqual(restored.rgba.slice(0,3),actualColor('rascal',11),'Rascal 12 survives reload');
 assert.deepEqual(restored.size,[720,1280]);
 assert.deepEqual(errors,[],'No uncaught errors during real native import');
 console.log('ZGEN_GALLERY24_SYNTHETIC_PASS '+JSON.stringify({
   viewport:label,originalAssetsBundled:false,syntheticSheetsOnly:true,
   tiles:24,distinctCrops:24,originalNativePNGImporter:true,
   originalPaintPreserved:true,wetStatePreserved:true,
   referenceUndoRedo:true,referenceAndPaintSurvivedReload:true,physicalOwnerDeviceTested:false
 }));
 await context.close();
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 await runView(browser,{width:390,height:844},'phone-390x844');
 await runView(browser,{width:853,height:533},'tablet-853x533');
})().catch(e=>{console.error('ZGEN_GALLERY24_SYNTHETIC_FAIL',e);process.exitCode=1})
 .finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
