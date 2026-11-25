/* Native dry Cloth acceptance: actual ink on original C1 #paint, one Undo,
 * one Redo, reference unchanged, reload retained. Simulated pen is NOT S Pen.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='http://127.0.0.1:8765/studio-recovery-20261124/';
const snap=()=>({
  paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  history:window.__C4History(),
  metrics:window.__ZGEN_LYRICAL_ONE.metrics(),
  options:window.__ZGEN_LYRICAL_ONE.getOptions()
});
(async()=>{
const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
for(const viewport of [{width:390,height:844},{width:853,height:533}]){
  const context=await browser.newContext({viewport,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_LYRICAL_ONE?.ready&&
    window.__C4History&&window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked,
    null,{timeout:45000});
  const before=await page.evaluate(snap);
  await page.locator('#zshell-left .zshell-handle').click();
  await page.getByRole('button',{name:'Select dry Cloth shader pencil'}).click();
  await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='lyrical'&&
    window.__ZGEN_LYRICAL_ONE.getOptions().mode==='cloth');
  const bounds=await page.locator('#paint').boundingBox();
  assert.ok(bounds&&bounds.width>80&&bounds.height>150,'Original painter visible');
  const cdp=await context.newCDPSession(page);
  const points=27;
  for(let i=0;i<points;i++){
    const t=i/(points-1),force=.065+.85*Math.pow(Math.sin(t*Math.PI),1.5);
    const x=bounds.x+bounds.width*(.19+.62*t);
    const y=bounds.y+bounds.height*(.33+.085*Math.sin(t*Math.PI*3.3));
    await cdp.send('Input.dispatchMouseEvent',{
      type:i?'mouseMoved':'mousePressed',pointerType:'pen',
      x,y,button:'left',buttons:1,clickCount:i?0:1,force,
      tiltX:Math.round(42*Math.sin(t*Math.PI)),tiltY:17
    });
  }
  await cdp.send('Input.dispatchMouseEvent',{
    type:'mouseReleased',pointerType:'pen',button:'left',buttons:0,
    x:bounds.x+bounds.width*.81,y:bounds.y+bounds.height*.33,force:0
  });
  await page.waitForFunction(()=>window.__C4History().undo.length===1,
    null,{timeout:10000});
  const after=await page.evaluate(snap);
  assert.notEqual(after.paint,before.paint,'Native dry Cloth makes real pigment pixels');
  assert.equal(after.reference,before.reference,'Reference must remain unchanged');
  assert.equal(after.options.mode,'cloth');
  assert.ok(after.metrics.marks>after.metrics.segments*2,'Cloth creates multiple angled hatches per native segment');
  assert(after.metrics.marks>=50,'Cloth paints clothed translucent marks');
  assert(after.metrics.pressureMin<.3&&after.metrics.pressureMax>.65,
    'Pressure phrase must be recorded by native lyrical geometry');
  await page.locator('.zshell-history-left').click();
  assert.equal((await page.evaluate(snap)).paint,before.paint,'Undo restores exact canvas');
  await page.locator('.zshell-history-right').click();
  assert.equal((await page.evaluate(snap)).paint,after.paint,'Redo reproduces native pixels');
  assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
    !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_LYRICAL_ONE?.ready,
    null,{timeout:45000});
  assert.equal((await page.evaluate(snap)).paint,after.paint,'Cloth survives reload');
  assert.equal(await page.locator('#paint').evaluate(el=>el.width),720);
  assert.equal(await page.locator('#paint').evaluate(el=>el.height),1280);
  assert.deepEqual(errors,[],'No browser errors');
  console.log('ZGEN_NATIVE_DRY_CLOTH_PASS '+JSON.stringify({
    viewport,realC1Pixels:true,originalUndoRedoExact:true,
    savedArtReload:true,referenceUnchanged:true,ownerSPenTested:false,
    watercolorStarSupported:false,liveDeployed:false
  }));
  await context.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error('ZGEN_NATIVE_DRY_CLOTH_FAIL',e);process.exitCode=1});
