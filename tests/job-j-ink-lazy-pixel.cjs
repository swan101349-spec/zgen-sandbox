/* Original S0 JOB-J, C4: real Indian Ink pixels and native Lazy input effect.
 * QA-only: browser test on isolated blank profile. Never access owner art.
 * CDP genuine touch events exercise existing painter pointer input, no fake
 * dispatched PointerEvent or direct mutation of protected engine state.
 */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
let browser;

async function brushStroke(page, context, from, to) {
  const cdp = await context.newCDPSession(page);
  const touch = (x,y) => ({x,y});
  try {
    await cdp.send('Input.dispatchTouchEvent',
      {type:'touchStart',touchPoints:[touch(from.x,from.y)]});
    await page.waitForTimeout(75);
    await cdp.send('Input.dispatchTouchEvent',
      {type:'touchMove',touchPoints:[touch(to.x,to.y)]});
    await page.waitForTimeout(75);
    await cdp.send('Input.dispatchTouchEvent',
      {type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(140);
  } finally {
    await cdp.detach();
  }
}

async function paintPixels(page) {
  return page.locator('#paint').evaluate(canvas => {
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const {width,height}=canvas;
    const data=ctx.getImageData(0,0,width,height).data;
    let count=0,minX=width,maxX=-1,minY=height,maxY=-1,brightness=0;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      if(data[i+3]<25)continue;
      count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      brightness+=(data[i]+data[i+1]+data[i+2])/3;
    }
    return {count,minX,maxX,minY,maxY,meanRGB:count?brightness/count:0};
  });
}

(async () => {
  browser=await chromium.launch({headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:390,height:844},
    hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_BETA_26 &&
    window.__ZGEN_ART_RECOVERY?.status().ready &&
    !window.__ZGEN_ART_RECOVERY?.status().blocked,{timeout:30000});

  // Human-reachable native Ink control from initially collapsed brush rail.
  const brushes=page.locator('#zshell-left .zshell-handle');
  assert.equal(await brushes.getAttribute('aria-expanded'),'false');
  await brushes.tap();
  const ink=page.locator('#zshell-left-panel #drawing-rail button[data-brush="ink"]');
  assert.equal(await ink.count(),1);
  await ink.tap();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().brush),'ink');

  const adjust=page.locator('.zshell-adjust-handle');
  await adjust.tap();
  const panel=page.locator('#zshell-adjust-panel');
  assert.deepEqual(await panel.locator('input[data-setting]').evaluateAll(
    xs=>xs.map(x=>x.dataset.setting)),['size','opacity','lazy']);
  await panel.locator('[data-size-preset="S"]').tap();
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().size),10);
  const lazy=panel.locator('input[data-setting="lazy"]');
  await lazy.focus();await lazy.press('Home');
  assert.equal(await lazy.inputValue(),'0','Live lazy setting starts at zero');

  await adjust.tap();
  const frame=await page.locator('#paint').boundingBox();
  assert.ok(frame && frame.width>120 && frame.height>220,'Paint area visible');
  const start={x:frame.x+frame.width*.25,y:frame.y+frame.height*.45};
  const end={x:frame.x+frame.width*.75,y:start.y};
  assert.equal((await paintPixels(page)).count,0,'Disposable painting starts clean');
  await brushStroke(page,context,start,end);
  const normal=await paintPixels(page);
  assert.ok(normal.count>120 && normal.maxX-normal.minX>100,
    'Indian Ink must create a real native dark line: '+JSON.stringify(normal));
  assert.ok(normal.meanRGB<85,'Indian Ink native paint must be dark');

  // Restore blank state only in ephemeral test profile using native Undo.
  await page.locator('.zshell-history-left').tap();
  assert.equal((await paintPixels(page)).count,0,'Native Undo restores blank synthetic page');

  // Keyboard End generates real browser input/change through existing slider.
  await adjust.tap();
  await lazy.focus();await lazy.press('End');
  assert.equal(await lazy.inputValue(),'70','Lazy setting reaches native maximum');
  await adjust.tap();
  await brushStroke(page,context,start,end);
  const stabilized=await paintPixels(page);
  assert.ok(stabilized.count>100,'Lazy ink still makes real pigment pixels');
  assert.ok(stabilized.maxX<=normal.maxX-6,
    'Lazy stabilization must measurably shorten a fast ink stroke endpoint: '+
    JSON.stringify({normal,stabilized}));
  assert.equal(await page.evaluate(()=>window.__ZGEN_BETA_26.state().brush),'ink');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('ZGEN_JOB_J_INK_LAZY_PIXEL_PASS '+
    JSON.stringify({nativeInk:true,realTouchEvents:true,lazyLevels:[0,70],
      endpointDifference:normal.maxX-stabilized.maxX,
      inkMeanRGB:normal.meanRGB,normalCount:normal.count,
      stabilizedCount:stabilized.count,ownerDevicePass:false}));
  await context.close();
})().catch(e=>{console.error('ZGEN_JOB_J_INK_LAZY_PIXEL_FAIL',e);process.exitCode=1})
  .finally(async()=>{if(browser)await browser.close()});
