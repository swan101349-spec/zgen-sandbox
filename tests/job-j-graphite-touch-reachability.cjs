/* JOB-J / C4 mobile touch reachability of ALREADY-MERGED 2B native graphite.
 * Real pointer/touch UI only. No DOM-click synthetic shortcut; no painter edit.
 * Browser profile is ephemeral and never touches owner device storage.
 */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zgen-job-j-touch-'));
let browser;
(async () => {
  browser = await chromium.launch({headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const checks=[];
  for(const viewport of [{width:360,height:780},{width:390,height:844},{width:800,height:1100}]){
    const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message)));
    await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ZGEN_BETA_26 && window.__ZGEN_BRUSH_CONTROLS &&
      window.__ZGEN_ART_RECOVERY?.status().ready && !window.__ZGEN_ART_RECOVERY.status().blocked,
      {timeout:30000});
    const brushRail=page.locator('#zshell-left .zshell-handle');
    assert.equal(await brushRail.getAttribute('aria-expanded'),'false');
    await brushRail.tap();
    assert.equal(await brushRail.getAttribute('aria-expanded'),'true');
    const pencil=page.locator('#zshell-left-panel #drawing-rail [data-brush="graphite"]');
    assert.equal(await pencil.count(),1,'Existing real 2B selection, no duplicate widget');
    await pencil.tap();
    await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='graphite');
    assert.equal(await brushRail.getAttribute('aria-expanded'),'false',
      'Selecting a brush should close the collapsed rail');
    const adjust=page.locator('.zshell-adjust-handle');
    await adjust.tap();
    assert.equal(await adjust.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#zshell-adjust-panel [data-graphite-tone]').count(),3);
    assert.equal(await page.locator('#zshell-adjust-panel input[type="range"]').count(),3);
    const tone=page.locator('#zshell-adjust-panel [data-graphite-tone="#383838"]');
    await tone.tap();
    await page.waitForFunction(()=>window.__ZGEN_BRUSH_CONTROLS.graphiteShade==='#383838');
    await page.locator('#zshell-adjust-panel [data-size-preset="S"]').tap();
    assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),10);
    const canvas=await page.locator('#paint').evaluate(el=>({w:el.width,h:el.height}));
    assert.deepEqual(canvas,{w:720,h:1280},'No backing art reallocation');
    assert.deepEqual(errors,[],'No page errors for '+viewport.width+'px');
    checks.push({viewport:viewport.width+'x'+viewport.height,
      brush:'graphite',physicalTouchControlSelection:true,
      shades:3,size:10,backing:canvas,realTabS9OrOPPO:false});
    await context.close();
  }
  console.log('ZGEN_JOB_J_TOUCH_DISCOVERABILITY_PASS '+JSON.stringify(checks));
})().catch(e=>{console.error('ZGEN_JOB_J_TOUCH_DISCOVERABILITY_FAIL',e);process.exitCode=1})
  .finally(async()=>{if(browser)await browser.close();fs.rmSync(profile,{recursive:true,force:true})});
