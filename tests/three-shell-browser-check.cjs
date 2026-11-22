'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const outDir = 'three-shell-browser-qa';
fs.mkdirSync(outDir,{recursive:true});
const fixtures = [
  {name:'phone360',width:360,height:740},
  {name:'phone390',width:390,height:780},
  {name:'phone430',width:430,height:850},
  {name:'tablet-portrait',width:800,height:1180},
  {name:'tablet-landscape',width:1180,height:760}
];
const approx=(a,b,tol=2)=>Math.abs(a-b)<=tol;
async function snapshot(page) {
  return page.evaluate(()=>{
    const area=document.getElementById('canvasArea').getBoundingClientRect();
    const board=document.getElementById('board').getBoundingClientRect();
    const bottom=document.querySelector('#zshell-bottom .zshell-handle').getBoundingClientRect();
    const paint=document.getElementById('paint');
    const reference=document.getElementById('reference');
    return {
      mode:window.__ZGEN_THREE_SHELL?.viewMode,
      area:{x:area.x,y:area.y,width:area.width,height:area.height},
      board:{x:board.x,y:board.y,width:board.width,height:board.height},
      bottomWidth:bottom.width,
      backing:[paint.width,paint.height,reference.width,reference.height]
    };
  });
}
function checkFit(s,name) {
  assert.equal(s.mode,'fit',name+': Fit Canvas active');
  assert.deepEqual(s.backing,[720,1280,720,1280],name+': backing dimensions preserved');
  assert.ok(s.board.width>0 && s.board.height>0,name+': visible paper');
  assert.ok(approx(s.board.width/s.board.height,9/16,0.005),name+': 9:16 proportions');
  assert.ok(s.board.x>=s.area.x-1,name+': left paper edge');
  assert.ok(s.board.y>=s.area.y-1,name+': top paper edge');
  assert.ok(s.board.x+s.board.width<=s.area.x+s.area.width+1,name+': right paper edge');
  assert.ok(s.board.y+s.board.height<=s.area.y+s.area.height+1,name+': bottom paper edge');
  assert.ok(s.bottomWidth<=180,name+': compact palette handle, not full-width');
}
(async()=>{
  const browser=await chromium.launch({
    headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try{
    const page=await browser.newPage({viewport:{width:390,height:780},deviceScaleFactor:1,hasTouch:true,isMobile:true});
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:8765/shell-v2.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>!!window.__ZGEN_THREE_SHELL?.recalculatePaperFit,{timeout:12000});
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());

    // Seed a real tracing-layer pixel so layout changes must not wipe it.
    const initialPixel=await page.evaluate(()=>{
      const canvas=document.getElementById('reference');
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.fillStyle='rgba(127,37,211,1)';
      ctx.fillRect(11,13,1,1);
      return Array.from(ctx.getImageData(11,13,1,1).data);
    });
    assert.equal(initialPixel[3],255,'tracing test pixel visible');

    for (const x of fixtures) {
      await page.setViewportSize({width:x.width,height:x.height});
      await page.waitForTimeout(120);
      await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
      const s=await snapshot(page);
      checkFit(s,x.name);
      await page.screenshot({path:path.join(outDir,x.name+'.png')});
      console.log('PASS '+x.name+': paper '+Math.round(s.board.width)+'x'+Math.round(s.board.height)+' in '+Math.round(s.area.width)+'x'+Math.round(s.area.height));
    }

    const before=await snapshot(page);
    await page.locator('#zshell-bottom .zshell-handle').click();
    assert.equal(await page.locator('#zshell-bottom-panel').isVisible(),true,'bottom overlays the paper');
    const withPalette=await snapshot(page);
    assert.ok(approx(withPalette.board.width,before.board.width,1),'palette does not resize paper');
    await page.locator('#zshell-right .zshell-handle').click();
    assert.equal(await page.locator('#zshell-bottom-panel').isVisible(),false,'opening tools collapses other panel');

    await page.locator('#zshell-right-panel .zshell-viewbar button').nth(1).click();
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
    const fill=await snapshot(page);
    assert.equal(fill.mode,'fill','Fill Width is explicit');
    assert.ok(approx(fill.board.width,fill.area.width-10,1),'Fill Width consumes available width');
    await page.locator('#zshell-right .zshell-handle').click();
    await page.locator('#zshell-right-panel .zshell-viewbar button').first().click();
    await page.evaluate(()=>window.__ZGEN_THREE_SHELL.recalculatePaperFit());
    checkFit(await snapshot(page),'fit-return');

    const retainedPixel=await page.evaluate(()=>{
      const canvas=document.getElementById('reference');
      return Array.from(canvas.getContext('2d',{willReadFrequently:true}).getImageData(11,13,1,1).data);
    });
    assert.deepEqual(retainedPixel,initialPixel,'reference pixel preserved through 5 resizes and fit modes');
    console.log('PASS: floating panel overlay, Fit Canvas/Fill Width, tracing pixel remains, no backing-canvas resize');
    if(errors.length)console.log('Page runtime warnings (not evaluated as an engine PASS): '+errors.slice(0,5).join(' | '));
  } finally { await browser.close(); }
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
