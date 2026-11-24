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
 await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_BETA_26&&
   document.querySelector('.zshell-history-left')&&
   window.__ZGEN_ART_RECOVERY?.status().ready,{timeout:30000});
 assert.equal(await page.evaluate(()=>document.querySelector('.zshell-history-left').dataset.act),'undo');
 assert.equal(await page.evaluate(()=>document.querySelector('.zshell-history-right').dataset.act),'redo');
 assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-act="undo"]').length),1);
 assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-act="redo"]').length),1);
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
 assert.deepEqual(errors,[],'No page errors');
 console.log('ZGEN_BOTTOM_HISTORY_PASS '+JSON.stringify({nativeButtons:2,menuStaysOpen:true,
   newGraphiteUndo:true,redo:true,artDimensions:[720,1280],ownerDevicePass:false}));
})().catch(e=>{console.error('ZGEN_BOTTOM_HISTORY_FAIL',e);process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true});});
