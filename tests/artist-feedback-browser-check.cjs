'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const { chromium }=require('playwright');
const path=require('node:path');
const root=fs.readFileSync('index.html','utf8');
const alternate=fs.readFileSync('shell-v2.html','utf8');
assert.equal(root,alternate,'Existing shortcut root and canonical test shell are the same');
const removed=root
 .replace('<link rel="stylesheet" href="./artist-feedback.css">','')
 .replace('<script src="./artist-feedback.js"></script>','');
const original=crypto.createHash('sha1').update('blob '+Buffer.byteLength(removed)+'\0').update(removed).digest('hex');
assert.equal(original,'19db93b2ea3c3f6f3112eb4cb8d940b058e927d3',
 'Original public studio painter HTML preserved byte-for-byte');
assert.match(root,/<canvas id="paint" width="720" height="1280"/);
assert.doesNotMatch(fs.readFileSync('artist-feedback.js','utf8'),/github\.com\/swan101349-spec\/ZGenArtStudio-Pro|https?:\/\/|XMLHttpRequest|fetch\(/,
 'Feedback code must expose no private repository or use network');
const output='artist-feedback-browser-qa';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const sizes=[{name:'phone360',width:360,height:740},
   {name:'phone390',width:390,height:844},
   {name:'tabletPortrait',width:800,height:1280},
   {name:'tabletLandscape',width:1280,height:800}];
  for(const size of sizes){
   const page=await browser.newPage({viewport:{width:size.width,height:size.height},
    hasTouch:true,deviceScaleFactor:1,acceptDownloads:true,
    permissions:['clipboard-read','clipboard-write']});
   const errors=[],downloads=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('download',d=>downloads.push(d.suggestedFilename()));
   await page.goto('http://127.0.0.1:8772/index.html',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>!!window.__ZGEN_FEEDBACK?.itemCount && !!window.__ZGEN_THREE_SHELL,{timeout:15000});
   assert.equal(await page.evaluate(()=>window.__ZGEN_FEEDBACK.itemCount),15);
   const header=await page.locator('.head').boundingBox();
   const trigger=await page.locator('#artist-feedback-open').boundingBox();
   const options=await page.locator('#rail-settings').boundingBox();
   assert.ok(header&&trigger&&options,'visible header and tool buttons');
   assert.ok(trigger.x>=header.x-1&&trigger.x+trigger.width<=header.x+header.width+1,
     'TEST button fully visible within header');
   assert.ok(trigger.x+trigger.width<=options.x+1,
     'TEST must not overlap rail-settings button');
   const before=await page.locator('#paint').evaluate(c=>({w:c.width,h:c.height,png:c.toDataURL()}));
   assert.deepEqual([before.w,before.h],[720,1280]);
   await page.locator('#artist-feedback-open').click();
   assert.equal(await page.locator('#artist-feedback-panel').isVisible(),true);
   assert.equal(await page.locator('.artist-feedback-item').count(),15);
   assert.equal(await page.locator('.artist-feedback-pending li').count(),7);
   assert.equal(await page.locator('.artist-feedback-choice').count(),45);
   assert.equal(await page.locator('#artist-feedback-open').getAttribute('aria-expanded'),'true');
   await page.locator('.artist-feedback-item[data-test=fit] button[data-vote=FAIL]').click();
   assert.equal(await page.locator('.artist-feedback-item[data-test=fit] button[data-vote=FAIL]').getAttribute('aria-pressed'),'true');
   await page.locator('#artist-feedback-notes').fill('Fit visible control needs review; layout test');
   await page.locator('.artist-feedback-copy').click();
   await page.waitForFunction(()=>document.querySelector('.artist-feedback-copy-status').textContent.includes('Copied'),{timeout:5000});
   const copied=await page.evaluate(()=>navigator.clipboard.readText());
   assert.match(copied,/FAIL \| Fit Canvas/);
   assert.match(copied,/Fit visible control needs review/);
   assert.doesNotMatch(copied,/private GitHub|private source code/);
   await page.screenshot({path:path.join(output,size.name+'-checklist.png'),fullPage:false});
   await page.locator('.artist-feedback-close').click();
   const after=await page.locator('#paint').evaluate(c=>({w:c.width,h:c.height,png:c.toDataURL()}));
   assert.deepEqual(after,before,'feedback drawer may not resize or erase actual painting');
   assert.equal(downloads.length,0,'opening/using feedback must not download artwork');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__ZGEN_FEEDBACK,{timeout:15000});
   await page.locator('#artist-feedback-open').click();
   assert.equal(await page.locator('.artist-feedback-item[data-test=fit] button[data-vote=FAIL]').getAttribute('aria-pressed'),'true',
     'local artist FAIL verdict persists after reload');
   assert.equal(await page.locator('#artist-feedback-notes').inputValue(),
     'Fit visible control needs review; layout test');
   assert.deepEqual(errors,[],'No browser errors');
   console.log('PASS '+size.name+': feedback15, pending7, 720x1280 original art, no network/download, clipboard/local persistence and header clearance');
   await page.close();
  }
  console.log('ARTIST_FEEDBACK_BROWSER_PASS; physical Tab S9 finger + S Pen unverified');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||String(e));process.exit(1)});
