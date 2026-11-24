/* Genuine browser marks, one native pencil, three dynamic drawing languages.
 * No owner artwork, no duplicate canvas, no main-branch deployment.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/studio-recovery-20261124/';
const snapshot=()=>({
  paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  history:window.__C4History(),
  metrics:window.__ZGEN_LYRICAL_ONE.metrics(),
  options:window.__ZGEN_LYRICAL_ONE.getOptions()
});
async function inkWave(cdp,bounds){
  const count=29;
  for(let i=0;i<count;i++){
    const t=i/(count-1);
    // Real pen-pressure phrase: quiet start, wide middle, tapered finish.
    const p=.055+.87*Math.pow(Math.sin(Math.PI*t),1.7);
    const x=bounds.x+bounds.width*(.19+t*.63);
    const y=bounds.y+bounds.height*(.32+.065*Math.sin(2.8*Math.PI*t)+
      .03*Math.sin(5.6*Math.PI*t));
    await cdp.send('Input.dispatchMouseEvent',{
      type:i?'mouseMoved':'mousePressed',pointerType:'pen',
      x,y,button:'left',buttons:1,clickCount:i?0:1,force:p,
      tiltX:Math.round(62*Math.sin(Math.PI*t)),tiltY:Math.round(22*Math.sin(Math.PI*t))
    });
  }
  await cdp.send('Input.dispatchMouseEvent',{
    type:'mouseReleased',pointerType:'pen',button:'left',buttons:0,
    x:bounds.x+bounds.width*.82,y:bounds.y+bounds.height*.32,force:0
  });
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
  ]});
  try{
    for(const viewport of [{width:390,height:844},{width:853,height:533}]){
      const context=await browser.newContext({viewport,hasTouch:true});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(URL,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__ZGEN_LYRICAL_ONE?.ready&&
        window.__C4History&&window.__ZGEN_ART_RECOVERY?.status().ready&&
        !window.__ZGEN_ART_RECOVERY.status().blocked,
        null,{timeout:45000});
      const blank=await page.evaluate(snapshot);
      await page.locator('#zshell-left .zshell-handle').click();
      await page.locator('#zshell-left button[data-brush="lyrical"]').click();
      await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='lyrical');
      const bounds=await page.locator('#paint').boundingBox();
      assert.ok(bounds&&bounds.width>80&&bounds.height>150,'Native canvas must be visible');
      const cdp=await context.newCDPSession(page);
      const modes=['graphite','sketchy','harmony'];
      const work={};
      for(const mode of modes){
        await page.locator('.zshell-adjust-handle').click();
        const panel=page.locator('#zshell-adjust-panel');
        await panel.locator('select[data-lyrical="grade"]').selectOption('4B');
        await panel.locator('select[data-lyrical="size"]').selectOption('fine');
        await panel.locator('select[data-lyrical="mode"]').selectOption(mode);
        await panel.locator('input[data-lyrical="fan"]').evaluate(el=>{
          el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));
        });
        await page.locator('.zshell-adjust-handle').click();
        await inkWave(cdp,bounds);
        await page.waitForFunction(()=>window.__C4History().undo.length===1,
          null,{timeout:10000});
        const current=await page.evaluate(snapshot);
        assert.notEqual(current.paint,blank.paint,mode+' must put real graphite on native canvas');
        assert.equal(current.reference,blank.reference,mode+' must not modify original reference');
        assert.equal(current.options.mode,mode,'Correct selected lyrical mode');
        assert(current.metrics.segments>=20,'Looping gesture must have >20 actual segments');
        assert(current.metrics.pressureMin<.3&&current.metrics.pressureMax>.65,
          'Real pressure opening and release along the phrase');
        work[mode]=current;
        await page.locator('.zshell-history-left').click();
        const undo=await page.evaluate(snapshot);
        assert.equal(undo.paint,blank.paint,'One native Undo must erase only '+mode);
        assert.equal(undo.history.redo.length,1);
        await page.locator('.zshell-history-right').click();
        assert.equal((await page.evaluate(snapshot)).paint,current.paint,
          'Native Redo must reproduce '+mode+' exactly');
        await page.locator('.zshell-history-left').click();
        assert.equal((await page.evaluate(snapshot)).paint,blank.paint,
          'Ready for next mode without cross-mode contamination');
      }
      assert.notEqual(work.sketchy.paint,work.graphite.paint,
        'Sketchy produces a DISTINCT dry-graphite gesture from pure lyrical graphite');
      assert.notEqual(work.harmony.paint,work.graphite.paint,
        'Harmony produces DISTINCT connecting chords from pure lyrical graphite');
      assert.notEqual(work.harmony.paint,work.sketchy.paint,
        'Harmony and Sketchy must have visibly distinct raster mark behavior');
      // Recreate Harmony after a prior Undo. This also tests a fresh stroke
      // properly invalidates the old redo branch while leaving saved art intact.
      await page.locator('.zshell-adjust-handle').click();
      await page.locator('select[data-lyrical="mode"]').selectOption('harmony');
      await page.locator('.zshell-adjust-handle').click();
      await inkWave(cdp,bounds);
      const finished=await page.evaluate(snapshot);
      assert.equal(finished.history.redo.length,0,
        'New lyrical stroke invalidates stale Redo branch');
      assert.notEqual(finished.paint,blank.paint);
      assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
        !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__ZGEN_LYRICAL_ONE?.ready,
        null,{timeout:45000});
      const restored=await page.evaluate(snapshot);
      assert.equal(restored.paint,finished.paint,
        'Harmony dancing line remains visible after browser reload');
      assert.equal(restored.reference,blank.reference,
        'Original reference layer unchanged after reload');
      assert.equal(await page.locator('#paint').evaluate(el=>el.width),720);
      assert.equal(await page.locator('#paint').evaluate(el=>el.height),1280);
      assert.deepEqual(errors,[]);
      console.log('ZGEN_SKETCHY_HARMONY_NATIVE_PASS '+JSON.stringify({
        viewport,allModesMakeRealMarks:true,
        harmonyDifferentFromSketchy:true,
        shapeCurvaturePressureWaves:true,
        nativeUndoRedoExact:true,redoBranchCleared:true,
        paintRetainedOnReload:true,referenceUnchanged:true,
        nativeCanvas:true,ownerPhysicalSPenTested:false
      }));
      await context.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error('ZGEN_SKETCHY_HARMONY_NATIVE_FAIL',error);process.exitCode=1});
