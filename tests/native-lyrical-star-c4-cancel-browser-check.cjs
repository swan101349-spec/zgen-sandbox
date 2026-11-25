/* ZGen C4 ★ interruption stress | original Three-Shell, native C1 pointer owner
 * Tests pointercancel + genuine two-finger touch, REDO preservation, no late GPU
 * pigment, then a successful wet stroke. Synthetic Chromium ≠ physical S Pen.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8765/studio-recovery-20261124/';
function snap(){
  const layers=window.__C4.snapshot().document?.whole?.layers||{},wet={};
  for(const [k,a] of Object.entries(layers)){
    let hash=2166136261,nonzero=0;
    for(let i=0;i<a.length;i++){
      hash=Math.imul(hash^a[i],16777619);
      if(a[i])nonzero++;
    }
    wet[k]={hash:hash>>>0,nonzero,length:a.length};
  }
  return {
    wet,graphite:document.querySelector('#paint').toDataURL('image/png'),
    reference:document.querySelector('#reference').toDataURL('image/png'),
    history:window.__C4History(),
    active:window.__C4.active,draw:window.__ZGEN_LYRICAL_ONE.metrics().drawing,
    dims:[document.querySelector('#paint').width,document.querySelector('#paint').height]
  };
}
(async()=>{
const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
  for(const viewport of [{width:390,height:844},{width:853,height:533}]){
    const context=await browser.newContext({viewport,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__C4?.snapshot&&window.__C4History&&
      window.__ZGEN_LYRICAL_ONE?.ready&&
      window.__ZGEN_ART_RECOVERY?.status().ready&&
      !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
    await page.locator('#zshell-left .zshell-handle').click();
    await page.locator('#zshell-left button[data-brush="lyrical"]').click();
    await page.waitForFunction(()=>window.__ZGEN_BETA_26?.state().brush==='lyrical');
    const paper=page.locator('#paint'),box=await paper.boundingBox();
    assert.ok(box&&box.width>90&&box.height>140);
    const cdp=await context.newCDPSession(page);
    const point=(t,fy)=>({
      x:box.x+box.width*(.26+.5*t),
      y:box.y+box.height*(fy+.025*Math.sin(t*Math.PI*2))
    });
    async function pen(fy,finish='up'){
      const first=point(0,fy);
      // Identify the ACTUAL registered pointerId from native browser events;
      // do not fabricate a non-existent hardware pointer capture.
      await page.evaluate(()=>{
        window.__zgenCancelIds=[];
        document.querySelector('#paint').addEventListener('pointerdown',e=>{
          window.__zgenCancelIds.push({id:e.pointerId,type:e.pointerType});
        },{once:true});
      });
      for(let i=0;i<15;i++){
        const t=i/14,p=point(t,fy);
        await cdp.send('Input.dispatchMouseEvent',{
          type:i?'mouseMoved':'mousePressed',
          pointerType:'pen',x:p.x,y:p.y,button:'left',buttons:1,
          clickCount:i?0:1,force:.10+.81*Math.sin(t*Math.PI),tiltX:24,tiltY:11
        });
      }
      const last=point(1,fy);
      if(finish==='cancel'){
        const ids=await page.evaluate(()=>window.__zgenCancelIds);
        assert.equal(ids.length,1,'native browser pointerdown captured');
        assert.equal(ids[0].type,'pen');
        await page.evaluate(id=>{
          document.querySelector('#paint').dispatchEvent(new PointerEvent('pointercancel',{
            bubbles:true,cancelable:true,pointerType:'pen',pointerId:id,
            pressure:0,buttons:0
          }));
        },ids[0].id);
      }
      await cdp.send('Input.dispatchMouseEvent',{
        type:'mouseReleased',pointerType:'pen',x:last.x,y:last.y,
        button:'left',buttons:0,force:0
      });
    }
    const before=await page.evaluate(snap);
    await pen(.19);
    const withDry=await page.evaluate(snap);
    assert.notEqual(withDry.graphite,before.graphite,'Seed genuine dry graphical history');
    assert.equal(withDry.history.undo.length,1);
    await page.locator('.zshell-history-left').click();
    const undoneDry=await page.evaluate(snap);
    assert.equal(undoneDry.graphite,before.graphite);
    assert.equal(undoneDry.history.redo.length,1);
    // Original small star UI, not direct engine injection.
    await page.locator('.zshell-adjust-handle').click();
    await page.locator('select[data-lyrical="mode"]').selectOption('graphite');
    await page.getByRole('button',{name:'Toggle Lyrical pencil native C4 watercolor mode'}).click();
    assert.equal((await page.evaluate(()=>window.__ZGEN_LYRICAL_ONE.getOptions())).medium,'watercolor');
    await page.locator('.zshell-adjust-handle').click();
    assert.equal(await page.locator('#zshell-adjust-panel').evaluate(e=>e.hidden),true);
    // TEST 1: PEN pointercancel must roll back every C4 pixel AND preserve
    // a redo branch which native begin() had tentatively invalidated.
    await pen(.37,'cancel');
    await page.waitForTimeout(1650);
    const canceled=await page.evaluate(snap);
    assert.deepEqual(canceled.wet,undoneDry.wet,'pointercancel restores all C4 wet GPU arrays');
    assert.equal(canceled.graphite,undoneDry.graphite,'pointercancel cannot change original dry art');
    assert.equal(canceled.reference,undoneDry.reference,'reference unaffected');
    assert.deepEqual(canceled.history,undoneDry.history,
      'pointercancel restores native undo AND redo branch exactly');
    assert.equal(canceled.draw,false,'original lyrical stroke is closed');
    assert.equal(canceled.active,false,'native C4 stroke is no longer active');
    assert.equal(await page.locator('.zshell-history-right').isEnabled(),true,
      'original Redo arrow is enabled after pointercancel history rollback');
    await page.waitForTimeout(1100);
    assert.deepEqual((await page.evaluate(snap)).wet,undoneDry.wet,
      'no late GPU pigment may leak after canceled pen stroke');
    // TEST 2: TWO-FINGER zoom gesture must abort a genuine existing wet
    // pencil path, with no newly committed art or corrupted history.
    const fx=box.x+box.width*.3,fy=box.y+box.height*.55;
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:[{x:fx,y:fy,id:1}]
    });
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchMove',touchPoints:[{x:fx+box.width*.22,y:fy+box.height*.025,id:1}]
    });
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:[
        {x:fx+box.width*.22,y:fy+box.height*.025,id:1},
        {x:fx+box.width*.48,y:fy+box.height*.06,id:2}
      ]
    });
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(1500);
    const gesture=await page.evaluate(snap);
    assert.deepEqual(gesture.wet,undoneDry.wet,
      'two-finger gesture rolls back all original C4 GPU pigment arrays');
    assert.equal(gesture.graphite,undoneDry.graphite);
    assert.equal(gesture.reference,undoneDry.reference);
    assert.deepEqual(gesture.history,undoneDry.history,
      'two-finger abort restores previous redo branch without extra native Undo');
    assert.equal(gesture.active,false);
    assert.equal(await page.locator('.zshell-history-right').isEnabled(),true,
      'original Redo arrow stays enabled after second-finger history rollback');
    await page.waitForTimeout(1000);
    assert.deepEqual((await page.evaluate(snap)).wet,undoneDry.wet,
      'two-finger cancellation leaves no delayed wet pigment');
    // After two cancel paths, REDO must still recover existing art.
    await page.locator('.zshell-history-right').click();
    const restored=await page.evaluate(snap);
    assert.equal(restored.graphite,withDry.graphite,'pre-cancel dry art redo still exact');
    assert.deepEqual(restored.wet,withDry.wet);
    // Then prove the original C4 GPU bridge is still usable for valid wet art.
    await pen(.69);
    await page.waitForTimeout(1700);
    await page.evaluate(()=>document.querySelector('[data-act="stop"]').click());
    const validWet=await page.evaluate(snap);
    assert.equal(validWet.graphite,restored.graphite,'new C4 stroke must not affect dry art');
    assert.ok(Object.values(validWet.wet).some(x=>x.nonzero>0),
      'genuine C4 wet GPU pigment still deposits after cancellation');
    assert.equal(validWet.history.undo.length,2);
    await page.locator('.zshell-history-left').click();
    assert.deepEqual((await page.evaluate(snap)).wet,restored.wet,
      'Undo exact after both cancellation paths');
    await page.locator('.zshell-history-right').click();
    assert.deepEqual((await page.evaluate(snap)).wet,validWet.wet,
      'Redo exact after both cancellation paths');
    assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__C4?.snapshot&&
      window.__ZGEN_ART_RECOVERY?.status().ready&&
      !window.__ZGEN_ART_RECOVERY.status().blocked,null,{timeout:45000});
    const reopened=await page.evaluate(snap);
    assert.equal(reopened.graphite,restored.graphite);
    assert.ok(Object.values(reopened.wet).some(x=>x.nonzero>0),
      'valid wet art survives mixed-media reload after canceled strokes');
    assert.deepEqual(reopened.dims,[720,1280]);
    assert.deepEqual(errors,[],'no browser errors');
    console.log('ZGEN_LYRICAL1_C4_CANCEL_PASS '+JSON.stringify({
      viewport,actualPointerCancel:true,twoFingerGesture:true,
      wetRollbackExact:true,noDelayedWetPixels:true,redoBranchPreserved:true,
      subsequentWetGPU:true,subsequentWetUndoRedo:true,mixedArtReload:true,
      originalPaper:true,ownerPhysicalSPenTested:false,liveDeployed:false
    }));
    await context.close();
  }
}finally{await browser.close();}
})().catch(e=>{console.error('ZGEN_LYRICAL1_C4_CANCEL_FAIL',e);process.exitCode=1;});
