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
    // Mobile-first phone portrait, tablet portrait, and landscape responsive browser checks.
    // Physical artist acceptance remains Galaxy Tab S9 finger + S Pen only.
    for(const cfg of [{width:390,height:844},{width:800,height:1280},{width:853,height:533}]){
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
      const leftBefore=await page.locator('#zshell-left .zshell-handle').boundingBox();
      const rightBefore=await page.locator('#zshell-right .zshell-handle').boundingBox();
      assert.ok(leftBefore.x<rightBefore.x,'Original brush rail must start on left');
      await page.locator('#zshell-right .zshell-handle').click();
      const swap=page.locator('#zshell-right-panel .zshell-rail-swap');
      assert.equal(await swap.count(),1,'180 degree side-rail switch missing');
      await swap.click();
      const leftAfter=await page.locator('#zshell-left .zshell-handle').boundingBox();
      const rightAfter=await page.locator('#zshell-right .zshell-handle').boundingBox();
      assert.ok(leftAfter.x>rightAfter.x,'180 degree rail switch must swap physical positions');
      assert.equal(await swap.getAttribute('aria-pressed'),'true');
      await swap.click();
      assert.equal(await swap.getAttribute('aria-pressed'),'false','Second switch must restore original arrangement');
      assert.equal(await page.locator('a[href="./index.html"]').count(),0,'Obsolete self-link must be removed');
      assert.equal(await page.locator('#zshell-bottom-panel button[data-act="files"]').textContent(),'▣ Files / Export PNG');

      // C5 A1: native color picker stays lower on canvas and uses small pans.
      // Gesture expansion is separately gated, not claimed by this test.
      await page.locator('#zshell-bottom .zshell-handle').click();
      await page.locator('#zshell-bottom-panel button[data-act="color"]').click();
      await page.locator('#drawer .pigments button').first().waitFor({state:'visible',timeout:8000});
      const paletteQA=await page.evaluate(()=>{
        const drawer=document.querySelector('#drawer');
        const area=document.querySelector('#canvasArea').getBoundingClientRect();
        const rect=drawer.getBoundingClientRect();
        const pans=[...drawer.querySelectorAll('.pigments button')];
        const swatch=pans[0]?.getBoundingClientRect();
        const paint=document.querySelector('#paint');
        const ref=document.querySelector('#reference');
        return {
          count:pans.length,
          topGap:Math.round(rect.top-area.top),
          areaHeight:Math.round(area.height),
          width:Math.round(rect.width),
          panSize:Math.round(swatch?.width||0),
          height:Math.round(rect.height),
          backing:[paint.width,paint.height,ref.width,ref.height],
          scrollHeight:drawer.scrollHeight,
          clientHeight:drawer.clientHeight
        };
      });
      assert.equal(paletteQA.count,44,'All 44 real native pigments remain accessible');
      assert.ok(paletteQA.topGap>=Math.min(78,paletteQA.areaHeight*.20),
        'Palette must not cover the upper canvas: '+JSON.stringify(paletteQA));
      assert.ok(paletteQA.width<=322,'Mobile color panel must stay compact: '+JSON.stringify(paletteQA));
      assert.ok(paletteQA.panSize>=32&&paletteQA.panSize<=36,
        'Compact half-pan targets must remain finger/S Pen reachable: '+JSON.stringify(paletteQA));
      assert.deepEqual(paletteQA.backing,[720,1280,720,1280],
        'Palette CSS must never reallocate painting/reference canvas');
      await page.locator('#drawer .pigments button').nth(9).click();
      await page.screenshot({path:'three-shell-browser-qa/color-drawer-lower-'+cfg.width+'x'+cfg.height+'.png'});
      console.log('C5_COMPACT_LOW_PALETTE '+JSON.stringify({viewport:cfg,...paletteQA}));
      assert.equal(downloads.length,0,'No surprise artwork PNG download at launch or control use');
      assert.deepEqual(errors,[],'Root page has no uncaught JavaScript errors');
      out.push({viewport:cfg,rootCurrent:true,...proof,brushSizes:5,contextualSliders:3,noPhantomDownload:true});
      await page.close();
    }
    console.log('PHONE_BETA_ROOT_EVIDENCE '+JSON.stringify(out));
    console.log('PHONE BETA ROOT GATE PASS. Physical Galaxy Tab S9 finger and S Pen owner QA still required; OPPO is optional, not a gate.');
  }finally{await browser.close();}
})().catch(e=>{console.error('PHONE BETA ROOT GATE FAIL',e);process.exitCode=1});
