/* C3 synthetic real-pointer test: original native ↶/↷ in existing bottom shell.
 * No owner art; no live page, browser profile or WordPress mutation.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-history-bottom-'));
let browser;
const pixels=()=>document.querySelector('#paint').getContext('2d',{willReadFrequently:true})
  .getImageData(0,0,720,1280).data;
(async()=>{
 browser=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:390,height:844},
   hasTouch:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=browser.pages()[0]||await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_BETA_26&&
   document.querySelector('.zshell-history-left')&&
   window.__ZGEN_ART_RECOVERY?.status().ready,{timeout:30000});
 assert.equal(await page.evaluate(()=>document.querySelector('.zshell-history-left').dataset.act),'undo');
 assert.equal(await page.evaluate(()=>document.querySelector('.zshell-history-right').dataset.act),'redo');
 assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-act="undo"]').length),1);
 assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-act="redo"]').length),1);
 const layout=await page.evaluate(()=>{
   const bounds=selector=>{
     const r=document.querySelector(selector).getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};
   };
   return {undo:bounds('.zshell-history-left'),
     redo:bounds('.zshell-history-right'),
     artwork:bounds('#zshell-bottom .zshell-handle'),
     screen:window.innerWidth};
 });
 assert(layout.undo.left>=0 && layout.artwork.right<=layout.screen,
   'History+artwork group must be fully visible on mobile');
 assert(layout.undo.right<=layout.redo.left+1 && layout.redo.left-layout.undo.right<=6,
   'Owner UI: Undo and Redo must be ADJACENT curved arrows');
 assert(layout.redo.right<=layout.artwork.left+1 && layout.artwork.left-layout.redo.right<=6,
   'Two arrows must form a contiguous group left of bottom artwork handle');
 const fresh=await page.evaluate(()=>{document.querySelector('[data-brush=graphite]').click();
   return window.__ZGEN_BETA_26.state().brush;});
 assert.equal(fresh,'graphite','Native graphite tool must be selected');
 const baseline=await page.evaluate(()=>{const p=document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280).data;
   let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count;});
 const bounds=await page.locator('#paint').boundingBox();
 assert.ok(bounds&&bounds.width>100&&bounds.height>150,'Original paper must be visible');
 await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.38);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.42,{steps:14});
 await page.mouse.up();
 await page.waitForTimeout(250);
 const marked=await page.evaluate(()=>{const p=document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280).data;
   let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count;});
 assert.ok(marked>baseline+10,'Native graphite must add visible paint pixels');
 await page.locator('#zshell-right .zshell-handle').click();
 assert.equal(await page.locator('#zshell-right-panel').evaluate(e=>e.hidden),false,'Tools opened');
 await page.locator('.zshell-history-left').click();
 assert.equal(await page.locator('#zshell-right-panel').evaluate(e=>e.hidden),false,'Undo must NOT collapse Tools');
 const undone=await page.evaluate(()=>{const p=document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280).data;
   let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count;});
 assert.equal(undone,baseline,'Undo removes only new synthetic graphite mark');
 await page.locator('.zshell-history-right').click();
 assert.equal(await page.locator('#zshell-right-panel').evaluate(e=>e.hidden),false,'Redo must NOT collapse Tools');
 const redone=await page.evaluate(()=>{const p=document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280).data;
   let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count;});
 assert.equal(redone,marked,'Redo restores same new graphite mark');

 // Finger/S-Pen history fix may never break persistent saved paintings.
 // This synthetic Chromium profile is isolated from the owner's actual studio.
 const expectSaved=await page.evaluate(async()=>await window.__ZGEN_ART_RECOVERY.flush());
 assert.equal(expectSaved,true,'Synthetic painting checkpoint must persist');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
   !window.__ZGEN_ART_RECOVERY.status().blocked,{timeout:30000});
 const reopened=await page.evaluate(()=>{
  const p=document.querySelector('#paint').getContext('2d').getImageData(0,0,720,1280).data;
  let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;
  return count;
 });
 assert.equal(reopened,marked,'New graphite must SURVIVE browser reopen with adjacent native arrows');
 assert.deepEqual(errors,[],'No page errors');
 console.log('ZGEN_BOTTOM_HISTORY_PASS '+JSON.stringify({nativeButtons:2,menuStaysOpen:true,
   newGraphiteUndo:true,redo:true,artworkSurvivesReload:true,artDimensions:[720,1280],ownerDevicePass:false}));
})().catch(e=>{console.error('ZGEN_BOTTOM_HISTORY_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true});});
