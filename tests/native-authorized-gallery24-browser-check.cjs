/* Owner-approved genuine individual crop assets, public release staging.
 * Checks 24 real originals in the existing Three-Shell native painter.
 * The two master sheets remain private and are NEVER included here.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-approved-rascal-ci-'));
let browser;
function metrics(){
 const paint=document.querySelector('#paint'),ref=document.querySelector('#reference');
 const ctx=ref.getContext('2d',{willReadFrequently:true});
 const data=ctx.getImageData(0,0,720,1280).data;
 let hash=2166136261,alpha=0;
 // Digest samples from the whole image, not only one corner.
 for(let i=0;i<data.length;i+=128){
   hash=Math.imul(hash^data[i],16777619);
   hash=Math.imul(hash^data[i+1],16777619);
   hash=Math.imul(hash^data[i+2],16777619);
   if(data[i+3]>8)alpha++;
 }
 return {refHash:hash>>>0,alpha,paint:paint.toDataURL('image/png'),
   w:paint.width,h:paint.height,history:window.__C4History()};
}
async function runView(v,label){
 const context=await browser.newContext({viewport:v,hasTouch:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_ORIGINAL24?.installed===24&&
   window.__ZGEN_ART_RECOVERY?.status().ready&&!window.__ZGEN_ART_RECOVERY.status().blocked,
   null,{timeout:45000});
 assert.equal(await page.locator('#zgen-original24-grid .zgen-original24-tile').count(),24);
 const sheets=await page.evaluate(async()=>{
  const out=[];
  for(const id of ['graphite','rascal']){
   for(let index=0;index<12;index++){
     const image=new Image();
     image.src='./assets/gallery24/'+id+'-'+String(index+1).padStart(2,'0')+'.png';
     await image.decode();
     if(image.naturalWidth!==362||image.naturalHeight!==362)
       throw Error('Individual approved original crop size invalid: '+image.src);
     const ctx=document.createElement('canvas').getContext('2d');
     ctx.canvas.width=362;ctx.canvas.height=362;
     ctx.drawImage(image,0,0,362,362);
     const array=ctx.getImageData(0,0,362,362).data;
     let hash=2166136261,ink=0;
     for(let i=0;i<array.length;i+=20){
       for(let q=0;q<4;q++)hash=Math.imul(hash^array[i+q],16777619);
       if(array[i+3]>0&&Math.min(array[i],array[i+1],array[i+2])<235)ink++;
     }
     out.push({id,index,hash:hash>>>0,ink});
   }
  }
  return out;
 });
 assert.equal(sheets.length,24,'Must inspect each AUTHENTIC artist tile');
 assert.equal(new Set(sheets.map(x=>x.hash)).size,24,
   'All 24 approved public tiles must have distinct original artwork pixels');
 assert(sheets.every(x=>x.ink>0),'Every actual tile contains artwork');
 await page.evaluate(()=>document.querySelector('[data-brush=graphite]').click());
 const bounds=await page.locator('#paint').boundingBox();
 assert(bounds&&bounds.width>40);
 await page.mouse.move(bounds.x+bounds.width*.32,bounds.y+bounds.height*.2);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width*.67,bounds.y+bounds.height*.23,{steps:10});
 await page.mouse.up();
 const before=await page.evaluate(metrics);
 assert.equal(before.w,720);assert.equal(before.h,1280);
 const shell=page.locator('#zshell-bottom .zshell-handle');
 await shell.click();
 await page.locator('#zgen-original24-toggle').click();
 await page.locator('#zgen-original24-grid .zgen-original24-tile').first().click();
 await page.waitForFunction(()=>window.__C4History().undo.length>=2,null,{timeout:18000});
 await page.waitForFunction(()=>{
   const d=document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280).data;
   for(let i=3;i<d.length;i+=4)if(d[i]>8)return true;
   return false;
 },null,{timeout:18000});
 const first=await page.evaluate(metrics);
 assert(first.alpha>20,'Real Sketchbook illustration must reach native reference');
 assert.equal(first.paint,before.paint,'Original graphite painting unchanged by importing first illustration');
 if(await page.locator('#zshell-bottom-panel').evaluate(x=>x.hidden))await shell.click();
 if(await page.locator('#zgen-original24-toggle').getAttribute('aria-expanded')!=='true')
   await page.locator('#zgen-original24-toggle').click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#zgen-original24-grid .zgen-original24-tile').last().click();
 await page.waitForFunction(firstHash=>{
   const c=document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280).data;
   let h=2166136261;for(let i=0;i<c.length;i+=128){h=Math.imul(h^c[i],16777619);
     h=Math.imul(h^c[i+1],16777619);h=Math.imul(h^c[i+2],16777619);}
   return (h>>>0)!==firstHash;
 },first.refHash,{timeout:20000});
 const rascal=await page.evaluate(metrics);
 assert(rascal.alpha>20,'Last original Rascal must reach native reference');
 assert.notEqual(rascal.refHash,first.refHash,'Rascal12 and Sketchbook01 cannot be same image');
 assert.equal(rascal.paint,before.paint,'Importing Rascal never paints over graphite');
 await page.locator('.zshell-history-left').click();
 await page.waitForFunction(x=>{
   const d=document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280).data;
   let h=2166136261;for(let i=0;i<d.length;i+=128){h=Math.imul(h^d[i],16777619);
     h=Math.imul(h^d[i+1],16777619);h=Math.imul(h^d[i+2],16777619);}
   return (h>>>0)===x;
 },first.refHash,{timeout:15000});
 await page.locator('.zshell-history-right').click();
 await page.waitForFunction(x=>{
   const d=document.querySelector('#reference').getContext('2d').getImageData(0,0,720,1280).data;
   let h=2166136261;for(let i=0;i<d.length;i+=128){h=Math.imul(h^d[i],16777619);
     h=Math.imul(h^d[i+1],16777619);h=Math.imul(h^d[i+2],16777619);}
   return (h>>>0)===x;
 },rascal.refHash,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
  !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_ORIGINAL24?.installed===24,
  null,{timeout:45000});
 const restored=await page.evaluate(metrics);
 assert.equal(restored.refHash,rascal.refHash,'Real Rascal reference survives native recovery reload');
 assert.equal(restored.paint,before.paint,'Real graphite artwork survives native recovery reload');
 assert.deepEqual(errors,[],'No uncaught errors');
 console.log('ZGEN_PUBLIC_REAL_RASCAL24_PASS '+JSON.stringify({
   screen:label,privateMasterSheetsPublished:0,realApprovedIndividualCrops:sheets.length,
   nativeOriginalCropImport:true,nativeUndoRedo:true,
   graphitePreserved:true,rascalReferenceSurvivesReload:true,
   individualCropsPubliclyAuthorized:true,ownerPhysicalDeviceTested:false
 }));
 await context.close();
}
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 await runView({width:390,height:844},'phone-390x844');
 await runView({width:853,height:533},'tablet-853x533');
})().catch(err=>{console.error('ZGEN_PUBLIC_REAL_RASCAL24_FAIL',err);process.exitCode=1})
.finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
