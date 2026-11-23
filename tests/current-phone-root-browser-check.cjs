// Owner's EXISTING GitHub Pages phone shortcut / must load exactly verified shell, not stale main.
// Read-only source + Chromium pointer/size QA; NO deployment and no paint engine rebuild.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const html=fs.readFileSync('index.html','utf8');
  const verified=fs.readFileSync('shell-v2.html','utf8');
  assert.equal(html,verified,'Existing root index must be exact tested shell-v2 source');
  assert.ok(html.includes('bounded-fill.js')&&html.includes('three-shell.js'), 'Real controllers must load at root');
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const out=[];
    for(const cfg of [{width:390,height:844},{width:853,height:533}]){
      const page=await browser.newPage({viewport:cfg,hasTouch:true,isMobile:true});
      const errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));
      page.on('download',d=>downloads.push(d.suggestedFilename()));
      await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.__ZGEN_THREE_SHELL?.recalculatePaperFit
           && !!window.__ZGEN_FILL?.identifyRegion
           && !!window.__ZGEN_BETA_26?.state,{timeout:30000});
      const proof=await page.evaluate(()=>{
        window.__ZGEN_THREE_SHELL.recalculatePaperFit();
        const paint=document.querySelector('#paint'),ref=document.querySelector('#reference');
        const area=document.querySelector('#canvasArea').getBoundingClientRect();
        const board=document.querySelector('#board').getBoundingClientRect();
        const left=document.querySelector('#zshell-left .zshell-handle').getBoundingClientRect();
        const right=document.querySelector('#zshell-right .zshell-handle').getBoundingClientRect();
        const bottom=document.querySelector('#zshell-bottom .zshell-handle').getBoundingClientRect();
        const adjust=document.querySelector('.zshell-adjust-handle').getBoundingClientRect();
        return {backing:[paint.width,paint.height,ref.width,ref.height],
          naturalPaper:board.width/board.height,
          paperFits:board.left>=area.left-2&&board.right<=area.right+2&&board.top>=area.top-2&&board.bottom<=area.bottom+2,
          handles:[left.width,right.width,bottom.width,adjust.width],
          nativeBrush:window.__ZGEN_BETA_26.state().brush,
          hasFill:typeof window.__ZGEN_FILL.applyAt==='function',
          hasFavorites:!!document.querySelector('#zshell-left-panel .zshell-fav-toggle'),
          controls:!!document.querySelector('.zshell-adjust-handle')};
      });
      assert.deepEqual(proof.backing,[720,1280,720,1280]);
      assert.ok(Math.abs(proof.naturalPaper-9/16)<.006,'Paper must remain 9:16');
      assert.ok(proof.paperFits,'No hidden or cropped paper in fit mode');
      assert.ok(proof.handles[0]<=52&&proof.handles[1]<=52&&proof.handles[2]<=180&&proof.handles[3]<=52,'No oversize floating handles');
      assert.equal(proof.hasFill,true);assert.equal(proof.hasFavorites,true);assert.equal(proof.controls,true);
      await page.locator('.zshell-adjust-handle').click();
      assert.equal(await page.locator('#zshell-adjust-panel input[data-setting]').count(),3);
      const size=await page.locator('#zshell-adjust-panel [data-size-preset]').count();assert.equal(size,5);
      await page.locator('#zshell-adjust-panel [data-size-preset=XS]').click();
      assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),3);
      await page.locator('#zshell-adjust-panel .zshell-adjust-close').click();
      assert.equal(downloads.length,0,'No surprise artwork PNG download at launch or control use');
      assert.deepEqual(errors,[],'Root page has no uncaught JavaScript errors');
      out.push({viewport:cfg,rootCurrent:true,...proof,brushSizes:5,contextualSliders:3,noPhantomDownload:true});
      await page.close();
    }
    console.log('PHONE_BETA_ROOT_EVIDENCE '+JSON.stringify(out));
    console.log('PHONE BETA ROOT GATE PASS. Physical OPPO/Tab S9 owner QA still required.');
  }finally{await browser.close();}
})().catch(e=>{console.error('PHONE BETA ROOT GATE FAIL',e);process.exitCode=1});
